import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { isSafeNext } from '@/lib/supabase/middleware'
import { personalNavHref } from '@/lib/nav-items'
import { needsProfileOnboarding } from '@/lib/profile/onboarding-gate'
import { logoutAction } from '@/lib/actions/auth'
import { ProfileOnboardingForm } from '@/components/onboarding/profile-onboarding-form'
import { BrandLogo } from '@/components/common/brand-logo'
import { TYPO } from '@/lib/dashboard/tokens'

export const metadata = { title: '프로필 완성' }

type Props = { searchParams: Promise<{ next?: string }> }

/**
 * 소셜 가입자의 프로필 완성 화면.
 *
 * **`(main)` 밖에 둔다.** 게이트가 그 레이아웃에 있어서 안에 두면 스스로를 리다이렉트해 루프가 된다.
 * ⚠ `/signup/...` 아래에도 둘 수 없다 — 미들웨어의 isAuthRoute가 로그인 상태를 튕겨낸다.
 * 비로그인 접근은 미들웨어가 막고(`/onboarding`은 보호 라우트), 이미 채운 사람은 아래에서 되돌린다.
 */
export default async function ProfileOnboardingPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users')
        .select('name, nickname, profile_image, ntrp')
        .eq('id', user.id)
        .single()

    const { next } = await searchParams
    const safeNext = isSafeNext(next) ? next : undefined

    // 이미 채운 사람이 URL로 들어오면 할 일이 없다 — 게이트의 거울이다
    if (!needsProfileOnboarding(profile)) redirect(safeNext ?? personalNavHref(user.id))

    return (
        <div className="h-dvh overflow-y-auto bg-background text-foreground">
            <div className="min-h-full flex items-center justify-center px-6 py-10">
                <div className="w-full max-w-md">
                    <span className="inline-flex mb-10 text-foreground">
                        <BrandLogo size="md" />
                    </span>

                    <div className="mb-8">
                        <p className={TYPO.eyebrow}>ALMOST THERE</p>
                        <h1 className={`${TYPO.h2} mt-2`}>프로필을 완성해 주세요</h1>
                        <p className="mt-1.5 text-body2 text-muted-foreground break-keep">
                            경기 통계와 레이팅에 쓰이는 정보입니다. NTRP·성별·주력손은 <b className="font-semibold text-foreground">한 번만 입력</b>하고 이후에는 바꿀 수 없습니다.
                        </p>
                    </div>

                    <ProfileOnboardingForm
                        next={safeNext}
                        defaultName={profile?.name ?? ''}
                        defaultNickname={profile?.nickname ?? ''}
                        defaultProfileImage={profile?.profile_image ?? null}
                        userId={user.id}
                    />

                    {/* 다른 계정으로 들어온 사람의 탈출구 — 이 화면에는 헤더가 없다 */}
                    <form action={logoutAction} className="mt-6 text-center">
                        <button type="submit" className="text-caption text-muted-foreground hover:text-foreground">
                            다른 계정으로 로그인
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
