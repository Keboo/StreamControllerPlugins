# StreamDock Plugin Deployment Script
# Deploys all .sdPlugin folders to the StreamDock plugins directory and restarts the application

$ErrorActionPreference = "Stop"

# Configuration
$sourceDir = $PSScriptRoot
$targetDir = Join-Path $env:APPDATA "HotSpot\StreamDock\plugins"
$processName = "Stream Controller"

Write-Host "StreamDock Plugin Deployment" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Find all plugin folders (ending with .sdPlugin)
$plugins = Get-ChildItem -Path $sourceDir -Directory -Filter "*.sdPlugin"

if ($plugins.Count -eq 0) {
    Write-Host "No .sdPlugin folders found in $sourceDir" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $($plugins.Count) plugin(s) to deploy:" -ForegroundColor Green
$plugins | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }
Write-Host ""

# Stop Stream Controller if running
$process = Get-Process -Name $processName -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "Stopping $processName..." -ForegroundColor Yellow
    Stop-Process -Name $processName -Force
    Start-Sleep -Seconds 2
    Write-Host "  Stopped." -ForegroundColor Green
} else {
    Write-Host "$processName is not running." -ForegroundColor Gray
}
Write-Host ""

# Ensure target directory exists
if (-not (Test-Path $targetDir)) {
    Write-Host "Creating plugins directory: $targetDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

# Deploy each plugin
foreach ($plugin in $plugins) {
    $targetPath = Join-Path $targetDir $plugin.Name
    
    Write-Host "Deploying $($plugin.Name)..." -ForegroundColor Cyan
    
    # Remove existing plugin folder if it exists
    if (Test-Path $targetPath) {
        Write-Host "  Removing existing installation..." -ForegroundColor Gray
        Remove-Item -Path $targetPath -Recurse -Force
    }
    
    # Copy the plugin
    Write-Host "  Copying files..." -ForegroundColor Gray
    Copy-Item -Path $plugin.FullName -Destination $targetPath -Recurse -Force
    
    Write-Host "  Deployed to: $targetPath" -ForegroundColor Green
}
Write-Host ""

# Restart Stream Controller
Write-Host "Starting $processName..." -ForegroundColor Yellow

# Try to find Stream Controller executable
$possiblePaths = @(
    Join-Path $env:LOCALAPPDATA "Programs\StreamDock\Stream Controller.exe"
    Join-Path $env:ProgramFiles "StreamDock\Stream Controller.exe"
    Join-Path ${env:ProgramFiles(x86)} "StreamDock\Stream Controller.exe"
    Join-Path $env:APPDATA "HotSpot\StreamDock\Stream Controller.exe"
)

$exePath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $exePath = $path
        break
    }
}

if ($exePath) {
    Start-Process -FilePath $exePath
    Write-Host "  Started from: $exePath" -ForegroundColor Green
} else {
    Write-Host "  Could not find Stream Controller.exe automatically." -ForegroundColor Yellow
    Write-Host "  Please start it manually or add the path to this script." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
