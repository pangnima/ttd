import type { PartnerChemistry } from '@/lib/analytics/partner-chemistry'
import type { User } from '@/types'
import { SectionCard } from '@/components/common/section-card'
import { TEXT_MUTED } from '@/lib/dashboard/tokens'
import { PartnerChemistryRow } from '@/components/stats/partner-chemistry-row'

type Props = {
    partners: PartnerChemistry[]
    userMap: Map<string, User>
}

// 파트너 케미 — 복식 파트너별 호흡(승률·케미지수·연승·추세).
export function PartnerChemistryCard({ partners, userMap }: Props) {
    const isEmpty = partners.length === 0

    return (
        <SectionCard
            title="파트너 케미"
            isEmpty={isEmpty}
            emptyMessage="3경기 이상 함께 뛴 파트너가 아직 없어요"
            contentClass="p-4"
            headerRight={!isEmpty ? <span className={`text-xs ${TEXT_MUTED}`}>복식 호흡 · 케미 지수</span> : undefined}
        >
            {!isEmpty && (
                <div className="divide-y divide-border/60">
                    {partners.map((partner) => (
                        <PartnerChemistryRow key={`${partner.matchType}-${partner.partnerId}`} partner={partner} userMap={userMap} />
                    ))}
                </div>
            )}
        </SectionCard>
    )
}
