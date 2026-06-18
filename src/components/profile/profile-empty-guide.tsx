import Link from 'next/link'
import { Plus, BookOpen } from 'lucide-react'

/**
 * 본인 프로필이 0경기일 때 헤더 카드 정보 영역('X 경기' 자리)에 인라인으로 노출되는
 * 빈 상태 안내. 별도 카드 래퍼 없이 안내 문구 + CTA 버튼만 둔다.
 */
export function ProfileEmptyGuide() {
    return (
        <div className="space-y-3">
            <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">아직 등록된 경기가 없어요</p>
                <p className="text-xs text-muted-foreground">첫 경기를 기록하면 승률·전적·NTRP 추이가 자동으로 채워져요.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Link
                    href="/me/personal-matches/new"
                    className="inline-flex items-center gap-1.5 text-sm font-medium rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    <Plus className="size-3.5" />
                    첫 경기 기록하기
                </Link>
                <Link
                    href="/guide"
                    className="inline-flex items-center gap-1.5 text-sm rounded-md px-3 py-1.5 border border-border text-foreground hover:bg-muted hover:border-input transition-colors"
                >
                    <BookOpen className="size-3.5" />
                    기록 방법 보기
                </Link>
            </div>
        </div>
    )
}
