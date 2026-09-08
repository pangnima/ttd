import type { PendingMatchEntry } from '@/lib/queries/match-queue'
import type { RotationSession } from '@/types'
import { QueueSection } from '@/components/match-requests/queue-section'
import { PendingMatchSection } from '@/components/match-requests/pending-match-section'
import { RotationSessionInviteCard } from '@/components/match-requests/rotation-session-invite-card'
import { HubSectionGroup } from '@/components/match-requests/hub-section-group'

type Props = {
    viewerId: string
    /** 내 확인(제안 포함)은 끝났고 남은 좌석을 기다리는 행 */
    myConfirmed: PendingMatchEntry[]
    /** 협상 자격이 없는 관점 행(폴백) — 열람만 */
    repWaiting: PendingMatchEntry[]
    /** 참여는 수락했지만 아직 아무도 결과를 넣지 않은 로테이션 일정 (0057) */
    awaitingOwner: RotationSession[]
    /** 이의가 제기돼 제안자의 재입력을 기다리는 행 — 이의자·나머지 좌석 (0061) */
    awaitingReentry: PendingMatchEntry[]
    /** 이의 후 다시 입력됐고 남은 좌석의 확인을 기다리는 행 (0062) */
    awaitingReentryConfirm: PendingMatchEntry[]
    /** 그룹 헤딩의 건수 — 패널이 waitingGroupTotals로 만든 값(다섯 배열 길이의 합) */
    count: number
}

/**
 * 「상대 승인 대기 › 경기 결과」 — 확인·입력을 기다리는 것들.
 * 이의 대기 두 섹션은 Week 38에 「이의 처리」 탭에서 왔다 — 탭은 차례 축을 따르고, 누구의 이의였는지는
 * 카드의 ReentryContextBadge·DisputeReasonLine이 말하므로 이의자 여부로 섹션을 더 나누지 않는다.
 */
export function WaitingResultGroup({
    viewerId, myConfirmed, repWaiting, awaitingOwner, awaitingReentry, awaitingReentryConfirm, count,
}: Props) {
    return (
        <HubSectionGroup title="경기 결과" count={count}>
            <PendingMatchSection
                title="참가자 확인 대기"
                hint="내 확인은 끝났습니다 — 남은 회원 참가자가 모두 확인하면 확정됩니다"
                entries={myConfirmed}
            />

            <QueueSection
                title="주최자 결과 입력 대기"
                hint="참여를 수락했습니다 — 경기 후 결과가 입력되면 확정 절차가 시작됩니다"
                count={awaitingOwner.length}
            >
                {awaitingOwner.map((s) => (
                    <RotationSessionInviteCard key={s.id} session={s} viewerId={viewerId} readOnly />
                ))}
            </QueueSection>

            <PendingMatchSection
                title="재입력 대기"
                hint="이의가 제기됐습니다 — 제안자의 재입력을 기다립니다. 결과를 아는 참가자는 직접 다시 입력할 수도 있습니다"
                entries={awaitingReentry}
            />

            <PendingMatchSection
                title="재입력 결과 확인 대기"
                hint="다시 입력한 결과를 남은 회원 참가자가 확인하는 중입니다 — 전원이 확인하면 확정됩니다"
                entries={awaitingReentryConfirm}
            />

            <PendingMatchSection
                title="확인 대기 (열람 전용)"
                hint="회원 참가자가 결과를 확인하면 확정됩니다"
                entries={repWaiting}
            />
        </HubSectionGroup>
    )
}
