import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { CARD_BASE } from '@/lib/dashboard/tokens'

/**
 * 정산 완료 안내 — 모든 게임의 결과가 확정되면 매칭은 끝나고 전적은 개인 경기 결과로 넘어간다.
 * 데이터가 옮겨 가는 것은 아니다(personal_matches는 처음부터 그 자리에 있다) — 다만 그 전환이
 * 화면에서 아무 신호 없이 일어나던 것을 여기서 말해 준다.
 */
export function RoomSettledNotice() {
    return (
        <div className={`${CARD_BASE} flex items-start gap-2.5 px-4 py-3 border-win/40 bg-win/10`}>
            <CheckCircle2 className="w-4 h-4 text-win shrink-0 mt-0.5" />
            <p className="text-body2 text-foreground break-keep">
                <span className="font-medium">매칭이 종료되었습니다.</span>{' '}
                <span className="text-muted-foreground">
                    확정된 전적은{' '}
                    <Link href="/me/personal-matches" className="text-primary hover:underline">개인 경기 결과</Link>
                    에서 볼 수 있습니다.
                </span>
            </p>
        </div>
    )
}
