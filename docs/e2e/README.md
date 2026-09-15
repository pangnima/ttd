# 브라우저 E2E — 실행 규약

> 이 파일은 **환경·계정·태그·정리·도구·갱신 규칙**만 담는다. 무엇을 누르고 무엇이 보여야 하는지는 절차서 4권에, 결과는 `runs.md`에, 결함은 `findings.md`에, UX 개선 관찰은 `improvements.md`에 적는다.

## 절차서 인덱스 (Week 62부터 4권)

| 절차서 | 범위 | 시나리오 | 태그 |
|---|---|---|---|
| `account-scenarios.md` | 계정 생명주기 — 미들웨어 경계·회원가입·로그인·아이디/비밀번호 찾기·온보딩 게이트·프로필 설정·비밀번호 변경·구글·탈퇴 | A0~A9 | 신규 계정 `@e2e.test` |
| `match-room-scenarios.md` | 매칭 룸 — 만들기·초대·입장·게임 4경로·협상·정산·마감·강퇴·목록·권한·비노출 방 | S0~S15 | 코트명 `E2E-S<n>` |
| `record-scenarios.md` | 기록·통계 — 직접 기록 CRUD·확정 전적 표시·본인 통계 SQL 교차·타인 프로필·가이드/내비/뱃지 | R1~R5 | 메모·코트명 `E2E-R<n>` |
| `journey.md` | 통합 여정(클릭 카운트)·횡단 관찰(390px·다크·빈 상태·에러 경계) + UX 관찰 체크리스트 | J1~J3 | `E2E-J<n>` |

실행 순서는 A(탈퇴 A9 제외) → S → R → J → A9. 뒤 Phase가 앞 Phase의 데이터에 기대지 않도록 Phase마다 정리 SQL을 돌린다(단 R3 통계 대조는 S가 남긴 확정 전적을 쓰므로 S 정리 **전에** 스냅샷을 뜬다).

## 환경

