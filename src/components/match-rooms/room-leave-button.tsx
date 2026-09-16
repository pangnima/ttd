'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { leaveMatchRoomAction } from '@/lib/actions/match-rooms'
import { TYPO } from '@/lib/dashboard/tokens'

type Props = {
    roomId: string
    /** 이 방의 경기에 배정돼 있다 — 나갈 수 없다(0077, 강퇴 가드 member_has_games의 거울) */
    hasGames?: boolean
    /** 종료·마감된 방(U-8) — 결과가 이미 마무리됐는데 「결과를 마무리하라」고 말하지 않는다 */
    finished?: boolean
}

/**
 * 방 나가기(0054) — 참가자·초대 대기 회원 전용(호스트는 '매칭 리스트에서 내리기'를 쓴다).
 * 명단에서만 빠지고 내가 올린 기록은 그대로 남는다. 다시 비밀번호로 입장하면 복귀한다.
 *
 * 경기에 배정된 사람은 버튼 대신 이유를 본다(0077) — 버튼만 없으면 왜 없는지 모른다. 나가면 상세가 게이트에
 * 막혀 결과를 확인할 수 없고 좌석 만장일치가 영영 비기 때문에, 서버도 leave_member_has_games로 거절한다.
 */
export function RoomLeaveButton({ roomId, hasGames = false, finished = false }: Props) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    // 끝난 매칭의 배정자에게는 할 말이 없다 — 나갈 수도, 마무리할 것도 없다
    if (hasGames && finished) return null
    if (hasGames) {
        return (
            <p className={`${TYPO.caption} text-right break-keep`}>
                배정된 경기가 있어 나갈 수 없습니다. 결과를 마무리하거나 호스트에게 대진 수정을 요청해주세요.
            </p>
        )
    }

    function leave() {
        if (!confirm('이 매칭에서 나갈까요? 내가 올린 기록은 그대로 남고, 참가자 명단에서만 빠집니다.')) return
        setError(null)
        startTransition(async () => {
            const res = await leaveMatchRoomAction(roomId)
            if (res.error) setError(res.error)
            else router.push('/match-rooms')
        })
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={leave}
                disabled={isPending}
                className="text-caption text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
            >
                매칭 나가기
            </button>
            {error && <p className="text-caption text-destructive">{error}</p>}
        </div>
    )
}
