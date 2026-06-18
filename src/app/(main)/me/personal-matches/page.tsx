import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPersonalMatchesByUser } from '@/lib/queries/personal-matches'
import { PersonalMatchList } from '@/components/personal-matches/personal-match-list'
import { SECTION_LABEL, EMPTY_BLOCK } from '@/lib/dashboard/tokens'
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
                <div className={`${EMPTY_BLOCK} flex flex-col items-center justify-center gap-3`}>
                    {/* 정적 SVG 장식 (내 전적 > 개인 빈 상태와 통일) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/empty/record-empty.svg" alt="" aria-hidden width={96} height={64} draggable={false} />
                    <span>
                        아직 등록된 개인 경기가 없습니다.{' '}
                        <Link href="/me/personal-matches/new" className="text-primary hover:underline">
                            첫 경기를 기록해보세요
                        </Link>
                    </span>
                </div>
            ) : (
                <PersonalMatchList matches={matches} />
            )}
        </PageContainer>
    )
}
