import type { MatchRoomDetail } from '@/types'
import { PageHeader } from '@/components/common/page-header'
import { ProfileLink } from '@/components/common/profile-link'
import { MatchMetaLine } from '@/components/personal-matches/match-meta-line'
import { buildRoomTitle } from '@/lib/match-rooms/title'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { HOST_LABEL } from '@/lib/match-rooms/member-labels'
import { roomStage } from '@/lib/match-rooms/room-stage'
import { RoomStageBadge } from '@/components/match-rooms/room-stage-badge'

type Props = { detail: MatchRoomDetail; actions?: React.ReactNode }

/** 코트명과 면 수를 한 덩어리로 — 면이 하나면 굳이 세지 않는다 */
function courtLabel(courtName: string | undefined, courtCount: number): string | undefined {
    const court = courtName?.trim() || undefined
    if (courtCount <= 1) return court
    return court ? `${court} ${courtCount}면` : `코트 ${courtCount}면`
}

/**
 * 상세 상단 — 자동 제목 + 단계 칩 + 방식/표면 eyebrow + 호스트 + 시각·코트명·메모(MatchMetaLine).
 * eyebrow는 방식 라벨(단식·남자 복식…)이다 — 출처(source_kind)의 '자유 기록'·'로테이션 복식'은 내부 어휘라
 * 단식 매칭을 만든 사람이 「자유 기록」을 읽게 됐다(E2E F-1).
 */
export function RoomDetailHeader({ detail, actions }: Props) {
    const { room, host } = detail
    // 비노출 방(0082)은 리스트에 없는 방임을 eyebrow에서 말한다 — 참가자가 "왜 목록에 없지"에서 멈추지 않게
    const eyebrow = [
        MATCH_TYPE_LABELS[room.matchType],
        room.surface ? SURFACE_LABELS[room.surface] : null,
        room.isListed ? null : '비공개',
    ].filter(Boolean).join(' · ')

    return (
        <div className="space-y-3">
            <PageHeader
                title={buildRoomTitle(room)}
                eyebrow={eyebrow}
                actions={actions}
                badge={<RoomStageBadge stage={roomStage(detail)} />}
            />
            <div className={`${CARD_BASE} px-4 py-3 space-y-1`}>
                <p className="text-body2 text-foreground">
                    {HOST_LABEL}{' '}
                    <ProfileLink userId={host.id} isGuest={host.deleted} className="font-medium hover:underline">
                        {host.name}
                    </ProfileLink>
                    {host.deleted && <span className="ml-1 text-caption text-muted-foreground">(탈퇴)</span>}
                    {host.nickname && <span className="ml-1 text-caption text-muted-foreground">{host.nickname}</span>}
                </p>
                <MatchMetaLine
                    playedTime={room.playedTime}
                    durationMinutes={room.durationMinutes}
                    courtName={courtLabel(room.courtName, room.courtCount)}
                    notes={room.notes}
                    className="space-y-0.5"
                />
            </div>
        </div>
    )
}
