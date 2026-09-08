import { UserCheck, Users, Info } from 'lucide-react'
import type { SaveOutcome } from '@/lib/personal-matches/confirm-flow'

type Props = {
    outcome: SaveOutcome
    /** 로테이션 풀의 회원 수 — 참여 요청을 받을 사람 수 */
    memberCount: number
    /** 매칭 리스트에 노출하는가 — 로테이션 초대가 방 초대로 대체된다 */
    listed: boolean
}

/**
 * "지금 저장하면 무슨 일이 일어나는가" 안내 (0057).
 *
 * `ConfirmFlowNotice`는 상대 대표가 있을 때만 뜨므로, 대표가 없는 갈래
 * (로테이션 · 상대팀 전원 비회원 · 모집 중)에는 **부정 신호가 하나도 없었다**.
 * 특히 로테이션은 복식 신규 등록의 기본 모드라, 회원을 여럿 넣고도
 * 아무에게도 요청이 가지 않는 것을 알 방법이 없었다.
 */
export function SaveOutcomeNotice({ outcome, memberCount, listed }: Props) {
    if (outcome === 'rotationPlan') {
        if (memberCount === 0) return null
        return (
            <Notice icon={<Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />}>
                {listed ? (
                    <>
                        저장하면 참가자로 넣은 <b className="text-foreground font-medium">회원 {memberCount}명</b>에게
                        매칭 리스트 방 초대가 전송됩니다. 수락한 사람은 이 경기를 자기 화면에서도 봅니다.
                    </>
                ) : (
                    <>
                        저장하면 참가자로 넣은 <b className="text-foreground font-medium">회원 {memberCount}명</b>에게
                        참여 요청이 전송됩니다. 수락하면 이 일정이 그분들 화면에도 표시되고, 경기 후에는 누구든 결과를
                        입력할 수 있습니다. 게임을 입력할 때 다시 수락받지는 않습니다.
                        {' '}수락을 기다리지 않고 결과를 먼저 넣어 둘 수도 있습니다 — 그 스코어는 수락 시점에 이어집니다.
                    </>
                )}
            </Notice>
        )
    }

    if (outcome === 'recruiting') {
        return (
            <Notice icon={<Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}>
                참가자를 비운 채 <b className="text-foreground font-medium">모집 중</b>으로 저장됩니다.
                나중에 회원으로 채우면 그때 확인 요청이 전송됩니다.
            </Notice>
        )
    }

    if (outcome === 'freeRecord') {
        return (
            <Notice icon={<UserCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}>
                상대팀에 플랫폼 회원이 없어 <b className="text-foreground font-medium">내 기록에만</b> 남습니다.
                확인 요청은 전송되지 않습니다.
            </Notice>
        )
    }

    return null
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            {icon}
            <p className="text-caption text-muted-foreground break-keep">{children}</p>
        </div>
    )
}
