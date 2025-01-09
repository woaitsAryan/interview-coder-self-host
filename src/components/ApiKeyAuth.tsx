import { useState, useRef, useEffect } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card"

interface ApiKeyAuthProps {
  onApiKeySubmit: (apiKey: string) => void
}

const ApiKeyAuth: React.FC<ApiKeyAuthProps> = ({ onApiKeySubmit }) => {
  const [apiKey, setApiKey] = useState("")
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Height update logic
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
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

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim())
    }
  }

  const handleOpenLink = (url: string) => {
    window.electronAPI.openExternal(url)
  }

  return (
    <div
      ref={contentRef}
      className="w-fit h-fit flex flex-col items-center justify-center bg-gray-50 rounded-xl"
    >
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold text-center">
            Welcome to Interview Coder
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            Please enter your OpenAI API key to continue. Your key will not be
            stored, so keep it in a safe place to copy it for next time. Press
            Cmd + B to hide/show the window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              className="w-full font-medium"
              disabled={!apiKey.trim()}
            >
              Continue
            </Button>
            <p className="text-gray-400 text-xs text-center pt-2">
              built out of frustration by{" "}
              <button
                onClick={() =>
                  handleOpenLink("https://www.linkedin.com/in/roy-lee-cs123")
                }
                className="text-gray-400 hover:text-gray-600 underline"
              >
                Roy
              </button>{" "}
              n'{" "}
              <button
                onClick={() =>
                  handleOpenLink("https://www.linkedin.com/in/neel-shanmugam/")
                }
                className="text-gray-400 hover:text-gray-600 underline"
              >
                Neel
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ApiKeyAuth
