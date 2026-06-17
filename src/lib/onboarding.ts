/**
 * 신규 사용자 온보딩 체크리스트 — 단계 정의와 완료 판정(순수 함수).
 *
 * 개인 경기 기록을 1순위로 두고, 모든 완료 여부는 서버에서 이미 보유한
 * 데이터(개인 경기 수·프로필 이미지·가입 클럽 수)만으로 판정해 추가 쿼리를 만들지 않는다.
 * 아이콘은 직렬화할 수 없으므로 여기서는 key만 두고, 클라이언트에서 key→icon으로 매핑한다.
 */

export type OnboardingStepKey = 'personal-match' | 'profile' | 'club'

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
    /** 개인 경기 기록 1건 이상 보유 여부 */
    hasPersonalMatch: boolean
    /** 프로필 이미지 설정 여부 (기본값 미설정 시 false) */
    hasProfileImage: boolean
    /** 승인된 가입 클럽 1개 이상 보유 여부 */
    hasClub: boolean
}

/** 입력 신호를 체크리스트 단계 배열로 변환 (개인 경기가 항상 첫 단계). */
export function buildOnboardingSteps(input: OnboardingInput): OnboardingStep[] {
    return [
        {
            key: 'personal-match',
            title: '첫 경기 기록하기',
            description: '클럽 밖에서 친 경기를 기록하면 승률·라이벌·파트너 통계가 쌓입니다.',
            href: '/me/personal-matches/new',
            done: input.hasPersonalMatch,
        },
        {
            key: 'profile',
            title: '프로필 완성하기',
            description: '사진과 정보를 채워 다른 선수들이 나를 알아볼 수 있게 하세요.',
            href: '/profile/settings',
            done: input.hasProfileImage,
        },
        {
            key: 'club',
            title: '클럽 둘러보기',
            description: '클럽에 가입하면 대진표·클럽 랭킹·클럽 레이팅까지 함께 즐길 수 있어요.',
            href: '/clubs',
            done: input.hasClub,
        },
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
