# BASELINE — 테니스 매칭 플랫폼

회원끼리 매칭(방)을 열고, 게임을 올리고, 결과를 서로 확인하면 전적·통계가 쌓이는 서비스입니다.
Next.js 16(App Router) + Supabase(Auth·PostgreSQL·Storage), Vercel 배포.

## 처음 실행하기

```bash
npm install
cp .env.example .env.local   # 값 채우는 법은 .env.example 주석 참고
npm run dev                  # http://localhost:3000
```

로컬은 언제나 **테스트 서버(dev)** 에 붙습니다. 실서비스 DB에는 붙을 수 없습니다(값을 로컬에 두지 않습니다).

## 환경이 두 개입니다

| | 테스트(dev) | 실서비스(prod) |
|---|---|---|
| Supabase 프로젝트 | TennisClubs `xiwwbgltkbvxdzxxxoba` | baselineplay-prod `rjuhydxaoizgfiatyfpo` |
| 붙는 곳 | 로컬 `npm run dev`, Vercel 프리뷰(`dev` 브랜치) | `baselineplay.vercel.app`(`main` 브랜치) |
| 계정 | 테스트 계정(비밀번호 `123123`, `docs/e2e/README.md`) | 실제 가입자만 |

- **개발은 `dev` 브랜치**에서 합니다. `main`에 push하면 곧 실서비스 배포입니다.
- **릴리스**: DB 변경(마이그레이션)이 있으면 prod에 먼저 적용 → `git checkout main && git merge dev && git push` → `git checkout dev`.

## 확인 명령

```bash
npx tsc --noEmit && npm run lint && npm run build && npx vitest run
```

## 문서 지도

| 무엇을 알고 싶나 | 어디 |
|---|---|
| 규칙·구조·도메인 용어·DB 요약 (Claude가 매 세션 읽는 문서) | `CLAUDE.md` |
| 주차별 결정 배경(왜 그렇게 했나) | `docs/history/` |
| 설계 문서(컬러·타이포·레이팅·소셜 로그인) | `docs/` |
| 브라우저 테스트 절차·결과·결함 대장 | `docs/e2e/` |
| DB 스키마 재현 정본(새 환경 만들 때) | `supabase/history/` + `scripts/db-history.ts` |
| 마이그레이션(변경 이력) | `supabase/migrations/` |
