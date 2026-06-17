import type { RivalEntry } from '@/lib/analytics/rival'
import type { User } from '@/types'
import { SectionCard } from '@/components/common/section-card'
import { TEXT_MUTED } from '@/lib/dashboard/tokens'
import { RivalRow } from '@/components/stats/rival-row'

type Props = {
    rivals: RivalEntry[]
    userMap: Map<string, User>
    today: string
}

// 라이벌 분석 — 맞대결이 잦은 상대를 전적·최근 폼과 함께 보여준다.
export function RivalAnalysisCard({ rivals, userMap, today }: Props) {
    const isEmpty = rivals.length === 0

    return (
        <SectionCard
            title="라이벌 분석"
            isEmpty={isEmpty}
            emptyMessage="승률 45~55% 박빙 상대가 아직 없어요"
            emptyImage="/empty/rivals.svg"
            contentClass="p-4"
            headerRight={!isEmpty ? <span className={`text-xs ${TEXT_MUTED}`}>승률 45~55% 박빙 상대</span> : undefined}
        >
            {!isEmpty && (
                <div className="divide-y divide-border/60">
                    {rivals.map((rival) => (
                        <RivalRow key={rival.key} rival={rival} userMap={userMap} today={today} />
                    ))}
                </div>
            )}
        </SectionCard>
    )
}
