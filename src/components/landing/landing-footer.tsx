import { BrandLogo } from '@/components/common/brand-logo'

export function LandingFooter() {
    return (
        <footer className="border-t border-border bg-background">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
                <BrandLogo size="sm" />
                <p className="text-xs text-muted-foreground">
                    © 2025 BASELINE · 테니스 클럽 플랫폼
                </p>
            </div>
        </footer>
    )
}
