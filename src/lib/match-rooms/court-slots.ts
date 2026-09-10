import type { MatchType } from '@/types'
import { addMinutes } from '@/lib/match-games/form-mapping'
import { courtNeed } from '@/lib/match-games/lineup-core'

/**
 * 룸 대진의 코트 슬롯 (순수 — Week 44).
 *
 * 룸은 게임에 코트를 **저장하지 않는다**(0073의 결정). 그래서 라운드와 코트는 목록 순서에서 파생한다 —
 * i번째 게임은 `floor(i / 면수)` 라운드의 `i % 면수` 코트다. 저장하지 않으므로 대진을 고치거나
 * 게임을 지워도 다시 계산되어 어긋날 자리가 없다.
 *
 * 이 파생이 성립하려면 **모든 라운드가 면 수만큼 꽉 차야** 한다. 그것을 보장하는 것이
 * `effectiveCourtCount`다 — 11명으로 3면(12자리)을 동시에 돌릴 수는 없기 때문이다.
 * 생성(buildRoomLineup)과 표시가 같은 함수를 보므로 "화면은 2면인데 대진은 3면 기준"이 생기지 않는다.
 */

/** 라운드 시각을 5분 단위로 읽는다 — 120분을 5라운드로 나눈 24분보다 25분이 사람 말에 가깝다 */
const SLOT_STEP_MINUTES = 5

/**
 * 인원으로 실제 돌릴 수 있는 면 수. 11명·3면 복식은 2면이 한계다(세 번째 코트를 채울 4명이 없다).
 * 대진을 만들 수 없는 인원이어도 1을 돌려준다 — 그 판정은 buildRoomLineup의 게이트가 따로 한다.
 */
export function effectiveCourtCount(playerCount: number, matchType: MatchType, courtCount: number): number {
    const size = courtNeed(matchType).size
    const byPlayers = Math.floor((Number.isFinite(playerCount) ? playerCount : 0) / size)
    const asked = Number.isFinite(courtCount) ? Math.floor(courtCount) : 1
    return Math.max(1, Math.min(asked, byPlayers))
}

/** i번째 게임(0-based)이 몇 라운드 몇 번 코트인가. 둘 다 1부터 센다 */
export function courtSlotOf(index: number, courts: number): { round: number; court: number } {
    const per = Math.max(1, courts)
    return { round: Math.floor(index / per) + 1, court: (index % per) + 1 }
}

/** 목록을 라운드 묶음으로 자른다 — 미리보기·편집·룸 게임 목록이 공유하는 그룹핑 */
export function groupByRound<T>(items: readonly T[], courts: number): T[][] {
    const per = Math.max(1, courts)
    const rounds: T[][] = []
    for (let i = 0; i < items.length; i += per) rounds.push(items.slice(i, i + per))
    return rounds
}

/**
 * 라운드 시작 시각들 — 방 시작 시각 + 라운드 × 경기당 시간.
 * 시각을 모르거나 경기당 시간을 모르면 빈 배열(화면은 시각 없이 라운드 번호만 그린다).
 *
 * `formatHourLabel`을 쓰지 않는 이유는 그것이 분을 버리기 때문이다(`10:30` → `10시`) —
 * `formatRoomWhen`이 종료 시각에서 겪은 것과 같은 문제다.
 */
export function roundStartLabels(
    playedTime: string | null | undefined,
    roundCount: number,
    slotMinutes: number | null | undefined,
): string[] {
    const start = playedTime?.slice(0, 5)
    if (!start || !/^\d{2}:\d{2}$/.test(start)) return []
    if (!slotMinutes || slotMinutes <= 0 || roundCount <= 0) return []
    return Array.from({ length: roundCount }, (_, i) => addMinutes(start, i * slotMinutes))
}

/**
 * 저장된 방은 경기당 시간을 모른다(자동 대진표를 짤 때 고르는 값이라 방에 남지 않는다).
 * 그래서 **예정 소요 시간을 라운드 수로 나눠** 되짚는다 — 대진이 예정 시간에 들어맞게 짜였다면
 * 이 값은 방장이 고른 값과 같아지고, 시간을 넘겨 짰다면 실제 진행 속도를 말한다.
 */
export function derivedSlotMinutes(durationMinutes: number | null | undefined, roundCount: number): number | null {
    if (!durationMinutes || durationMinutes <= 0 || roundCount <= 0) return null
    const raw = durationMinutes / roundCount
    return Math.max(SLOT_STEP_MINUTES, Math.round(raw / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES)
}

/**
 * 라운드마다 쉬는 사람 — 그 라운드의 게임에 **하나도** 들어가지 않은 사람.
 * 2면 방에서 게임별 「쉼」을 그대로 보여주면 1번 코트에서 쉬고 2번 코트에서 뛰는 사람이
 * 쉬는 것처럼 읽힌다. 그래서 라운드 단위로 교집합을 낸다.
 */
export function restingByRound(resting: readonly string[][], courts: number): string[][] {
    return groupByRound(resting, courts).map((round) => {
        if (round.length === 0) return []
        return round.reduce<string[]>(
            (acc, keys) => acc.filter((key) => keys.includes(key)),
            [...round[0]],
        )
    })
}
