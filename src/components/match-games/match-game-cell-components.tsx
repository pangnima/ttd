'use client'

import { Check, Pencil } from 'lucide-react'
import { RatingDeltaBadge } from '@/components/match-games/rating-delta-badge'

export type SetScore = { team1: string; team2: string }

type TeamPlayersCellProps = {
    playerIds: string[]
    teamKey: 'team1' | 'team2'
    winner: 'team1' | 'team2' | 'draw' | null
    isFixed: boolean
    adPlayerId: string | null
    getName: (id: string) => string
    onToggle: (teamKey: 'team1' | 'team2', playerId: string) => void
    justify?: boolean
    deltas?: Record<string, number>
}

export function TeamPlayersCell({
    playerIds, teamKey, winner, isFixed, adPlayerId, getName, onToggle, justify, deltas,
}: TeamPlayersCellProps) {
    if (!playerIds.length) return <span className="text-foreground/55 text-xs">-</span>
    return (
        <div className="space-y-1">
            {playerIds.map((pid) => {
                const isAd = adPlayerId === pid
                return (
                    <div key={pid} className={`flex items-center gap-1.5 ${justify ? 'justify-between' : ''}`}>
                        <span className={`text-sm ${justify ? 'flex-1 min-w-0' : ''} ${winner === teamKey ? 'font-bold text-foreground' : 'text-foreground/85'} inline-flex items-center gap-1`}>
                            {getName(pid)}
                            {isFixed && <RatingDeltaBadge delta={deltas?.[pid]} />}
                        </span>
                        {!isFixed ? (
                            <button
                                onClick={() => onToggle(teamKey, pid)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 leading-none transition-colors ${isAd ? 'border-cyan-400/50 text-cyan-400/80 bg-cyan-400/10' : 'border-foreground/20 text-foreground/65 hover:border-foreground/35'}`}
                            >
                                {isAd ? '애드(백)' : '듀스(포)'}
                            </button>
                        ) : (
                            <span className="text-[10px] text-foreground/60 shrink-0">{isAd ? '애드(백)' : '듀스(포)'}</span>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

type ScoreCellProps = {
    sets: SetScore[]
    confirmed: boolean
    winner: 'team1' | 'team2' | 'draw' | null
    canEdit: boolean
    isPending: boolean
    compact?: boolean
    onUpdate: (setIndex: number, field: 'team1' | 'team2', value: string) => void
    onConfirm: () => void
    onEdit: () => void
}

export function ScoreCell({ sets, confirmed, winner, canEdit, isPending, compact = false, onUpdate, onConfirm, onEdit }: ScoreCellProps) {
    if (confirmed) {
        return (
            <div className="flex items-center gap-2">
                <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'} font-mono text-sm`}>
                    <span className={winner === 'team1' ? 'font-black text-foreground' : 'text-foreground/70'}>
                        {sets[0].team1}
                    </span>
                    <span className="text-foreground/55">:</span>
                    <span className={winner === 'team2' ? 'font-black text-foreground' : 'text-foreground/70'}>
                        {sets[0].team2}
                    </span>
                </div>
                {canEdit && (
                    <button
                        className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} flex items-center justify-center rounded text-foreground/60 hover:text-foreground/85 hover:bg-foreground/8 transition-colors`}
                        onClick={onEdit}
                        disabled={isPending}
                    >
                        <Pencil className="w-3 h-3" />
                    </button>
                )}
            </div>
        )
    }

    const inputCls = compact ? 'h-7 w-10' : 'h-8 w-12'
    const confirmCls = compact
        ? 'w-7 h-7 flex items-center justify-center rounded-md'
        : 'h-8 px-3 flex items-center justify-center'

    return (
        <div className="flex items-center gap-1.5">
            <input
                type="text"
                value={sets[0].team1}
                onChange={(e) => onUpdate(0, 'team1', e.target.value)}
                className={`${inputCls} text-center text-xs rounded-md bg-foreground/5 border border-foreground/15 text-foreground placeholder:text-foreground/30 outline-none focus:border-foreground/35 transition-colors`}
                placeholder="P1"
            />
            <span className="text-foreground/35 text-xs">:</span>
            <input
                type="text"
                value={sets[0].team2}
                onChange={(e) => onUpdate(0, 'team2', e.target.value)}
                className={`${inputCls} text-center text-xs rounded-md bg-foreground/5 border border-foreground/15 text-foreground placeholder:text-foreground/30 outline-none focus:border-foreground/35 transition-colors`}
                placeholder="P2"
            />
            <button
                className={`${confirmCls} rounded-md border border-cyan-400/30 text-cyan-400/70 hover:bg-cyan-400/10 hover:border-cyan-400/50 transition-colors disabled:opacity-40`}
                onClick={onConfirm}
                disabled={isPending}
            >
                <Check className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
