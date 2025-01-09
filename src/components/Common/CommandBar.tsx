import React, { useState, useEffect, useRef } from "react"

export interface Command {
  label: string
  shortcut: {
    key1: string
    key2: string
  }
  description?: string
}

interface CommandBarProps {
  commands: Command[]
  tooltipTitle?: string
  onTooltipVisibilityChange?: (visible: boolean, height: number) => void
}

const CommandBar: React.FC<CommandBarProps> = ({
  commands,
  tooltipTitle = "Keyboard Shortcuts",
  onTooltipVisibilityChange
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (onTooltipVisibilityChange) {
      let tooltipHeight = 0
      if (tooltipRef.current && isTooltipVisible) {
        tooltipHeight = tooltipRef.current.offsetHeight + 10
      }
      onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
    }
  }, [isTooltipVisible, onTooltipVisibilityChange])

  const handleMouseEnter = () => setIsTooltipVisible(true)
  const handleMouseLeave = () => setIsTooltipVisible(false)

  return (
    <div>
      <div className="pt-2 w-fit">
        <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4">
          {commands.map((command, index) => (
            <React.Fragment key={command.label}>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-[11px] leading-none">
                  {command.label}
                </span>
                <div className="flex gap-1">
                  <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    {command.shortcut.key1}
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    {command.shortcut.key2}
                  </button>
                </div>
              </div>
              {index < commands.length - 1 && (
                <div className="mx-2 h-4 w-px bg-white/20" />
              )}
            </React.Fragment>
          ))}

          {/* Question Mark with Tooltip */}
          <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors flex items-center justify-center cursor-help z-10">
              <span className="text-xs text-white/70">?</span>
            </div>

            {isTooltipVisible && (
              <div
                ref={tooltipRef}
                className="absolute top-full right-0 mt-2 w-80"
                style={{ zIndex: 100 }}
              >
                <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
                  <div className="space-y-4">
                    <h3 className="font-medium whitespace-nowrap">
                      {tooltipTitle}
                    </h3>
                    <div className="space-y-3">
                      {commands.map((command) => (
                        <div key={command.label} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="whitespace-nowrap">
                              {command.label}
                            </span>
                            <div className="flex gap-1">
                              <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                {command.shortcut.key1}
                              </span>
                              <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                {command.shortcut.key2}
                              </span>
                            </div>
                          </div>
                          {command.description && (
                            <p className="text-[10px] leading-relaxed text-white/70 whitespace-nowrap truncate">
                              {command.description}
                            </p>
                          )}
                        </div>
                      ))}
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

export default CommandBar
