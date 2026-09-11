# 매칭 룸 · 직접 기록 E2E — 실행 규약

> 절차서는 `match-room-scenarios.md`, 실행 기록은 `runs.md`, 결함 대장은 `findings.md`. 이 파일은 **환경·계정·태그·정리·갱신 규칙**만 담는다.

## 환경

- 원격 Supabase(프로젝트 `xiwwbgltkbvxdzxxxoba`)를 그대로 쓴다. 로컬 스택 없음.
- 앱은 `npm run dev`(http://localhost:3000). 뷰포트 **1280×900** 고정 — 헤더 [로그아웃] 텍스트가 `sm` 미만에서 숨는다.
- 브라우저는 **Playwright MCP**(`browser_navigate` / `browser_snapshot` / `browser_click` / `browser_type` / `browser_handle_dialog`). Chrome 확장은 이 앱에서 스크린샷 타임아웃이 잦아 보조로만.
- DB 확인·보조 액션은 Supabase MCP `execute_sql`. 사용자 컨텍스트는
  `select set_config('request.jwt.claims', json_build_object('sub', '<uuid>', 'role', 'authenticated')::text, true);`
  로 바꾼 뒤 RPC를 부른다(같은 문장 안에서). 상태 검증은 읽기 전용 SELECT.

## 계정 역할

| 역할 | 이름 | 이메일 | uuid | 용도 |
|---|---|---|---|---|
| A 방장 | 남자01 | `aaa@aaa.com` | `74a001d0-dbcd-4267-b170-e1508c0c4245` | 모든 테스트 방의 방장 |
| B | 남자02 | `bbb@bbb.com` | `ea590465-a547-429e-ade0-100e63ac78e0` | 초대 수락 · 제안 · 이의 |
| C | 남자03 | `ccc@ccc.com` | `8416914e-438a-42d2-a262-dbfc645bd13e` | 비밀번호 입장 · 강퇴 · 재초대 |
| D | 남자04 | `ddd@ddd.com` | `465f21cc-7497-43c5-b807-edc0ff1d0faf` | 복식 4번째 좌석 |
| E | 여자01 | `aaaa@aaaa.com` | `b9f16281-e62c-4989-a59c-395cee6e344e` | 혼합 복식 |
| F | 여자02 | `bbbb@bbbb.com` | `df9ca938-3c82-455e-acc5-e94d5bd3ea1a` | 혼합 복식 |

비밀번호는 전부 `123123`. **관리자·남자24~26은 쓰지 않는다**(기존 실데이터가 있다). 테스트 계정의 `personal_ntrp`·통계가 오염되는 것은 허용한다.

계정 전환: 헤더의 로그아웃 폼(`form[action]` 안의 submit 버튼, 아이콘 + `로그아웃`) → `/login`에서 `#email`·`#password` 입력 → `로그인`.

## 태그 규약

- 테스트 방은 **코트명**을 `E2E-S<번호>`로 넣는다(예: `E2E-S1`). 방 제목·카드·상세 헤더에 그대로 보여 식별이 쉽고, 정리 SQL이 이 값으로 찾는다.
- 방 밖 직접 기록(S9)은 **메모**를 `E2E-S9`로 넣는다.
- 게스트 이름은 `E2E게스트1` … 처럼 접두를 붙인다(동명 거부 검증에도 쓴다).

## 정리 SQL

방을 [매칭 리스트에서 내리기]로 지우면 출처 행(`personal_matches`·`match_requests`·`rotation_sessions`)은 `room_id`만 null이 되어 **개인 기록으로 남는다**. 그래서 정리는 버튼이 아니라 이 스크립트로 한다. 한 트랜잭션으로 실행하고 마지막 SELECT가 전부 0이어야 한다.

```sql
begin;
create temp table e2e_rooms on commit drop as
  select id from match_rooms where court_name like 'E2E-%';
create temp table e2e_reqs on commit drop as
  select id from match_requests where room_id in (select id from e2e_rooms);

-- 관점 행이 먼저 (source_request_id가 on delete set null이라 요청부터 지우면 고아가 남는다)
delete from personal_matches
 where room_id in (select id from e2e_rooms)
    or source_request_id in (select id from e2e_reqs)
    or notes = 'E2E-S9';
delete from match_requests where id in (select id from e2e_reqs);   -- participants·negotiations cascade
delete from personal_matches where rotation_session_id in (select id from rotation_sessions where notes = 'E2E-S9');
delete from rotation_sessions where room_id in (select id from e2e_rooms) or notes = 'E2E-S9';
delete from match_room_guests  where room_id in (select id from e2e_rooms);
delete from match_room_members where room_id in (select id from e2e_rooms);
delete from match_room_secrets where room_id in (select id from e2e_rooms);
delete from match_rooms where id in (select id from e2e_rooms);

select
  (select count(*) from match_rooms where court_name like 'E2E-%') as rooms,
  (select count(*) from personal_matches where court_name like 'E2E-%' or notes = 'E2E-S9') as matches,
  (select count(*) from match_requests where court_name like 'E2E-%') as requests;
commit;
```

주의: 트리거(`cleanup_match_room_*`)가 중간에 방을 먼저 지울 수 있지만 최종 결과는 같다. 확인 SELECT가 0이 아니면 `court_name` 없이 만들어진 방(태그 누락)을 손으로 찾는다.

**[매칭 리스트에서 내리기]를 테스트한 방(S10.12)은 예외다** — 방이 지워지면 그 방의 `rotation_sessions`·`personal_matches`는 `room_id`가 null로 풀려 태그로 찾을 수 없다. 내리기 전에 세션 id를 적어 두고 정리 때 `delete from rotation_sessions where id = '<id>'`를 따로 돌린다(그 세션은 `notes`도 없다). 잔재를 찾는 보조 쿼리:
`select id from rotation_sessions where room_id is null and notes is null and user_id in (<테스트 계정 uuid>) and created_at > <실행 시작 시각>;`

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
| `match-room-scenarios.md` | 흐름·라벨·가드가 바뀔 때 그 행만. 회귀 근거(Week·마이그레이션)는 비고에 남긴다 |
| `runs.md` | 실행마다 append. 지우지 않는다 |
| `findings.md` | 결함 등록·상태 변경 시. 해결되면 상태만 `fixed(<커밋>)`로 |

룸·협상·직접 기록 코드를 건드린 커밋은 해당 시나리오 번호를 다시 돌리고 `runs.md`에 한 줄 남긴다(CLAUDE.md 완료 체크리스트).
