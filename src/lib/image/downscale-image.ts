/**
 * 브라우저에서 이미지를 줄인다 — 프로필 사진이 서버 액션 본문 한계(F-15)에 닿지 않게.
 *
 * 긴 변이 `maxEdge`를 넘으면 비율을 지켜 줄이고, 아니면 재인코딩만 한다(PNG 원본도 webp/jpeg가 되어
 * 작아진다). `createImageBitmap`의 `imageOrientation: 'from-image'`가 EXIF 회전을 픽셀에 굽는다 —
 * 그러지 않으면 휴대폰 세로 사진이 눕는다.
 *
 * **실패하면 원본을 그대로 돌려준다.** 구형 브라우저·디코드 불가는 여기서 삼키고, 다음 단계의
 * 크기 검사(`avatarFileError(…, 'upload')`)가 사람 말로 거절하게 둔다.
 */
export async function downscaleImage(
    file: File,
    maxEdge: number,
    options: { type: 'image/webp' | 'image/jpeg'; quality: number },
): Promise<File> {
    try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
        const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
        const width = Math.max(1, Math.round(bitmap.width * scale))
        const height = Math.max(1, Math.round(bitmap.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return file
        ctx.drawImage(bitmap, 0, 0, width, height)
        bitmap.close()

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, options.type, options.quality),
        )
        if (!blob) return file
        // webp를 못 만드는 브라우저는 toBlob이 png를 돌려준다 — 그 경우 jpeg로 한 번 더
        if (blob.type !== options.type && options.type === 'image/webp') {
            return downscaleImage(file, maxEdge, { ...options, type: 'image/jpeg' })
        }
        const base = file.name.replace(/\.[^.]+$/, '') || 'avatar'
        const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
        return new File([blob], `${base}.${ext}`, { type: blob.type })
    } catch {
        return file
    }
}
