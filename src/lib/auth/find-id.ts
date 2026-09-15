/**
 * 아이디 찾기(0086) — `find_login_id` RPC의 jsonb를 화면이 분기할 수 있는 판별 유니언으로.
 *
 * 마스킹은 DB가 했다(anon RPC라 원문이 나가면 안 된다) — 여기서는 모양만 검사한다.
 * 모르는 모양은 전부 `none`으로 접는다: 화면이 "일치하는 회원이 없습니다"라 말하는 쪽이
 * 잘못된 카드를 그리는 것보다 낫다.
 */

export type FindIdResult =
    | { kind: 'login_id'; masked: string }
    | { kind: 'email_only' }
    | { kind: 'social'; provider: string }
    | { kind: 'none' }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

export function parseFindIdResult(json: unknown): FindIdResult {
    if (!isRecord(json)) return { kind: 'none' }
    switch (json.kind) {
        case 'login_id':
            return typeof json.masked === 'string' && json.masked.length > 0
                ? { kind: 'login_id', masked: json.masked }
                : { kind: 'none' }
        case 'email_only':
            return { kind: 'email_only' }
        case 'social':
            return { kind: 'social', provider: typeof json.provider === 'string' ? json.provider : '' }
        default:
            return { kind: 'none' }
    }
}
