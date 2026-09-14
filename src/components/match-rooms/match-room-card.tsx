import Link from 'next/link'
import type { MatchRoomSummary } from '@/types'
import { MatchDateColumn } from '@/components/personal-matches/match-date-column'
import { formatHeadcount, viewerStatusLabel } from '@/lib/match-rooms/headcount'
import { ROOM_TURN_PILL, isMyRoomTurn, type RoomTurnSummary } from '@/lib/match-rooms/room-turn'
import { formatRoomWhen } from '@/lib/match-rooms/schedule'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { ATTENTION_PILL, CARD_HOVER, PILL_BASE } from '@/lib/dashboard/tokens'

type Props = {
    room: MatchRoomSummary
    /** 이 방에서 내가 지금 할 일 — 없으면 필을 달지 않는다 */
    turn?: RoomTurnSummary
}

/**
 * 매칭 리스트 1행 — 날짜 컬럼 + 시각·코트명 + 방장 + 참가 인원 + 내 상태 칩.
 * 내 차례가 있으면 주의 필을 함께 단다(Week 39) — 목록이 곧 작업 큐다.
 */
export function MatchRoomCard({ room, turn }: Props) {
    const when = formatRoomWhen(room.playedTime, room.durationMinutes) || null
    const title = [when, room.courtName].filter(Boolean).join(' · ') || `${MATCH_TYPE_LABELS[room.matchType]} 경기`
    const status = viewerStatusLabel(room.viewer)
    const myTurn = turn && isMyRoomTurn(turn.turn) ? turn : undefined

    return (
        <Link href={`/match-rooms/${room.id}`} className={`flex items-stretch gap-3 px-3 py-3 ${CARD_HOVER}`}>
            <MatchDateColumn playedAt={room.playedAt} matchType={room.matchType} surface={room.surface} />
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-body2 font-medium text-foreground truncate">{title}</p>
                    <span className="text-caption tabular-nums text-muted-foreground shrink-0">
                        {formatHeadcount(room.joinedCount)}
                    </span>
                </div>
                <p className="text-caption text-muted-foreground truncate">
                    방장 {room.host.name}
                    {room.host.deleted && ' (탈퇴)'}
                    {room.host.nickname && ` · ${room.host.nickname}`}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {myTurn && (
                        <span className={ATTENTION_PILL}>
                            {ROOM_TURN_PILL[myTurn.turn]}
                            {myTurn.count > 1 && <span className="ml-1 tabular-nums">{myTurn.count}</span>}
                        </span>
                    )}
                    {status ? (
                        <span className={`${PILL_BASE} border-primary/40 text-primary`}>{status}</span>
                    ) : room.isListed ? (
                        <span className={`${PILL_BASE} border-border text-muted-foreground`}>비밀번호 입장</span>
                    ) : null}
                    {/* 비노출 방(0082)은 참여 중인 매칭에서만 그려진다 — 리스트에 없는 방임을 칩으로 말한다 */}
                    {!room.isListed && <span className={`${PILL_BASE} border-border text-muted-foreground`}>비공개</span>}
                    {room.isSettled && <span className={`${PILL_BASE} border-border text-muted-foreground`}>결과 확정</span>}
                </div>
            </div>
        </Link>
    )
}
