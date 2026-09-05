/**
 * 매칭 리스트 커서 페이지네이션 — keyset `(played_at, played_time, id)`.
 *
 * offset 대신 keyset을 쓰는 이유: 목록은 `played_at` 내림/오름차순으로 계속 자라고,
 * 페이지를 넘기는 사이에 방이 추가·정산되면 offset은 행을 건너뛰거나 중복시킨다.
 *
 * 정렬 3열을 그대로 커서에 담는다 — 커서와 ORDER BY가 어긋나면 페이지 경계에서
 * 행이 새거나 겹치므로 **여기서 만드는 술어와 쿼리의 order는 항상 같이 바뀌어야 한다.**
 * `played_time`은 nullable이고 정렬은 asc=NULLS FIRST / desc=NULLS LAST(= 기존
 * `sortKey`의 `playedTime ?? ''` 규칙과 동치)라, null 커서는 별도 분기로 처리한다.
 */

export type RoomCursor = {
    /** 'YYYY-MM-DD' */
    playedAt: string
    /** DB 원본 'HH:MM:SS' (표시용 'HH:MM'로 자르기 전 값 — 필터 비교가 어긋나면 안 된다) */
    playedTime?: string
    id: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `2026-09-05_18:00:00_<uuid>` (시각 없으면 가운데가 빈 칸). 세 값 모두 `_`를 포함하지 않는다 */
export function encodeRoomCursor(c: RoomCursor): string {
    return `${c.playedAt}_${c.playedTime ?? ''}_${c.id}`
}

/**
 * URL 쿼리 → 커서. **형식 검증이 곧 보안 경계다** — 이 값이 PostgREST `or()` 문자열에
 * 그대로 들어가므로, 쉼표·괄호가 섞인 값을 통과시키면 필터식이 조작된다.
 * 조금이라도 어긋나면 null을 돌려 첫 페이지로 떨어뜨린다.
 */
export function parseRoomCursor(raw?: string | null): RoomCursor | null {
    if (!raw) return null
    const parts = raw.split('_')
    if (parts.length !== 3) return null
    const [playedAt, playedTime, id] = parts
    if (!DATE_RE.test(playedAt) || !UUID_RE.test(id)) return null
    if (playedTime !== '' && !TIME_RE.test(playedTime)) return null
    return { playedAt, id, ...(playedTime ? { playedTime } : {}) }
}

/**
 * 커서 다음 행들의 PostgREST `or()` 술어.
 * asc(진행 중, 가까운 순) / desc(종료, 최근순) 각각 위 정렬과 짝을 이룬다.
 */
export function roomKeysetFilter(c: RoomCursor, direction: 'asc' | 'desc'): string {
    const { playedAt: d, playedTime: t, id } = c
    const cmp = direction === 'asc' ? 'gt' : 'lt'
    const parts = [`played_at.${cmp}.${d}`]

    if (direction === 'asc') {
        // NULLS FIRST — 시각 없는 방이 앞. 커서가 null이면 같은 날짜의 시각 있는 방이 전부 남아 있다
        if (t) {
            parts.push(`and(played_at.eq.${d},played_time.gt.${t})`)
            parts.push(`and(played_at.eq.${d},played_time.eq.${t},id.gt.${id})`)
        } else {
            parts.push(`and(played_at.eq.${d},played_time.not.is.null)`)
            parts.push(`and(played_at.eq.${d},played_time.is.null,id.gt.${id})`)
        }
    } else {
        // NULLS LAST — 시각 없는 방이 뒤. 커서가 시각을 가지면 같은 날짜의 시각 없는 방이 남아 있다
        if (t) {
            parts.push(`and(played_at.eq.${d},played_time.lt.${t})`)
            parts.push(`and(played_at.eq.${d},played_time.eq.${t},id.lt.${id})`)
            parts.push(`and(played_at.eq.${d},played_time.is.null)`)
        } else {
            parts.push(`and(played_at.eq.${d},played_time.is.null,id.lt.${id})`)
        }
    }
    return parts.join(',')
}
