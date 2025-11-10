/**
 * Settings Tab Component
 *
 * Chatbot 설정 페이지
 * - 환경 정보 (EnvironmentIndicator)
 * - 모델 설정 (ModelSettings) - 향후 추가
 * - 챗봇 설정 - 향후 추가
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EnvironmentIndicator } from '@/components/rag/environment-indicator'

export function SettingsTab() {
  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* 환경 정보 섹션 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">설정</h2>
          <p className="text-muted-foreground">
            RAG 챗봇 및 환경 설정을 관리합니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>환경 정보</CardTitle>
            <CardDescription>
              현재 배포 환경 및 서버 가용성을 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnvironmentIndicator />
          </CardContent>
        </Card>
      </div>

      {/* 향후 추가될 섹션들 */}
      {/*
      <Card>
        <CardHeader>
          <CardTitle>모델 설정</CardTitle>
          <CardDescription>
            임베딩 및 추론 모델을 선택합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelSettings {...modelSettingsProps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>챗봇 설정</CardTitle>
          <CardDescription>
            챗봇 동작 및 UI를 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatbotSettings {...chatbotSettingsProps} />
        </CardContent>
      </Card>
      */}
    </div>
  )
}
