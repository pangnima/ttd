import type { MatchRoomDetail } from '@/types'
import { TYPO } from '@/lib/dashboard/tokens'
import {
    DEFAULT_SLOT_MINUTES,
    describeRecommendation,
    formatRoomWhen,
    recommendGames,
} from '@/lib/match-rooms/schedule'

type Props = {
    detail: MatchRoomDetail
    /** 자동 대진표의 배치 대상 수(호스트·회원·비회원) — 다이얼로그의 초기 권장값과 같은 인원을 봐야 두 숫자가 일치한다 */
    playerCount: number
}

/**
 * 게임 섹션 아래 한 줄 — 방의 시간·면 수가 권하는 1인당 경기 수 (Week 47).
 *
 * 다이얼로그를 열어야만 권장값을 만나던 것을 룸 상세에서 미리 말한다. 노출 조건은 호출자가
 * [자동 대진표] 버튼과 **같은 식**으로 판정한다(호스트 · 미정산) — 여기서는 소요 시간을 모르는 방(0073 이전)과
 * 대진을 만들 수 없는 인원만 거른다.
 *
 * 경기당 시간은 **방이 기억한 값**을 쓰고(0078), 아직 대진표를 저장한 적이 없으면 기본값으로 말한다 —
 * 다이얼로그도 같은 값으로 시작하므로 힌트가 말한 숫자와 팝업이 여는 숫자가 어긋나지 않는다.
 */
export function RoomLineupHint({ detail, playerCount }: Props) {
    const { room } = detail
    const slotMinutes = room.slotMinutes ?? DEFAULT_SLOT_MINUTES
    const recommendation = recommendGames({
        durationMinutes: room.durationMinutes,
        slotMinutes,
        courtCount: room.courtCount,
        playerCount,
        matchType: room.matchType,
    })
    if (!recommendation) return null

    const basis = [
        formatRoomWhen(room.playedTime, room.durationMinutes),
        `코트 ${room.courtCount}면`,
        `${slotMinutes}분 경기 기준`,
    ].filter(Boolean).join(' · ')

    return (
        <p className={`${TYPO.caption} break-keep`}>
            {basis} → {describeRecommendation({ recommendation, courtCount: room.courtCount, playerCount })}
            {' — '}[자동 대진표]를 열면 이 값으로 시작합니다.
        </p>
    )
}
