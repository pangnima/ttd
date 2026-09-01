import type { Database } from '@/types/supabase'
import type { CourtSurface, MatchType, PersonalMatch, PersonalMatchSetScore, PersonalMatchWinner } from '@/types'

type PersonalMatchRow = Database['public']['Tables']['personal_matches']['Row']

/**
 * personal_matches DB row → PersonalMatch 도메인 매핑 (순수 함수, server-only 아님).
 * 쿼리(`queries/personal-matches.ts`)와 백필 스크립트가 공유한다.
 */
export function mapPersonalMatchRow(row: PersonalMatchRow): PersonalMatch {
    return {
        id: row.id,
        userId: row.user_id,
        opponentName: row.opponent_name,
        opponentUserId: row.opponent_user_id ?? undefined,
        opponentDominantHand: (row.opponent_dominant_hand as 'right' | 'left' | null) ?? undefined,
        partnerUserId: row.partner_user_id ?? undefined,
        partnerName: row.partner_name ?? undefined,
        partnerDominantHand: (row.partner_dominant_hand as 'right' | 'left' | null) ?? undefined,
        partnerNtrp: row.partner_ntrp != null ? Number(row.partner_ntrp) : undefined,
        opponent2UserId: row.opponent2_user_id ?? undefined,
        opponent2Name: row.opponent2_name ?? undefined,
        opponent2DominantHand: (row.opponent2_dominant_hand as 'right' | 'left' | null) ?? undefined,
        opponent2Ntrp: row.opponent2_ntrp != null ? Number(row.opponent2_ntrp) : undefined,
        playedAt: row.played_at,
        // Postgres time은 'HH:MM:SS'로 오므로 'HH:MM'로 자른다
        playedTime: row.played_time ? row.played_time.slice(0, 5) : undefined,
        matchType: row.match_type as MatchType,
        surface: (row.surface as CourtSurface) ?? undefined,
        setScores: (row.set_scores as PersonalMatchSetScore[]) ?? [],
        winner: row.winner as PersonalMatchWinner,
        opponentNtrp: row.opponent_ntrp != null ? Number(row.opponent_ntrp) : undefined,
        notes: row.notes ?? undefined,
        sourceRequestId: row.source_request_id ?? undefined,
        createdAt: row.created_at,
    }
}
