import { formatYearMonthLabel } from '@/lib/format/year-month'
import { GENDER_OPTIONS, HAND_OPTIONS } from '@/lib/profile/signup-fields'
import { FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

// 변경 불가 필드 표시용 (입력 불가, 회색 톤)
const readonlyFieldCls = [
    'w-full rounded-lg px-3 py-3 text-body2 text-muted-foreground',
    'bg-muted/50 border border-input',
].join(' ')

const toggleBase = 'py-2 text-caption rounded-md border text-center cursor-default pointer-events-none'
const toggleActive = 'border-primary/40 bg-primary/5 text-primary/60 font-semibold'
const toggleInactive = 'border-border text-muted-foreground'

type Props = {
    gender: string | null
    dominantHand: string | null
    tennisStartDate: string | null
    ntrp: number | null
}

function ReadonlyLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className={`${labelCls} flex items-center gap-1.5`}>
            {children}
            <span className="normal-case tracking-normal font-normal text-muted-foreground">(변경 불가)</span>
        </p>
    )
}

function ReadonlyToggle({ options, current }: { options: ReadonlyArray<{ value: string; label: string }>; current: string }) {
    return (
        <div className="grid grid-cols-2 gap-1.5">
            {options.map(({ value, label }) => (
                <div key={value} className={`${toggleBase} ${current === value ? toggleActive : toggleInactive}`}>
                    {label}
                </div>
            ))}
        </div>
    )
}

/**
 * 프로필 설정의 변경 불가 필드 묶음 — 성별·주력손·테니스 시작일·NTRP.
 * 가입 시 1회 입력한 값을 표시만 하며 폼으로 전송하지 않는다.
 * NTRP는 가입 선택지(1.0~4.0) 밖의 기존 값(예: 5.0)도 있으므로 원값을 그대로 보여준다.
 */
export function ProfileReadonlyFields({ gender, dominantHand, tennisStartDate, ntrp }: Props) {
    return (
        <>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <ReadonlyLabel>성별</ReadonlyLabel>
                    <ReadonlyToggle options={GENDER_OPTIONS} current={gender ?? 'male'} />
                </div>
                <div>
                    <ReadonlyLabel>주력손</ReadonlyLabel>
                    <ReadonlyToggle options={HAND_OPTIONS} current={dominantHand ?? 'right'} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <ReadonlyLabel>테니스 시작일</ReadonlyLabel>
                    <div className={readonlyFieldCls}>{tennisStartDate ? formatYearMonthLabel(tennisStartDate) : '미입력'}</div>
                </div>
                <div>
                    <ReadonlyLabel>NTRP</ReadonlyLabel>
                    <div className={readonlyFieldCls}>{ntrp != null ? ntrp.toFixed(1) : '미입력'}</div>
                </div>
            </div>
        </>
    )
}
