# 소셜 로그인(구글·카카오) 도입 계획

> 이 문서는 **아직 구현되지 않은** 기능의 실행 계획서다. 처음 붙이는 사람이 이 문서만 보고 끝까지 갈 수 있도록,
> **콘솔에서 손으로 할 일**과 **코드로 할 일**을 갈라 적는다.
> 조사 시점(2026-09, Week 52) 기준이며 코드 근거는 `파일:줄`로, 문서 근거는 Supabase 공식 문서 URL로 표시했다.
> ⚠ 구글·카카오 개발자 콘솔의 **메뉴 이름은 바뀔 수 있다**. 이름이 다르면 같은 뜻의 항목을 찾으면 된다.

관련: `CLAUDE.md`의 「Week 52 잔여」, 1단계(가입 입력 규칙)는 마이그레이션 0079·0080으로 **완료됨**.

---

## 1. 먼저 — OAuth가 실제로 어떻게 도는가

「구글로 로그인」 버튼 하나에 **세 당사자**가 관여한다. 이 그림을 머리에 넣으면 나머지는 설정 채우기다.

```
 [1] 사용자가 우리 앱에서 [Google] 클릭
        │
        ▼
 [2] 우리 앱(Server Action)이 Supabase에게 "구글 로그인 주소 하나 줘" → 그 주소로 브라우저를 보냄
        │
        ▼
 [3] Google 로그인 화면 (구글 서버) — 사용자가 계정 선택 + 동의
        │
        ▼
 [4] Google이 **Supabase의 주소**로 되돌려보냄
     https://xiwwbgltkbvxdzxxxoba.supabase.co/auth/v1/callback
        │                                  ↑ 이 주소를 Google 콘솔에 등록해 둬야 한다
        ▼
 [5] Supabase가 사용자를 만들고(또는 기존 사용자에 연결하고),
     **우리 앱의 주소**로 `?code=...`를 붙여 되돌려보냄
     http://localhost:3000/auth/callback?code=xxxx
        │                  ↑ 이 주소를 Supabase 대시보드에 등록해 둬야 한다
        ▼
 [6] 우리 앱의 /auth/callback 이 code를 세션으로 바꿔 쿠키에 심는다
     supabase.auth.exchangeCodeForSession(code)
        │
        ▼
 [7] 로그인 완료 → 원래 가려던 곳으로 보낸다
```

### 가장 헷갈리는 지점 — **URL이 두 종류다**

| 어디에 등록? | 무슨 주소? | 이 프로젝트의 값 |
|---|---|---|
| **Google/Kakao 콘솔**의 Redirect URI | **Supabase**의 주소 | `https://xiwwbgltkbvxdzxxxoba.supabase.co/auth/v1/callback` |
| **Supabase 대시보드**의 Redirect URLs | **우리 앱**의 주소 | `http://localhost:3000/**`, `https://<배포도메인>/**` |

둘을 바꿔 넣으면 `redirect_uri_mismatch`(구글) 또는 로그인 후 엉뚱한 곳으로 튕긴다. **[4]는 구글→Supabase, [5]는 Supabase→우리 앱**이라는 것만 기억하면 된다.

### 용어

| 용어 | 뜻 |
|---|---|
| **provider** | 로그인을 대신 해 주는 쪽. `google`, `kakao` |
| **Client ID / Client Secret** | 우리 앱이 provider에게 자신을 증명하는 아이디·비밀번호. provider 콘솔에서 발급받아 **Supabase 대시보드에 붙여넣는다**. 우리 코드나 `.env`에는 넣지 않는다 |
| **Redirect URI / Callback URL** | 로그인이 끝난 뒤 되돌아올 주소. 위 표 참고 |
| **code** | [5]에서 넘어오는 일회용 교환권. 이것만으로는 로그인이 아니고, `exchangeCodeForSession`으로 세션과 바꿔야 한다 |
| **PKCE** | code를 가로채도 쓰지 못하게 하는 방식. `@supabase/ssr`의 기본값이라 **우리가 따로 설정할 것이 없다**(`src/lib/supabase/client.ts`에 `flowType` 설정이 없는 것이 그 뜻이다) |
| **identity** | "이 사용자는 구글로도 로그인한다"는 연결 기록. 한 사용자가 여러 identity(비밀번호·구글·카카오)를 가질 수 있다 |

