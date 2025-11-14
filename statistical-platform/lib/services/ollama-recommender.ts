/**
 * Ollama 기반 지능형 통계 분석 추천 시스템
 * 로컬 LLM을 사용하여 자연어 이해 및 추천
 */

interface OllamaConfig {
  host: string
  model: string
  temperature: number
  maxTokens: number
}

interface OllamaResponse {
  model: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
}

export class OllamaRecommender {
  private config: OllamaConfig = {
    host: 'http://localhost:11434',
    model: 'qwen3:4b', // 설치된 모델 사용 (2.6GB, 한국어 지원 우수)
    temperature: 0.3, // 낮게 설정 (일관성 중요)
    maxTokens: 500
  }

  private systemPrompt = `You are a statistical analysis expert assistant. 
Your task is to recommend appropriate statistical methods based on user's research questions and data characteristics.

Always respond in JSON format:
{
  "methods": [
    {
      "id": "method_id",
      "name": "Method Name in Korean",
      "confidence": 0.95,
      "reason": "Why this method is suitable"
    }
  ],
  "clarification": "Questions if input is unclear",
  "warnings": ["Important considerations"],
  "assumptions": ["Statistical assumptions to check"]
}

Available methods:
- t-test (independent, paired, one-sample)
- ANOVA (one-way, two-way, repeated measures)
- Correlation (Pearson, Spearman, Kendall)
- Regression (linear, multiple, logistic)
- Chi-square test
- Mann-Whitney U test
- Kruskal-Wallis test
- Wilcoxon signed-rank test`

  /**
   * Ollama 서버 상태 확인
   *
   * 웹 환경(Vercel)에서는 localhost 접근 불가하므로 체크 스킵
   */
  async checkHealth(): Promise<boolean> {
    // 웹 환경 감지 (Vercel 등)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // 웹 환경에서는 localhost Ollama 접근 불가
        return false
      }
    }

    try {
      const response = await fetch(`${this.config.host}/api/tags`, {
        signal: AbortSignal.timeout(2000), // 2초 타임아웃
      })
      return response.ok
    } catch (error) {
      // 에러 로그 최소화 (개발 환경에서만 표시)
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Ollama] 서버 연결 실패 (로컬 환경에서만 사용 가능)')
      }
      return false
    }
  }

  /**
   * 모델 사전 로드 (초기화 시 한 번만)
   */
  async preloadModel(): Promise<void> {
    try {
      await fetch(`${this.config.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: 'Initialize',
          stream: false
        })
      })
    } catch (error) {
      console.error('Failed to preload model:', error)
    }
  }

  /**
   * LLM 기반 추천
   */
  async recommend(
    purposeText: string,
    dataContext: {
      shape: [number, number]
      types: string[]
      preview?: any[]
    }
  ): Promise<{
    methods: any[]
    confidence: number
    clarification?: string
    fallback?: boolean
  }> {
    // Ollama 사용 불가 시 폴백
    const isAvailable = await this.checkHealth()
    if (!isAvailable) {
      return this.fallbackToKeywordBased(purposeText)
    }

    try {
      const prompt = this.buildPrompt(purposeText, dataContext)
      
      const response = await fetch(`${this.config.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          system: this.systemPrompt,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens
          }
        })
      })

      if (!response.ok) {
        throw new Error('Ollama request failed')
      }

      const data: OllamaResponse = await response.json()
      return this.parseResponse(data.response)
      
    } catch (error) {
      console.error('LLM recommendation failed:', error)
      return this.fallbackToKeywordBased(purposeText)
    }
  }

  /**
   * 프롬프트 구성
   */
  private buildPrompt(
    purposeText: string,
    dataContext: any
  ): string {
    return `
User's research question: "${purposeText}"

Data information:
- Shape: ${dataContext.shape[0]} rows × ${dataContext.shape[1]} columns
- Column types: ${dataContext.types.join(', ')}
- Sample size: ${dataContext.shape[0] < 30 ? 'Small (consider non-parametric)' : 'Adequate'}

Please recommend the most appropriate statistical methods for this analysis.
Respond in Korean and JSON format.`
  }

  /**
   * LLM 응답 파싱
   */
  private parseResponse(response: string): any {
    try {
      // JSON 추출 (LLM이 추가 텍스트를 포함할 수 있음)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', error)
    }

    // 파싱 실패 시 기본 구조
    return {
      methods: [],
      confidence: 0.5,
      clarification: '응답을 해석할 수 없습니다',
      fallback: true
    }
  }

  /**
   * 키워드 기반 폴백
   */
  private fallbackToKeywordBased(purposeText: string): any {
    console.log('Falling back to keyword-based recommendation')
    
    // KeywordBasedRecommender 사용
    return {
      methods: [
        {
          id: 't-test',
          name: '독립표본 t-검정',
          confidence: 0.6,
          reason: '키워드 기반 추천 (LLM 사용 불가)'
        }
      ],
      confidence: 0.6,
      fallback: true,
      clarification: 'Ollama를 사용할 수 없어 기본 추천을 제공합니다'
    }
  }

  /**
   * 스트리밍 응답 (실시간 표시)
   */
  async *recommendStream(
    purposeText: string,
    dataContext: any
  ): AsyncGenerator<string> {
    const prompt = this.buildPrompt(purposeText, dataContext)
    
    const response = await fetch(`${this.config.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        system: this.systemPrompt,
        stream: true
      })
    })

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(Boolean)
      
      for (const line of lines) {
        try {
          const json = JSON.parse(line)
          if (json.response) {
            yield json.response
          }
        } catch (e) {
          // 파싱 오류 무시
        }
      }
    }
  }
}

// 싱글톤 인스턴스
export const ollamaRecommender = new OllamaRecommender()