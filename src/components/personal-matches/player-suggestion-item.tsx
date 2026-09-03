import type { PlayerSuggestion } from '@/lib/personal-matches/player-suggestions'

const HAND_LABEL: Record<'right' | 'left', string> = { right: '오른손', left: '왼손' }

/** 자동완성 항목 1줄 — 이름 · NTRP · 손잡이 · (게스트) · 우측 보조 정보(클럽명/닉네임) */
export function PlayerSuggestionItem({ item }: { item: PlayerSuggestion }) {
    return (
        <>
            <span className="truncate">{item.label}</span>
            {item.ntrp != null && (
                <span className="text-muted-foreground tabular-nums">({Number(item.ntrp.toFixed(2))})</span>
            )}
            {item.hand && <span className="text-muted-foreground text-caption">{HAND_LABEL[item.hand]}</span>}
            {item.source !== 'past' && item.isGuest && (
                <span className="text-muted-foreground text-caption">게스트</span>
            )}
            {item.meta && <span className="ml-auto pl-2 text-muted-foreground text-caption truncate">{item.meta}</span>}
        </>
    )
}
