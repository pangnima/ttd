# 계정 생명주기 E2E 절차서 — A0~A9

> 규약(계정·태그·정리 SQL·도구)은 `README.md`. 결과는 `runs.md`, 결함은 `findings.md`, UX 관찰은 `improvements.md`. 표의 열은 매칭 룸 절차서와 같다 — `#` · `계정` · `조작`(코드 라벨 그대로, `[ ]`는 버튼) · `기대` · `검증`(앱 술어 / RPC / SQL / vitest) · `수단`(B 브라우저 · S SQL · V vitest · M 사용자 수동 조작 + 실행자 검증 · 코드).
>
> 신규 가입 계정은 `e2e<n>@e2e.test`(README 「신규 가입·탈퇴 전용 계정」). 기존 A~G는 탈퇴시키지 않는다. **A9(탈퇴)는 마지막 Phase에서** 돌린다.

## 경우의 수 표

| 축 | 값 | 시나리오 |
|---|---|---|
| 진입 상태 | 비로그인 / 로그인 / 탈퇴자 / 온보딩 미완성(ntrp null) | A0 / A0·A2 / A9 / A5 |
| 식별자 | 아이디 / 이메일 / 대문자·공백 정규화 / 없는 아이디 / 소셜 전용 | A2·A3 |
| 가입 필드 | 아이디·이메일·비밀번호·확인·이름·닉네임·휴대폰·성별·주력손·시작일·NTRP·라켓·동의·사진 | A1 (전수) |
| 유일성 | 아이디·닉네임·이메일 실시간 + 서버 + 인덱스 / 탈퇴자 재사용 | A1 / A9 |
| 1회 입력 | 아이디(null이면) · 시작일(null이면) · NTRP·성별·주력손(가입 시) | A6 / A5 |
| 비밀번호 | 정책 4규칙 · 변경 · 찾기(스위치 off) · 약한 비밀번호 배너 | A1·A7 / A4 / A2 |
| 소셜 | 재로그인 · next 복귀 · 병합 · 탈퇴 차단 · 재가입 완성 화면 | A8 (M) / A9 |

## A0 준비 — 미들웨어 경계

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 0.1 | — | 정리 SQL(태그·회원) | 잔재 0 | README | S |
| 0.2 | 비로그인 | `/profile/settings` · `/me/personal-matches` · `/onboarding/profile` · `/clubs` · `/match-rooms/new?x=1` | 각각 `/login?next=<원경로+쿼리 인코딩>` | `lib/supabase/middleware.ts` 보호 목록 | B |
| 0.3 | 비로그인 | `/find-id` · `/forgot-password` · `/guide` · `/tiers` · `/` | 리다이렉트 없이 열린다 | 공개 경로 | B |
| 0.4 | 비로그인 | `/login?next=//evil.example` → 로그인 | `//`는 거부 → `/profile/<uid>?scope=personal` | `isSafeNext` | B |
| 0.5 | A | 로그인 상태로 `/login` · `/signup` · `/` | 전부 `/profile/<uid>?scope=personal` | `isAuthRoute` 정확 일치 | B |
| 0.6 | A | 로그인 상태로 `/find-id` · `/forgot-password` | `/profile/<A>?scope=personal`로 리다이렉트(auth 라우트 — Week 63 U-4) | `middleware.ts` `isAuthRoute` | B |
| 0.7 | A | 로그아웃 | `/login`. 뒤로가기로 보호 페이지 → 다시 `/login?next=` | `logoutAction` | B |

