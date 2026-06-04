# --- Vibsino Interactive Deployment Script (Windows) ---

$ErrorActionPreference = "Stop"

# Colors
$Green = "[32m"
$Yellow = "[33m"
$Blue = "[34m"
$Red = "[31m"
$Reset = "[0m"

function Write-Host-Color($Message, $Color) {
    Write-Host ("`e" + $Color + $Message + "`e" + $Reset)
}

Write-Host-Color "==============================================" $Blue
Write-Host-Color "   🎰 Vibsino Telegram Bot Deployment 🎰   " $Blue
Write-Host-Color "==============================================" $Blue

# Check for prerequisites
Write-Host-Color "Checking prerequisites..." $Yellow

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host-Color "Error: Node.js is not installed. Please install it from https://nodejs.org/" $Red
    exit 1
}

if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host-Color "pnpm not found. Attempting to install via npm..." $Yellow
    npm install -g pnpm
}

Write-Host-Color "Prerequisites met!" $Green

# Configuration Prompts
Write-Host "`n"
Write-Host-Color "--- Configuration Settings ---" $Blue

# Telegram Bot Token
$BotToken = Read-Host "Enter your Telegram Bot Token (from @BotFather)"
while ([string]::IsNullOrWhiteSpace($BotToken)) {
    Write-Host-Color "Error: Bot Token is required." $Red
    $BotToken = Read-Host "Enter your Telegram Bot Token"
}

# WebApp URL
$WebAppUrl = Read-Host "Enter your WebApp URL (e.g., https://your-vibsino-app.com)"
while ([string]::IsNullOrWhiteSpace($WebAppUrl)) {
    Write-Host-Color "Error: WebApp URL is required." $Red
    $WebAppUrl = Read-Host "Enter your WebApp URL"
}

# JWT Secret
$DefaultJwtSecret = [System.Web.Security.Membership]::GeneratePassword(32, 0)
$JwtSecret = Read-Host "Enter JWT Secret (Press Enter to auto-generate)"
if ([string]::IsNullOrWhiteSpace($JwtSecret)) {
    $JwtSecret = $DefaultJwtSecret
    Write-Host-Color "Auto-generated JWT Secret: $JwtSecret" $Yellow
}

# Port
$Port = Read-Host "Enter Backend Port (Default: 3000)"
if ([string]::IsNullOrWhiteSpace($Port)) { $Port = "3000" }

# Backend URL for Frontend
$ViteBackendUrl = Read-Host "Enter Backend URL for Frontend (Default: http://localhost:$Port)"
if ([string]::IsNullOrWhiteSpace($ViteBackendUrl)) { $ViteBackendUrl = "http://localhost:$Port" }

# Writing .env files
Write-Host "`n"
Write-Host-Color "Writing configuration files..." $Yellow

# Backend .env
$BackendEnv = @"
PORT=$Port
DATABASE_URL="file:./dev.db"
JWT_SECRET="$JwtSecret"
JWT_EXPIRES_IN="7d"
NODE_ENV="production"
TELEGRAM_BOT_TOKEN="$BotToken"
WEBAPP_URL="$WebAppUrl"
"@
$BackendEnv | Out-File -FilePath "backend\.env" -Encoding utf8

# Webapp .env
$WebappEnv = "VITE_BACKEND_URL=`"$ViteBackendUrl`""
$WebappEnv | Out-File -FilePath "webapp\.env" -Encoding utf8

Write-Host-Color "Configuration files generated successfully!" $Green

# Installation
Write-Host "`n"
Write-Host-Color "Installing dependencies..." $Yellow
pnpm install

# Database Setup
Write-Host "`n"
Write-Host-Color "Setting up database..." $Yellow
Set-Location backend
pnpm prisma generate
pnpm prisma db push
Set-Location ..

# Build
Write-Host "`n"
Write-Host-Color "Building frontend..." $Yellow
Set-Location webapp
pnpm build
Set-Location ..

Write-Host "`n"
Write-Host-Color "==============================================" $Green
Write-Host-Color "   ✅ Deployment Preparation Complete! ✅   " $Green
Write-Host-Color "==============================================" $Green

Write-Host "`n"
Write-Host-Color "Next Steps:" $Blue
Write-Host-Color "1. Start the backend: cd backend; pnpm start" $Yellow
Write-Host-Color "2. Serve the frontend (from webapp\dist) using your preferred static host." $Yellow
Write-Host-Color "3. Set your bot's webhook to: $WebAppUrl/api/webhook" $Yellow
Write-Host "`n"
Write-Host-Color "To run in development mode, use: 'pnpm dev' in both directories." $Yellow
