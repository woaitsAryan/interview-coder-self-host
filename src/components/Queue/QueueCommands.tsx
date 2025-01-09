import React, { useState, useEffect, useRef } from "react"
import { useToast } from "../../App"

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange
}) => {
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
    let tooltipHeight = 0
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10 // Adding margin/padding if necessary
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
  }, [isTooltipVisible])

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
          <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
            <div className="space-y-4">
              <h3 className="font-medium truncate">Keyboard Shortcuts</h3>
              <div className="space-y-3">
                {/* Toggle Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate">Toggle Window</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ⌘
                      </span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        B
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/70 truncate">
                    Show or hide this window.
                  </p>
                </div>
                {/* Screenshot Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate">Take Screenshot</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ⌘
                      </span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        H
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/70 truncate">
                    Take a screenshot of the problem description. The tool will
                    extract and analyze the problem. The 5 latest screenshots
                    are saved.
                  </p>
                </div>

                {/* Solve Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate">Solve Problem</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ⌘
                      </span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ↵
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/70 truncate">
                    Generate a solution based on the current problem.
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
  )
}

export default QueueCommands