## A1 이메일 가입 — 필드 전수 · 실시간 중복 · 제출 잠금

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 1.1 | 비로그인 | `/signup` | 제목 `계정 만들기`, 폼 밖 `OR` + [Google로 계속하기], 「이미 계정이 있으신가요? 로그인」. **[회원가입] 비활성**(빈 폼) | `pwWeak`·`tennisMissing` 초기 true | B |
| 1.2 | — | 아이디 `abc` / `ABC_1` / `한글아이디` / `namja01` / `e2esignup1` | `아이디는 4자 이상이어야 합니다.` / 입력 중 소문자로 바뀌거나 `영문 소문자·숫자·밑줄(_)만…` / 같은 문구 / `이미 사용 중인 아이디입니다.`(400ms 뒤) / `사용 가능한 아이디입니다.` | `validateLoginId`, RPC `is_login_id_taken` | B |
| 1.3 | — | 이메일 `abc` / `aaa@aaa.com` / `e2e1@e2e.test` | 형식 오류(브라우저 type=email + 앱) / `이미 가입된 이메일입니다.` + 같은 줄 [로그인]·[비밀번호 찾기] / 통과 | RPC `is_email_taken`(auth.users 기준) | B |
| 1.4 | — | 비밀번호 `abcdefgh` → `abcdefg1` → `E2e!pass1` | 체크리스트 `8자 이상`·`영문 포함`·`숫자 포함`·`특수문자 포함`이 2/4 → 3/4 → 4/4로 바뀜. 확인 칸 `E2e!pass2` → `비밀번호가 일치하지 않습니다.` | `PasswordRulesHint`, `validatePassword` | B |
| 1.5 | — | 이름 `홍길동1` / 21자 / `테스트가입자` | blur 후 `이름에는 숫자를 넣을 수 없습니다.` / `maxLength=20`이 잘라 21자 불가(문구 없음) / 통과 | `validateName`(DB 거울 없음 — 앱 전용) | B |
| 1.6 | — | 닉네임 `a` / `남자닉네임01`(A의 닉네임 — 이름 `남자01`은 닉네임이 아니다) / `e2e_signup1` | `닉네임은 2자 이상이어야 합니다.` / `이미 사용 중인 닉네임입니다.` / `사용 가능한 닉네임입니다.` | RPC `is_nickname_taken`(`lower(btrim)`) | B |
| 1.7 | — | 휴대폰 칸 | `010-` 프리필. `010-1` blur → `휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)`. `39920393030` 입력 → 하이픈 자동 삽입 뒤 앞자리 거부. `01012345601` → `010-1234-5601`. `010-`만 남기면 미입력으로 통과(선택) | `formatPhoneNumber`·`isValidMobilePhone`·`isBlankPhone` | B |
| 1.8 | — | 성별·주력손·NTRP 토글 | **셋 다 미선택으로 시작**(Week 56), 하단 안내 `성별·주력손·테니스 시작일·NTRP를 모두 채워야 다음으로 넘어갈 수 있습니다.` 셋을 고르고 시작일 `2030/01` → `년/월 형식으로 입력해 주세요 (예: 2022/07). 미래 월은 입력할 수 없습니다.` → `2022/07` → `2022년 7월부터` → 안내 사라짐 | `SignupTennisSection`, `parseYearMonth` | B |
| 1.9 | — | 라켓 `기타` 선택 → 빈 채로 제출 시도 | `racket_other` required로 막힘 → `테스트라켓` 입력 | `racket-field.tsx` | B |
| 1.10 | — | 동의 체크 안 하고 제출 | 브라우저 required 툴팁, 서버 미호출 | `agree_privacy` | B |
| 1.11 | — | 동의 체크 → 모든 필드 유효 → 비밀번호 확인만 틀리게 → [회원가입] | 버튼 비활성 그대로(`pwMismatch`). 고치면 활성 | disabled 조건 7종 | B |
| 1.12 | — | **실패 후 보존**: 닉네임을 `남자01`로 바꿔 서버가 거절하도록 클라 검사를 우회할 수 없으므로, 대신 SQL로 `e2e_signup1` 닉네임을 다른 행에 잠깐 심고(롤백 불가 — 테스트 계정 D의 닉네임을 일시 변경 후 복원) 제출 | 서버 `이미 사용 중인 닉네임입니다.` + **입력값 유지**(Week 52 uncontrolled reset 수정) | `signupAction` 순서 8 | B+S |
| 1.13 | — | [회원가입] 성공 | `/profile/<uid>?scope=personal&notice=welcome` 착지 + 배너 `가입이 완료됐습니다.` 1회 + 체크리스트. 헤더에 닉네임·아바타(사진을 올렸다면 스토리지 URL, 512px webp) | `auth.ts` `WELCOME_NOTICE`(Week 63 F-pre-4·U-6) | B |
| 1.14 | — | SQL | `public.users`: `login_id='e2esignup1'`, `email`, `nickname`, `name='테스트가입자'`, `phone='010-1234-5601'`, `gender·dominant_hand·ntrp·tennis_start_date='2022-07-01'`, `profile_image`=기본 아바타 경로, `racket_brand='기타'/model`, `deleted_at null`. `auth.users` 1행, `raw_user_meta_data`에 같은 값 | `handle_new_user` | S |
| 1.15 | — | anon 컨텍스트 SQL `is_login_id_taken('e2esignup1')`·`is_nickname_taken('E2E_SIGNUP1')`·`is_email_taken('E2E1@e2e.test')` | 전부 true(정규화·anon EXECUTE) | 0080·0081·0085 | S |
| 1.16 | — | 같은 이메일로 다시 가입(다른 아이디·닉네임) | 실시간 `이미 가입된 이메일입니다.` + 제출 잠금 | `emailTaken` | B |

