import type { MatchType, PersonalMatchSetScore } from '@/types'
import { formatOpponents } from '@/lib/personal-matches/labels'

/**
 * 로테이션 세션에 **등록된 게임** (0063, 순수 모듈 — DB 접근 없음. 0064에서 '내가'→'전원'으로 확대).
 *
 * 왜 두 출처를 합치는가: 미수락 회원이 낀 게임은 `personal_matches`를 만들지 않고
 * `match_requests(pending)` + 협상 행에만 산다(0057 §7b). 그래서 personal_matches만 세면
 * finalize가 성공해도 화면은 '게임 미입력'이라 말하고, 사용자가 다시 넣으면 group_seq만 올라간
 * 중복 요청이 쌓인다(로테이션 파생 요청은 pending 중복 유니크 인덱스에서 제외된다 — 0056).
 *
 * 0064부터 목록은 **내 것이 아니라 세션 전체**다(`get_rotation_session_games` RPC).
 * personal_matches RLS가 '본인만'이라 참가자 A가 넣은 게임을 B가 볼 수 없었고, 그래서 둘이 같은
 * 물리 게임을 각자 넣으면 group_seq만 다른 중복 2건이 생겼다. 누가 넣었는지(enteredByName)까지
 * 보여야 "이건 이미 저 사람이 넣었다"를 알 수 있다.
 *
 * 두 출처를 한 타입으로 접으면 카드·빌더가 "무엇이 이미 들어갔는가"를 조건문 없이 말할 수 있다.
 */

export type EnteredRotationGame = {
    /** 세션 안 입력 순번 — 화면 라벨 '게임 N'의 근거(index가 아니라 서버 채번값) */
    groupSeq: number
    matchType: MatchType
    partnerName: string
    opponentName: string
    opponent2Name?: string
    sets: PersonalMatchSetScore[]
    /**
     * 아직 회원 좌석의 참여 수락을 기다리는 게임 — 요청은 pending이고 기록은 생기지 않았다.
     * false면 이미 관점 행까지 만들어진 게임이다(수락 완료 또는 상대팀 전원 비회원).
     * 0064 이후 새로 만들어지는 게임은 언제나 false다(전원 수락 후에만 입력할 수 있다).
     */
    awaitingConsent: boolean
    /** 이 게임을 넣은 사람 (0064) — 팀 라인은 그 사람 관점이므로 이름이 없으면 읽을 수 없다 */
    enteredByName: string
    /** 내가 넣은 게임인가 — 팀 라인의 '나' 표기를 가른다 */
    enteredByMe: boolean
}

export type EnteredRotationSource = {
    sessionId: string
    game: EnteredRotationGame
}

/**
 * 세션별로 묶어 순번 오름차순으로 정렬한다.
 * 같은 groupSeq가 양쪽 출처에 다 있을 수는 없다 — finalize가 게임마다 한쪽만 만든다.
 */
export function buildEnteredGames(rows: EnteredRotationSource[]): Map<string, EnteredRotationGame[]> {
    const bySession = new Map<string, EnteredRotationGame[]>()
    for (const { sessionId, game } of rows) {
        const bucket = bySession.get(sessionId)
        if (bucket) bucket.push(game)
        else bySession.set(sessionId, [game])
    }
    for (const list of bySession.values()) list.sort((a, b) => a.groupSeq - b.groupSeq)
    return bySession
}

export type EnteredSummary = {
    total: number
    /** 회원 수락을 기다리는 게임 수 — 0이면 안내 줄을 그리지 않는다 */
    awaiting: number
}

export function summarizeEntered(games: EnteredRotationGame[]): EnteredSummary {
    return {
        total: games.length,
        awaiting: games.filter((g) => g.awaitingConsent).length,
    }
}

/**
 * 카드 배지 문구 — 한 건도 없으면 '게임 미입력'.
 * 0064부터 목록이 세션 전체라 '입력함'(내가)이 아니라 '등록됨'(누구든)이다.
 */
export function enteredBadgeLabel(games: EnteredRotationGame[]): string {
    return games.length === 0 ? '게임 미입력' : `게임 ${games.length}건 등록됨`
}

/**
 * 수락 대기 안내 — 입력은 됐지만 아직 아무의 기록도 아닌 상태를 화면이 직접 말한다.
 * 대기 게임이 없으면 undefined(줄을 그리지 않는다).
 */
export function awaitingConsentNote(games: EnteredRotationGame[], pendingMemberCount: number): string | undefined {
    const { awaiting } = summarizeEntered(games)
    if (awaiting === 0) return undefined
    const who = pendingMemberCount > 0 ? `회원 ${pendingMemberCount}명이 수락하면` : '회원이 수락하면'
    return `입력한 게임 ${awaiting}건은 ${who} 모두의 기록에 추가됩니다.`
}

/**
 * 빌더·카드의 게임 한 줄 라벨 — '나 · 파트너 vs 상대1 · 상대2'와 같은 규칙(labels.ts 재사용).
 *
 * 팀 라인은 **입력자 관점**이다. 0064로 남이 넣은 게임까지 보이게 되면서 첫 자리를 '나'로 고정하면
 * 거짓이 된다 — 그 자리에 입력자 이름을 넣어야 읽는 사람이 팀 구성을 바르게 이해한다.
 */
export function enteredGameLine(g: EnteredRotationGame): string {
    const anchor = g.enteredByMe ? '나' : (g.enteredByName.trim() || '참가자')
    return `${anchor} · ${g.partnerName.trim() || '파트너 미정'} vs ${formatOpponents(g)}`
}

/** 다음 게임 번호 — 빌더의 '새 게임은 N번부터'이자 저장 시 서버에 보내는 선점 값(0064) */
export function nextGroupSeq(games: EnteredRotationGame[]): number {
    return games.reduce((max, g) => Math.max(max, g.groupSeq), 0) + 1
}

/** '게임 N' — match-groups.ts gameLabelOf와 같은 표기를 세션 순번으로 (0061의 전수 통일 규칙) */
export function enteredGameLabel(g: EnteredRotationGame): string {
    return `게임 ${g.groupSeq}`
}
