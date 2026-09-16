import { CtaBanner } from '@/components/landing/cta-banner'
import { FeatureSection } from '@/components/landing/feature-section'
import { FlowSection } from '@/components/landing/flow-section'
import { HeroSection } from '@/components/landing/hero-section'
import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingNav } from '@/components/landing/landing-nav'

/**
 * 랜딩(Week 65) — 비로그인 방문자 전용(로그인 상태는 미들웨어가 프로필로 보낸다). 루트에 `dark`를 걸어
 * 방문자가 /guide에서 라이트로 바꿨더라도 다크·옐로우 톤이 유지된다(`LoginHero`와 같은 스코프 기법).
 * 그림은 캡처가 아니라 사용 가이드 픽스처로 실제 카드를 그린다.
 */
export default function LandingPage() {
    return (
        <div className="dark min-h-screen overflow-x-clip bg-background text-foreground">
            <LandingNav />
            <main>
                <HeroSection />
                <FlowSection />
                <FeatureSection />
                <CtaBanner />
            </main>
            <LandingFooter />
        </div>
    )
}
