import React, { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog"
import { Button } from "./ui/button"
import { useToast } from "../contexts/toast"

export const UpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    const unsubscribeAvailable = window.electronAPI.onUpdateAvailable(() => {
      setUpdateAvailable(true)
    })

    const unsubscribeDownloaded = window.electronAPI.onUpdateDownloaded(() => {
      setUpdateDownloaded(true)
      setIsDownloading(false)
      showToast(
        "Update Ready",
        "A new version has been downloaded and will be installed when you restart the app.",
        "success"
      )
    })

    return () => {
      unsubscribeAvailable()
      unsubscribeDownloaded()
    }
  }, [])

  const handleStartUpdate = async () => {
    setIsDownloading(true)
    const result = await window.electronAPI.startUpdate()
    if (!result.success) {
      setIsDownloading(false)
      showToast("Error", "Failed to download update", "error")
    }
  }

  const handleInstallUpdate = () => {
    window.electronAPI.installUpdate()
  }

  if (!updateAvailable && !updateDownloaded) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 bg-black/80 text-white border-white/20 hover:bg-black/60"
        >
          {updateDownloaded ? "Update Ready" : "Update Available"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/90 text-white border-white/20">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">
            {updateDownloaded
              ? "Update Ready to Install"
              : "A New Version is Available"}
          </h2>
          <p className="text-sm text-white/70 mb-6">
            {updateDownloaded
              ? "The update has been downloaded and will be installed when you restart the app."
              : "Would you like to download the latest version?"}
          </p>
          <div className="flex justify-end gap-2">
            {updateDownloaded ? (
              <Button
                variant="outline"
                onClick={handleInstallUpdate}
                className="border-white/20 hover:bg-white/10"
              >
                Restart and Install
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleStartUpdate}
                disabled={isDownloading}
                className="border-white/20 hover:bg-white/10"
              >
                {isDownloading ? "Downloading..." : "Download Update"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
