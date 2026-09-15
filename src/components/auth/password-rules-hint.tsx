'use client'

import { Check, Circle } from 'lucide-react'

import { PASSWORD_RULES, unmetPasswordRules } from '@/lib/auth/password-policy'
import { cn } from '@/lib/utils'

type Props = {
    /** 지금 입력 중인 비밀번호 */
    value: string
    className?: string
}

/**
 * 비밀번호 규칙 체크리스트 — 가입·재설정·변경 세 폼이 함께 쓴다.
 *
 * `PASSWORD_RULES`를 그대로 그리므로 규칙이 바뀌면 문구도 따라온다(단일 출처).
 * 아직 아무것도 안 쳤을 때는 전부 미충족이지만 destructive로 칠하지 않는다 — 시작부터 빨간 화면은
 * 오류가 아니라 안내여야 한다. 입력이 시작된 뒤에만 미충족을 경고 톤으로 바꾼다.
 */
export function PasswordRulesHint({ value, className }: Props) {
    const unmet = new Set(unmetPasswordRules(value))
    const started = value.length > 0

    return (
        <ul className={cn('flex flex-wrap gap-x-3 gap-y-1 text-caption', className)} aria-label="비밀번호 규칙">
            {PASSWORD_RULES.map((rule) => {
                const ok = !unmet.has(rule.key)
                return (
                    <li
                        key={rule.key}
                        className={cn(
                            'inline-flex items-center gap-1',
                            ok ? 'text-win' : started ? 'text-destructive' : 'text-muted-foreground'
                        )}
                    >
                        {ok ? <Check className="size-3" aria-hidden /> : <Circle className="size-3" aria-hidden />}
                        {rule.label}
                    </li>
                )
            })}
        </ul>
    )
}
