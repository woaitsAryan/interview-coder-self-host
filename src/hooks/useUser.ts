import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { User } from "@supabase/supabase-js"
import { useEffect } from "react"

export interface ExtendedUser extends User {
  isSubscribed?: boolean
  isOnWaitlist?: boolean
}

async function fetchUserAndStatus(): Promise<{
  user: ExtendedUser | null
  isSubscribed: boolean
  isOnWaitlist: boolean
}> {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) {
    return { user: null, isSubscribed: false, isOnWaitlist: false }
  }

  let isSubscribed = false
  let isOnWaitlist = false

  try {
    // Get subscription status
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("status, cancel_at, current_period_end")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (!subscriptionError && subscription) {
      // Check if subscription is active and not canceled or expired
      const isActive = subscription.status === "active"
      const isCanceled = !!subscription.cancel_at
      const isExpired = subscription.current_period_end
        ? new Date(subscription.current_period_end) < new Date()
        : false

      isSubscribed = isActive && !isCanceled && !isExpired
    }

    // Get waitlist status - check both email and user_id
    const { data: waitlistEntry, error: waitlistError } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", session.user.email)
      .maybeSingle()

    if (!waitlistError) {
      let finalWaitlistEntry = waitlistEntry
      if (!waitlistEntry) {
        const { data: waitlistEntryById } = await supabase
          .from("waitlist")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle()
        finalWaitlistEntry = waitlistEntryById
      }
      isOnWaitlist = !!finalWaitlistEntry
    }
  } catch (error) {
    console.error("Error fetching user status:", error)
  }

  return {
    user: { ...session.user, isSubscribed, isOnWaitlist },
    isSubscribed,
    isOnWaitlist
  }
}

export function useUser() {
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUserAndStatus,
    staleTime: 0, // Consider data always stale
    gcTime: 0, // Don't cache the data
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true // Refetch when window gains focus
  })

  useEffect(() => {
    // Set up auth state change listener
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        // Invalidate and refetch user data
        queryClient.invalidateQueries({ queryKey: ["user"] })
      }
    })

    // Cleanup subscription when component unmounts
    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  const joinWaitlist = async (email: string) => {
    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: "Invalid email format" }
    }

    // Check if email is already on waitlist
    const { data: existingEntry } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", email)
      .single()

    if (existingEntry) {
      return { success: true, message: "You're already on the waitlist!" }
    }

    const { error } = await supabase.from("waitlist").insert([
      {
        email,
        user_id: data?.user?.id || null
      }
    ])
    if (error) {
      // Check if it's a unique constraint violation (duplicate email)
      if (error.code === "23505" || error.message?.includes("duplicate")) {
        return { success: true, message: "You're already on the waitlist!" }
      }
      // For other errors, throw generic error
      throw new Error("Failed to join waitlist")
    }

    // Invalidate and refetch user data
    queryClient.invalidateQueries({ queryKey: ["user"] })
    return { success: true, message: null }
  }

  return {
    user: data?.user ?? null,
    isSubscribed: data?.isSubscribed ?? false,
    isOnWaitlist: data?.isOnWaitlist ?? false,
    loading: isLoading,
    joinWaitlist,
    refetch
  }
}