---

## 2. 이 프로젝트에서 어려운 건 배선이 아니다 — **빈 프로필**

위 [1]~[7]은 어느 Next.js 앱이나 같고 코드도 짧다. **이 프로젝트가 갈리는 지점은 그 다음**이다.

이 앱의 회원가입 폼은 계정 정보만 받는 게 아니라 **NTRP·성별·주력손·시작일·라켓**을 함께 받는다. 그런데 소셜 로그인은 그 폼을 통째로 건너뛴다. 현재 코드에서 무슨 일이 벌어지는지 보면:

| 코드 | 지금 동작 | 결과 |
|---|---|---|
| `handle_new_user`의 `coalesce(nullif(...'ntrp'...), 3.0)` | 메타데이터에 ntrp가 없으면 **3.0을 박는다** | 고른 적 없는 실력이 프로필에 남는다 |
| `src/lib/actions/profile.ts:44-45` 주석 | *"이름·성별·주력손·시작일·NTRP는 가입 시 1회 입력, 변경 불가 — update 대상에서 제외"* | **본인도 고칠 수 없다** |
| `users.email`이 **NOT NULL** + 트리거가 `new.email`을 그대로 사용 | 카카오는 이메일이 없을 수 있다 | 트리거가 터지고 **같은 트랜잭션이라 가입 전체가 롤백** |
| 탈퇴 차단(`src/lib/actions/auth.ts:25-36`)이 `loginAction`에만 있음 | OAuth 경로는 그 검사를 지나지 않는다 | 익명화된 「탈퇴한 회원」이 **그대로 로그인된다** |
| `nickname` 폴백 = 이메일 앞부분 | `hong@gmail.com` → 닉네임 `hong` | 본인이 정하지 않은 닉네임이 헤더에 노출 |

NTRP는 레이팅·티어·통계의 입력값이라 3.0이 박히는 건 **데이터 오염**이고, 나중에 고치려 해도 그 회원이 진짜 3.0이었는지 알 수 없다.

> **그래서 §4(콘솔) · §5(마이그레이션) · §6(코드) · §7(프로필 완성 게이트)은 한 묶음이다.**
> 버튼만 먼저 켜 두고 게이트를 나중에 붙이면, 그 사이에 가입한 회원의 데이터는 되돌릴 수 없다.

---

## 3. 설계 결정 요약

| 항목 | 결정 | 이유 |
|---|---|---|
| 소셜 가입자의 테니스 정보 | **전용 완성 화면 강제** (`/onboarding/profile`) | 기본값을 박으면 불변 정책 때문에 영영 못 고친다 |
| 「미입력」의 판정 | **`ntrp is null`** 하나 | 술어 하나로 집합을 가르는 이 레포의 어법. 트리거에서 기본값 3.0을 없애야 성립한다 |
| 게이트 위치 | **`src/app/(main)/layout.tsx`** (미들웨어 아님) | 그 레이아웃은 **이미 users를 select**한다(`:30-36`) → 컬럼 하나 추가로 **쿼리 0회 증가**. 미들웨어에 넣으면 모든 요청에 조회가 하나씩 붙는다 |
| 완성 화면 경로 | `/onboarding/profile` | ⚠ `/signup/...` 아래에 두면 안 된다 — 미들웨어의 `isAuthRoute` 가드(`src/lib/supabase/middleware.ts:65-71`)가 **로그인 상태를 튕겨낸다** |
| 콜백 route | **새로 만든다** (`/auth/callback`) | 기존 `/auth/confirm`은 `verifyOtp({token_hash, type})`이라 파라미터 계약도 호출 API도 다르다. 그쪽은 비밀번호 재설정 메일 링크의 진입점이라 건드리면 회귀 위험 |
| `signInWithOAuth` 호출 위치 | **Server Action** | 공식 문서가 지원하는 패턴이고, 이 레포의 "쓰기는 Server Action으로만" 규칙과 맞는다. `SocialLoginButtons`를 서버 컴포넌트인 채로 둘 수 있고 `next`를 hidden input으로 실어 보내기 쉽다 |
| 카카오 이메일 | **없어도 되게 한다** + 트리거에 폴백 | 비즈 앱 전환은 운영 절차라 언제 될지 모른다. 방어를 먼저 넣어 둔다 |

