import { PILL_BASE } from '@/lib/dashboard/tokens'
import { ROOM_STAGE_LABEL, type RoomStage } from '@/lib/match-rooms/room-stage'

type Props = { stage: RoomStage }

// 대기·주의는 spot, 진행은 info, 끝난 것은 muted (docs/color-system.md). 마감은 종료보다 한 단계 더 닫힌 상태라 채운다
const STAGE_CLASS: Record<RoomStage, string> = {
    recruiting: 'border-spot/50 text-spot',
    playing: 'border-info/50 text-info',
    reviewing: 'border-spot/50 text-spot',
    settled: 'border-border text-muted-foreground',
    closed: 'border-border bg-muted text-muted-foreground',
}

/** 룸 헤더의 진행 단계 칩 — 모집 중 → 진행 중 → 결과 확인 중 → 종료 → (호스트가 닫으면) 마감 */
export function RoomStageBadge({ stage }: Props) {
    return <span className={`${PILL_BASE} ${STAGE_CLASS[stage]}`}>{ROOM_STAGE_LABEL[stage]}</span>
}
