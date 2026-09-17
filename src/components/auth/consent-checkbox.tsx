'use client'

import Link from 'next/link'
import { TEXT_LINK } from '@/lib/dashboard/tokens'

type Props = {
    checked: boolean
    onChange: (checked: boolean) => void
}

/**
 * 가입·프로필 완성 폼의 개인정보 동의 체크박스 — 두 폼이 같은 것을 그린다(Week 52·56).
 * `name`·`value`는 서버 검사(`agree_privacy !== 'true'`)와 짝이고, `required`로 브라우저가 먼저 막는다.
 *
 * 약관·처리방침 링크는 **label 밖**에 둔다 — label 안의 링크를 누르면 이동과 동시에 체크가 토글된다.
 * 새 탭으로 열어 입력 중인 폼을 잃지 않는다(구글 OAuth 동의 화면 게시에 두 링크가 필수, Week 70).
 */
export function ConsentCheckbox({ checked, onChange }: Props) {
    return (
        <div className="flex items-start gap-2 text-caption text-muted-foreground">
            <input
                id="agree_privacy"
                type="checkbox"
                name="agree_privacy"
                value="true"
                required
                className="mt-0.5"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="break-keep">
                <Link href="/terms" target="_blank" rel="noopener" className={TEXT_LINK}>이용약관</Link>
                {'과 '}
                <Link href="/privacy" target="_blank" rel="noopener" className={TEXT_LINK}>개인정보처리방침</Link>
                {'을 확인했으며, '}
                <label htmlFor="agree_privacy">
                    개인정보 수집·이용에 동의합니다. 이름·닉네임·휴대폰 번호를 매칭 운영과 경기 기록에 사용합니다. *
                </label>
            </span>
        </div>
    )
}