---

## 4. 콘솔 설정 (코드 0줄 — 직접 하실 부분)

### 4.1 Google Cloud Console — https://console.cloud.google.com

1. 프로젝트 생성(이미 있으면 선택)
2. **OAuth consent screen(동의 화면)** 구성
   - 개인정보처리방침·이용약관 링크가 **필수**다. 아직 없다면 임시 페이지라도 필요하다
   - 앱 이름은 사용자에게 그대로 보인다("BASELINE에서 내 Google 계정에 접근하려고 합니다")
   - 외부(External) 사용자로 두면 테스트 단계에서는 **테스트 사용자로 등록한 계정만** 로그인된다. 본인 계정을 꼭 추가할 것
3. **사용자 인증 정보 → OAuth 클라이언트 ID 만들기 → 애플리케이션 유형: 웹 애플리케이션**
4. 두 칸을 채운다
   - **승인된 JavaScript 원본**: `http://localhost:3000` (그리고 배포 도메인)
   - **승인된 리디렉션 URI**: `https://xiwwbgltkbvxdzxxxoba.supabase.co/auth/v1/callback`
     → ⚠ **Supabase 주소다.** 우리 앱 주소가 아니다(§1 표)
5. 발급된 **클라이언트 ID / 클라이언트 보안 비밀번호**를 복사 → Supabase 대시보드에 붙여넣는다(§4.3)

필요한 scope는 `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` 세 개다(기본값).
`access_type=offline` / `prompt=consent`는 **구글 API(캘린더·드라이브 등)를 대신 호출할 때만** 필요하다. 우리는 로그인만 하므로 **넣지 않는다**.

> 출처: https://supabase.com/docs/guides/auth/social-login/auth-google

### 4.2 Kakao Developers — https://developers.kakao.com

카카오는 구글보다 손이 더 간다. 특히 **이메일**이 문제다.

1. 내 애플리케이션 → 애플리케이션 추가
2. **앱 설정 > 앱 키**에서 **REST API 키**를 복사 → 이것이 Supabase에 넣을 **Client ID**다
   (JavaScript 키·Native 키가 아니다)
3. **카카오 로그인**을 **활성화 ON**
4. **카카오 로그인 > 보안**에서 **Client Secret을 생성하고 「사용함」으로 활성화**
   → Supabase가 secret을 요구하므로 이 단계를 빼먹으면 로그인이 실패한다
5. **Redirect URI**에 `https://xiwwbgltkbvxdzxxxoba.supabase.co/auth/v1/callback` 등록
6. **카카오 로그인 > 일반**에서 **State: ON**
7. **동의항목** 설정
   - `profile_nickname`(닉네임), `profile_image`(프로필 사진) → 켠다
   - `account_email`(이메일) → ⚠ **비즈 앱으로 전환해야만 요청할 수 있다**
     (앱 설정 > 앱 > 일반의 **비즈니스 정보**를 채우면 전환된다)

**이메일을 못 받는 경우의 처리** — 공식 문서가 명시한다:

> "If you don't need an email address (or `account_email` isn't available for your app), you can omit `account_email` and enable **Allow users without an email** in the Supabase Kakao provider settings."

즉 **비즈 앱 전환 전에는 Supabase의 Kakao provider 설정에서 "Allow users without an email"을 켜야** 로그인이 된다. 그러면 **이메일이 없는 계정이 생기고**, `users.email`이 NOT NULL인 우리 스키마와 충돌한다 → §5의 폴백이 그래서 필요하다.

> 출처: https://supabase.com/docs/guides/auth/social-login/auth-kakao

### 4.3 Supabase 대시보드

