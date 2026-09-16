# supabase/history — 새 환경을 만드는 재현 정본

`migrations/`는 0016부터라 파일만으로는 빈 프로젝트를 만들 수 없다(0001~0015는 MCP `apply_migration`으로만 적용됐고 로컬 파일이 없었다). 대신 원격 `supabase_migrations.schema_migrations`에 statements 전문이 0001부터 전부 남아 있어, 그것을 그대로 내려받은 것이 이 디렉터리다(Week 68, dev `xiwwbgltkbvxdzxxxoba`에서 export). 파일명 `<version>_<name>.sql`의 정렬이 곧 적용 순서이고, 이름은 원격 히스토리의 것이라 `migrations/`의 `00NN_slug`와 1:1이 아니다.

## 쓰는 법 (`scripts/db-history.ts`, 연결 문자열은 `.env.local` — Direct URI를 넣으면 pooler로 바꿔 붙는다. prod는 pooler 클러스터가 달라 `SUPABASE_POOLER_HOST`를 붙인다)
- `npx tsx scripts/db-history.ts export --env DATABASE_URL` — dev 히스토리를 여기로 다시 내려받는다(새 마이그레이션을 적용한 뒤 갱신).
- `SUPABASE_POOLER_HOST=aws-0-ap-northeast-2.pooler.supabase.com npx tsx scripts/db-history.ts replay --env SUPABASE_PROD_DB_URL` — **빈 프로젝트**에 순서대로 실행하고 `schema_migrations`에 같은 version·name으로 기록한다(히스토리가 이미 있으면 거부).
- `npx tsx scripts/db-history.ts snapshot --env … --out <파일>` — 함수·정책·컬럼·제약·트리거·인덱스·권한·버킷 정의를 뽑는다. dev·prod에서 각각 돌려 diff = 0이어야 한다(히스토리 밖에서 `execute_sql`로만 넣은 드리프트를 잡는 자리).

## 재생 뒤 손으로 할 것
- `0003_seed_admin`·`0008_fix_seed_admin_null_tokens`가 `admin@tennis-club.com`(알려진 비밀번호)을 `auth.users`에 직접 넣는다 — prod에서는 재생 직후 `auth.identities`·`auth.users`·`public.users`에서 지운다.
- Auth 설정(Google provider·Site URL·Redirect URLs·Confirm email off·최소 비밀번호 8)은 SQL 밖이라 대시보드에서 따로 맞춘다(CLAUDE.md 「환경」).

## 규칙
- 새 마이그레이션은 `migrations/0091_…`부터 계속 쌓고, **dev 롤백 스모크 → dev 적용 → prod 적용** 순으로 둘 다 적용한 뒤 `export`로 이 디렉터리를 갱신한다.
- 이 파일들은 손으로 고치지 않는다(원격 히스토리의 사본이다).
