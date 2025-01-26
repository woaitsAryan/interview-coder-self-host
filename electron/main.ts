import { app, BrowserWindow, screen, shell } from "electron"
import path from "path"
import { initializeIpcHandlers } from "./ipcHandlers"
import { ProcessingHelper } from "./ProcessingHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { initAutoUpdater } from "./autoUpdater"
import * as dotenv from "dotenv"

// Constants
const isDev = !app.isPackaged
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second
const AUTH_PROTOCOL = "interview-coder"

// Application State Class
export class AppState {
  private static instance: AppState | null = null
  // Window management properties
  private mainWindow: BrowserWindow | null = null
  private isWindowVisible: boolean = false
  private windowPosition: { x: number; y: number } | null = null
  private windowSize: { width: number; height: number } | null = null
  private screenWidth: number = 0
  private screenHeight: number = 0
  private step: number = 0
  private currentX: number = 0
  private currentY: number = 0

  // Application helpers
  private screenshotHelper: ScreenshotHelper
  public shortcutsHelper: ShortcutsHelper
  public processingHelper: ProcessingHelper

  // View and state management
  private view: "queue" | "solutions" | "debug" = "queue"
  private problemInfo: any = null
  private hasDebugged: boolean = false

  // Processing events
  public readonly PROCESSING_EVENTS = {
    UNAUTHORIZED: "processing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",
    API_KEY_OUT_OF_CREDITS: "processing-api-key-out-of-credits",
    API_KEY_INVALID: "processing-api-key-invalid",
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error"
  } as const

  private constructor() {
    // Initialize helpers
    this.screenshotHelper = new ScreenshotHelper(this.view)
    this.processingHelper = new ProcessingHelper(this)
    this.shortcutsHelper = new ShortcutsHelper(this)
  }

  public async handleAuthCallback(url: string, win: BrowserWindow | null) {
    try {
      console.log("Auth callback received:", url)
      const urlObj = new URL(url)
      const code = urlObj.searchParams.get("code")

      if (!code) {
        console.error("Missing code in callback URL")
        return
      }

      if (win) {
        // Ensure window is visible and focused when handling auth callback
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()

        // Send the code to the renderer for PKCE exchange
        win.webContents.send("auth-callback", { code })
      } else {
        console.error("No window available for auth callback")
      }
    } catch (error) {
      console.error("Error handling auth callback:", error)
    }
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Window management methods -------------------------------------------------
  public createWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore()
      this.mainWindow.focus()
      return
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize
    this.screenWidth = workArea.width
    this.screenHeight = workArea.height
    this.step = Math.floor(this.screenWidth / 10)

    const windowSettings: Electron.BrowserWindowConstructorOptions = {
      height: 600,
      x: this.currentX,
      y: 0,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: isDev
          ? path.join(__dirname, "../dist-electron/preload.js")
          : path.join(__dirname, "preload.js"),
        scrollBounce: true
      },
      show: true,
      frame: false,
      transparent: true,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000",
      focusable: true,
      skipTaskbar: true,
      type: "panel"
    }

    this.mainWindow = new BrowserWindow(windowSettings)

    this.mainWindow.webContents.openDevTools()

    // Configure window behavior
    this.mainWindow.webContents.setZoomFactor(1)

