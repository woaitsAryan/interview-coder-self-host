// ProcessingHelper.ts
import fs from "node:fs"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { AppState } from "./main"
import axios from "axios"

const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://www.interviewcoder.co"

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
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          result.data
        )
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
            data: fs.readFileSync(path).toString("base64")
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
    const MAX_RETRIES = 2
    let retryCount = 0

    while (retryCount <= MAX_RETRIES) {
      try {
        const imageDataList = screenshots.map((screenshot) => screenshot.data)
        const mainWindow = this.appState.getMainWindow()
        let problemInfo

        // First API call - extract problem info
        try {
          const extractResponse = await axios.post(
            `${API_BASE_URL}/api/extract`,
            { imageDataList },
            {
              signal,
              timeout: 60000, // 60 second timeout
              validateStatus: function (status) {
                return status < 500 // Reject if the status code is >= 500
              },
              maxRedirects: 5,
              headers: {
                "Content-Type": "application/json"
              }
            }
          )

          problemInfo = extractResponse.data

          // Store problem info in AppState
          this.appState.setProblemInfo(problemInfo)

          // Send first success event
          if (mainWindow) {
            mainWindow.webContents.send(
              this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
              problemInfo
            )

            // Generate solutions after successful extraction
            const solutionsResult = await this.generateSolutionsHelper(signal)
            if (solutionsResult.success) {
              // Clear any existing extra screenshots before transitioning to solutions view
              this.screenshotHelper.clearExtraScreenshotQueue()
              mainWindow.webContents.send(
                this.appState.PROCESSING_EVENTS.SOLUTION_SUCCESS,
                solutionsResult.data
              )
              return { success: true, data: solutionsResult.data }
            } else {
              throw new Error(
                solutionsResult.error || "Failed to generate solutions"
              )
            }
          }
        } catch (error: any) {
          console.error("API Error Details:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            code: error.code
          })

          // Network errors that might benefit from retry
          if (
            error.code === "ECONNRESET" ||
            error.code === "ECONNABORTED" ||
            error.message === "socket hang up" ||
            error.message.includes("network") ||
            error.response?.status >= 500
          ) {
            if (retryCount < MAX_RETRIES) {
              console.log(
                `Retrying request (attempt ${retryCount + 1} of ${MAX_RETRIES})`
              )
              retryCount++
              // Wait before retrying (exponential backoff)
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * Math.pow(2, retryCount))
              )
              continue
            }
          }

          // Handle different types of server errors
          if (error.response?.status) {
            switch (error.response.status) {
              case 500:
                throw new Error(
                  "Server error occurred. Please try again in a few moments."
                )
              case 504:
                throw new Error(
                  "Request timed out. The server took too long to respond. Please try again."
                )
              case 503:
                throw new Error(
                  "Service temporarily unavailable. Please try again later."
                )
              default:
                if (error.response.status >= 500) {
                  throw new Error(
                    `Server error (${error.response.status}). Please try again later.`
                  )
                }
            }
          }

          // Handle specific network errors
          if (error.message === "socket hang up") {
            throw new Error("Connection was interrupted. Please try again.")
          }
          if (error.code === "ECONNRESET") {
            throw new Error("Connection was reset. Please try again.")
          }
          if (error.code === "ECONNABORTED") {
            throw new Error("Request timed out. Please try again.")
          }

          // Handle API-specific errors
          if (
            error.response?.data?.error &&
            typeof error.response.data.error === "string"
          ) {
            if (error.response.data.error.includes("Operation timed out")) {
              throw new Error(
                "Operation timed out after 1 minute. Please try again."
              )
            }
            if (error.response.data.error.includes("API Key out of credits")) {
              throw new Error(error.response.data.error)
            }
            throw new Error(error.response.data.error)
          }

          // If we get here, it's an unknown error
          throw new Error(error.message || "An unknown error occurred")
        }
      } catch (error: any) {
        // Log the full error for debugging
        console.error("Processing error details:", {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          retryCount
        })

        // If we've exhausted retries or it's not a retryable error, return the error
        if (retryCount >= MAX_RETRIES) {
          return { success: false, error: error.message }
        }
      }
    }

    // If we get here, all retries failed
    return {
      success: false,
      error: "Failed to process after multiple attempts. Please try again."
    }
  }

  private async generateSolutionsHelper(signal: AbortSignal) {
    try {
      const problemInfo = this.appState.getProblemInfo()
      if (!problemInfo) {
        throw new Error("No problem info available")
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/generate`,
        problemInfo,
        {
          signal,
          timeout: 60000,
          validateStatus: function (status) {
            return status < 500
          },
          maxRedirects: 5,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )

      return { success: true, data: response.data }
    } catch (error: any) {
      const mainWindow = this.appState.getMainWindow()

      // Handle timeout errors (both 504 and axios timeout)
      if (error.code === "ECONNABORTED" || error.response?.status === 504) {
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
            "Request timed out. The server took too long to respond. Please try again."
          )
        }
        return {
          success: false,
          error: "Request timed out. Please try again."
        }
      }

      if (error.response?.data?.error?.includes("API Key out of credits")) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.API_KEY_OUT_OF_CREDITS
          )
        }
        return { success: false, error: error.response.data.error }
      }

      if (
        error.response?.data?.error?.includes(
          "Please close this window and re-enter a valid Open AI API key."
        )
      ) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.API_KEY_INVALID
          )
        }
        return { success: false, error: error.response.data.error }
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

      const response = await axios.post(
        `${API_BASE_URL}/api/debug`,
        { imageDataList, problemInfo },
        { signal }
      )

      return { success: true, data: response.data }
    } catch (error: any) {
      const mainWindow = this.appState.getMainWindow()

      if (error.response?.data?.error?.includes("Operation timed out")) {
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

      if (error.response?.data?.error?.includes("API Key out of credits")) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.API_KEY_OUT_OF_CREDITS
          )
        }
        return { success: false, error: error.response.data.error }
      }

      if (
        error.response?.data?.error?.includes(
          "Please close this window and re-enter a valid Open AI API key."
        )
      ) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.appState.PROCESSING_EVENTS.API_KEY_INVALID
          )
        }
        return { success: false, error: error.response.data.error }
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
