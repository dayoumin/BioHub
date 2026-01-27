import Link from 'next/link'
import { FileQuestion, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <FileQuestion className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">페이지를 찾을 수 없습니다</CardTitle>
          <CardDescription className="text-base mt-2">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="default" size="lg">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                홈으로 이동
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">
                <Search className="w-4 h-4 mr-2" />
                분석 방법 찾기
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              자주 찾는 페이지
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button asChild variant="ghost" size="sm">
                <Link href="/smart-flow">스마트 분석</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/statistics/t-test">T-검정</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/statistics/anova">ANOVA</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/statistics/correlation">상관분석</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
