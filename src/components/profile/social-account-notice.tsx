import { CARD_BASE, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

type Props = {
    /** '구글' 같은 문장용 이름 */
    providerLabel: string
}

/**
 * 비밀번호 변경 폼 자리의 안내 — 소셜로만 로그인하는 계정에는 바꿀 비밀번호가 없다.
 *
 * 폼을 그냥 숨기지 않는 이유는 0077에서 정한 어법대로다 — **버튼을 감추는 대신 이유를 말한다.**
 * 게다가 종전에는 그 폼이 함정이었다: 비밀번호 identity가 없으면 무엇을 넣어도
 * `signInWithPassword`가 실패해 「현재 비밀번호가 올바르지 않습니다」만 돌아왔다.
 * 지금은 소셜 계정에 비밀번호를 **추가**하는 경로가 없어 이 자리는 안내로 끝난다(백로그).
 */
export function SocialAccountNotice({ providerLabel }: Props) {
    return (
        <div className={`${CARD_BASE} p-5 sm:p-6 space-y-1.5`}>
            <p className={labelCls}>비밀번호</p>
            <p className="text-body2 text-muted-foreground break-keep">
                {providerLabel} 계정으로 로그인하고 있어 이 계정에는 비밀번호가 없습니다.
            </p>
        </div>
    )
}
