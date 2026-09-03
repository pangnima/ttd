'use client'

import type { PersonalMatchSetScore } from '@/types'
import { AdDeuceToggle } from '@/components/personal-matches/ad-deuce-toggle'
import { cn } from '@/lib/utils'

type SetScoreRowProps = {
    index: number
    set: PersonalMatchSetScore
    isDoubles: boolean
    // 행 라벨 (기본 'N게임'). 로테이션 게임처럼 스코어 1줄 고정이면 '스코어'
    label?: string
    // 게임이 2개 이상일 때만 삭제 버튼 노출
    removable: boolean
    onChange: (field: 'me' | 'opp', val: string) => void
    onRemove: () => void
    // 복식 애드/듀스 토글 노출 여부 (기본 true). 로테이션 복식은 false로 숨긴다.
    enableAdDeuce?: boolean
    onMyAdChange?: (v: 'me' | 'partner' | undefined) => void
    onOppAdChange?: (v: 'opponent' | 'opponent2' | undefined) => void
    // 복식 애드/듀스 토글에 표시할 선수 이름
    myAdLabels?: { me: string; partner: string }
    oppAdLabels?: { opponent: string; opponent2: string }
}

const scoreInputClass = 'w-14 h-10 rounded-lg border border-input bg-background px-2 text-body font-semibold text-center'

/**
 * 개인 경기기록의 게임(세트) 한 줄(번호 + 내/상대 점수 + 삭제 + 복식 애드/듀스).
 * 입력 정규화(빈값→NaN→제출 시 0)는 상위 폼이 담당하고, 여기서는 표시·이벤트 전달만 한다.
 * 클럽 대진표의 SetScore(team1/team2 문자열)와는 별개 모델(PersonalMatchSetScore)이다.
 */
export function SetScoreRow({
    index, set, isDoubles, label, removable,
    onChange, onRemove, enableAdDeuce = true, onMyAdChange, onOppAdChange,
    myAdLabels, oppAdLabels,
}: SetScoreRowProps) {
    // 복식 + 애드/듀스 활성 + 라벨·핸들러가 모두 주어졌을 때만 토글 렌더
    const showAdDeuce = isDoubles && enableAdDeuce && !!myAdLabels && !!oppAdLabels && !!onMyAdChange && !!onOppAdChange
    return (
        <div className={isDoubles ? cn('space-y-2', index > 0 && 'mt-6 border-t border-border pt-6') : ''}>
            <div className="flex items-center gap-2">
                <span className="text-caption text-muted-foreground w-10">{label ?? `${index + 1}게임`}</span>
                <input
                    type="number"
                    min={0} max={99}
                    value={Number.isNaN(set.me) ? '' : set.me}
                    onChange={(e) => onChange('me', e.target.value)}
                    className={scoreInputClass}
                />
                <span className="w-3 text-center text-muted-foreground">-</span>
                <input
                    type="number"
                    min={0} max={99}
                    value={Number.isNaN(set.opp) ? '' : set.opp}
                    onChange={(e) => onChange('opp', e.target.value)}
                    className={scoreInputClass}
                />
                {removable && (
                    <button type="button" onClick={onRemove} className="text-caption text-destructive/80 hover:text-destructive">
                        삭제
                    </button>
                )}
            </div>
            {/* 복식: 게임별 애드/듀스 코트 */}
            {showAdDeuce && (
                <div className="grid grid-cols-2 gap-2">
                    <AdDeuceToggle
                        label="내 팀 백핸드"
                        options={[
                            { value: 'me', label: myAdLabels!.me },
                            { value: 'partner', label: myAdLabels!.partner },
                        ]}
                        value={set.myAd}
                        onChange={onMyAdChange!}
                    />
                    <AdDeuceToggle
                        label="상대팀 백핸드"
                        options={[
                            { value: 'opponent', label: oppAdLabels!.opponent },
                            { value: 'opponent2', label: oppAdLabels!.opponent2 },
                        ]}
                        value={set.oppAd}
                        onChange={onOppAdChange!}
                    />
                </div>
            )}
        </div>
    )
}
