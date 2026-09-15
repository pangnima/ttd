import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { GuideHashScroll } from '@/components/guide/guide-hash-scroll'
import { GuideSectionCard } from '@/components/guide/guide-section-card'
import { GUIDE_SECTIONS } from '@/lib/guide/sections'

export const metadata = { title: '사용 가이드' }

/**
 * 사용 가이드(Week 57 — Week 39에 지운 것을 되살렸다). `(main)` 안에 두어 헤더·사이드바가 남는다 —
 * 미들웨어 보호 목록에 없어 비로그인도 열리고, 레이아웃은 user 없이도 렌더된다.
 * 문구는 `lib/guide/sections.ts`가 단일 출처이고 세 목록 화면의 인라인 설명이 같은 것을 읽는다.
 */
export default function GuidePage() {
    return (
        <PageContainer>
            <GuideHashScroll />
            <PageHeader
                title="사용 가이드"
                description="매칭을 열고, 참가하고, 결과를 확인하는 순서대로 정리했습니다"
            />
            <div className="max-w-3xl space-y-6">
                {GUIDE_SECTIONS.map((section) => (
                    <GuideSectionCard key={section.id} section={section} />
                ))}
            </div>
        </PageContainer>
    )
}
