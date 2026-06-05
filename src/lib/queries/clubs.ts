import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { Club, ClubMember, User } from '@/types'
import { mapUserRow } from '@/lib/queries/users'

type ClubRow = Database['public']['Tables']['clubs']['Row']
type MemberRow = Database['public']['Tables']['club_members']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

export type MemberWithUser = ClubMember & { user: User }

export type PendingEntry = {
    club: Club
    member: ClubMember
    user: User
}

function mapClubRow(row: ClubRow): Club {
    return {
        id: row.id,
        name: row.name,
        description: row.description ?? '',
        region: row.region ?? '',
        isPublic: row.is_public,
        memberCount: row.member_count,
        ownerId: row.owner_id,
        createdAt: row.created_at,
        logoUrl: row.logo_url ?? undefined,
    }
}

function mapMemberRow(row: MemberRow): ClubMember {
    return {
        userId: row.user_id,
        clubId: row.club_id,
        role: row.role as ClubMember['role'],
        status: row.status as ClubMember['status'],
        joinedAt: row.joined_at,
    }
}


export async function fetchAllClubs(): Promise<Club[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map(mapClubRow)
}

export async function fetchClubById(id: string): Promise<Club | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single()
    if (error || !data) return null
    return mapClubRow(data)
}

export async function fetchMyClubs(userId: string): Promise<Club[]> {
    const supabase = await createClient()
    const { data: memberRows } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', userId)
        .eq('status', 'approved')
    if (!memberRows || memberRows.length === 0) return []

    const clubIds = memberRows.map((r) => r.club_id)
    const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .in('id', clubIds)
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map(mapClubRow)
}

export async function fetchClubMembers(
    clubId: string,
    status?: ClubMember['status']
): Promise<MemberWithUser[]> {
    const supabase = await createClient()
    let query = supabase
        .from('club_members')
        .select('*, users(*)')
        .eq('club_id', clubId)
        .order('joined_at', { ascending: true })

    if (status) {
        query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error || !data) return []

    return data
        .filter((row) => row.users)
        .map((row) => ({
            ...mapMemberRow(row),
            user: mapUserRow(row.users as UserRow),
        }))
}

export type ClubMemberCount = { regular: number; guest: number }

export async function fetchClubMemberCounts(
    clubIds: string[]
): Promise<Map<string, ClubMemberCount>> {
    const counts = new Map<string, ClubMemberCount>()
    if (clubIds.length === 0) return counts

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_members')
        .select('club_id, users(is_guest)')
        .in('club_id', clubIds)
        .eq('status', 'approved')
    if (error || !data) return counts

    for (const row of data) {
        const user = row.users as { is_guest: boolean | null } | null
        if (!user) continue
        const entry = counts.get(row.club_id) ?? { regular: 0, guest: 0 }
        if (user.is_guest) {
            entry.guest += 1
        } else {
            entry.regular += 1
        }
        counts.set(row.club_id, entry)
    }

    return counts
}

export async function fetchMyMembership(
    userId: string,
    clubId: string
): Promise<ClubMember | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_members')
        .select('*')
        .eq('user_id', userId)
        .eq('club_id', clubId)
        .maybeSingle()
    if (error || !data) return null
    return mapMemberRow(data)
}

export async function fetchPendingMembersByOwner(userId: string): Promise<PendingEntry[]> {
    const supabase = await createClient()
    const { data: ownedClubs, error: clubErr } = await supabase
        .from('clubs')
        .select('*')
        .eq('owner_id', userId)
    if (clubErr || !ownedClubs || ownedClubs.length === 0) return []

    const clubIds = ownedClubs.map((c) => c.id)
    const { data: pendingData, error: pendErr } = await supabase
        .from('club_members')
        .select('*, users(*)')
        .in('club_id', clubIds)
        .eq('status', 'pending')
    if (pendErr || !pendingData) return []

    const clubMap = new Map(ownedClubs.map((c) => [c.id, mapClubRow(c)]))

    return pendingData
        .filter((row) => row.users)
        .map((row) => ({
            club: clubMap.get(row.club_id)!,
            member: mapMemberRow(row),
            user: mapUserRow(row.users as UserRow),
        }))
}

export async function fetchFirstJoinedClubId(userId: string): Promise<string | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle()
    if (error || !data) return null
    return data.club_id
}
