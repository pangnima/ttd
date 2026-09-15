import { OUTCOME_LABEL } from '@/lib/dashboard/outcome'
import { GUEST_LABEL, HOST_LABEL, INVITED_LABEL, JOINED_LABEL } from '@/lib/match-rooms/member-labels'
import { ROOM_STAGE_HINT, ROOM_STAGE_LABEL, type RoomStage } from '@/lib/match-rooms/room-stage'
import { ROOM_TURN_PILL } from '@/lib/match-rooms/room-turn'
import { MATCH_ROOMS_PATH, MY_ROOM_TABS, MY_ROOMS_PATH, ROOM_LIST_TABS } from '@/lib/match-rooms/tabs'

/**
 * 사용 가이드 문구 — **단일 출처**(Week 57).
 *
 * 가이드 페이지(`/guide`)와 세 목록 화면의 인라인 설명(`PageGuide`)이 같은 객체를 읽는다.
 * 옛 `/guide`(Week 39에 삭제)는 석 달 사이 다섯 섹션 중 넷이 낡았다 — 문구가 낡는 속도가 이
 * 모듈의 존재 이유다. 그래서 화면이 이미 쓰는 라벨(단계·차례·탭·명단 상태·승패)을 새로 적지 않고
 * **보간**으로 가져온다. 어휘가 바뀌면 가이드가 따라가고, 어긋나면 `sections.test.ts`가 잡는다.
 *
 * 아이콘은 두지 않는다 — 순수 모듈(vitest)이라 컴포넌트가 id → icon 맵을 갖는다(`onboarding.ts`와 같다).
 */

/** 인라인 설명을 얹는 세 목록 화면 — `myMatchNavItems`의 href와 1:1 */
export type GuideScreenId = 'match-rooms' | 'my-match-rooms' | 'personal-matches'
export type GuideSectionId = 'flow' | GuideScreenId | 'stages' | 'terms'

export type GuideSection = {
    id: GuideSectionId
    title: string
    /** 한 줄 요약 — 인라인 `<summary>`와 가이드 카드의 lead가 함께 쓴다 */
    summary: string
    steps: string[]
    /** 화면 섹션만 — 가이드 카드 하단 링크 */
    href?: string
    cta?: string
}

export const GUIDE_PATH = '/guide'
export const PERSONAL_MATCHES_PATH = '/me/personal-matches'

/** 인라인 설명의 「전체 가이드 →」가 착지하는 앵커 */
export function guideAnchorHref(id: GuideSectionId): string {
    return `${GUIDE_PATH}#${id}`
}

const [LIST_OPEN, LIST_PAST] = ROOM_LIST_TABS
const [MINE_OPEN, MINE_PAST] = MY_ROOM_TABS
const STAGE_FLOW: RoomStage[] = ['recruiting', 'playing', 'reviewing', 'settled', 'closed']
const OUTCOMES = `${OUTCOME_LABEL.win}·${OUTCOME_LABEL.loss}·${OUTCOME_LABEL.draw}`
const TURN_PILLS = `「${ROOM_TURN_PILL.enterResult}」·「${ROOM_TURN_PILL.confirmResult}」`

const FLOW: GuideSection = {
    id: 'flow',
    title: '매칭은 이렇게 흘러갑니다',
    summary: '매칭을 열거나 들어가고, 매칭 안에서 게임을 만들고, 결과를 서로 확인하면 전적이 됩니다.',
    steps: [
        `함께 칠 사람을 모읍니다 — [+ 매칭 만들기]로 매칭을 열어 ${HOST_LABEL}가 되거나, 매칭 리스트에서 비밀번호로 들어가 참가자가 됩니다. 초대를 받았다면 [참가 수락]만 누르면 됩니다.`,
        `매칭 안에서 그날 친 게임을 올립니다 — [게임 추가]로 하나씩, 또는 ${HOST_LABEL}의 [자동 대진표]로 한 번에.`,
        '게임마다 한 사람이 결과를 입력하면 나머지 참가자가 확인합니다. 회원 참가자 전원이 확인해야 확정되고, 틀렸다면 [이의 제기]로 다시 입력을 요청할 수 있습니다.',
        '모든 게임이 확정되면 매칭이 종료되고, 그 경기들은 「개인 경기 결과」와 내 통계에 반영됩니다.',
    ],
}

const MATCH_ROOMS: GuideSection = {
    id: 'match-rooms',
    title: '매칭 리스트',
    summary: '리스트에 노출된 모든 매칭입니다. 들어갈 매칭을 고르거나 직접 여는 곳이에요.',
    steps: [
        `「${LIST_OPEN.label}」 탭에서 일시·코트·${HOST_LABEL}를 보고 매칭을 고릅니다. 「${LIST_PAST.label}」는 지난 매칭입니다.`,
        `「비밀번호 입장」 표시가 있는 매칭을 열고 ${HOST_LABEL}에게 받은 비밀번호를 넣으면 곧바로 참가자가 됩니다. 정원 제한은 없습니다.`,
        '직접 열려면 [+ 매칭 만들기]에서 방식(단식/복식)·일시·코트·비밀번호를 정하고 함께 칠 회원을 초대합니다.',
        `카드에 ${TURN_PILLS} 같은 표시가 붙어 있으면 그 매칭에서 내가 할 일이 있다는 뜻입니다.`,
    ],
    href: MATCH_ROOMS_PATH,
    cta: '매칭 리스트 열기',
}

