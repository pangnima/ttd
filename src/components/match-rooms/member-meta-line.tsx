import { memberMetaLine, type MemberRowView } from '@/lib/match-rooms/members-view'
import { PILL_BASE, TYPO } from '@/lib/dashboard/tokens'

type Props = { row: MemberRowView }

/**
 * 명단 행의 둘째 줄 — NTRP 배지 + 닉네임·주력손·라켓.
 *
 * NTRP를 우측 클러스터가 아니라 이 줄 맨 앞 `shrink-0`에 두는 이유: 우측에 셋(NTRP·상태·강퇴)을
 * 세우면 좁은 화면에서 이름이 두세 글자로 잘린다. 이 배치라면 NTRP는 어떤 폭에서도 잘리지 않고,
 * 잘리는 것은 언제나 가장 덜 중요한 라켓 모델명이다.
 *
 * 한 줄 고정(`truncate`)인 것도 의도다 — 행 높이가 사람마다 달라지면 명단 스캔이 깨진다.
 * 비회원·탈퇴 회원은 메타가 없어 이 줄이 통째로 사라진다.
 */
export function MemberMetaLine({ row }: Props) {
    // 탈퇴 회원은 익명화 대상이라 실력·장비를 남기지 않는다
    if (row.deleted) return null
    const meta = memberMetaLine(row)
    if (row.ntrp == null && !meta) return null

    return (
        <p className="flex items-center gap-1.5 min-w-0">
            {row.ntrp != null && (
                <span className={`${PILL_BASE} ${TYPO.micro} shrink-0 border-border text-foreground tabular-nums`}>
                    NTRP {row.ntrp.toFixed(1)}
                </span>
            )}
            {meta && <span className={`${TYPO.caption} truncate`}>{meta}</span>}
        </p>
    )
}