1. **Authentication → Providers**
   - **Google**: Enable → Client ID / Client Secret 붙여넣기
   - **Kakao**: Enable → REST API 키 / Client Secret 붙여넣기 → 필요하면 **Allow users without an email** 켜기
   - 이 화면에 표시되는 **Callback URL**이 §4.1-4·§4.2-5에 넣을 바로 그 값이다(복사 버튼이 있다)
2. **Authentication → URL Configuration → Redirect URLs**에 **우리 앱 주소**를 추가
   - `http://localhost:3000/**`
   - `https://<배포도메인>/**`
   - Vercel 프리뷰까지 쓰려면 `https://*-<팀슬러그>.vercel.app/**`
   - ⚠ 지금은 `/auth/confirm`만 등록돼 있다(CLAUDE.md 배포 백로그)
3. **Site URL**은 `redirectTo`를 지정하지 않았을 때의 기본 착지점이다. 배포 도메인으로 맞춰 둔다

> 와일드카드 규칙: `*`는 구분자(`.` `/`)를 넘지 않고 `**`는 넘는다.
> 출처: https://supabase.com/docs/guides/auth/redirect-urls

---

## 5. 마이그레이션 `0081_handle_new_user_oauth.sql`

`handle_new_user`를 한 번 더 고친다. 0079가 고친 본문을 **복사해서** 이어 쓴다(0079 이전 정의를 복사하면 `phone` 빈 문자열 문제가 되살아난다 — 0078 머리말이 같은 실수를 경고한다).

⚠ **먼저 실제 값을 확인하고 쓴다.** provider가 `raw_user_meta_data`에 어떤 키를 넣는지는 **공식 문서에 없다.** 추측으로 쓰지 말고, 구글·카카오로 한 번 로그인한 다음:

```sql
select raw_user_meta_data from auth.users order by created_at desc limit 1;
select identity_data from auth.identities order by created_at desc limit 1;
```

를 읽어 키 이름을 눈으로 보고 트리거를 쓴다. (흔히 `name`·`full_name`·`avatar_url`·`picture`·`email`이 오지만 **보장은 없다**.)

바꿀 것은 셋이다.

```sql
-- (a) email 폴백 — 카카오는 이메일이 없을 수 있는데 users.email은 NOT NULL이다.
--     트리거가 auth.users INSERT와 같은 트랜잭션이라, 여기서 터지면 로그인 자체가 실패한다.
v_email := coalesce(new.email, new.id::text || '@no-email.local');

-- (b) ntrp 기본값 제거 — 'ntrp is null'이 "테니스 정보 미입력"의 권위 술어가 된다.
--     이메일 가입은 signupAction이 NTRP를 필수 검증하므로 null이 올 수 없다 → 기존 경로는 무영향.
nullif(new.raw_user_meta_data->>'ntrp', '')::numeric        -- coalesce(..., 3.0) 를 걷어낸다

-- (c) provider 프로필 매핑 (위에서 확인한 실제 키로)
coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''),
         nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
         split_part(v_email, '@', 1))                        -- name
nullif(new.raw_user_meta_data->>'avatar_url', '')            -- profile_image
```

`nickname`은 0079가 이미 「폴백이면 길이 clamp + 중복 회피」를 하고 있으므로 **그대로 두면 된다**. 다만 그 값은 임시이므로 §7의 완성 화면에서 다시 받는다.

> ⚠ `users.email`에는 UNIQUE가 없다(유일성은 `auth.users`가 쥔다). 폴백 이메일이 충돌할 일은 `new.id`가 들어가므로 없다.

---

## 6. 코드

### 6.1 `src/lib/actions/auth.ts` — `signInWithOAuthAction`

```ts
export async function signInWithOAuthAction(formData: FormData) {
    const provider = formData.get('provider')
    if (provider !== 'google' && provider !== 'kakao') redirect('/login')

    const next = formData.get('next') as string | null
    const safeNext = isSafeNext(next) ? next : ''

    // redirectTo 베이스 — requestPasswordResetAction(:219-224)과 같은 관용구를 쓴다.
    const headerStore = await headers()
    const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        headerStore.get('origin') ||
        `https://${headerStore.get('host')}`

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`,
        },
    })
    if (error || !data.url) redirect('/login?error=oauth')

    redirect(data.url)   // ⚠ redirect()는 예외를 던진다 — try/catch 안에 두면 안 된다
}
```

