import Link from 'next/link'
import { TEXT_LINK } from '@/lib/dashboard/tokens'

type Props = { roomId: string; className?: string }

/** 개인 경기·로테이션 세션 카드에서 리스트에 노출된 방으로 가는 한 줄 링크 */
export function RoomLink({ roomId, className }: Props) {
    return (
        <Link href={`/match-rooms/${roomId}`} className={`text-caption ${TEXT_LINK} ${className ?? ''}`}>
            매칭 룸 보기
        </Link>
    )
}
