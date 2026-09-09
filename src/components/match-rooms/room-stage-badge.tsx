import { PILL_BASE } from '@/lib/dashboard/tokens'
import { ROOM_STAGE_LABEL, type RoomStage } from '@/lib/match-rooms/room-stage'

type Props = { stage: RoomStage }

// 대기·주의는 spot, 진행은 info, 끝난 것은 muted (docs/color-system.md)
const STAGE_CLASS: Record<RoomStage, string> = {
    recruiting: 'border-spot/50 text-spot',
    playing: 'border-info/50 text-info',
    reviewing: 'border-spot/50 text-spot',
    closed: 'border-border text-muted-foreground',
}

/** 룸 헤더의 진행 단계 칩 — 모집 중 → 진행 중 → 결과 확인 중 → 종료 */
export function RoomStageBadge({ stage }: Props) {
    return <span className={`${PILL_BASE} ${STAGE_CLASS[stage]}`}>{ROOM_STAGE_LABEL[stage]}</span>
}
