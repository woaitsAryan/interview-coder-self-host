import {
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastMessage,
  ToastVariant
} from "./components/ui/toast"
import Queue from "./_pages/Queue"
import { ToastViewport } from "@radix-ui/react-toast"
import { useEffect, useRef, useState } from "react"
import Solutions from "./_pages/Solutions"
import { QueryClient, QueryClientProvider } from "react-query"
import { createContext, useContext } from "react"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity
    }
  }
})

interface ToastContextType {
  showToast: (title: string, description: string, variant: ToastVariant) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined
)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

const App: React.FC = () => {
  const [view, setView] = useState<"queue" | "solutions" | "debug">("queue")
  const containerRef = useRef<HTMLDivElement>(null)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  // Effect for height monitoring
  useEffect(() => {
    const cleanup = window.electronAPI.onResetView(() => {
      queryClient.invalidateQueries(["screenshots"])
      queryClient.invalidateQueries(["problem_statement"])
      queryClient.invalidateQueries(["solution"])
      queryClient.invalidateQueries(["new_solution"])
      setView("queue")
    })

    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const updateHeight = () => {
      if (!containerRef.current) return
      const height = containerRef.current.scrollHeight
      const width = containerRef.current.scrollWidth
      window.electronAPI?.updateContentDimensions({ width, height })
    }

    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    // Initial height update
    updateHeight()

    // Observe for changes
    resizeObserver.observe(containerRef.current)

    // Also update height when view changes
    const mutationObserver = new MutationObserver(() => {
      updateHeight()
    })

    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [view]) // Re-run when view changes

  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onSolutionStart(() => {
        setView("solutions")
      }),

      window.electronAPI.onUnauthorized(() => {
        queryClient.removeQueries(["screenshots"])
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["problem_statement"])
        setView("queue")
      }),
      // Update this reset handler
      window.electronAPI.onResetView(() => {
        queryClient.removeQueries(["screenshots"])
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["problem_statement"])
        setView("queue")
      }),
      window.electronAPI.onProblemExtracted((data: any) => {
        if (view === "queue") {
          queryClient.invalidateQueries(["problem_statement"])
          queryClient.setQueryData(["problem_statement"], data)
        }
      }),
      window.electronAPI.onSolutionError((error: string) => {
        showToast("Error", error, "error")
      })
    ]
    return () => cleanupFunctions.forEach((cleanup) => cleanup())
  }, [])

  return (
    <div ref={containerRef} className="min-h-0">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ToastContext.Provider value={{ showToast }}>
            {view === "queue" ? (
              <Queue setView={setView} />
            ) : view === "solutions" ? (
              <Solutions setView={setView} />
            ) : (
              <></>
            )}
          </ToastContext.Provider>
          <Toast
            open={toastOpen}
            onOpenChange={setToastOpen}
            variant={toastMessage.variant}
            duration={3000}
          >
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App
