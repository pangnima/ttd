import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { needsProfileOnboarding, PROFILE_ONBOARDING_PATH } from '@/lib/profile/onboarding-gate'
import { fetchRoomQueue } from '@/lib/queries/room-queue'
import { roomBadgeTotal } from '@/lib/match-rooms/room-turn'
import { Header } from '@/components/common/header'
import { Sidebar } from '@/components/common/sidebar'
import { SidebarProvider } from '@/components/common/sidebar-context'

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // 직렬화 가능한 최소 형태만 Client Component(Sidebar/Header)에 전달 (아이콘·객체 전체 전달 금지)
    // 뱃지 = 매칭 리스트에서 내 차례로 강조되는 카드 수. fetchRoomQueue는 React cache()라 화면 본문과 쿼리를 공유한다
    const queue = user ? await fetchRoomQueue(user.id) : null
    const myTurnCount = queue ? roomBadgeTotal(queue.turns, queue.invites.length) : 0

    // 헤더 표시용 사용자 정보 — 서버에서 조회해 props로 전달 (저장 후 revalidatePath로 즉시 갱신)
    let userDisplay: {
        id: string
        name: string
        nickname: string
        role: string
        profileImage: string | null
    } | null = null
    if (user) {
        const { data: profile } = await supabase
            .from('users')
            .select('name, nickname, role, profile_image, ntrp')
            .eq('id', user.id)
            .single()

        // 프로필 완성 게이트 — 소셜 가입자는 테니스 정보를 고를 기회가 없었다(0084).
        // 이 select는 원래 헤더 표시용으로 이미 돌던 것이라 **쿼리가 늘지 않는다**.
        // 미들웨어에 넣으면 모든 요청에 조회가 하나씩 붙는다.
        // 완성 화면은 이 레이아웃 밖(`/onboarding`)이라 되돌아오는 루프가 없다.
        if (needsProfileOnboarding(profile)) redirect(PROFILE_ONBOARDING_PATH)

        if (profile) {
            userDisplay = {
                id: user.id,
                name: profile.name,
                nickname: profile.nickname,
                role: profile.role,
                profileImage: profile.profile_image,
            }
        }
    }

    return (
        <SidebarProvider>
            <div className="flex h-dvh bg-background">
                <Sidebar userId={user?.id ?? null} myTurnCount={myTurnCount} />
                <div className="flex flex-col flex-1 min-w-0">
                    <Header userDisplay={userDisplay} userId={user?.id ?? null} myTurnCount={myTurnCount} />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6">
                        {children}
                    </main>
                </div>
            </div>
            {/* 환영 팝업(WelcomeDialog)은 Week 57에 지웠다 — 한 번만 보이는 안내는 내용이 낡아도 알 수 없다.
                첫 안내는 /guide와 목록 화면의 인라인 설명(PageGuide), 프로필의 「시작하기」 체크리스트가 맡는다 */}
        </SidebarProvider>
    )
}
