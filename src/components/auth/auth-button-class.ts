import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * 인증 화면(로그인·아이디 찾기·비밀번호 찾기)의 전폭 큰 버튼 — 다섯 자리가 같은 조합을 손으로 적고 있었다(Week 69).
 * `accent` = 옐로우 채움(주 행동), `outline` = 보조 행동. 랜딩의 히어로 버튼은 폭이 달라 여기 안 든다.
 */
export function authButtonClass(variant: 'accent' | 'outline'): string {
    return cn(buttonVariants({ variant, size: 'lg' }), 'w-full h-11 font-semibold')
}