`isSafeNext`는 `src/lib/supabase/middleware.ts:10`에 **이미 있다**. 새로 만들지 않는다.

### 6.2 `src/components/auth/social-login-buttons.tsx` — 버튼 연결

지금은 `'use client'`도 `onClick`도 없는 **무동작 UI**다(`:8-24`). Server Action을 쓰면 **서버 컴포넌트인 채로** 둘 수 있다.

```tsx
export function SocialLoginButtons({ next }: { next?: string }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {(['kakao', 'google'] as const).map((provider) => (
                <form key={provider} action={signInWithOAuthAction}>
                    <input type="hidden" name="provider" value={provider} />
                    {next && <input type="hidden" name="next" value={next} />}
                    <button type="submit" className={...}>{provider === 'kakao' ? '카카오' : 'Google'}</button>
                </form>
            ))}
        </div>
    )
}
```

- `login-form.tsx:99`의 호출부에 **`next`를 내려준다**. 지금 `next`는 폼 안 hidden input(`:20`)에만 있어 **소셜 버튼에는 전달되지 않는다** → 초대 링크로 들어온 사람이 소셜로 로그인하면 원래 가려던 곳을 잃는다.
- **`/signup` 화면에도 버튼을 둔다**. 지금은 로그인 화면에만 있다.
- 카카오 아이콘은 `lucide-react`에 없다 → 인라인 SVG가 필요하다.

### 6.3 `src/app/auth/callback/route.ts` (신규)

공식 예제를 이 레포 규칙에 맞춰 옮긴 것이다.

