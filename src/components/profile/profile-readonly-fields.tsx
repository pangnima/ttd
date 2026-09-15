import { YearMonthField } from '@/components/common/year-month-field'
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
 * 가입 시 1회 입력한 값을 표시만 하며 폼으로 전송하지 않는다 — **시작일이 비어 있을 때만 예외**로
 * 입력란이 열린다(그 값만 폼에 실린다). 서버도 현재 값이 null일 때만 받는다.
 * NTRP는 가입 선택지(1.0~4.0) 밖의 기존 값(예: 5.0)도 있으므로 원값을 그대로 보여준다.
 */
export function ProfileReadonlyFields({ gender, dominantHand, tennisStartDate, ntrp }: Props) {
    return (
        <>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <ReadonlyLabel>성별</ReadonlyLabel>
                    {/* null을 '남성'으로 그리면 고른 적 없는 값을 고른 것처럼 단언하게 된다 */}
                    {gender
                        ? <ReadonlyToggle options={GENDER_OPTIONS} current={gender} />
                        : <div className={readonlyFieldCls}>미입력</div>}
                </div>
                <div>
                    <ReadonlyLabel>주력손</ReadonlyLabel>
                    {dominantHand
                        ? <ReadonlyToggle options={HAND_OPTIONS} current={dominantHand} />
                        : <div className={readonlyFieldCls}>미입력</div>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/*
                  * 시작일만 예외 — **비어 있을 때 1회** 채울 수 있다.
                  * Week 56에 필수로 올리기 전에 가입한 회원은 null로 남아 있는데, 설정은 읽기 전용이고
                  * 완성 화면은 재진입이 막혀 어느 화면에서도 채울 수 없었다. 「변경 불가」를
                  * 「입력 후 변경 불가」로 읽는 것이라 값이 있는 회원은 그대로 잠긴다.
                  */}
                {tennisStartDate ? (
                    <div>
                        <ReadonlyLabel>테니스 시작일</ReadonlyLabel>
                        <div className={readonlyFieldCls}>{formatYearMonthLabel(tennisStartDate)}</div>
                    </div>
                ) : (
                    <YearMonthField hint="한 번만 입력할 수 있습니다" />
                )}
                <div>
                    <ReadonlyLabel>NTRP</ReadonlyLabel>
                    <div className={readonlyFieldCls}>{ntrp != null ? ntrp.toFixed(1) : '미입력'}</div>
                </div>
            </div>
        </>
    )
}
