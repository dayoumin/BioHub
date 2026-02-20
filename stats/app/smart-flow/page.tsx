import { redirect } from 'next/navigation'

/**
 * /smart-flow → / 리다이렉트
 *
 * Smart Flow 기능이 루트 페이지로 통합됨
 */
export default function SmartFlowRedirect() {
  redirect('/')
}