## A2 로그인

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 2.1 | — | `/login` | 라벨 `아이디`(placeholder `아이디를 입력하세요`), `비밀번호` + 눈 아이콘(`비밀번호 표시`/`비밀번호 숨기기`), 「로그인 상태 유지」, 링크 `아이디 찾기`·`비밀번호 찾기`·[회원가입], `OR` + [Google로 계속하기] | `login-form.tsx` | B |
| 2.2 | A | `namja01` / `NAMJA01 ` / `aaa@aaa.com` / `AAA@AAA.COM` + `123123` | 네 경우 모두 로그인 → `/profile/<A>?scope=personal` | `resolveLoginEmail`·`normalizeLoginId` | B |
| 2.3 | — | `nobody99`+`123123` / `namja01`+`wrong` / `aaa@aaa.com`+`wrong` / `ab`(형식 오류) | 전부 **같은 문구** `아이디 또는 비밀번호가 올바르지 않습니다.` | `INVALID_CREDENTIALS_MESSAGE` | B |
| 2.4 | — | anon SQL `resolve_login_email('namja01')` / `('nobody99')` | 이메일 반환 / null — **아이디→이메일 열거**가 열려 있음을 기록(K 후보 아님, 0085 결정) | 0085 | S |
| 2.5 | A | `/login?next=%2Fmatch-rooms%3Ftab%3Dpast` → 로그인 | `/match-rooms?tab=past` | hidden `next` | B |
| 2.6 | — | `/login?error=oauth` / `?error=deleted` | 배너 `소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.` / `탈퇴한 계정입니다.` | `mapAuthQueryError` | B |
| 2.7 | A | 비밀번호 `123123`(정책 미달)으로 로그인 | 대시보드 최소 길이 8이 **켜져 있으면** `/profile/<A>?scope=personal&notice=weak_password` + 배너 `비밀번호 규칙이 강화되었습니다.` … / 꺼져 있으면 배너 없음 → **SKIP(사유: 대시보드 설정)**으로 기록하고 Week 60 잔여 유지 | `data.weakPassword` | B |
| 2.8 | A | 로그인 폼 | 「로그인 상태 유지」 체크박스 **없음**(Week 63 U-pre-2 — 동작이 없던 UI를 없앴다) | — | B |
| 2.9 | A | 눈 아이콘 | 비밀번호 평문 토글, aria-label 전환 | — | B |

