import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { CARD_BASE } from '@/lib/dashboard/tokens'
import { GUIDE_SCREEN_SECTIONS, guideAnchorHref, type GuideScreenId } from '@/lib/guide/sections'
import { cn } from '@/lib/utils'
import { GuideText } from '@/components/guide/guide-text'

type Props = {
    id: GuideScreenId
    /** 펼친 채로 시작 — 호출부가 "이 화면을 아직 써 본 적 없음"을 서버 데이터로 판정해 넘긴다 */
    open?: boolean
}

/**
 * 목록 화면 상단의 인라인 사용법(Week 57) — 가이드 페이지와 **같은 문구**(`lib/guide/sections.ts`)를 읽는다.
 *
 * 네이티브 `<details>`라 서버 컴포넌트로 남고 상태·localStorage가 없다(선례: 로테이션 풀 편집 블록).
 * 상시 노출 블록은 카드가 빽빽한 화면을 시끄럽게 하므로 한 줄로 접어 두고, 처음 온 사람에게만 펼친다 —
 * 권장 경기 수 안내가 "같으면 caption 한 줄, 다르면 블록"으로 크기를 바꾸는 것과 같은 규칙이다.
 */
export function PageGuide({ id, open = false }: Props) {
    const section = GUIDE_SCREEN_SECTIONS[id]
    return (
        <details open={open} className={cn(CARD_BASE, 'px-4 py-3')}>
            <summary className="cursor-pointer text-body2 font-medium text-foreground break-keep">
                이 화면 사용법
                <span className="font-normal text-muted-foreground"> — <GuideText text={section.summary} /></span>
            </summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-body2 text-muted-foreground break-keep">
                {section.steps.map((step, i) => (
                    <li key={i}><GuideText text={step} /></li>
                ))}
            </ol>
            <Link
                href={guideAnchorHref(id)}
                className="mt-3 inline-flex items-center gap-1 text-body2 font-medium text-primary hover:underline"
            >
                전체 가이드
                <ArrowRight className="size-4" />
            </Link>
        </details>
    )
}
