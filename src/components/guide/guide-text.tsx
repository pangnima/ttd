import { splitEmphasis } from '@/lib/guide/emphasis'

/**
 * 가이드 문구 한 줄 — `**…**`를 화면의 라벨처럼 보이는 작은 칩으로 드러낸다.
 * 강조 대상이 버튼·탭·상태 이름(화면에서 찾아야 하는 것)이라 굵기만으로는 본문과 구분이 약하고,
 * 기호(「」·[ ])는 겹치면 글을 덮었다. 배경 한 톤(muted)이 그 둘의 중간이다.
 */
export function GuideText({ text }: { text: string }) {
    return (
        <>
            {splitEmphasis(text).map((part, i) =>
                part.strong ? (
                    <strong key={i} className="rounded-sm bg-muted px-1 py-0.5 font-medium text-foreground whitespace-nowrap">
                        {part.text}
                    </strong>
                ) : (
                    <span key={i}>{part.text}</span>
                ),
            )}
        </>
    )
}
