# 컬러 시스템 가이드

색상 값의 단일 출처는 `src/app/globals.css`다. 컴포넌트는 값을 모르고 **시맨틱 토큰 이름만** 쓴다. 이 파일 밖에서 색상 hex를 정의하지 않는다(예외는 §6).

## 1. 3계층 구조

| 계층 | 위치 | 역할 |
|---|---|---|
| L1 원시 브랜드 팔레트 | `:root`의 `--brand-*` | 디자인 사양 원본 hex. 추적용이며 유틸리티로 노출하지 않는다 |
| L2 시맨틱 토큰 | `:root` / `.dark` | 용도별 이름(`--primary`, `--win`, `--spot`…). 모드별 값을 여기서만 갈아끼운다 |
| L3 Tailwind 유틸리티 | `@theme inline`의 `--color-*` | `bg-primary` `text-win` `border-spot/40` 등으로 노출 |

`@theme inline`이므로 유틸리티가 `var(--토큰)`을 인라인하고, `.dark` 오버라이드가 그대로 적용된다. **`dark:` 색상 분기를 새로 쓰지 않는다** — 모드 차이는 토큰이 흡수한다.

## 2. 악센트의 3역할

각 악센트 색은 쓰임에 따라 세 토큰으로 나뉜다. 사양 hex(비비드)를 흰 배경 위 텍스트로 쓰면 WCAG AA(4.5:1)에 한참 못 미치기 때문이다.

| 역할 | 토큰 | 쓰임 |
|---|---|---|
| 표면 위 텍스트·테두리 | `--X` | `text-win`, `border-loss/40`, `bg-spot/15` 위 글자 |
| 브랜드 비비드 채움 | `--X-solid` | **글자를 얹지 않는** 넓은 바·링·아이콘·로고 |
| 채움 위 텍스트 | `--X-foreground` | `bg-win text-win-foreground` |

글자를 얹는 채움은 **`--X`** 를 쓴다(`bg-win text-win-foreground`). 비비드 `--X-solid`는 흰 배경 위 대비가 2:1 안팎이라 그 위에 읽을 수 있는 글자를 올릴 수 없기 때문이다 — 승패 바(`personal-match-card`), 승률 링(`win-rate-ring`), 라이벌 스택바처럼 **텍스트가 없는 넓은 면**에만 쓴다. 예외는 옐로우로, `--spot-solid`는 명도가 높아 짙은 글자를 얹을 수 있다(Chip solid / Badge `lime` / Button `accent`).

다크 모드는 배경이 어두워 비비드 원본이 그대로 AA를 넘기므로 `--X`와 `--X-solid` 값이 같은 경우가 많다.

## 3. 토큰 표

### 베이스

| 토큰 | 라이트 | 다크 | 대비 |
|---|---|---|---|
| `--background` | `#f4f7f9` | `#0b1319` | — |
| `--foreground` | `#1d2d35` | `#e6edf0` | 13.2:1 / 15.8:1 |
| `--card` `--popover` | `#ffffff` | `#15222b` | — |
| `--secondary` `--muted` `--accent` | `#e6edf2` | `#1e2e38` | surface-2 |
| `--muted-foreground` | `#5e7383` | `#8d9fa8` | 4.6:1 / 5.9:1 |
| `--border` | `#d3dde4` | `#344854` | — |
| `--input` | `#7c8f9c` | `#647985` | 3.4:1 / 3.6:1 (WCAG 1.4.11) |
| `--ring` | `var(--primary)` | `var(--primary)` | 포커스 링 = 액션 색 |

명도 계단은 **`background` < `secondary/muted` < `card/popover`** 순이다(다크는 역순으로 밝아진다). 랜딩·카드 레이아웃이 이 계단에 의존하므로 세 값을 함께 조정한다.

