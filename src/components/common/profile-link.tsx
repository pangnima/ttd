import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
    /** 대상 유저 ID */
    userId: string
    /** 게스트 여부. true면 링크 비활성화(plain span 렌더) */
    isGuest: boolean
    /** 링크 또는 span 안에 렌더할 콘텐츠 */
    children: ReactNode
    className?: string
    /** 클럽 컨텍스트가 있을 경우 ?clubId= 쿼리 파라미터 추가 */
    clubId?: string
}

/**
 * 유저 프로필 링크 공용 컴포넌트.
 * 게스트(isGuest=true)면 링크 없이 plain span을 렌더한다.
 */
export function ProfileLink({ userId, isGuest, children, className, clubId }: Props) {
    if (isGuest) {
        return <span className={className}>{children}</span>
    }

    const href = clubId
        ? `/profile/${userId}?clubId=${clubId}`
        : `/profile/${userId}`

    return (
        <Link href={href} className={className}>
            {children}
        </Link>
    )
}
