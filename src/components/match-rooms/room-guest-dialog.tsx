'use client'

import { UserPlus } from 'lucide-react'
import { TriggerDialog } from '@/components/common/trigger-dialog'
import { RoomGuestForm } from '@/components/match-rooms/room-guest-form'

type Props = {
    roomId: string
}

/**
 * [비회원 등록] — 계정 없이 코트에 온 사람을 명단에 올린다(0069).
 * 이름이 곧 정체성이라 수락 단계가 없다: 저장하는 순간 참가자가 되고 자동 대진표의 배치 대상이 된다.
 */
export function RoomGuestDialog({ roomId }: Props) {
    return (
        <TriggerDialog trigger={<><UserPlus className="size-3.5" />비회원 등록</>} title="비회원 등록">
            {(close) => <RoomGuestForm roomId={roomId} onDone={close} />}
        </TriggerDialog>
    )
}
