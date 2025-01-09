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
import sharp from "sharp"

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

    if (view === "queue") {
      const screenshotQueue = this.screenshotHelper.getScreenshotQueue()
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS
        )
        return
      }

      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_START)
      this.appState.setView("solutions")

      // Initialize AbortController
      this.currentProcessingAbortController = new AbortController()
      const { signal } = this.currentProcessingAbortController

      // function to compress the Image
      function compressBase64Image(
        base64: string,
        maxWidth: number,
        quality: number
      ): Promise<string> {
        return new Promise((resolve, reject) => {
          // Convert Base64 to Buffer
          const buffer = Buffer.from(base64, "base64")

          // Use sharp to resize and compress the image
          sharp(buffer)
            .resize({ width: maxWidth }) // Resize image to max width while maintaining aspect ratio
            .jpeg({ quality: Math.round(quality * 100) }) // Compress image with the specified quality
            .toBuffer()
            .then((compressedBuffer) => {
              // Convert the compressed Buffer back to Base64
              const compressedBase64 = compressedBuffer.toString("base64")
              resolve(compressedBase64)
            })
            .catch((error) => {
              reject(error)
            })
        })
      }

      try {
        const screenshots = await Promise.all(
          screenshotQueue.map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: await compressBase64Image(
              fs.readFileSync(path).toString("base64"),
              800,
              0.7
            ),
          }))
        )

        const result = await this.processScreenshotsHelper(screenshots, signal)

        if (!result.success) {
          if (result.error?.includes("API Key out of credits")) {
            mainWindow.webContents.send(
              this.appState.PROCESSING_EVENTS.API_KEY_OUT_OF_CREDITS
            )
          } else if (
            result.error?.includes(
              "Please close this window and re-enter a valid Open AI API key."
            )
          ) {
            mainWindow.webContents.send(
              this.appState.PROCESSING_EVENTS.API_KEY_INVALID
            )
          } else {
            mainWindow.webContents.send(
              this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
              result.error
            )
          }
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message
          )
        }
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      // view == 'solutions'
      const extraScreenshotQueue =
        this.screenshotHelper.getExtraScreenshotQueue()
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
        if (error.message?.includes("API Key out of credits")) {
          throw new Error(error.message)
        }
        throw error // Re-throw if not an API key error
      }

      // Second function call - generate solutions
      if (mainWindow) {
        const solutionsResult = await this.generateSolutionsHelper(signal)
        if (solutionsResult.success) {
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