### 액션·상태

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--primary` / `-foreground` | `#0e7695` / `#ffffff` | `#06d6a0` / `#0b1319` | 메인 액션·링크·포커스 |
| `--info` / `-foreground` | `#0e7a9c` / `#ffffff` | `#2cb1db` / `#0b1319` | 보조 정보·해시태그 |
| `--win` / `-solid` / `-foreground` | `#07805f` / `#06d6a0` / `#ffffff` | `#06d6a0` / `#06d6a0` / `#0b1319` | 승·성공·완료·활성 |
| `--loss` / `-solid` / `-foreground` | `#b85335` / `#ff7f50` / `#ffffff` | `#ff9470` / `#ff7f50` / `#0b1319` | 패·부정 |
| `--destructive` / `-foreground` | `var(--loss)` / `#ffffff` | `var(--loss)` / `var(--loss-foreground)` | 삭제·에러·취소 |
| `--spot` / `-solid` / `-foreground` | `#8a6a0f` / `#ffd166` / `#1d2d35` | `#ffd166` / `#ffd166` / `#0b1319` | 대기·주의·별점·강조 |
| `--accent-lime` / `-foreground` | `var(--spot-solid)` / `var(--spot-foreground)` | 〃 | **하위호환 별칭** — §6 |

### 카테고리 데이터 팔레트

`--cat-1` ~ `--cat-8`. **결과가 아닌 분류**(경기 타입, 코트 표면, 손잡이, 듀스/애드, 아바타, 메달) 전용이며 승패 시맨틱과 색을 공유하지 않는다. 텍스트·채움 겸용 단일 값이라 `dark:` 분기가 필요 없다.

| 슬롯 | 라이트 | 다크 | 쓰임 |
|---|---|---|---|
| `--cat-1` | `#0e7a9c` | `#2cb1db` | 단식·하드코트·오른손·듀스코트 |
| `--cat-2` | `#2e7d32` | `#4ade80` | 인조잔디 |
| `--cat-3` | `#9c5a18` | `#cf7a52` | 클레이코트·동메달 |
| `--cat-4` | `#916400` | `#ffd166` | 혼복 |
| `--cat-5` | `#6e4fc4` | `#a78bfa` | 여복·애드코트·왼손 |
| `--cat-6` | `#5a6e7a` | `#8d9fa8` | 기타·미지정·은메달 |
| `--cat-7` | `#a8386b` | `#f472a5` | 특별매치 |
| `--cat-8` | `#2f6fa8` | `#7fb3e8` | 남복 |

각 슬롯은 `--win`·`--loss`와 RGB 거리 30 이상을 유지한다(`colors.test.ts`가 강제). 실제 코트 색을 따르되 결과 색과 겹치지 않도록 인조잔디는 민트가 아닌 순수 그린, 클레이는 코랄이 아닌 흙빛으로 잡았다. `--cat-1`이 `--primary`와 같은 블루 계열인 것은 §4의 의도된 공유다.

아바타 팔레트(`src/lib/avatar-color.ts`)는 이 8슬롯을 전부 쓴다. **해시가 `% 배열길이`라 길이 8을 바꾸면 기존 사용자의 아바타 색이 전부 재배정된다.**

## 4. 두 가지 의도된 색 공유

**모드에 따라 primary의 색상(hue)이 바뀐다.** 라이트는 블루, 다크는 민트다(다크 배경에서 민트의 시인성이 블루보다 높다). 그 결과:

- **다크에서 `--primary`와 `--win`이 같은 민트다.** 구분은 색이 아니라 **형태**가 담당한다 — 액션은 solid 버튼(`bg-primary`), 상태는 틴트 칩(`bg-win/15 text-win`). 승리 배지에 solid를 쓰더라도 클릭 대상이 아니므로 혼동되지 않는다.
- **라이트에서 `--primary`와 `--info`가 같은 블루 계열이다.** 사양 팔레트에 블루가 하나뿐이라 그렇다. 한 톤 차이를 두었고, 카테고리 의미는 전부 `--cat-*`로 분리해 블루의 과부하를 줄였다.