```ts
export async function GET(request: NextRequest) {
    const { searchParams, origin } = request.nextUrl
    const code = searchParams.get('code')
    const nextParam = searchParams.get('next')
    const next = isSafeNext(nextParam) ? nextParam : null

    if (!code) return NextResponse.redirect(new URL('/login?error=oauth', origin))

    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL('/login?error=oauth', origin))

    // 탈퇴 차단 — loginAction(:25-36)과 같은 집합을 봐야 한다.
    // 이 검사가 없으면 익명화된 '탈퇴한 회원'이 소셜 경로로 그대로 로그인된다.
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from('users').select('deleted_at, ntrp').eq('id', user!.id).single()
    if (profile?.deleted_at) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=deleted', origin))
    }

    // 테니스 정보가 비어 있으면 완성 화면으로. 게이트는 layout에도 있지만(§7),
    // 여기서 한 번 더 보내면 첫 진입이 매끄럽다.
    const dest = profile?.ntrp == null
        ? `/onboarding/profile${next ? `?next=${encodeURIComponent(next)}` : ''}`
        : (next ?? `/profile/${user!.id}?scope=personal`)

    // Vercel 같은 로드밸런서 뒤에서는 origin이 내부 주소가 된다 — 원래 호스트를 복원한다.
    const forwardedHost = request.headers.get('x-forwarded-host')
    if (process.env.NODE_ENV !== 'development' && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${dest}`)
    }
    return NextResponse.redirect(new URL(dest, origin))
}
```

> 공식 예제: https://supabase.com/docs/guides/auth/social-login/auth-kakao (Callback endpoint 절)
> ⚠ 기존 `/auth/confirm`은 `next`에 `isSafeNext` 검사가 **빠져 있다**. 그 구현을 답습하지 말 것.

### 6.4 `src/lib/auth/auth-error-messages.ts` — 문구 추가

`?error=oauth` / `?error=deleted`를 로그인 화면이 읽어 배너로 띄운다. `mapAuthError`는 **Supabase Auth 영문 메시지 전용**이므로 그 규칙 배열에 넣지 말고, 쿼리 → 문구 매핑을 따로 둔다(0079에서 23505를 `mapAuthError`에 넣지 않은 것과 같은 이유).

---

## 7. 프로필 완성 게이트

### 7.1 판정 — `src/app/(main)/layout.tsx`

그 레이아웃은 **이미** `users`를 select한다(`:30-36`). 컬럼 하나만 더한다.

```ts
.select('name, nickname, role, profile_image, ntrp')
...
if (user && profile && profile.ntrp == null && !pathname.startsWith('/onboarding')) {
    redirect('/onboarding/profile')
}
```

> 서버 레이아웃에서는 `pathname`을 직접 못 읽으므로, `/onboarding`을 `(main)` 밖의 라우트 그룹에 두어 **애초에 이 레이아웃을 지나지 않게** 하는 편이 간단하다. (`(auth)` 레이아웃이 인증 검사 없는 순수 래퍼라 그 옆에 두기 좋다 — `src/app/(auth)/layout.tsx:1-11`)

### 7.2 화면 — `/onboarding/profile`

- 기존 **`SignupTennisSection`을 그대로 재사용**한다(같은 필드·같은 검증). 새로 만들지 않는다.
- 닉네임도 함께 받는다 — 소셜 가입자의 닉네임은 이메일 앞부분으로 자동 생성된 임시값이다.
  **0079의 `NicknameField`를 그대로 쓰면 중복 검사가 따라온다.**
- 하단 버튼은 `FormActions`(레포 규칙).

### 7.3 저장 — 전용 액션

`updateProfileAction`을 열지 **않는다**. 별도 액션으로 **비어 있을 때만 1회** 채운다.

```ts
// "변경 불가"를 "입력 후 변경 불가"로 바꾸는 것이지 정책을 버리는 게 아니다.
// 기존 회원은 이미 값이 있으므로 여전히 잠긴다.
const { data: current } = await supabase.from('users').select('ntrp').eq('id', user.id).single()
if (current?.ntrp != null) return { error: '이미 입력된 정보입니다.' }
```

- 검증은 **`signupAction`과 같은 것**을 본다: `isGenderValue`·`isHandValue`·`isSignupNtrp`·`parseYearMonth`·`checkIdentityFields`(0079).
- RLS: `users_update` 정책이 `id = auth.uid()`라 본인 UPDATE는 그대로 통과한다.

---

## 8. 실행 순서 체크리스트

순서대로 해야 중간에 깨진 상태가 생기지 않는다.

- [ ] **1** §4.1 Google 콘솔 설정 → Client ID/Secret 확보
- [ ] **2** §4.2 Kakao 콘솔 설정 → REST API 키 + Client Secret 확보 (이메일 동의 가능 여부 결정)
- [ ] **3** §4.3 Supabase Providers 활성화 + **Redirect URLs에 `http://localhost:3000/**` 추가**
- [ ] **4** §6.1~6.3 코드 작성 — 단, **아직 버튼은 로그인 화면에만 두고 자기 계정으로만 시험**
- [ ] **5** 한 번 로그인한 뒤 `select raw_user_meta_data from auth.users …`로 **실제 키 확인**
- [ ] **6** §5 마이그레이션 0081 작성 → 롤백 스모크(`begin; … rollback;`) → `apply_migration`
- [ ] **7** §7 완성 화면·게이트·전용 액션
- [ ] **8** 5번에서 만든 테스트 계정을 **지운다**(`delete from public.users …; delete from auth.users …;`)
- [ ] **9** §9 시나리오 전부 통과
- [ ] **10** `/signup`에도 버튼 노출 → `npx tsc --noEmit` · `npm run lint` · `npm run build` · `npx vitest run`
- [ ] **11** CLAUDE.md 이력표·백로그·스키마 표 갱신, conventional commit

> **6번 전에는 NTRP 3.0이 박힌다.** 그래서 4~5번은 **자기 계정으로만** 하고 8번에서 반드시 지운다.

---

## 9. 테스트 시나리오

