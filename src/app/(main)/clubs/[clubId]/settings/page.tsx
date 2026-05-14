import { notFound } from 'next/navigation'
import { getClubById } from '@/lib/dummy/clubs'
import { ClubSettingsForm } from '@/components/clubs/club-settings-form'

type SettingsPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function ClubSettingsPage({ params }: SettingsPageProps) {
    const { clubId } = await params
    const club = getClubById(clubId)

    if (!club) return notFound()

    return (
        <div className="w-full max-w-lg">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">클럽 설정</h1>
                <p className="text-sm text-muted-foreground mt-1">{club.name}</p>
            </div>
            <ClubSettingsForm club={club} />
        </div>
    )
}
