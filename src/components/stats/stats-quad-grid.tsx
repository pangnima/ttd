'use client'

import { useState, useEffect, useTransition } from 'react'
import { Eye } from 'lucide-react'
import type { User } from '@/types'
import type { PlayerStats } from '@/lib/stats'
import { StatsQuadCard } from '@/components/stats/stats-quad-card'
import { StatsPrivacyToggle } from '@/components/stats/stats-privacy-toggle'
import { toggleStatsHiddenAction } from '@/lib/actions/profile'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'

type Props = {
    gender: User['gender']
    singles: PlayerStats
    menDoubles: PlayerStats
    womenDoubles: PlayerStats
    mixedDoubles: PlayerStats
    privacy?: 'public' | 'self' | 'locked'
    editable?: boolean
    statsHidden?: boolean
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
}: Props) {
    const [revealed, setRevealed] = useState(false)
    const [, startTransition] = useTransition()

    // privacy가 변경되면(공개↔비공개 토글 후 재렌더) revealed를 초기화해 블러를 복원
    useEffect(() => {
        setRevealed(false)
    }, [privacy])

    function handleReveal() {
        setRevealed(true)
        startTransition(async () => {
            await toggleStatsHiddenAction(false)
        })
    }

    const showMenDoubles = gender !== 'female'
    const showWomenDoubles = gender !== 'male'

    const isLocked = privacy === 'locked'
    const isSelf = privacy === 'self'
    const isBlurred = isSelf && !revealed

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <p className={SECTION_LABEL}>내 전적 통계</p>
                {editable && (
                    <StatsPrivacyToggle hidden={statsHidden} />
                )}
            </div>
            <div className="relative">
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${isBlurred ? 'blur-sm select-none pointer-events-none' : ''}`}>
                    <StatsQuadCard matchType="singles" stats={singles} masked={isLocked} />
                    {showMenDoubles && <StatsQuadCard matchType="men_doubles" stats={menDoubles} masked={isLocked} />}
                    {showWomenDoubles && <StatsQuadCard matchType="women_doubles" stats={womenDoubles} masked={isLocked} />}
                    <StatsQuadCard matchType="mixed_doubles" stats={mixedDoubles} masked={isLocked} />
                </div>

                {isBlurred && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <button
                            type="button"
                            onClick={handleReveal}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-background/80 border border-foreground/20 text-foreground/70 hover:text-foreground hover:border-foreground/40 backdrop-blur-sm transition-all shadow-sm"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            클릭해서 보기
                        </button>
                    </div>
                )}
            </div>
        </section>
    )
}
