import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Get the hash fragment from the URL
    const hashFragment = window.location.hash
    if (hashFragment) {
      // Parse the access token from the hash
      const params = new URLSearchParams(hashFragment.substring(1))
      const accessToken = params.get("access_token")

      if (accessToken) {
        // Set the session in Supabase
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: params.get("refresh_token") || ""
        })

        // Redirect to the home page
        navigate("/")
      }
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Completing sign in...</div>
    </div>
  )
}
