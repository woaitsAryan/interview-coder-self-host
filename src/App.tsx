import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
} from "react-router-dom"
import { supabase } from "./lib/supabase"
import { useUser } from "./hooks/useUser"
import SignInForm from "./_pages/SignInForm"
import SignUpForm from "./_pages/SignUpForm"
import AuthCallback from "./_pages/AuthCallback"
import SubscribedApp from "./_pages/SubscribedApp"
import SubscribePage from "./_pages/SubscribePage"
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient
} from "@tanstack/react-query"
import { useEffect } from "react"

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

// We still keep a PrivateRoute to ensure only authenticated users can access '/'
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSubscribed } = useUser()

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-black">Loading...</div>
      </div>
    )
  }

  // If not logged in, redirect to sign in
  if (!user) {
    return <Navigate to="/signin" />
  }

  // If logged in but not subscribed, redirect to subscribe page
  if (!isSubscribed) {
    return <Navigate to="/subscribe" />
  }

  // If logged in and subscribed, show the app
  return <>{children}</>
}

// Main App component with routes
function AppRoutes() {
  const { user } = useUser()

  return (
    <Routes>
      {/* Protected main app route */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <SubscribedApp />
          </PrivateRoute>
        }
      />

      {/* Auth routes - redirect to main app if already logged in */}
      <Route
        path="/signin"
        element={user ? <Navigate to="/" /> : <SignInForm />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/" /> : <SignUpForm />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Subscribe route - only accessible when logged in but not subscribed */}
      <Route
        path="/subscribe"
        element={!user ? <Navigate to="/signin" /> : <SubscribePage />}
      />
    </Routes>
  )
}

function SubscriptionListener() {
  const queryClient = useQueryClient()
  const { user, refetch } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.id) return

    console.log("Setting up subscription listener for user:", user.id)

    // Listen to all changes on the subscriptions table
    const channel = supabase
      .channel(`sub-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions"
        },
        async (payload) => {
          console.log("Subscription event received:", {
            eventType: payload.eventType,
            old: payload.old,
            new: payload.new
          })

          // For any subscription event, check current subscription status
          if (
            payload.eventType === "DELETE" ||
            payload.eventType === "UPDATE"
          ) {
            console.log("Checking current subscription status...")

            // Check current subscription directly
            const { data: subscription } = await supabase
              .from("subscriptions")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle()

            console.log("Current subscription check result:", subscription)

            // Force refetch to update UI
            await queryClient.invalidateQueries({ queryKey: ["user"] })
            const result = await refetch()

            // Navigate based on subscription status
            if (!subscription || !result.data?.isSubscribed) {
              console.log(
                "No active subscription found, navigating to subscribe page"
              )
              navigate("/subscribe", { replace: true })
            }
          }

          // Handle INSERT events
          if (
            payload.eventType === "INSERT" &&
            payload.new?.user_id === user.id
          ) {
            console.log("New subscription detected")
            await queryClient.invalidateQueries({ queryKey: ["user"] })
            const result = await refetch()
            if (result.data?.isSubscribed) {
              navigate("/", { replace: true })
            }
          }
        }
      )
      .on("system", { event: "*" }, (payload) => {
        console.log("System event received:", payload)
      })
      .subscribe((status) => {
        console.log("Channel status changed to:", status)
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to changes for user:", user.id)
          // Test the subscription by making a test query
          supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .single()
            .then((result) => {
              console.log("Current subscription data:", result.data)
            })
        }
      })

    return () => {
      console.log("Cleaning up subscription listener")
      channel.unsubscribe()
    }
  }, [queryClient, user?.id, refetch, navigate])

  return null
}

// Root component that provides the QueryClient
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SubscriptionListener />
        <AppRoutes />
      </Router>
    </QueryClientProvider>
  )
}

export default App
