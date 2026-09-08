import {
    enteredGameLabel, enteredGameLine, summarizeEntered, type EnteredRotationGame,
} from '@/lib/personal-matches/rotation-entered'
import { GameScoreChips } from '@/components/personal-matches/set-score-chips'
import { TYPO } from '@/lib/dashboard/tokens'

type Props = { games: EnteredRotationGame[] }

/**
 * 게임 빌더 상단의 **읽기 전용** '이미 입력한 게임' 목록 (0063).
 *
 * 빌더는 열 때마다 빈 상태라, 미수락 회원이 낀 게임처럼 화면에 반영이 안 보이는 경우
 * 사용자가 같은 게임을 다시 넣어 group_seq만 올라간 중복 요청이 쌓였다(DB도 막지 않는다 —
 * 로테이션 파생 요청은 pending 중복 유니크 인덱스에서 제외된다, 0056).
 * 무엇이 이미 들어갔고 새 게임 번호가 몇 번부터인지 보여 주는 것이 그 중복을 막는 가장 싼 방법이다.
 */
export function EnteredGamesBlock({ games }: Props) {
    if (games.length === 0) return null
    const { awaiting } = summarizeEntered(games)
    const nextSeq = Math.max(...games.map((g) => g.groupSeq)) + 1

    return (
        <div className="rounded-[8px] border border-border bg-muted/40 p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
                <p className={TYPO.h4}>이미 입력한 게임 {games.length}건</p>
                <p className="text-caption text-muted-foreground">새 게임은 {nextSeq}번부터</p>
            </div>

            <ul className="space-y-1.5">
                {games.map((g) => (
                    <li key={g.groupSeq} className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                            <span className="text-caption text-muted-foreground shrink-0">{enteredGameLabel(g)}</span>
                            <span className="text-caption text-foreground truncate ml-1.5">{enteredGameLine(g)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <GameScoreChips sets={g.sets} />
                            {g.awaitingConsent && (
                                <span className="px-1.5 py-0.5 rounded-[4px] text-micro font-semibold bg-spot/15 text-spot">
                                    수락 대기
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {awaiting > 0 && (
                <p className="text-caption text-muted-foreground break-keep">
                    &lsquo;수락 대기&rsquo; 게임은 회원이 참여를 수락하면 모두의 기록에 추가됩니다. 다시 입력하지 않아도 됩니다.
                </p>
            )}
        </div>
    )
}
