import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { User } from '@/types'

type UserRow = Database['public']['Tables']['users']['Row']

export function mapUserRow(row: UserRow): User {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        nickname: row.nickname,
        role: row.role as User['role'],
        profileImage: row.profile_image ?? undefined,
        phone: row.phone ?? '',
        gender: (row.gender ?? 'male') as User['gender'],
        dominantHand: (row.dominant_hand ?? 'right') as User['dominantHand'],
        ntrp: row.ntrp ?? 0,
        tennisStartDate: row.tennis_start_date ?? '',
        createdAt: row.created_at,
        isGuest: row.is_guest ?? false,
    }
}

export async function fetchUserById(id: string): Promise<User | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
    if (error || !data) return null
    return mapUserRow(data)
}

export async function fetchUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return []
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', ids)
    if (error || !data) return []
    return data.map(mapUserRow)
}
