import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPersonalMatchesByUser } from '@/lib/queries/personal-matches'
import { PersonalMatchListItem } from '@/components/personal-matches/personal-match-list-item'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '개인 경기 기록' }

export default async function PersonalMatchesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const matches = await fetchPersonalMatchesByUser(user.id)

    return (
        <PageContainer>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`${SECTION_LABEL} text-2xl`}>개인 경기 기록</h1>
                    <p className="text-sm text-muted-foreground mt-1">클럽 외부 경기를 직접 기록합니다</p>
                </div>
                <Link
                    href="/me/personal-matches/new"
                    className="inline-flex items-center gap-1 text-sm border border-border rounded-[4px] px-3 py-2 hover:border-input transition-colors"
                >
                    + 경기 추가
                </Link>
            </div>

            {matches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground text-sm text-center py-12">
                    아직 등록된 개인 경기가 없습니다.{' '}
                    <Link href="/me/personal-matches/new" className="underline underline-offset-2 hover:text-foreground">
                        첫 경기를 기록해보세요
                    </Link>
                </div>
            ) : (
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                    {matches.map((m) => (
                        <PersonalMatchListItem key={m.id} match={m} />
                    ))}
                </div>
            )}
        </PageContainer>
    )
}
