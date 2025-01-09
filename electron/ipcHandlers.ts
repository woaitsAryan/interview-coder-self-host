// ipcHandlers.ts

import { ipcMain } from "electron"
import { AppState } from "./main"
import { store } from "./store"

export function initializeIpcHandlers(appState: AppState): void {
  console.log("Initializing IPC handlers")

  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        appState.setWindowDimensions(width, height)
      }
    }
  )

  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return appState.deleteScreenshot(path)
  })

  ipcMain.handle("clear-store", async () => {
    try {
      return { success: true }
    } catch (error) {
      console.error("Error clearing store:", error)
      return { success: false, error: "Failed to clear store" }
    }
  })

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeScreenshot()
      const preview = await appState.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      throw error
    }
  })

  ipcMain.handle("get-screenshots", async () => {
    try {
      let previews = []
      const currentView = appState.getView()
      console.log("Getting screenshots for view:", currentView)

      if (currentView === "queue") {
        const queue = appState.getScreenshotQueue()
        console.log("Main queue contents:", queue)
        previews = await Promise.all(
          queue.map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      } else {
        const extraQueue = appState.getExtraScreenshotQueue()
        console.log("Extra queue contents:", extraQueue)
        previews = await Promise.all(
          extraQueue.map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      }
      console.log(
        "Returning previews:",
        previews.map((p) => p.path)
      )
      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  ipcMain.handle("toggle-window", async () => {
    console.log("toggle-window handler called")
    try {
      appState.toggleMainWindow()
      console.log("Window toggled successfully")
      return { success: true }
    } catch (error) {
      console.error("Error in toggle-window handler:", error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle("reset-queues", async () => {
    try {
      appState.clearQueues()
      return { success: true }
    } catch (error: any) {
      console.error("Error resetting queues:", error)
      return { success: false, error: error.message }
    }
  })

  // Take Screenshot (Command + H)
  ipcMain.handle("trigger-screenshot", async () => {
    const mainWindow = appState.getMainWindow()
    if (mainWindow) {
      try {
        const screenshotPath = await appState.takeScreenshot()
        const preview = await appState.getImagePreview(screenshotPath)
        mainWindow.webContents.send("screenshot-taken", {
          path: screenshotPath,
          preview
        })
        return { success: true }
      } catch (error) {
        console.error("Error capturing screenshot:", error)
        return { success: false, error: String(error) }
      }
    }
    return { success: false, error: "No main window found" }
  })

  // Process Screenshots (Command + Enter)
  ipcMain.handle("trigger-process-screenshots", async () => {
    try {
      await appState.processingHelper.processScreenshots()
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Reset (Command + R)
  ipcMain.handle("trigger-reset", () => {
    try {
      appState.processingHelper.cancelOngoingRequests()
      appState.clearQueues()
      appState.setView("queue")
      const mainWindow = appState.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Window Movement
  ipcMain.handle("trigger-move-left", () => {
    try {
      appState.moveWindowLeft()
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle("trigger-move-right", () => {
    try {
      appState.moveWindowRight()
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle("trigger-move-up", () => {
    try {
      appState.moveWindowUp()
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle("trigger-move-down", () => {
    try {
      appState.moveWindowDown()
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
