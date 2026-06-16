'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AvatarUploadField } from '@/components/auth/avatar-upload-field'
import { signupAction } from '@/lib/actions/auth'
import { formatPhoneNumber } from '@/lib/format/phone'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

export function SignupForm() {
    const [state, formAction, isPending] = useActionState(signupAction, null)
    const [gender, setGender] = useState('male')
    const [hand, setHand] = useState('right')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')

    const pwMismatch = passwordConfirm.length > 0 && password !== passwordConfirm

    return (
        <form action={formAction} className="space-y-5">
            {/* ── 프로필 사진 ── */}
            <AvatarUploadField />

            <div className="h-px bg-border" />

            {/* ── 계정 (이메일 = 로그인 아이디) ── */}
            <div>
                <label htmlFor="email" className={labelCls}>이메일 *</label>
                <input id="email" name="email" type="email" placeholder="example@email.com" required autoComplete="email" className={inputCls} />
                <p className="mt-1 text-[11px] text-muted-foreground">로그인 시 사용할 아이디입니다.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="password" className={labelCls}>비밀번호 *</label>
                    <input
                        id="password" name="password" type="password"
                        placeholder="6자 이상" required minLength={6} autoComplete="new-password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div>
                    <label htmlFor="password_confirm" className={labelCls}>비밀번호 확인 *</label>
                    <input
                        id="password_confirm" name="password_confirm" type="password"
                        placeholder="다시 입력" required autoComplete="new-password"
                        value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                        aria-invalid={pwMismatch}
                        className={inputCls}
                    />
                </div>
            </div>
            {pwMismatch && (
                <p className="-mt-3 text-[11px] text-destructive">비밀번호가 일치하지 않습니다.</p>
            )}

            <div className="h-px bg-border" />

            {/* ── 프로필 ── */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="name" className={labelCls}>이름 *</label>
                    <input id="name" name="name" placeholder="실명" required className={inputCls} />
                </div>
                <div>
                    <label htmlFor="nickname" className={labelCls}>닉네임 *</label>
                    <input id="nickname" name="nickname" placeholder="닉네임" required className={inputCls} />
                </div>
            </div>

            <div>
                <label htmlFor="phone" className={labelCls}>연락처</label>
                <input
                    id="phone" name="phone" type="tel" inputMode="numeric"
                    placeholder="010-0000-0000"
                    value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                    className={inputCls}
                />
            </div>

            <div className="h-px bg-border" />

            {/* ── 테니스 정보 ── */}
            <input type="hidden" name="gender" value={gender} />
            <input type="hidden" name="dominant_hand" value={hand} />
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className={labelCls}>성별</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {[{ value: 'male', label: '남성' }, { value: 'female', label: '여성' }].map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setGender(value)}
                                className={`py-2 text-xs rounded-md border transition-all ${
                                    gender === value
                                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                                        : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className={labelCls}>주력손</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {[{ value: 'right', label: '오른손' }, { value: 'left', label: '왼손' }].map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setHand(value)}
                                className={`py-2 text-xs rounded-md border transition-all ${
                                    hand === value
                                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                                        : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="tennis_start_date" className={labelCls}>테니스 시작일</label>
                    <input id="tennis_start_date" name="tennis_start_date" type="date" max="9999-12-31" className={inputCls} />
                </div>
                <div>
                    <label htmlFor="ntrp" className={labelCls}>NTRP *</label>
                    <input
                        id="ntrp" name="ntrp" type="number"
                        min={1.0} max={7.0} step={0.5} defaultValue={3.0}
                        required className={inputCls}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">1.0 ~ 7.0 (0.5 단위)</p>
                </div>
            </div>

            {state?.error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button
                type="submit"
                disabled={isPending || pwMismatch}
                className="w-full h-11 font-semibold mt-2"
            >
                {isPending ? '가입 중...' : '회원가입'}
            </Button>
        </form>
    )
}
