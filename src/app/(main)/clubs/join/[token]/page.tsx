import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/common/page-container'
import { ClubAvatar } from '@/components/clubs/club-avatar'
import { InviteJoinButton } from '@/components/clubs/invite-join-button'
import { CARD_BASE } from '@/lib/dashboard/tokens'

type JoinPageProps = {
    params: Promise<{ token: string }>
}

export default async function ClubJoinPage({ params }: JoinPageProps) {
    const { token } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?next=/clubs/join/${token}`)

    // 비멤버는 RLS로 클럽을 못 읽으므로 SECURITY DEFINER RPC로 미리보기 정보만 가져온다.
    const { data, error } = await supabase.rpc('get_invite_preview', { p_token: token })
    const preview = !error && data && data.length > 0 ? data[0] : null

    if (!preview) {
        return (
            <PageContainer>
                <div className={`${CARD_BASE} p-8 text-center space-y-3`}>
                    <p className="text-sm font-medium text-foreground">유효하지 않거나 만료된 초대 링크입니다.</p>
                    <p className="text-xs text-muted-foreground">링크가 비활성화되었거나 잘못되었을 수 있어요.</p>
                    <Link href="/clubs" className="inline-block text-xs text-info hover:underline">
                        클럽 목록으로 가기
                    </Link>
                </div>
            </PageContainer>
        )
    }

    return (
        <PageContainer>
            <div className={`${CARD_BASE} p-6 space-y-5 max-w-md mx-auto w-full`}>
                <p className="text-xs text-muted-foreground text-center">클럽 초대를 받았습니다</p>
                <div className="flex flex-col items-center gap-3 text-center">
                    <ClubAvatar name={preview.name} logoUrl={preview.logo_url ?? undefined} size="lg" />
                    <div>
                        <p className="text-lg font-bold text-foreground">{preview.name}</p>
                        {preview.region && (
                            <span className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                {preview.region}
                            </span>
                        )}
                    </div>
                </div>
                <InviteJoinButton token={token} />
            </div>
        </PageContainer>
    )
}