- 원격 Supabase(프로젝트 `xiwwbgltkbvxdzxxxoba`)를 그대로 쓴다. 로컬 스택 없음.
- 앱은 `npm run dev`(http://localhost:3000). 뷰포트 **1280×900** 고정 — 헤더 [로그아웃] 텍스트가 `sm` 미만에서 숨는다.
- 브라우저는 **Playwright MCP**(`browser_navigate` / `browser_snapshot` / `browser_click` / `browser_type` / `browser_handle_dialog`). Chrome 확장은 이 앱에서 스크린샷 타임아웃이 잦아 보조로만.
- DB 확인·보조 액션은 Supabase MCP `execute_sql`. 사용자 컨텍스트는
  `select set_config('request.jwt.claims', json_build_object('sub', '<uuid>', 'role', 'authenticated')::text, true);`
  로 바꾼 뒤 RPC를 부른다(같은 문장 안에서). 상태 검증은 읽기 전용 SELECT.

## 계정 역할

| 역할 | 이름 | 이메일 | 아이디(`login_id`) | uuid | 용도 |
|---|---|---|---|---|---|
| A 호스트 | 남자01 | `aaa@aaa.com` | `namja01` | `74a001d0-dbcd-4267-b170-e1508c0c4245` | 모든 테스트 방의 호스트 |
| B | 남자02 | `bbb@bbb.com` | `namja02` | `ea590465-a547-429e-ade0-100e63ac78e0` | 초대 수락 · 제안 · 이의 |
| C | 남자03 | `ccc@ccc.com` | `namja03`(Week 62 A6.7에서 설정) | `8416914e-438a-42d2-a262-dbfc645bd13e` | 비밀번호 입장 · 강퇴 · 재초대 · 아이디 1회 설정(A6) |
| D | 남자04 | `ddd@ddd.com` | null(시작일은 Week 62 A6.9에서 `2019/12`로 채움) | `465f21cc-7497-43c5-b807-edc0ff1d0faf` | 복식 4번째 좌석 |
| E | 여자01 | `aaaa@aaaa.com` | null | `b9f16281-e62c-4989-a59c-395cee6e344e` | 혼합 복식 |
| F | 여자02 | `bbbb@bbbb.com` | null | `df9ca938-3c82-455e-acc5-e94d5bd3ea1a` | 혼합 복식 |
| G 구글 | 장평우 | `pangnima@gmail.com` | null(소셜 전용) | — | 구글 로그인(**M** — 사용자 수동 조작) |

비밀번호는 전부 `123123`(로그인 칸에는 아이디든 이메일이든 넣을 수 있다 — 아이디는 `looksLikeEmail`로 갈린다). **관리자·남자24~26은 쓰지 않는다**(기존 실데이터가 있다). 테스트 계정의 `personal_ntrp`·통계가 오염되는 것은 허용한다. **A~G는 탈퇴시키지 않는다** — 탈퇴는 아래 신규 계정으로만.

계정 전환: 헤더의 로그아웃 폼(`form[action]` 안의 submit 버튼, 아이콘 + `로그아웃`) → `/login`에서 `#identifier`·`#password` 입력 → `로그인`.

### 신규 가입·탈퇴 전용 계정 (Week 62)

가입 폼과 탈퇴는 실제로 행을 만들고 익명화하므로 **그때그때 새로 만드는 계정**을 쓴다.

| 항목 | 값 | 이유 |
|---|---|---|
| 이메일 | `e2e<n>@e2e.test` | 정리 SQL이 이 도메인으로 찾는다 |
| 아이디 | `e2esignup<n>` | 영문 소문자·숫자 4~20자 |
| 닉네임 | `e2e_signup<n>` | 2~20자 |
| 이름 | `테스트가입자` | 이름에는 숫자를 넣을 수 없다(0081) |
| 비밀번호 | `E2e!pass<n>` | 8자 + 영문 + 숫자 + 특수문자 |
| 휴대폰 | `010-1234-56<nn>` 또는 비움 | 선택 입력 |

온보딩 게이트(A5)는 이메일 가입자가 항상 `ntrp`를 갖고 있어 자연히 밟을 수 없다 — 신규 계정에 SQL로 `update public.users set ntrp = null, gender = null, dominant_hand = null, tennis_start_date = null where email = 'e2e<n>@e2e.test';`를 넣어 만든다.

**회원 정리 SQL** — 탈퇴는 `public.users.email`을 `deleted+<uid>@deleted.local`로 바꾸므로 `public`만 보면 못 찾는다. `auth.users.email`로 id를 잡아 **두 테이블을 함께** 지운다(둘 사이에 FK가 없어 한쪽만 지우면 고아가 남는다). 그 계정이 만든 방·기록은 태그 정리 SQL을 **먼저** 돌린다.

```sql
begin;
create temp table e2e_users on commit drop as
  select id from auth.users where email like '%@e2e.test';
delete from match_room_members where user_id in (select id from e2e_users);
delete from personal_matches   where user_id in (select id from e2e_users);
delete from rotation_sessions  where user_id in (select id from e2e_users);
delete from public.users where id in (select id from e2e_users);
delete from auth.users   where id in (select id from e2e_users);
select (select count(*) from auth.users where email like '%@e2e.test') as auth_rows,
       (select count(*) from public.users where email like '%@e2e.test' or id in (select id from e2e_users)) as public_rows;
commit;
```

## 태그 규약

- 테스트 방은 **코트명**을 `E2E-S<번호>`로 넣는다(예: `E2E-S1`). 방 제목·카드·상세 헤더에 그대로 보여 식별이 쉽고, 정리 SQL이 이 값으로 찾는다. 기록·여정 절차서의 방은 `E2E-R<n>`·`E2E-J<n>`, 계정 절차서에서 만드는 방은 `E2E-A<n>` — 정리 SQL은 `E2E-%` 전체를 잡는다.
- 방 밖 직접 기록은 **메모**를 `E2E-S9`(또는 `E2E-R<n>`)로 넣는다. 정리 SQL의 `notes = 'E2E-S9'`는 `notes like 'E2E-%'`로 읽는다.
- **비노출 방(S13)도 코트명을 반드시 넣는다** — 리스트에 없어 태그 없이는 손으로 찾기 어렵다.
- 게스트 이름은 `E2E게스트1` … 처럼 접두를 붙인다(동명 거부 검증에도 쓴다).

## 정리 SQL

방을 [매칭 리스트에서 내리기]로 지우면 출처 행(`personal_matches`·`match_requests`·`rotation_sessions`)은 `room_id`만 null이 되어 **개인 기록으로 남는다**. 그래서 정리는 버튼이 아니라 이 스크립트로 한다. 한 트랜잭션으로 실행하고 마지막 SELECT가 전부 0이어야 한다.

```sql
begin;
-- 0083: 닫힌 방은 트리거가 미정산 전환을 `room_closed`로 막아 삭제도 막힌다 — 먼저 잠금을 푼다
update match_rooms set closed_at = null where court_name like 'E2E-%' and closed_at is not null;
create temp table e2e_rooms on commit drop as
  select id from match_rooms where court_name like 'E2E-%';
create temp table e2e_reqs on commit drop as
  select id from match_requests where room_id in (select id from e2e_rooms);

-- 관점 행이 먼저 (source_request_id가 on delete set null이라 요청부터 지우면 고아가 남는다)
delete from personal_matches
 where room_id in (select id from e2e_rooms)
    or source_request_id in (select id from e2e_reqs)
    or notes like 'E2E-%';
delete from match_requests where id in (select id from e2e_reqs);   -- participants·negotiations cascade
delete from personal_matches where rotation_session_id in (select id from rotation_sessions where notes like 'E2E-%');
delete from rotation_sessions where room_id in (select id from e2e_rooms) or notes like 'E2E-%' or court_name like 'E2E-%';  -- 내려진 방의 세션은 room_id가 풀리지만 court_name은 남는다
delete from match_room_guests  where room_id in (select id from e2e_rooms);
delete from match_room_members where room_id in (select id from e2e_rooms);
delete from match_room_secrets where room_id in (select id from e2e_rooms);
delete from match_rooms where id in (select id from e2e_rooms);

select
  (select count(*) from match_rooms where court_name like 'E2E-%') as rooms,
  (select count(*) from personal_matches where court_name like 'E2E-%' or notes like 'E2E-%') as matches,
  (select count(*) from match_requests where court_name like 'E2E-%') as requests;
commit;
```

주의: 트리거(`cleanup_match_room_*`)가 중간에 방을 먼저 지울 수 있지만 최종 결과는 같다. 확인 SELECT가 0이 아니면 `court_name` 없이 만들어진 방(태그 누락)을 손으로 찾는다.

**[매칭 리스트에서 내리기]를 테스트한 방(S10.12)은 예외다** — 방이 지워지면 그 방의 `rotation_sessions`·`personal_matches`는 `room_id`가 null로 풀려 태그로 찾을 수 없다. 내리기 전에 세션 id를 적어 두고 정리 때 `delete from rotation_sessions where id = '<id>'`를 따로 돌린다(그 세션은 `notes`도 없다). 잔재를 찾는 보조 쿼리:
`select id from rotation_sessions where room_id is null and notes is null and user_id in (<테스트 계정 uuid>) and created_at > <실행 시작 시각>;`

## 도구 메모 (runs.md에서 승격)

- **입력 미도달**: Playwright MCP에서 `fill`은 되는데 `click`·`type` 이벤트가 문서에 닿지 않는 상태가 간헐적으로 생긴다. 같은 컨텍스트에서 `page.context().newPage()`로 새 탭을 열면 즉시 복구된다. 단계마다 첫 클릭이 반응하지 않으면 재시도하지 말고 새 탭으로 갈아탄다.
- **네이티브 `confirm()`**(내보내기·나가기·게임 입력 종료·닫기·삭제 등 9곳): `page.on('dialog', d => d.accept())`를 **클릭 전에** 건다. `once`는 첫 시도가 실패하면 소진되어 다음 클릭에서 창이 그대로 막는다.
- **폼 제출**: [저장하기]·[아이디 찾기] 같은 submit 버튼 클릭이 닿지 않으면 `form.requestSubmit()`으로 우회한다(서버 액션은 그대로 돈다).
- **뷰포트**: 기본 1280×900. 모바일 관찰(J3)은 `browser_resize` 390×844.
- **수단 M**(구글): 사용자가 브라우저를 조작하고, 실행자는 SQL(`users`·`auth.users`)과 `auth_logs`(`/authorize` referer·`/token` pkce)로 검증한다.

## 실행 방법

1. `runs.md`에 새 실행 블록(날짜·커밋 해시·실행자)을 연다.
2. 정리 SQL을 먼저 돌려 잔재 0을 확인한다(S0).
3. 절차서의 시나리오를 번호 순서로 따른다. 각 단계는 **조작 → 기대 결과 → 검증** 순으로, 검증 열의 SQL이 있으면 실행해 값을 적는다.
4. 결과는 절차서가 아니라 `runs.md`에 적는다(절차서는 안정적으로 유지). 라벨·URL이 코드와 어긋나면 **절차서를 그 자리에서 고친다**.
5. 결함은 `findings.md`에 즉시 등록(ID·재현·기대·실제). 뒤 시나리오를 막는 P1만 그 자리에서 판단을 묻는다.
6. 끝나면 정리 SQL → 잔재 0 → `runs.md` 마감.

## 문서 갱신 규칙

| 파일 | 언제 |
|---|---|
| `README.md` | 계정·태그·정리·도구 규약이 바뀔 때 |
| 절차서 4권 | 흐름·라벨·가드가 바뀔 때 그 행만. 회귀 근거(Week·마이그레이션)는 비고에 남긴다 |
| `improvements.md` | UX 관찰 등록·상태 변경 시. 결함(P1~P3)과 섞지 않는다 |
| `runs.md` | 실행마다 append. 지우지 않는다 |
| `findings.md` | 결함 등록·상태 변경 시. 해결되면 상태만 `fixed(<커밋>)`로 |

룸·협상·직접 기록 코드를 건드린 커밋은 해당 시나리오 번호를 다시 돌리고 `runs.md`에 한 줄 남긴다(CLAUDE.md 완료 체크리스트).
