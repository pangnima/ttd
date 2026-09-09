import { createClient } from '@/lib/supabase/server'
import { fetchRoomQueue } from '@/lib/queries/room-queue'
import { roomBadgeTotal } from '@/lib/match-rooms/room-turn'
import { Header } from '@/components/common/header'
import { Sidebar } from '@/components/common/sidebar'
import { SidebarProvider } from '@/components/common/sidebar-context'
import { WelcomeDialog } from '@/components/onboarding/welcome-dialog'

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
            .select('name, nickname, role, profile_image')
            .eq('id', user.id)
            .single()
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
            {user && <WelcomeDialog />}
        </SidebarProvider>
    )
}
