'use client'

import { useTransition } from 'react'
import type { RotationSession } from '@/types'
import { Button } from '@/components/ui/button'
import { MATCH_TYPE_LABELS, getMatchTypeBadgeClass } from '@/lib/dashboard/match-type-style'
import { SURFACE_LABELS, SURFACE_TEXT_CLASS } from '@/lib/dashboard/surface'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { PENDING_RESULT_BADGE, PENDING_RESULT_BAR } from '@/lib/dashboard/outcome'
import { deleteRotationSessionAction, finalizeRotationSessionAction } from '@/lib/actions/rotation-sessions'
import { RotationGamesDialog } from '@/components/personal-matches/rotation-games-dialog'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = { session: RotationSession }

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** 결과 입력 대기 로테이션 세션 카드 — 참가자 요약 + [결과 입력](게임 빌더 Dialog) + 삭제 */
export function RotationSessionCard({ session: s }: Props) {
    const [, mm, dd] = s.playedAt.split('-')
    const d = useResultDialog()
    const [isDeleting, startDelete] = useTransition()

    function handleDelete() {
        if (!confirm('이 로테이션 세션을 삭제할까요? 참가자 정보가 사라집니다.')) return
        startDelete(async () => { await deleteRotationSessionAction(s.id) })
    }

    return (
        <div className="flex items-stretch gap-3 px-3 py-3">
            <span className={`w-1 self-stretch rounded-full ${PENDING_RESULT_BAR}`} aria-hidden />
            <div className="w-12 shrink-0 self-center flex flex-col items-center gap-0.5">
                <span className={`${PILL_BASE} mb-1 ${getMatchTypeBadgeClass(s.matchType)}`}>
                    {MATCH_TYPE_LABELS[s.matchType]}
                </span>
                <div className="text-lg font-bold leading-none tabular-nums text-foreground">{Number(dd)}</div>
                <div className="text-caption text-muted-foreground">{MONTHS_EN[Number(mm) - 1]}</div>
                <div className={`text-caption font-medium ${SURFACE_TEXT_CLASS[s.surface] ?? SURFACE_TEXT_CLASS.unknown}`}>
                    {SURFACE_LABELS[s.surface] ?? s.surface}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                            로테이션 · 참가자 {s.players.length}명
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{s.players.map((p) => p.name).join(' · ')}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-[4px] text-xs font-bold shrink-0 ${PENDING_RESULT_BADGE}`}>게임 미입력</span>
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={d.openDialog}>결과 입력</Button>
                    <button onClick={handleDelete} disabled={isDeleting} className="text-xs text-destructive/80 hover:text-destructive transition-colors disabled:opacity-40">
                        삭제
                    </button>
                </div>
            </div>

            <RotationGamesDialog
                open={d.open}
                onOpenChange={d.setOpen}
                session={s}
                onSubmit={(games) => d.run(() => finalizeRotationSessionAction(s.id, games))}
                isPending={d.isPending}
                error={d.error}
            />
        </div>
    )
}
