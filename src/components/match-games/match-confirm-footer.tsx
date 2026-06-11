'use client'

import { Button } from '@/components/ui/button'
import { Trophy, Loader2, AlertCircle } from 'lucide-react'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import type { MatchStates } from '@/lib/match-games/match-view-helpers'
import type { MatchGame } from '@/types'

type MatchConfirmFooterProps = {
    matchGame: MatchGame
    matchStates: MatchStates
    isOwner: boolean
    isPending: boolean
    getCourtLabel: (courtId: string) => string
    onConfirm: () => void
}

// 미확정 경기를 안내에 노출할 최대 개수 (이후는 "외 N개"로 축약).
const MAX_PENDING_PREVIEW = 3

// 대진표 하단 확정 영역 — 오너 & 미고정일 때만 노출.
//   · 모든 경기 확정 → "결과 확정" 버튼
//   · 남은 경기 있음 → 진행 현황 배너 + 남은 경기 목록 (버튼은 숨김)
// 모든 경기를 확정해야 마감 가능하다는 요건은 그대로 유지하되,
// 왜 버튼이 없는지/어느 경기가 남았는지를 명시해 혼란을 없앤다.
export function MatchConfirmFooter({
    matchGame, matchStates, isOwner, isPending, getCourtLabel, onConfirm,
}: MatchConfirmFooterProps) {
    if (!isOwner || matchGame.isFixed) return null

    const total = matchGame.matches.length
    const pending = matchGame.matches.filter((m) => !matchStates[m.id]?.confirmed)

    if (total > 0 && pending.length === 0) {
        return (
            <div className="flex justify-end">
                <Button
                    size="sm"
                    onClick={onConfirm}
                    disabled={isPending}
                    className="gap-1.5 rounded-full font-semibold px-5"
                >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
                    {isPending ? '확정 중...' : '결과 확정'}
                </Button>
            </div>
        )
    }

    if (total === 0) return null

    const previews = pending.slice(0, MAX_PENDING_PREVIEW).map(
        (m) => `${getCourtLabel(m.courtId)} · ${MATCH_TYPE_LABELS[m.matchType]}`
    )
    const remainder = pending.length - previews.length

    return (
        <div className="flex flex-col gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/8 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                경기 입력 현황 {total - pending.length}/{total}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
                남은 경기: {previews.join(', ')}
                {remainder > 0 && ` 외 ${remainder}개`}
                <br />
                남은 경기 스코어를 모두 입력하면 결과 확정 버튼이 나타납니다.
            </p>
        </div>
    )
}
