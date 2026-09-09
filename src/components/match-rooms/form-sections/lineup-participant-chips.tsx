'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import { derivePublicNtrp } from '@/lib/personal-matches/ntrp'
import { MATCH_FORM_LABEL, PILL_BASE } from '@/lib/dashboard/tokens'

type Props = {
    candidates: OpponentCandidate[]
    included: Set<string>
    onToggle: (id: string) => void
}

const CHIP_ON = 'border-primary/40 text-primary hover:bg-primary/10'
const CHIP_OFF = 'border-border text-muted-foreground line-through hover:bg-muted/50'

/**
 * 이번 대진에 넣을 사람 고르기 — 눌러서 빼고 다시 넣는다.
 * 누구를 뺄지가 실력 판단이라 이름 옆에 NTRP를 붙인다(라켓·주력손까지 넣으면 칩이 커져 되레 안 읽힌다).
 */
export function LineupParticipantChips({ candidates, included, onToggle }: Props) {
    return (
        <div>
            <span className={MATCH_FORM_LABEL}>참가자 · 눌러서 제외</span>
            <ul className="flex flex-wrap gap-1.5">
                {candidates.map((c) => {
                    const on = included.has(c.id)
                    const ntrp = derivePublicNtrp(c)
                    return (
                        <li key={c.id}>
                            <button
                                type="button"
                                aria-pressed={on}
                                onClick={() => onToggle(c.id)}
                                className={`${PILL_BASE} transition-colors ${on ? CHIP_ON : CHIP_OFF}`}
                            >
                                {c.name}
                                {ntrp != null && (
                                    <span className="ml-1 tabular-nums opacity-70">{ntrp.toFixed(1)}</span>
                                )}
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
