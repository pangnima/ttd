/**
 * RPC가 raise한 식별자 → 사용자 문구 (E2E F-pre-2).
 *
 * Supabase는 오류 메시지를 래핑해 돌려주므로 정확 일치가 아니라 `includes`로 찾는다. 그러면 한 키가 다른 키의
 * 부분 문자열일 때(`not_room_member` ⊂ `target_not_room_member`, `result_already_confirmed` ⊂ `…_by_seat`)
 * 목록 순서에 따라 짧은 쪽이 먼저 걸린다 — 액션마다 "긴 키를 앞에 둬라"·"길이순 정렬"로 따로 지키고 있었다.
 * 여기서는 포함된 키 중 **가장 긴 것**을 고른다. 가장 긴 키가 가장 구체적인 키다.
 */
export type ErrorMapEntry = readonly [key: string, message: string]

export function findKnownError(message: string, map: ReadonlyArray<ErrorMapEntry>): ErrorMapEntry | undefined {
    let best: ErrorMapEntry | undefined
    for (const entry of map) {
        if (!message.includes(entry[0])) continue
        if (!best || entry[0].length > best[0].length) best = entry
    }
    return best
}

export function translateError(message: string, map: ReadonlyArray<ErrorMapEntry>, fallback: string): string {
    return findKnownError(message, map)?.[1] ?? fallback
}
