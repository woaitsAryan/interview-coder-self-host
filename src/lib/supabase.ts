import { createClient } from "@supabase/supabase-js"

console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL)
console.log(
  "Supabase Anon Key:",
  import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 10) + "..."
)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    debug: true,
    storage: {
      getItem: (key) => {
        const item = localStorage.getItem(key)
        console.log("Auth storage - Getting key:", key, "Value exists:", !!item)
        return item
      },
      setItem: (key, value) => {
        console.log("Auth storage - Setting key:", key)
        localStorage.setItem(key, value)
      },
      removeItem: (key) => {
        console.log("Auth storage - Removing key:", key)
        localStorage.removeItem(key)
      }
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    headers: {
      apikey: supabaseAnonKey
    }
  }
})

export const signInWithGoogle = async () => {
  try {
    console.log("Initiating Google sign in...")
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) {
      console.error("Google sign in error:", error)
      throw error
    }

    console.log("Google sign in response:", data)
    return data
  } catch (error) {
    console.error("Unexpected error during Google sign in:", error)
    throw error
  }
}

let channel: ReturnType<typeof supabase.channel> | null = null

// Monitor auth state changes and manage realtime connection
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Auth state changed:", event, session?.user?.id)
  console.log("Full session data:", session)

  if (event === "SIGNED_IN" && session) {
    // Only establish realtime connection after successful sign in
    console.log("Establishing realtime connection...")

    // Clean up existing channel if any
    if (channel) {
      channel.unsubscribe()
    }

    channel = supabase.channel("system", {
      config: {
        presence: {
          key: session.user.id
        }
      }
    })

    channel
      .on("system", { event: "*" }, (payload) => {
        console.log("System event:", payload)
      })
      .subscribe((status) => {
        console.log("Realtime subscription status:", status)
        if (status === "SUBSCRIBED") {
          console.log("Successfully connected to realtime system")
        }
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime connection error - will retry in 5s")
          setTimeout(() => {
            channel?.subscribe()
          }, 5000)
        }
      })
  }

  if (event === "SIGNED_OUT") {
    // Clean up realtime connection on sign out
    if (channel) {
      console.log("Cleaning up realtime connection")
      channel.unsubscribe()
      channel = null
    }
  }
})