| # | 시나리오 | 기대 |
|---|---|---|
| 1 | 구글 최초 로그인 | `/onboarding/profile`로 강제 이동, 채우면 정상 진입 |
| 2 | 구글 재로그인 | 완성 화면 건너뛰고 바로 `/profile/[id]?scope=personal` |
| 3 | `/onboarding/profile`을 건너뛰고 URL로 `/me/match-rooms` 직접 진입 | 다시 완성 화면으로 튕김 |
| 4 | **같은 이메일**로 비밀번호 가입한 계정이 있는 상태에서 구글 로그인 | **한 계정으로 합쳐진다**(Supabase 자동 identity linking). 계정이 둘로 갈라지면 설정 확인 |
| 5 | 카카오 로그인(이메일 미동의) | 가입 성공, `users.email`에 폴백 값. **롤백되면 §5의 (a)가 빠진 것** |
| 6 | 탈퇴한 계정의 구글 로그인 | `/login?error=deleted`, 세션 없음 |
| 7 | 초대 링크(`/clubs/join/[token]`) → 로그인 화면 → 구글 | 로그인 후 **초대 링크로 복귀**(`next` 전달 확인) |
| 8 | 기존 이메일 회원의 프로필 설정 | NTRP·성별 등이 **여전히 읽기 전용**(정책이 안 열렸는지) |

4번 근거 — 공식 문서:
> "Supabase Auth automatically links identities with the same email address to a single user."
> https://supabase.com/docs/guides/auth/auth-identity-linking

---

## 10. 자주 나는 에러와 원인

| 증상 | 원인 |
|---|---|
| 구글: `redirect_uri_mismatch` | Google 콘솔의 **승인된 리디렉션 URI**가 Supabase 주소(`.../auth/v1/callback`)가 아니다. 우리 앱 주소를 넣은 경우 |
| 로그인 후 Site URL(홈)으로만 감 | Supabase **Redirect URLs**에 우리 앱 주소가 없어 `redirectTo`가 무시됐다 |
| 카카오: secret 관련 실패 | **카카오 로그인 > 보안**에서 Client Secret을 「사용함」으로 활성화하지 않았다 |
| 카카오 로그인이 아예 안 됨 | 이메일 동의를 못 받는데 Supabase의 **Allow users without an email**이 꺼져 있다 |
| `Database error saving new user` (불투명) | `handle_new_user`가 터졌다. 대개 NOT NULL(email) 또는 0079의 CHECK 위반. `auth.users`와 같은 트랜잭션이라 메시지가 뭉개진다 → `supabase` 로그를 보거나 트리거를 한 줄씩 좁혀서 확인 |
| 콜백에서 `code` 교환 실패 | PKCE의 `code_verifier` 쿠키가 유실됐다. Server Action/Route Handler가 아닌 Server Component에서 쿠키를 쓰려 했거나(`src/lib/supabase/server.ts:23-26`의 빈 catch가 실패를 삼킨다), 다른 브라우저/시크릿창에서 콜백을 연 경우 |
| 테스트 계정만 로그인되고 남은 안 됨 | 구글 OAuth 동의 화면이 **테스트 모드**다. 게시(Publish)하거나 테스트 사용자에 추가 |

---

## 11. 하지 않기로 한 것 · 열린 질문

- **수동 identity linking**(`linkIdentity`)은 넣지 않는다 — 자동 연결로 충분하고, 별도 대시보드 설정이 필요한 beta 기능이다.
- **OAuth 계정에 비밀번호 추가**는 `updateUser({ password })`로 가능하다(문서 FAQ). 요구가 생기면 그때.
- **자동 identity linking을 끄는 설정 이름**은 문서에서 확인하지 못했다. 4번 시나리오가 예상과 다르면 대시보드 Authentication 설정을 직접 살펴야 한다.
- **provider 메타데이터 키 목록**은 문서에 없다(§5의 경고). 반드시 실측한다.
- 소셜 로그아웃은 **우리 세션만** 끊는다(`logoutAction`). 구글·카카오 세션은 그대로라 다시 누르면 계정 선택 없이 바로 로그인된다 — 정상이다.
- 이메일 확인(Confirm email)을 켜는 문제는 이 문서 범위 밖이다(CLAUDE.md 「Week 52 잔여」 참고).
