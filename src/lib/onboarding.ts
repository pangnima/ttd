/**
 * 신규 사용자 온보딩 체크리스트 — 단계 정의와 완료 판정(순수 함수).
 *
 * 매칭 참여를 1순위로 둔다(Week 57) — 회원이 끼는 경기는 전부 매칭 룸을 거치고(Week 39),
 * 방 없는 「직접 기록」은 비회원 전용이라 신규 회원의 첫 행동이 아니다. 완료 여부는 서버가
 * 이미 보유한 데이터(참가 중인 방·확정 전적·프로필 이미지)만으로 판정해 추가 쿼리를 만들지 않는다.
 * 아이콘은 직렬화할 수 없으므로 여기서는 key만 두고, 클라이언트에서 key→icon으로 매핑한다.
 */

export type OnboardingStepKey = 'join-match' | 'profile'

/**
 * 가입 직후 착지 쿼리 `?notice=welcome` — 프로필이 「가입이 완료됐습니다」 배너를 한 번 그린다(F-pre-4·U-6).
 * 가입 폼(`signupAction`)과 소셜 완성 화면(`completeProfileAction`)이 같은 값으로 착지한다.
 */
export const WELCOME_NOTICE = 'welcome'

export type OnboardingStep = {
    key: OnboardingStepKey
    title: string
    description: string
    href: string
    /** 완료 여부 (서버 데이터 기반) */
    done: boolean
}

export type OnboardingInput = {
    /** 본인 user id (프로필 통계 링크용) */
    userId: string
    /** 참가(joined) 중인 매칭이 1개 이상 — `MatchQueue.joinedRoomIds`(레이아웃과 같은 캐시 한 벌) */
    hasJoinedRoom: boolean
    /**
     * 확정 전적 1건 이상. 비회원과만 치는 사람은 매칭에 들어갈 일이 없어 `hasJoinedRoom`만 보면
     * 영영 미완료로 남는다 — Week 54에 클럽 단계를 내린 것과 같은 결함이라 탈출구로 둔다.
     */
    hasPersonalMatch: boolean
    /**
     * 직접 올린(또는 provider가 준) 사진 — **기본 아바타는 세지 않는다**(U-pre-1). 이메일 가입은 기본 아바타가
     * 저장되므로 그것을 세면 2단계가 언제나 done이라 체크리스트가 사실상 1단계였다.
     */
    hasProfileImage: boolean
    /** 휴대폰·라켓 중 하나라도 적었으면 프로필을 "완성"한 것으로 친다 — 사진을 올리기 싫은 사람의 탈출구 */
    hasContactOrRacket?: boolean
}

/** 입력 신호를 체크리스트 단계 배열로 변환 (매칭 참여가 항상 첫 단계). */
export function buildOnboardingSteps(input: OnboardingInput): OnboardingStep[] {
    return [
        {
            key: 'join-match',
            title: '첫 매칭 참여하기',
            description: '매칭 리스트에서 비밀번호로 들어가거나 직접 매칭을 만들어 보세요. 결과가 확정되면 전적이 쌓입니다.',
            href: '/match-rooms',
            done: input.hasJoinedRoom || input.hasPersonalMatch,
        },
        {
            key: 'profile',
            title: '프로필 완성하기',
            description: '사진과 정보를 채워 매칭에서 다른 참가자가 나를 알아볼 수 있게 하세요.',
            href: '/profile/settings',
            done: input.hasProfileImage || Boolean(input.hasContactOrRacket),
        },
        /*
         * 「클럽 둘러보기」 단계는 1차 오픈에서 내렸다(Week 54) — 클럽이 동결 상태라
         * 눌러도 가입할 곳이 없고, 영영 done이 되지 않아 체크리스트가 끝나지 않는다.
         * 되살리려면 아래를 이 자리에 두고 OnboardingStepKey에 'club'을,
         * OnboardingInput에 `hasClub: boolean`을 되돌린다(STEP_ICONS와 호출부는 tsc가 잡아 준다).
         *
         *   {
         *       key: 'club',
         *       title: '클럽 둘러보기',
         *       description: '클럽에 가입하면 대진표·클럽 랭킹·클럽 레이팅까지 함께 즐길 수 있어요.',
         *       href: '/clubs',
         *       done: input.hasClub,
         *   },
         */
    ]
}

/** 완료한 단계 수. 진행률 표시에 사용. */
export function countCompletedSteps(steps: OnboardingStep[]): number {
    return steps.filter((s) => s.done).length
}

/** 모든 단계 완료 여부 — true면 체크리스트를 숨긴다. */
export function isOnboardingComplete(steps: OnboardingStep[]): boolean {
    return steps.every((s) => s.done)
}
