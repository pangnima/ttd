import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDummyClub, getDummyActiveInviteToken } from '@/lib/redesign-fixtures/clubs'
import { ClubSettingsForm } from '@/components/clubs/club-settings-form'
import { ClubInviteCard } from '@/components/clubs/club-invite-card'
import { RecalculateRatingsButton } from '@/components/club-dashboard/recalculate-ratings-button'
import { PageContainer } from '@/components/common/page-container'

type SettingsPageProps = {
    params: Promise<{ clubId: string }>
}

// DB 재설계 기간 임시: UI 작업은 더미데이터로, 실제 Supabase 연동은 이후 별도 진행.
// owner 체크는 더미 ownerId('u-owner')와 실제 로그인 유저가 항상 달라 화면 확인이 불가해지므로 생략.
export default async function ClubSettingsPage({ params }: SettingsPageProps) {
    const { clubId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const club = getDummyClub(clubId)
    if (!club) notFound()

    const activeToken = getDummyActiveInviteToken()

    return (
        <PageContainer>
            <div>
                <h1 className="text-2xl font-bold">클럽 설정</h1>
                <p className="text-sm text-muted-foreground mt-1">{club.name}</p>
            </div>
            <ClubSettingsForm club={club} />

            <section className="space-y-2 border-t border-foreground/8 pt-6">
                <h2 className="text-sm font-semibold">초대 링크</h2>
                <p className="text-xs text-muted-foreground">
                    링크를 받은 사람은 접속 즉시 멤버로 가입됩니다.
                    검색에 노출되지 않는 비공개 클럽은 이 링크로만 새 멤버를 받을 수 있습니다.
                </p>
                <ClubInviteCard clubId={clubId} activeToken={activeToken} />
            </section>

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
