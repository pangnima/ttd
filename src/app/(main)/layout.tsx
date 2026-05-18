import { createClient } from '@/lib/supabase/server'
import { fetchFirstJoinedClubId } from '@/lib/queries/clubs'
import { Header } from '@/components/common/header'
import { Sidebar } from '@/components/common/sidebar'

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const firstClubId = user ? await fetchFirstJoinedClubId(user.id) : null
    const matchGameHref = firstClubId ? `/clubs/${firstClubId}/match-games` : null

    return (
        <div className="flex h-screen bg-background">
            <Sidebar matchGameHref={matchGameHref} />
            <div className="flex flex-col flex-1 min-w-0">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