const MY_MATCH_ROOMS: GuideSection = {
    id: 'my-match-rooms',
    title: '참여 중인 매칭',
    summary: '내가 참가한 매칭과 나를 초대한 매칭입니다. 메뉴의 숫자는 여기서 내가 답해야 할 카드 수예요.',
    steps: [
        '맨 위 「나를 초대한 매칭」에서 [참가 수락]을 누르면 비밀번호 없이 참가자가 됩니다.',
        `「${MINE_OPEN.label}」 탭에는 결과 입력·확인이 남은 매칭이, 「${MINE_PAST.label}」 탭에는 결과가 모두 확정된 매칭이 있습니다. 경기일이 지나도 결과가 남았으면 ${MINE_OPEN.label}입니다.`,
        `카드의 ${TURN_PILLS}·「${ROOM_TURN_PILL.reenterResult}」 표시가 내 차례입니다. 카드를 열어 매칭 안에서 처리합니다.`,
        '결과 입력·확인·이의는 모두 매칭 안에서 합니다. 이 화면은 어느 매칭이 내 차례인지만 보여줍니다.',
    ],
    href: MY_ROOMS_PATH,
    cta: '참여 중인 매칭 열기',
}

const PERSONAL_MATCHES: GuideSection = {
    id: 'personal-matches',
    title: '개인 경기 결과',
    summary: '확정된 전적이 모이는 곳입니다. 매칭에서 결과가 확정되면 자동으로 여기에 쌓입니다.',
    steps: [
        `매칭 안에서 확정된 경기가 ${OUTCOMES}로 정리되어 목록에 오르고 승률·레이팅에 반영됩니다.`,
        '회원이 아닌 사람과 친 경기는 [+ 직접 기록]으로 남깁니다. 회원이 한 명이라도 끼면 매칭을 만들어야 합니다 — 상대의 확인이 필요하기 때문입니다.',
        '직접 기록은 저장한 뒤 상단 「결과 입력 대기」에서 스코어를 넣는 순간 확정됩니다(확인해 줄 상대가 없습니다).',
        `잘못 확정한 결과는 카드의 [결과 정정]으로 되돌릴 수 있습니다. ${HOST_LABEL}가 마감한 매칭의 경기는 잠깁니다.`,
    ],
    href: PERSONAL_MATCHES_PATH,
    cta: '개인 경기 결과 열기',
}

/** 단계 문구는 룸 배너의 것을 그대로 쓴다(`ROOM_STAGE_HINT`) — 여기서 다시 적으면 둘이 갈린다 */
const STAGES: GuideSection = {
    id: 'stages',
    title: '매칭의 다섯 단계',
    summary: `매칭 상세의 단계 표시가 뜻하는 것입니다. 종료는 자동으로, 마감은 ${HOST_LABEL}가 누릅니다.`,
    steps: STAGE_FLOW.map((s) => `${ROOM_STAGE_LABEL[s]} — ${ROOM_STAGE_HINT[s]}`),
}

const TERMS: GuideSection = {
    id: 'terms',
    title: '용어',
    summary: '명단과 카드에 찍히는 말들입니다.',
    steps: [
        `${HOST_LABEL} — 매칭을 연 사람. 초대·내보내기·자동 대진표·마감을 할 수 있습니다.`,
        `${JOINED_LABEL} — 매칭에 들어온 상태. 게임을 올리고 결과를 확인합니다.`,
        `${INVITED_LABEL} — 초대를 받았지만 아직 답하지 않은 상태.`,
        `${GUEST_LABEL} — 계정 없이 이름만 올린 참가자. 결과 확인 절차가 없습니다.`,
        `내 차례 — 카드의 ${TURN_PILLS} 표시. 메뉴의 숫자가 이것을 셉니다.`,
        `${OUTCOMES} — 게임(세트) 단위의 결과.`,
    ],
}

/** 가이드 페이지 순서 — 흐름 → 화면 셋(사이드바 순서) → 단계 → 용어 */
export const GUIDE_SECTIONS: GuideSection[] = [FLOW, MATCH_ROOMS, MY_MATCH_ROOMS, PERSONAL_MATCHES, STAGES, TERMS]

/** 인라인 설명(`PageGuide`)이 읽는 화면별 섹션 */
export const GUIDE_SCREEN_SECTIONS: Record<GuideScreenId, GuideSection> = {
    'match-rooms': MATCH_ROOMS,
    'my-match-rooms': MY_MATCH_ROOMS,
    'personal-matches': PERSONAL_MATCHES,
}
