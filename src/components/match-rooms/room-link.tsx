import Link from 'next/link'

type Props = { roomId: string; className?: string }

/** 개인 경기·로테이션 세션 카드에서 리스트에 노출된 방으로 가는 한 줄 링크 */
export function RoomLink({ roomId, className }: Props) {
    return (
        <Link href={`/match-rooms/${roomId}`} className={`text-caption text-primary hover:underline ${className ?? ''}`}>
            경기 리스트에서 보기
        </Link>
    )
}
