import { formatHourLabel } from '@/lib/format'
import { formatRoomWhen } from '@/lib/match-rooms/schedule'

type Props = {
    playedTime?: string   // "18:00"
    /** 매칭 룸에서만 넘어온다 — 있으면 시각이 '10:00~12:00' 구간이 된다 (0073) */
    durationMinutes?: number
    courtName?: string
    notes?: string
    className?: string
    /**
     * 시각의 색 대비만 올린다(사이즈는 caption 그대로).
     * 같은 날 여러 경기가 나열되는 목록에서 시각이 유일한 구분 정보라 —
     * 로테이션 그룹 헤더는 일시를 앞세우는데 레코드 카드만 메모와 같은 위계면 경계가 읽히지 않는다.
     */
    emphasizeTime?: boolean
}

/**
 * 개인 경기·로테이션 세션 카드 공용 부가 정보 — 시각·코트명 한 줄 + 메모(최대 2줄).
 * 값이 하나도 없으면 아무것도 렌더하지 않는다.
 */
export function MatchMetaLine({ playedTime, durationMinutes, courtName, notes, className, emphasizeTime = false }: Props) {
    // 개인 경기는 소요 시간이 없어 기존 '18시' 표기 그대로다
    const time = durationMinutes ? formatRoomWhen(playedTime, durationMinutes) : (playedTime ? formatHourLabel(playedTime) : '')
    if (!time && !courtName && !notes) return null
    return (
        <div className={className}>
            {(time || courtName) && (
                <p className="text-caption text-muted-foreground truncate">
                    {time && (
                        <span className={emphasizeTime ? 'text-foreground font-medium' : undefined}>{time}</span>
                    )}
                    {time && courtName && ' · '}
                    {courtName}
                </p>
            )}
            {notes && (
                <p className="text-caption text-muted-foreground line-clamp-2 break-keep whitespace-pre-line">{notes}</p>
            )}
        </div>
    )
}
