import { CARD_BASE, SECTION_LABEL, TEXT_META, TEXT_MUTED } from '@/lib/dashboard/tokens'
import { Users, UserPlus, Activity } from 'lucide-react'
import type { ClubMemberStats } from '@/lib/queries/club-dashboard'

type MemberStatsCardProps = {
    stats: ClubMemberStats
}

export function MemberStatsCard({ stats }: MemberStatsCardProps) {
    const activeRate = stats.totalCount > 0
        ? Math.round((stats.activeThisMonthCount / stats.totalCount) * 100)
        : 0

    return (
        <div className={`${CARD_BASE} p-4 space-y-4`}>
            <p className={SECTION_LABEL}>회원 현황</p>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className={`w-3.5 h-3.5 ${TEXT_MUTED}`} />
                        <span className={`text-xs ${TEXT_MUTED}`}>전체 회원</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                        {stats.totalCount}
                        <span className={`text-xs font-normal ml-0.5 ${TEXT_META}`}>명</span>
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UserPlus className={`w-3.5 h-3.5 ${TEXT_MUTED}`} />
                        <span className={`text-xs ${TEXT_MUTED}`}>이번 달 신규</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                        {stats.newThisMonthCount}
                        <span className={`text-xs font-normal ml-0.5 ${TEXT_META}`}>명</span>
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className={`w-3.5 h-3.5 ${TEXT_MUTED}`} />
                        <span className={`text-xs ${TEXT_MUTED}`}>30일 활동률</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                        {activeRate}
                        <span className={`text-xs font-normal ml-0.5 ${TEXT_META}`}>%</span>
                    </span>
                </div>
            </div>
        </div>
    )
}
