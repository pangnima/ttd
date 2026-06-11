import Link from 'next/link'
import { BarChart3, Home, LayoutGrid } from 'lucide-react'

import { FeatureCard } from '@/components/landing/feature-card'

const FEATURES = [
    {
        icon: Home,
        chipLabel: '운영',
        chipTone: 'info' as const,
        title: '클럽 운영',
        description: '회원 관리, 가입 승인, 공지를 한 곳에서. 운영자 권한으로 클럽을 손쉽게 운영하세요.',
    },
    {
        icon: LayoutGrid,
        chipLabel: '매칭',
        chipTone: 'lime' as const,
        title: '대진표 · 매칭',
        description: '실력 기반 대진을 자동 생성. 라운드별 코트와 시간슬롯까지 깔끔하게 정리됩니다.',
    },
    {
        icon: BarChart3,
        chipLabel: '분석',
        chipTone: 'win' as const,
        title: '경기 분석',
        description: '승률·라이벌·파트너 통계를 선반에서, 데이터로 나의 테니스를 깊이 있게 파악하세요.',
    },
]

export function FeatureSection() {
    return (
        <section id="features" className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <p className="type-mono-label text-muted-foreground">FEATURES</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                        클럽과 선수, 모두를 위한 도구
                    </h2>
                </div>
                <Link
                    href="#"
                    className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
                >
                    전체 기능 →
                </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
                {FEATURES.map((feature) => (
                    <FeatureCard key={feature.title} {...feature} />
                ))}
            </div>
        </section>
    )
}
