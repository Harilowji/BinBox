# ==============================================================================
# BinBox Studio - 1-Click Update, Build & GitHub Push Script
# Tự động hóa: Build Frontend + Build Rust Release + Cập nhật App + Push GitHub
# ==============================================================================

param(
    [string]$CommitMessage = "",
    [switch]$NoPush,
    [switch]$NoRestart
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   BINBOX STUDIO - AUTO BUILD & GITHUB SYNC             " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$RepoRoot = "D:\Project\01_My_GitHub_Repos\BinBox"
$AppDir = "$RepoRoot\app"
$TauriDir = "$AppDir\src-tauri"
$LocalInstallDir = "C:\Users\Shadow\AppData\Local\BinBox Studio"
$GccBin = "D:\Sameko-dev\Sameko Dev C++\resources\Sameko-GCC\bin"

# [1/5] Kiểm tra môi trường biên dịch MinGW GCC
Write-Host "[1/5] Kiem tra moi truong trinh bien dich Sameko-GCC..." -ForegroundColor Yellow
if (Test-Path "$GccBin\x86_64-w64-mingw32-gcc.exe") {
    $env:PATH = "$GccBin;" + $env:PATH
    Write-Host "  -> Tim thay Sameko-GCC tai $GccBin" -ForegroundColor Green
} elseif (Test-Path "$GccBin\gcc.exe") {
    Copy-Item "$GccBin\gcc.exe" "$GccBin\x86_64-w64-mingw32-gcc.exe" -Force -ErrorAction SilentlyContinue
    $env:PATH = "$GccBin;" + $env:PATH
    Write-Host "  -> Da thiet lap alias GCC MinGW" -ForegroundColor Green
} else {
    Write-Host "  [!] Khong tim thay Sameko-GCC, su dung GCC mac dinh trong PATH" -ForegroundColor Yellow
}

# [2/5] Biên dịch Frontend (Vite + TypeScript)
Write-Host ""
Write-Host "[2/5] Bien dich Frontend (TypeScript & Vite)..." -ForegroundColor Yellow
Push-Location $AppDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build that bai!" }
    Write-Host "  -> Frontend build thanh cong!" -ForegroundColor Green
} finally {
    Pop-Location
}

# [3/5] Biên dịch Rust Release (x86_64-pc-windows-gnu)
Write-Host ""
Write-Host "[3/5] Bien dich Rust Release binary..." -ForegroundColor Yellow
Push-Location $TauriDir
try {
    rustup run stable-x86_64-pc-windows-gnu cargo build --release --target x86_64-pc-windows-gnu
    if ($LASTEXITCODE -ne 0) { throw "Cargo build that bai!" }
    Write-Host "  -> Rust Release binary build thanh cong!" -ForegroundColor Green
} finally {
    Pop-Location
}

# [4/5] Cập nhật bản cài đặt cục bộ (AppData)
Write-Host ""
Write-Host "[4/5] Cap nhat BinBox Studio vao thu muc cai dat..." -ForegroundColor Yellow
$BuiltExe = "$TauriDir\target\x86_64-pc-windows-gnu\release\app.exe"
if (-not (Test-Path $BuiltExe)) {
    throw "Khong tim thay tap tin binary build: $BuiltExe"
}

if (-not (Test-Path $LocalInstallDir)) {
    New-Item -ItemType Directory -Path $LocalInstallDir -Force | Out-Null
}

$TargetExe = "$LocalInstallDir\BinBox Studio.exe"
$OldExe = "$LocalInstallDir\BinBox Studio.exe.old"
$AppExe = "$LocalInstallDir\app.exe"

# Ky thuat rename de tranh bi Windows khoa file khi dang mo
if (Test-Path $TargetExe) {
    try {
        Move-Item -Path $TargetExe -Destination $OldExe -Force -ErrorAction SilentlyContinue
    } catch {}
}

Copy-Item -Path $BuiltExe -Destination $TargetExe -Force
Copy-Item -Path $BuiltExe -Destination $AppExe -Force

$LoaderDll = "$TauriDir\target\x86_64-pc-windows-gnu\release\WebView2Loader.dll"
if (Test-Path $LoaderDll) {
    Copy-Item -Path $LoaderDll -Destination "$LocalInstallDir\WebView2Loader.dll" -Force
}
Write-Host "  -> Da cap nhat BinBox Studio.exe va WebView2Loader.dll tai $LocalInstallDir" -ForegroundColor Green

# [5/5] Git Add, Commit & Push lên GitHub
if (-not $NoPush) {
    Write-Host ""
    Write-Host "[5/5] Dong bo len GitHub repository..." -ForegroundColor Yellow
    Push-Location $RepoRoot
    try {
        git add .
        $status = git status --porcelain
        if ($status) {
            if (-not $CommitMessage) {
                $timeStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                $CommitMessage = "feat(app): update build & sync repository ($timeStr)"
            }
            git commit -m $CommitMessage
            Write-Host "  -> Da commit: $CommitMessage" -ForegroundColor Green
            git push origin main
            Write-Host "  -> Da push thanh cong len GitHub origin/main!" -ForegroundColor Green
        } else {
            Write-Host "  -> Khong co thay doi ma nguon moi can commit tren Git." -ForegroundColor DarkGray
        }
    } finally {
        Pop-Location
    }
}

$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   HOAN TAT CAP NHAT & DONG BO TRONG $([math]::Round($elapsed.TotalSeconds, 1)) GIAY! " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
