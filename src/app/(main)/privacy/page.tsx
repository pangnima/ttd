import Link from 'next/link'
import { LegalPage } from '@/components/legal/legal-page'
import { ADMIN_CONTACT_EMAIL } from '@/lib/auth/password-reset-mode'
import { TEXT_LINK, TYPO } from '@/lib/dashboard/tokens'
import { PRIVACY_SECTIONS } from '@/lib/legal/privacy'

export const metadata = { title: '개인정보처리방침' }

/**
 * 개인정보처리방침(Week 70) — 공개 페이지. 문의 연락처는 비밀번호 찾기 안내와 같은 `ADMIN_CONTACT_EMAIL`을 쓴다
 * (운영자 주소가 바뀌면 한 곳만 고친다).
 */
export default function PrivacyPage() {
    return (
        <LegalPage
            title="개인정보처리방침"
            description="어떤 정보를 왜 모으고 어떻게 지키는지"
            sections={PRIVACY_SECTIONS}
            footer={(
                <div className="space-y-1">
                    <p className={TYPO.body2}>
                        개인정보 보호책임자: 서비스 운영자
                        {ADMIN_CONTACT_EMAIL && (
                            <>
                                {' · '}
                                <a href={`mailto:${ADMIN_CONTACT_EMAIL}`} className={TEXT_LINK}>{ADMIN_CONTACT_EMAIL}</a>
                            </>
                        )}
                    </p>
                    <p className={TYPO.body2Muted}>
                        서비스 이용 조건은 <Link href="/terms" className={TEXT_LINK}>이용약관</Link>을 참고해 주세요.
                    </p>
                </div>
            )}
        />
    )
}
