// 업로드 없이 가입/클럽 생성 시 배정할 기본 이미지.
// public/avatars, public/clublogos 의 정적 파일 경로를 그대로 DB 컬럼에 저장한다.
// 이미지를 추가하면 아래 배열만 갱신하면 된다.

const AVATAR_FILES = [
    'avatar-ball.png', 'avatar-bounce.png', 'avatar-bull.png', 'avatar-can.png',
    'avatar-court.png', 'avatar-net.png', 'avatar-racket.png', 'avatar-serve.png',
    'avatar-sunset.png', 'avatar-trophy.png',
] as const

const CLUB_LOGO_FILES = [
    'logo-ace.png', 'logo-base.png', 'logo-champ.png', 'logo-court.png', 'logo-cross.png',
    'logo-net.png', 'logo-optic.png', 'logo-serve.png', 'logo-spin.png', 'logo-target.png',
] as const

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function randomAvatarPath(): string {
    return `/avatars/${pick(AVATAR_FILES)}`
}

export function randomClubLogoPath(): string {
    return `/clublogos/${pick(CLUB_LOGO_FILES)}`
}
