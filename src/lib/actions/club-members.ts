'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function revalidateClubPaths(clubId: string) {
    revalidatePath('/clubs', 'layout')
    revalidatePath(`/clubs/${clubId}`, 'layout')
    revalidatePath(`/clubs/${clubId}/members`, 'layout')
    revalidatePath('/dashboard', 'layout')
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
        .eq('status', 'pending')

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
        .eq('status', 'pending')

    if (error) return { error: error.message }
    revalidateClubPaths(clubId)
    return null
}
