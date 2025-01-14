import React, { useState, useEffect, useRef } from "react"
import { useToast } from "../../_pages/SubscribedApp"
import { supabase } from "../../lib/supabase"

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  screenshotCount?: number
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshotCount = 0
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    let tooltipHeight = 0
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
  }, [isTooltipVisible])

  const handleSignOut = async () => {
    try {
      // Clear any local storage or electron-specific data first
      localStorage.clear()
      sessionStorage.clear()

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      console.error("Error signing out:", err)
    }
  }

  const handleMouseEnter = () => {
    setIsTooltipVisible(true)
  }

  const handleMouseLeave = () => {
    setIsTooltipVisible(false)
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gear icon */}
      <div className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors flex items-center justify-center cursor-help">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5 text-white/70"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>

      {/* Tooltip Content */}
      {isTooltipVisible && (
        <div
          ref={tooltipRef}
          className="absolute top-full right-0 mt-2 w-80"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="absolute -top-2 right-0 w-full h-2" />
          <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
            <div className="space-y-4">
              <h3 className="font-medium truncate">Keyboard Shortcuts</h3>
              <div className="space-y-3">
                {/* Toggle Command */}
                <div
                  className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI.toggleMainWindow()
                      if (!result.success) {
                        console.error("Failed to toggle window:", result.error)
                        showToast("Error", "Failed to toggle window", "error")
                      }
                    } catch (error) {
                      console.error("Error toggling window:", error)
                      showToast("Error", "Failed to toggle window", "error")
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Toggle Window</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ⌘
                      </span>
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        B
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                    Show or hide this window.
                  </p>
                </div>

                {/* Screenshot Command */}
                <div
                  className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                  onClick={async () => {
                    try {
                      const result =
                        await window.electronAPI.triggerScreenshot()
                      if (!result.success) {
                        console.error(
                          "Failed to take screenshot:",
                          result.error
                        )
                        showToast("Error", "Failed to take screenshot", "error")
                      }
                    } catch (error) {
                      console.error("Error taking screenshot:", error)
                      showToast("Error", "Failed to take screenshot", "error")
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Take Screenshot</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ⌘
                      </span>
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        H
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                    Take a screenshot of the problem description.
                  </p>
                </div>

                {/* Solve Command */}
                <div
                  className={`cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors ${
                    screenshotCount > 0 ? "" : "opacity-50 cursor-not-allowed"
                  }`}
                  onClick={async () => {
                    if (screenshotCount === 0) return

                    try {
                      const result =
                        await window.electronAPI.triggerProcessScreenshots()
                      if (!result.success) {
                        console.error(
                          "Failed to process screenshots:",
                          result.error
                        )
                        showToast(
                          "Error",
                          "Failed to process screenshots",
                          "error"
                        )
                      }
                    } catch (error) {
                      console.error("Error processing screenshots:", error)
                      showToast(
                        "Error",
                        "Failed to process screenshots",
                        "error"
                      )
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Solve Problem</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ⌘
                      </span>
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ↵
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                    {screenshotCount > 0
                      ? "Generate a solution based on the current problem."
                      : "Take a screenshot first to generate a solution."}
                  </p>
                </div>
              </div>

              {/* Separator and Log Out */}
              <div className="pt-3 mt-3 border-t border-white/10">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-[11px] text-red-400 hover:text-red-300 transition-colors w-full"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3 h-3"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </div>
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QueueCommands
