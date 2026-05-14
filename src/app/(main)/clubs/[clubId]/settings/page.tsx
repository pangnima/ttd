import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchClubById } from '@/lib/queries/clubs'
import { ClubSettingsForm } from '@/components/clubs/club-settings-form'

type SettingsPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function ClubSettingsPage({ params }: SettingsPageProps) {
    const { clubId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const club = await fetchClubById(clubId)
    if (!club) notFound()
    if (club.ownerId !== user.id) redirect(`/clubs/${clubId}`)

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
