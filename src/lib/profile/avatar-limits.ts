/**
 * 프로필 사진 한계 — 클라이언트 필드·서버 액션이 **같은 상수**를 본다(F-15).
 *
 * 한계는 셋이다.
 * - `AVATAR_PICK_MAX_BYTES`: 고를 수 있는 원본 크기. 휴대폰 사진(3~8MB)을 받기 위한 값.
 * - `AVATAR_UPLOAD_MAX_BYTES`: 서버로 보내는 크기. 필드가 고르는 즉시 `downscaleImage`로
 *   긴 변 512px로 줄이므로(아바타는 96px로 그려진다) 정상 경로에서는 100KB 안팎이다.
 *   축소가 실패한 브라우저·클라이언트를 우회한 제출은 이 값에서 걸린다.
 * - `next.config.ts`의 `bodySizeLimit`(2MB): 우회 제출이 서버 액션의 사람 말 검사에 닿도록
 *   두는 여유. 그 위는 Next가 요청 자체를 거절한다(Vercel 함수 본문 상한 4.5MB 아래).
 */
export const AVATAR_ACCEPT = ['image/png', 'image/jpeg', 'image/webp'] as const
export const AVATAR_PICK_MAX_BYTES = 10 * 1024 * 1024
export const AVATAR_UPLOAD_MAX_BYTES = 1 * 1024 * 1024
export const AVATAR_MAX_EDGE = 512
export const AVATAR_HINT = 'JPG, PNG, WEBP · 10MB까지 — 올리면 작게 줄여 저장해요'

const PICK_TOO_LARGE = '사진이 너무 큽니다. 10MB 이하로 골라 주세요.'
const UPLOAD_TOO_LARGE = '사진을 줄이지 못했습니다. 1MB 이하 사진을 골라 주세요.'
const BAD_TYPE = 'JPG, PNG, WEBP 파일만 올릴 수 있어요.'
/** 스토리지 업로드 실패 — 삼키면 깨진 URL이 저장되므로 액션이 이 문구로 거절한다 */
export const AVATAR_UPLOAD_FAILED = '사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.'

type FileLike = { size: number; type: string }
type Stage = 'pick' | 'upload'

/** 파일이 한계를 넘으면 사람 말 사유, 아니면 null. `pick`은 고르는 순간, `upload`는 보내는 순간의 검사 */
export function avatarFileError(file: FileLike, stage: Stage): string | null {
    if (!(AVATAR_ACCEPT as readonly string[]).includes(file.type)) return BAD_TYPE
    const max = stage === 'pick' ? AVATAR_PICK_MAX_BYTES : AVATAR_UPLOAD_MAX_BYTES
    if (file.size > max) return stage === 'pick' ? PICK_TOO_LARGE : UPLOAD_TOO_LARGE
    return null
}

/** 스토리지 경로의 확장자 — 파일 이름이 아니라 MIME에서 정한다(이름은 사용자 입력이다) */
export function avatarExtension(type: string): 'png' | 'jpg' | 'webp' {
    if (type === 'image/png') return 'png'
    if (type === 'image/webp') return 'webp'
    return 'jpg'
}
