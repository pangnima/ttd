import type { PersonalMatchConfirmation } from '@/types'
import { disputeReasonLine } from '@/lib/personal-matches/confirmation'

type Props = {
    confirmation?: PersonalMatchConfirmation
    /** 이의 제기자 표시 이름(disputerNameOf) — 좌석 만드는 방식이 화면마다 달라 호출부가 계산해 넘긴다 */
    disputerName?: string
    className?: string
}

/**
 * 이의 사유를 카드 본문에 **텍스트로** 그린다 — '내 이의 사유: 3게임 스코어가 다릅니다'.
 *
 * 종전에는 사유가 배지의 `title`(툴팁)에만 있어 모바일에서 볼 수 없었고, 버튼이 없는 버킷
 * (재입력 결과 확인 대기)은 팝업으로도 갈 수 없어 끝내 읽을 방법이 없었다. 배지는 그대로 두고
 * 이 줄을 아래에 얹는다 — 배지에 사유를 넣으면 한 줄에 여러 배지가 서는 자리가 무너진다.
 *
 * 이의 이력이 없으면 스스로 사라지므로 호출부에 조건문이 없다(ReentryContextBadge와 같은 규약).
 */
export function DisputeReasonLine({ confirmation, disputerName, className }: Props) {
    const line = disputeReasonLine(confirmation, disputerName)
    if (!line) return null
    return (
        <span className={className ? `block text-caption text-muted-foreground ${className}` : 'block text-caption text-muted-foreground'}>
            {line}
        </span>
    )
}
