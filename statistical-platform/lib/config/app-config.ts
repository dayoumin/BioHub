
export const appConfig = {
    features: {
        // AI 기능을 활성화할지 여부 (기본값: false, 환경변수 또는 빌드 설정에 따라 변경 가능)
        enableAI: process.env.NEXT_PUBLIC_ENABLE_AI === 'true',
    },
    ui: {
        theme: 'ocean', // 'default' | 'ocean'
    }
}
