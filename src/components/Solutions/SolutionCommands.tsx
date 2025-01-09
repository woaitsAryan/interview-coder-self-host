import React, { useState, useEffect, useRef } from "react"
import { useToast } from "../../App"

interface ExtraScreenshotsQueueCommandsProps {
  extraScreenshots: any[]
  onTooltipVisibilityChange?: (visible: boolean, height: number) => void
}

const ExtraScreenshotsQueueCommands: React.FC<
  ExtraScreenshotsQueueCommandsProps
> = ({ extraScreenshots, onTooltipVisibilityChange }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  const handleResetApiKey = async () => {
    try {
      const result = await window.electronAPI.clearStore()
      if (result.success) {
        window.location.reload()
      } else {
        showToast("Error", "Failed to reset API key", "error")
      }
    } catch (error) {
      showToast("Error", "Failed to reset API key", "error")
    }
  }

  useEffect(() => {
    if (onTooltipVisibilityChange) {
      let tooltipHeight = 0
      if (tooltipRef.current && isTooltipVisible) {
        tooltipHeight = tooltipRef.current.offsetHeight + 10 // Adjust if necessary
      }
      onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
    }
  }, [isTooltipVisible, onTooltipVisibilityChange])

  const handleMouseEnter = () => {
    setIsTooltipVisible(true)
  }

  const handleMouseLeave = () => {
    setIsTooltipVisible(false)
  }

  return (
    <div>
      <div className="pt-2 w-fit">
        <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4">
          {/* Show/Hide */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[11px] leading-none">Show/Hide</span>
            <div className="flex gap-1">
              <button className="bg-white/10  rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                ⌘
              </button>
              <button className="bg-white/10  rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                B
              </button>
            </div>
          </div>

          {/* Screenshot */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[11px] leading-none truncate">
              {extraScreenshots.length === 0
                ? "Screenshot your code"
                : "Screenshot"}
            </span>
            <div className="flex gap-1">
              <button className="bg-white/10  rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                ⌘
              </button>
              <button className="bg-white/10  rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                H
              </button>
            </div>
          </div>
          {extraScreenshots.length > 0 && (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-[11px] leading-none">Debug</span>
              <div className="flex gap-1">
                <button className="bg-white/10  rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                  ⌘
                </button>
                <button className="bg-white/10  rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                  ↵
                </button>
              </div>
            </div>
          )}

          {/* Start Over */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[11px] leading-none">Start over</span>
            <div className="flex gap-1">
              <button className="bg-white/10  rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                ⌘
              </button>
              <button className="bg-white/10  rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                R
              </button>
            </div>
          </div>
          {/* Separator */}
          <div className="mx-2 h-4 w-px bg-white/20" />

          {/* Settings with Tooltip */}
          <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Gear icon */}
            <div className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors flex items-center justify-center cursor-help z-10">
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
                style={{ zIndex: 100 }}
              >
                <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
                  <div className="space-y-4">
                    <h3 className="font-medium whitespace-nowrap">
                      Keyboard Shortcuts
                    </h3>
                    <div className="space-y-3">
                      {/* Toggle Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="whitespace-nowrap">
                            Toggle Window
                          </span>
                          <div className="flex gap-1">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              B
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 whitespace-nowrap truncate">
                          Show or hide this window.
                        </p>
                      </div>
                      {/* Screenshot Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="whitespace-nowrap">
                            Take Screenshot
                          </span>
                          <div className="flex gap-1">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              H
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 whitespace-nowrap truncate">
                          Capture additional parts of the question or your
                          solution for debugging help. Up to 5 extra screenshots
                          are saved.
                        </p>
                      </div>
                      {/* Debug Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="whitespace-nowrap">Debug</span>
                          <div className="flex gap-1">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ↵
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 whitespace-nowrap truncate">
                          Generate new solutions based on all previous and newly
                          added screenshots.
                        </p>
                      </div>
                      {/* Start Over Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="whitespace-nowrap">Start Over</span>
                          <div className="flex gap-1">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              R
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 whitespace-nowrap truncate">
                          Start fresh with a new question.
                        </p>
                      </div>
                      {/* Window Movement Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="whitespace-nowrap">Move Window</span>
                          <div className="flex gap-1">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ←↑↓→
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 whitespace-nowrap truncate">
                          Move the window in any direction.
                        </p>
                      </div>
                    </div>

                    {/* Separator and Reset API Key */}
                    <div className="pt-3 mt-3 border-t border-white/10">
                      <button
                        onClick={handleResetApiKey}
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
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                            <path d="M16 21h5v-5" />
                          </svg>
                        </div>
                        Reset API Key
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExtraScreenshotsQueueCommands
