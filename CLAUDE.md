# 테니스 클럽 플랫폼 — CLAUDE.md

> 이 문서는 **현재 규칙과 구조**만 담는다. Week별 결정 배경·결함 분석·검증 기록 전문은 `docs/history/claude-md-2026-09-16.md`(Week 39~68)·`…09-08.md`(Week 1~38), 사람용 진입 문서는 `README.md`, 설계 문서는 `docs/`(match-flow-refactor·rating-system·color-system·typography·social-login·redesign/)에 있다. **브라우저 E2E 절차·실행 기록·결함 대장은 `docs/e2e/`**(README = 절차서 4권 인덱스 + 계정·태그·정리 SQL·도구 규약 / 절차서 `account`·`match-room`·`record`·`journey` / `runs.md` / `findings.md` / `improvements.md` UX 대장).

## 프로젝트 개요
테니스 클럽 운영자와 회원 모두를 위한 클럽 관리 + 경기 통계 플랫폼. 여러 클럽이 독립적으로 운영되는 커뮤니티 중심 플랫폼.

## 환경 (Week 68 — dev / prod 두 프로젝트)
| | dev (테스트 전용) | prod (실사용자 전용) |
|---|---|---|
| Supabase ref | `xiwwbgltkbvxdzxxxoba` (TennisClubs, 서울) | `rjuhydxaoizgfiatyfpo` (baselineplay-prod, 서울) |
| 누가 붙나 | 로컬 `npm run dev`(`.env.local`) · E2E · Vercel **Preview/Development** | Vercel **Production**(baselineplay.vercel.app)만 |
| 계정 | 남자01~·관리자 등 테스트 계정 56명(비밀번호 123123, `docs/e2e/README.md`) | 실사용자만. 관리자 = 본인 구글 계정 `role='admin'` |
| git 브랜치 | **`dev`** — 평소 작업·커밋은 전부 여기 | **`main`** — 릴리스 전용. `dev`를 merge할 때만 움직인다 |
| MCP | `apply_migration`·`execute_sql` 쓰기 자유 | **읽기 조회 + 마이그레이션 적용만** — `execute_sql`로 데이터를 만들거나 고치지 않는다, E2E·시드 금지 |

**브랜치 흐름(Week 68)**: 개발은 `dev`에서 커밋·push한다(Vercel이 프리뷰 URL로 자동 배포 — dev DB). 릴리스는 ① 그 릴리스에 든 마이그레이션을 **prod DB에 먼저** 적용(dev에서 이미 검증된 것) → ② `git checkout main && git merge dev && git push` → ③ Vercel Production 배포(prod DB) → ④ `git checkout dev`로 복귀. `main`에 직접 커밋하지 않는다 — `main`에 push = 실사용자에게 배포다. feature 브랜치·PR은 혼자 개발하는 동안 두지 않는다.
규칙: **마이그레이션은 dev 롤백 스모크 → dev 적용 → prod 적용** 순으로 둘 다. 스키마 재현 정본은 `supabase/history/`(원격 `schema_migrations` 히스토리 사본, `scripts/db-history.ts`로 export/replay/snapshot) — 새 마이그레이션을 둘 다 적용한 뒤 `export`로 갱신하고, 정의가 갈렸는지 의심되면 두 환경 `snapshot`을 diff한다(Week 68에 그 diff가 히스토리 밖 EXECUTE 회수 4건을 잡아 0091로 편입했다). 히스토리 밖에서 `execute_sql`로만 DDL·권한을 바꾸면 prod에 재현되지 않는다. Auth 설정(Google provider·Site URL·Redirect URLs·Confirm email off·최소 비밀번호 8)은 SQL 밖이라 두 대시보드에서 각각 맞춘다. 로컬 `.env.local`은 언제나 dev — prod 값은 Vercel Production env에만 둔다.

## 기술 스택
- Next.js 16.2.6 (App Router) · React 19.2.4 · TypeScript strict
- shadcn/ui (@base-ui/react) + Tailwind CSS v4
- Supabase (Auth + PostgreSQL + Storage, dev·prod 두 프로젝트 — 위 「환경」) · 배포 Vercel(baselineplay.vercel.app)
- 테스트 vitest(순수 함수만)

## 폴더 구조
파일 단위 설명은 각 파일 머리 JSDoc이 담당한다. 여기는 **디렉터리가 무엇을 맡는지**만.
```
src/
├── app/
│   ├── (auth)/                  login · signup · find-id · forgot-password · reset-password
│   ├── auth/confirm/            재설정 메일 토큰(verifyOtp) — callback과 계약이 달라 따로
│   ├── auth/callback/           소셜 로그인 착지(exchangeCodeForSession, 탈퇴 차단, 미완성 프로필 분기)
│   ├── onboarding/profile/      소셜 가입자 프로필 완성 — (main) 밖(게이트가 그 레이아웃에 있어 안에 두면 루프)
│   ├── api/keepalive/           Vercel Cron 착지(vercel.json crons, 매일 1회) — prod DB 읽기 한 번으로 무료 플랜 7일 무활동 정지 방지
│   ├── (main)/                  로그인 후 셸(헤더·사이드바) + error.tsx 백스톱. 프로필 완성 게이트가 여기(쿼리 1회 공유)
│   │   ├── match-rooms/         매칭 리스트(전체 방 2탭) · new(매칭 만들기) · [roomId](매칭 룸 상세 = 단일 작업 공간)
│   │   ├── me/                  match-rooms(참여 중인 매칭 = 작업 큐, 뱃지 착지) · personal-matches(내 경기 결과 + 직접 기록) · 옛 경로 리다이렉트
│   │   ├── profile/             [userId](개인 통계 허브 — 본인/타인) · settings
│   │   └── guide/ terms/ privacy/  사용 가이드·이용약관·개인정보처리방침 — 보호 라우트가 아니라 비로그인도 열린다(문구는 lib/guide·lib/legal)
│   ├── page.tsx                 랜딩(정적, dark 스코프) · opengraph-image · tiers(개발용)
├── components/
│   ├── ui/                      shadcn 생성물 — 직접 수정 금지
│   ├── common/                  셸(Header·Sidebar·MobileNav·NavCreateLink)·PageHeader·FormActions·LinkTabs·필드·배지·member-search/
│   ├── guide/                   PageGuide(인라인 설명)·가이드 페이지 섹션·examples/(실제 카드를 더미 데이터로)
│   ├── auth/ onboarding/ landing/ theme/ legal/  auth/consent-checkbox = 가입·완성 폼 공용 동의(약관·방침 링크) · legal/ = 약관 페이지 골격
│   ├── profile/ stats/          프로필 헤더·scope 탭·통계 카드 한 벌(head-to-head/ = 1:1 맞대결 표시 분리)
│   ├── personal-matches/        개인 경기 폼·카드·협상 액션·결과 다이얼로그·rotation/(빌더)·form-sections/
│   └── match-rooms/             룸 카드·상세(헤더·명단·게임·대진표·초대·호스트 액션)·form-sections/·lineup-edit/
├── lib/
│   ├── supabase/                env(단일 출처)·client(브라우저)·server·middleware
│   ├── actions/                 Server Actions — 쓰기는 전부 여기
│   ├── queries/                 read-only(match-queue = 미확정 단일 소스, room-queue = 뱃지·차례)
│   ├── match-rooms/ personal-matches/ match-requests/ match-games/ analytics/ rating/
│   │                            순수 규칙(vitest) — 분류·자격·검증·대진·집계. 앱 술어는 DB RPC 가드의 거울
│   ├── guide/                   sections.ts = 안내 문구 단일 출처(라벨은 보간) + fixtures(예시 데이터) + 테스트 가드
│   ├── legal/                   terms.ts·privacy.ts = 약관·개인정보처리방침 본문 데이터(**실제 수집 항목만** — users 컬럼·탈퇴 익명화 규칙과 같아야 한다) · LEGAL_EFFECTIVE_DATE
│   ├── dashboard/               tokens.ts(TYPO·CARD·PILL·CTA 토큰)·member-badges·colors.test(컬러 회귀 가드)
│   ├── auth/ profile/ format/ image/ og/  인증·프로필 규칙(비밀번호·아이디·닉네임·검색)·포맷·이미지 축소·OG
│   └── nav-items.ts(메뉴 라벨 NAV_LABEL 단일 출처) · site-url.ts · onboarding.ts · stats.ts · utils.ts
├── middleware.ts                세션 갱신 + 보호 라우트(POST는 통과)
└── types/                       index.ts(도메인 타입) · supabase.ts(gen types — select 리터럴에 컬럼 넣기 전에 먼저 갱신)
scripts/                         db-history.ts(히스토리 export/replay/snapshot) · backfill-personal-ntrp.ts · e2e-cleanup.sql
supabase/                        migrations/(00NN_slug, 변경 이력) · history/(원격 히스토리 사본 = 재현 정본)
docs/                            설계 문서 · history/(주차별 서사 원문) · e2e/(절차서·실행 기록·결함 대장)
```

## 페이지 구조 (사이트맵)
```
/                                   랜딩 (로그인 상태면 middleware가 `/profile/[내id]?scope=personal`로 리다이렉트. Week 65 — 정적 프리렌더·다크 고정·가이드 픽스처 콜라주, DB 조회 0)
/login /signup /find-id(아이디 찾기 — 이름+이메일 → 마스킹 아이디, Week 61) /forgot-password(`PASSWORD_RESET_MAIL_ENABLED`가 true면 「아이디 또는 이메일」 → 재설정 링크, **지금은 false — 운영자 문의 안내**) /reset-password · /auth/confirm(재설정 메일 — `next` 검증, 실패 시 `/forgot-password?error=expired`) · /auth/callback(소셜 로그인 착지 — code→세션 교환·탈퇴 차단·미완성 프로필 분기)
/onboarding/profile                 소셜 가입자 프로필 완성 (**(main) 밖** — 게이트가 그 레이아웃에 있어 안에 두면 루프. 미완성이면 여기로 강제)
/profile/[userId]                   개인 통계 허브 — 메뉴 「개인 통계」(Week 67, 본인이면 eyebrow로 라벨↔제목 연결) (본인 = 개인/클럽/통합 탭 스캐폴드 — 개인만 동작 / 타인 = 공개 요약. AI 코칭은 Week 54에 비노출)
/profile/settings · /me/analytics → /profile/[내id]?scope=personal
/me/personal-matches                내 경기 결과(구 「개인 경기 결과」, Week 67) = 확정 전적 + 상단 「결과 입력 대기」(**방 밖 직접 기록만**) · /new = 직접 기록(비회원 전용) · /[id]/edit
/match-rooms                        매칭 리스트 = 노출된 **전체** 방. 2탭(진행 중 / ?tab=past 종료된), 카드에 내 차례 필. `?tab=mine`은 /me/match-rooms로 리다이렉트
/match-rooms/new                    매칭 만들기 (방식 단식/복식 · 일시·표면·코트·비밀번호·상대 초대 — 스코어 없음)
/match-rooms/[roomId]               매칭 룸 상세 = 단일 작업 공간(단계 칩 · 「지금 할 일」 배너 · 참가자·초대 · 대진 · 결과/확인/이의/정정)
/me/match-rooms                     참여 중인 매칭 = 작업 큐. 최상단 「나를 초대한 매칭」 + 내 방 2탭(진행 중 / ?tab=past 종료된) — **사이드바 뱃지의 착지 지점**
/me/match-requests                  → /me/match-rooms 리다이렉트 (Week 39 허브 철거)
/me/personal-matches/new?room=      → /match-rooms/[roomId] 리다이렉트
/guide                              사용 가이드 (Week 57 — **(main) 안이지만 보호 라우트가 아니라 비로그인도 열린다**. 흐름 → 화면 셋 → 다섯 단계 → 용어, 섹션 id가 앵커. 진입점은 사이드바·모바일 내비의 「사용 가이드」 + 세 목록 화면 인라인 설명의 「전체 가이드 →」 + 랜딩 푸터)
/terms · /privacy                   이용약관·개인정보처리방침 (Week 70 — /guide처럼 (main) 안, 비로그인 열림. 가입·완성 폼 동의 문구와 랜딩 푸터가 링크. 구글 OAuth 동의 화면 게시의 필수 링크)
/api/keepalive                      Vercel Cron 전용(GET, `CRON_SECRET` 대조) — prod 일시정지 방지
/tiers
```

## 개발 이력 (한 줄 요약)
왜 그렇게 했는지(결함 분석·되돌린 결정·검증)는 `docs/history/claude-md-2026-09-16.md`의 `## Week NN`(Week 1~38 더 이전 서사는 `…09-08.md`). **여기에는 새 행을 한 줄로만 더한다.**

| Week | 마이그레이션 | 한 줄 |
|---|---|---|
| 1–13 | 0001~0016 | UI → Supabase 연결(클럽·대진표·프로필·통계·개인 분석·클럽 대시보드) |
| 14–15 | 0018~0032 | 클럽 ELO·개인 NTRP 8계급 티어·대진표 매트릭스·비밀번호 재설정·탈퇴·클럽 초대 링크·OG |
| 16–19 | 0034~0038 | 온보딩·가이드, 개인 경기 폼(미확정 저장·자동완성·확인 요청), 복식(페어 고정·로테이션 세션) |
| 20–21 | 0039~0042 | DB 재설계(참가자 테이블 정규화, 요청/협상 분리) → 실 연동 복원 |
| 22–24 | 0043~0045 | 타이포 8단계 토큰, 코트명·시각, 세트=게임 통일, 행 단위 승자 폐기 |
| 25 | 0046~0050 | 매칭 리스트/룸 — 비밀번호 방·모집형·입장=참가·룸 안 게임·정산 |
| 26 | — | 컬러 시스템(3계층 토큰·cat-1~8·colors.test 가드) |
| 27 | 0051~0052 | has_result 집합 분할, 허브 실 연동, 룸 안 결과 입력 완결, 서버 필터·커서 페이지 |
| 28 | 0053~0055 | 본인 통계 실 데이터, 방 밖 복식 관점 행, 방 나가기, 확정 결과 정정(reopen) |
| 29 | 0056 | 방 밖 요청의 참여 전원 동의(좌석 축 participation_status) |
| 30–31 | 0057~0058 | 로테이션 일정 참여 동의, 등록 후 풀 편집, 이중 수락 제거 |
| 32–33 | 0059~0060 | 결과 협상 자격 = 좌석 넷 전원, 확정 = 좌석별 만장일치(confirmed_by) |
| 34–36 | 0061~0063 | 이의 제기자 기록·이의 탭, 협상 이력 보존(dispute_count), 로테이션 동의 대칭 |
| 37 | 0064 | 로테이션 결과 입력 「전원 수락」 게이트, 세션 게임 공유·낙관적 선점 |
| 38 | — | 허브 2단 탭, 허브는 승인 전용(결과 입력은 개인 경기 결과로), stale 새로고침 |
| 39 | 0065 | **매칭 룸 중심 개편** — 사이드 메뉴 축소, 매칭 만들기(방 = 1급 객체), 작업 큐·뱃지, 허브 철거 |
| 40 | 0066 | 룸 자동 대진표(lineup-core 추출, 프리셋·시드·출전 균등, 「내가 안 뛰는 게임」) |
| 41 | 0067~0070 | 대진 카드 시인성·참가자 메타·호스트 강퇴(removed = 완전 단절)·비회원 참가자·FormActions 통일 |
| 42 | 0071~0072 | 자동 대진표 드롭다운·대진 편집(전량 교체, origin 신설). 0072: `room_not_ready` 가드 되돌림 |
| 43 | 0073~0074 | 룸 시간 축 — 소요 시간·코트 면 수·1인당 권장 경기 수(`recommendGames`) |
| 44 | 0075 | 라운드·코트를 목록 순서에서 파생, 실효 면 수, 저장 순서(clock_timestamp), 팝업 영문 Close 제거 |
| 45 | — | 「참여 중인 매칭」 라우트 분리(관계 축), 두 목록의 축(schedule/settlement), 뱃지 = 착지 카드 수 |
| 46 | — | 룸 게임 행 '나' 대칭(당사자 전원) |
| 47 | — | 권장 경기 수 노출 — 다이얼로그 초기값·룸 힌트·빈 상태 |
| 48 | 0076 | 자동 대진표 회원 1명 게임 = 자유 기록(memberRule perGame), cleanup 트리거 좁힘 |
| 49 | — | 매칭 룸·직접 기록 E2E 첫 전수(S0~S10), P2 5·P3 9 |
| 50 | 0077 | E2E 후속 14건 — 정산 방 게임 추가 3중 차단, closeRotation 차례(호스트만), 나가기 가드, 에러 맵 최장 일치 |
| 51 | 0078 | 방이 경기당 시간을 기억(slot_minutes) — 라운드 시각 역산 불일치(K-6) 해소 |
| 52 | 0079~0081 | 가입 규칙 — 닉네임 부분 유니크·휴대폰 CHECK·이름 길이, anon RPC로 실시간 중복 확인, 이메일 판정(열거 허용) |
| 53 | 0082~0083 | 직접 기록에 회원이 끼면 비노출 방(is_listed), 방 닫기(closed_at ⊆ settled, recompute 초크포인트) |
| 54 | — | UI·문구 정리 — 만들기 버튼 탭 바 위, 방장→호스트·방→매칭, AI 코칭·클럽 진입점 비노출, 승/패 배지 |
| 55 | 0084 | 구글 로그인 — 프로필 완성 게이트((main) 레이아웃), handle_new_user OAuth 대비(ntrp 기본값 제거) |
| 56 | — | 구글 계정 설정 화면 크래시(next/image 허용목록) 등 6건, 성별·주력손·NTRP 미선택 시작 |
| 57 | — | 안내 체계 — 환영 팝업 삭제, /guide 복원, PageGuide 인라인, 문구 단일 출처(sections.ts) |
| 58 | — | 가이드 예시를 실제 컴포넌트 + 더미 데이터로(inert) |
| 59 | — | 배포 구글 로그인 404 = Site URL/Redirect URLs 문제(코드 무죄), DEFAULT_SITE_URL 단일화 |
| 60 | 0085 | 아이디 로그인(login_id), 비밀번호 규칙 8자+영문+숫자+특수(password-policy), weak_password 배너 |
| 61 | 0086 | 아이디 찾기(마스킹까지)·비밀번호 찾기 보완, 메일 재설정 스위치 off(운영자 문의) |
| 62 | — | 전 구간 A-Z E2E 첫 전수(절차서 4권) — P1 1·P2 5·P3 8·UX 18 |
| 63 | 0087~0090 | E2E 결함 6묶음 — 사진 브라우저 축소·avatars 버킷, 미들웨어 POST 통과, 종료 차례 RPC, 타인 프로필 전적, 탈퇴자 표시 |
| 64 | — | 회원 검색 재설계 — [검색] 명시 조회·인라인 결과·비활성+상태 칩·다중 초대 |
| 65 | — | 랜딩 재설계 — 다크·옐로우, 가짜 수치·죽은 링크 제거, 가이드 픽스처 콜라주, 정적 프리렌더 |
| 66 | — | 채움 버튼 전부 옐로우(spot-solid) — Button accent / CTA_LINK |
| 67 | — | 사이드 메뉴 IA — [+ 매칭 만들기] CTA, 「개인 통계」·「내 경기 결과」, NAV_LABEL 단일 출처 |
| 68 | 0091 | **환경 분리** — dev/prod Supabase 두 프로젝트, supabase/history 재생 정본, 드리프트 0091, dev/main 브랜치 |
| 69 | — | **총정리** — README·env 주석·CLAUDE.md 압축, dead code·클럽 UI·AI 코칭 삭제(태그), 공통 컴포넌트 11, E2E 문서 재편 |
| 70 | 0092 | **오픈 준비** — 이용약관·개인정보처리방침 페이지 + 동의 문구 링크(ConsentCheckbox), keepalive 크론(prod 일시정지 방지), advisor 잔여(search_path 10·anon+PUBLIC 회수 11·FK 인덱스 11·RLS initplan 57) |

## 다음 할 일 (추천 순 — 1차 오픈 기준)
1. **구글 OAuth 동의 화면 게시(대시보드)** — 코드 선행 조건은 Week 70에 끝났다(`/terms`·`/privacy`). Google Cloud Console › OAuth 동의 화면에 앱 홈 `https://baselineplay.vercel.app`, 개인정보처리방침 `…/privacy`, 서비스 약관 `…/terms` 링크를 넣고 「앱 게시」(비민감 scope라 심사 없음). 게시 전에는 테스트 사용자 100명 제한·「확인되지 않은 앱」 경고.
2. **keepalive 크론 확인(대시보드)** — 코드는 Week 70(`/api/keepalive` + `vercel.json` crons 매일 03:00 KST). Vercel Production 환경변수 `CRON_SECRET`(무작위 문자열)을 넣고 배포 후 Vercel › Cron Jobs에서 실행 로그 `{"ok":true}` 확인. 없어도 돌지만 열린 엔드포인트가 된다.
3. **비밀번호 복구 경로** — 지금은 운영자 수동(`docs/history` Week 60·61). 도메인 구매 → Resend SMTP → `PASSWORD_RESET_MAIL_ENABLED = true` 한 줄.
4. **알림 부재** — 초대·결과 확인·이의에 알림이 없어 무응답이 방을 막는다(이의 왕복 상한도 없음). 최소한 이메일 또는 인앱 뱃지 확장.
5. **보안 잔여** — anon RPC 시도 제한 없음(`is_email_taken`·`resolve_login_email`은 의도적 열거) · leaked password protection은 **Pro 플랜 전용**(무료 대시보드가 거절, 2026-09-17 확인) — 앱 규칙 8자+영문+숫자+특수 + 대시보드 최소 8이 이미 흔한 유출 비밀번호를 거르므로 보류. 원하면 HIBP range API(무료·키 불필요, SHA-1 앞 5자 k-anonymity)를 `validatePassword` 서버 쪽에 붙이면 같은 효과 · advisor 잔여는 0092로 닫혔다(남은 경고는 전부 의도: 의도적 anon 6종·`match_room_secrets` 정책 0·다중 permissive·새 인덱스 미사용).

### 백로그 (주제별)
- **오픈 전 필수**: 위 1~3 · 카카오 로그인 실측(버튼 미노출, `PROVIDERS` 한 줄) · 이메일 확인(Confirm email) 켜기는 SMTP 이후(켤 때 가입 성공 화면·`mapAuthError` 함께) · 배포 도메인 바꾸면 Site URL·Redirect URLs·`DEFAULT_SITE_URL`·Google 리디렉션 URI 함께.
- **보안·성능**: 위 5 · 개인 경기 목록 페이지네이션 · `MY_ROOM_ID_LIMIT=500` 초과 멤버십은 목록에서 조용히 빠짐 · 이름 숫자 금지 DB CHECK(개발 계정 정리 후) · `public.users→auth.users` FK 부재·컬럼 write-once의 DB 거울 없음 · provider 사진 URL 수명(버킷 복사로 닫기).
- **매칭 룸·협상 UX**: 상세 URL에서 사이드바 「매칭 리스트」 활성(K-11) · 참가자가 호스트에게 정정 요청할 수단 없음 · 회원+회원 vs 게스트 복식은 direct 행이라 두 번째 회원 기록에 안 남음 · 게임 추가 폼 자동완성에 방 게스트 없음(K-3) · 코트 배정 없음(순서 파생만) · 룸 중복 일정 경고 없음 · 경기 시간별 시나리오 칩(B안) · `played_time` 시 단위 · 0071 이전 대진은 편집 불가 · 정산됐지만 닫지 않은 방의 자유 기록 수정 가능(K-9) · 룸 안 [게임 입력]·[자동 대진표] 두 경로 공존(의도) · 매칭 리스트 탭 라벨 '경기'→'매칭' 어휘.
- **가이드·문구**: 가이드에 룸 상세 섹션 없음, 예시는 단식·회원 2명뿐 · `/guide`는 동적 렌더 · 어휘 가드가 '방'은 못 잡음 · 옐로우 채움 = 눌러라 / spot 필 = 주의가 형태로만 갈림(혼동 보고 시 필을 muted로).
- **도구·E2E·자산**: `@playwright/test` 도입(절차서가 스펙 골격) · 네이티브 `confirm()` 9곳 → AlertDialog · `public/avatars` PNG 2.8MB → WebP · 컴포넌트 테스트(jsdom) 없음 · Supabase CLI `link`·`config.toml`·타임스탬프 파일명 미도입 · Playwright MCP 입력 미도달·Chrome 확장 타임아웃(README 우회) · 미실행 시나리오 S15.8·S8.10·A8.6.
- **해동 후보(태그 `frozen-clubs-ui-2026-09-16`)**: 클럽 UI(라우트·컴포넌트·더미 픽스처·클럽 액션 3) — DB·RPC·`lib/match-games`·`lib/queries/clubs|ratings`는 남아 있다. 해동 = `git checkout frozen-clubs-ui-2026-09-16 -- src/app/(main)/clubs src/components/clubs …` + 진입점(사이드바 `clubNavItems`·헤더 [클럽 찾기]·온보딩 단계) + 실 쿼리 복원(픽스처 제거). AI 코칭도 같은 태그(`ai-coaching-card`·`actions/ai-coaching`·`AI_COACHING_STYLE`·`@anthropic-ai/sdk`·`ANTHROPIC_API_KEY`) — `ai_coaching_cache` 테이블은 남아 있다.

## 데이터 흐름
```
Server Component (read)  → lib/queries/*.ts → createServerClient → PostgreSQL (RLS)
Server Action (mutation) → lib/actions/*.ts → RLS + 명시적 권한 체크 → revalidatePath() / redirect()
Client Component (read)  → lib/supabase/client.ts — RLS로 보호된 read-only만
```

## DB 스키마 현황
> 2026-09 재설계(`docs/redesign/`): 다형성 컬럼을 참가자 테이블로 정규화. 마이그레이션 0001~0091(0016부터 `supabase/migrations/*.sql`, 전체 재현 정본은 **`supabase/history/`** — 원격 히스토리 120건 사본, Week 68. 원격 적용은 MCP `apply_migration`을 dev → prod 순으로 둘 다). 원격 DB의 정의가 레포에 없으면 `execute_sql`로 읽어 마이그레이션에 편입한다 — 히스토리 밖 정의는 prod에 재현되지 않는다.

| 테이블 | 핵심 규칙 |
|---|---|
| `users` | 본인만 UPDATE(`users_select`는 **`authenticated` 전용** — 가입 화면의 anon은 users를 읽지 못한다. 닉네임 중복 확인이 RPC인 이유). 행 생성은 `handle_new_user` 트리거(**0084**: OAuth 대비 — `email` 폴백으로 이메일 없는 provider를 받고, **ntrp 기본값 3.0을 걷어내** `ntrp is null`을 「테니스 정보 미입력」의 권위 술어로 삼으며, provider 프로필을 `full_name`·`avatar_url`·`picture`로 받는다. 이메일 가입은 `signupAction`이 NTRP를 필수 검증해 무영향). `is_guest`·`personal_ntrp`·`deleted_at`(soft delete)·`racket_brand/model`·`ntrp`(가입 시 1회). **0079 제약** — `users_nickname_unique_idx`(부분 유니크 `lower(btrim(nickname)) where deleted_at is null`: 탈퇴 행을 빼야 `탈퇴한 회원` 리터럴 충돌을 피하고 닉네임 재사용이 된다), `users_phone_check`(휴대폰만, 하이픈 포함 정규형 — 앞자리 화이트리스트), `users_name_check`(1~20)·`users_nickname_check`(2~20). 앱 거울은 `lib/format/phone.ts`·`lib/profile/nickname.ts`이고 두 폼이 `checkIdentityFields`(`lib/profile/identity-fields.ts`)를 공유한다. **`login_id`**(0085, nullable) — 로그인 아이디. `users_login_id_check`(`^[a-z0-9_]{4,20}$`, 트리거·앱이 소문자 정규화) + `users_login_id_unique_idx`(부분 유니크, 탈퇴 행 제외 — 탈퇴 익명화가 null로 비운다). 가입 시 1회 후 불변(앱 가드), null이면 이메일로만 로그인(기존 회원·소셜 가입자 — 프로필 설정에서 비어 있을 때 1회 설정). 앱 거울은 `lib/auth/login-id.ts` |
| `clubs` / `club_members` / `club_invites` | 공개 클럽 전체 SELECT, owner만 UPDATE/DELETE. approved 멤버만 SELECT, owner/officer 승인. 초대는 SECURITY DEFINER RPC로만 |
| `match_games` + courts/rounds/time_slots/`match_game_matches`/`match_game_participants` | approved 멤버 SELECT/INSERT/UPDATE, owner DELETE. 참가자 `{match_id,user_id,side,is_ad}` 단식 2행/복식 4행. `winner_id`는 team1/team2/draw 리터럴 |
| `personal_matches` + `personal_match_participants` | 본인만 CRUD(INSERT/UPDATE는 `room_id is null or is_room_participant`). **`has_result`**(생성 컬럼 = set_scores 비어 있지 않음)가 확정/미확정 집합 분할 술어. `source_type` direct/confirmation/rotation, confirmation은 RESTRICTIVE 잠금. `is_perspective`(관점 복사본 — 방의 대표 게임 판정), `rotation_session_id`·`group_seq`(로테이션 묶음), `court_name`, `room_id`, **`origin`**(0076 — game: 손으로 저장 / lineup: 자동 대진표가 만든 자유 기록. match_requests.origin의 거울. cleanup 트리거는 origin=game에만 걸려 라인업 행 삭제로는 방이 지워지지 않는다). 참가자 슬롯 행은 이름이 있을 때만 |
| `match_requests` + `match_request_participants` | SELECT `is_request_party`(당사자 둘 + 복식 참가자). **생성은 `create_match_request` RPC 전용**, 수락도 RPC. **방 밖 요청의 `set_scores`는 언제나 빈 배열**(CHECK `match_requests_offroom_no_scores`, 스코어는 협상 행에만). 좌석 `participation_status` 기본 pending — BEFORE INSERT 트리거 `default_participation_status`가 방 안 경로·비회원·탈퇴자만 accepted로. `opponent_accepted_at`, `rotation_session_id`·`group_seq`(로테이션 파생 요청은 pending 중복 유니크에서 제외). **`origin`**(0071 — game: 참가자가 손으로 추가 / lineup: 호스트의 자동 대진표)이 호스트가 통째로 고칠 수 있는 게임을 가른다. 두 경로의 저장 결과가 구조적으로 동일해 사후 판별이 불가능하므로 **0071 이전 행은 backfill되지 않았다** |
| `match_result_negotiations` | request 1:1, 쓰기는 RPC 전용. `confirmed_by uuid[]`(제안자는 제안 시 포함, 활성 회원 좌석 전원이 들어가면 정산), `disputed_by`, `dispute_count`. BEFORE 트리거 `normalize_result_confirmations`: 제안·재제안 → `[제안자]`, 유일한 초기화는 `result_status='none'`. **협상 이력 컬럼은 상태 전이로 지워지지 않는다 — 현재 상태는 `result_status` 하나** |
| `rotation_sessions` + `rotation_session_participants` | 세션 SELECT = 본인 ∪ 방 참가자 ∪ 좌석 보유자(`is_rotation_session_seat`). ⚠ 세션 정책식이 세션을 되읽으면 `INSERT … RETURNING`이 42501 — 앞 두 항은 컬럼 비교, 세션을 되읽는 `is_rotation_session_party`는 참가자 테이블 정책 전용. UPDATE 정책 없음(풀 조작은 RPC). 좌석은 트리거 `sync_rotation_session_participants`가 `players`의 활성 회원에서 파생(스냅샷·role 없음, 소유자 행 없음, rejected/removed는 보존해 재초대 진입점), 방 세션은 accepted로 시작. 좌석 있는 세션은 finalize 후에도 남는다 |
| `match_rooms` / `match_room_secrets` / `match_room_members` | 방 메타 전원 SELECT, DELETE 호스트(**0089 before delete 트리거** `match_rooms_drop_empty_sessions`가 게임 0 로테이션 세션을 함께 지운다 — 게임 있는 세션은 종전대로 `room_id null`로 남는다). **`duration_minutes`·`court_count`**(0073) — 종료를 시각이 아니라 소요 시간으로 두는 이유는 자정 넘김에서 종료 < 시작이 되기 때문이고, 면 수는 권장 경기 수 계산과 표시에만 쓴다(경기에 코트를 배정하지 않는다). 이 둘만은 seed가 아니라 `create_match_room` 파라미터로 들어온다. **`slot_minutes`**(0078, nullable) — 경기당 시간. 방을 만들 때는 묻지 않고 **자동 대진표가 저장할 때 고른 값을 적는다**(호스트가 대진을 짜기 전에는 알 수 없는 값이다). 라운드 예상 시각의 근거이고, 없으면 화면이 소요 시간 ÷ 라운드 수로 역산한다 — 그 역산이 팝업과 어긋나던 것이 K-6이다. **`is_listed`**(0082) — 직접 기록에서 회원을 부르면 생기는 비노출 방은 false이고 **secrets 행이 없다**(비밀번호 입장 불가, `room_not_listed`). **`closed_at`**(0083, nullable) — 호스트가 닫은 시각. 정산 위의 잠금이라 **closed ⊆ settled**(CHECK)이고, 있으면 결과 정정·게임 추가·초대·대진 편집·자유 기록 수정·삭제·강퇴·입장이 전부 막힌다. 초크포인트는 `recompute_match_room_settled` — 닫힌 방을 미정산으로 되돌리려는 어떤 경로든 `room_closed`. 호스트만 `reopen_match_room`으로 푼다. secrets는 정책 0개(bcrypt, RPC 전용). 멤버 `{role host/player, status invited/joined/declined/removed}` — 비밀번호 입장 = `player/joined`, 정원 없음. `removed`(0068·0070)는 **방과 완전히 끊긴다** — 입장 RPC가 `room_member_removed`, 상세 RPC도 `not_member`(0070), `leave_match_room`도 막아 우회 불가, 트리거 `keep_removed_room_member`가 안전망. 그래서 **경기에 배정된 회원은 내보낼 수 없다**(`member_has_games`): 방을 못 보게 하면 결과를 확인할 수 없고 좌석 만장일치가 채워지지 않는다. 해제는 호스트의 재초대뿐이고, **강퇴자는 명단에서 사라진다** — 되돌리는 경로는 호스트의 [회원 초대] 검색이다(`inviteExcludedUserIds`가 호스트에게만 후보로 남긴다). `is_settled` = 대표 게임 전부 확정 + 대기 요청·미확정 세션 없음. 출처 3테이블의 `room_id` FK(set null), 참조 행이 하나도 없을 때만 트리거가 방 삭제 |
| `match_room_guests` | 방에 등록된 비회원(0069). SELECT = 방 참가자, 쓰기는 RPC 전용(정책 0개). `unique(room_id, lower(btrim(name)))` — 명단·풀의 게스트 dedupe가 이름 기준이라 방 안 동명이인을 막는다. 방 삭제 시 cascade, 게스트를 빼도 이미 저장된 게임은 그대로 |
| `club_player_ratings` / `club_rating_history` / `ai_coaching_cache` | approved 멤버 SELECT, 쓰기 RPC · 본인 통계 해시 캐시 24h |

**헬퍼**: `is_club_owner/approved_member/owner_or_officer`, `is_request_party`, `is_rotation_session_party`·`is_rotation_session_seat`, `is_room_participant`, `is_active_member` (SECURITY DEFINER — 정책식의 상호 재귀 우회)

**RPC** (신규 RPC는 `revoke execute … from anon` 명시 — Supabase 기본 권한이 자동 부여, 트리거 함수는 PUBLIC도 회수):
- 대진표·클럽: `create/update_match_game`(참가자 배열), `add_guest_player`, 통계 4종(`get_user_match_stats_v2`·`get_user_head_to_head`·`get_user_doubles_court_stats`·`get_user_partner_stats`, `p_club_id` 선택), 클럽 랭킹 3종, `apply_club_rating_snapshot`, `get_invite_preview`·`join_club_via_invite`
- 확인 요청: `create_match_request`(스코어 거부 `set_scores_not_allowed`), `accept_match_request`(대표 수락 → 게이트), `maybe_materialize_request`(**전원 수락 게이트 단일 초크포인트**, 요청 행 락), `materialize_accepted_request`(회원 참가자 전원 관점 행), `respond_request_participation`, `respond_rotation_participation`(세션 단위 일괄 — 좌석 축까지 움직인다), `reject_match_request`(한 명의 거절 = 요청 종료), `backfill_rotation_perspectives`
- 결과 협상: `propose/confirm/dispute/reopen_match_result` — 자격 좌석 넷(`request_seat_of`), 제안은 `normalize_to_requester_perspective`로 요청자 관점 정규화, confirm은 `confirmed_by` 추가 후 `request_result_seats ⊆ confirmed_by`면 `settle_match_result`(boolean 반환, 멱등). 제안자 본인만 제안 수정(`result_already_proposed`는 타인), dispute는 제안자만 거부(확인한 좌석도 정산 전이면 가능), reopen은 확정 행 전부 비움 + disputed. 헬퍼 `invert_set_scores`·`validate_set_scores`·`normalize_set_scores`·`derive_public_ntrp`
- 로테이션: `finalize_rotation_session(session, games, expected_seq?)` — 기준 '나'는 호출자, 방 밖은 좌석 **전원 응답**해야 진입(`session_seats_pending`, 신원 검사가 먼저), `p_expected_seq ≠ max+1`이면 `session_games_changed`, allowlist(풀 ∪ 방 참가자 ∪ 소유자 − 거절자)로 위조 방어, 상대팀에 회원이 있으면 요청(accepted)+제안, 전원 비회원만 즉시 확정. `get_rotation_session_games`(좌석·소유자·방 참가자에게 대표 게임 전량), `respond_rotation_plan`(일정 응답 — 거절은 그 사람만 풀에서 뺀다), `add/remove_rotation_session_player`(방 밖 전용), `rotation_seats_accepted`, `close_rotation_room`
- 가입·프로필: **`is_nickname_taken`**(0080)·**`is_email_taken`**(0081) — 가입 폼이 제출 전에 중복을 말하기 위한 판정. **둘 다 `anon` EXECUTE를 허용한다**(레포 기본 규칙의 명시적 예외) — 쓰이는 자리가 로그인 이전이고, `users_select` 정책이 `authenticated` 전용이라 브라우저의 직접 select는 에러가 아니라 **빈 결과**로 돌아와 "어떤 값이든 사용 가능"이라 거짓말을 한다. 닉네임 쪽은 0079 인덱스와 **같은 표현식·같은 집합**(`lower(btrim())` + `deleted_at is null`)을 봐야 화면과 저장이 갈리지 않는다. 이메일 쪽은 **`auth.users`를 본다** — 탈퇴는 `public.users.email`만 치환하고 auth 행은 남겨 재가입을 막으므로, "가입할 수 있나"의 권위는 그쪽이다. ⚠ 이메일 판정은 **의도적으로 user enumeration을 연다**(Week 52 결정). 되돌리려면 anon EXECUTE 회수 + 폼의 실시간 검사 제거로 족하다. **`is_login_id_taken`·`resolve_login_email`**(0085) — 아이디 중복 판정과 아이디→이메일 해석. 둘 다 anon EXECUTE(가입·로그인 화면용). `resolve_login_email`은 `auth.users.email`을 돌려주므로 **아이디→이메일 열거를 연다**(0081보다 한 단계 더) — `loginAction` 안에서만 부르고 이메일은 브라우저에 실리지 않으며 없는 아이디도 비밀번호 오류와 같은 문구이지만, curl 우회와 시도 제한 부재는 남는다. 되돌리려면 anon 회수 + 로그인 폼을 이메일 전용으로. **`find_login_id`**(0086) — 아이디 찾기. 이름+이메일이 맞으면 jsonb(`login_id`+마스킹 / `email_only` / `social`+provider), 아니면 null. anon EXECUTE. **마스킹은 함수 안에서만**(원문 비노출) 
- 매칭 룸: `create_match_room`(0082부터 6-arg, `p_listed`), **`room_game_tallies(p_room_ids)`**(0088 — 방별 대표 게임 총수·확정 수, 참가 중인 방만. 호스트 종료 차례의 재료 — 앱이 직접 세면 RLS로 호스트가 requester가 아닌 게임이 빠진다), **`get_public_personal_matches(p_user_id)`**(0090 — 타인 프로필용 확정 개인 경기 + 참가자, 통계 비공개·탈퇴는 `[]`, anon 회수), `invite_room_members`(0065 — 호스트·참가자가 회원 초대, 게스트·탈퇴·본인 조용히 제외, joined 강등 금지. **0088부터 호스트는 removed·declined를 invited로 되돌린다**. **0083부터 정산 방은 `room_already_closed`** — 그전엔 UI만 숨겼다), `enter_match_room`(→ `join_match_room_as_player`: joined + 미확정 로테이션 풀 append + 방 요청 좌석 수락. 비노출 방 `room_not_listed`, 닫힌 방 `room_closed`), `respond_room_invite`(닫힌 방에서도 막지 않는다 — 막으면 초대가 영영 invited로 남는다), `update_match_room_password`(비노출 방 `room_not_listed` — upsert 뒷문 차단), `get_match_room_detail`(멤버 게이트 후 jsonb — room에 `slotMinutes`(0078)·`isListed`(0082)·`closedAt`(0083) 포함, games.participants에 `deleted`(0089)), **`close_match_room`·`reopen_match_room`**(0083 — 호스트 전용. 닫기는 정산된 방만(`room_not_settled`), 이미 닫혔으면 `room_closed`, 열기는 닫힌 방만(`room_not_closed`). 닫힌 방에서 `reopen_match_result`·`kick_room_member`·cleanup 트리거·소유자 행 UPDATE/DELETE 정책이 전부 막히고, 우회 경로는 `recompute_match_room_settled`가 `room_closed`로 잡는다), `leave_match_room`(호스트 불가 + **배정된 경기가 있으면 `leave_member_has_games`** — 0077이 강퇴와 대칭을 맞췄다. 나가면 상세가 게이트에 막혀 결과 확인이 영영 불가능해진다), `create_room_game`(참가자가 만드는 상호 확인 게임 — seed 치환 순서 고정 + **정산된 방이면 `room_already_closed`**(0077)), `create_room_lineup`(0066·0071·0078 — 호스트가 짠 대진을 스코어 없는 게임들로 일괄 저장. **0078부터 `p_slot_minutes`를 받아 방에 적는다**(이어붙이기로 두 번 저장하면 마지막 값이 이긴다 — 라운드 시각은 목록 전체를 한 격자로 읽으므로 값이 하나여야 한다). 파라미터가 늘어 drop 후 재생성했고, 그때 0072가 되돌린 `room_not_ready`를 되살리지 않도록 0072 이후 본문을 옮겨 적었다, requester가 호출자가 아니어도 된다 + 슬롯 정규화 `resolve_room_player`. 저장 루프는 내부 함수 `insert_room_lineup_games`로 빠져 교체 경로와 공유된다. **0076부터 게임마다 회원 분포로 경로가 갈린다** — 양 팀 회원이면 match_requests, 한 팀에만 회원이면 그 팀 첫 회원 소유의 personal_matches direct(origin=lineup, 관점 복사본 없음), 회원 0명이면 invalid_games. 남는 가드는 호스트·`room_already_closed`뿐 — **방식(로테이션 여부)은 보지 않는다**(0072가 0071의 `room_not_ready`를 되돌렸다. 복식 방은 전부 로테이션 방이라 그 가드가 기능을 죽였다)), `replace_room_lineup`·`get_room_lineup_requests`(0071·0076 — 저장한 대진 고치기. 키는 **game_id**(personal_matches 대표 행 — 0076에서 request_id에서 바꿈, direct 라인업 행은 요청이 없다). 지정한 라인업 게임을 지우고 새 대진을 넣는 **교체**이고, 관점 행을 요청보다 먼저 지운다(`on delete set null`이라 순서를 바꾸면 고아가 남는다). 결과·협상이 시작됐거나 `origin='game'`인 게임이 섞이면 `lineup_locked`. 목록 RPC를 따로 두는 이유는 호스트가 자기가 안 뛰는 게임의 요청 행을 읽을 수 없기 때문), `add_room_guest`·`remove_room_guest`(0069 — 비회원 등록·제거. 자격은 초대와 같은 눈높이(호스트 ∨ joined), 정산된 방 금지, 제거는 호스트 ∨ 등록한 본인), `kick_room_member`(0068·0070·0077 — 호스트 전용 강퇴. **배정된 경기가 없는 사람만**(`member_has_games`), 멤버 상태만 removed로 두고 로테이션 풀에서 빼며 요청·기록은 건드리지 않는다), **`room_member_has_games(room, user)`**(0077 — 0070이 kick 본문에 인라인으로 두었던 술어. `personal_matches` 소유·참가자 ∪ `match_requests` requester·opponent·참가자. 강퇴와 나가기가 같은 집합을 봐야 하므로 함수로 뺐고, 앱 쪽 거울은 `roomGameMemberIds`다), `recompute_match_room_settled`, 관점 헬퍼 `copy_personal_match_perspective`·`swap_partner_perspective`·`swap_opponent_perspective`·`resolve_rotation_player`

⚠ supabase-js는 select 문자열을 **리터럴 타입**으로 파싱한다 — 상수 결합(`a + b`)이면 `GenericStringError`. 새 컬럼은 `types/supabase.ts`를 먼저 갱신해야 임베드 전체가 깨지지 않는다(배포 순서도 마이그레이션 → 앱).

## 도메인 어휘

