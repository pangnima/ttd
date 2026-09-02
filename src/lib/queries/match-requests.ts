import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type {
    CourtSurface, MatchRequest, MatchRequestStatus, MatchResultStatus, MatchType, PersonalMatchSetScore,
} from '@/types'

type MatchRequestRow = Database['public']['Tables']['match_requests']['Row']

// 요청 카드에 표시할 상대측(요청자 또는 수신자) 프로필 요약
export type MatchRequestCounterpart = {
    id: string
    name: string
    nickname: string
    profileImage?: string
    deleted: boolean
}

export type MatchRequestWithUser = {
    request: MatchRequest
    counterpart: MatchRequestCounterpart  // 받은 요청이면 요청자, 보낸 요청이면 상대
}

function mapMatchRequestRow(row: MatchRequestRow): MatchRequest {
    return {
        id: row.id,
        requesterId: row.requester_id,
        opponentUserId: row.opponent_user_id,
        playedAt: row.played_at,
        // Postgres time은 'HH:MM:SS'로 오므로 'HH:MM'로 자른다
        playedTime: row.played_time.slice(0, 5),
        matchType: row.match_type as MatchType,
        surface: row.surface as CourtSurface,
        setScores: (row.set_scores as PersonalMatchSetScore[]) ?? [],
        notes: row.notes ?? undefined,
        status: row.status as MatchRequestStatus,
        createdAt: row.created_at,
        respondedAt: row.responded_at ?? undefined,
        resultStatus: row.result_status as MatchResultStatus,
        proposedSetScores: (row.proposed_set_scores as PersonalMatchSetScore[]) ?? [],
        proposedBy: row.proposed_by ?? undefined,
        proposedAt: row.proposed_at ?? undefined,
        disputeReason: row.dispute_reason ?? undefined,
    }
}

type CounterpartRow = {
    id: string
    name: string
    nickname: string
    profile_image: string | null
    deleted_at: string | null
} | null

function mapCounterpart(row: CounterpartRow): MatchRequestCounterpart {
    return {
        id: row?.id ?? '',
        name: row?.name ?? '(알 수 없음)',
        nickname: row?.nickname ?? '',
        profileImage: row?.profile_image ?? undefined,
        deleted: !!row?.deleted_at,
    }
}

const COUNTERPART_COLUMNS = 'id, name, nickname, profile_image, deleted_at'

/** 내가 받은 확인 요청 (상대측 = 요청자 프로필 포함, 최신순) */
export async function fetchReceivedMatchRequests(userId: string): Promise<MatchRequestWithUser[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_requests')
        .select(`*, requester:users!match_requests_requester_id_fkey(${COUNTERPART_COLUMNS})`)
        .eq('opponent_user_id', userId)
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map((row) => ({
        request: mapMatchRequestRow(row),
        counterpart: mapCounterpart(row.requester),
    }))
}

/** 내가 보낸 확인 요청 (상대측 = 수신자 프로필 포함, 최신순) */
export async function fetchSentMatchRequests(userId: string): Promise<MatchRequestWithUser[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_requests')
        .select(`*, opponent:users!match_requests_opponent_user_id_fkey(${COUNTERPART_COLUMNS})`)
        .eq('requester_id', userId)
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map((row) => ({
        request: mapMatchRequestRow(row),
        counterpart: mapCounterpart(row.opponent),
    }))
}

/**
 * 내가 확인해야 할 결과 제안 (수락된 경기에서 상대가 세트를 제안한 것, 최신 제안순).
 * 요청자/상대 어느 쪽이든 확인자가 될 수 있으므로 양쪽 프로필을 임베드한 뒤 viewer 기준으로 상대측을 고른다.
 */
export async function fetchPendingResultConfirmations(userId: string): Promise<MatchRequestWithUser[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_requests')
        .select(`*, requester:users!match_requests_requester_id_fkey(${COUNTERPART_COLUMNS}), opponent:users!match_requests_opponent_user_id_fkey(${COUNTERPART_COLUMNS})`)
        .eq('status', 'accepted')
        .eq('result_status', 'proposed')
        .neq('proposed_by', userId)
        .or(`requester_id.eq.${userId},opponent_user_id.eq.${userId}`)
        .order('proposed_at', { ascending: false })
    if (error || !data) return []
    return data.map((row) => ({
        request: mapMatchRequestRow(row),
        counterpart: mapCounterpart(row.requester_id === userId ? row.opponent : row.requester),
    }))
}

/**
 * 사이드바/모바일 nav 뱃지 건수 — 받은 pending 요청 + 내가 확인해야 할 결과 제안.
 * (모바일 nav는 브라우저 클라이언트로 같은 두 조건을 직접 질의한다 — common/mobile-nav.tsx)
 */
export async function fetchPendingReceivedCount(userId: string): Promise<number> {
    const supabase = await createClient()
    const [pending, proposals] = await Promise.all([
        supabase
            .from('match_requests')
            .select('id', { count: 'exact', head: true })
            .eq('opponent_user_id', userId)
            .eq('status', 'pending'),
        supabase
            .from('match_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .eq('result_status', 'proposed')
            .neq('proposed_by', userId)
            .or(`requester_id.eq.${userId},opponent_user_id.eq.${userId}`),
    ])
    return (pending.error ? 0 : pending.count ?? 0) + (proposals.error ? 0 : proposals.count ?? 0)
}