**`--destructive`가 `--loss`와 같은 코랄이다.** 새 팔레트의 붉은 계열은 코랄 하나이며, 코랄 `#ff7f50`은 실제 클레이코트 색이라 "패 = 클레이"라는 기존 설계와도 맞는다. warm 대역은 **코랄(부정·위험·패배)** 과 **옐로우(주의·대기·강조)** 둘로만 정리했다. 패배 배지가 에러처럼 읽히면 `--loss`만 별도 값으로 되돌리면 된다(토큰이 분리돼 있다).

## 5. 용도 판정 규칙

값이 아니라 **용도**로 고른다.

1. 클릭 가능한 주요 액션·링크·포커스 → `primary`
2. 경기 결과(승/패) → `win` / `loss`, 무·미확정 → `muted`
3. 삭제·탈퇴·에러 문구·이의 제기 → `destructive`
4. 대기·미완료·주의·별점·관리자 같은 "눈길을 끄는 꼬리표" → `spot`
5. 보조 정보·부가 데이터 → `info`
6. 결과가 아닌 **분류 태그** → `cat-1~8` (승패 색을 빌려 쓰지 않는다)
7. 그 외 전부 → `foreground` / `muted-foreground` / `border` / `secondary`

## 6. 예외와 수동 동기화

| 대상 | 이유 |
|---|---|
| `src/components/ui/**` | shadcn 자동 생성이라 수정 금지(`CLAUDE.md`). `button.tsx`의 `accent` variant와 `badge.tsx`의 `lime` variant가 `--accent-lime`을 참조하므로, 그 토큰을 `var(--spot-solid)` **별칭**으로 남겨 파일을 건드리지 않고 색만 따라가게 했다. 앱 코드는 `spot`을 쓴다 |
| `src/lib/rating/tier.ts` | 티어 8계급은 게임 랭크 정체성이라 브랜드 팔레트와 분리 유지. Tailwind 팔레트 클래스를 그대로 쓴다 |
| `src/lib/og/brand.ts` | `next/og`(Satori)는 CSS 변수를 해석하지 못한다. `globals.css` 라이트 토큰의 **수동 미러**이며, `colors.test.ts`가 두 값의 일치를 강제한다 |
| `public/**/*.svg` | 정적 에셋(로고·티어 엠블럼·빈 상태 일러스트)은 CSS가 닿지 않는다. 브랜드 색 변경 시 수동 교체 |
| `bg-black/10` (모달 딤) | 오버레이는 테마 무관 |

## 7. 금지 사항

- Tailwind 기본 팔레트 클래스 — `bg-emerald-500` `text-orange-600` `border-slate-300` 등 (§6 예외 밖)
- `bg-[#118AB2]` 같은 임의값 색상
- 새 `dark:` 색상 분기 — 모드 차이는 토큰이 흡수한다
- `text-*` 네임스페이스 충돌: 색상 토큰 이름에 `display` `h1~h4` `body` `body2` `caption` `micro` 사용 금지 (`docs/typography.md` 참고)
- `globals.css` 밖에서의 hex 색상 정의 (§6 예외 밖)

## 8. 검증

```bash
npx vitest run src/lib/dashboard/colors.test.ts
```

- 금지 클래스·임의값 **0건** 단언
- `globals.css` hex를 파싱해 라이트/다크 양쪽의 **대비율** 단언 (본문 7:1, 보조 텍스트·악센트 4.5:1, 경계 3:1)
- `lib/og/brand.ts` 6개 값이 라이트 토큰과 일치하는지 단언(드리프트 검출)

```bash
# 잔존 0건이어야 함
rg -nE "\b(bg|text|border|ring|fill|stroke|from|to|via|divide|outline|placeholder|decoration|shadow|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|[1-9]00|[1-9]50)\b" src \
  --glob '!src/components/ui/**' --glob '!src/lib/rating/tier.ts' --glob '!**/*.test.ts'
```

라이트/다크 실화면 검수 시 팔레트 교체에 가장 취약한 지점(알파 스케일 의존):
`stats/activity-hour-heatmap-card.tsx`(`bg-win/20~80` 5단계) · `chip.tsx` soft/outline · `button.tsx` destructive 틴트 · 사이드바·헤더의 `border-foreground/5` · 랜딩의 3단 명도 계단.
