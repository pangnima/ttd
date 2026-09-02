import { UserCheck } from 'lucide-react'

type Props = {
    opponentName: string  // 대표 확인자
    isDoubles?: boolean
}

/**
 * 상호 확인 요청 플로우 안내 배너 — 상대(팀)에 플랫폼 회원이 있으면 노출된다.
 * 복식은 상대팀 회원 1명이 대표로 확인하며, 파트너·상대2가 회원이어도 그들의 기록에는 추가되지 않는다.
 */
export function ConfirmFlowNotice({ opponentName, isDoubles = false }: Props) {
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
            <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground break-keep">
                <span className="text-foreground font-medium">{opponentName}</span>님은 플랫폼 회원입니다.
                {isDoubles
                    ? ' 저장하면 상대팀 대표로 확인 요청이 전송되고, 수락하면 나와 대표의 기록에 함께 추가됩니다. 파트너·상대2가 회원이어도 그들의 기록에는 추가되지 않습니다(각자 등록 필요).'
                    : ' 저장하면 확인 요청이 전송되고, 상대가 수락하면 양쪽 기록에 함께 추가됩니다.'}
                {' '}결과는 세트 스코어 등록 시 확정되며, 회원의 NTRP는 각자의 레이팅에서 자동 반영됩니다.
            </p>
        </div>
    )
}
