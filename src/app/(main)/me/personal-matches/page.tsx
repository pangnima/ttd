import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPersonalMatchesWithConfirmation } from '@/lib/queries/personal-matches'
import { fetchRotationSessionsByUser } from '@/lib/queries/rotation-sessions'
import { PersonalMatchList } from '@/components/personal-matches/personal-match-list'
import { RotationSessionList } from '@/components/personal-matches/rotation-session-list'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '개인 경기 기록' }

export default async function PersonalMatchesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [matches, sessions] = await Promise.all([
        fetchPersonalMatchesWithConfirmation(user.id),
        fetchRotationSessionsByUser(user.id),
    ])

    return (
        <PageContainer>
            <PageHeader
                title="개인 경기 기록"
                description="클럽 외부 경기를 직접 기록합니다"
                actions={
                    <Link
                        href="/me/personal-matches/new"
                        className="inline-flex items-center gap-1 text-body2 border border-border rounded-[4px] px-3 py-2 hover:border-input transition-colors"
                    >
                        + 경기 추가
                    </Link>
                }
            />

            {/* 로테이션 세션(게임 미입력)은 통계 밖이므로 목록 위 별도 섹션 */}
            <RotationSessionList sessions={sessions} />

            {matches.length === 0 && sessions.length === 0 ? (
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
            ) : matches.length > 0 ? (
                <PersonalMatchList matches={matches} />
            ) : null}
        </PageContainer>
    )
}
