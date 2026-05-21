import { ProfileSettingsForm } from '@/components/profile/profile-settings-form'
import { PasswordChangeForm } from '@/components/profile/password-change-form'

export default function ProfileSettingsPage() {
    return (
        <div className="w-full max-w-lg space-y-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">내 정보 수정</h1>
                <p className="text-sm text-foreground/60 mt-0.5">
                    닉네임, NTRP 등 프로필 정보를 수정합니다.
                </p>
            </div>
            <ProfileSettingsForm />
            <PasswordChangeForm />
        </div>
    )
}
