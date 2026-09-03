import type { PersonalMatch } from '@/types'
import { hasResult, resolveSetWinner, type SettledPersonalMatch } from './winner'

/**
 * 동호인 경기: 세트 1개 = 게임 1개. 통계 집계용으로 멀티 세트 레코드를
 * 세트별 가상 PersonalMatch로 분해한다. 각 가상 경기는 단일 세트와 그 세트의
 * winner를 가지며, id는 `${원본id}#${세트인덱스}`로 유일하다.
 *
 * 결과 미확정(세트 없음) 레코드는 여기서 제외된다 — 통계·레이팅·AI 코칭이 모두
 * 이 함수를 거치므로, 미확정 제외는 이 한 곳이 단일 초크포인트다.
 *
 * 표시(목록/카드/미리보기)에는 원본 레코드를 쓰고, 이 함수의 결과는 통계/레이팅
 * 경로에만 쓴다. 분해본을 입력으로 받으면 기존 per-record 집계 함수가 수정 없이
 * 게임 단위 집계가 된다.
 */
export function explodePersonalMatchSets(matches: PersonalMatch[]): SettledPersonalMatch[] {
    const out: SettledPersonalMatch[] = []
    for (const m of matches) {
        if (!hasResult(m)) continue  // 결과 미확정은 집계 대상이 아님
        m.setScores.forEach((s, i) => {
            out.push({
                ...m,
                id: `${m.id}#${i}`,
                setScores: [s],
                winner: resolveSetWinner(s),
            })
        })
    }
    return out
}
