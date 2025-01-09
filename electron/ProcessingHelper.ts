// ProcessingHelper.ts

import fs from "node:fs"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { AppState } from "./main"

import {
  debugSolutionResponses,
  extractProblemInfo,
  generateSolutionResponses
} from "./handlers/problemHandler"
import axios from "axios"

export class ProcessingHelper {
  private appState: AppState
  private screenshotHelper: ScreenshotHelper

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(appState: AppState) {
    this.appState = appState
    this.screenshotHelper = appState.getScreenshotHelper()
  }
  public async processScreenshots(): Promise<void> {
    const mainWindow = this.appState.getMainWindow()
    if (!mainWindow) return

    const view = this.appState.getView()
    console.log("Processing screenshots in view:", view)

    if (view === "queue") {
      const screenshotQueue = this.screenshotHelper.getScreenshotQueue()
      console.log("Processing main queue screenshots:", screenshotQueue)
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS
        )
        return
      }

      try {
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.INITIAL_START
        )

        // Initialize AbortController
        this.currentProcessingAbortController = new AbortController()
        const { signal } = this.currentProcessingAbortController

        const screenshots = await Promise.all(
          screenshotQueue.map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64")
          }))
        )

        const result = await this.processScreenshotsHelper(screenshots, signal)

        if (!result.success) {
          console.log("Processing failed:", result.error)
          if (result.error?.includes("API Key out of credits")) {
            mainWindow.webContents.send(
              this.appState.PROCESSING_EVENTS.API_KEY_OUT_OF_CREDITS
            )
          } else if (result.error?.includes("OpenAI API key not found")) {
            mainWindow.webContents.send(
              this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
              "OpenAI API key not found in environment variables. Please set the OPEN_AI_API_KEY environment variable."
            )
          } else {
            mainWindow.webContents.send(
              this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
              result.error
            )
          }
          // Reset view back to queue on error
          console.log("Resetting view to queue due to error")
          this.appState.setView("queue")
          return
        }

        // Only set view to solutions if processing succeeded
        console.log("Setting view to solutions after successful processing")
        this.appState.setView("solutions")
      } catch (error: any) {
        console.error("Processing error:", error)
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message || "An unknown error occurred"
          )
        }
        // Reset view back to queue on error
        console.log("Resetting view to queue due to error")
        this.appState.setView("queue")
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      // view == 'solutions'
      const extraScreenshotQueue =
        this.screenshotHelper.getExtraScreenshotQueue()
      console.log("Processing extra queue screenshots:", extraScreenshotQueue)
      if (extraScreenshotQueue.length === 0) {
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS
        )
        return
      }
      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_START)

      // Initialize AbortController
      this.currentExtraProcessingAbortController = new AbortController()
      const { signal } = this.currentExtraProcessingAbortController

      try {
        const screenshots = await Promise.all(
          [
            ...this.screenshotHelper.getScreenshotQueue(),
            ...extraScreenshotQueue
          ].map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64") // Read image data
          }))
        )
        console.log(
          "Combined screenshots for processing:",
          screenshots.map((s) => s.path)
        )

        const result = await this.processExtraScreenshotsHelper(
          screenshots,
          signal
        )

        if (result.success) {
          this.appState.setHasDebugged(true)
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.DEBUG_SUCCESS,
            result.data
          )
        } else {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.DEBUG_ERROR,
            result.error
          )
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.DEBUG_ERROR,
            "Extra processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.DEBUG_ERROR,
            error.message
          )
        }
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  private async processScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const imageDataList = screenshots.map((screenshot) => screenshot.data)
      const mainWindow = this.appState.getMainWindow()
      let problemInfo

      // First function call - extract problem info
      try {
        problemInfo = await extractProblemInfo(imageDataList)

        // Store problem info in AppState
        this.appState.setProblemInfo(problemInfo)

        // Send first success event
        if (mainWindow) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
            problemInfo
          )
        }
      } catch (error: any) {
        if (error.message?.includes("Operation timed out")) {
          // Cancel ongoing API requests
          this.cancelOngoingRequests()
          // Clear both screenshot queues
          this.appState.clearQueues()
          // Update view state to queue
          this.appState.setView("queue")
          // Notify renderer to switch view
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("reset-view")
            mainWindow.webContents.send(
              this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
              "Operation timed out after 1 minute. Please try again."
            )
          }
          throw new Error(
            "Operation timed out after 1 minute. Please try again."
          )
        }
        if (error.message?.includes("API Key out of credits")) {
          throw new Error(error.message)
        }
        throw error // Re-throw if not an API key error
      }

      // Second function call - generate solutions
      if (mainWindow) {
        const solutionsResult = await this.generateSolutionsHelper(signal)
        if (solutionsResult.success) {
          // Clear any existing extra screenshots before transitioning to solutions view
          this.screenshotHelper.clearExtraScreenshotQueue()
          // Set view to solutions BEFORE sending success event
          this.appState.setView("solutions")
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.SOLUTION_SUCCESS,
            solutionsResult.data
          )
        } else {
          throw new Error(
            solutionsResult.error || "Failed to generate solutions"
          )
        }
      }

      return { success: true, data: problemInfo }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
  private async generateSolutionsHelper(signal: AbortSignal) {
    try {
      const problemInfo = this.appState.getProblemInfo()
      if (!problemInfo) {
        throw new Error("No problem info available")
      }

      // Use the generateSolutionResponses function
      const solutions = await generateSolutionResponses(problemInfo)

      if (!solutions) {
        throw new Error("No solutions received")
      }

      return { success: true, data: solutions }
    } catch (error: any) {
      const mainWindow = this.appState.getMainWindow()

      if (error.message?.includes("Operation timed out")) {
        // Cancel ongoing API requests
        this.cancelOngoingRequests()
        // Clear both screenshot queues
        this.appState.clearQueues()
        // Update view state to queue
        this.appState.setView("queue")
        // Notify renderer to switch view
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view")
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Operation timed out after 1 minute. Please try again."
          )
        }
        return {
          success: false,
          error: "Operation timed out after 1 minute. Please try again."
        }
      }

      // Check if error message indicates API key out of credits
      if (error.message?.includes("API Key out of credits")) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.API_KEY_OUT_OF_CREDITS
          )
        }
        return { success: false, error: error.message }
      }

      if (
        error.message?.includes(
          "Please close this window and re-enter a valid Open AI API key."
        )
      ) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.API_KEY_INVALID
          )
        }
        return { success: false, error: error.message }
      }

      return { success: false, error: error.message }
    }
  }

  private async processExtraScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const imageDataList = screenshots.map((screenshot) => screenshot.data)

      const problemInfo = this.appState.getProblemInfo()
      if (!problemInfo) {
        throw new Error("No problem info available")
      }

      // Use the debugSolutionResponses function
      const debugSolutions = await debugSolutionResponses(
        imageDataList,
        problemInfo
      )

      if (!debugSolutions) {
        throw new Error("No debug solutions received")
      }

      return { success: true, data: debugSolutions }
    } catch (error: any) {
      const mainWindow = this.appState.getMainWindow()

      if (error.message?.includes("Operation timed out")) {
        // Cancel ongoing API requests
        this.cancelOngoingRequests()
        // Clear both screenshot queues
        this.appState.clearQueues()
        // Update view state to queue
        this.appState.setView("queue")
        // Notify renderer to switch view
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view")
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.DEBUG_ERROR,
            "Operation timed out after 1 minute. Please try again."
          )
        }
        return {
          success: false,
          error: "Operation timed out after 1 minute. Please try again."
        }
      }

      // Check if error message indicates API key out of credits
      if (error.message?.includes("API Key out of credits")) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.API_KEY_OUT_OF_CREDITS
          )
        }
        return { success: false, error: error.message }
      }

      if (
        error.message?.includes(
          "Please close this window and re-enter a valid Open AI API key."
        )
      ) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.API_KEY_INVALID
          )
        }
        return { success: false, error: error.message }
      }
      return { success: false, error: error.message }
    }
  }

  public cancelOngoingRequests(): void {
    let wasCancelled = false

    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null

      wasCancelled = true
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null

      wasCancelled = true
    }

    // Reset hasDebugged flag
    this.appState.setHasDebugged(false)

    const mainWindow = this.appState.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("Processing was canceled by the user.")
    }
  }
}
