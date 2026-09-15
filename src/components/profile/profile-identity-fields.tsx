'use client'

import { LoginIdField } from '@/components/auth/login-id-field'
import { NicknameField } from '@/components/auth/nickname-field'
import { FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

// 변경 불가 필드 표시용 (입력 불가, 회색 톤) — profile-readonly-fields와 같은 클래스
const readonlyFieldCls = [
    'w-full rounded-lg px-3 py-3 text-body2 text-muted-foreground',
    'bg-muted/50 border border-input',
].join(' ')

type Props = {
    name: string
    nickname: string
    /** 0085 — null이면 아직 아이디가 없다 */
    loginId: string | null
    /** 비밀번호 identity가 있을 때만 1회 설정란을 연다 — 소셜 전용 계정은 아이디가 있어도 쓸 데가 없다 */
    canSetLoginId: boolean
    userId: string
}

function ReadonlyLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className={`${labelCls} flex items-center gap-1.5`}>
            {children}
            <span className="normal-case tracking-normal font-normal text-muted-foreground">(변경 불가)</span>
        </p>
    )
}

/**
 * 프로필 설정의 신원 블록 — 이름(불가) · 닉네임(가능) · 아이디(0085, **비어 있을 때 1회**).
 *
 * 아이디는 시작일과 같은 관용구다(Week 56 ⑤): 값이 없을 때만 입력란이 열리고 그 값만 폼에 실리며,
 * 서버(`updateProfileAction`)도 현재 값이 null일 때만 받는다. 있으면 읽기 전용으로 보인다 —
 * 폼으로 전송하지 않는다. 비밀번호 없는 소셜 계정에는 입력란도 표시도 없다(가질 이유가 없다).
 */
export function ProfileIdentityFields({ name, nickname, loginId, canSetLoginId, userId }: Props) {
    return (
        <>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <ReadonlyLabel>이름</ReadonlyLabel>
                    {/* 이름은 변경 불가 — 표시만, 폼 전송 안 함 */}
                    <div className={readonlyFieldCls}>{name}</div>
                </div>
                <NicknameField defaultValue={nickname} excludeUserId={userId} />
            </div>

            {loginId ? (
                <div>
                    <ReadonlyLabel>아이디</ReadonlyLabel>
                    <div className={readonlyFieldCls}>{loginId}</div>
                </div>
            ) : canSetLoginId ? (
                <LoginIdField required={false} />
            ) : null}
        </>
    )
}
