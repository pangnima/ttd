'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export type CurrentUserState = {
    authUser: SupabaseUser | null
    isLoading: boolean
}

export function useCurrentUser(): CurrentUserState {
    const [authUser, setAuthUser] = useState<SupabaseUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        const supabase = createClient()

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (isMounted) {
                setAuthUser(user)
                setIsLoading(false)
            }
        })

        return () => {
            isMounted = false
        }
    }, [])

    return { authUser, isLoading }
}
