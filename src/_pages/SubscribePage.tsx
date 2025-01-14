import { useUser } from "../hooks/useUser"
import { useState } from "react"

export default function SubscribePage() {
  const { user } = useUser()
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async () => {
    if (!user) return

    try {
      const result = await window.electronAPI.openSubscriptionPortal({
        id: user.id,
        email: user.email!
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to open subscription portal")
      }
    } catch (err) {
      console.error("Error opening subscription portal:", err)
      setError("Failed to open subscription portal. Please try again.")
      setTimeout(() => setError(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Welcome to Interview Coder
          </h2>
          <p className="text-gray-400 mb-8">
            To continue using Interview Coder, you'll need to subscribe.
          </p>

          <button
            onClick={handleSubscribe}
            className="w-full px-4 py-3 bg-white text-black rounded-2xl font-medium hover:bg-gray-100 transition-colors"
          >
            Subscribe Now
          </button>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  )
}
