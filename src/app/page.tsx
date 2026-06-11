import { CtaBanner } from '@/components/landing/cta-banner'
import { FeatureSection } from '@/components/landing/feature-section'
import { HeroSection } from '@/components/landing/hero-section'
import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingNav } from '@/components/landing/landing-nav'
import { StatsStrip } from '@/components/landing/stats-strip'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <LandingNav />
            <main>
                <HeroSection />
                <StatsStrip />
                <FeatureSection />
                <CtaBanner />
            </main>
            <LandingFooter />
        </div>
    )
}
