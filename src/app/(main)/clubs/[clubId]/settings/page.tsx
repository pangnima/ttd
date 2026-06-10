import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchClubById } from '@/lib/queries/clubs'
import { ClubSettingsForm } from '@/components/clubs/club-settings-form'
import { RecalculateRatingsButton } from '@/components/club-dashboard/recalculate-ratings-button'
import { PageContainer } from '@/components/common/page-container'

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
        <PageContainer>
            <div>
                <h1 className="text-2xl font-bold">클럽 설정</h1>
                <p className="text-sm text-muted-foreground mt-1">{club.name}</p>
            </div>
            <ClubSettingsForm club={club} />

            <section className="space-y-2 border-t border-foreground/8 pt-6">
                <h2 className="text-sm font-semibold">클럽 레이팅</h2>
                <p className="text-xs text-muted-foreground">
                    확정된 모든 경기를 처음부터 다시 계산해 클럽 레이팅을 갱신합니다.
                    과거 경기 반영이나 문제 복구가 필요할 때 사용하세요.
                </p>
                <RecalculateRatingsButton clubId={clubId} />
            </section>
        </PageContainer>
    )
}
