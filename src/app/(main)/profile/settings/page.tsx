import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileSettingsForm } from '@/components/profile/profile-settings-form'
import { PasswordChangeForm } from '@/components/profile/password-change-form'

export default async function ProfileSettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase
        .from('users')
        .select('name, nickname, phone, gender, dominant_hand, tennis_start_date, ntrp, profile_image, stats_hidden')
        .eq('id', user.id)
        .single()

    if (!data) redirect('/login')

    return (
        <div className="w-full max-w-lg space-y-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">내 정보 수정</h1>
                <p className="text-sm text-foreground/60 mt-0.5">
                    닉네임, NTRP 등 프로필 정보를 수정합니다.
                </p>
            </div>
            <ProfileSettingsForm initialProfile={data} />
            <PasswordChangeForm />
        </div>
    )
}
