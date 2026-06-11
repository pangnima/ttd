import { createClient } from '@/lib/supabase/server'
import { fetchMyClubs } from '@/lib/queries/clubs'
import { Header } from '@/components/common/header'
import { Sidebar } from '@/components/common/sidebar'

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // 직렬화 가능한 최소 형태만 Client Component(Sidebar/Header)에 전달 (아이콘·객체 전체 전달 금지)
    const myClubs = user ? await fetchMyClubs(user.id) : []
    const clubs = myClubs.map((c) => ({ id: c.id, name: c.name }))

    return (
        <div className="flex h-dvh bg-background">
            <Sidebar clubs={clubs} userId={user?.id ?? null} />
            <div className="flex flex-col flex-1 min-w-0">
                <Header clubs={clubs} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
