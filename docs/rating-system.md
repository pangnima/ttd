# 클럽 레이팅 시스템 (동적 NTRP) 명세

> 이 문서는 테니스 클럽 플랫폼의 **클럽별 동적 레이팅(클럽 NTRP)** 알고리즘과 데이터 모델을 정의하는 단일 진실 명세서다.
> 구현 시 상수·공식은 반드시 이 문서를 기준으로 한다.

## 1. 배경과 목표

현재 NTRP는 `users.ntrp`에 **자가 선언 정적 값**으로만 존재한다(가입 시 기본 3.0, 프로필에서 수동 수정). 경기를 해도 변하지 않아 실력 변화를 반영하지 못하고, 모든 클럽에서 같은 값이 노출된다.

본 시스템은 **클럽마다 독립적으로 운영되는 동적 레이팅(클럽 NTRP)** 을 도입한다.

- 클럽 가입 시 **2.5**로 시작한다(개인 통합 NTRP가 4.0이어도 클럽에선 2.5에서 출발).
- 대진표에서 **확정(`is_fixed = true`)된 경기** 결과에 따라 ELO식 알고리즘으로 자동 변동한다.
- 실력 차가 큰 상대를 이기면 크게 오르고, 약한 상대를 이겨도 조금만 오른다(승부의 의외성 반영).
- 통합(개인) NTRP는 기존대로 **수동 유지**하고, 클럽 NTRP만 별도 저장소에서 동적으로 관리한다.

### 설계 결정 요약
| 항목 | 결정 |
|---|---|
| 통합(개인) NTRP | **수동 유지** — `users.ntrp` 그대로, 경기로 자동 변동 안 함 |
| 변동 크기 결정 요소 | **승/패 + 세트·게임 스코어 차이**(margin of victory) 반영 |
| 클럽 NTRP 표시 | **연속 소수값, 소수점 3자리**(예: 2.607) |
| 게스트 선수 | **포함·잠정** — 게스트도 클럽 레이팅(기본 2.5) 부여·변동 |

---

## 2. 알고리즘 — NTRP 스케일 ELO

실제 USTA 동적 NTRP / UTR도 내부적으로 소수점 연속값을 운영하고 표시만 밴딩한다. 동일하게 **클럽 NTRP를 연속 numeric으로 저장**하고, ELO 기대승률(expected score)을 NTRP 스케일에 직접 적용한다.

### 2.1 상수
| 상수 | 값 | 의미 |
|---|---|---|
| `D` | **1.0** | 스케일 계수. NTRP 1.0 차이 = 승산 10배 |
| `K_PROVISIONAL` | **0.10** | 잠정기(경기 수 < 임계) 최대 변동폭 |
| `K_BASE` | **0.05** | 정착 후 최대 변동폭 |
| `PROVISIONAL_THRESHOLD` | **10** | 잠정기 경기 수 경계 |
| `MARGIN_WEIGHT` | **0.5** | 마진 가중치 (factor 범위 1.0~1.5) |
| `DEFAULT_RATING` | **2.5** | 클럽 가입 기본값 |
| `MIN_RATING` / `MAX_RATING` | **1.0 / 7.0** | 경계 |

### 2.2 기대 승률 (Expected Score)
플레이어 A가 B를 상대할 기대 승률:

```
E_A = 1 / (1 + 10^((R_B − R_A) / D))
E_B = 1 − E_A
```

- `R_A`, `R_B`: 클럽 NTRP(연속값). `D = 1.0`.
- NTRP 1.0 차이 → 강자 기대승률 ≈ **0.909**
- NTRP 0.5 차이 → 강자 기대승률 ≈ **0.760**
- 동급(0 차이) → **0.500**

테니스 직관(3.5 vs 4.5는 거의 확정승, 0.5 차이는 약 3:1)과 부합한다.

### 2.3 변동량 (Delta)
```
delta = K × marginFactor × (S − E)
```
- `S`: 실제 결과 — 승 `1`, 패 `0`, 무 `0.5`
- `(S − E)`: 기대 대비 초과 성과. **이 항이 "의외성" 요구사항을 자동 충족**한다.
  - 강자가 예상대로 이기면 `(1 − 0.9)` → 미세 상승
  - 약자가 이변을 일으키면 `(1 − 0.09)` → 큰 상승

### 2.4 K 계수 (Provisional 차등)
자가 선언 2.5 출발값을 실제 실력으로 빠르게 보정하기 위해, 경기 수가 적을수록 크게 움직인다.

| 조건 | K |
|---|---|
| 클럽 경기 수 `< PROVISIONAL_THRESHOLD(10)` | `K_PROVISIONAL` = 0.10 |
| 그 이상 | `K_BASE` = 0.05 |

