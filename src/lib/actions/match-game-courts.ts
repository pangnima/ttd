'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CourtSurface } from '@/types'

export async function updateCourtSurfaceAction(
    clubId: string,
    matchGameId: string,
    courtId: string,
    surface: CourtSurface | null,
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // owner 권한 확인
    const { data: isOwner } = await supabase.rpc('is_club_owner', {
        p_club_id: clubId,
        p_user_id: user.id,
    })
    if (!isOwner) return { error: '클럽 운영자만 코트 표면을 수정할 수 있습니다.' }

    const { error } = await supabase
        .from('match_game_courts')
        .update({ surface })
        .eq('id', courtId)
        .eq('match_game_id', matchGameId)

    if (error) return { error: '코트 표면 수정에 실패했습니다.' }

    revalidatePath(`/clubs/${clubId}/match-games/${matchGameId}`)
    revalidatePath('/me/analytics')
    return { error: null }
}
