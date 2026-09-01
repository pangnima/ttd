import { UserCheck } from 'lucide-react'

/**
 * 상호 확인 요청 플로우 안내 배너 — 단식에서 플랫폼 회원 상대를 선택하면 노출된다.
 */
export function ConfirmFlowNotice({ opponentName }: { opponentName: string }) {
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
            <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground break-keep">
                <span className="text-foreground font-medium">{opponentName}</span>님은 플랫폼 회원입니다.
                저장하면 확인 요청이 전송되고, 상대가 수락하면 양쪽 전적에 함께 기록됩니다.
                상대 NTRP는 상대의 레이팅에서 자동 반영됩니다.
            </p>
        </div>
    )
}
