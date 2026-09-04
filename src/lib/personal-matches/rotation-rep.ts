import type { RotationPoolPlayer } from '@/types'

/**
 * 방 로테이션 게임의 상대팀 대표 확인자 결정 (순수 함수, 0050).
 *
 * 방 세션의 finalize는 게임마다 상호 확인 경기(match_requests)를 만든다. 대표는 상대1 → 상대2 순으로
 * 찾은 회원이고, 상대2가 대표면 슬롯을 스왑한다 — confirm-flow.ts의 resolveConfirmRep과 같은 규칙이며
 * SQL finalize_rotation_session의 대표 결정 블록과 1:1로 대응한다(세 사본의 규칙을 이 파일이 고정한다).
 *
 * null이면 상대팀에 회원이 없어 확인해 줄 사람이 없다는 뜻 — 그 게임은 즉시 확정으로 저장된다.
 */

export type RotationRep = {
    repUserId: string
    opponent2: RotationPoolPlayer  // 상대팀에서 대표가 아닌 쪽
    swapped: boolean               // 상대2가 대표라 슬롯을 바꿨는지
}

function memberId(p: RotationPoolPlayer | undefined): string | undefined {
    return p?.userId || undefined
}

export function resolveRotationRep(
    opp1: RotationPoolPlayer | undefined,
    opp2: RotationPoolPlayer | undefined,
): RotationRep | null {
    const id1 = memberId(opp1)
    if (id1 && opp2) return { repUserId: id1, opponent2: opp2, swapped: false }
    const id2 = memberId(opp2)
    if (id2 && opp1) return { repUserId: id2, opponent2: opp1, swapped: true }
    return null
}

/** 방 세션에서 즉시 확정(대표 없음)으로 저장될 게임인지 — 빌더 안내 문구용 */
export function isImmediateGame(opp1: RotationPoolPlayer | undefined, opp2: RotationPoolPlayer | undefined): boolean {
    return resolveRotationRep(opp1, opp2) === null
}
