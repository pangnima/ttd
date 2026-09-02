import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { Club, ClubMember, User } from '@/types'
import { mapUserRow } from '@/lib/queries/users'

type ClubRow = Database['public']['Tables']['clubs']['Row']
type MemberRow = Database['public']['Tables']['club_members']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

export type MemberWithUser = ClubMember & { user: User }

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
        courtSchedule: row.court_schedule ?? undefined,
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
    // RLS상 비가입 클럽의 club_members는 직접 조회할 수 없으므로, SECURITY DEFINER RPC로 집계값만 가져온다.
    const { data, error } = await supabase.rpc('get_club_member_counts', {
        p_club_ids: clubIds,
    })
    if (error || !data) return counts

    for (const row of data) {
        counts.set(row.club_id, { regular: row.regular, guest: row.guest })
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

// 설정 페이지용: 현재 활성·미만료 초대 토큰 (없으면 null). club_invites SELECT RLS는 owner만 허용.
export async function fetchActiveInvite(clubId: string): Promise<string | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_invites')
        .select('token, expires_at')
        .eq('club_id', clubId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (error || !data) return null
    if (data.expires_at && new Date(data.expires_at) <= new Date()) return null
    return data.token
}