## A3 아이디 찾기

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 3.1 | 비로그인 | `/find-id` | 필드 `이름`(placeholder `가입할 때 적은 이름`)·`이메일`, 버튼 [아이디 찾기], 하단 링크 | — | B |
| 3.2 | — | `남자01` + ` AAA@AAA.COM ` | 카드 `회원님의 아이디는 **na******* 입니다.`(앞 2자 + 길이만큼 `*`) + [로그인] [비밀번호 찾기] | `find_login_id` 마스킹 | B |
| 3.3 | — | `남자03` + `ccc@ccc.com` | `이 계정은 아직 아이디가 없고 **이메일로 로그인**합니다.` + 안내 | `email_only` | B |
| 3.4 | — | `장평우` + `pangnima@gmail.com` | `이 계정은 **구글** 계정으로 가입했습니다…` + [Google로 계속하기] | `social` | B |
| 3.5 | — | `남자01` + `bbb@bbb.com` / 빈 이름 / `abc`(이메일 형식) | `입력한 이름과 이메일이 일치하는 회원이 없습니다.` / `이름을 입력해 주세요.` / `이메일 형식이 올바르지 않습니다.` | 어느 쪽이 틀렸는지 말하지 않는다 | B |
| 3.6 | — | 이름 칸 `남자01`(숫자 포함) | 통과(가입 규칙 미적용 — 의도) | plain input | B |
| 3.7 | — | anon SQL `find_login_id('남자01','aaa@aaa.com')` | jsonb에 `masked`만, `login_id` 원문 **없음** | 0086 | S |

## A4 비밀번호 찾기 — 스위치 `PASSWORD_RESET_MAIL_ENABLED = false`

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 4.1 | 비로그인 | `/forgot-password` | 폼 없음. `PasswordResetContactNotice`: `지금은 이메일로 비밀번호를 재설정하는 기능을 준비 중입니다. **운영자에게 문의**하시면 임시 비밀번호로 초기화해 드립니다.` + 준비물 2줄 + mailto 버튼(`pangnima@gmail.com로 문의하기`, subject `[BASELINE] 비밀번호 초기화 요청`) + [아이디 찾기] 링크 | `password-reset-mode.ts:13` | B |
| 4.2 | — | `requestPasswordResetAction` 직접 호출 경로 | 코드: 스위치 false면 `지금은 이메일 재설정을 제공하지 않습니다. 운영자에게 문의해 주세요.` 반환 | `auth.ts:295` | 코드 |
| 4.3 | — | `/reset-password` 세션 없이 | `/forgot-password`로 리다이렉트 | `reset-password/page.tsx:15` | B |
| 4.4 | — | `/auth/confirm?token_hash=bogus&type=recovery&next=//evil.example` | `/forgot-password?error=expired` + 배너 `재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.` | `isSafeNext`, Week 61 | B |
| 4.5 | — | true 경로(`ForgotPasswordForm` → success 카드) | **코드 확인만**(SMTP 없음) | `forgot-password-form.tsx` | 코드 |

## A5 온보딩 프로필 완성 게이트 (신규 계정 e2e1)

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 5.1 | — | SQL `update public.users set ntrp=null, gender=null, dominant_hand=null, tennis_start_date=null where email='e2e1@e2e.test'` | 1행 | 게이트 조건 `ntrp is null` | S |
| 5.2 | e2e1 | 로그인 → 착지 / `/match-rooms` / `/profile/settings` | 전부 `/onboarding/profile`로. 헤더·사이드바 **없음**, eyebrow `ALMOST THERE`, h1 `프로필을 완성해 주세요`, 하단 [다른 계정으로 로그인]만 | `(main)/layout.tsx:41` `needsProfileOnboarding` | B |
| 5.3 | e2e1 | `/onboarding/profile?next=%2Fmatch-rooms` 직접 | 열림(보호 라우트라 로그인 필요) | — | B |
| 5.4 | e2e1 | 폼 | 사진(기존 아바타 유지) · 이름 프리필 `테스트가입자` · 닉네임 프리필 · 휴대폰 · 성별·주력손·시작일·NTRP **미선택** · 라켓 · 동의. [회원가입] 비활성 | `ProfileOnboardingForm` disabled = `nicknameTaken ‖ tennisMissing` | B |
| 5.5 | e2e1 | 닉네임을 `남자닉네임02`로 | `이미 사용 중인 닉네임입니다.` + 잠금(본인 닉네임은 `excludeUserId`로 통과) | `is_nickname_taken(p_exclude_user_id)` | B |
| 5.6 | e2e1 | 성별 여성·왼손·`2021/03`·NTRP 2.5·동의 → [회원가입] | `/match-rooms`(next) 착지, 헤더·사이드바 복귀(next가 없으면 프로필 + `notice=welcome` 배너). SQL: 넷이 채워짐 | `completeProfileAction` → `next` | B+S |
| 5.7 | e2e1 | 다시 `/onboarding/profile` | `/profile/<uid>?scope=personal`로 되돌림 | `page.tsx:38` | B |
| 5.8 | e2e1 | `/profile/settings` | 성별 `여성`·주력손 `왼손`·시작일 `2021년 3월`·NTRP `2.5` **읽기 전용** | 입력 후 불변 | B |
| 5.9 | — | `completeProfileAction` 재호출 경로 | 코드: `ntrp != null` → `이미 입력된 정보입니다.` | `onboarding.ts` | 코드 |
| 5.10 | — | 프로필 행 없는 계정의 게이트 판정(Week 56 잔여) | 코드: `/auth/callback`은 `profile?.ntrp == null` → 완성 화면, `needsProfileOnboarding`은 `!!profile && …` → 통과 — 두 술어가 다름을 기록(K 후보) | `onboarding-gate.ts:18` | 코드 |

