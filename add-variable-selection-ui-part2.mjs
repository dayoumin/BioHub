import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:/Projects/Statics/statistical-platform/components/smart-flow/steps/PurposeInputStep.tsx';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// 변수 선택 UI 컴포넌트 추가
// Purpose 선택 후, AI 추천 카드 전에 삽입
const insertBefore = `            {/* Phase 4-B 적용: AI 추천 결과 */}`;

const variableSelectionUI = `            {/* 변수 선택 UI */}
            {selectedPurpose && !recommendation && (
              <div className="space-y-4 p-6 bg-muted/50 rounded-lg border-2 border-dashed">
                <div>
                  <h3 className="text-lg font-semibold mb-2">변수 선택</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    분석할 변수를 선택해주세요.
                  </p>
                </div>

                {/* 그룹 간 차이 비교 */}
                {selectedPurpose === 'compare' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="group-variable">그룹 변수 (독립 변수)</Label>
                      <Select
                        value={selectedGroupVariable || undefined}
                        onValueChange={handleGroupVariableChange}
                      >
                        <SelectTrigger id="group-variable">
                          <SelectValue placeholder="그룹을 나누는 범주형 변수 선택..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categoricalColumns.map((col) => (
                            <SelectItem key={col.name} value={col.name}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="dependent-variable">종속 변수 (비교할 값)</Label>
                      <Select
                        value={selectedDependentVariable || undefined}
                        onValueChange={handleDependentVariableChange}
                      >
                        <SelectTrigger id="dependent-variable">
                          <SelectValue placeholder="비교할 수치형 변수 선택..." />
                        </SelectTrigger>
                        <SelectContent>
                          {numericColumns.map((col) => (
                            <SelectItem key={col.name} value={col.name}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* 변수 간 관계 분석 */}
                {selectedPurpose === 'relationship' && (
                  <div>
                    <Label>분석할 변수 선택 (2개 이상)</Label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {numericColumns.map((col) => (
                        <label
                          key={col.name}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedVariables.includes(col.name)}
                            onChange={(e) => handleVariablesChange(col.name, e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span>{col.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      선택된 변수: {selectedVariables.length}개 (최소 2개 필요)
                    </p>
                  </div>
                )}

                {/* 예측 모델링 */}
                {selectedPurpose === 'prediction' && (
                  <div>
                    <Label>예측 변수 선택 (2개 이상)</Label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {numericColumns.map((col) => (
                        <label
                          key={col.name}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedVariables.includes(col.name)}
                            onChange={(e) => handleVariablesChange(col.name, e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span>{col.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      선택된 변수: {selectedVariables.length}개 (최소 2개 필요)
                    </p>
                  </div>
                )}

                {/* 시계열 분석 */}
                {selectedPurpose === 'timeseries' && (
                  <div>
                    <Label>시계열 변수 선택 (1개 이상)</Label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {numericColumns.map((col) => (
                        <label
                          key={col.name}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedVariables.includes(col.name)}
                            onChange={(e) => handleVariablesChange(col.name, e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span>{col.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      선택된 변수: {selectedVariables.length}개 (최소 1개 필요)
                    </p>
                  </div>
                )}

                {/* 분포 분석은 변수 선택 불필요 */}
                {selectedPurpose === 'distribution' && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      분포 분석은 모든 변수를 자동으로 분석합니다.
                    </p>
                  </div>
                )}

                {/* 변수 선택 진행 상태 */}
                {!isVariableSelectionComplete && selectedPurpose !== 'distribution' && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      ⏳ 변수를 선택하면 자동으로 AI 추천이 시작됩니다.
                    </p>
                  </div>
                )}

                {isVariableSelectionComplete && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ 변수 선택 완료! AI 추천을 분석 중입니다...
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Phase 4-B 적용: AI 추천 결과 */}`;

content = content.replace(insertBefore, variableSelectionUI);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ PurposeInputStep.tsx 수정 완료 (2/2: UI 컴포넌트 추가)');
console.log('');
console.log('추가된 변수 선택 UI:');
console.log('1. 그룹 간 차이 비교: 그룹 변수 + 종속 변수 (Select)');
console.log('2. 변수 간 관계 분석: 다중 변수 선택 (Checkbox, 최소 2개)');
console.log('3. 예측 모델링: 다중 변수 선택 (Checkbox, 최소 2개)');
console.log('4. 시계열 분석: 다중 변수 선택 (Checkbox, 최소 1개)');
console.log('5. 분포 분석: 변수 선택 불필요 (자동 분석)');
console.log('');
console.log('다음: DecisionTreeRecommender 수정 필요');
