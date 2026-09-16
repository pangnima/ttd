import { HAND_LABEL } from '@/lib/profile/signup-fields'
import { NEUTRAL_PILL } from '@/lib/dashboard/tokens'

type Props = {
    name: string
    hand: 'right' | 'left' | null
    ntrp: number | null
}

/** 상단 상대 식별 헤더 — 이름 크게 + 주력손/NTRP pill */
export function H2HOpponentHeader({ name, hand, ntrp }: Props) {
    return (
        <div className="flex items-center flex-wrap gap-2 border-b border-border pb-3">
            <span className="text-body font-semibold text-foreground truncate">{name}</span>
            {hand && <span className={NEUTRAL_PILL}>{HAND_LABEL[hand]}</span>}
            {ntrp != null && <span className={NEUTRAL_PILL}>NTRP {ntrp.toFixed(1)}</span>}
        </div>
    )
}
