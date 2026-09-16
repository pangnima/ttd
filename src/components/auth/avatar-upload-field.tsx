'use client'

import { useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImagePlus, Shuffle } from 'lucide-react'

import { DEFAULT_AVATAR_PATHS } from '@/lib/default-images'
import { AVATAR_ACCEPT, AVATAR_HINT } from '@/lib/profile/avatar-limits'
import { useAvatarFile } from '@/components/auth/use-avatar-file'

type Props = {
    /**
     * 이미 배정된 사진 — 소셜 가입자의 **provider 사진**(구글 등)이 여기로 온다.
     *
     * 값이 있으면 그것을 미리보기로 쓰고 `default_avatar`를 **비워 보낸다**(= 변경 없음).
     * 그러지 않으면 사용자가 손대지 않아도 기본 아바타가 provider 사진을 덮어쓴다.
     * 가입 폼(이메일)은 배정된 사진이 없으므로 이 prop 없이 종전대로 동작한다.
     */
    initialImage?: string | null
    /** 파일이 한계를 넘어 거절된 동안 부모가 제출을 잠근다(`onTakenChange` 관용구) */
    onErrorChange?: (hasError: boolean) => void
}

/**
 * 프로필 사진 필드 — 회원가입 폼과 소셜 가입자의 완성 화면이 함께 쓴다.
 * - 기본 제공 아바타를 미리보기에 노출하고 "다른 기본 이미지"로 셔플한다.
 * - 사용자가 파일을 업로드하면 업로드본을 우선 노출한다.
 * - 선택된 기본 아바타 경로는 hidden input(default_avatar)로 전달되어
 *   파일 미업로드 시 서버가 그대로 저장한다(미리보기 == 저장값).
 */
export function AvatarUploadField({ initialImage, onErrorChange }: Props = {}) {
    const fileRef = useRef<HTMLInputElement>(null)
    // 고르는 즉시 검사·축소·input 교체까지 훅이 맡는다(F-15) — 서버는 작은 파일만 받는다
    const { preview: uploadedPreview, error, busy, handleFileChange, clear } = useAvatarFile({ inputRef: fileRef, onErrorChange })
    // 배정된 사진이 있으면 그것을 지키고(null = 변경 없음), 없으면 종전대로 0번으로 시작한다.
    // 첫 렌더를 결정적 값으로 두는 것은 hydration mismatch를 피하기 위해서다.
    const [defaultAvatar, setDefaultAvatar] = useState<string | null>(
        initialImage ? null : DEFAULT_AVATAR_PATHS[0],
    )

    function shuffleDefault() {
        setDefaultAvatar((current) => {
            const pool = DEFAULT_AVATAR_PATHS.filter((p) => p !== current)
            return pool[Math.floor(Math.random() * pool.length)] ?? current
        })
    }

    // provider 사진을 지키는 동안에는 셔플이 그것을 대체한다 — 되돌리려면 화면을 다시 연다
    const previewBase = defaultAvatar ?? initialImage ?? DEFAULT_AVATAR_PATHS[0]

    function useDefaultInstead() {
        clear()
    }

    const shownSrc = uploadedPreview ?? previewBase

    return (
        <div className="flex items-center gap-4">
            {/* ⚠ next/image가 아니다 — initialImage에 provider 외부 URL이 올 수 있고,
                등록되지 않은 호스트는 렌더 중 throw다(next.config.ts 주석 참고) */}
            <Avatar className="w-16 h-16 shrink-0">
                <AvatarImage src={shownSrc} alt="프로필 미리보기" />
                <AvatarFallback className="bg-muted text-h3 font-medium text-muted-foreground">?</AvatarFallback>
            </Avatar>

            {/* 선택된 기본 아바타 경로 — 파일 미업로드 시 서버가 저장. 빈 값이면 "변경 없음" */}
            <input type="hidden" name="default_avatar" value={defaultAvatar ?? ''} />
            <input
                ref={fileRef}
                id="avatar"
                name="avatar"
                type="file"
                accept={AVATAR_ACCEPT.join(',')}
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="min-w-0">
                <p className="text-body font-medium text-foreground">프로필 사진</p>
                <p className="text-caption text-muted-foreground mb-2">기본 이미지를 사용하거나 직접 올릴 수 있어요. {AVATAR_HINT}</p>
                <div className="flex flex-wrap gap-1.5">
                    <label
                        htmlFor="avatar"
                        className="inline-flex items-center gap-1.5 text-caption border border-border rounded-full px-3 py-1.5 text-foreground hover:bg-muted hover:border-input transition-colors cursor-pointer"
                    >
                        <ImagePlus className="w-3.5 h-3.5" />
                        {busy ? '줄이는 중…' : '내 사진 업로드'}
                    </label>
                    {uploadedPreview ? (
                        <button
                            type="button"
                            onClick={useDefaultInstead}
                            className="inline-flex items-center gap-1.5 text-caption border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-input transition-colors"
                        >
                            기본 이미지 사용
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={shuffleDefault}
                            className="inline-flex items-center gap-1.5 text-caption border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-input transition-colors"
                        >
                            <Shuffle className="w-3.5 h-3.5" />
                            다른 기본 이미지
                        </button>
                    )}
                </div>
                {error && <p className="text-caption text-destructive mt-1.5">{error}</p>}
            </div>
        </div>
    )
}