## A6 프로필 설정 (`/profile/settings`)

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 6.1 | A | 진입 | 헤더 `내 정보 수정`, 이름 `이름 (변경 불가)` 회색, 아이디 `아이디 (변경 불가)` `namja01`, 성별·주력손·시작일·NTRP 읽기 전용, 편집 가능: 사진·닉네임·휴대폰·라켓·통계 공개 | `profile-identity-fields.tsx` | B |
| 6.2 | A | 닉네임 `남자닉네임02` → 저장 / `남자닉네임01임시` → 저장 → 원복 | 실시간 `이미 사용 중인 닉네임입니다.` + 잠금 / 저장 후 헤더 닉네임 갱신, **성공 메시지 유무 기록**(U-pre-3) | `checkIdentityFields`, 23505 | B |
| 6.3 | A | 휴대폰 `010-1` 저장 시도 / 비움 저장 | 형식 문구 / 저장되고 SQL `phone null`(빈 문자열 아님 — 0079) | `isBlankPhone` | B+S |
| 6.4 | A | 라켓 `바볼랏` + 모델 `퓨어 드라이브` 저장 → 원복 | SQL 반영 | — | B+S |
| 6.5 | A | 통계 공개 `비공개` 저장 | SQL `stats_hidden=true`; R4에서 타인 화면 확인 후 원복 | `toggleStatsHiddenAction` | B+S |
| 6.6 | A | 사진 [기본 이미지로 변경] 저장 / [이미지 변경] **6MB** png / **11MB** png | 기본 아바타 경로 변경(고른 파일은 버려진다) / 6MB: 고르는 즉시 `줄이는 중…` → input의 파일이 512px webp(≈170KB)로 바뀌고 저장 후 `profile_image`가 버킷 URL, `storage.objects` size < 300KB / 11MB: 필드 문구 `사진이 너무 큽니다. 10MB 이하로 골라 주세요.` + [저장하기] 비활성 + input 비움 | `use-avatar-file.ts`·`avatar-limits.ts`·0087 버킷(Week 63 F-15·F-27) | B+S |
| 6.7 | C | 아이디 칸 | `login_id null` + 비밀번호 identity → **입력란 1회**(안내 `한 번만…`류). `namja01` → `이미 사용 중인 아이디입니다.`; `Namja03` 저장 → 읽기 전용 `namja03` → 그 아이디로 로그인 | `canSetLoginId`, `updateProfileAction` | B+S |
| 6.8 | C | SQL(C 컨텍스트) `update users set login_id='namja03x'` | **정책 `users_update`가 통과시키는지** 확인(앱 가드만 있고 DB 거울 없음 — Week 56 잔여) → rollback. 통과하면 K 후보 등록 | `begin; … rollback;` | S |
| 6.9 | D | 시작일 null 만들기(SQL) → 설정 화면 | `YearMonthField` 1회 입력란 + hint `한 번만 입력할 수 있습니다` → `2019/12` 저장 → 읽기 전용. 다시 SQL로 `updateProfileAction` 경로 → `테니스 시작일은 이미 입력되어 변경할 수 없습니다.`(코드) | 입력 후 불변 | B+S |
| 6.10 | A | 구글 사진 URL 계정(G)의 설정 화면 | **M**: 사용자가 G로 진입 → 크래시 없이 사진 표시(Week 56 ① 잔여) | `<img>` 폴백 | M |

