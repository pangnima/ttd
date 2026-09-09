import Link from 'next/link'
import { Users } from 'lucide-react'

/**
 * 직접 기록에 회원을 넣었을 때의 안내 (Week 39).
 *
 * 막기만 하고 대안을 주지 않으면 사용자는 "왜 저장이 안 되지"에서 멈춘다 —
 * 그래서 여기서 바로 매칭 만들기로 보낸다. 상대에게도 남는 기록이라 동의와 결과 확인이 필요하고,
 * 그 절차는 전부 매칭 룸 안에 있다.
 */
export function MemberNeedsRoomNotice() {
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-spot/40 bg-spot/10 px-3 py-2.5">
            <Users className="w-4 h-4 text-spot shrink-0 mt-0.5" />
            <p className="text-caption text-muted-foreground break-keep">
                <span className="text-foreground font-medium">회원과 함께 친 경기는 매칭으로 기록합니다.</span>{' '}
                상대에게도 남는 기록이라 참여 동의와 결과 확인이 필요합니다 —{' '}
                <Link href="/match-rooms/new" className="text-primary hover:underline">매칭 만들기</Link>
                로 방을 열고 상대를 초대해주세요. 이 화면은 비회원과 친 경기를 내 기록에만 남길 때 씁니다.
            </p>
        </div>
    )
}
