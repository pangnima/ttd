import type { RoomGameContext } from '@/lib/match-rooms/room-context'
import { buildRoomTitle } from '@/lib/match-rooms/title'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import { FormSectionCard } from '@/components/common/form-section-card'
import { MatchMetaLine } from '@/components/personal-matches/match-meta-line'

type Props = { ctx: RoomGameContext; step?: string }

/** 방 게임 추가 폼의 우측 열 — 일시·타입·표면·코트명·메모는 방 값으로 고정되므로 입력란 대신 요약만 보여 준다(0048) */
export function RoomMetaSummaryCard({ ctx, step }: Props) {
    return (
        <FormSectionCard title="경기 정보" step={step}>
            <p className="text-body font-medium text-foreground">{buildRoomTitle(ctx)}</p>
            {ctx.surface && <p className="text-caption text-muted-foreground">{SURFACE_LABELS[ctx.surface]}</p>}
            <MatchMetaLine playedTime={ctx.playedTime} courtName={ctx.courtName} notes={ctx.notes} className="mt-1 space-y-0.5" />
            <p className="mt-3 text-caption text-muted-foreground break-keep">
                매칭 리스트 방의 값으로 고정됩니다. 바꾸려면 방의 원래 기록을 수정하세요.
            </p>
        </FormSectionCard>
    )
}
