import type { User } from '@/types'
import { CARD_BASE, SECTION_LABEL } from '@/lib/dashboard/tokens'
import { GuestBadge } from '@/components/common/guest-badge'
import { ProfileLink } from '@/components/common/profile-link'

export type StatRankingEntry = {
    key: string          // 회원: users.id, 외부: `name:{이름}`
    fallbackName?: string
    wins: number
    losses: number
    draws: number
    winRate: number
}

type Props = {
    title: string
    entries: StatRankingEntry[]
    userMap: Map<string, User>
    emptyText: string
    maxRows?: number
}

function StatRow({ entry, userMap }: { entry: StatRankingEntry; userMap: Map<string, User> }) {
    const user = userMap.get(entry.key)
    // 외부(개인 경기 직접 입력) 상대/파트너는 userMap에 없음 → 프로필 링크 없이 이름만 표시
    const isExternal = !user
    const record = `${entry.wins}승 ${entry.losses}패${entry.draws > 0 ? ` ${entry.draws}무` : ''}`
    const stat = (
        <span className="text-sm text-foreground/80 shrink-0 ml-2">
            {record}
            <span className="ml-1.5 text-foreground/85">{entry.winRate}%</span>
        </span>
    )

    if (isExternal) {
        const name = entry.fallbackName ?? entry.key.replace(/^name:/, '')
        return (
            <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/90 truncate">{name}</span>
                {stat}
            </div>
        )
    }

    const name = user?.name ?? user?.nickname ?? entry.key.slice(0, 8)
    const isGuest = user?.isGuest ?? false

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
                <ProfileLink
                    userId={entry.key}
                    isGuest={isGuest}
                    className="text-sm text-foreground/90 hover:text-foreground transition-colors truncate"
                >
                    {name}
                </ProfileLink>
                {isGuest && <GuestBadge />}
            </div>
            {stat}
        </div>
    )
}

/**
 * 파트너/상대 등 "이름 + 전적 + 승률" 행을 순위로 보여주는 공용 카드.
 * 데이터가 없으면 기준을 설명하는 emptyText를 서브텍스트로 노출한다.
 */
export function StatRankingCard({ title, entries, userMap, emptyText, maxRows = 5 }: Props) {
    return (
        <section className="space-y-3 h-full flex flex-col">
            <p className={SECTION_LABEL}>{title}</p>
            <div className={`${CARD_BASE} p-4 flex-1`}>
                {entries.length > 0 ? (
                    <div className="space-y-2">
                        {entries.slice(0, maxRows).map((entry) => (
                            <StatRow key={entry.key} entry={entry} userMap={userMap} />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>
                )}
            </div>
        </section>
    )
}
