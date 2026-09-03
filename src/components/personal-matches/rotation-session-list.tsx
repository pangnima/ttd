import type { RotationSession } from '@/types'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { RotationSessionCard } from '@/components/personal-matches/rotation-session-card'

type Props = { sessions: RotationSession[] }

/** 개인 경기 목록 상단 "결과 입력 대기 로테이션" 섹션 — 세션이 없으면 렌더하지 않는다 */
export function RotationSessionList({ sessions }: Props) {
    if (sessions.length === 0) return null
    return (
        <section className="space-y-2">
            <div className="flex items-baseline gap-2">
                <h2 className={TYPO.h3}>결과 입력 대기 로테이션</h2>
                <span className="text-xs text-muted-foreground">게임을 입력하면 게임별 경기로 기록됩니다</span>
            </div>
            <div className={`${CARD_BASE} divide-y divide-border`}>
                {sessions.map((s) => <RotationSessionCard key={s.id} session={s} />)}
            </div>
        </section>
    )
}