| 용어 | 규칙 |
|---|---|
| **아이디 / 이메일의 역할** | 0085부터 로그인 식별자는 **아이디**(`users.login_id`, 영문 소문자·숫자·_ 4~20자, 가입 시 1회 후 불변)이고 이메일은 **비밀번호 찾기·알림 채널**이다(여전히 필수 — 없으면 비밀번호를 잊은 사람이 막다른 길에 선다). 로그인 칸의 라벨은 「아이디」(이메일 가입 계정은 전부 테스트 계정이라 화면에서 말하지 않는다) — 서버는 여전히 이메일도 받고, 아이디에 @가 못 들어가 `looksLikeEmail`로 갈린다. 기존 회원·소셜 가입자는 아이디가 null이라 이메일로 로그인하고 프로필 설정에서 1회 정한다. 아이디는 화면에 노출하지 않는다(닉네임은 공개 표시명, 아이디는 크리덴셜의 절반). 비밀번호는 **8자 + 영문 + 숫자 + 특수문자**(`password-policy.ts` 단일 출처, 서버 최종 방어선은 대시보드 최소 길이 8). **찾기**(Week 61): 아이디는 `/find-id`에서 이름+이메일로 **마스킹까지만**(`na*****`, 메일 없음), 비밀번호는 `/forgot-password`에서 아이디 또는 이메일로 재설정 링크(이메일 인증) |
| **호스트 / 노출 문구의 단일 출처** | 매칭을 연 사람. **코드·DB·RPC는 여전히 `host`다**(`role='host'`·`isHost`·`not_host`) — Week 54에 바꾼 것은 사람이 읽는 자리뿐이고, 그 전 이름은 '방장'이었다(이력 표에는 그대로 남는다). 명단·목록 카드의 상태 라벨은 `lib/match-rooms/member-labels.ts`가 단일 출처다 — 호스트·참가·초대 대기·확인 대기·비회원·내보내짐. **이 문자열들은 표시값이면서 동시에 로직 값이라** `statusLabel`이 정렬 맵(`members-view`의 ORDER)과 배지 색 맵(`RoomMemberRow`의 STATUS_CLASS)의 **키**이고 내보내기 자격(`kick.ts`)도 그 값을 비교한다. 두 맵이 `Record<string, …>`이라 라벨만 고치고 키를 놓치면 타입 에러 없이 정렬과 색이 조용히 깨지므로, 맵은 상수를 **계산 키**로 쓴다. 같은 상태를 두 단어로 부르지 않는다 — `status='invited'`는 어느 화면에서나 '초대 대기'(옛 '초대됨' 폐기), `removed`는 '내보내짐'(옛 '강퇴됨' — 액션 [내보내기]와 어간을 맞췄다). 노출 문구에서 **'방'은 '매칭'**이고([매칭 나가기]·[매칭 닫기]), 승패 배지는 **승/패/무**다(`OUTCOME_LABEL` 단일 출처 — 옛 WIN/LOSS 폐기). 주석·JSDoc의 '방'·'룸'은 그대로 둔다(마이그레이션 주석과 이어진 코드 어휘다) |
| **MatchGame / Match / is_fixed / winner_id** | 하루 단위 대진표 / 개별 경기(1코트×1타임슬롯) / 결과 확정(수정 잠금 + 통계 반영) / 사이드 리터럴 `team1`·`team2`·`draw` — 대진표는 경기 1건 = 게임 1개, 승자는 `resolveGameWinner`가 스코어에서 파생 |
| **듀스코트 / 애드코트** | 포핸드(기본, `team1AdPlayerId = null`) / 백핸드(`= playerId`). 개인 경기는 세트별 `myAd/oppAd` |
| **temp_id** | 대진표 생성 시 클라이언트 임시 UUID, RPC가 실제 id로 교체 |
| **is_guest / 탈퇴 회원** | Auth 없는 임시 선수 / `deleted_at` soft delete(익명화 — 이름·닉네임·이메일·아이디·연락처·사진·성별·주력손·시작일·라켓·`personal_ntrp`; `ntrp`는 온보딩 게이트 술어라 남기고 화면이 감춘다). **표시 규칙(Week 63 F-25)**: 스냅샷이 있는 자리(개인 카드·룸 게임 참가자·클럽 대진표)는 **원래 이름 + `탈퇴` 배지**, 스냅샷이 없는 자리(룸 명단·게임 소유자·프로필 헤더)는 `탈퇴한 회원` + 배지 — 배지는 `DeletedBadge` 하나. 랭킹 제외, 확인 분모 제외 |
| **NTRP 3종 / 티어** | 자가선언 `users.ntrp`(가입 1회, 불변 — **미리 골라 두지 않는다**. Week 56에 성별·주력손·NTRP·시작일의 기본 선택을 없앴다: 고른 적 없는 값이 박히면 불변 정책 때문에 본인도 못 고치고, 0084가 트리거에서 없앤 기본값 3.0을 UI가 되살려 두고 있었다. 시작일만 **입력 후 불변**이라 비어 있으면 프로필 설정에서 1회 채울 수 있다) / 클럽 ELO `club_player_ratings`(2.5 시작) / 개인 `users.personal_ntrp`(개인 경기 온더플라이). 티어 = 클럽 레이팅 8계급 밴딩(`TIER_BANDS`) |
| **명승부 / 라이벌 / 초대 토큰** | 대진표 특별매치 판정(`special-match.ts`) / 비공개 클럽 가입 토큰(RPC 전용) |
| **게임(세트)** | 세트 1개 = 게임 1개. `set_scores` 원소 하나가 게임 하나, 통계·표시 모두 게임 단위(`resolveSetWinner`·`tallySets`). 행 단위 승자 없음. 목록은 게임 2개 이상이면 헤더 + 게임 카드 N장, 배지·색은 `result-badge.ts` 단일 출처 |
| **결과 미확정 / 집합 분할** | `set_scores` 빈 배열(`hasResult` false) = 통계 제외. `has_result`가 확정/미확정을 가르고, **미확정 행이 놓이는 자리는 `room_id`가 가른다**(Week 39) — 방에 속한 행은 매칭 룸(과 매칭 리스트의 내 차례 필), 방 밖 행은 개인 경기 결과 상단 `PendingResultsSection`. Week 38의 "승인은 허브 / 입력은 개인 경기 결과"는 허브와 함께 철회. 입력 가능한 일정 카드는 게임이 전부 확정되고 경기일이 지나면 숨긴다(`isDormantSession`) |
| **확인 요청 / 상호 확인 경기** | 회원 간 단식·페어 고정 복식 요청(`match_requests`). **Week 39부터 방 안에서만 생긴다** — `create_room_game`이 `status='accepted'`로 즉시 만들고(입장=동의) 수락 단계가 없다. 방 밖 요청을 만드는 앱 경로는 사라졌다(`createMatchRequestAction` 삭제); RPC·전원 수락 게이트·`requiresAllMembers`는 안전망으로 DB와 순수 함수에 남는다. 복식 대표는 `resolveConfirmRep`(상대1→상대2), 생성 순간 회원 참가자 전원의 관점 행(`source_type='confirmation'`, 잠금) |
| **결과 제안 / 확인** | 협상 권한 = 회원 참가자 전원, 확정 = **좌석별 만장일치**(제안이 곧 제안자의 확인, 단식 1명·복식 3명). 재제안·이의·정정은 확인 초기화. 앱 술어: `canRespondToProposal`(확인: 제안자 아님 ∧ 미확인) / `canDisputeProposal`(이의: 제안자만 아니면 — 확인한 좌석도 정산 전이면 가능) / `isReentryTurn`(이의 후 다시 입력할 차례 = 제안자 — ⚠ `!disputedByMe`를 넣으면 reopen에서 교착) / `canReopenResult`(confirmed ∧ 좌석). 제안자 본인 수정 허용(타인 확인 초기화). 동시 입력은 RPC가 막고(`result_already_proposed`·`session_games_changed`) 앱은 `ActionResult.stale`로 팝업을 열어 둔 채 `router.refresh()` |
| **이의 / 이의 이력** | `dispute_count > 0`이 '이의를 거쳤다'의 권위 술어(이의자 탈퇴에도 남는다). 재제안 뒤에도 사유·이의자 보존 → 카드 `ReentryContextBadge`·`DisputeReasonLine`이 맥락을 말한다. 탭 위치는 **차례 축**을 따른다(내 차례 = 승인 요청 › 이의 신청, 상대 차례 = 상대 승인 대기) — 0062의 "확정까지 이의 탭"은 Week 38에 철회 |
| **로테이션 복식 / 세션** | 4명 이상 파트너 교대. **복식 신규 등록 기본 모드**. 등록 시 풀만 `rotation_sessions`에 저장, 빌더에서 게임(파트너·상대1·상대2 + 스코어 1줄)을 구성하면 finalize가 게임별 `personal_matches`로 분해(`rotation_session_id`·`group_seq`) |
| **로테이션 일정 / 세션 참여 동의** | 세션 = 경기 전 일정, 요청 = 경기 후 기록. 방 밖 세션은 풀의 회원 전원에게 참여 요청(좌석). **거절은 그 사람만 풀에서 뺀다**(세션 유지). **세션 수락 = 게임 참여 동의**(게임별 재수락 없음). 주최자·수락자가 회원을 초대할 수 있고(제거는 주최자만) 재초대하면 pending 복귀. **초대한 회원이 전원 응답해야 결과 입력 가능**(앱 `hasUnansweredSeats` = DB `session_seats_pending`, 소유자 예외 없음) — 0057~0063의 '선입력 후 선적립'은 사용자에게 이중 승인 화면이라 철회됐다. 무응답 탈출구 = 주최자가 명단에서 빼고 게스트로 기록(「상대 승인 대기」 세션 카드 → 참가자 편집 → [게스트로 대체], 명단에서 뺀 **뒤** 로컬 행 교체). **전원 수락된 일정은 허브를 떠나 개인 경기 결과 상단에서 입력한다**(Week 38). 세션 게임은 좌석 보유자 전원이 `get_rotation_session_games`로 보고 저장 시 `p_expected_seq`로 선점 감지. 앱 경계 = `canEnterRotationResult`·`classifyRotationSession`(enter/respond/awaitSeats/awaitOwner/none)·`canManageRotationPool` |
| **페어 고정 게스트 재요청** | 요청은 불변이라 미응답자를 바꾸려면 [게스트로 바꿔 다시 요청] = 취소 후 `/new?from=`에 프리필(`prefillFromRequest`: 미응답·거절 좌석의 `userId` 제거). 조회는 요청자 본인 ∧ canceled만(pending이면 dedup 유니크에 걸린다). `PersonalMatchForm.prefill`은 `initialData`(수정 모드 스위치)와 별개 |
| **코트명 / 경기 시각** | `court_name` ≤40자 선택(최근 코트 재선택) / `played_time` 시 단위 `HH:00` |
| **매칭 리스트 / 매칭 룸** | **매칭(방)이 1급 객체다**(Week 39) — 「매칭 만들기」(`/match-rooms/new`)가 유일한 생성 경로이고, 만들면 언제나 리스트에 오른다. 방식은 **단식/복식 둘뿐**이고 seed를 정한다: 단식은 참가자 없는 `personal_matches`, **복식은 곧 로테이션**이라 빈 풀 `rotation_sessions`. 페어 고정을 따로 두지 않는 이유는 빌더가 게임마다 파트너를 고르게 하므로 "매 게임 같은 파트너"가 그 특수 케이스이기 때문이다. 비밀번호(4~20자, bcrypt) 필수, 정원 없음, 제목 없음(자동). **시간은 시작 시각 + 소요 시간**이라 화면이 `10:00~12:00`으로 말하고(`formatRoomWhen`), **코트 면 수**가 동시에 도는 경기 수를 뜻한다 — 자동 대진표의 권장 경기 수가 여기서 갈린다(0073). **라운드 = 동시에 도는 한 묶음**(Week 44) — 저장하지 않고 게임 목록의 **순서에서 파생**한다(i번째 게임 = `floor(i/면수)`라운드 `i%면수`코트). 인원이 닿지 않으면 면을 다 못 쓰므로 실효 면 수는 `effectiveCourtCount`가 깎는다(11명으로 복식 3면은 2면) — 생성·추천·표시가 모두 이 값을 본다. **경기당 시간은 방이 기억한다**(0078 `slot_minutes`) — 자동 대진표가 고른 값을 저장하고, 라운드 예상 시각은 `roomSlotMinutes`가 「저장된 값 우선, 없으면 소요 시간 ÷ 라운드 수」로 해석한다. 코트 **배정**은 여전히 하지 않는다. 목록 화면은 **둘**이다(Week 45) — `/match-rooms`(전체 방, 고르러 오는 곳)와 `/me/match-rooms`(참여 중인 매칭 = 내 방 + 초대, 작업 큐). 둘 다 2탭이지만 **가르는 축이 다르다**(`RoomListAxis`): 매칭 리스트는 `schedule`(0049 규칙 — 종료 = `is_settled` ∨ 날짜 경과)로 "지금 들어갈 수 있나"를 묻고, 참여 중인 매칭은 `settlement`(진행 중 = `is_settled=false`, 날짜 무관)로 "끝났나"를 묻는다 — 결과 입력이 남은 방은 경기일이 지나도 내 할 일이라 진행 중에 남아야 하고(라벨도 '마무리됨'), 내 차례가 있는 방은 정의상 미정산이므로 **뱃지가 센 방이 전부 기본 탭에 모인다**. 날짜로 갈랐더니 뱃지 1이 '종료된' 탭에 숨어 어긋나던 것을 E2E에서 잡았다. 관계 축을 탭이 아니라 **라우트로** 가른 이유는 `fetchRoomPage`의 filter가 예나 지금이나 `open⏐past` 둘뿐이고 '내가 참여한'은 `roomIds` 좁히기라, 한 탭 바에 두면 같은 방이 두 탭에 겹치고 그 탭만 렌더 규칙이 달라지기 때문이다. 서버 필터 + keyset 커서(내 차례 우선 정렬은 **첫 페이지 안에서만**) |
| **방 게임 / 모집 중 / 관점 행 / 정산** | 방 참가자 누구나 룸 안 다이얼로그로 게임 추가 — 회원 상대면 상호 확인 게임(수락 단계 없음), 비회원 상대는 자유 기록. 모집 중 = 노출 + 참가자 비움(결과 입력 불가, "세트가 있으면 라인업 완성"이 불변식). 복식 상호 확인은 회원 참가자 전원에게 관점 행(대표 `invert`, 파트너 `swap_partner`, 상대2 합성). 방 상세는 `is_perspective=false` 대표 게임만. 게임 행은 개인 경기 카드와 같은 형태이고 **배지는 행마다 하나** — `roomGameStatusBadge`가 스코어 있는 행에 null을 주므로 상태 배지와 결과 배지가 겹치지 않는다(모집 중만 pending 톤, 나머지 상태는 spot). `is_settled` = 대표 게임 전부 확정 + 대기 없음. **정산된 방은 게임이 늘지 않는다**(0077) — [게임 입력]·[게임 추가]·[자동 대진표]·초대가 모두 사라지고 RPC(`create_room_game` → `room_already_closed`)와 정책(`personal_matches_insert`의 `not is_settled`)이 우회까지 막는다. 다시 열려면 [결과 정정]으로 명시적으로 되돌린다. 2면 이상인 방의 게임 목록은 **라운드로 묶여** 그려진다(Week 44) — 자동 대진표가 「한 라운드 안에서 같은 사람이 두 코트에 서지 않게」 뽑으므로 그 묶음은 실제로 실행할 수 있는 일정이다. 로테이션 빌더가 넣은 게임(`group_seq`가 있다)은 사후 기록이라 묶지 않고 아래에 잇는다. **호스트가 짠 대진은 나중에도 고칠 수 있다**(0071) — 결과도 협상도 없는 라인업 게임만, 게임 단위가 아니라 그 방의 미확정 라인업 **전량 교체**로. 자리를 바꾸면 requester가 달라져 관점의 기준이 통째로 바뀌기 때문이다. **게임마다 회원이 한 명은 있어야 한다**(0076) — 양 팀에 회원이 있으면 상호 확인 게임, 한 팀에만 있으면 그 회원의 자유 기록(결과를 넣으면 곧 확정)으로 저장된다. 게스트끼리는 짤 수 없다(소유자 없는 행은 모델에 없다). 배치는 양 팀 회원을 우선하고, 회원이 모자라면 회원이 편차를 넘어 더 자주 선다. 팀 줄의 **'나'는 당사자 전원**(작성자 포함, `isRoomGameParty`와 같은 집합)이고 제3자에게만 작성자 실명이 보인다(Week 46) — 단식이라도 첫 줄을 접지 않고 '나'를 그대로 보인다(방에는 남의 게임이 섞여 있다) |
| **방 초대 / 참가** | 매칭 만들기에서 지목한 회원과 룸 안 [회원 초대](`invite_room_members`, 0065)로 초대된다. 명단 헤더의 버튼은 둘 — [회원 초대]와 [비회원 등록], 각각 팝업이다. **회원 검색은 [검색]/Enter 명시 조회**(Week 64) — 결과는 입력창 아래 인라인 리스트이고, 이미 방에 있거나 부를 수 없는 사람도 **감추지 않고 비활성 + 상태 칩**(`inviteRowState`)으로 보인다. 여러 명을 토글해 [N명 초대하기]로 한 번에 부른다. 초대받은 사람은 **비밀번호 없이** 수락만으로 참가(`respond_room_invite`) — 초대 카드는 매칭 리스트 최상단 「나를 초대한 매칭」과 룸 안 배너 두 곳에서 받는다. 비밀번호 입장자도 곧바로 참가, 미확정 로테이션 방이면 풀에 자동 추가. **비회원은 초대가 아니라 등록이다**(0069) — 수락할 계정이 없어 [비회원 등록]이 곧바로 명단에 올린다. 회원 멤버 행과 달리 users 행이 없어 이름이 정체성이고(방 안 유일), 자동 대진표·로테이션 빌더 풀에는 들어가지만 **게임 추가 폼의 상대 후보에는 넣지 않는다**(상호 확인 게임의 상대는 방 참가 회원이어야 한다). 명단은 **지금 방에 있는 사람만** 보여준다 — 나간 사람(declined)도 내보낸 사람(removed)도 행이 없고, 강퇴를 되돌리려면 호스트가 [회원 초대]에서 그 사람을 다시 찾는다. **강퇴 = 그 방과 완전히 끊긴다**(0070) — 룸 상세도 보이지 않고(공개 메타 + 안내만), 그래서 경기에 배정된 회원은 애초에 내보낼 수 없다 |
| **직접 기록 / 매칭 경계** | `requiresRoom(players)` — **회원이 한 명이라도 끼면 매칭 룸을 거친다**(Week 39). 상대에게도 남는 기록이라 참여 동의와 결과 확인이 필요하고 그 절차는 룸 안에만 있다. 방 없는 「직접 기록」(`/me/personal-matches/new`)은 비회원끼리의 경기 전용 — 확인해 줄 상대가 없어 스코어를 넣는 순간 확정된다. DB 가드가 없으므로 **폼과 서버 액션 양쪽**이 이 술어를 본다. `player-suggestions`는 회원과 이름이 겹치는 '만나본 사람' 항목을 버린다(그 오선택이 곧 우회로) |
| **작업 큐 / 내 차례 / 룸 4단계** | **매칭 리스트가 방을 가로지르는 작업 큐**(Week 39). `classifyPendingMatch`가 미확정 행을 8버킷으로 나누고, `turnOfBucket`·`rollUpRoomTurns`(room-turn.ts)가 그것을 `room_id`로 접어 방마다 가장 급한 차례 하나 + 건수를 만든다(우선순위 reenter→reentryReview→confirm→enter→fillLineup→**closeRotation**→waiting). **방 안 [게임 입력]은 상시 가능한 액션이지 차례가 아니다**(0077) — 미확정 로테이션 세션을 `enterResult`로 롤업하던 것을 걷어냈다. 대신 게임이 전부 확정됐는데 세션이 남은 방은 **호스트에게만** `closeRotation` 차례가 간다(마무리를 누를 수 있는 사람이 호스트뿐이다). 룸 안에서는 같은 어휘를 `classifyRoomGameTurn`이 대표 게임에 직접 적용해 「지금 할 일」 배너를 그린다 — 두 경로가 같은 자격 술어(confirmation.ts)를 보므로 "배너는 할 일이 있다는데 버튼이 없는" 상태가 없다. 룸 단계는 `roomStage`가 모집 중/진행 중/결과 확인 중/종료(`settled`)/**마감**(`closed`, 0083)으로 파생(미확정 로테이션 방은 결코 '결과 확인 중'이 아니다). 종료와 마감을 갈라 두는 이유는 오는 손이 다르기 때문이다 — 종료는 트리거가 자동으로 세우고, 마감은 호스트가 누르며 호스트만 다시 연다. 둘 다 게임이 늘지 않는 상태라 `isRoomFinished`가 묶고, 마감은 그 위에 [결과 정정]·자유 기록 수정·삭제·강퇴·입장까지 잠근다. **한 행은 정확히 한 자리에만** — 경계는 `room_id` |
| **⚠ 뱃지 = 그려지는 카드 수** | 사이드바·모바일 뱃지 = `roomBadgeTotal(turns, inviteCount)` = **「참여 중인 매칭」(`/me/match-rooms`)에서 강조되는 카드 수**(방 초대 + 내 차례가 있는 방). 정의가 곧 "그 화면에 실제로 그려지는 강조 카드 수"라 뱃지와 목록이 어긋날 수 없다 — Week 38까지 알림(myTurnTotal)과 목차(hub-totals)가 따로 놀던 구조는 허브와 함께 사라졌다. **뱃지가 붙는 메뉴와 그 카드들이 그려지는 화면은 언제나 같아야 한다**(Week 45) — 매칭 리스트에 얹혀 있던 시절에는 뱃지를 눌러도 기본 탭이 전체 목록이라 정작 센 것들이 한 탭 뒤에 있었다. 뱃지 대상은 `NavItem.badge`가 데이터로 들고 있다(href 하드코딩 아님). 뺄셈으로 정의하지 않는다. 방 밖 직접 기록의 결과 입력은 뱃지 밖(확인해 줄 상대가 없어 알릴 일이 아니다). `QueueSection.count`는 반드시 실제 카드 수(0이면 children까지 사라진다) |

## 코딩 규칙
- TypeScript strict, `any` 금지. named export만(default export 금지). 파일 kebab-case, 컴포넌트 PascalCase, 함수 camelCase
- 컴포넌트 100줄 이내(길면 분리), props 타입 필수, shadcn/ui 우선 사용
- 폰트 사이즈는 시맨틱 토큰만: `text-display`·`text-h1~h4`·`text-body`·`text-body2`·`text-caption`(배지 전용 `text-micro`). `text-sm`·`text-xs`·`text-[13px]` 금지. 굵기·색은 `TYPO`로 조합(`docs/typography.md`)
- 색상은 시맨틱 토큰만: 베이스(background/foreground/card/muted/border/input/ring), 상태(primary/info/win/loss/destructive/spot + `-solid`·`-foreground`), 분류(cat-1~8). Tailwind 팔레트·`bg-[#hex]`·새 `dark:` 분기 금지(`docs/color-system.md`; 채움 버튼·CTA = spot-solid 옐로우(Button `accent` / `CTA_LINK`, Week 66) · 텍스트 링크·포커스·활성 = primary · 대기·주의 필 = spot 테두리/틴트)
- 헤딩은 태그 = 아웃라인, 클래스 = 시각 레벨. 페이지 h1은 `PageHeader`, 카드 제목은 헤딩 태그 + `TYPO.h4`
- 폼·팝업 하단의 저장/취소는 언제나 `FormActions`(치수는 `FORM_ACTION_ROW`·`FORM_SUBMIT`·`FORM_CANCEL`) — 저장은 옐로우(`variant="accent"`) 왼쪽, 취소는 outline 오른쪽. 팝업이면 `DialogFooter` 바 안에 넣고 `showCloseButton`은 쓰지 않는다(영문 'Close'가 노출된다). 파괴적 확인만 예외로 `variant="destructive"`를 지킨다
- input/textarea/select는 전 뷰포트 16px(iOS 줌 방지) — 작은 사이즈 클래스 금지
- 순수 규칙(분류·자격·검증)은 `lib/`의 순수 함수로 두고 vitest로 고정. 앱 술어는 DB RPC 가드의 거울이어야 한다(예: `canEnterRotationResult` ↔ finalize 가드)

### Supabase
- 읽기: Server Component에서 `lib/supabase/server.ts`. 쓰기: `lib/actions/*` Server Action으로만. Client Component는 `lib/supabase/client.ts` read-only
- 권한 판단은 `club_members.role = 'owner'` 기준(`clubs.owner_id` 직접 비교 금지). 환경변수는 `.env.local`만
- 마이그레이션은 `supabase/migrations/00NN_slug.sql`이 정본(dev 롤백 스모크 → dev 적용 → **prod 적용** → `db-history.ts export`). 새 RPC는 anon EXECUTE 회수(**마이그레이션 안에서** — execute_sql로만 하면 prod에 안 간다), pgcrypto는 `set search_path = public, extensions`(0092부터 **모든 함수**에 — 비어 있으면 advisor가 잡는다). 정책식의 `auth.uid()`는 `(select auth.uid())`로 감싼다(0092 — 행마다 재평가 방지, 감싸지 않으면 advisor `auth_rls_initplan`). RLS/RPC 검증은 `execute_sql`에 `begin; … rollback;` 롤백 스모크(사용자 컨텍스트는 `set_config('request.jwt.claims', …)`)

## 타입 정의 요약 (src/types/index.ts)
```ts
export type MatchResult = { sets: Array<{ team1: number; team2: number }>; winnerId: 'team1' | 'team2' | 'draw' }
export type Match = {
  id: string; matchGameId: string; matchType: MatchType
  player1Id?: string; player2Id?: string          // 단식
  team1?: string[]; team2?: string[]              // 복식
  team1AdPlayerId?: string; team2AdPlayerId?: string
  status: 'scheduled' | 'finished'; result?: MatchResult
}
export type MatchGame = { id: string; clubId: string; name: string; date: string; courts: Court[]; rounds: Round[]; matches: Match[]; isFixed: boolean; createdAt: string }
```
개인 경기·요청·협상·세션 타입(`PersonalMatch`, `PersonalMatchConfirmation`, `MatchRequest`, `MatchRequestSeat`, `RotationSession`)은 `src/types/index.ts` 주석이 정본.

## 자주 쓰는 커맨드
```bash
npm run dev · npm run build · npm run lint · npx tsc --noEmit · npx vitest run
```

## 관리자 계정
**dev 전용**: admin@admin.com / 123123 (prod에는 없다 — prod 관리자는 본인 구글 계정을 `role='admin'`으로 승격, Week 68)

## 절대 하지 말 것
- `any` 타입, default export, `console.log` 커밋
- `components/ui/` 직접 수정, 환경변수 하드코딩
- 시맨틱 타이포·컬러 토큰 외 클래스(`text-sm`·`bg-sky-500`·`bg-[#hex]`), `globals.css` 밖 hex(예외: components/ui·`lib/rating/tier.ts`·`lib/og/brand.ts`·`app/layout.tsx` 미러)
- `match_requests`·`match_result_negotiations`·`rotation_session_participants`·`match_room_secrets` 직접 INSERT/UPDATE(RPC·트리거 전용)
- **prod**(`rjuhydxaoizgfiatyfpo`)에 `execute_sql`로 데이터 쓰기·E2E·시드·테스트 계정 생성. 히스토리 밖 DDL·권한 변경(`execute_sql`로만 한 revoke 등 — prod에 재현되지 않는다, 반드시 마이그레이션으로)

## 작업 완료 후 체크리스트
- [ ] `npx tsc --noEmit` · `npm run lint` · `npm run build` · `npx vitest run`
- [ ] DB 변경 시 롤백 SQL 스모크 + `types/supabase.ts` 갱신
- [ ] CLAUDE.md의 이력 표·백로그 갱신(배경 서사는 `docs/history/`)
- [ ] 룸·협상·직접 기록 흐름을 건드렸으면 `docs/e2e/match-room-scenarios.md`의 해당 시나리오를 다시 돌리고 `docs/e2e/runs.md`에 한 줄
- [ ] git commit (conventional commits) — **`dev` 브랜치에서**. 릴리스는 prod 마이그레이션 → `main` merge·push
