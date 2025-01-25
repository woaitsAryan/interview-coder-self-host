import { createClient } from "@supabase/supabase-js"
import { app, BrowserWindow, shell } from "electron"
import { initializeIpcHandlers } from "./ipcHandlers"
import { ProcessingHelper } from "./ProcessingHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import path from "path"
import { WindowHelper } from "./WindowHelper"
import { initAutoUpdater } from "./autoUpdater"
import * as dotenv from "dotenv"

export class AppState {
  private static instance: AppState | null = null

  private windowHelper: WindowHelper
  private screenshotHelper: ScreenshotHelper
  public shortcutsHelper: ShortcutsHelper
  public processingHelper: ProcessingHelper

  // View management
  private view: "queue" | "solutions" | "debug" = "queue"

  private problemInfo: {
    problem_statement: string
    input_format: Record<string, any>
    output_format: Record<string, any>
    constraints: Array<Record<string, any>>
    test_cases: Array<Record<string, any>>
  } | null = null // Allow null

  private hasDebugged: boolean = false

  // Processing events
  public readonly PROCESSING_EVENTS = {
    //global states
    UNAUTHORIZED: "procesing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",
    API_KEY_OUT_OF_CREDITS: "processing-api-key-out-of-credits",
    API_KEY_INVALID: "processing-api-key-invalid",

    //states for generating the initial solution
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",

    //states for processing the debugging
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error"
  } as const

  constructor() {
    // Initialize WindowHelper with this
    this.windowHelper = new WindowHelper(this)

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)

    // Initialize ProcessingHelper
    this.processingHelper = new ProcessingHelper(this)

    // Initialize ShortcutsHelper
    this.shortcutsHelper = new ShortcutsHelper(this)
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Getters and Setters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getView(): "queue" | "solutions" | "debug" {
    return this.view
  }

  public setView(view: "queue" | "solutions" | "debug"): void {
    // Set view state before updating screenshot helper
    this.view = view
    // Update screenshot helper's view state
    this.screenshotHelper.setView(view)
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public getScreenshotHelper(): ScreenshotHelper {
    return this.screenshotHelper
  }

  public getProblemInfo(): any {
    return this.problemInfo
  }

  public setProblemInfo(problemInfo: any): void {
    this.problemInfo = problemInfo
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue()
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue()
  }

  // Window management methods
  public createWindow(): void {
    this.windowHelper.createWindow()
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    this.windowHelper.toggleMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height)
  }

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()

    // Clear problem info
    this.problemInfo = null

    // Reset view to initial state
    this.setView("queue")
  }

  // Screenshot management methods
  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available")

    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    )

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  // New methods to move the window
  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft()
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight()
  }
  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown()
  }
  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp()
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged
  }
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (AppState.getInstance().getMainWindow()) {
      const win = AppState.getInstance().getMainWindow()
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  const isDev = !app.isPackaged
  function loadEnvVariables() {
    // In development, load from project root
    if (isDev) {
      dotenv.config({ path: path.join(process.cwd(), ".env") })
    } else {
      // In production, load from the app's resources directory
      dotenv.config({
        path: path.join(process.resourcesPath, ".env")
      })
    }
  }
  loadEnvVariables()

  // Register protocol handler
  if (process.platform === "darwin") {
    app.setAsDefaultProtocolClient("interview-coder")
  } else {
    app.setAsDefaultProtocolClient("interview-coder", process.execPath, [
      path.resolve(process.argv[1] || "")
    ])
  }

  // Handle the protocol. In this case, we choose to show an Error Box.
  app.on("open-url", (event, url) => {
    event.preventDefault()
    handleAuthCallback(url)
  })

  // Handle auth callback
  async function handleAuthCallback(url: string) {
    try {
      console.log("Auth callback received:", url)
      const urlObj = new URL(url)
      const code = urlObj.searchParams.get("code")

      if (!code) {
        console.error("Missing code in callback URL")
        return
      }

      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        if (isDev) {
          // In dev, exchange the code for tokens in the main process
          const { createClient } = await import("@supabase/supabase-js")
          const supabase = createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.VITE_SUPABASE_ANON_KEY!
          )
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            code
          )
          if (error) {
            console.error("Dev main exchange error:", error)
            return
          }
          if (data?.session) {
            mainWindow.webContents.send("auth-callback", {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token
            })
          }
        } else {
          // In production, send the code to the renderer
          mainWindow.webContents.send("auth-callback", { code })
        }
      }
    } catch (error) {
      console.error("Error handling auth callback:", error)
    }
  }

  // Handle the protocol for Windows
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient("interview-coder", process.execPath, [
        path.resolve(process.argv[1])
      ])
    }
  } else {
    app.setAsDefaultProtocolClient("interview-coder")
  }

  // Handle the protocol callback in Windows
  app.on("second-instance", (event, commandLine) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }

    // Look for the custom protocol url
    const url = commandLine.find((arg) => arg.startsWith("interview-coder://"))
    if (url) {
      handleAuthCallback(url)
    }
  })

  // Application initialization
  async function initializeApp() {
    const appState = AppState.getInstance()

    // Initialize IPC handlers before window creation
    initializeIpcHandlers(appState)

    app.whenReady().then(() => {
      // Load environment variables now that app is ready
      try {
        loadEnvVariables()
      } catch (error) {
        console.error("Failed to load environment variables:", error)
        app.quit()
        return
      }

      appState.createWindow()
      // Register global shortcuts using ShortcutsHelper
      appState.shortcutsHelper.registerGlobalShortcuts()

      // Initialize auto-updater in production
      if (app.isPackaged) {
        initAutoUpdater()
      } else {
        console.log("Running in development mode - auto-updater disabled")
      }
    })

    app.on("activate", () => {
      if (appState.getMainWindow() === null) {
        appState.createWindow()
      }
    })

    // Quit when all windows are closed, except on macOS
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit()
      }
    })

    app.dock?.hide() // Hide dock icon (optional)
    app.commandLine.appendSwitch("disable-background-timer-throttling")

    console.log("Preload script path:", path.join(__dirname, "preload.js"))
    console.log("__dirname:", __dirname)
  }

  // Start the application (only once)
  initializeApp().catch(console.error)
}
