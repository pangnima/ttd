/**
 * 시드 스크립트 공통 유틸.
 *  - service role 키로 RLS를 우회하는 admin 클라이언트 생성
 *  - 레이팅 재계산(앱 엔진 lib/rating/elo 재사용)
 *  - 시드 식별 태그 / 랜덤 헬퍼
 *
 * 일회용 데이터 시딩 전용. 앱 런타임에서는 import 하지 않는다.
 */
import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { replayClubRatings } from '../src/lib/rating/elo'
import type { Match, MatchType } from '../src/types'

// .env.local 우선 로드 (없으면 .env)
config({ path: '.env.local' })
config()

/** 시드 데이터 식별 접두어 — 롤백 시 이 태그로 선별 삭제한다. */
export const SEED_TAG = '[시드]'

export function createAdminClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url) {
        console.error('✗ NEXT_PUBLIC_SUPABASE_URL 가 .env.local 에 없습니다.')
        process.exit(1)
    }
    if (!serviceKey) {
        console.error(
            '✗ SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 없습니다.\n' +
                '  Supabase 대시보드 → Settings → API → service_role key 를 복사해\n' +
                '  .env.local 에 SUPABASE_SERVICE_ROLE_KEY=... 형태로 추가하세요.',
        )
        process.exit(1)
    }
    return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// ── 랜덤 헬퍼 ───────────────────────────────────────────
export const randInt = (n: number): number => Math.floor(Math.random() * n)
export const pick = <T>(arr: readonly T[]): T => arr[randInt(arr.length)]
export const chance = (p: number): boolean => Math.random() < p

export function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = randInt(i + 1)
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

/** 가중치 기반 선택. entries=[[값, 가중치], ...] */
export function weightedPick<T>(entries: ReadonlyArray<readonly [T, number]>): T {
    const total = entries.reduce((s, [, w]) => s + w, 0)
    let r = Math.random() * total
    for (const [val, w] of entries) {
        r -= w
        if (r < 0) return val
    }
    return entries[entries.length - 1][0]
}

/** 최근 maxDaysAgo 일 이내 랜덤 날짜 "YYYY-MM-DD". */
export function randomRecentDate(maxDaysAgo = 365): string {
    const d = new Date()
    d.setDate(d.getDate() - randInt(maxDaysAgo))
    return d.toISOString().slice(0, 10)
}

// ── 레이팅 재계산 (앱 엔진 재사용) ──────────────────────
// fetchConfirmedMatchesForRating(server-only)과 동일 로직을 admin 클라이언트로 인라인 복제.
// 정렬키: date → round.order → slot.start_at → match.order → id (docs/rating-system.md §2.7)

type RatingMatchRow = {
    id: string
    match_game_id: string
    round_id: string
    court_id: string
    time_slot_id: string
    match_type: string
    player1_id: string | null
    player2_id: string | null
    team1: string[] | null
    team2: string[] | null
    team1_ad_player_id: string | null
    team2_ad_player_id: string | null
    status: string
    result_sets: Array<{ team1: number; team2: number }> | null
    winner_id: string | null
    order: number
    match_games: { date: string } | null
    round: { order: number } | null
    slot: { start_at: string } | null
}

function rowToMatch(r: RatingMatchRow): Match {
    const result =
        r.result_sets && r.winner_id
            ? { sets: r.result_sets, winnerId: r.winner_id as 'team1' | 'team2' | 'draw' }
            : undefined
    return {
        id: r.id,
        matchGameId: r.match_game_id,
        roundId: r.round_id,
        courtId: r.court_id,
        timeSlotId: r.time_slot_id,
        matchType: r.match_type as MatchType,
        player1Id: r.player1_id ?? undefined,
        player2Id: r.player2_id ?? undefined,
        team1: r.team1 ?? undefined,
        team2: r.team2 ?? undefined,
        team1AdPlayerId: r.team1_ad_player_id ?? undefined,
        team2AdPlayerId: r.team2_ad_player_id ?? undefined,
        status: r.status as Match['status'],
        result,
    }
}

/**
 * 한 클럽의 확정 경기를 전부 재생해 레이팅/이력을 재계산하고 전량 교체 영속화한다.
 *
 * 주의: 앱은 apply_club_rating_snapshot RPC를 쓰지만 그 RPC는 owner(auth.uid()) 권한을
 * 강제한다. 시드는 service role(=auth.uid() null)로 도므로 RPC가 거부된다.
 * admin 클라이언트는 RLS를 우회하므로 RPC가 하는 일(delete 후 insert)을 직접 수행한다.
 */
export async function recalcClubRatings(sb: SupabaseClient, clubId: string): Promise<void> {
    const { data, error } = await sb
        .from('match_game_matches')
        .select(
            '*, match_games!inner(date, club_id, is_fixed), round:match_game_rounds(order), slot:match_game_time_slots(start_at)',
        )
        .eq('match_games.club_id', clubId)
        .eq('match_games.is_fixed', true)
        .eq('status', 'finished')
    if (error) throw error

    const rows = (data ?? []) as unknown as RatingMatchRow[]
    const sortKey = (r: RatingMatchRow): [string, number, string, number, string] => [
        r.match_games?.date ?? '',
        r.round?.order ?? 0,
        r.slot?.start_at ?? '',
        r.order,
        r.id,
    ]
    const sorted = [...rows].sort((a, b) => {
        const ka = sortKey(a)
        const kb = sortKey(b)
        for (let i = 0; i < ka.length; i++) {
            if (ka[i] < kb[i]) return -1
            if (ka[i] > kb[i]) return 1
        }
        return 0
    })

    const dateByMatchId: Record<string, string> = {}
    for (const r of sorted) dateByMatchId[r.id] = r.match_games?.date ?? ''

    const snapshot = replayClubRatings(sorted.map(rowToMatch))

    const ratings = Array.from(snapshot.ratings.entries()).map(([userId, state]) => ({
        club_id: clubId,
        user_id: userId,
        rating: state.rating,
        matches_played: state.matchesPlayed,
    }))
    const history = snapshot.history.map((h) => {
        const createdAt = dateByMatchId[h.matchId]
        return {
            club_id: clubId,
            user_id: h.userId,
            match_id: h.matchId,
            rating_before: h.ratingBefore,
            rating_after: h.ratingAfter,
            delta: h.delta,
            // 빈 문자열은 timestamptz 캐스팅 오류 → 값 있을 때만 지정(없으면 DB default now()).
            ...(createdAt ? { created_at: createdAt } : {}),
        }
    })

    // 전량 교체: 이력 먼저(외래키 없음) 지우고 현재값 삭제 후 재삽입.
    const delHist = await sb.from('club_rating_history').delete().eq('club_id', clubId)
    if (delHist.error) throw delHist.error
    const delRatings = await sb.from('club_player_ratings').delete().eq('club_id', clubId)
    if (delRatings.error) throw delRatings.error

    if (ratings.length > 0) {
        const insR = await sb.from('club_player_ratings').insert(ratings)
        if (insR.error) throw insR.error
    }
    if (history.length > 0) {
        const insH = await sb.from('club_rating_history').insert(history)
        if (insH.error) throw insH.error
    }
}
