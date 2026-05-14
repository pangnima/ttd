import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <header className="h-14 border-b border-white/5 flex items-center px-8">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                        T
                    </div>
                    <span className="font-semibold text-sm">테니스 클럽</span>
                </div>
                <nav className="ml-auto flex items-center gap-2">
                    <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground')}>
                        로그인
                    </Link>
                    <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
                        회원가입
                    </Link>
                </nav>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-8">
                <div className="space-y-4 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-muted-foreground">
                        🎾 테니스 클럽 관리 플랫폼
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                        우리 클럽의 테니스,<br />더 체계적으로
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        클럽 운영, 대진표 생성, 경기 기록까지 한 곳에서.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
                        무료로 시작하기
                    </Link>
                    <Link href="/clubs" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
                        클럽 둘러보기
                    </Link>
                </div>
            </main>

            <footer className="h-14 border-t border-white/5 flex items-center justify-center text-xs text-muted-foreground">
                © 2025 테니스 클럽 플랫폼
            </footer>
        </div>
    )
}
