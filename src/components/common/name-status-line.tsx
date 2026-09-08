export type NameStatusGroup = { label: string; names: string[] }

type Props = { groups: NameStatusGroup[]; className?: string }

/**
 * '확인 완료: 나 · A / 확인 대기: B' 처럼 **상태별 이름 묶음**을 줄로 그린다.
 *
 * 참여 축(누가 수락했나)과 결과 축(누가 확인했나)이 같은 질문의 두 시점이라 표시도 한 벌로 둔다.
 * 형식은 로테이션 세션 카드가 이미 쓰던 '응답 대기: A · B'(0057)를 그대로 따른다 —
 * 새 표시 언어를 만들지 않는 것이 이 컴포넌트의 존재 이유다.
 *
 * 빈 묶음은 호출부가 아니라 여기서 걸러진다(호출부에 조건문이 생기지 않도록).
 * 카드 액션 영역(span 안)과 카드 본문(div 안) 양쪽에 들어가므로 태그는 span으로 두고 block으로 쌓는다 —
 * div/p를 쓰면 액션 영역에서 유효하지 않은 중첩이 된다.
 */
export function NameStatusLine({ groups, className }: Props) {
    const filled = groups.filter((g) => g.names.length > 0)
    if (filled.length === 0) return null
    return (
        <span className={className ? `block ${className}` : 'block'}>
            {filled.map((g) => (
                <span key={g.label} className="block text-caption text-muted-foreground truncate">
                    {g.label}: {g.names.join(' · ')}
                </span>
            ))}
        </span>
    )
}