## A7 비밀번호 변경

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 7.1 | A | 폼 노출 | `비밀번호 변경` 카드 + 체크리스트 | `hasPasswordIdentity` true | B |
| 7.2 | A | 현재 `wrong` / 새 `abcdefgh` / 확인 불일치 / 새 = 현재 | `현재 비밀번호가 올바르지 않습니다` / 정책 문구 / `새 비밀번호가 일치하지 않습니다` / `기존 비밀번호와 다른 비밀번호를 입력해 주세요.` | `updatePasswordAction` 순서 | B |
| 7.3 | A | 현재 `123123` → 새 `E2e!pass9` → 성공 | `비밀번호가 변경되었습니다.` + 폼 reset → 로그아웃 → 새 비번 로그인. 원복은 앱으로 불가(`123123`은 정책 미달) — README 운영자 절차의 SQL `crypt`로 | `signInWithPassword` 확인 | B |
| 7.4 | G | 설정 화면 | **M**: `SocialAccountNotice` `구글 계정으로 로그인하고 있어 이 계정에는 비밀번호가 없습니다.`, 폼 없음. 서버 축은 코드(`소셜 계정으로 로그인 중이라 비밀번호를 변경할 수 없습니다.`) | `account-providers.ts` fail-open | M+코드 |

## A8 구글 로그인 — 수단 M (사용자 조작 · 실행자 검증)

| # | 계정 | 조작(사용자) | 기대 | 검증(실행자) | 수단 |
|---|---|---|---|---|---|
| 8.1 | G | `/login` → [Google로 계속하기] → 재로그인 | 계정 선택 없이 바로 `/profile/<G>?scope=personal`(구글 세션 잔존 — 정상) | `auth_logs`: `/authorize` referer가 `…/auth/callback` 전체 경로 + `/token grant_type=pkce 200` | M+S |
| 8.2 | G | 로그아웃 → `/login?next=%2Fmatch-rooms` → 구글 | `/match-rooms` 복귀(소셜 버튼에 next 전달, Week 55 ⑤) | — | M |
| 8.3 | G | 헤더 아바타 | 구글 사진(`lh3.googleusercontent.com`)이 `<img>`로 표시 | SQL `profile_image` 호스트 | M+S |
| 8.4 | G | `/profile/settings` | 크래시 없음(Week 56 ①), 사진 표시, 아이디 칸 **없음**(소셜 전용), 비밀번호 안내 카드 | `canSetLoginId=false` | M |
| 8.5 | G | **재가입**(사용자 확인 후): 실행자가 SQL로 `auth.users`·`public.users` 두 행 삭제 → 사용자가 구글 로그인 | `/onboarding/profile`로(ntrp null). 완성 화면이 **사진(구글 URL 유지)·이름(구글 표시명 프리필)·닉네임·휴대폰·테니스·동의**를 받는다. 사진에 손대지 않고 저장 → `profile_image` 구글 URL 그대로 | 0084 트리거 `full_name`/`avatar_url` 사슬, `AvatarUploadField initialImage` | M+S |
| 8.6 | G | 같은 이메일 병합(Week 55 ④) | 코드 확인만 — `users.email` UNIQUE 없음, 유일성은 `auth.users`. 실측은 이메일 가입 계정과 같은 주소의 구글 계정이 없어 SKIP | — | 코드 |
| 8.7 | G | 탈퇴 차단(Week 55 ⑥) | **A9.9로 이월**(실제 구글 계정을 탈퇴시키므로 사용자 확인 필수) | — | M |

## A9 회원 탈퇴 — 신규 계정 e2e1·e2e2 (마지막 Phase)

