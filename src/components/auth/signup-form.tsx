'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { signupAction } from '@/lib/actions/auth'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

export function SignupForm() {
    const [state, formAction, isPending] = useActionState(signupAction, null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [gender, setGender] = useState('male')
    const [hand, setHand] = useState('right')

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setAvatarPreview(URL.createObjectURL(file))
    }

    return (
        <form action={formAction} className="space-y-5">
            {/* 프로필 사진 */}
            <label htmlFor="avatar" className="flex items-center gap-3 cursor-pointer group">
                <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0 group-hover:border-input transition-colors">
                    {avatarPreview ? (
                        <Image src={avatarPreview} alt="프로필" width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xl text-muted-foreground">👤</span>
                    )}
                </div>
                <div>
                    <p className="text-sm text-foreground group-hover:text-foreground transition-colors">프로필 사진 업로드</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (선택)</p>
                </div>
                <input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
            </label>

            <div className="h-px bg-border" />

            {/* 이름 + 닉네임 */}
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

            {/* 이메일 */}
            <div>
                <label htmlFor="email" className={labelCls}>이메일 *</label>
                <input id="email" name="email" type="email" placeholder="example@email.com" required autoComplete="email" className={inputCls} />
            </div>

            {/* 비밀번호 */}
            <div>
                <label htmlFor="password" className={labelCls}>비밀번호 *</label>
                <input id="password" name="password" type="password" placeholder="6자 이상" required minLength={6} autoComplete="new-password" className={inputCls} />
            </div>

            {/* 연락처 */}
            <div>
                <label htmlFor="phone" className={labelCls}>연락처</label>
                <input id="phone" name="phone" placeholder="010-0000-0000" className={inputCls} />
            </div>

            <div className="h-px bg-border" />

            {/* 성별 + 주력손 */}
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

            {/* 테니스 시작일 + NTRP */}
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
                disabled={isPending}
                className="w-full rounded-full font-semibold h-11 mt-2"
            >
                {isPending ? '가입 중...' : '회원가입'}
            </Button>
        </form>
    )
}
