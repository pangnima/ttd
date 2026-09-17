import type { ReactNode } from 'react'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { LEGAL_EFFECTIVE_DATE, type LegalSection } from '@/lib/legal/legal-section'

type Props = {
    title: string
    description: string
    sections: LegalSection[]
    /** 본문 아래 연락처 등 — 문구 데이터가 ReactNode(mailto 링크)를 들 수 없어 여기서 받는다 */
    footer?: ReactNode
}

/**
 * 약관·개인정보처리방침 공용 골격(Week 70). `/guide`처럼 `(main)` 안에 두어 헤더·사이드바가 남고 비로그인도 열린다
 * (미들웨어 보호 목록에 없다). 문구는 `lib/legal/*`이 데이터로 들고 이 컴포넌트는 조·문단·항목만 그린다.
 */
export function LegalPage({ title, description, sections, footer }: Props) {
    return (
        <PageContainer>
            <PageHeader title={title} description={`${description} · 시행일 ${LEGAL_EFFECTIVE_DATE}`} />
            <article className={`${CARD_BASE} p-5 sm:p-6 space-y-6 max-w-3xl`}>
                {sections.map((section, i) => (
                    <section key={section.title} id={`s${i + 1}`} className="space-y-2">
                        <h2 className={`${TYPO.h4} break-keep`}>{section.title}</h2>
                        {section.paragraphs?.map((p) => (
                            <p key={p} className={`${TYPO.body2} break-keep leading-relaxed`}>{p}</p>
                        ))}
                        {section.items && (
                            <ul className="list-disc pl-5 space-y-1">
                                {section.items.map((item) => (
                                    <li key={item} className={`${TYPO.body2} break-keep leading-relaxed`}>{item}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}
                {footer && <div className="pt-4 border-t border-border">{footer}</div>}
            </article>
        </PageContainer>
    )
}
