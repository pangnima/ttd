'use client'

import { useState } from 'react'
import { ImagePlus, Shuffle } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DEFAULT_AVATAR_PATHS } from '@/lib/default-images'
import { FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

const pillBtnCls = 'inline-flex items-center gap-1.5 text-caption border border-border rounded-full px-3 py-1.5 text-foreground hover:bg-muted hover:border-input transition-colors cursor-pointer'

type Props = {
    /** 지금 저장돼 있는 사진. 소셜 가입자는 **provider가 준 외부 URL**이 들어온다 */
    currentImage: string | null
    /** 사진이 없을 때 그릴 이니셜의 출처 */
    nickname: string
}

/**
 * 프로필 설정의 사진 필드 — 미리보기 + [이미지 변경] + [기본 이미지로 변경].
 *
 * ⚠ 미리보기는 **`next/image`가 아니라 shadcn `Avatar`**(네이티브 `<img>`)로 그린다.
 * 소셜 가입자의 `profile_image`에는 `https://lh3.googleusercontent.com/…` 같은 외부 URL이 들어오는데,
 * 그 호스트는 `next.config.ts`의 `remotePatterns`에 없다(있을 수도 없다 — provider 호스트는 열린
 * 집합이다). 등록되지 않은 호스트를 `<Image src>`에 넣으면 **렌더 중 throw**라 화면이 통째로 날아간다.
 * 헤더·프로필 상세·룸 명단 등 다른 아바타 자리가 전부 `Avatar`인 이유도 같다.
 *
 * 덤으로 URL이 죽어도 `AvatarFallback`이 이니셜로 받아 준다.
 */
export function ProfileAvatarField({ currentImage, nickname }: Props) {
    const [preview, setPreview] = useState<string | null>(null)
    // "기본 이미지로 변경"으로 고른 경로 (null이면 미선택 = 지금 사진 유지)
    const [defaultAvatar, setDefaultAvatar] = useState<string | null>(null)

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        // 파일 업로드는 기본 이미지 선택보다 우선
        setDefaultAvatar(null)
        setPreview(URL.createObjectURL(file))
    }

    // 클릭마다 직전과 다른 기본 아바타로 셔플
    function handleShuffleDefault() {
        const candidates = DEFAULT_AVATAR_PATHS.filter((p) => p !== defaultAvatar)
        const next = candidates[Math.floor(Math.random() * candidates.length)]
        setDefaultAvatar(next)
        setPreview(next)
    }

    const shownSrc = preview ?? currentImage

    return (
        <div className="space-y-1.5">
            <label className={labelCls}>프로필 사진</label>
            <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 shrink-0">
                    {shownSrc && <AvatarImage src={shownSrc} alt="프로필 사진" />}
                    <AvatarFallback className="bg-muted/50 text-h3 font-medium text-muted-foreground">
                        {nickname[0] ?? '?'}
                    </AvatarFallback>
                </Avatar>
                <div className="space-y-1.5">
                    {/* 업로드 없이 기본 이미지로 변경한 경우 그 경로를 서버로 전달 */}
                    <input type="hidden" name="default_avatar" value={defaultAvatar ?? ''} />
                    <div className="flex flex-wrap items-center gap-1.5">
                        <label htmlFor="avatar" className={pillBtnCls}>
                            <ImagePlus className="w-3.5 h-3.5" />
                            이미지 변경
                        </label>
                        <button type="button" onClick={handleShuffleDefault} className={pillBtnCls}>
                            <Shuffle className="w-3.5 h-3.5" />
                            기본 이미지로 변경
                        </button>
                    </div>
                    <p className="text-caption text-muted-foreground">JPG, PNG, WEBP · 최대 5MB</p>
                    <input
                        id="avatar" name="avatar" type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            </div>
        </div>
    )
}
