'use client'

import { MATCH_FORM_INPUT, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'

type NotesSectionProps = {
    notes: string
    onNotesChange: (v: string) => void
}

/**
 * 메모 입력 영역.
 * 향후 컨디션/태그/사진 등 부가 기록 필드를 이 섹션에 추가한다.
 */
export function NotesSection({ notes, onNotesChange }: NotesSectionProps) {
    return (
        <div>
            <label className={MATCH_FORM_LABEL}>메모 (선택)</label>
            <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="경기 관련 메모"
                rows={2}
                className={`${MATCH_FORM_INPUT} resize-none`}
            />
        </div>
    )
}
