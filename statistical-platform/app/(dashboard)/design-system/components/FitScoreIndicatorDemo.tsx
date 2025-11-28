'use client'

import { useState } from 'react'
import { FitScoreIndicator, FitScoreBadge, getFitLevel } from '@/components/smart-flow/visualization/FitScoreIndicator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function FitScoreIndicatorDemo() {
  const [score, setScore] = useState(75)
  const [compact, setCompact] = useState(false)

  const currentLevel = getFitLevel(score)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            FitScoreIndicator
            <Badge variant="secondary">NEW</Badge>
          </CardTitle>
          <CardDescription>
            데이터-방법 적합도 지표 (점진적 공개 패턴)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Demo Area */}
          <div className="bg-muted/30 rounded-lg p-6 space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">현재 점수</p>
              <p className="text-4xl font-bold">{score}</p>
            </div>

            {/* Slider Control */}
            <div className="px-4">
              <Slider
                value={[score]}
                onValueChange={(value) => setScore(value[0])}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            {/* Compact Toggle */}
            <div className="flex items-center justify-center gap-2">
              <Switch
                id="compact-mode"
                checked={compact}
                onCheckedChange={setCompact}
              />
              <Label htmlFor="compact-mode" className="text-sm">컴팩트 모드</Label>
            </div>

            {/* Preview */}
            <div className="bg-background rounded-lg border p-6">
              <FitScoreIndicator score={score} compact={compact} />
            </div>

            {/* Badge Preview */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm text-muted-foreground">배지 변형:</span>
              <FitScoreBadge score={score} />
            </div>
          </div>

          {/* Score Levels Reference */}
          <div>
            <h4 className="text-sm font-medium mb-3">점수 레벨</h4>
            <div className="grid grid-cols-5 gap-2">
              {[
                { score: 90, label: 'Excellent' },
                { score: 75, label: 'Good' },
                { score: 55, label: 'Caution' },
                { score: 30, label: 'Poor' },
                { score: 0, label: 'Unknown' },
              ].map((item) => {
                const level = getFitLevel(item.score)
                return (
                  <button
                    key={item.score}
                    onClick={() => setScore(item.score)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      currentLevel.level === level.level
                        ? 'ring-2 ring-primary border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className={`text-xs font-medium ${level.colorClass}`}>
                      {level.shortLabel}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {item.score === 90 ? '85+' :
                       item.score === 75 ? '70-84' :
                       item.score === 55 ? '50-69' :
                       item.score === 30 ? '1-49' : '0'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Usage Code */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">사용법</h4>
            <pre className="text-xs overflow-x-auto">
{`import { FitScoreIndicator, FitScoreBadge, getFitLevel } from '@/components/smart-flow/visualization/FitScoreIndicator'

// 프로그레스 바가 있는 전체 지표
<FitScoreIndicator score={85} />

// 컴팩트 필 배지
<FitScoreIndicator score={85} compact />

// 인라인 배지 변형
<FitScoreBadge score={85} />

// 프로그래밍 방식으로 레벨 설정 가져오기
const config = getFitLevel(85)
// => { level: 'excellent', label: 'Very Suitable', shortLabel: 'Optimal', ... }`}
            </pre>
          </div>

          {/* Props Table */}
          <div>
            <h4 className="text-sm font-medium mb-2">Props</h4>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">속성</th>
                  <th className="text-left py-2">타입</th>
                  <th className="text-left py-2">기본값</th>
                  <th className="text-left py-2">설명</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-mono text-xs">score</td>
                  <td className="py-2 font-mono text-xs">number</td>
                  <td className="py-2">-</td>
                  <td className="py-2 text-muted-foreground">0-100 적합도 점수</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono text-xs">compact</td>
                  <td className="py-2 font-mono text-xs">boolean</td>
                  <td className="py-2">false</td>
                  <td className="py-2 text-muted-foreground">필 배지만 표시</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono text-xs">className</td>
                  <td className="py-2 font-mono text-xs">string</td>
                  <td className="py-2">-</td>
                  <td className="py-2 text-muted-foreground">추가 CSS 클래스</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Design Rationale */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300">디자인 근거</h4>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <li>• <strong>점진적 공개:</strong> 먼저 의미 있는 레이블을 보여주고, 확장 시 세부 정보 표시</li>
              <li>• <strong>사람이 읽기 쉬움:</strong> 혼란스러운 퍼센트 대신 의미 있는 용어 사용</li>
              <li>• <strong>색상 코드:</strong> 즉각적인 인식을 위한 녹색/파랑/주황/빨강</li>
              <li>• <strong>다크 모드:</strong> 접근 가능한 대비율로 완벽 지원</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
