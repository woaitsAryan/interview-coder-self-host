import { supabase } from "./lib/supabase"
import SubscribedApp from "./_pages/SubscribedApp"
import SubscribePage from "./_pages/SubscribePage"
import { UpdateNotification } from "./components/UpdateNotification"
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient
} from "@tanstack/react-query"
import { useEffect, useState, useCallback } from "react"
import { User } from "@supabase/supabase-js"
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastProvider,
  ToastTitle,
  ToastVariant,
  ToastViewport
} from "./components/ui/toast"
import { ToastContext } from "./contexts/toast"

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
})

// Root component that provides the QueryClient
function App() {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })
  const [credits, setCredits] = useState<number>(0)
  const [currentLanguage, setCurrentLanguage] = useState<string>("python")
  const [isInitialized, setIsInitialized] = useState(false)

  // Helper function to safely update credits
  const updateCredits = useCallback((newCredits: number) => {
    setCredits(newCredits)
    window.__CREDITS__ = newCredits
  }, [])

  // Helper function to safely update language
  const updateLanguage = useCallback((newLanguage: string) => {
    setCurrentLanguage(newLanguage)
    window.__LANGUAGE__ = newLanguage
  }, [])

  // Helper function to mark initialization complete
  const markInitialized = useCallback(() => {
    setIsInitialized(true)
    window.__IS_INITIALIZED__ = true
  }, [])

  // Show toast method
  const showToast = useCallback(
    (title: string, description: string, variant: ToastVariant) => {
      setToastMessage({ title, description, variant })
      setToastOpen(true)
    },
    []
  )

  // Listen for PKCE code callback
  useEffect(() => {
    if (!import.meta.env.DEV) {
      const handleAuthCallbackPKCE = async (data: { code: string }) => {
        console.log("Production IPC: received code:", data)
        try {
          const { code } = data || {}
          if (!code) {
            console.error("No code in callback data")
            return
          }
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error("Error exchanging code for session:", error)
          } else {
            console.log("Production PKCE: Session exchanged successfully")
          }
        } catch (err) {
          console.error("Production PKCE: Error in auth callback:", err)
        }
      }

      console.log("PROD: Setting up PKCE-based IPC listener")
      window.electron?.ipcRenderer?.on("auth-callback", handleAuthCallbackPKCE)

      return () => {
        window.electron?.ipcRenderer?.removeListener(
          "auth-callback",
          handleAuthCallbackPKCE
        )
      }
    }
  }, [])

  // Handle credits initialization and updates
  useEffect(() => {
    const initializeAndSubscribe = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) return

      // Initial fetch
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("credits, preferred_language")
        .eq("user_id", user.id)
        .single()

      if (subscription) {
        updateCredits(subscription.credits)
        updateLanguage(subscription.preferred_language || "python")
        markInitialized()
      }

      // Subscribe to changes
      const channel = supabase
        .channel("credits")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "subscriptions",
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newCredits = payload.new.credits
            updateCredits(newCredits)
          }
        )
        .subscribe()

      // Listen for solution success to decrement credits
      const unsubscribeSolutionSuccess = window.electronAPI.onSolutionSuccess(
        async () => {
          // Get current credits before updating
          const { data: currentSubscription } = await supabase
            .from("subscriptions")
            .select("credits")
            .eq("user_id", user.id)
            .single()

          if (!currentSubscription) {
            console.error(
              "No subscription found when trying to decrement credits"
            )
            return
          }

          const { data: updatedSubscription, error } = await supabase
            .from("subscriptions")
            .update({ credits: currentSubscription.credits - 1 })
            .eq("user_id", user.id)
            .select("credits")
            .single()

          if (error) {
            console.error("Error updating credits:", error)
            return
          }

          updateCredits(updatedSubscription.credits)
        }
      )

      // Listen for out of credits notification
      const unsubscribeOutOfCredits = window.electronAPI.onOutOfCredits(() => {
        showToast(
          "Out of Credits",
          "You are out of credits. Please refill at https://www.interviewcoder.co/settings.",
          "error"
        )
      })

      // Cleanup function
      return () => {
        channel.unsubscribe()
        unsubscribeSolutionSuccess()
        unsubscribeOutOfCredits()
        // Reset initialization state on cleanup
        window.__IS_INITIALIZED__ = false
        setIsInitialized(false)
      }
    }

    initializeAndSubscribe()
  }, [updateCredits, updateLanguage, markInitialized, showToast])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ToastContext.Provider value={{ showToast }}>
          <AppContent isInitialized={isInitialized} />
          <UpdateNotification />
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
        </ToastContext.Provider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

function AuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)

  const validatePassword = (value: string) => {
    if (isSignUp && value.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return false
    }
    setPasswordError("")
    return true
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    if (value && isSignUp) validatePassword(value)
    else setPasswordError("")
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    if (isSignUp && !validatePassword(password)) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    setIsLoading(true)
    setError("")
    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`
            }
          })
        if (signUpError) throw signUpError

        if (signUpData?.session) {
          await supabase.auth.setSession({
            access_token: signUpData.session.access_token,
            refresh_token: signUpData.session.refresh_token
          })
          return
        }

        // If no session (email confirmation required), show message and switch to sign in
        setError("Please check your email to confirm your account")
        setTimeout(() => {
          setIsSignUp(false)
        }, 2000)
      } else {
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
        }
      }
    } catch (error) {
      console.error(`Error ${isSignUp ? "signing up" : "signing in"}:`, error)
      setError("Something went wrong, try again later")
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleAuth() {
    setIsLoading(true)
    setError("")
    console.log("isdev", import.meta.env.DEV)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: import.meta.env.DEV
            ? "http://localhost:54321/callback"
            : "interview-coder://callback",
          skipBrowserRedirect: false
        }
      })

      if (error) throw error
    } catch (error) {
      console.error(`Error with Google auth:`, error)
      setError("Something went wrong with Google authentication")
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError("")
    setPasswordError("")
    setEmail("")
    setPassword("")
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md space-y-8 p-4 sm:p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            <h2 className="text-2xl font-semibold text-white">
              {isSignUp ? "Create your account" : "Log in to Interview Coder"}
            </h2>

            <div className="w-full max-w-sm space-y-4">
              <button
                onClick={handleGoogleAuth}
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

              <form onSubmit={handleEmailAuth} className="space-y-3">
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
                <div className="space-y-1">
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={handlePasswordChange}
                    className={`w-full px-4 py-3 text-white rounded-2xl border focus:outline-none text-sm font-medium placeholder:text-[#989898] placeholder:font-medium transition-colors frosted-glass ${
                      passwordError
                        ? "border-red-500 focus:border-red-500"
                        : "border-white/10 focus:border-white/20"
                    } ${shake ? "shake" : ""}`}
                    required
                  />
                  {passwordError && (
                    <p className="text-sm text-red-500 px-1">{passwordError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !email || !password || !!passwordError}
                  className="relative w-full px-4 py-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium auth-button"
                >
                  {isLoading
                    ? isSignUp
                      ? "Creating account..."
                      : "Signing in..."
                    : isSignUp
                    ? "Create account"
                    : "Sign in"}
                </button>
              </form>

              <button
                onClick={toggleMode}
                className="block w-full border border-white/10 rounded-2xl p-4 hover:bg-[#1A1A1A] transition-colors group"
              >
                <p className="text-center text-sm text-[#989898]">
                  {isSignUp
                    ? "Already have an account? Sign in →"
                    : "Don't have an account? Sign up →"}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main App component that handles conditional rendering based on auth and subscription state
function AppContent({ isInitialized }: { isInitialized: boolean }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [credits, setCredits] = useState<number>(0)
  const [currentLanguage, setCurrentLanguage] = useState<string>("python")
  const queryClient = useQueryClient()

  // Check auth state on mount
  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check subscription and credits status whenever user changes
  useEffect(() => {
    const checkSubscriptionAndCredits = async () => {
      if (!user?.id) {
        setIsSubscribed(false)
        setCredits(0)
        setCurrentLanguage("python")
        return
      }

      setSubscriptionLoading(true)
      try {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*, credits, preferred_language")
          .eq("user_id", user.id)
          .maybeSingle()

        setIsSubscribed(!!subscription)
        if (subscription?.credits !== undefined) {
          setCredits(subscription.credits)
        }
        if (subscription?.preferred_language) {
          setCurrentLanguage(subscription.preferred_language)
          window.__LANGUAGE__ = subscription.preferred_language
        }
      } finally {
        setSubscriptionLoading(false)
      }
    }

    checkSubscriptionAndCredits()

    // Set up real-time subscription for both subscription status and credits
    const channel = supabase
      .channel(`sub-and-credits-${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: user?.id ? `user_id=eq.${user.id}` : undefined
        },
        async (payload) => {
          console.log("Subscription/credits event received:", {
            eventType: payload.eventType,
            old: payload.old,
            new: payload.new
          })

          // For any subscription event, check current subscription status
          if (
            payload.eventType === "DELETE" ||
            payload.eventType === "UPDATE"
          ) {
            console.log("Checking current subscription and credits status...")
            const { data: subscription } = await supabase
              .from("subscriptions")
              .select("*, credits, preferred_language")
              .eq("user_id", user?.id)
              .maybeSingle()

            console.log("Current subscription check result:", subscription)
            setIsSubscribed(!!subscription)
            if (subscription?.credits !== undefined) {
              setCredits(subscription.credits)
            } else {
              setCredits(0)
            }
            if (subscription?.preferred_language) {
              setCurrentLanguage(subscription.preferred_language)
              window.__LANGUAGE__ = subscription.preferred_language
            }
            await queryClient.invalidateQueries({ queryKey: ["user"] })
          }

          // Handle INSERT events
          if (
            payload.eventType === "INSERT" &&
            payload.new?.user_id === user?.id
          ) {
            console.log("New subscription detected")
            setIsSubscribed(true)
            const newCredits = payload.new.credits ?? 0
            setCredits(newCredits)
            if (payload.new.preferred_language) {
              setCurrentLanguage(payload.new.preferred_language)
              window.__LANGUAGE__ = payload.new.preferred_language
            }
            await queryClient.invalidateQueries({ queryKey: ["user"] })
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user?.id, queryClient])

  if (loading || (user && (subscriptionLoading || !isInitialized))) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
          <p className="text-white/60 text-sm">
            {loading
              ? "Loading..."
              : !isInitialized
              ? "Initializing..."
              : "Checking subscription..."}
          </p>
        </div>
      </div>
    )
  }

  // If not logged in, show auth form
  if (!user) {
    return <AuthForm />
  }

  // If logged in but not subscribed, show subscribe page
  if (!isSubscribed) {
    return <SubscribePage user={user} />
  }

  // If logged in and subscribed but credits aren't loaded yet, keep showing loading
  if (credits === undefined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
          <p className="text-white/60 text-sm">Loading credits...</p>
        </div>
      </div>
    )
  }

  // If logged in and subscribed with credits loaded, show the app
  return (
    <SubscribedApp
      credits={credits}
      currentLanguage={currentLanguage}
      setLanguage={setCurrentLanguage}
    />
  )
}

export default App
