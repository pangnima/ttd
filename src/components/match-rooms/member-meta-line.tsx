import { memberMetaLine, type MemberRowView } from '@/lib/match-rooms/members-view'
import { TYPO } from '@/lib/dashboard/tokens'

type Props = { row: MemberRowView }

/**
 * 명단 행의 둘째 줄 — 닉네임·주력손·라켓.
 *
 * NTRP는 이 줄이 아니라 첫 줄의 이름 옆에 붙는다(RoomMemberRow) — 실력은 사람을 고르는 기준이라
 * 이름과 한 덩어리로 읽혀야 하고, 이 줄은 있으면 좋은 부가 정보다.
 *
 * 한 줄 고정(`truncate`)인 것은 의도다 — 행 높이가 사람마다 달라지면 명단 스캔이 깨진다.
 * 비회원·탈퇴 회원은 메타가 없어 이 줄이 통째로 사라진다.
 */
export function MemberMetaLine({ row }: Props) {
    // 탈퇴 회원은 익명화 대상이라 장비·닉네임을 남기지 않는다
    if (row.deleted) return null
    const meta = memberMetaLine(row)
    if (!meta) return null

    return <p className={`${TYPO.caption} truncate`}>{meta}</p>
}
