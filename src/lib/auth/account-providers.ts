/**
 * 이 계정이 어떤 방법으로 로그인하는가 — 순수 판정.
 *
 * Supabase는 같은 사실을 두 자리에 담는다: `user.identities`(auth.identities의 투영)와
 * `user.app_metadata.providers`(GoTrue가 같은 행에서 파생). **둘 다 optional**이라 하나에만
 * 걸면 신호가 비었을 때 오판한다. 그래서 합집합으로 읽는다.
 *
 * ⚠ **모르면 "비밀번호 있음"으로 떨어진다.** 신호가 비었다고 기존 이메일 회원에게서 비밀번호
 * 변경을 빼앗으면 안 되기 때문이다 — 여기서는 fail-open이 안전한 방향이다.
 */

/** `auth.identities`에서 비밀번호를 쥔 identity의 provider 이름 */
export const PASSWORD_PROVIDER = 'email'

export type ProviderSignals = {
    /** `user.identities` */
    identities?: ReadonlyArray<{ provider: string }> | null
    /** `user.app_metadata.providers` */
    providers?: readonly string[] | null
}

const PROVIDER_LABELS: Readonly<Record<string, string>> = {
    google: '구글',
    kakao: '카카오',
}

/** 두 신호를 합친 provider 목록(중복 제거). 둘 다 비면 빈 배열 = "모른다" */
export function authProviders(signals: ProviderSignals): string[] {
    const merged = [
        ...(signals.identities ?? []).map((i) => i.provider),
        ...(signals.providers ?? []),
    ].filter((p): p is string => typeof p === 'string' && p.length > 0)
    return [...new Set(merged)]
}

/** 비밀번호로 로그인할 수 있는 계정인가. 신호가 없으면 true(위 fail-open 주석 참고) */
export function hasPasswordIdentity(signals: ProviderSignals): boolean {
    const providers = authProviders(signals)
    return providers.length === 0 || providers.includes(PASSWORD_PROVIDER)
}

/** 소셜로만 로그인하는 계정인가 — `hasPasswordIdentity`의 여집합 */
export function isSocialOnlyAccount(signals: ProviderSignals): boolean {
    return !hasPasswordIdentity(signals)
}

/**
 * 문장 속에 넣을 provider 이름('구글'). 모르는 provider면 null.
 * 버튼 문안(`social-login-buttons.tsx`의 'Google로 계속하기')과 합치지 않는다 — 쓰임이 다르다.
 */
export function socialProviderLabel(signals: ProviderSignals): string | null {
    for (const provider of authProviders(signals)) {
        const label = providerLabel(provider)
        if (label) return label
    }
    return null
}

/** provider 식별자 하나의 표시명 — 아이디 찾기(0086)처럼 신호 없이 이름만 있을 때 */
export function providerLabel(provider: string): string | null {
    return PROVIDER_LABELS[provider] ?? null
}
