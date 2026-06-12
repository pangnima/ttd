// userId(또는 임의 seed) 해시로 고정 컬러를 부여하는 이니셜 아바타 팔레트.
// 같은 사람은 항상 같은 색 → 리스트에서 시각적 식별을 돕는다.
// 결과(승=win/패=loss) 시맨틱과 혼동되지 않도록 무채-성격 강한 색 위주로 구성.
const AVATAR_PALETTE = [
    'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    'bg-sky-500/20 text-sky-600 dark:text-sky-400',
    'bg-violet-500/20 text-violet-600 dark:text-violet-400',
    'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    'bg-rose-500/20 text-rose-600 dark:text-rose-400',
    'bg-teal-500/20 text-teal-600 dark:text-teal-400',
    'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    'bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400',
]

export function avatarColorClass(seed: string): string {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}
