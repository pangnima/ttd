import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function LandingPage() {
    return (
        <div className="min-h-screen w-screen max-w-full flex flex-col bg-background text-foreground overflow-x-hidden">
            {/* 네비게이션 */}
            <header className="relative z-20 flex items-center justify-between px-8 py-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md border border-foreground/20 flex items-center justify-center text-foreground text-sm font-bold bg-foreground/5">
                        TC
                    </div>
                    <span className="text-sm font-medium tracking-widest uppercase text-foreground/85">
                        Tennis Club
                    </span>
                </div>
                <nav className="flex items-center gap-8 text-sm font-medium tracking-widest uppercase text-foreground/65">
                    <Link href="/clubs" className="hover:text-foreground transition-colors">클럽</Link>
                    <Link href="/login" className="hover:text-foreground transition-colors">로그인</Link>
                    <Link
                        href="/signup"
                        className="text-foreground border border-foreground/20 px-4 py-1.5 rounded-full hover:bg-foreground/10 transition-colors"
                    >
                        시작하기
                    </Link>
                </nav>
            </header>

            {/* 히어로 */}
            <main className="relative flex-1 flex flex-col items-center">
                {/* 헤드라인 */}
                <div className="relative z-10 mt-16 sm:mt-20 text-center px-4">
                    <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none">
                        <span className="block text-foreground">우리 클럽의</span>
                        <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-win via-accent-lime to-info">
                            테니스
                        </span>
                    </h1>
                    <p className="mt-6 text-foreground/65 text-base sm:text-lg tracking-widest uppercase">
                        클럽 운영 · 대진표 · 경기 기록
                    </p>
                </div>

                {/* 코트 비주얼 */}
                <div className="relative w-full max-w-4xl mx-auto mt-12 px-4 overflow-hidden" style={{ height: '320px' }}>
                    {/* 배경 글로우 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                            className="w-[600px] h-[200px] rounded-full opacity-20"
                            style={{
                                background: 'radial-gradient(ellipse, rgba(34,211,238,0.8) 0%, rgba(6,182,212,0.3) 40%, transparent 70%)',
                                filter: 'blur(40px)',
                            }}
                        />
                    </div>

                    {/* SVG 테니스 코트 */}
                    <svg
                        viewBox="0 0 900 300"
                        className="w-full h-full"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            {/* 원근감 그라디언트 */}
                            <linearGradient id="courtFade" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                                <stop offset="85%" stopColor="rgba(0,0,0,0)" />
                                <stop offset="100%" stopColor="rgba(0,0,0,1)" />
                            </linearGradient>
                            {/* 라인 글로우 */}
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id="glowStrong" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            {/* 코트 표면 그라디언트 */}
                            <linearGradient id="courtSurface" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(14,116,144,0.25)" />
                                <stop offset="100%" stopColor="rgba(14,116,144,0.05)" />
                            </linearGradient>
                            {/* 사이드라인 그라디언트 */}
                            <linearGradient id="sideGlow" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="rgba(34,211,238,0)" />
                                <stop offset="15%" stopColor="rgba(34,211,238,0.9)" />
                                <stop offset="50%" stopColor="rgba(255,255,255,1)" />
                                <stop offset="85%" stopColor="rgba(34,211,238,0.9)" />
                                <stop offset="100%" stopColor="rgba(34,211,238,0)" />
                            </linearGradient>
                        </defs>

                        {/* 원근감 있는 코트 표면 (사다리꼴) */}
                        <polygon
                            points="180,280 720,280 820,60 80,60"
                            fill="url(#courtSurface)"
                        />

                        {/* 코트 라인들 — 원근감 적용 */}
                        {/* 외곽 라인 */}
                        <line x1="80" y1="60" x2="820" y2="60" stroke="rgba(34,211,238,0.9)" strokeWidth="2" filter="url(#glow)" />
                        <line x1="180" y1="280" x2="720" y2="280" stroke="rgba(34,211,238,0.4)" strokeWidth="1.5" />
                        <line x1="80" y1="60" x2="180" y2="280" stroke="rgba(34,211,238,0.7)" strokeWidth="1.5" filter="url(#glow)" />
                        <line x1="820" y1="60" x2="720" y2="280" stroke="rgba(34,211,238,0.7)" strokeWidth="1.5" filter="url(#glow)" />

                        {/* 네트 라인 (가운데) */}
                        <line x1="110" y1="170" x2="790" y2="170" stroke="rgba(255,255,255,0.95)" strokeWidth="2.5" filter="url(#glowStrong)" />

                        {/* 서비스 라인들 */}
                        <line x1="93" y1="115" x2="807" y2="115" stroke="rgba(34,211,238,0.55)" strokeWidth="1.2" filter="url(#glow)" />
                        <line x1="127" y1="225" x2="773" y2="225" stroke="rgba(34,211,238,0.4)" strokeWidth="1.2" filter="url(#glow)" />

                        {/* 센터 라인 */}
                        <line x1="450" y1="60" x2="450" y2="280" stroke="rgba(34,211,238,0.45)" strokeWidth="1.2" filter="url(#glow)" />
                        <line x1="450" y1="115" x2="450" y2="225" stroke="rgba(255,255,255,0.7)" strokeWidth="2" filter="url(#glow)" />

                        {/* 세로 원근선 */}
                        <line x1="220" y1="60" x2="267" y2="280" stroke="rgba(34,211,238,0.2)" strokeWidth="1" />
                        <line x1="340" y1="60" x2="360" y2="280" stroke="rgba(34,211,238,0.2)" strokeWidth="1" />
                        <line x1="560" y1="60" x2="540" y2="280" stroke="rgba(34,211,238,0.2)" strokeWidth="1" />
                        <line x1="680" y1="60" x2="633" y2="280" stroke="rgba(34,211,238,0.2)" strokeWidth="1" />

                        {/* 상단 밝은 라인 (빛 반사) */}
                        <line x1="80" y1="60" x2="820" y2="60" stroke="url(#sideGlow)" strokeWidth="3" filter="url(#glowStrong)" />

                        {/* 네트 포스트 */}
                        <circle cx="110" cy="170" r="4" fill="rgba(255,255,255,0.95)" filter="url(#glowStrong)" />
                        <circle cx="790" cy="170" r="4" fill="rgba(255,255,255,0.95)" filter="url(#glowStrong)" />

                        {/* 하단 페이드 */}
                        <rect x="0" y="0" width="900" height="300" fill="url(#courtFade)" />
                    </svg>
                </div>

                {/* CTA 영역 */}
                <div className="relative z-10 -mt-4 text-center px-4 pb-20">
                    <p className="text-foreground/75 text-base sm:text-lg mb-6">
                        체계적인 클럽 운영의 시작.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link
                            href="/signup"
                            className={cn(
                                buttonVariants({ size: 'lg' }),
                                'rounded-full px-8 bg-white text-black hover:bg-white/90 font-semibold tracking-wide'
                            )}
                        >
                            무료로 시작하기
                        </Link>
                        <Link
                            href="/clubs"
                            className="text-foreground/65 hover:text-foreground text-sm transition-colors underline underline-offset-4"
                        >
                            클럽 둘러보기
                        </Link>
                    </div>
                </div>
            </main>

            {/* 하단 그라디언트 글로우 */}
            <div
                className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at bottom, rgba(34,211,238,0.06) 0%, transparent 70%)',
                }}
            />

            <footer className="relative z-10 flex items-center justify-center py-6 text-xs text-foreground/40 tracking-widest uppercase">
                © 2025 Tennis Club Platform
            </footer>
        </div>
    )
}
