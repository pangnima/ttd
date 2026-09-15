import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileSettingsForm } from '@/components/profile/profile-settings-form'
import { PasswordChangeForm } from '@/components/profile/password-change-form'
import { SocialAccountNotice } from '@/components/profile/social-account-notice'
import { hasPasswordIdentity, socialProviderLabel } from '@/lib/auth/account-providers'
import { DeleteAccountButton } from '@/components/profile/delete-account-button'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

export default async function ProfileSettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase
        .from('users')
        .select('name, nickname, phone, gender, dominant_hand, tennis_start_date, ntrp, racket_brand, racket_model, profile_image, stats_hidden')
        .eq('id', user.id)
        .single()

    if (!data) redirect('/login')

    const signals = { identities: user.identities, providers: user.app_metadata?.providers }

    return (
        <PageContainer>
            <PageHeader
                title="내 정보 수정"
                description="닉네임, 휴대폰 번호, 주력 라켓, 프로필 사진, 통계 공개 여부를 수정합니다."
            />
            <ProfileSettingsForm initialProfile={data} userId={user.id} />
            {/* 비밀번호가 없는 계정에는 폼 대신 이유를 말한다 — 판정은 이미 받아 둔 user에서 나온다(쿼리 0 추가) */}
            {hasPasswordIdentity(signals)
                ? <PasswordChangeForm />
                : <SocialAccountNotice providerLabel={socialProviderLabel(signals) ?? '소셜'} />}
            <DeleteAccountButton />
        </PageContainer>
    )
}
