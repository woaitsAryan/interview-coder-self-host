import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function SignInForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const navigate = useNavigate()

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password")
        } else if (error.message.includes("Email not confirmed")) {
          setError("Please verify your email address")
        } else {
          setError(error.message)
        }
        setShake(true)
        setTimeout(() => setShake(false), 500)
        return
      }

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        })
        navigate("/")
      }
    } catch (error) {
      console.error("Error signing in with email:", error)
      setError("Something went wrong, try again later")
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setIsLoading(false)
    }
  }

  async function signInWithGoogle() {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      })

      if (error) throw error
    } catch (error) {
      console.error("Error signing in with Google:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md space-y-8 p-4 sm:p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            <h2 className="text-2xl font-semibold text-white">
              Log in to Interview Coder
            </h2>

            <div className="w-full max-w-sm space-y-4">
              <button
                onClick={signInWithGoogle}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1A1A] hover:bg-[#242424] text-white rounded-2xl border border-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black px-2 text-[#989898]">
                    Or continue with email
                  </span>
                </div>
              </div>

              <form onSubmit={signInWithEmail} className="space-y-3">
                <div className="space-y-1">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 text-white rounded-2xl border focus:outline-none text-sm font-medium placeholder:text-[#989898] placeholder:font-medium transition-colors frosted-glass ${
                      error
                        ? "border-red-500 focus:border-red-500"
                        : "border-white/10 focus:border-white/20"
                    } ${shake ? "shake" : ""}`}
                    required
                  />
                  {error && (
                    <p className="text-sm text-red-500 px-1">{error}</p>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 text-white rounded-2xl border focus:outline-none text-sm font-medium placeholder:text-[#989898] placeholder:font-medium transition-colors frosted-glass ${
                    error
                      ? "border-red-500 focus:border-red-500"
                      : "border-white/10 focus:border-white/20"
                  } ${shake ? "shake" : ""}`}
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="relative w-full px-4 py-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium auth-button"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <Link
                to="/signup"
                className="block w-full border border-white/10 rounded-2xl p-4 hover:bg-[#1A1A1A] transition-colors group"
              >
                <p className="text-center text-sm text-[#989898]">
                  Don't have an account? Sign up →
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
