param(
    [string]$ProjectPath = (Join-Path $PSScriptRoot "frontend\gradeed")
)

$ErrorActionPreference = "Stop"

Write-Host "Vue project path: $ProjectPath" -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $ProjectPath)) {
    Write-Error "Vue project was not found: $ProjectPath"
    exit 1
}

$srcPath = Join-Path $ProjectPath "src"
if (-not (Test-Path -LiteralPath $srcPath)) {
    Write-Error "The src folder was not found: $srcPath"
    exit 1
}

$directories = @(
    "src\assets",
    "src\components\common",
    "src\components\students",
    "src\components\topics",
    "src\components\testing",
    "src\components\reports",
    "src\composables",
    "src\constants",
    "src\router",
    "src\services",
    "src\stores",
    "src\utils",
    "src\views"
)

$files = @(
    "src\components\common\AppButton.vue",
    "src\components\common\AppCard.vue",
    "src\components\common\AppModal.vue",
    "src\components\common\StableInput.vue",
    "src\components\common\StableTextarea.vue",
    "src\composables\useStudentAnalytics.js",
    "src\composables\useStudentPoints.js",
    "src\composables\useTopicProgress.js",
    "src\constants\app.js",
    "src\constants\topics.js",
    "src\router\index.js",
    "src\services\backupService.js",
    "src\services\migrationService.js",
    "src\services\storageService.js",
    "src\stores\mathStore.js",
    "src\utils\date.js",
    "src\utils\html.js",
    "src\utils\id.js",
    "src\utils\text.js",
    "src\views\DashboardView.vue",
    "src\views\OverviewView.vue",
    "src\views\StudentProgressView.vue",
    "src\views\TestingView.vue",
    "src\views\LeaderboardView.vue",
    "src\views\ManageView.vue"
)

foreach ($directory in $directories) {
    $fullPath = Join-Path $ProjectPath $directory
    if (-not (Test-Path -LiteralPath $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "Created directory: $directory" -ForegroundColor Green
    }
    else {
        Write-Host "Directory already exists: $directory" -ForegroundColor DarkGray
    }
}

foreach ($file in $files) {
    $fullPath = Join-Path $ProjectPath $file
    if (-not (Test-Path -LiteralPath $fullPath)) {
        New-Item -ItemType File -Path $fullPath -Force | Out-Null
        Write-Host "Created file: $file" -ForegroundColor Green
    }
    else {
        Write-Host "Skipped existing file: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Vue structure created successfully." -ForegroundColor Cyan
Write-Host "Existing files were not overwritten." -ForegroundColor Cyan
