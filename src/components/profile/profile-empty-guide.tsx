import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

/**
 * 본인 프로필이 0경기일 때 헤더 카드 정보 영역('X 경기' 자리)에 인라인으로 노출되는
 * 빈 상태 안내. 별도 카드 래퍼 없이 안내 문구 + CTA 버튼만 둔다.
 *
 * CTA는 매칭 리스트다(Week 57) — 회원이 끼는 경기는 전부 매칭을 거치고, 방 없는 직접 기록은
 * 비회원 전용이라 신규 회원의 첫 행동이 아니다. 체크리스트를 닫은 뒤에도 남는 상시 출구다.
 */
export function ProfileEmptyGuide() {
    return (
        <div className="space-y-3">
            <div className="space-y-0.5">
                <p className="text-body font-semibold text-foreground">아직 확정된 경기가 없어요</p>
                <p className="text-body2 text-muted-foreground break-keep">매칭에 참여해 결과가 확정되면 승률·전적·NTRP 추이가 채워져요.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <Link
                    href="/match-rooms"
                    className="inline-flex items-center gap-1.5 text-body2 font-medium rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    <CalendarDays className="size-3.5" />
                    매칭 참여하기
                </Link>
                <Link href="/guide" className="text-body2 font-medium text-primary hover:underline">
                    사용 가이드
                </Link>
            </div>
        </div>
    )
}
