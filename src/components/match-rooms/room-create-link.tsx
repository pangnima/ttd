import Link from 'next/link'
import { HEADER_ACTION_LINK } from '@/lib/dashboard/tokens'

/**
 * [+ 매칭 만들기] — 두 목록 화면(매칭 리스트 · 참여 중인 매칭)이 함께 쓴다.
 *
 * 페이지 헤더의 actions 슬롯이 아니라 **탭 바 바로 위**에 놓인다. 헤더는 "이 화면이 무엇인가"를
 * 말하는 자리이고, 만들기는 아래 목록에 딸린 행동이라 탭과 한 묶음(space-y-3)으로 읽히는 편이 낫다.
 * 모양은 내 경기 결과의 [직접 기록]과 같은 토큰(HEADER_ACTION_LINK)이다 —
 * 같은 성격의 버튼이 화면마다 다른 형태였던 것을 맞췄다.
 */
export function RoomCreateLink() {
    return (
        <div className="flex justify-end">
            <Link href="/match-rooms/new" className={HEADER_ACTION_LINK}>
                + 매칭 만들기
            </Link>
        </div>
    )
}
