import { Clock } from 'lucide-react'
import { Notice } from '@/components/common/notice'

/**
 * 종료된 매칭의 초대(Week 71) — 초대는 매칭 종료 시각까지만 유효하다(`respond_room_invite`의 `invite_expired`).
 * 배너의 [참가 수락]을 그리면 「눌러도 안 되는 버튼」이 되므로 이유를 말한다(0072 — 노출과 가드를 함께).
 */
export function RoomInviteExpiredNotice() {
    return (
        <Notice tone="muted" variant="inline" icon={<Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}>
            종료된 매칭이라 초대를 수락할 수 없습니다. 초대는 매칭이 끝나는 시각까지만 유효합니다.
        </Notice>
    )
}
