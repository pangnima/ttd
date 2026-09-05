import { UserCheck } from 'lucide-react'

type Props = {
    opponentName: string  // 대표 확인자
    isDoubles?: boolean
    // 방 게임(0049) — 수락 단계 없이 참가자 전원 기록에 바로 남는다
    isRoomGame?: boolean
    /** 이 게임의 회원 참가자 수(나 포함) — 비회원 슬롯은 관점 행이 생기지 않으므로 세지 않는다 */
    memberCount?: number
}

const COUNT_WORDS = ['', '한', '두', '세', '네'] as const

/** '두 명'·'세 명' — 4를 넘을 일은 없지만 넘으면 숫자로 떨어뜨린다 */
function countLabel(n: number): string {
    return `${COUNT_WORDS[n] ?? n} 명`
}

/**
 * 상호 확인 플로우 안내 배너 — 상대(팀)에 플랫폼 회원이 있으면 노출된다.
 * 방 밖 요청은 상대가 수락해야 기록이 생기고 복식은 대표 1명만 기록을 갖지만,
 * 방 게임은 입장이 곧 참여 동의라 저장 즉시 회원 참가자 전원의 기록에 미확정으로 추가된다.
 * 그 '전원'은 복식이라고 항상 4명이 아니다 — 비회원 슬롯은 빠지므로 memberCount로 받는다.
 */
export function ConfirmFlowNotice({
    opponentName, isDoubles = false, isRoomGame = false, memberCount,
}: Props) {
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
            <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-caption text-muted-foreground break-keep">
                <span className="text-foreground font-medium">{opponentName}</span>
                {isRoomGame ? (
                    <>
                        님과의 게임으로 등록됩니다. 저장하면 방에 참가한 회원{' '}
                        {countLabel(memberCount ?? (isDoubles ? 4 : 2))} 모두의 기록에 미확정으로 추가되고,
                        결과는 한쪽이 입력한 뒤 상대가 확인하면 확정됩니다.
                    </>
                ) : (
                    <>
                        님은 플랫폼 회원입니다.
                        {isDoubles
                            ? ' 저장하면 상대팀 대표로 확인 요청이 전송되고, 수락하면 나와 대표의 기록에 함께 추가됩니다. 파트너·상대2가 회원이어도 그들의 기록에는 추가되지 않습니다(각자 등록 필요).'
                            : ' 저장하면 확인 요청이 전송되고, 상대가 수락하면 양쪽 기록에 함께 추가됩니다.'}
                        {' '}결과는 게임 스코어 등록 시 확정됩니다.
                    </>
                )}
                {' '}회원의 NTRP는 각자의 레이팅에서 자동 반영됩니다.
            </p>
        </div>
    )
}
