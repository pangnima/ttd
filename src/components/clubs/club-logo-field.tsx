'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Shuffle } from 'lucide-react'

import { DEFAULT_CLUB_LOGO_PATHS } from '@/lib/default-images'

/**
 * 클럽 생성 로고 필드 (회원가입 AvatarUploadField와 동일 UX).
 * - 기본 제공 로고를 미리보기에 노출하고 "다른 기본 이미지"로 셔플한다.
 * - 사용자가 파일을 업로드하면 업로드본을 우선 노출한다.
 * - 선택된 기본 로고 경로는 hidden input(default_logo)로 전달되어
 *   파일 미업로드 시 서버가 그대로 저장한다(미리보기 == 저장값).
 * - 아바타와 달리 로고이므로 미리보기를 rounded-xl(사각)로 표시한다.
 */
export function ClubLogoField() {
    const fileRef = useRef<HTMLInputElement>(null)
    const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
    // 첫 렌더는 결정적 값(0번)으로 두어 hydration mismatch를 피하고, 셔플로 변경한다.
    const [defaultLogo, setDefaultLogo] = useState(DEFAULT_CLUB_LOGO_PATHS[0])

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadedPreview(URL.createObjectURL(file))
    }

    function shuffleDefault() {
        setDefaultLogo((current) => {
            const pool = DEFAULT_CLUB_LOGO_PATHS.filter((p) => p !== current)
            return pool[Math.floor(Math.random() * pool.length)] ?? current
        })
    }

    function useDefaultInstead() {
        setUploadedPreview(null)
        if (fileRef.current) fileRef.current.value = ''
    }

    const shownSrc = uploadedPreview ?? defaultLogo

    return (
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted border border-border overflow-hidden shrink-0">
                <Image src={shownSrc} alt="클럽 로고 미리보기" width={64} height={64} className="w-full h-full object-cover" />
            </div>

            {/* 선택된 기본 로고 경로 — 파일 미업로드 시 서버가 저장 */}
            <input type="hidden" name="default_logo" value={defaultLogo} />
            <input
                ref={fileRef}
                id="logo"
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="min-w-0">
                <p className="text-body2 font-medium text-foreground">클럽 로고</p>
                <p className="text-caption text-muted-foreground mb-2">기본 이미지를 사용하거나 직접 올릴 수 있어요.</p>
                <div className="flex flex-wrap gap-1.5">
                    <label
                        htmlFor="logo"
                        className="inline-flex items-center gap-1.5 text-caption border border-border rounded-full px-3 py-1.5 text-foreground hover:bg-muted hover:border-input transition-colors cursor-pointer"
                    >
                        <ImagePlus className="w-3.5 h-3.5" />
                        내 사진 업로드
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
            </div>
        </div>
    )
}