    // Open OAuth links in the browser instead of a new window
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      console.log("Attempting to open URL:", url)
      if (url.includes("google.com") || url.includes("supabase.co")) {
        shell.openExternal(url)
        return { action: "deny" }
      }
      return { action: "allow" }
    })

    this.mainWindow.setContentProtection(true)

    this.mainWindow.setHiddenInMissionControl(true)
    this.mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    })

    this.mainWindow.setAlwaysOnTop(true, "screen-saver", 1)

    // Add window loading event handlers
    this.mainWindow.webContents.on("did-finish-load", () => {
      console.log("Window finished loading")
    })

    this.mainWindow.webContents.on(
      "did-fail-load",
      async (event, errorCode, errorDescription) => {
        console.error("Window failed to load:", errorCode, errorDescription)
        if (isDev) {
          // In development, retry loading after a short delay
          console.log("Retrying to load development server...")
          await new Promise((resolve) => setTimeout(resolve, 1000))
          this.mainWindow?.loadURL("http://localhost:54321").catch((error) => {
            console.error("Failed to load dev server on retry:", error)
          })
        }
      }
    )

    if (isDev) {
      // In development, load from the dev server
      this.mainWindow.loadURL("http://localhost:54321").catch((error) => {
        console.error("Failed to load dev server:", error)
      })
    } else {
      // In production, load from the built files
      console.log(
        "Loading production build:",
        path.join(__dirname, "../dist/index.html")
      )
      this.mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
    }

    // Set up window listeners
    this.mainWindow.on("move", () => this.handleWindowMove())
    this.mainWindow.on("resize", () => this.handleWindowResize())
    this.mainWindow.on("closed", () => this.handleWindowClosed())

    // Initialize window state
    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }
    this.currentX = bounds.x
    this.currentY = bounds.y
    this.isWindowVisible = true
  }

  private handleWindowMove(): void {
    if (!this.mainWindow) return
    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.currentX = bounds.x
    this.currentY = bounds.y
  }

  private handleWindowResize(): void {
    if (!this.mainWindow) return
    const bounds = this.mainWindow.getBounds()
    this.windowSize = { width: bounds.width, height: bounds.height }
  }

  private handleWindowClosed(): void {
    this.mainWindow = null
    this.isWindowVisible = false
    this.windowPosition = null
    this.windowSize = null
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public isVisible(): boolean {
    return this.isWindowVisible
  }

  public hideMainWindow(): void {
    if (!this.mainWindow?.isDestroyed()) {
      const bounds = this.mainWindow.getBounds()
      this.windowPosition = { x: bounds.x, y: bounds.y }
      this.windowSize = { width: bounds.width, height: bounds.height }
      this.mainWindow.setIgnoreMouseEvents(true, { forward: true })
      this.mainWindow.setFocusable(false)
      this.mainWindow.setOpacity(0)
      this.mainWindow.hide()
      this.isWindowVisible = false
    }
  }

  public showMainWindow(): void {
    if (!this.mainWindow?.isDestroyed()) {
      if (this.windowPosition && this.windowSize) {
        this.mainWindow.setBounds({
          ...this.windowPosition,
          ...this.windowSize
        })
      }
      this.mainWindow.setIgnoreMouseEvents(false)
      this.mainWindow.setFocusable(true)
      this.mainWindow.setOpacity(0)
      this.mainWindow.show()
      this.mainWindow.setOpacity(1)
      this.mainWindow.showInactive()
      this.isWindowVisible = true
    }
  }

  public toggleMainWindow(): void {
    this.isWindowVisible ? this.hideMainWindow() : this.showMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    if (!this.mainWindow?.isDestroyed()) {
      const [currentX, currentY] = this.mainWindow.getPosition()
      const primaryDisplay = screen.getPrimaryDisplay()
      const workArea = primaryDisplay.workAreaSize
      const maxWidth = Math.floor(
        workArea.width * (this.hasDebugged ? 0.75 : 0.5)
      )

      this.mainWindow.setBounds({
        x: Math.min(currentX, workArea.width - maxWidth),
        y: currentY,
        width: Math.min(width + 32, maxWidth),
        height: Math.ceil(height)
      })
    }
  }

  // Window movement methods ---------------------------------------------------
  public moveWindowRight(): void {
    this.moveWindowHorizontal((x) =>
      Math.min(
        this.screenWidth - (this.windowSize?.width || 0) / 2,
        x + this.step
      )
    )
  }

  public moveWindowLeft(): void {
    this.moveWindowHorizontal((x) =>
      Math.max(-(this.windowSize?.width || 0) / 2, x - this.step)
    )
  }

  public moveWindowDown(): void {
    this.moveWindowVertical((y) =>
      Math.min(
        this.screenHeight - (this.windowSize?.height || 0) / 2,
        y + this.step
      )
    )
  }

  public moveWindowUp(): void {
    this.moveWindowVertical((y) =>
      Math.max(-(this.windowSize?.height || 0) / 2, y - this.step)
    )
  }

  private moveWindowHorizontal(updateFn: (x: number) => number): void {
    if (!this.mainWindow) return
    this.currentX = updateFn(this.currentX)
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  private moveWindowVertical(updateFn: (y: number) => number): void {
    if (!this.mainWindow) return
    this.currentY = updateFn(this.currentY)
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  // Application state management ----------------------------------------------
  public getView(): "queue" | "solutions" | "debug" {
    return this.view
  }

  public setView(view: "queue" | "solutions" | "debug"): void {
    this.view = view
    this.screenshotHelper.setView(view)
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

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()
    this.problemInfo = null
    this.setView("queue")
  }

  public async takeScreenshot(): Promise<string> {
    if (!this.mainWindow) throw new Error("No main window available")
    return this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    )
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged
  }
}

// Single Instance Lock and App Lifecycle Management
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    const url = commandLine.find((arg) => arg.startsWith(`${AUTH_PROTOCOL}://`))
    if (url) {
      AppState.getInstance().handleAuthCallback(
        url,
        AppState.getInstance().getMainWindow()
      )
    }

    const mainWindow = AppState.getInstance().getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // Function to load environment variables
  function loadEnvVariables() {
    if (isDev) {
      dotenv.config({ path: path.join(process.cwd(), ".env") })
    } else {
      dotenv.config({ path: path.join(process.resourcesPath, ".env") })
    }
  }

  loadEnvVariables()

  // Register the interview-coder protocol
  if (process.platform === "darwin") {
    app.setAsDefaultProtocolClient("interview-coder")
  } else {
    app.setAsDefaultProtocolClient("interview-coder", process.execPath, [
      path.resolve(process.argv[1] || "")
    ])
  }
  // Handle the protocol. In this case, we choose to show an Error Box.
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("interview-coder", process.execPath, [
      path.resolve(process.argv[1])
    ])
  }

  // Application initialization
  app.whenReady().then(async () => {
    try {
      loadEnvVariables()
    } catch (error) {
      console.error("Failed to load environment variables:", error)
      app.quit()
      return
    }

    const appState = AppState.getInstance()
    initializeIpcHandlers(appState)
    appState.createWindow()
    appState.shortcutsHelper.registerGlobalShortcuts()

    if (app.isPackaged) {
      initAutoUpdater()
    } else {
      console.log("Running in development mode - auto-updater disabled")
    }
  })

  // Handle window-all-closed event
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  // Handle activation (macOS)
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      AppState.getInstance().createWindow()
    }
  })

  // Handle the auth callback via custom protocol (macOS)
  app.on("open-url", (event, url) => {
    console.log("open-url event received:", url)
    event.preventDefault()
    if (url.startsWith(`${AUTH_PROTOCOL}://`)) {
      AppState.getInstance().handleAuthCallback(
        url,
        AppState.getInstance().getMainWindow()
      )
    }
  })
}
