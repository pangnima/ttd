import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { PersonalMatch } from '@/types'
import { mapPersonalMatchRow } from '@/lib/personal-matches/map'
import { buildConfirmation } from '@/lib/personal-matches/confirmation'

export { mapPersonalMatchRow }

export async function fetchPersonalMatchesByUser(userId: string): Promise<PersonalMatch[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('*, participants:personal_match_participants(*)')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .order('played_time', { ascending: false, nullsFirst: false })
        // 같은 일시의 로테이션 게임은 세션 내 순번(입력 순)으로 — 표시 그룹핑(buildMatchGroups)도 같은 키로 재정렬한다
        .order('group_seq', { ascending: true, nullsFirst: false })
    if (error || !data) return []
    return data.map((row) => mapPersonalMatchRow(row, row.participants))
}

/**
 * 상호 확인 경기의 결과 제안/확인 상태(confirmation)를 개인 경기 목록에 부착한다.
 * source_request_id를 모아 match_requests를 1회 in() 조회한다 (SELECT 정책으로 자연 필터 — 0052부터
 * 복식 파트너·상대2도 자기 경기의 협상을 읽지만 confirmation.viewerIsParty가 false로 남아 액션은 없다).
 * 개인 경기 결과 화면(확정)·확인 요청 허브(미확정)·매칭 룸 상세가 공용한다.
 */
export async function attachConfirmations(matches: PersonalMatch[], userId: string): Promise<PersonalMatch[]> {
    const requestIds = [...new Set(matches.map((m) => m.sourceRequestId).filter((id): id is string => !!id))]
    if (requestIds.length === 0) return matches

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_requests')
        .select('id, requester_id, opponent_user_id, negotiation:match_result_negotiations(result_status, proposed_by, proposed_set_scores, dispute_reason)')
        .in('id', requestIds)
    if (error || !data) return matches

    const byId = new Map(data.map((row) => [row.id, row]))
    return matches.map((m) => {
        const row = m.sourceRequestId ? byId.get(m.sourceRequestId) : undefined
        if (!row) return m
        const neg = row.negotiation
        return {
            ...m,
            confirmation: buildConfirmation({
                id: row.id,
                requester_id: row.requester_id,
                opponent_user_id: row.opponent_user_id,
                result_status: neg?.result_status ?? 'none',
                proposed_by: neg?.proposed_by ?? null,
                proposed_set_scores: neg?.proposed_set_scores ?? [],
                dispute_reason: neg?.dispute_reason ?? null,
            }, userId),
        }
    })
}

/**
 * 결과가 확정된 개인 경기만 — '개인 경기 결과' 화면 본문.
 * has_result(0051 생성 컬럼)가 hasResult(winner.ts)와 같은 규칙이라 확정/미확정 집합이 DB에서 갈린다.
 * confirmation은 붙이지 않는다 — 확정 행에 남은 상호 확인 표시는 잠금 배지(sourceRequestId)뿐이다.
 */
export async function fetchSettledPersonalMatches(userId: string): Promise<PersonalMatch[]> {
    return fetchPersonalMatchesByHasResult(userId, true)
}

/** 결과 미확정 개인 경기만 — 확인 요청 허브의 작업 큐(classifyPendingMatch 입력). confirmation 부착 필수 */
export async function fetchPendingPersonalMatches(userId: string): Promise<PersonalMatch[]> {
    const matches = await fetchPersonalMatchesByHasResult(userId, false)
    return attachConfirmations(matches, userId)
}

/** 확정/미확정 부분 인덱스(personal_matches_settled_idx·_pending_idx, 0051)를 타는 목록 조회 */
async function fetchPersonalMatchesByHasResult(userId: string, hasResult: boolean): Promise<PersonalMatch[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('*, participants:personal_match_participants(*)')
        .eq('user_id', userId)
        .eq('has_result', hasResult)
        .order('played_at', { ascending: false })
        .order('played_time', { ascending: false, nullsFirst: false })
        // 같은 일시의 로테이션 게임은 세션 내 순번(입력 순)으로 — 표시 그룹핑(buildMatchGroups)도 같은 키로 재정렬한다
        .order('group_seq', { ascending: true, nullsFirst: false })
    if (error || !data) return []
    return data.map((row) => mapPersonalMatchRow(row, row.participants))
}

export async function fetchPersonalMatchById(id: string): Promise<PersonalMatch | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('*, participants:personal_match_participants(*)')
        .eq('id', id)
        .single()
    if (error || !data) return null
    return mapPersonalMatchRow(data, data.participants)
}

// 이전에 만난 비회원 상대. hand·ntrp는 가장 최근 경기에 입력한 값 (자동 채움용)
export type PastOpponent = { name: string; hand?: 'right' | 'left'; ntrp?: number }

/**
 * 과거 개인 경기에서 직접 입력했던(클럽 회원이 아닌) 외부 인물 이름 목록.
 * 상대/파트너/상대2 세 역할 모두에서 수집하며, 이름 기준 중복 제거(최근 입력 우선)한다.
 * 개인 경기 등록 폼의 "만나본 사람" 자동완성 그룹에 사용 — 선택 시 손잡이·NTRP를 프리필한다.
 */
export async function fetchPastOpponents(userId: string): Promise<PastOpponent[]> {
    const supabase = await createClient()
    // personal_match_participants(role별 상대/파트너/상대2) → 소유 경기(personal_matches.user_id)로 필터.
    const { data, error } = await supabase
        .from('personal_match_participants')
        .select('name, user_id, dominant_hand, ntrp_snapshot, match:personal_matches!inner(user_id, played_at)')
        .eq('match.user_id', userId)
    if (error || !data) return []

    // 최근 경기 우선(내림차순) 정렬 후 이름 기준 distinct — 최근 값을 우선 유지
    const rows = [...data].sort((a, b) => (b.match?.played_at ?? '').localeCompare(a.match?.played_at ?? ''))

    const map = new Map<string, PastOpponent>()
    for (const row of rows) {
        const trimmed = row.name?.trim()
        if (!trimmed || row.user_id) continue  // 회원 선택분은 클럽 후보에 이미 존재하므로 제외
        if (map.has(trimmed)) continue
        map.set(trimmed, {
            name: trimmed,
            hand: row.dominant_hand === 'right' || row.dominant_hand === 'left' ? row.dominant_hand : undefined,
            ntrp: row.ntrp_snapshot != null ? Number(row.ntrp_snapshot) : undefined,
        })
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const RECENT_COURT_NAMES_LIMIT = 20

/**
 * 과거 개인 경기에 입력했던 코트명 목록 — 최근 경기 우선, 이름 기준 중복 제거.
 * 개인 경기 등록 폼의 코트명 '최근 코트' 자동완성 후보에 사용한다.
 */
export async function fetchRecentCourtNames(userId: string): Promise<string[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('personal_matches')
        .select('court_name, played_at')
        .eq('user_id', userId)
        .not('court_name', 'is', null)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200)
    if (error || !data) return []

    const seen = new Set<string>()
    for (const row of data) {
        const name = row.court_name?.trim()
        if (!name || seen.has(name)) continue
        seen.add(name)
        if (seen.size >= RECENT_COURT_NAMES_LIMIT) break
    }
    return [...seen]
}
