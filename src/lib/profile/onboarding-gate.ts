/**
 * 소셜 가입자의 「테니스 정보 미입력」 판정 — 술어 하나로 집합을 가른다.
 *
 * 이메일 가입은 폼이 NTRP를 필수로 받지만 OAuth는 그 폼을 건너뛴다. 0084가 트리거의
 * 기본값 3.0을 걷어냈으므로 **`ntrp is null`이 그 상태의 권위 술어**가 된다.
 * (고른 적 없는 3.0이 박히면 `updateProfileAction`의 "가입 시 1회, 변경 불가" 정책 때문에
 *  본인도 영영 고칠 수 없다 — 그래서 기본값 대신 null을 쓴다.)
 *
 * 완성 화면은 `(main)` **밖**에 둔다. 게이트가 그 레이아웃에 있어서, 안에 두면 스스로를
 * 리다이렉트해 무한 루프가 된다. 서버 레이아웃은 pathname을 읽을 수 없으므로 예외 분기로
 * 빠져나갈 방법도 없다 — 라우트 그룹으로 가르는 편이 확실하다.
 */

/** 완성 화면 경로. ⚠ `/signup/...` 아래에 두면 미들웨어의 isAuthRoute가 로그인 상태를 튕겨낸다 */
export const PROFILE_ONBOARDING_PATH = '/onboarding/profile'

/** 이 사람은 테니스 정보를 아직 채우지 않았는가 */
export function needsProfileOnboarding(profile: { ntrp: number | null } | null): boolean {
    return !!profile && profile.ntrp == null
}
