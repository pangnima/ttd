import type { MatchType, PersonalMatch } from '@/types'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'
import { isNtrpValid, isPlayerFilled } from './validators'

/**
 * 라인업(참가자 슬롯) 판정 — 모집형 방(리스트에 노출 + 참가자 비움)에서 쓰는 순수 규칙.
 *  - 빈 슬롯: 회원 연결도 이름도 없음 (손잡이만 눌린 상태는 빈 슬롯으로 본다 — 이름 없이 손잡이만 저장할 일이 없다)
 *  - 부분 입력 슬롯은 기존 규칙(isPlayerFilled + NTRP)을 그대로 요구한다
 *  - 라인업 완성: 단식 상대 / 복식 파트너·상대1·상대2 이름이 모두 있음 — 결과 입력은 완성 후에만
 */
export function isSlotEmpty(p: PlayerPickerValue): boolean {
    return !p.userId && !p.name.trim()
}

/** 슬롯 1개 유효성 — allowEmpty면 빈 슬롯 통과, 아니면 선수 입력 완료 + (숨김이 아닐 때) NTRP */
export function isSlotOk(p: PlayerPickerValue, ntrp: string, allowEmpty: boolean, ntrpHidden = false): boolean {
    if (allowEmpty && isSlotEmpty(p)) return true
    return isPlayerFilled(p) && (ntrpHidden || isNtrpValid(ntrp))
}

export type LineupSource = {
    matchType: MatchType
    opponentName: string
    partnerName?: string
    opponent2Name?: string
}

export function isLineupComplete(m: LineupSource): boolean {
    if (!m.opponentName.trim()) return false
    if (m.matchType === 'singles') return true
    return !!m.partnerName?.trim() && !!m.opponent2Name?.trim()
}

/** DB 참가자 role 목록 기준 완성 판정 (서버 액션용 — 이름은 행이 있으면 항상 있다) */
export function isLineupCompleteByRoles(matchType: MatchType, roles: string[]): boolean {
    const has = (r: string) => roles.includes(r)
    if (!has('opponent')) return false
    if (matchType === 'singles') return true
    return has('partner') && has('opponent2')
}

/**
 * 리스트에 노출됐고 결과·참가자가 아직 없는 '모집 중' 기록.
 * 결과 유무 판정은 winner.ts hasResult와 같은 규칙(세트 배열 비어 있음)이지만, 여기서는 부분 타입만 받으므로 직접 본다.
 */
export function isRecruiting(
    m: Pick<PersonalMatch, 'roomId' | 'setScores' | 'matchType' | 'opponentName' | 'partnerName' | 'opponent2Name'>,
): boolean {
    return !!m.roomId && m.setScores.length === 0 && !isLineupComplete(m)
}
