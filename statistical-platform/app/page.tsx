import { redirect } from 'next/navigation'

/**
 * 홈 페이지 → 대시보드로 리다이렉트
 *
 * 기존 홈 페이지의 기능(스마트 분석 CTA, 즐겨찾기)이
 * 대시보드에 모두 포함되어 있어 중복 제거
 */
export default function HomePage() {
  redirect('/dashboard')
}
