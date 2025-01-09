import { autoUpdater } from "electron-updater"
import { BrowserWindow, ipcMain } from "electron"

export function initAutoUpdater() {
  // Configure auto updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Check for updates immediately
  autoUpdater.checkForUpdates()

  // Set up update checking interval (every 1 hour)
  setInterval(() => {
    autoUpdater.checkForUpdates()
  }, 60 * 60 * 1000)

  // Event handlers
  autoUpdater.on("update-available", (info) => {
    // Notify renderer process about available update
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("update-available", info)
    })
  })

  autoUpdater.on("update-downloaded", (info) => {
    // Notify renderer process that update is ready to install
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("update-downloaded", info)
    })
  })

  autoUpdater.on("error", (err) => {
    console.error("Auto updater error:", err)
  })

  // Handle IPC messages from renderer
  ipcMain.handle("start-update", async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error) {
      console.error("Failed to start update:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("install-update", () => {
    autoUpdater.quitAndInstall()
  })
}
