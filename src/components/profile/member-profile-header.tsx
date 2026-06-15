import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { GuestBadge } from '@/components/common/guest-badge'
import { TierIcon } from '@/components/common/tier-icon'
import { ProfileTierProgress } from '@/components/profile/profile-tier-progress'
import { ProfileStatRow } from '@/components/profile/profile-stat-row'
import { ProfileSummaryRow, type ProfileSummary } from '@/components/profile/profile-summary-row'
import { WinRateRing } from '@/components/stats/win-rate-ring'
import { RecentFormStrip } from '@/components/stats/recent-form-strip'
import { getTier, TIER_LABELS, TIER_TEXT } from '@/lib/rating/tier'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'
import type { RecentFormResult } from '@/lib/analytics/form'
import type { User } from '@/types'

type Props = {
    user: User
    clubName?: string
    clubRating?: number
    provisional?: boolean
    /** 클럽 N위 (클럽 scope·공개일 때만) */
    clubRank?: number
    /** 현재 scope 기준 보조 스탯 (승률은 프라이버시상 제외) */
    stats?: { games: number; winStreak: number }
    /** 티어가 없는 비클럽 scope(본인) 전용 요약 — 승률 링 + 보조 행 노출 */
    summary?: ProfileSummary
    /** 최근 경기 폼 (본인 전용) — W/L/D 박스 스트립 노출 */
    recentForm?: RecentFormResult
    /** 개인 경기 승패 기반 개인 레이팅 (비클럽 scope·본인 전용). 경기 있을 때만 전달됨 */
    personalRating?: { rating: number; provisional: boolean }
}

const genderLabel: Record<User['gender'], string> = { male: '남', female: '여' }
const handLabel: Record<User['dominantHand'], string> = { right: '오른손잡이', left: '왼손잡이' }

export function MemberProfileHeader({ user, clubName, clubRating, provisional, clubRank, stats, summary, recentForm, personalRating }: Props) {
    const hasTier = clubRating !== undefined
    const tier = hasTier ? getTier(clubRating) : null
    // 비클럽 scope에서 개인 경기 레이팅이 있으면 티어 앰블럼을 좌측 히어로로 노출(승률 링 대체).
    const hasPersonalTier = !hasTier && !!personalRating
    const personalTier = personalRating ? getTier(personalRating.rating) : null
    // 티어(클럽/개인)가 모두 없을 때만 승률 링을 좌측 히어로 슬롯에 채운다.
    const showSummary = !hasTier && !!summary
    // NTRP 배지: 개인 레이팅이 있으면 현재 레이팅(연속값)을 소수점 3자리로, 없으면 자가선언값.
    const ntrpDisplay = personalRating ? personalRating.rating.toFixed(3) : user.ntrp.toFixed(1)

    return (
        <div className={cn(CARD_BASE, 'p-5 sm:p-6')}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                {/* 티어 방패 (클럽 레이팅 있을 때만). 모바일=상단 중앙 / 데스크톱=좌측. 강조 위해 크게. */}
                {hasTier && tier && (
                    <div className="flex flex-col items-center gap-1 shrink-0 self-center sm:self-auto">
                        <TierIcon tier={tier} className="h-[100px] sm:h-[124px]" />
                        <span className={cn('text-sm font-bold', TIER_TEXT[tier])}>{TIER_LABELS[tier]}</span>
                    </div>
                )}

                {/* 개인 경기 레이팅 티어 방패 (비클럽 scope·경기 있을 때). 승/패/무 텍스트 병기. */}
                {hasPersonalTier && personalTier && (
                    <div className="flex flex-col items-center gap-1 shrink-0 self-center sm:self-auto">
                        <TierIcon tier={personalTier} className="h-[100px] sm:h-[124px]" />
                        <span className={cn('text-sm font-bold', TIER_TEXT[personalTier])}>{TIER_LABELS[personalTier]}</span>
                        {summary && (
                            <span className="text-xs tabular-nums">
                                <span className="text-win font-semibold">{summary.wins}승</span>{' '}
                                <span className="text-loss font-semibold">{summary.losses}패</span>
                                {summary.draws > 0 && <span className="text-muted-foreground"> {summary.draws}무</span>}
                            </span>
                        )}
                    </div>
                )}

                {/* 티어(클럽/개인) 부재 시 좌측 히어로 = 승률 링 */}
                {showSummary && !hasPersonalTier && summary && (
                    <WinRateRing wins={summary.wins} losses={summary.losses} draws={summary.draws} />
                )}

                {/* 정보 영역 */}
                <div className="w-full flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-12 h-12 shrink-0">
                                {user.profileImage && <AvatarImage src={user.profileImage} alt={user.nickname} />}
                                <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                                    {user.nickname[0] ?? user.name[0] ?? '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl font-bold leading-tight">{user.name}</h1>
                                    <span className="text-sm text-muted-foreground">({user.nickname})</span>
                                    {user.isGuest && <GuestBadge />}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {genderLabel[user.gender]} · {handLabel[user.dominantHand]}
                                    {clubRank !== undefined && (
                                        <span className="ml-1.5 font-medium text-foreground">· 클럽 {clubRank}위</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        {user.isGuest ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">NTRP -</Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs font-mono shrink-0">
                                NTRP {ntrpDisplay}
                            </Badge>
                        )}
                    </div>

                    {hasTier && (
                        <ProfileTierProgress rating={clubRating} provisional={provisional} />
                    )}

                    {/* 비클럽 scope(통합/개인): 개인 경기 레이팅 진척바 */}
                    {!hasTier && personalRating && (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">개인 경기 레이팅</p>
                            <ProfileTierProgress rating={personalRating.rating} provisional={personalRating.provisional} />
                        </div>
                    )}

                    {showSummary && summary
                        ? <ProfileSummaryRow {...summary} />
                        : stats && <ProfileStatRow {...stats} />}

                    {recentForm && (
                        <RecentFormStrip last10={recentForm.last10} currentStreak={recentForm.currentStreak} />
                    )}

                    {clubName && <p className="text-xs text-muted-foreground">{clubName} 기준 통계</p>}
                </div>
            </div>
        </div>
    )
}
