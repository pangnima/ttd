import Link from 'next/link'
import { CheckCircle2, Lock } from 'lucide-react'
import { Notice } from '@/components/common/notice'
import { TEXT_LINK } from '@/lib/dashboard/tokens'
import { NAV_LABEL } from '@/lib/nav-items'

type Props = {
    /** 호스트가 닫은 방(0083) — 문구가 '종료'에서 '마감'으로, 잠금 사실을 함께 말한다 */
    closed?: boolean
    /** 호스트에게만 [다시 열기]가 있다는 것을 말한다 — 참가자는 호스트에게 요청해야 한다 */
    isHost?: boolean
}

const recordsLink = <Link href="/me/personal-matches" className={TEXT_LINK}>{NAV_LABEL.myRecords}</Link>

/**
 * 정산 완료 안내 — 모든 게임의 결과가 확정되면 매칭은 끝나고 전적은 내 경기 결과로 넘어간다.
 * 데이터가 옮겨 가는 것은 아니다(personal_matches는 처음부터 그 자리에 있다) — 다만 그 전환이
 * 화면에서 아무 신호 없이 일어나던 것을 여기서 말해 준다.
 * 마감(0083)은 한 단계 더 — 결과 정정까지 잠겼고, 풀 수 있는 사람은 호스트뿐이라는 것을 말한다.
 */
export function RoomSettledNotice({ closed = false, isHost = false }: Props) {
    if (closed) {
        return (
            <Notice tone="muted" icon={<Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />} title="매칭이 마감되었습니다.">
                결과 정정을 포함한 모든 수정이 잠겼습니다.{' '}
                {isHost ? '고칠 것이 있으면 [다시 열기]로 잠금을 풉니다.' : '고칠 것이 있으면 호스트에게 다시 열기를 요청하세요.'}{' '}
                확정된 전적은 {recordsLink}에서 볼 수 있습니다.
            </Notice>
        )
    }
    return (
        <Notice tone="win" icon={<CheckCircle2 className="w-4 h-4 text-win shrink-0 mt-0.5" />} title="매칭이 종료되었습니다.">
            확정된 전적은 {recordsLink}에서 볼 수 있습니다.
            {isHost && ' 더 고칠 것이 없으면 [매칭 닫기]로 마감할 수 있습니다.'}
        </Notice>
    )
}
