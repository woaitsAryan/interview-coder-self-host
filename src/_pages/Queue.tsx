import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "react-query"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import QueueCommands from "../components/Queue/QueueCommands"
import { useToast } from "../App"

interface QueueProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>
}

const Queue: React.FC<QueueProps> = ({ setView }) => {
  const { showToast } = useToast()

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const { data: screenshots = [], refetch } = useQuery({
    queryKey: ["screenshots"],
    queryFn: async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load existing screenshots", "error")
        return []
      }
    },
    staleTime: Infinity,
    cacheTime: Infinity,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  })

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch() // Refetch screenshots instead of managing state directly
      } else {
        console.error("Failed to delete screenshot:", response.error)
        showToast("Error", "Failed to delete the screenshot file", "error")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
    }
  }

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
    // Height update logic
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    // Initialize resize observer
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),

      window.electronAPI.onSolutionError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your screenshots.",
          "error"
        )
        setView("queue") // Revert to queue if processing fails
        console.error("Processing error:", error)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no screenshots to process.",
          "neutral"
        )
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight])

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  return (
    <div ref={contentRef} className={`bg-transparent w-1/2`}>
      <div className="px-4 py-3">
        <div className="space-y-3 w-fit">
          <ScreenshotQueue
            isLoading={false}
            screenshots={screenshots}
            onDeleteScreenshot={handleDeleteScreenshot}
          />

          <div className="pt-2 w-fit">
            <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4">
              {/* Show/Hide */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] leading-none">Show/Hide</span>
                <div
                  className="flex gap-1"
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
                  <button className="bg-white/10  rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    ⌘
                  </button>
                  <button className="bg-white/10  rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    B
                  </button>
                </div>
              </div>

              {/* Screenshot */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] leading-none truncate">
                  {screenshots.length === 0
                    ? "Take first screenshot"
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

              {/* Solve Command */}
              {screenshots.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] leading-none">Solve</span>
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
              <div className="mx-2 h-4 bg-white/20" />

              <QueueCommands
                onTooltipVisibilityChange={handleTooltipVisibilityChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Queue
