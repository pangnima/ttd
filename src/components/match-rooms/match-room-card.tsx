import Link from 'next/link'
import type { MatchRoomSummary } from '@/types'
import { MatchDateColumn } from '@/components/personal-matches/match-date-column'
import { formatHeadcount, viewerStatusLabel } from '@/lib/match-rooms/headcount'
import { formatHourLabel } from '@/lib/format'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { CARD_HOVER, PILL_BASE } from '@/lib/dashboard/tokens'

type Props = { room: MatchRoomSummary }

/** 경기 리스트 1행 — 날짜 컬럼 + 시각·코트명 + 방장 + 인원 + 내 상태 칩. 클릭하면 상세(미입장이면 비밀번호 게이트) */
export function MatchRoomCard({ room }: Props) {
    const when = room.playedTime ? formatHourLabel(room.playedTime) : null
    const title = [when, room.courtName].filter(Boolean).join(' · ') || `${MATCH_TYPE_LABELS[room.matchType]} 경기`
    const status = viewerStatusLabel(room.viewer)
    const isFull = room.sourceKind !== 'rotation' && room.joinedCount >= room.capacity

    return (
        <Link href={`/match-rooms/${room.id}`} className={`flex items-stretch gap-3 px-3 py-3 ${CARD_HOVER}`}>
            <MatchDateColumn playedAt={room.playedAt} matchType={room.matchType} surface={room.surface} />
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-body2 font-medium text-foreground truncate">{title}</p>
                    <span className="text-caption tabular-nums text-muted-foreground shrink-0">
                        인원 {formatHeadcount(room.joinedCount, room.capacity)}
                    </span>
                </div>
                <p className="text-caption text-muted-foreground truncate">
                    방장 {room.host.name}
                    {room.host.deleted && ' (탈퇴)'}
                    {room.host.nickname && ` · ${room.host.nickname}`}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {status ? (
                        <span className={`${PILL_BASE} border-primary/40 text-primary`}>{status}</span>
                    ) : (
                        <span className={`${PILL_BASE} border-border text-muted-foreground`}>비밀번호 입장</span>
                    )}
                    {room.hasResult && <span className={`${PILL_BASE} border-border text-muted-foreground`}>결과 등록</span>}
                    {isFull && <span className={`${PILL_BASE} border-border text-muted-foreground`}>정원 마감</span>}
                </div>
            </div>
        </Link>
    )
}