> K는 **각 선수의 클럽 경기 수**를 기준으로 개별 적용한다(상대가 잠정기여도 본인 경기 수로 판단).
> K=0.05일 때 동급 상대 한 판 승리 ≈ ±0.025, 이변승 ≈ +0.045(상한 근처), 강자의 예상 승 ≈ +0.005.

### 2.5 마진 계수 (세트·게임 차 반영)
`result_sets`(세트별 `{ team1, team2 }` 게임 수)에서 전 세트 게임을 합산한다.

```
Gw = 승자가 획득한 총 게임 수
Gl = 패자가 획득한 총 게임 수
dominance    = clamp((Gw − Gl) / (Gw + Gl), 0, 1)
marginFactor = 1 + MARGIN_WEIGHT × dominance          // 범위 [1.0, 1.5]
```
- 6-0, 6-0 압승 → dominance ≈ 1 → factor 1.5
- 7-6, 6-7, 7-6 박빙 → dominance ≈ 0 → factor 1.0
- **무승부, 스코어 없음(부전승 등)** → `marginFactor = 1.0`

### 2.6 복식
- **팀 레이팅 = 두 선수 클럽 NTRP의 평균.** 팀 평균으로 `E`를 계산한다.
- 산출된 `delta`를 **팀 두 선수에게 동일하게 적용**한다(함께 상승/하락). margin·K도 팀 단위로 동일.
- 듀스/애드 코트 배치(`team1_ad_player_id`)는 레이팅에 영향을 주지 않는다(통계 분석 영역으로 분리 유지).

### 2.7 경계 / 결정성
- 변동 후 `clamp(rating, MIN_RATING, MAX_RATING)` = `[1.0, 7.0]`.
- 게스트 포함 모든 참가자에 동일 규칙 적용. 출발값은 클럽 기본 2.5.
- 경기 적용 순서는 결정적으로 고정: **`match_game.date → round.order → time_slot.start_at → match.id`**.

### 2.8 검증용 Worked Examples
1. **이변승(단식)**: A 2.500 vs B 4.000, A가 6-4·6-4 승.
   - `E_A = 1/(1+10^(1.5)) ≈ 0.031`, `Gw=12, Gl=8 → dominance=0.2 → mf=1.10`, `K=0.05`
   - `ΔA = 0.05 × 1.10 × (1 − 0.031) ≈ +0.053` → A 2.500 → **2.553**
   - `ΔB ≈ −0.053` → B 4.000 → **3.947**
2. **강자 예상 압승**: 같은 매치에서 B가 6-1·6-2 승.
   - `Gw=12, Gl=3 → dominance=0.6 → mf=1.30`
   - `ΔB = 0.05 × 1.30 × (1 − 0.969) ≈ +0.002` (거의 불변), `ΔA ≈ −0.002`
   - → 요구사항(강자가 약자에게 압승해도 소폭 상승) 충족
3. **잠정기 신규 강자 정착**: C(실제 4.0, 클럽 2.500, 경기 0 → K=0.10) vs D 2.500, C가 6-1·6-0 승.
   - `E_C = 0.5`, `Gw=12, Gl=1 → dominance≈0.846 → mf≈1.42`
   - `ΔC = 0.10 × 1.42 × (1 − 0.5) ≈ +0.071` → C 2.500 → **2.571** (빠르게 상승)

---

## 3. 데이터 모델 (마이그레이션 `0018`)

`club_members`에 컬럼을 더하지 않고 **(club_id, user_id) 키의 전용 테이블**을 둔다 → 게스트(클럽 멤버 여부와 무관)까지 일관되게 커버하고, 재계산 시 통째로 재작성하기 쉽다.

```
club_player_ratings
  club_id        uuid    FK clubs
  user_id        uuid    FK users        -- 게스트 포함
  rating         numeric NOT NULL DEFAULT 2.5
  matches_played int     NOT NULL DEFAULT 0
  updated_at     timestamptz
  PRIMARY KEY (club_id, user_id)

club_rating_history                       -- 추세 그래프 + 감사/디버깅용
  id            uuid PK
  club_id       uuid
  user_id       uuid
  match_id      uuid    FK match_game_matches
  rating_before numeric
  rating_after  numeric
  delta         numeric
  created_at    timestamptz               -- 경기 시점(date) 복제, 정렬용
```

- **RLS**: 두 테이블 모두 `is_club_approved_member(club_id)` 에게 SELECT 허용. 클라이언트 직접 INSERT/UPDATE 금지 — 쓰기는 SECURITY DEFINER RPC로만.
- **RPC `apply_club_rating_snapshot(p_club_id uuid, p_snapshot jsonb)`** (SECURITY DEFINER): 호출자가 `is_club_owner(p_club_id)` 인지 검증 후, 해당 클럽의 `club_player_ratings`/`club_rating_history`를 **삭제 후 스냅샷으로 원자적 재작성**.
- **시딩**: 멤버 승인(`approveMemberAction`)·게스트 생성(`add_guest_player`) 시 `club_player_ratings` 행을 2.5로 생성. 조회 시 행이 없으면 2.5로 coalesce(경기 없는 멤버도 2.500 노출).

