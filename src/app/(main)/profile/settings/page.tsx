import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileSettingsForm } from '@/components/profile/profile-settings-form'
import { PasswordChangeForm } from '@/components/profile/password-change-form'
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

    return (
        <PageContainer>
            <PageHeader
                title="내 정보 수정"
                description="닉네임, 연락처, 주력 라켓, 프로필 사진, 통계 공개 여부를 수정합니다."
            />
            <ProfileSettingsForm initialProfile={data} />
            <PasswordChangeForm />
            <DeleteAccountButton />
        </PageContainer>
    )
}
