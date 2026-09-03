'use client'

import { useState, useEffect, useTransition } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { User, MatchType } from '@/types'
import type { PlayerStats } from '@/lib/stats'
import { combinePlayerStats } from '@/lib/stats'
import { StatsQuadCard } from '@/components/stats/stats-quad-card'
import { StatsQuadCardEmpty } from '@/components/stats/stats-quad-card-empty'
import { StatsEmpty } from '@/components/stats/stats-empty'
import { StatsPrivacyToggle } from '@/components/stats/stats-privacy-toggle'
import { toggleStatsHiddenAction } from '@/lib/actions/profile'
import { TYPO } from '@/lib/dashboard/tokens'

type Props = {
    gender: User['gender']
    singles: PlayerStats
    menDoubles: PlayerStats
    womenDoubles: PlayerStats
    mixedDoubles: PlayerStats
    privacy?: 'public' | 'self' | 'locked'
    editable?: boolean
    statsHidden?: boolean
    showSets?: boolean
    // 있으면 섹션 헤더(라벨) 렌더, 없으면 생략 (호출부에서 라벨을 직접 관리할 때)
    label?: string
    // 0경기 빈 상태 CTA (본인 화면에서만 주입 — 타인은 미전달 → 일러스트+메시지만)
    emptyRecordHref?: string
    emptyBrowseHref?: string
    emptyRecordLabel?: string
    emptyBrowseLabel?: string
}

export function StatsQuadGrid({
    gender,
    singles,
    menDoubles,
    womenDoubles,
    mixedDoubles,
    privacy = 'public',
    editable = false,
    statsHidden = false,
    showSets = true,
    label,
    emptyRecordHref,
    emptyBrowseHref,
    emptyRecordLabel,
    emptyBrowseLabel,
}: Props) {
    const [revealed, setRevealed] = useState(false)
    const [, startTransition] = useTransition()

    // privacy가 변경되면(공개↔비공개 토글 후 재렌더) revealed를 초기화해 블러를 복원
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setRevealed(false) }, [privacy])

    // 본인 화면에서 "클릭해서 보기" → 블러 해제 + 전적 통계를 공개 상태로 전환
    function handleReveal() {
        setRevealed(true)
        startTransition(async () => {
            await toggleStatsHiddenAction(false)
        })
    }

    // 4칸 고정을 위해 성별에 따라 남복/여복 중 정확히 1개만 노출 (female=여복, 그 외=남복)
    const showWomenDoubles = gender === 'female'
    const genderDoubles = showWomenDoubles ? womenDoubles : menDoubles
    const genderDoublesType = showWomenDoubles ? 'women_doubles' : 'men_doubles'
    // '전체' 종합 카드 = 4분기 합산 (winRate 재계산)
    const totalStats = combinePlayerStats(singles, menDoubles, womenDoubles, mixedDoubles)

    const isLocked = privacy === 'locked'
    const isSelf = privacy === 'self'
    // 본인 비공개(self) 또는 타인의 비공개 프로필(locked) 모두 블러 처리
    const isBlurred = (isSelf && !revealed) || isLocked
    // 레벨1: 전체 0경기 빈 상태 (locked는 블러 우선 — 0/데이터 노출 자체를 막음)
    const isEmpty = !isLocked && totalStats.totalMatches === 0

    const header = (label || editable) && (
        <div className="flex items-center justify-between">
            {label ? <h3 className={TYPO.h4}>{label}</h3> : <span />}
            {editable && <StatsPrivacyToggle hidden={statsHidden} />}
        </div>
    )

    if (isEmpty) {
        return (
            <section className="space-y-3">
                {header}
                <StatsEmpty
                    recordHref={emptyRecordHref}
                    browseHref={emptyBrowseHref}
                    recordLabel={emptyRecordLabel}
                    browseLabel={emptyBrowseLabel}
                />
            </section>
        )
    }

    // 레벨2: 매치타입별 카드 — 0경기면 빈 카드로 대체 (전체 카드는 합산이라 항상 일반 렌더)
    const renderCard = (matchType: MatchType, stats: PlayerStats) =>
        stats.totalMatches === 0 ? (
            <StatsQuadCardEmpty matchType={matchType} recordHref={emptyRecordHref} />
        ) : (
            <StatsQuadCard matchType={matchType} stats={stats} masked={isLocked} showSets={showSets} />
        )

    return (
        <section className="space-y-3">
            {header}
            <div className="relative">
                <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 ${isBlurred ? 'blur-sm select-none pointer-events-none' : ''}`}>
                    <StatsQuadCard variant="neutral" stats={totalStats} masked={isLocked} showSets={showSets} />
                    {renderCard('singles', singles)}
                    {renderCard(genderDoublesType, genderDoubles)}
                    {renderCard('mixed_doubles', mixedDoubles)}
                </div>

                {isBlurred && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {isLocked ? (
                            <div className="flex items-center gap-1.5 text-caption px-3 py-2 rounded-lg bg-background/80 border border-foreground/20 text-foreground/70 backdrop-blur-sm shadow-sm">
                                <EyeOff className="w-3.5 h-3.5" />
                                승률을 공개하지 않은 유저입니다
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleReveal}
                                className="flex items-center gap-1.5 text-caption px-3 py-2 rounded-lg bg-background/80 border border-foreground/20 text-foreground/70 hover:text-foreground hover:border-foreground/40 backdrop-blur-sm transition-all shadow-sm"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                클릭해서 보기
                            </button>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}
