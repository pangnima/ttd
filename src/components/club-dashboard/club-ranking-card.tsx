import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CARD_BASE, SECTION_LABEL, TEXT_MUTED } from '@/lib/dashboard/tokens'
import { FORM_BADGE_STYLE } from '@/lib/dashboard/outcome'
import { RankBadge } from '@/components/common/rank-badge'
import { GuestBadge } from '@/components/common/guest-badge'
import { TierIcon } from '@/components/common/tier-icon'
import { getTier, TIER_LABELS, TIER_TEXT } from '@/lib/rating/tier'
import { avatarColorClass } from '@/lib/avatar-color'
import { cn } from '@/lib/utils'
import type { ClubRatingRankingEntry } from '@/lib/queries/ratings'
import type { ClubMemberForm } from '@/lib/analytics/club-form'

type ClubRankingCardProps = {
    clubId: string
    entries: ClubRatingRankingEntry[]
    /** userId → 승/패·최근폼 (확정 경기 기반 집계) */
    forms: Map<string, ClubMemberForm>
}

// 클럽 랭킹 리더보드(순위/선수/티어/최근5). 레이팅 내림차순(entries 정렬 그대로).
export function ClubRankingCard({ clubId, entries, forms }: ClubRankingCardProps) {
    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <p className={SECTION_LABEL}>클럽 랭킹</p>
                <span className={`text-[11px] ${TEXT_MUTED}`}>경기 결과로 자동 산정</span>
            </div>
            <div className={`${CARD_BASE} p-2 sm:p-3`}>
                {entries.length === 0 ? (
                    <p className={`text-xs ${TEXT_MUTED} py-6 text-center`}>아직 확정된 경기가 없습니다</p>
                ) : (
                    <div>
                        {/* 컬럼 헤더 (sm 이상) */}
                        <div className={`hidden sm:flex items-center gap-3 px-2 pb-2 text-[11px] ${TEXT_MUTED}`}>
                            <span className="w-6 shrink-0 text-center">순위</span>
                            <span className="flex-1 min-w-0">선수</span>
                            <span className="w-24 shrink-0">티어</span>
                            <span className="w-[120px] shrink-0 text-right">최근 5</span>
                        </div>
                        <div className="divide-y divide-border/60">
                            {entries.map((entry, idx) => (
                                <ClubRankingRow
                                    key={entry.userId}
                                    clubId={clubId}
                                    entry={entry}
                                    index={idx}
                                    form={forms.get(entry.userId)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

type RowProps = {
    clubId: string
    entry: ClubRatingRankingEntry
    index: number
    form?: ClubMemberForm
}

function ClubRankingRow({ clubId, entry, index, form }: RowProps) {
    const isGuest = entry.user?.isGuest ?? false
    const name = entry.user?.name ?? '알 수 없음'
    const initial = name[0] ?? '?'
    const profileHref = entry.user && !isGuest ? `/profile/${entry.userId}?clubId=${clubId}` : undefined
    const tier = getTier(entry.rating)
    const wins = form?.wins ?? 0
    const losses = form?.losses ?? 0
    const recent = form?.recent ?? []

    return (
        <div className="flex items-center gap-3 px-2 py-2.5">
            {/* 순위 */}
            <div className="w-6 shrink-0 flex justify-center">
                <RankBadge index={index} iconClass="w-4 h-4" textClass="text-sm" />
            </div>

            {/* 선수 */}
            <div className="flex-1 min-w-0 flex items-center gap-2.5">
                <Avatar className="size-8 shrink-0">
                    {entry.user?.profileImage && <AvatarImage src={entry.user.profileImage} alt={name} />}
                    <AvatarFallback className={cn('font-semibold', avatarColorClass(entry.userId))}>
                        {initial}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        {profileHref ? (
                            <Link href={profileHref} className="text-sm font-medium text-foreground truncate leading-tight">
                                {name}
                            </Link>
                        ) : (
                            <p className="text-sm font-medium text-foreground truncate leading-tight">{name}</p>
                        )}
                        {isGuest && <GuestBadge />}
                    </div>
                    <p className={`text-[11px] ${TEXT_MUTED} tabular-nums`}>
                        {wins}승 {losses}패
                    </p>
                </div>
            </div>

            {/* 티어 */}
            <div className="w-8 sm:w-24 shrink-0 flex items-center gap-1.5">
                <TierIcon tier={tier} size={24} />
                <span className={cn('hidden sm:inline text-sm font-medium', TIER_TEXT[tier])}>{TIER_LABELS[tier]}</span>
            </div>

            {/* 최근 5 */}
            <div className="w-[120px] shrink-0 flex items-center justify-end gap-1">
                {recent.map((outcome, i) => (
                    <span
                        key={i}
                        className={`w-5 h-5 rounded-sm text-[10px] font-bold flex items-center justify-center ${FORM_BADGE_STYLE[outcome]}`}
                    >
                        {outcome}
                    </span>
                ))}
            </div>
        </div>
    )
}