---

## 4. 재계산 아키텍처 — 전체 결정적 재계산(Full Recompute)

ELO는 순차 의존적이라 증분 방식은 경기 수정/삭제/확정해제 시 깨지기 쉽다. 대진표는 owner가 확정 후에도 편집 가능(`update_match_game`)하므로 **클럽 단위 전체 재계산**으로 정확성을 보장한다(클럽 규모상 수백 경기 = O(n), 멱등·결정적).

**알고리즘 위치 = 테스트 가능한 순수 TS**(기존 `lib/analytics/` 패턴과 일치), **영속화 = RPC**.

재계산 절차:
1. 모든 참가자 레이팅을 2.5, `matches_played = 0`으로 초기화.
2. 클럽의 **확정·종료 경기 전부**를 §2.7 정렬키 순으로 조회.
3. 각 경기를 순차 재생(replay)하며 §2의 delta를 적용, 러닝 레이팅·경기 수 갱신, history 행 누적.
4. 최종 스냅샷을 `apply_club_rating_snapshot` RPC로 원자적 저장.

**트리거 지점**(모두 `recalculateClubRatings(clubId)` 호출):
- `confirmMatchGameAction` — `is_fixed = true` 직후 (핵심 신규 훅)
- 확정된 대진표 편집/삭제 경로
- (확정 해제 기능이 있다면) 동일 호출

**모듈 구성**:
- `lib/rating/constants.ts` — §2.1 상수
- `lib/rating/elo.ts` (순수) — `expectedScore()`, `marginFactor()`, `computeMatchDelta()`, `replayClubRatings(matches): Snapshot`
- `lib/queries/ratings.ts` — 클럽 레이팅/추세 조회 + 재계산용 경기 조회
- `lib/actions/ratings.ts` — `recalculateClubRatings(clubId)`

---

## 5. UI 노출
- **클럽 멤버 목록 / 멤버 프로필**: 클럽 NTRP 3자리(예: `2.607`). 통합 NTRP와 라벨로 구분("클럽 레이팅" vs "NTRP").
- **클럽 대시보드**: 신규 "레이팅 랭킹" 카드(클럽 NTRP 내림차순, 경기 수 병기).
- **(선택) 대진표 상세**: 확정 경기별 레이팅 변동 표시(▲0.107 / ▼0.107) — `club_rating_history` 기반.
- **(선택) 프로필**: 클럽 레이팅 추세 스파크라인.

---

## 6. 참고 자료
- **NTRP (National Tennis Rating Program)**: USTA의 1.0~7.0(0.5 단위) 등급. 본 시스템의 표시 스케일.
- **ELO rating**: 기대 승률 `1/(1+10^(Δ/D))`, 변동 `K(S−E)`. 체스(Arpad Elo)·온라인 게임 매칭의 표준. 본 시스템은 `D`를 NTRP 스케일(=1.0)로 채택.
- **Margin of Victory 승수**: World Football Elo·FiveThirtyEight식 점수차 가중에서 차용. 본 시스템은 게임 dominance 선형 가중(1.0~1.5).
- **Provisional rating**: 체스·UTR의 초기 고-K 빠른 수렴기 개념. 본 시스템은 10경기 미만 K=0.10.
- **동적 NTRP / UTR**: 내부적으로 소수점 연속값을 운영하고 표시만 밴딩하는 업계 관행과 정합(본 시스템은 3자리 연속값을 그대로 노출).

---

## 7. 구현 단계
1. ~~`docs/rating-system.md` 작성~~ (본 문서)
2. 마이그레이션 `0018` 작성·적용(테이블·RLS·RPC·시딩) → 타입 재생성
3. `lib/rating/` 순수 엔진 + 단위 테스트(§2.8 케이스) 통과
4. `lib/queries/ratings.ts` + `lib/actions/ratings.ts` 재계산 오케스트레이터
5. 트리거 연결(confirm/edit/delete) + 멤버 승인 시딩
6. UI: 멤버 목록·프로필 클럽 NTRP, 대시보드 레이팅 랭킹 카드
7. (선택) 경기별 변동·추세 표시

## 8. 검증 방법
- **단위**: `lib/rating/elo.ts` 순수함수로 §2.8 3개 케이스 기대값 일치 확인.
- **결정성**: 같은 경기 집합 2회 재계산 → 동일 스냅샷.
- **통합(앱)**: 더미 클럽 2.5 출발 → 이변승/예상승/잠정기 시나리오 입력·확정 → 멤버 목록·랭킹·history 값이 손계산과 일치.
- **편집 견고성**: 확정 경기 수정/삭제 후 재계산이 체인을 깨지 않고 올바른 최종값 산출.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` 통과.
