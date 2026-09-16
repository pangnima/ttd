// 업로드 없이 가입 시 배정할 기본 아바타.
// public/avatars 의 정적 파일 경로를 그대로 DB 컬럼에 저장한다. 이미지를 추가하면 아래 배열만 갱신하면 된다.
// (클럽 로고 20장·randomClubLogoPath는 클럽 UI와 함께 Week 69에 삭제 — 태그 frozen-clubs-ui-2026-09-16)

const AVATAR_FILES = [
    'avatar-ball.png', 'avatar-bounce.png', 'avatar-bull.png', 'avatar-can.png',
    'avatar-clay.png', 'avatar-court.png', 'avatar-duo.png', 'avatar-fireball.png',
    'avatar-flag.png', 'avatar-grass.png', 'avatar-lights.png', 'avatar-medal.png',
    'avatar-mountain.png', 'avatar-net.png', 'avatar-racket.png', 'avatar-serve.png',
    'avatar-starnight.png', 'avatar-sunset.png', 'avatar-trophy.png', 'avatar-wave.png',
] as const

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

// 기본 아바타 전체 경로 목록 (회원가입 폼에서 노출·셔플에 사용)
export const DEFAULT_AVATAR_PATHS: string[] = AVATAR_FILES.map((file) => `/avatars/${file}`)

/** 기본 아바타인가 — 체크리스트 「프로필 완성」이 "직접 올린 사진"을 가르는 기준(U-pre-1) */
export function isDefaultAvatar(url: string | null | undefined): boolean {
    return !!url && DEFAULT_AVATAR_PATHS.includes(url)
}

export function randomAvatarPath(): string {
    return pick(DEFAULT_AVATAR_PATHS)
}
