'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { signupAction } from '@/lib/actions/auth'

const inputCls = [
    'w-full rounded-md px-3 py-2.5 text-sm text-foreground',
    'bg-foreground/[0.06] border border-foreground/15',
    'placeholder:text-foreground/50',
    'outline-none focus:border-foreground/40 focus:bg-foreground/[0.09]',
    'transition-colors',
].join(' ')

const labelCls = 'block text-[11px] font-medium tracking-widest uppercase text-foreground/75 mb-1.5'

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
                <div className="w-14 h-14 rounded-full bg-foreground/8 border border-foreground/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-foreground/40 transition-colors">
                    {avatarPreview ? (
                        <Image src={avatarPreview} alt="프로필" width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xl text-foreground/40">👤</span>
                    )}
                </div>
                <div>
                    <p className="text-sm text-foreground/85 group-hover:text-foreground transition-colors">프로필 사진 업로드</p>
                    <p className="text-xs text-foreground/65">PNG, JPG, WEBP (선택)</p>
                </div>
                <input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
            </label>

            <div className="h-px bg-foreground/5" />

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

            <div className="h-px bg-foreground/5" />

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
                                        ? 'border-cyan-400/70 bg-cyan-400/15 text-cyan-300 font-semibold'
                                        : 'border-foreground/15 text-foreground/65 hover:border-foreground/30 hover:text-foreground/85'
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
                                        ? 'border-cyan-400/70 bg-cyan-400/15 text-cyan-300 font-semibold'
                                        : 'border-foreground/15 text-foreground/65 hover:border-foreground/30 hover:text-foreground/85'
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
                    <input id="tennis_start_date" name="tennis_start_date" type="date" max="9999-12-31" className={`${inputCls} [color-scheme:dark]`} />
                </div>
                <div>
                    <label htmlFor="ntrp" className={labelCls}>NTRP *</label>
                    <input
                        id="ntrp" name="ntrp" type="number"
                        min={1.0} max={7.0} step={0.5} defaultValue={3.0}
                        required className={inputCls}
                    />
                    <p className="mt-1 text-[10px] text-foreground/65">1.0 ~ 7.0 (0.5 단위)</p>
                </div>
            </div>

            {state?.error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                    {state.error}
                </p>
            )}

            <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full bg-white text-black hover:bg-foreground/90 font-semibold h-11 mt-2"
            >
                {isPending ? '가입 중...' : '회원가입'}
            </Button>
        </form>
    )
}
