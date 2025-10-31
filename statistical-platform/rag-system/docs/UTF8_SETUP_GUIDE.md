# Windows UTF-8 이모지 문제 완전 해결 가이드

**목적**: Python 스크립트, VSCode 터미널에서 이모지/Unicode 문자 정상 출력
**작성일**: 2025-10-31

---

## 문제 상황

### 증상
```bash
# Python 스크립트 실행 시
UnicodeEncodeError: 'cp949' codec can't encode character '\U0001f50d' in position 2
```

### 원인
- Windows 기본 콘솔 인코딩: **cp949** (한글 Windows)
- cp949는 한글은 지원하지만 **이모지 및 Unicode 확장 문자 미지원**
- Python 기본 출력: `sys.stdout.encoding` → cp949

---

## ✅ 해결 방법 (3단계)

### 1단계: VSCode 터미널 UTF-8 설정 (프로젝트별)

#### 방법 A: `.vscode/settings.json` 생성 (권장)

프로젝트 루트에 `.vscode/settings.json` 파일:

```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.profiles.windows": {
    "PowerShell": {
      "source": "PowerShell",
      "args": [
        "-NoExit",
        "-Command",
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001"
      ]
    },
    "Command Prompt": {
      "path": "${env:windir}\\System32\\cmd.exe",
      "args": ["/K", "chcp 65001"]
    }
  },
  "files.encoding": "utf8",
  "python.defaultInterpreterPath": "C:/Users/User/AppData/Local/Programs/Python/Python313/python.exe"
}
```

**효과**: VSCode에서 터미널을 열 때마다 자동으로 UTF-8 모드 활성화

#### 방법 B: VSCode 사용자 설정 (전역) ⭐ **권장**

`Ctrl+Shift+P` → "Preferences: Open Settings (JSON)"

또는 직접 파일 편집:
- Windows: `C:\Users\User\AppData\Roaming\Code\User\settings.json`

```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.profiles.windows": {
    "PowerShell": {
      "source": "PowerShell",
      "args": [
        "-NoExit",
        "-Command",
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001"
      ]
    },
    "Command Prompt": {
      "path": "${env:windir}\\System32\\cmd.exe",
      "args": ["/K", "chcp 65001"]
    },
    "Git Bash": {
      "source": "Git Bash"
    }
  },
  "files.encoding": "utf8",
  "files.autoGuessEncoding": false
}
```

**효과**: ✅ **모든 프로젝트에 자동 적용** (추천!)

**✅ 적용 완료** (2025-10-31): 전역 설정 완료됨

---

### 2단계: Python 스크립트 UTF-8 래퍼 (코드 수준)

**모든 Python 스크립트 상단에 추가**:

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import io

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
```

**작동 원리**:
- `sys.stdout.buffer`: 바이트 스트림 (인코딩 없음)
- `io.TextIOWrapper(..., encoding='utf-8')`: UTF-8로 강제 래핑
- 이모지, Unicode 모두 출력 가능

**적용 예시** (`test_crawl4ai.py`):
```python
# 파일 상단
import sys
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 이제 이모지 출력 가능
print("🔍 크롤링 시작...")
print("✅ 완료!")
```

---

### 3단계: Windows 시스템 레벨 UTF-8 설정 (선택, 영구적)

#### 방법 A: 레지스트리 수정 (관리자 권한 필요)

**경고**: 레지스트리 수정은 신중하게!

1. `Win+R` → `regedit` 실행
2. 경로: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Nls\CodePage`
3. `OEMCP` 값을 `65001` (UTF-8)로 변경
4. 재부팅

**효과**: 모든 콘솔 애플리케이션이 기본적으로 UTF-8 사용

#### 방법 B: Windows 11 베타 기능 활성화

**Windows 11 전용**:

1. 설정 → 시간 및 언어 → 언어 및 지역
2. "관리 언어 설정" → "시스템 로캘 변경"
3. ✅ "Beta: UTF-8 사용(전 세계 언어 지원)" 체크
4. 재부팅

**효과**: Windows 전역에서 UTF-8 지원

---

## 🧪 테스트 방법

### 테스트 1: 터미널 인코딩 확인

**PowerShell**:
```powershell
[Console]::OutputEncoding
# 결과: utf-8 (65001) 이어야 함
```

**Command Prompt**:
```cmd
chcp
# 결과: 활성 코드 페이지: 65001
```

### 테스트 2: Python 인코딩 확인

```python
import sys
print(f"stdout encoding: {sys.stdout.encoding}")
print(f"stderr encoding: {sys.stderr.encoding}")

# 이모지 출력 테스트
print("🔍 🎯 ✅ ❌ 📊 🚀")
```

