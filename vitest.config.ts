import path from 'node:path'
import { defineConfig } from 'vitest/config'

// 순수 모듈(lib/rating 등) 단위 테스트 전용 설정.
// '@/' 별칭을 src 로 매핑해 타입/모듈 임포트를 해석한다.
export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',
    },
})
