import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type LinkTabItem = {
    key: string
    label: string
    href: string
    /** 0이면 배지를 붙이지 않는다 — 행동이 필요한 탭에만 숫자를 보여주기 위함 */
    count?: number
    /** 주의를 끄는 배지(내 차례 등). 기본은 중립 배지 */
    emphasis?: boolean
}

type Props = {
    items: LinkTabItem[]
    activeKey: string
    ariaLabel: string
}

/**
 * URL 파라미터로 전환하는 탭 바 (서버 컴포넌트).
 * 확인 요청 허브와 매칭 리스트가 각자 갖고 있던 같은 모양의 tabClass를 흡수한다.
 */
export function LinkTabs({ items, activeKey, ariaLabel }: Props) {
    return (
        <nav aria-label={ariaLabel} className="border-b border-border flex">
            {items.map((item) => {
                const active = item.key === activeKey
                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-2 text-body2 border-b-2 -mb-px transition-colors',
                            active
                                ? 'border-primary text-foreground font-medium'
                                : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {item.label}
                        {!!item.count && item.count > 0 && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    'text-caption',
                                    item.emphasis ? 'text-spot border-spot/50' : 'text-muted-foreground border-border',
                                )}
                            >
                                {item.count}
                            </Badge>
                        )}
                    </Link>
                )
            })}
        </nav>
    )
}
