import Link from 'next/link'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'

/**
 * 존재하지 않거나 호스트가 매칭 리스트에서 내린 방의 URL로 왔을 때(E2E F-14).
 * 전역 404는 CTA가 「클럽 목록」이라 매칭 룸 경로에서는 길을 잘못 가리킨다 — 여기서는 매칭 리스트로 보낸다.
 * 내려간 방의 확정 결과는 room_id만 끊긴 채(0048 set null) 개인 경기 결과에 그대로 남는다.
 */
export function RoomGoneNotice() {
    return (
        <PageContainer>
            <PageHeader title="내려간 매칭입니다" />
            <div className={`${CARD_BASE} px-4 py-3 space-y-3`}>
                <p className={`${TYPO.body2} break-keep`}>
                    호스트가 매칭 리스트에서 내렸거나 존재하지 않는 매칭입니다.
                    이미 확정된 결과는 개인 경기 결과에 그대로 남아 있습니다.
                </p>
                <Link
                    href="/match-rooms"
                    className="inline-block rounded-md bg-primary px-4 py-2 text-body2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    매칭 리스트로 돌아가기
                </Link>
            </div>
        </PageContainer>
    )
}
