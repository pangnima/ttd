'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Game, GameResult } from '@/types'

type GameScoreDialogProps = {
    game: Game | null
    open: boolean
    readOnly?: boolean
    getPlayerName: (userId: string) => string
    onClose: () => void
    onSave: (gameId: string, result: GameResult) => void
}

const MATCH_TYPE_LABEL: Record<string, string> = {
    singles: '단식',
    men_doubles: '남복',
    women_doubles: '여복',
    mixed_doubles: '혼복',
}

export function GameScoreDialog({
    game,
    open,
    readOnly = false,
    getPlayerName,
    onClose,
    onSave,
}: GameScoreDialogProps) {
    const [sets, setSets] = useState<Array<{ team1: string; team2: string }>>([
        { team1: '', team2: '' },
    ])

    useEffect(() => {
        if (game?.result) {
            const firstSet = game.result.sets[0]
            setSets([{
                team1: String(firstSet?.team1 ?? ''),
                team2: String(firstSet?.team2 ?? ''),
            }])
        } else {
            setSets([{ team1: '', team2: '' }])
        }
    }, [game])

    if (!game) return null

    const isSingles = game.matchType === 'singles'
    const team1Label = isSingles
        ? getPlayerName(game.player1Id ?? '')
        : (game.team1 ?? []).map(getPlayerName).join(' / ')
    const team2Label = isSingles
        ? getPlayerName(game.player2Id ?? '')
        : (game.team2 ?? []).map(getPlayerName).join(' / ')

    const set = sets[0]
    const canSave =
        !readOnly &&
        set.team1 !== '' &&
        set.team2 !== '' &&
        Number(set.team1) !== Number(set.team2)

    const handleSave = () => {
        if (!canSave) return
        const team1Score = Number(set.team1)
        const team2Score = Number(set.team2)
        const winner = team1Score > team2Score
            ? (isSingles ? (game.player1Id ?? 'team1') : 'team1')
            : (isSingles ? (game.player2Id ?? 'team2') : 'team2')

        onSave(game.id, {
            sets: [{ team1: team1Score, team2: team2Score }],
            winnerId: winner,
        })
        onClose()
    }

    const updateSet = (key: 'team1' | 'team2', val: string) => {
        setSets([{ ...sets[0], [key]: val }])
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-base">
                        {MATCH_TYPE_LABEL[game.matchType]} 점수 입력
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* 팀 이름 */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-medium text-center">
                        <span className="truncate">{team1Label}</span>
                        <span className="text-muted-foreground text-xs">vs</span>
                        <span className="truncate">{team2Label}</span>
                    </div>

                    {/* 스코어 입력 */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <Input
                            type="number"
                            min={0}
                            value={set.team1}
                            onChange={(e) => updateSet('team1', e.target.value)}
                            disabled={readOnly}
                            className="h-10 text-center text-lg font-semibold"
                            placeholder="0"
                        />
                        <span className="text-muted-foreground text-sm px-1">:</span>
                        <Input
                            type="number"
                            min={0}
                            value={set.team2}
                            onChange={(e) => updateSet('team2', e.target.value)}
                            disabled={readOnly}
                            className="h-10 text-center text-lg font-semibold"
                            placeholder="0"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        닫기
                    </Button>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave} disabled={!canSave}>
                            저장
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
