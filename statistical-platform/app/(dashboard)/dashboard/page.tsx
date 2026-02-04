import { redirect } from 'next/navigation'

/**
 * /dashboard → / 리다이렉트
 *
 * Dashboard 기능이 루트 페이지로 통합됨
 */
export default function DashboardRedirect() {
  redirect('/')
}
