import Link from 'next/link'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { PASSWORD_POLICY_MESSAGE } from '@/lib/auth/password-policy'

/**
 * 비밀번호 규칙이 강화된 뒤에도 옛 비밀번호로 로그인한 회원에게 — 로그인은 막지 않는다(강제 변경 없음).
 * 신호는 Supabase 대시보드의 최소 길이 설정에서 오므로 그 설정을 켜기 전에는 이 배너가 뜨지 않는다.
 */
export function WeakPasswordNotice() {
    return (
        <div className={`${CARD_BASE} px-4 py-3 border-spot/40`}>
            <p className={`${TYPO.body2} font-medium break-keep`}>비밀번호 규칙이 강화되었습니다.</p>
            <p className={`${TYPO.caption} mt-1 break-keep`}>
                {PASSWORD_POLICY_MESSAGE} 지금 비밀번호는 그대로 쓸 수 있지만,{' '}
                <Link href="/profile/settings" className="underline underline-offset-2">내 정보 수정</Link>에서
                바꿔 두는 것이 안전합니다.
            </p>
        </div>
    )
}
