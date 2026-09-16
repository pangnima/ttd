import { describe, it, expect } from 'vitest'
import {
    avatarFileError,
    avatarExtension,
    AVATAR_PICK_MAX_BYTES,
    AVATAR_UPLOAD_MAX_BYTES,
} from './avatar-limits'

describe('avatarFileError', () => {
    it('허용 MIME이 아니면 어느 단계든 거절한다', () => {
        expect(avatarFileError({ size: 10, type: 'image/gif' }, 'pick')).toMatch(/JPG, PNG, WEBP/)
        expect(avatarFileError({ size: 10, type: 'image/heic' }, 'upload')).toMatch(/JPG, PNG, WEBP/)
    })

    it('고르는 단계는 10MB, 보내는 단계는 1MB가 한계다', () => {
        expect(avatarFileError({ size: AVATAR_PICK_MAX_BYTES, type: 'image/jpeg' }, 'pick')).toBeNull()
        expect(avatarFileError({ size: AVATAR_PICK_MAX_BYTES + 1, type: 'image/jpeg' }, 'pick')).toMatch(/10MB/)
        expect(avatarFileError({ size: AVATAR_UPLOAD_MAX_BYTES, type: 'image/png' }, 'upload')).toBeNull()
        expect(avatarFileError({ size: AVATAR_UPLOAD_MAX_BYTES + 1, type: 'image/png' }, 'upload')).toMatch(/1MB/)
    })

    it('5MB 휴대폰 사진은 고를 수 있지만 줄이지 않고는 보낼 수 없다', () => {
        const phone = { size: 5 * 1024 * 1024, type: 'image/jpeg' }
        expect(avatarFileError(phone, 'pick')).toBeNull()
        expect(avatarFileError(phone, 'upload')).not.toBeNull()
    })
})

describe('avatarExtension', () => {
    it.each([
        ['image/png', 'png'],
        ['image/webp', 'webp'],
        ['image/jpeg', 'jpg'],
        ['application/octet-stream', 'jpg'],
    ])('%s → %s', (type, ext) => {
        expect(avatarExtension(type)).toBe(ext)
    })
})
