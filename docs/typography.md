# 타이포그래피 가이드

폰트 사이즈·줄간격·자간은 `src/app/globals.css`의 `@theme` 시맨틱 토큰이 단일 출처다. 굵기·색상 조합은 `src/lib/dashboard/tokens.ts`의 `TYPO`가 담당한다. 이 두 곳 외에서 폰트 사이즈 값을 정의하지 않는다.

## 8단계 스케일 + 예외 1개

| 레벨 | 토큰 | 모바일 → 데스크톱 | line-height | letter-spacing | 용도 |
|---|---|---|---|---|---|
| Display | `text-display` | 36px → 48px (clamp) | 1.2 | -0.02em | 랜딩 최상단 카피, 에러 화면 대형 숫자 |
| H1 | `text-h1` | 28px → 36px (clamp) | 1.25 | -0.02em | 페이지 대제목 (`PageHeader`) |
| H2 | `text-h2` | 24px → 28px (clamp) | 1.3 | -0.01em | 문서형 화면(랜딩·가이드·인증 카드) 주요 섹션, 에러 메시지 |
| H3 | `text-h3` | 20px → 24px (clamp) | 1.35 | 0 | 앱 화면의 페이지 내 섹션 헤더 |
| H4 | `text-h4` | 18px → 20px (clamp) | 1.4 | 0 | 카드 제목, 폼 그룹 제목, `CardTitle` 덮어쓰기 |
| Body 1 | `text-body` | 16px 고정 | 1.65 → md 1.55 | 0 | 기본 본문, 설명문, 빈 상태 문구, 폼 라벨, **모든 input/textarea/select** |
| Body 2 | `text-body2` | 14px 고정 | 1.65 → md 1.55 | 0 | 부가 텍스트, 메타, nav 링크, 버튼, 드롭다운 항목, 상태 문구 |
| Caption | `text-caption` | 12px 고정 | 1.5 | 0 | 캡션, 경고, 폼 헬퍼, 차트 범례·눈금, eyebrow 라벨 |
| (예외) micro | `text-micro` | 11px 고정 | 1 | 0 | 알림 카운트·티어/특별매치 배지·대진표 셀 배지 **전용**. 본문·라벨 금지 |

- 헤딩 5레벨의 clamp는 360px → 1024px 구간에서 선형으로 커진다(예: H1 `clamp(1.75rem, 1.2vw + 1.48rem, 2.25rem)`). 선호값에 `rem` 항이 있어 브라우저 확대(WCAG 1.4.4)에도 대응한다.
- 본문 줄간격은 `:root { --leading-body }`를 `@media (min-width: 48rem)`에서 1.65 → 1.55로 스왑한다. clamp는 line-height를 뷰포트별로 나눌 수 없어 변수로 처리한다.
- 굵기는 토큰에 굽지 않는다. 같은 크기를 굵기만 바꿔 쓰는 경우(숫자 KPI 등)가 많기 때문이다.

## TYPO 조합 (`src/lib/dashboard/tokens.ts`)

| 키 | 클래스 | 쓰임 |
|---|---|---|
| `display` `h1` `h2` `h3` `h4` | 토큰 + `font-extrabold/bold/semibold` + `text-foreground` | 헤딩 |
| `body` / `bodyMuted` | `text-body` + foreground / muted | 본문 |
| `body2` / `body2Muted` | `text-body2` + foreground / muted | 부가 텍스트 |
| `caption` / `captionStrong` | `text-caption` muted / medium foreground | 캡션 |
| `eyebrow` | `text-caption font-medium tracking-eyebrow uppercase tabular-nums` | 소형 대문자 라벨 (구 mono-label) |
| `micro` | `text-micro font-medium leading-none` | 배지·카운트 |

폼 토큰(`FORM_INPUT_BASE`·`MATCH_FORM_INPUT`)은 `text-body`, 라벨(`FORM_LABEL_BASE`)은 `text-caption` caps, `EMPTY_BLOCK`은 `text-body2`, `PILL_BASE`는 `text-caption`.

