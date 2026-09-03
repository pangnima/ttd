import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge는 기본 설정에서 `text-<이름>` 커스텀 토큰을 font-size가 아닌 색상으로 분류한다.
 * globals.css @theme의 시맨틱 타이포 토큰을 font-size 스케일로 등록해야
 * cn('text-h1', 'text-foreground')에서 text-h1이 색상 충돌로 삭제되지 않는다.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "h4", "body", "body2", "caption", "micro"],
      tracking: ["eyebrow"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
