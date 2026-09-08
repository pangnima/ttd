'use client'

import type { PersonalMatchConfirmation } from '@/types'
import type { AdLabels } from '@/lib/personal-matches/labels'
import { Button } from '@/components/ui/button'
import { disputeBadge, isReentryTurn } from '@/lib/personal-matches/confirmation'
import { NegotiationDialog } from '@/components/personal-matches/negotiation-dialog'
import { useResultDialog } from '@/components/personal-matches/use-result-dialog'

type Props = {
    requestId: string
    confirmation: PersonalMatchConfirmation
    opponentName: string
    teams: string
    adLabels?: AdLabels
    /** 이의 제기자 표시 이름(disputerNameOf) — '나' / 이름 / 미상(undefined) */
    disputerName?: string
    /** 호출부의 대기 배지 스타일(카드·룸 행이 서로 다르다) */
    badgeClassName: string
}

/**
 * 이의(disputed) 상태의 카드 액션 — 개인 경기 카드(MutualResultActions)와 룸 게임 행(RoomGameActions)이 공유한다.
 * 배지는 누가 이의했는지를, 버튼은 [다시 입력]을 — 차례(제안자, isReentryTurn)만 강조하고 나머지 좌석은 outline이다.
 * 재제안 RPC는 좌석 누구나 통과시키므로 버튼을 숨기지 않는다(급하면 이의자·파트너가 직접 넣을 수 있다).
 */
export function DisputedResultActions({
    requestId, confirmation: c, opponentName, teams, adLabels, disputerName, badgeClassName,
}: Props) {
    const d = useResultDialog()
    const badge = disputeBadge(c, disputerName)

    return (
        <span className="flex items-center gap-2">
            <span className={badgeClassName} title={badge.title}>{badge.label}</span>
            <Button
                size="sm"
                variant={isReentryTurn(c) ? 'default' : 'outline'}
                className="h-7 text-caption"
                onClick={d.openDialog}
            >
                다시 입력
            </Button>
            <NegotiationDialog
                requestId={requestId}
                confirmation={c}
                opponentName={opponentName}
                teams={teams}
                adLabels={adLabels}
                disputerName={disputerName}
                dialog={d}
            />
        </span>
    )
}