## 용도 판정 규칙 (재분류 기준)

값이 아니라 **용도**로 고른다.

1. 문장(설명문, 안내문, 빈 상태 메시지, 다이얼로그 본문, 폼 라벨) → **Body 1**
2. 문장이 아닌 단어·수치·라벨(날짜, 보조 라벨, nav, 탭, 버튼, 드롭다운 항목, 테이블 보조 열) → **Body 2**
3. 부연(캡션, 경고, 도움말, 범례, 눈금, '잠정' 같은 꼬리표) → **Caption**
4. 배지·카운트(알림 수, 티어 배지, 대진표 셀 매치타입 배지, 최근 폼 배지) → **micro** (유일한 12px 미만 예외)
5. 숫자 KPI(승률, 스코어, 전적 수)는 별도 레벨을 만들지 않고 `text-h4/h3/h2/h1 + font-bold tabular-nums`로 크기만 빌린다.
6. 모호하면 한 단계 위를 고른다(가독성 우선).

## 태그와 클래스 분리 원칙

**태그는 문서 아웃라인, 클래스는 시각 레벨.** 둘을 섞지 않는다.

| 화면 유형 | 페이지 제목 | 페이지 내 섹션 | 카드·폼 그룹 제목 |
|---|---|---|---|
| (main) 앱 화면 (클럽·프로필·개인경기·대진표) | `<h1>` H1 (`PageHeader`) | `<h2>` **H3** | `<h2>`/`<h3>` **H4** |
| 문서형 화면 (랜딩·가이드·인증) | Display / H1 (인증 카드는 H2) | `<h2>` **H2** | `<h3>` H4 |

- 앱 화면에서 H2를 건너뛰는 이유: 카드가 많은 대시보드에서 섹션 헤더가 24px면 페이지 제목과 경쟁한다.
- 페이지당 `<h1>`은 하나. 카드 제목은 `<p>`가 아니라 헤딩 태그로 쓴다(`SectionCard`가 `<h2 className={TYPO.h4}>`를 렌더).

## 폼 요소 16px 철칙

`globals.css`의 레이어 밖 규칙이 `input`(checkbox/radio/range/file 제외)·`textarea`·`select`에 전 뷰포트 16px을 강제한다. iOS Safari는 포커스된 폼 요소가 16px 미만이면 화면을 확대하므로, 폼 요소에 `text-xs` 같은 작은 사이즈 클래스를 주지 않는다. shadcn `Input`의 `md:text-sm`도 이 규칙이 덮는다. 좁은 인풋은 폰트를 줄이지 말고 폭(`w-*`)·높이(`h-9` 이상)를 조정한다.

## 금지 사항

- `text-xs` `text-sm` `text-base` `text-lg` `text-xl` `text-2xl`… Tailwind 기본 사이즈 클래스 (components/ui 내부 제외)
- `text-[13px]` `text-[0.8rem]` 같은 임의값
- `sm:text-*` `md:text-*` 반응형 사이즈 접두사 — 헤딩은 clamp가 대신한다
- `--color-display` `--color-caption` 같은 색상 토큰 이름 — `text-*` 유틸이 색상과 사이즈 네임스페이스를 공유하므로 충돌한다
- `@layer base`의 `h1~h4` 태그 기본 스타일 — 태그 기본값이 클래스와 싸운다

## 검증

```
# 잔존 0건이어야 함 (components/ui 제외)
rg -n "\btext-(xs|sm|base|lg|xl|[2-6]xl)\b|text-\[[0-9.]+(px|rem)\]|(sm|md|lg):text-" src --glob '!src/components/ui/**' --glob '!**/*.test.ts'

# 브라우저 콘솔(375px·1280px) — 폼 요소 16px 확인, 빈 배열이어야 함
[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),textarea,select')]
  .filter(el => parseFloat(getComputedStyle(el).fontSize) < 16)
```

`npx vitest run src/lib/utils.test.ts src/lib/dashboard/tokens.test.ts`가 `cn()`의 토큰 병합과 `TYPO` 구성을 가드한다.
