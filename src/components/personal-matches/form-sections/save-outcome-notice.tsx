import { UserCheck, Users, Info } from 'lucide-react'
import { Notice } from '@/components/common/notice'
import type { SaveOutcome } from '@/lib/personal-matches/confirm-flow'

type Props = {
    outcome: SaveOutcome
    /** 비노출 방에 초대될 회원 수 · 등록될 비회원 수 (0082) */
    memberCount: number
    guestCount: number
}

/**
 * "지금 저장하면 무슨 일이 일어나는가" 안내 (0057 → 0082).
 *
 * `ConfirmFlowNotice`는 상대 대표가 있을 때만 뜨므로, 대표가 없는 갈래
 * (로테이션 · 상대팀 전원 비회원 · 모집 중)에는 **부정 신호가 하나도 없었다**.
 * 0082부터 회원이 끼면 저장이 곧 비노출 방 생성이라 그 갈래가 가장 먼저 온다 —
 * 방 밖 로테이션은 이제 전원 비회원일 때만 남으므로 그쪽은 안내가 필요 없다(요청이 갈 사람이 없다).
 */
export function SaveOutcomeNotice({ outcome, memberCount, guestCount }: Props) {
    if (outcome === 'unlistedRoom') {
        return (
            <Notice variant="inline" tone="muted" icon={<Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />}>
                <span className="text-foreground font-medium">회원과 함께 친 경기는 매칭으로 기록합니다.</span>{' '}
                저장하면 매칭 리스트에 뜨지 않는 <b className="text-foreground font-medium">비공개 매칭</b>이 만들어지고
                회원 {memberCount}명에게 초대가 갑니다{guestCount > 0 && `. 비회원 ${guestCount}명은 명단에 바로 등록됩니다`}.
                상대가 수락하면 매칭 룸에서 게임을 만들고 결과를 확인합니다.
            </Notice>
        )
    }

    if (outcome === 'recruiting') {
        return (
            <Notice variant="inline" tone="muted" icon={<Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}>
                참가자를 비운 채 <b className="text-foreground font-medium">모집 중</b>으로 저장됩니다.
                나중에 회원으로 채우면 그때 확인 요청이 전송됩니다.
            </Notice>
        )
    }

    if (outcome === 'freeRecord') {
        return (
            <Notice variant="inline" tone="muted" icon={<UserCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}>
                상대팀에 플랫폼 회원이 없어 <b className="text-foreground font-medium">내 기록에만</b> 남습니다.
                확인 요청은 전송되지 않습니다.
            </Notice>
        )
    }

    return null
}
