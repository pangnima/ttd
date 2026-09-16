/** base-ui Autocomplete 팝업·항목 클래스 — PlayerAutocomplete와 CourtNameAutocomplete가 공유한다 */
export const POPUP_CLASS =
    'relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'
export const ITEM_CLASS =
    'relative flex w-full cursor-default items-center gap-1.5 rounded-md px-2 py-1.5 text-body2 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground'
export const NOTE_CLASS = 'px-3 py-2 text-caption text-muted-foreground break-keep'
