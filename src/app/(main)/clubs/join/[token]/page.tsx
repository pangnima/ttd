import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/common/page-container'
import { ClubAvatar } from '@/components/clubs/club-avatar'
import { InviteJoinButton } from '@/components/clubs/invite-join-button'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import { getDummyInvitePreview } from '@/lib/redesign-fixtures/clubs'

type JoinPageProps = {
    params: Promise<{ token: string }>
}

// DB 재설계 기간 임시: 실제로는 SECURITY DEFINER RPC(get_invite_preview)로 미리보기만 가져온다(anon 허용, 0032).
async function fetchPreview(_token: string) {
    return getDummyInvitePreview()
}

export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
    const { token } = await params
    const preview = await fetchPreview(token)
    if (!preview) {
        return { title: '클럽 초대', description: '유효하지 않거나 만료된 초대 링크입니다.' }
    }
    const title = `${preview.name} 클럽 초대`
    const description = `${preview.name}${preview.region ? ` · ${preview.region}` : ''} 클럽에 초대받았습니다. 가입하고 함께 경기를 기록해요.`
    return {
        title,
        description,
        openGraph: { title, description, type: 'website' },
        twitter: { card: 'summary_large_image', title, description },
    }
}

export default async function ClubJoinPage({ params }: JoinPageProps) {
    const { token } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const preview = await fetchPreview(token)

    if (!preview) {
        return (
            <PageContainer>
                <div className={`${CARD_BASE} p-8 text-center space-y-3 max-w-md mx-auto w-full`}>
                    <p className="text-body font-medium text-foreground">유효하지 않거나 만료된 초대 링크입니다.</p>
                    <p className="text-body2 text-muted-foreground">링크가 비활성화되었거나 잘못되었을 수 있어요.</p>
                    <Link href="/clubs" className="inline-block text-caption text-info hover:underline">
                        클럽 목록으로 가기
                    </Link>
                </div>
            </PageContainer>
        )
    }

    return (
        <PageContainer>
            <div className={`${CARD_BASE} p-6 space-y-5 max-w-md mx-auto w-full`}>
                <p className="text-caption text-muted-foreground text-center">클럽 초대를 받았습니다</p>
                <div className="flex flex-col items-center gap-3 text-center">
                    <ClubAvatar name={preview.name} logoUrl={preview.logo_url ?? undefined} size="lg" />
                    <div>
                        <p className="text-h4 font-bold text-foreground">{preview.name}</p>
                        {preview.region && (
                            <span className="flex items-center justify-center gap-1 mt-1 text-caption text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                {preview.region}
                            </span>
                        )}
                    </div>
                </div>
                {user ? (
                    <InviteJoinButton token={token} />
                ) : (
                    <Link
                        href={`/login?next=/clubs/join/${token}`}
                        className={cn(buttonVariants(), 'w-full gap-1.5')}
                    >
                        <UserPlus className="w-4 h-4" />
                        로그인하고 가입하기
                    </Link>
                )}
            </div>
        </PageContainer>
    )
}
