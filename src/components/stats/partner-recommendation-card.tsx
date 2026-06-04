import Link from 'next/link'
import type { PartnerRecommendations, PartnerRec } from '@/lib/analytics/partner'
import type { User } from '@/types'
import { CARD_BASE, SECTION_LABEL } from '@/lib/dashboard/tokens'
import { GuestBadge } from '@/components/common/guest-badge'

type Props = {
    recommendations: PartnerRecommendations
    userMap: Map<string, User>
    gender: User['gender']
}

const MATCH_TYPE_LABEL: Record<string, string> = {
    men_doubles: '남자 복식',
    women_doubles: '여자 복식',
    mixed_doubles: '혼합 복식',
}

function PartnerRow({ rec, userMap }: { rec: PartnerRec; userMap: Map<string, User> }) {
    const user = userMap.get(rec.partnerId)
    const name = user?.name ?? user?.nickname ?? rec.partnerId.slice(0, 8)
    const ntrp = user?.ntrp ? ` (${user.ntrp})` : ''
    const isGuest = user?.isGuest ?? false

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
                {!isGuest ? (
                    <Link
                        href={`/profile/${rec.partnerId}`}
                        className="text-sm text-foreground/90 hover:text-foreground transition-colors truncate"
                    >
                        {name}{ntrp}
                    </Link>
                ) : (
                    <span className="text-sm text-foreground/90 truncate">{name}</span>
                )}
                {isGuest && <GuestBadge />}
            </div>
            <span className="text-sm text-foreground/80 shrink-0 ml-2">
                {rec.wins}승 {rec.losses}패{rec.draws > 0 ? ` ${rec.draws}무` : ''}
                <span className="ml-1.5 text-foreground/85">{rec.winRate}%</span>
            </span>
        </div>
    )
}

function PartnerSection({
    matchType,
    recs,
    userMap,
}: {
    matchType: string
    recs: PartnerRec[]
    userMap: Map<string, User>
}) {
    if (recs.length === 0) return null

    return (
        <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground/75">{MATCH_TYPE_LABEL[matchType] ?? matchType}</p>
            <div className="space-y-2">
                {recs.slice(0, 3).map((rec) => (
                    <PartnerRow key={rec.partnerId} rec={rec} userMap={userMap} />
                ))}
            </div>
        </div>
    )
}

export function PartnerRecommendationCard({ recommendations, userMap, gender }: Props) {
    // 성별에 따라 노출 종목 결정
    const isMale = gender === 'male'
    const sections = isMale
        ? [
            { key: 'men_doubles', recs: recommendations.menDoubles },
            { key: 'mixed_doubles', recs: recommendations.mixedDoubles },
        ]
        : [
            { key: 'women_doubles', recs: recommendations.womenDoubles },
            { key: 'mixed_doubles', recs: recommendations.mixedDoubles },
        ]

    const hasData = sections.some((s) => s.recs.length > 0)

    return (
        <section className="space-y-3">
            <p className={SECTION_LABEL}>나와 잘 맞는 파트너</p>
            <div className={`${CARD_BASE} p-4`}>
                {hasData ? (
                    <div className="space-y-5">
                        {sections.map(({ key, recs }) => (
                            <PartnerSection key={key} matchType={key} recs={recs} userMap={userMap} />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                        2경기 이상 함께 뛴 파트너 데이터가 없습니다
                    </p>
                )}
            </div>
        </section>
    )
}
