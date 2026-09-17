import Link from 'next/link'
import { LegalPage } from '@/components/legal/legal-page'
import { TEXT_LINK, TYPO } from '@/lib/dashboard/tokens'
import { TERMS_SECTIONS } from '@/lib/legal/terms'

export const metadata = { title: '이용약관' }

/** 이용약관(Week 70) — 비로그인도 열리는 공개 페이지. 가입·프로필 완성 폼의 동의 문구와 랜딩 푸터가 링크한다 */
export default function TermsPage() {
    return (
        <LegalPage
            title="이용약관"
            description="서비스를 이용하기 전에 확인해 주세요"
            sections={TERMS_SECTIONS}
            footer={(
                <p className={TYPO.body2Muted}>
                    개인정보의 수집·이용에 관한 내용은{' '}
                    <Link href="/privacy" className={TEXT_LINK}>개인정보처리방침</Link>
                    에서 따로 안내합니다.
                </p>
            )}
        />
    )
}
