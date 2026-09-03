import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { AnalyticsScope } from '@/lib/queries/analytics'

/**
 * 본인 통계 범위 탭 스캐폴드 — 개인 / 클럽 / 통합.
 * 상태의 진실은 URL(`?scope=`)이라 서버 컴포넌트 + Link로 충분하다(클라이언트 상태 없음).
 * 현재는 '개인'만 동작하고 클럽/통합은 비활성(준비 중). 이후 활성화 시 href만 붙이면 된다.
 * 시각 스타일은 common/segmented-toggle.tsx와 동일 토큰을 쓴다.
 */
type Props = {
    scope: AnalyticsScope
    /** '개인' 탭 링크 — 페이지에서 fixture 파라미터 등을 보존해 조립 */
    personalHref: string
}

const TABS: { kind: AnalyticsScope['kind']; label: string }[] = [
    { kind: 'personal', label: '개인' },
    { kind: 'club', label: '클럽' },
    { kind: 'total', label: '통합' },
]

function captionOf(scope: AnalyticsScope): string {
    if (scope.kind === 'personal') return '클럽 외 개인 경기 통계'
    if (scope.kind === 'club') return `${scope.clubName} 경기 통계`
    return '클럽 + 개인 경기 통합 통계'
}

const TAB_BASE = 'rounded-sm px-3 py-1 text-sm font-medium transition-colors'

export function ProfileScopeTabs({ scope, personalHref }: Props) {
    return (
        <div className="space-y-2">
            <nav aria-label="통계 범위" className="inline-flex gap-0.5 rounded-md border border-border bg-secondary p-0.5">
                {TABS.map((tab) => {
                    const current = tab.kind === scope.kind
                    if (tab.kind === 'personal') {
                        return (
                            <Link
                                key={tab.kind}
                                href={personalHref}
                                aria-current={current ? 'page' : undefined}
                                className={cn(
                                    TAB_BASE,
                                    current ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {tab.label}
                            </Link>
                        )
                    }
                    // 준비 중 탭 — URL로 직접 진입한 경우(현재 위치)에도 비활성 상태로만 표시
                    return (
                        <span
                            key={tab.kind}
                            aria-disabled="true"
                            aria-current={current ? 'page' : undefined}
                            title="준비 중"
                            className={cn(
                                TAB_BASE,
                                'inline-flex items-center gap-1 cursor-not-allowed',
                                current ? 'bg-card text-foreground/60 shadow-sm' : 'text-muted-foreground/50',
                            )}
                        >
                            {tab.label}
                            <span className="text-[10px] font-normal text-muted-foreground/60">준비 중</span>
                        </span>
                    )
                })}
            </nav>
            <p className="text-xs text-muted-foreground">{captionOf(scope)}</p>
        </div>
    )
}
