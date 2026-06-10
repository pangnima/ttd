import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { CourtSurface, MatchType, PersonalMatch, PersonalMatchSetScore, PersonalMatchWinner } from '@/types'

type PersonalMatchRow = Database['public']['Tables']['personal_matches']['Row']

function mapPersonalMatchRow(row: PersonalMatchRow): PersonalMatch {
    return {
        id: row.id,
        userId: row.user_id,
        opponentName: row.opponent_name,
        opponentUserId: row.opponent_user_id ?? undefined,
        opponentDominantHand: (row.opponent_dominant_hand as 'right' | 'left' | null) ?? undefined,
        playedAt: row.played_at,
        matchType: row.match_type as MatchType,
        surface: (row.surface as CourtSurface) ?? undefined,
        setScores: (row.set_scores as PersonalMatchSetScore[]) ?? [],
        winner: row.winner as PersonalMatchWinner,
        notes: row.notes ?? undefined,
        createdAt: row.created_at,
    }
}

export async function fetchPersonalMatchesByUser(userId: string): Promise<PersonalMatch[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
    if (error || !data) return []
    return data.map(mapPersonalMatchRow)
}

export async function fetchPersonalMatchById(id: string): Promise<PersonalMatch | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('*')
        .eq('id', id)
        .single()
    if (error || !data) return null
    return mapPersonalMatchRow(data)
}
