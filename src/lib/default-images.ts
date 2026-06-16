// 업로드 없이 가입/클럽 생성 시 배정할 기본 이미지.
// public/avatars, public/clublogos 의 정적 파일 경로를 그대로 DB 컬럼에 저장한다.
// 이미지를 추가하면 아래 배열만 갱신하면 된다.

const AVATAR_FILES = [
    'avatar-ball.png', 'avatar-bounce.png', 'avatar-bull.png', 'avatar-can.png',
    'avatar-clay.png', 'avatar-court.png', 'avatar-duo.png', 'avatar-fireball.png',
    'avatar-flag.png', 'avatar-grass.png', 'avatar-lights.png', 'avatar-medal.png',
    'avatar-mountain.png', 'avatar-net.png', 'avatar-racket.png', 'avatar-serve.png',
    'avatar-starnight.png', 'avatar-sunset.png', 'avatar-trophy.png', 'avatar-wave.png',
] as const

const CLUB_LOGO_FILES = [
    'logo-ace.png', 'logo-base.png', 'logo-bolt.png', 'logo-champ.png', 'logo-court.png',
    'logo-cross.png', 'logo-crown.png', 'logo-flame.png', 'logo-net.png', 'logo-optic.png',
    'logo-peak.png', 'logo-serve.png', 'logo-shield.png', 'logo-spin.png', 'logo-star.png',
    'logo-target.png', 'logo-topspin.png', 'logo-tour.png', 'logo-volley.png', 'logo-wing.png',
] as const

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

// 기본 아바타 전체 경로 목록 (회원가입 폼에서 노출·셔플에 사용)
export const DEFAULT_AVATAR_PATHS: string[] = AVATAR_FILES.map((file) => `/avatars/${file}`)

export function randomAvatarPath(): string {
    return pick(DEFAULT_AVATAR_PATHS)
}

// 기본 클럽 로고 전체 경로 목록 (클럽 생성 폼에서 노출·셔플에 사용)
export const DEFAULT_CLUB_LOGO_PATHS: string[] = CLUB_LOGO_FILES.map((file) => `/clublogos/${file}`)

export function randomClubLogoPath(): string {
    return `/clublogos/${pick(CLUB_LOGO_FILES)}`
}
