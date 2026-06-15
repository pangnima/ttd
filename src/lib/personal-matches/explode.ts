import type { PersonalMatch } from '@/types'
import { resolveSetWinner } from './winner'

/**
 * 동호인 경기: 세트 1개 = 게임 1개. 통계 집계용으로 멀티 세트 레코드를
 * 세트별 가상 PersonalMatch로 분해한다. 각 가상 경기는 단일 세트와 그 세트의
 * winner를 가지며, id는 `${원본id}#${세트인덱스}`로 유일하다.
 *
 * 표시(목록/카드/미리보기)에는 원본 레코드를 쓰고, 이 함수의 결과는 통계/레이팅
 * 경로에만 쓴다. 분해본을 입력으로 받으면 기존 per-record 집계 함수가 수정 없이
 * 게임 단위 집계가 된다.
 */
export function explodePersonalMatchSets(matches: PersonalMatch[]): PersonalMatch[] {
    const out: PersonalMatch[] = []
    for (const m of matches) {
        const sets = m.setScores ?? []
        if (sets.length === 0) {
            out.push(m) // 방어적: 세트 없으면 원본 유지
            continue
        }
        sets.forEach((s, i) => {
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