**기대 결과**:
```
stdout encoding: utf-8
stderr encoding: utf-8
🔍 🎯 ✅ ❌ 📊 🚀
```

### 테스트 3: 파일 저장 인코딩 확인

```python
with open("test_emoji.txt", "w", encoding="utf-8") as f:
    f.write("✅ 이모지 테스트\n")

# 읽기 테스트
with open("test_emoji.txt", "r", encoding="utf-8") as f:
    print(f.read())
```

---

## 📋 권장 설정 (프로젝트별)

### 최소 설정 (1+2단계만)

1. ✅ `.vscode/settings.json` 생성 (터미널 UTF-8)
2. ✅ Python 스크립트 상단에 UTF-8 래퍼 추가

**효과**: 프로젝트 내에서 이모지 문제 완전 해결

### 완전 설정 (1+2+3단계)

1. ✅ `.vscode/settings.json` 생성
2. ✅ Python 스크립트 상단에 UTF-8 래퍼 추가
3. ✅ Windows 11 베타 기능 활성화

**효과**: 시스템 전역에서 이모지 문제 해결

---

## 🚨 주의사항

### 1. 기존 파일 인코딩 확인

**문제**: 이미 cp949로 저장된 파일은 UTF-8 변환 필요

**해결**:
```python
# 파일 인코딩 확인
import chardet

with open("file.txt", "rb") as f:
    result = chardet.detect(f.read())
    print(result['encoding'])  # 예: 'cp949'

# UTF-8 변환
with open("file.txt", "r", encoding="cp949") as f:
    content = f.read()

with open("file.txt", "w", encoding="utf-8") as f:
    f.write(content)
```

### 2. Git 커밋 시 CRLF 경고

**문제**: Windows에서 UTF-8 파일 저장 시 CRLF 라인엔딩

**해결**: `.gitattributes` 설정
```gitattributes
# 모든 텍스트 파일을 LF로 정규화
* text=auto
*.py text eol=lf
*.md text eol=lf
*.json text eol=lf
```

### 3. 레거시 라이브러리 호환성

**문제**: 일부 오래된 Python 라이브러리는 cp949 가정

**해결**: 명시적 인코딩 지정
```python
# 예: pandas
df = pd.read_csv("file.csv", encoding="utf-8")

# 예: open()
with open("file.txt", "r", encoding="utf-8") as f:
    content = f.read()
```

---

## 🎯 프로젝트별 체크리스트

### RAG 시스템 (현재 프로젝트)

- [x] `.vscode/settings.json` 생성 (PowerShell UTF-8)
- [x] `test_crawl4ai.py`에 UTF-8 래퍼 추가
- [ ] 모든 Python 스크립트에 UTF-8 래퍼 추가 (향후)
- [ ] `.gitattributes` 설정 (LF 라인엔딩)

### 통계 분석 플랫폼 (Next.js)

- [ ] `.vscode/settings.json` 생성
- [ ] TypeScript 파일 UTF-8 인코딩 확인
- [ ] 한글 주석이 깨지지 않는지 확인

---

## 🔗 참고 자료

### 공식 문서
- Python UTF-8 Mode: https://peps.python.org/pep-0540/
- Windows UTF-8 Support: https://learn.microsoft.com/en-us/windows/apps/design/globalizing/use-utf8-code-page

### Stack Overflow
- Windows console UTF-8: https://stackoverflow.com/questions/57131654
- Python encoding issues: https://stackoverflow.com/questions/492483

### VSCode 문서
- Integrated Terminal: https://code.visualstudio.com/docs/terminal/basics

---

## 📝 트러블슈팅

### 문제: VSCode에서 설정했는데도 cp949 에러

**원인**: VSCode 재시작 필요 또는 터미널 세션 재시작

**해결**:
1. VSCode 완전 종료 (`Ctrl+Shift+P` → "Reload Window")
2. 터미널 패널 닫기 → 새 터미널 열기
3. `chcp` 명령으로 65001 확인

### 문제: PowerShell에서 한글 깨짐

**원인**: PowerShell 기본 폰트가 Unicode 미지원

**해결**:
1. PowerShell 창 → 우클릭 → 속성
2. 글꼴 → "D2Coding" 또는 "Cascadia Code" 선택
3. VSCode: `"terminal.integrated.fontFamily": "D2Coding"`

### 문제: Git Bash에서 이모지 출력 안 됨

**원인**: Git Bash는 MinTTY 사용 (별도 설정 필요)

**해결**:
```bash
# ~/.bashrc에 추가
export LANG=ko_KR.UTF-8
export LC_ALL=ko_KR.UTF-8
```

---

**작성자**: Claude Code (AI)
**최종 업데이트**: 2025-10-31
**적용 프로젝트**: Statics (RAG System)
