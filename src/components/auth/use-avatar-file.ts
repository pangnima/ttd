'use client'

import { useCallback, useEffect, useState, type ChangeEvent, type RefObject } from 'react'

import { downscaleImage } from '@/lib/image/downscale-image'
import { avatarFileError, AVATAR_MAX_EDGE } from '@/lib/profile/avatar-limits'

type Options = {
    inputRef: RefObject<HTMLInputElement | null>
    /** 부모의 제출 잠금용 — `onTakenChange` 관용구(true = 막을 것이 있다) */
    onErrorChange?: (hasError: boolean) => void
}

/**
 * 아바타 파일 입력의 공통 흐름 — 가입·온보딩(`AvatarUploadField`)과 설정(`ProfileAvatarField`)이 함께 쓴다.
 *
 * 고르는 순간: 크기·MIME 검사 → 브라우저에서 축소 → 보내는 크기 검사 → **input의 파일을 축소본으로
 * 교체**(`DataTransfer`) → 미리보기. 폼은 그 input을 그대로 제출하므로 서버 액션은 작은 파일만 받는다.
 * 실패하면 input을 비우고 사유를 `error`로 든다 — 부모는 `onErrorChange`로 제출을 잠근다.
 */
export function useAvatarFile({ inputRef, onErrorChange }: Options) {
    const [preview, setPreview] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        onErrorChange?.(Boolean(error))
    }, [error, onErrorChange])

    const clear = useCallback(() => {
        setPreview(null)
        setError(null)
        if (inputRef.current) inputRef.current.value = ''
    }, [inputRef])

    async function handleFileChange(e: ChangeEvent<HTMLInputElement>): Promise<boolean> {
        const input = e.target
        const picked = input.files?.[0]
        if (!picked) return false

        const pickError = avatarFileError(picked, 'pick')
        if (pickError) {
            input.value = ''
            setPreview(null)
            setError(pickError)
            return false
        }

        setBusy(true)
        const small = await downscaleImage(picked, AVATAR_MAX_EDGE, { type: 'image/webp', quality: 0.85 })
        setBusy(false)

        const uploadError = avatarFileError(small, 'upload')
        if (uploadError) {
            input.value = ''
            setPreview(null)
            setError(uploadError)
            return false
        }

        if (small !== picked) {
            const dt = new DataTransfer()
            dt.items.add(small)
            input.files = dt.files
        }
        setError(null)
        setPreview(URL.createObjectURL(small))
        return true
    }

    return { preview, error, busy, handleFileChange, clear }
}
