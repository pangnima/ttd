import { BrandLogo } from '@/components/common/brand-logo'

/**
 * 로그인 좌측 패널 — 항상 다크. `dark` 클래스로 하위 토큰을 다크 팔레트로 고정한다.
 * 콘텐츠는 max-w-md 컬럼으로 묶어 분할선(우측) 쪽으로 모아 좌우 균형을 맞춘다.
 */
export function LoginHero() {
    return (
        <div className="dark relative hidden overflow-hidden bg-background p-12 text-foreground lg:flex lg:justify-end">
            <div className="flex w-full max-w-md flex-col justify-between">
                <BrandLogo />

                <div className="relative">
                    {/* 코트 라인아트 */}
                    <svg
                        viewBox="0 0 320 230"
                        className="mb-10 w-full max-w-sm"
                        fill="none"
                        aria-hidden="true"
                    >
                        <rect x="1" y="1" width="318" height="228" className="stroke-border" />
                        <line x1="160" y1="1" x2="160" y2="229" className="stroke-border" strokeDasharray="4 6" />
                        <line x1="1" y1="60" x2="319" y2="60" className="stroke-border" />
                        <line x1="1" y1="170" x2="319" y2="170" className="stroke-border" />
                        <line x1="80" y1="60" x2="80" y2="170" className="stroke-border" strokeDasharray="4 6" />
                        <line x1="240" y1="60" x2="240" y2="170" className="stroke-border" strokeDasharray="4 6" />
                        {/* 라임 베이스라인 */}
                        <line x1="80" y1="115" x2="319" y2="115" className="stroke-accent-lime" strokeWidth="2" />
                    </svg>

                    <h2 className="type-headline text-foreground">
                        코트 위의 기록이
                        <br />
                        당신의 실력이 된다
                    </h2>
                    <p className="mt-4 text-sm text-muted-foreground">
                        경기를 기록할수록 더 또렷해지는 나의 테니스.
                    </p>
                </div>

                <div className="flex items-center gap-2" aria-hidden="true">
                    <span className="h-1.5 w-6 rounded-full bg-accent-lime" />
                    <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                    <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                </div>
            </div>
        </div>
    )
}
