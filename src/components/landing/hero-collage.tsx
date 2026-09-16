import { CheckCircle2 } from 'lucide-react'

import { MatchRoomCard } from '@/components/match-rooms/match-room-card'
import { PersonalMatchCard } from '@/components/personal-matches/personal-match-card'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { GUIDE_LIST_ROOMS, GUIDE_LIST_TURNS, GUIDE_PERSONAL_MATCH } from '@/lib/guide/fixtures'
import { cn } from '@/lib/utils'

/** 떠 있는 체크 필 — 기능 섹션과 같은 어휘. lg에서만 절대 위치, 그 아래는 카드 밑에 가로로 감긴다 */
const PILLS = [
    { label: '자동 대진표', position: 'lg:absolute lg:-left-10 lg:top-6' },
    { label: '결과 상호 확인', position: 'lg:absolute lg:-left-4 lg:bottom-16' },
    { label: '승률 · NTRP 티어', position: 'lg:absolute lg:-right-4 lg:-bottom-4' },
] as const

/**
 * 히어로 우측 콜라주(Week 65) — 캡처가 아니라 **실제 카드 컴포넌트를 가이드 픽스처로** 그린다(Week 58의
 * 원칙: 테마·반응형이 공짜이고 UI가 바뀌면 tsc·fixtures.test가 잡는다). 매칭 리스트 카드 2장이 가운데,
 * 확정된 경기 카드와 체크 필이 그 둘레에 떠 있고 뒤에는 옐로우 글로우 — 색은 `spot-solid` 토큰 알파뿐이다.
 * `inert`가 클릭·포커스·접근성 트리를 끊으므로 sr-only 한 줄이 그림의 설명을 맡는다.
 */
export function HeroCollage() {
    return (
        <div className="relative isolate text-left lg:px-10 lg:py-8">
            <p className="sr-only">매칭 리스트 카드와 확정된 경기 카드 미리보기</p>
            <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-full max-w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-spot-solid/30 blur-3xl"
            />
            <div inert aria-hidden className="pointer-events-none select-none">
                <div className={cn(CARD_BASE, 'mx-auto max-w-md divide-y divide-border')}>
                    {GUIDE_LIST_ROOMS.map((room) => (
                        <MatchRoomCard key={room.id} room={room} turn={GUIDE_LIST_TURNS.get(room.id)} />
                    ))}
                </div>

                <div className={cn(CARD_BASE, 'mx-auto mt-4 max-w-md lg:absolute lg:right-0 lg:-top-24 lg:mx-0 lg:mt-0 lg:w-72')}>
                    <PersonalMatchCard match={GUIDE_PERSONAL_MATCH} />
                </div>

                <ul className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2 lg:contents">
                    {PILLS.map((pill) => (
                        <li
                            key={pill.label}
                            className={cn(CARD_BASE, 'flex items-center gap-2 px-3 py-2', pill.position)}
                        >
                            <CheckCircle2 className="size-4 text-spot-solid" />
                            <span className={TYPO.captionStrong}>{pill.label}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
