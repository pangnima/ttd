import type { ReactNode } from 'react'

import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { GuideHashScroll } from '@/components/guide/guide-hash-scroll'
import { GuideSectionCard } from '@/components/guide/guide-section-card'
import { FlowExample } from '@/components/guide/examples/flow-example'
import { MatchRoomCardExample } from '@/components/guide/examples/match-room-card-example'
import { MemberRolesExample } from '@/components/guide/examples/member-roles-example'
import { PersonalMatchExample } from '@/components/guide/examples/personal-match-example'
import { RoomInviteExample } from '@/components/guide/examples/room-invite-example'
import { StageStepper } from '@/components/guide/examples/stage-stepper'
import { GUIDE_SECTIONS, type GuideSectionId } from '@/lib/guide/sections'

export const metadata = { title: '사용 가이드' }

/**
 * 섹션 → 예시 그림(Week 58). full Record라 섹션을 더하면 그림도 정해야 한다 — 문구(`sections.ts`)는
 * 순수 모듈이라 ReactNode를 들 수 없어 연결은 여기서 한다(아이콘 맵과 같은 이유).
 */
const GUIDE_EXAMPLES: Record<GuideSectionId, ReactNode> = {
    flow: <FlowExample />,
    'match-rooms': <MatchRoomCardExample />,
    'my-match-rooms': <RoomInviteExample />,
    'personal-matches': <PersonalMatchExample />,
    stages: <StageStepper />,
    terms: <MemberRolesExample />,
}

/**
 * 사용 가이드(Week 57 — Week 39에 지운 것을 되살렸다). `(main)` 안에 두어 헤더·사이드바가 남는다 —
 * 미들웨어 보호 목록에 없어 비로그인도 열리고, 레이아웃은 user 없이도 렌더된다.
 * 문구는 `lib/guide/sections.ts`가 단일 출처이고 세 목록 화면의 인라인 설명이 같은 것을 읽는다.
 * 그림은 캡처가 아니라 실제 카드·배지를 더미 데이터(`lib/guide/fixtures.ts`)로 그린 것이다(Week 58).
 */
export default function GuidePage() {
    return (
        <PageContainer>
            <GuideHashScroll />
            <PageHeader
                title="사용 가이드"
                description="매칭을 열고, 참가하고, 결과를 확인하는 순서대로 정리했습니다"
            />
            {/* 전폭 — 예시가 실제 목록 카드와 같은 폭으로 그려져야 그림이 화면과 같다(Week 58의 세로 적층 결정과 같은 이유) */}
            <div className="space-y-6">
                {GUIDE_SECTIONS.map((section) => (
                    <GuideSectionCard key={section.id} section={section} example={GUIDE_EXAMPLES[section.id]} />
                ))}
            </div>
        </PageContainer>
    )
}
