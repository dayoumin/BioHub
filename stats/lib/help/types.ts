/**
 * 도움말 시스템 타입 정의
 */

export type HelpCategory =
  | 'guide'      // 사용 가이드
  | 'faq'        // FAQ
  | 'shortcuts'  // 단축키
  | 'variables'  // 변수 선택
  | 'data-format' // 데이터 형식

export interface HelpItem {
  id: string
  category: HelpCategory
  title: string
  description?: string
  content: string
  keywords: string[]  // 검색용 키워드
  relatedIds?: string[]  // 관련 항목 ID
}

export interface HelpSection {
  id: string
  category: HelpCategory
  title: string
  description?: string
  items: HelpItem[]
}

export interface HelpSearchResult {
  item: HelpItem
  score: number  // 검색 점수 (높을수록 관련성 높음)
  matchedIn: ('title' | 'description' | 'content' | 'keywords')[]
}

export interface HelpData {
  categories: {
    id: HelpCategory
    label: string
    icon: string  // lucide-react 아이콘 이름
  }[]
  sections: HelpSection[]
}
