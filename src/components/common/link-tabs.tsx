import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type LinkTabItem = {
    key: string
    label: string
    href: string
    /** 0이면 배지를 붙이지 않는다 — 행동이 필요한 탭에만 숫자를 보여주기 위함 */
    count?: number
}

type Props = {
    items: LinkTabItem[]
    activeKey: string
    ariaLabel: string
}

/**
 * URL 파라미터로 전환하는 탭 바 (서버 컴포넌트).
 * 매칭 리스트와 참여 중인 매칭이 같은 시간 축 탭을 이 컴포넌트로 그린다.
 *
 * '내 차례 있음'을 알리던 `emphasis`는 Week 45에 지웠다 — 관계 축이 라우트로 나가면서
 * 그 신호는 사이드바 뱃지가 맡는다(탭 배지는 `count>0`일 때만 그려져 참여 방이 0이면
 * 강조가 아예 나타나지 않는 구멍도 있었다).
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
                            <Badge variant="outline" className="text-caption text-muted-foreground border-border">
                                {item.count}
                            </Badge>
                        )}
                    </Link>
                )
            })}
        </nav>
    )
}
