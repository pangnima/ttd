import { createClient } from '@/lib/supabase/server'
import { fetchMyClubs } from '@/lib/queries/clubs'
import { fetchMatchQueue } from '@/lib/queries/match-queue'
import { myTurnTotal } from '@/lib/match-requests/queue'
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
    // 뱃지 = 확인 요청 허브 '내 차례' 총건수. fetchMatchQueue는 React cache()라 같은 요청의 화면 본문과 쿼리를 공유한다
    const [myClubs, queue] = user
        ? await Promise.all([fetchMyClubs(user.id), fetchMatchQueue(user.id)])
        : [[], null]
    const myTurnCount = queue ? myTurnTotal(queue.counts) : 0
    const clubs = myClubs.map((c) => ({ id: c.id, name: c.name }))

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
                <Sidebar clubs={clubs} userId={user?.id ?? null} myTurnCount={myTurnCount} />
                <div className="flex flex-col flex-1 min-w-0">
                    <Header clubs={clubs} userDisplay={userDisplay} userId={user?.id ?? null} myTurnCount={myTurnCount} />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6">
                        {children}
                    </main>
                </div>
            </div>
            {user && <WelcomeDialog />}
        </SidebarProvider>
    )
}
