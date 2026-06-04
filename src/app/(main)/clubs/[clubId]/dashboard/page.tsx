import { redirect } from 'next/navigation'

type Props = {
    params: Promise<{ clubId: string }>
}

/**
 * 클럽 대시보드는 클럽 홈(/clubs/[clubId])으로 통합되었습니다.
 * 이 페이지는 기존 URL 접근자를 위한 리다이렉트만 처리합니다.
 */
export default async function ClubDashboardRedirectPage({ params }: Props) {
    const { clubId } = await params
    redirect(`/clubs/${clubId}`)
}
