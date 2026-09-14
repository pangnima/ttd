'use client'

import type { MatchType } from '@/types'
import { MATCH_FORM_LABEL, MATCH_FORM_SELECT_TRIGGER, TYPO } from '@/lib/dashboard/tokens'
import { EnumSelect } from '@/components/match/enum-select'
import {
    COURT_COUNT_OPTIONS,
    DEFAULT_SLOT_MINUTES,
    DURATION_OPTIONS,
    describeRecommendation,
    formatDurationLabel,
    formatRoomWhen,
    recommendGames,
} from '@/lib/match-rooms/schedule'

// base-ui Select는 items 참조로 라벨을 찾으므로 모듈 상수로 고정한다
const DURATION_ITEMS = DURATION_OPTIONS.map((m) => ({ value: String(m), label: formatDurationLabel(m) }))
const COURT_ITEMS = COURT_COUNT_OPTIONS.map((c) => ({ value: String(c), label: `${c}면` }))

type FieldsProps = {
    durationMinutes: number
    onDurationChange: (minutes: number) => void
    courtCount: number
    onCourtCountChange: (count: number) => void
    /** 시작 시각 'HH:MM' — 요약 줄이 종료 시각을 환산해 말한다 */
    playedTime: string
    matchType: MatchType
    /** 호스트 + 초대 대상 — 비밀번호로 더 들어올 수 있으므로 어디까지나 예상이다 */
    playerCount: number
}

/**
 * 방의 시간·코트 규모 — 얼마나 칠 것인가와 몇 면을 쓰는가.
 *
 * 종료를 시각으로 받지 않고 **소요 시간**으로 받는 이유는 둘이다. 사용자가 "보통 2시간, 가끔 1시간·3시간"으로
 * 생각하고, 시각으로 저장하면 자정을 넘길 때 종료 < 시작이 되어 계산이 꼬인다. 화면에는 종료 시각을 환산해 보인다.
 *
 * 코트 면 수는 자동 대진표가 **권장 경기 수**를 낼 때 쓴다 — 같은 두 시간이라도 1면이면 4경기, 3면이면 12경기다.
 * 경기에 코트를 배정하지는 않는다(룸의 대진은 순서 있는 목록이고, 라운드·코트는 그 순서에서 파생한다).
 *
 * 두 필드는 날짜·시각과 **한 줄**에 놓인다 — MatchMetaSection의 `scheduleExtra`로 들어가므로 여기서는
 * 그리드 칸을 낸다. 필드마다 붙던 도움말은 요약 줄 하나로 합쳤고(4열에서 높이가 어긋난다),
 * 그 요약은 **그리드 안에서 한 줄을 통째로 차지한다** — 밖에 두면 코트 표면·코트명 아래로 밀려
 * 정작 설명하는 네 필드와 떨어진다.
 */
export function RoomScheduleFields({
    durationMinutes, onDurationChange, courtCount, onCourtCountChange, playedTime, matchType, playerCount,
}: FieldsProps) {
    return (
        <>
            <div>
                <label className={MATCH_FORM_LABEL}>경기 시간 *</label>
                <EnumSelect
                    value={String(durationMinutes)}
                    onValueChange={(v) => onDurationChange(Number(v))}
                    options={DURATION_ITEMS}
                    ariaLabel="경기 시간"
                    triggerClassName={MATCH_FORM_SELECT_TRIGGER}
                />
            </div>
            <div>
                <label className={MATCH_FORM_LABEL}>코트 면 수 *</label>
                <EnumSelect
                    value={String(courtCount)}
                    onValueChange={(v) => onCourtCountChange(Number(v))}
                    options={COURT_ITEMS}
                    ariaLabel="코트 면 수"
                    triggerClassName={MATCH_FORM_SELECT_TRIGGER}
                />
            </div>
            <div className="col-span-2 sm:col-span-4">
                <RoomScheduleSummary
                    playedTime={playedTime}
                    durationMinutes={durationMinutes}
                    courtCount={courtCount}
                    matchType={matchType}
                    playerCount={playerCount}
                />
            </div>
        </>
    )
}

type SummaryProps = {
    playedTime: string
    durationMinutes: number
    courtCount: number
    matchType: MatchType
    /** 호스트 + 초대 대상 — 비밀번호로 더 들어올 수 있으므로 어디까지나 예상이다 */
    playerCount: number
}

/**
 * 네 필드가 함께 말하는 한 문장 — 언제 끝나는지와, 그 시간·면 수면 몇 경기가 적당한지.
 *
 * 권장값을 방을 만들 때 미리 보여주는 이유는 자동 대진표에서 처음 만나면 늦기 때문이다.
 * 인원이 모자라 추천이 서지 않으면(`recommendGames`가 null) 앞의 두 조각만 말한다 —
 * 호스트 혼자인 방에서 헛숫자가 나오지 않게 하는 기존 게이트를 그대로 탄다.
 */
function RoomScheduleSummary({
    playedTime, durationMinutes, courtCount, matchType, playerCount,
}: SummaryProps) {
    const when = formatRoomWhen(playedTime, durationMinutes)
    const recommendation = recommendGames({
        durationMinutes, slotMinutes: DEFAULT_SLOT_MINUTES, courtCount, playerCount, matchType,
    })
    const parts = [
        when ? `${when} (${formatDurationLabel(durationMinutes)})` : '시각을 고르면 종료 시각이 계산됩니다',
        `코트 ${courtCount}면`,
        // 문장은 룸 상세 힌트와 공유한다(Week 47) — 실효 면 수가 깎이면 "M면 기준"을 밝히는 규칙도 거기에 있다
        recommendation ? describeRecommendation({ recommendation, courtCount, playerCount }) : null,
    ].filter(Boolean)

    return <p className={`${TYPO.caption} break-keep`}>{parts.join(' · ')}</p>
}
