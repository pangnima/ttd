import { ProfileSettingsForm } from '@/components/profile/profile-settings-form'

export default function ProfileSettingsPage() {
    return (
        <div className="w-full max-w-lg">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">내 정보 수정</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    닉네임, NTRP 등 프로필 정보를 수정합니다.
                </p>
            </div>
            <ProfileSettingsForm />
        </div>
    )
}
