'use client'

import { MATCH_FORM_LABEL, TYPO } from '@/lib/dashboard/tokens'
import { EnumSelect } from '@/components/match/enum-select'
import {
    COURT_COUNT_OPTIONS,
    DURATION_OPTIONS,
    formatDurationLabel,
    formatRoomWhen,
} from '@/lib/match-rooms/schedule'

type Props = {
    /** 시작 시각 'HH:MM' — 종료 시각을 계산해 보여주기 위해 받는다 */
    playedTime: string
    durationMinutes: number
    onDurationChange: (minutes: number) => void
    courtCount: number
    onCourtCountChange: (count: number) => void
}

// base-ui Select는 items 참조로 라벨을 찾으므로 모듈 상수로 고정한다
const DURATION_ITEMS = DURATION_OPTIONS.map((m) => ({ value: String(m), label: formatDurationLabel(m) }))
const COURT_ITEMS = COURT_COUNT_OPTIONS.map((c) => ({ value: String(c), label: `${c}면` }))

/**
 * 방의 시간·코트 규모 — 얼마나 칠 것인가와 몇 면을 쓰는가.
 *
 * 종료를 시각으로 받지 않고 **소요 시간**으로 받는 이유는 둘이다. 사용자가 "보통 2시간, 가끔 1시간·3시간"으로
 * 생각하고, 시각으로 저장하면 자정을 넘길 때 종료 < 시작이 되어 계산이 꼬인다. 화면에는 종료 시각을 환산해 보인다.
 *
 * 코트 면 수는 자동 대진표가 **권장 경기 수**를 낼 때 쓴다 — 같은 두 시간이라도 1면이면 4경기, 3면이면 12경기다.
 * 경기에 코트를 배정하지는 않는다(룸의 대진은 여전히 순서 있는 목록이다).
 *
 * 개인 경기 폼과 공유하는 MatchMetaSection에 넣지 않은 이유는 그 폼에 소요 시간·코트 면 수가 필요 없기 때문이다.
 */
export function RoomScheduleSection({
    playedTime, durationMinutes, onDurationChange, courtCount, onCourtCountChange,
}: Props) {
    const when = formatRoomWhen(playedTime, durationMinutes)

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <label className={MATCH_FORM_LABEL}>경기 시간 *</label>
                <EnumSelect
                    value={String(durationMinutes)}
                    onValueChange={(v) => onDurationChange(Number(v))}
                    options={DURATION_ITEMS}
                    ariaLabel="경기 시간"
                />
                <p className={`mt-2 ${TYPO.caption} break-keep`}>
                    {when ? `${when}에 끝납니다.` : '시각을 고르면 종료 시각이 계산됩니다.'}
                </p>
            </div>
            <div>
                <label className={MATCH_FORM_LABEL}>코트 면 수 *</label>
                <EnumSelect
                    value={String(courtCount)}
                    onValueChange={(v) => onCourtCountChange(Number(v))}
                    options={COURT_ITEMS}
                    ariaLabel="코트 면 수"
                />
                <p className={`mt-2 ${TYPO.caption} break-keep`}>
                    동시에 도는 경기 수입니다. 자동 대진표가 몇 경기를 권할지 여기서 갈립니다.
                </p>
            </div>
        </div>
    )
}
