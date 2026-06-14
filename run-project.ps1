# PowerShell double-click script to run the AIRA project (backend)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Check for Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not found. Install Node.js v18+ from https://nodejs.org" -ForegroundColor Yellow
    pause
    exit 1
}

# Copy .env sample if missing
if (-not (Test-Path "$scriptDir\backend\.env")) {
    if (Test-Path "$scriptDir\backend\.env.sample") {
        Copy-Item "$scriptDir\backend\.env.sample" "$scriptDir\backend\.env"
        Write-Host "Created backend\.env from sample."
    }
}

# Install deps if needed
if (-not (Test-Path "$scriptDir\backend\node_modules")) {
    Write-Host "Installing backend dependencies..."
    Push-Location "$scriptDir\backend"
    npm install
    Pop-Location
}

# Start backend in a new PowerShell window (dev)
$backendCmd = "cd '$scriptDir\backend'; npm run dev"
Start-Process -FilePath powershell -ArgumentList '-NoExit','-Command',$backendCmd -WindowStyle Normal

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"
Write-Host "Launched backend. Check the new PowerShell window for logs." -ForegroundColor Green
