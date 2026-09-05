import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type {
    CourtSurface, MatchRequest, MatchRequestStatus, MatchResultStatus, MatchType, PersonalMatchSetScore,
} from '@/types'

type MatchRequestRow = Database['public']['Tables']['match_requests']['Row']
type NegotiationRow = Database['public']['Tables']['match_result_negotiations']['Row']
type RequestParticipantRow = Database['public']['Tables']['match_request_participants']['Row']
type MatchRequestRowWithJoins = MatchRequestRow & {
    negotiation: NegotiationRow | null
    participants: RequestParticipantRow[]
}

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

function mapMatchRequestRow(row: MatchRequestRowWithJoins): MatchRequest {
    const neg = row.negotiation
    const partner = row.participants?.find((p) => p.role === 'partner')
    const opponent2 = row.participants?.find((p) => p.role === 'opponent2')
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
        courtName: row.court_name ?? undefined,
        status: row.status as MatchRequestStatus,
        roomId: row.room_id ?? undefined,
        createdAt: row.created_at,
        respondedAt: row.responded_at ?? undefined,
        resultStatus: (neg?.result_status as MatchResultStatus) ?? 'none',
        proposedSetScores: (neg?.proposed_set_scores as PersonalMatchSetScore[]) ?? [],
        proposedBy: neg?.proposed_by ?? undefined,
        proposedAt: neg?.proposed_at ?? undefined,
        disputeReason: neg?.dispute_reason ?? undefined,
        // 복식 전용 (단식은 참가자 행 없음)
        partnerUserId: partner?.user_id ?? undefined,
        partnerName: partner?.name ?? undefined,
        partnerDominantHand: toHand(partner?.dominant_hand ?? null),
        partnerNtrp: partner?.ntrp_snapshot != null ? Number(partner.ntrp_snapshot) : undefined,
        opponent2UserId: opponent2?.user_id ?? undefined,
        opponent2Name: opponent2?.name ?? undefined,
        opponent2DominantHand: toHand(opponent2?.dominant_hand ?? null),
        opponent2Ntrp: opponent2?.ntrp_snapshot != null ? Number(opponent2.ntrp_snapshot) : undefined,
    }
}

function toHand(v: string | null): 'right' | 'left' | undefined {
    return v === 'right' || v === 'left' ? v : undefined
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
// 결과 협상(match_result_negotiations, 1:1)·참가자(match_request_participants, 복식 partner/opponent2) 공용 임베드.
const REQUEST_JOINS = 'negotiation:match_result_negotiations(*), participants:match_request_participants(*)'

/**
 * 내가 당사자인 확인 요청 전량(요청자·대표 확인자 양방향) 1회 조회 — 확인 요청 허브의 A축.
 * 받은/보낸/종료를 세 쿼리로 나누던 구 경로(fetchReceived·fetchSent·fetchPendingResultConfirmations)를
 * 대체한다. 상태 필터를 걸지 않는 이유: 허브가 pending(참여 확인)·rejected/canceled(이력)를 한 화면에서
 * 나눠 보여주고, accepted는 personal_matches 쪽(B축)이 담당하므로 분류는 조립 계층이 한다.
 * 양쪽 users를 임베드한 뒤 viewer 기준으로 counterpart를 고른다(최신순).
 */
export async function fetchMyMatchRequests(userId: string): Promise<MatchRequestWithUser[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_requests')
        .select(`*, requester:users!match_requests_requester_id_fkey(${COUNTERPART_COLUMNS}), opponent:users!match_requests_opponent_user_id_fkey(${COUNTERPART_COLUMNS}), ${REQUEST_JOINS}`)
        .or(`requester_id.eq.${userId},opponent_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map((row) => ({
        request: mapMatchRequestRow(row),
        counterpart: mapCounterpart(row.requester_id === userId ? row.opponent : row.requester),
    }))
}