> 전제: e2e1은 Phase 2~4에서 방 참가·게임·확정 전적이 있는 상태로 두고(J1), e2e2는 깨끗한 상태. **기존 A~G는 탈퇴시키지 않는다.**

| # | 계정 | 조작 | 기대 | 검증 | 수단 |
|---|---|---|---|---|---|
| 9.1 | e2e1 | `/profile/settings` 하단 | 카드 `회원 탈퇴` / `탈퇴 시 모든 클럽에서 나가지고 계정 정보가 삭제됩니다. 되돌릴 수 없습니다.` [회원 탈퇴] | `delete-account-button.tsx` | B |
| 9.2 | e2e1 | [회원 탈퇴] → 다이얼로그 | `정말 탈퇴하시겠습니까? 모든 클럽에서 탈퇴되고 계정 정보가 삭제됩니다. 과거 경기 기록은 "탈퇴한 회원"으로 남으며, 이 작업은 되돌릴 수 없습니다.` [탈퇴하기]/[취소]. [취소] → 닫힘 | — | B |
| 9.3 | e2e1 | 미확정 게임(제안 대기)이 있는 방에 참가한 채로 [탈퇴하기] | **가드 없음** → 탈퇴 성공 → `/login`. 그 방의 협상 분모에서 빠지는지(S14.13 거울) — 남은 좌석만으로 확정되는지 S로 확인 | `deleteAccountAction`에 방 가드 없음 → K 후보 | B+S |
| 9.4 | — | SQL `public.users` | `name='탈퇴한 회원'`, `nickname='탈퇴한 회원'`, `email='deleted+<uid>@deleted.local'`, `login_id null`, `phone·profile_image·gender·dominant_hand·tennis_start_date·racket_brand·racket_model null`, `stats_hidden=true`, `deleted_at` 세팅. `auth.users` 행 **잔존**(email 원본), `club_members` 0행 | 익명화 12컬럼 | S |
| 9.5 | — | 옛 아이디 `e2esignup1`+비번 / 옛 이메일 `e2e1@e2e.test`+비번 | `아이디 또는 비밀번호가 올바르지 않습니다.`(login_id null → resolve 실패) / **`탈퇴한 계정입니다.`**(auth 이메일 잔존 → signIn 성공 → deleted_at 검사 → signOut) | `auth.ts:54-65` | B |
| 9.6 | — | `/find-id` `테스트가입자`+`e2e1@e2e.test` | `일치하는 회원이 없습니다`(탈퇴 제외) | `find_login_id` `deleted_at is null` | B |
| 9.7 | — | e2e2 가입에 **e2e1의 옛 닉네임·아이디** 재사용 | 실시간 `사용 가능`, 가입 성공(부분 유니크 인덱스가 탈퇴 행을 뺀다) | 0079·0085 | B+S |
| 9.8 | A | 탈퇴자가 있던 방 명단·게임 행·개인 카드 / 탈퇴자 프로필 URL `/profile/<e2e1 uid>` | 명단 `탈퇴한 회원(탈퇴)` / 게임 행·개인 카드는 **스냅샷 이름 그대로 + `탈퇴` 배지**(F-25 규칙, 0089) / 프로필: 헤더 `탈퇴한 회원` + `탈퇴` 배지, 성별·주력손·NTRP 줄 **없음**, 본문 `탈퇴한 회원입니다.`(F-pre-8). SQL: `personal_ntrp null`(`ntrp`는 게이트 술어라 남긴다) | `member-profile-header.tsx`·`deleted-badge.tsx` | B+S |
| 9.9 | e2e2 | e2e2도 탈퇴 | **두 번째 탈퇴 성공**(닉네임 `탈퇴한 회원` 리터럴 충돌 없음 — 부분 인덱스) | 0079 결정의 실증 | B+S |
| 9.10 | G | (사용자 확인 후) 구글 계정 탈퇴 → 구글 재로그인 | `/login?error=deleted` `탈퇴한 계정입니다.` → 복구는 두 행 삭제 + 재가입(A8.5) | `/auth/callback` 탈퇴 차단 | M+S |
| 9.11 | — | 회원 정리 SQL | `auth_rows=0`, `public_rows=0` | README | S |
