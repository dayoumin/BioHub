# sql.js WASM 파일 다운로드 및 설정 스크립트 (PowerShell)
# 사용법: powershell -ExecutionPolicy Bypass -File scripts/download-sql-wasm.ps1

param(
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "📥 sql.js WASM 파일 준비 중..." -ForegroundColor Cyan

# 디렉토리 생성
$outputDir = Join-Path $PSScriptRoot "..\public\sql-wasm"
$projectRoot = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "✅ 디렉토리 생성: $outputDir" -ForegroundColor Green
}

# sql.js CDN URL
$sqlJsCDN = "https://sql.js.org/dist"

# 다운로드할 파일
$files = @(
    "sql-wasm.js",
    "sql-wasm.wasm"
)

Push-Location $outputDir

foreach ($file in $files) {
    $filePath = Join-Path $outputDir $file
    $url = "$sqlJsCDN/$file"

    # 파일이 이미 있으면 확인
    if ((Test-Path $filePath) -and -not $Force) {
        $size = (Get-Item $filePath).Length / 1MB
        Write-Host "⏭️  이미 존재: $file ($([math]::Round($size, 2))MB)" -ForegroundColor Yellow
        continue
    }

    Write-Host "📥 다운로드 중: $file" -ForegroundColor Cyan

    try {
        # PowerShell의 ProgressPreference 비활성화 (다운로드 속도 향상)
        $ProgressPreference = 'SilentlyContinue'

        Invoke-WebRequest -Uri $url -OutFile $filePath -TimeoutSec 30

        if (Test-Path $filePath) {
            $size = (Get-Item $filePath).Length / 1MB
            Write-Host "✅ 다운로드 완료: $file ($([math]::Round($size, 2))MB)" -ForegroundColor Green
        }
        else {
            throw "파일이 생성되지 않았습니다: $file"
        }
    }
    catch {
        Write-Host "❌ 다운로드 실패: $file" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

Pop-Location

Write-Host ""
Write-Host "✅ sql.js WASM 파일 준비 완료!" -ForegroundColor Green
Write-Host "📍 위치: $outputDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 다음 단계:" -ForegroundColor Yellow
Write-Host "   1. git add public/sql-wasm/" -ForegroundColor White
Write-Host "   2. npm run build" -ForegroundColor White
Write-Host "   3. 배포 테스트" -ForegroundColor White
Write-Host ""

# 파일 목록 확인
Write-Host "📂 다운로드된 파일 목록:" -ForegroundColor Cyan
Get-ChildItem -Path $outputDir -File | ForEach-Object {
    $size = $_.Length / 1MB
    Write-Host "   - $($_.Name) ($([math]::Round($size, 2))MB)" -ForegroundColor White
}
