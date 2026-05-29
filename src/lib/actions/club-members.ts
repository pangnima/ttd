'use server'

// RLS 의존성:
//   - INSERT (가입 신청): user_id = auth.uid() AND status = 'pending' (RLS 정책)
//   - UPDATE (승인/거절): 클럽 owner만 허용 (RLS 정책, role = 'owner' JOIN)
//   - DELETE: 본인 row만 허용 (RLS 정책)
// 비즈니스 룰:
//   - owner는 클럽을 탈퇴할 수 없음 (클럽 삭제 후 탈퇴 가능)
//   - approveMember/rejectMember는 .eq('status', 'pending') 조건으로 멱등성 보장

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function revalidateClubPaths(clubId: string) {
    revalidatePath('/clubs', 'layout')
    revalidatePath(`/clubs/${clubId}`, 'layout')
    revalidatePath(`/clubs/${clubId}/members`, 'layout')
    revalidatePath(`/clubs/${clubId}/dashboard`, 'layout')
}

export async function applyToClubAction(clubId: string): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase
        .from('club_members')
        .insert({ user_id: user.id, club_id: clubId, role: 'member', status: 'pending' })

    if (error) return { error: error.message }
    revalidateClubPaths(clubId)
    return null
}

export async function cancelApplicationAction(clubId: string): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('user_id', user.id)
        .eq('club_id', clubId)
        .eq('status', 'pending')

    if (error) return { error: error.message }
    revalidateClubPaths(clubId)
    return null
}

export async function leaveClubAction(clubId: string): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    const { data: membership } = await supabase
        .from('club_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('club_id', clubId)
        .maybeSingle()
    // owner는 클럽을 먼저 삭제해야만 탈퇴 가능
    if (membership?.role === 'owner') return { error: '클럽장은 클럽을 탈퇴할 수 없습니다.' }

    const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('user_id', user.id)
        .eq('club_id', clubId)

    if (error) return { error: error.message }
    revalidateClubPaths(clubId)
    return null
}

export async function approveMemberAction(clubId: string, userId: string): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase
        .from('club_members')
        .update({ status: 'approved' })
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .eq('status', 'pending')   // pending인 row만 업데이트 (멱등성 보장)

    if (error) return { error: error.message }
    revalidateClubPaths(clubId)
    return null
}

export async function rejectMemberAction(clubId: string, userId: string): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase
        .from('club_members')
        .update({ status: 'rejected' })
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .eq('status', 'pending')   // pending인 row만 업데이트 (멱등성 보장)

    if (error) return { error: error.message }
    revalidateClubPaths(clubId)
    return null
}

export async function assignOfficerAction(clubId: string, userId: string): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    const { data: actorMembership } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle()
    if (actorMembership?.role !== 'owner') return { error: '운영자만 임원을 지정할 수 있습니다.' }

    const { error } = await supabase
        .from('club_members')
        .update({ role: 'officer' })
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .eq('role', 'member')   // member 행만 officer로 승격 (멱등성 보장)

    if (error) return { error: error.message }
    revalidateClubPaths(clubId)
    return null
}

export async function removeOfficerAction(clubId: string, userId: string): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    const { data: actorMembership } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle()
    if (actorMembership?.role !== 'owner') return { error: '운영자만 임원을 해제할 수 있습니다.' }

    const { error } = await supabase
        .from('club_members')
        .update({ role: 'member' })
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .eq('role', 'officer')   // officer 행만 member로 강등 (멱등성 보장)

    if (error) return { error: error.message }
    revalidateClubPaths(clubId)
    return null
}
