import { formatHourLabel } from '@/lib/format'

type Props = {
    playedTime?: string   // "18:00"
    courtName?: string
    notes?: string
    className?: string
}

/**
 * 개인 경기·로테이션 세션 카드 공용 부가 정보 — 시각·코트명 한 줄 + 메모(최대 2줄).
 * 값이 하나도 없으면 아무것도 렌더하지 않는다.
 */
export function MatchMetaLine({ playedTime, courtName, notes, className }: Props) {
    const meta = [playedTime && formatHourLabel(playedTime), courtName].filter(Boolean)
    if (meta.length === 0 && !notes) return null
    return (
        <div className={className}>
            {meta.length > 0 && (
                <p className="text-caption text-muted-foreground truncate">{meta.join(' · ')}</p>
            )}
            {notes && (
                <p className="text-caption text-muted-foreground line-clamp-2 break-keep whitespace-pre-line">{notes}</p>
            )}
        </div>
    )
}
