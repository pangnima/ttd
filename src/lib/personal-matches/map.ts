import type { Database } from '@/types/supabase'
import type { CourtSurface, MatchType, PersonalMatch, PersonalMatchSetScore, PersonalMatchWinner } from '@/types'

type PersonalMatchRow = Database['public']['Tables']['personal_matches']['Row']
type PersonalMatchParticipantRow = Database['public']['Tables']['personal_match_participants']['Row']

/**
 * personal_matches DB row → PersonalMatch 도메인 매핑 (순수 함수, server-only 아님).
 * 단식/복식 다형성은 personal_match_participants(role별 1행)로 정규화되어 있으므로,
 * role('opponent'/'partner'/'opponent2')별로 찾아 예전 플랫 컬럼 형태의 도메인 타입으로 복원한다.
 * 쿼리(`queries/personal-matches.ts`)와 백필 스크립트가 공유한다.
 */
export function mapPersonalMatchRow(row: PersonalMatchRow, participants: PersonalMatchParticipantRow[] = []): PersonalMatch {
    const byRole = (role: string) => participants.find((p) => p.role === role)
    const opponent = byRole('opponent')
    const partner = byRole('partner')
    const opponent2 = byRole('opponent2')

    return {
        id: row.id,
        userId: row.user_id,
        opponentName: opponent?.name ?? '',
        opponentUserId: opponent?.user_id ?? undefined,
        opponentDominantHand: (opponent?.dominant_hand as 'right' | 'left' | null) ?? undefined,
        partnerUserId: partner?.user_id ?? undefined,
        partnerName: partner?.name ?? undefined,
        partnerDominantHand: (partner?.dominant_hand as 'right' | 'left' | null) ?? undefined,
        partnerNtrp: partner?.ntrp_snapshot != null ? Number(partner.ntrp_snapshot) : undefined,
        opponent2UserId: opponent2?.user_id ?? undefined,
        opponent2Name: opponent2?.name ?? undefined,
        opponent2DominantHand: (opponent2?.dominant_hand as 'right' | 'left' | null) ?? undefined,
        opponent2Ntrp: opponent2?.ntrp_snapshot != null ? Number(opponent2.ntrp_snapshot) : undefined,
        playedAt: row.played_at,
        // Postgres time은 'HH:MM:SS'로 오므로 'HH:MM'로 자른다
        playedTime: row.played_time ? row.played_time.slice(0, 5) : undefined,
        matchType: row.match_type as MatchType,
        surface: (row.surface as CourtSurface) ?? undefined,
        setScores: (row.set_scores as PersonalMatchSetScore[]) ?? [],
        winner: (row.winner as PersonalMatchWinner | null) ?? null,  // null = 결과 미확정
        opponentNtrp: opponent?.ntrp_snapshot != null ? Number(opponent.ntrp_snapshot) : undefined,
        notes: row.notes ?? undefined,
        sourceRequestId: row.source_request_id ?? undefined,
        createdAt: row.created_at,
    }
}
