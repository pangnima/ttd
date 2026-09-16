import Link from 'next/link'
import { BrandLogo } from '@/components/common/brand-logo'

export function LandingFooter() {
    return (
        <footer className="border-t border-border bg-background">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
                <BrandLogo size="sm" />
                <div className="flex items-center gap-4">
                    {/* 비로그인 방문자가 /guide에 닿는 경로 — 가이드는 (main) 안이지만 보호 라우트가 아니다 */}
                    <Link href="/guide" className="text-caption text-muted-foreground hover:text-foreground transition-colors">
                        사용 가이드
                    </Link>
                    {/* 랜딩은 정적 프리렌더라 빌드 시각 기준 — 연 1회 이상 배포하므로 충분하다 */}
                    <p className="text-caption text-muted-foreground">
                        © {new Date().getFullYear()} BASELINE · 테니스 클럽 플랫폼
                    </p>
                </div>
            </div>
        </footer>
    )
}
