<#
Run this script in an Administrator PowerShell prompt to register MySQL as a Windows service
and create a dedicated database user for the project.

Usage (Admin PowerShell):
1. Edit the two variables below: $RootPassword and $AiraAppPassword
2. Run: .\scripts\register-mysql-service.ps1

CAUTION: This script will create a Windows service named 'MySQLAIRA'.
#>

param()

# === CONFIGURE PASSWORDS BELOW ===
$RootPassword = 'ChangeMeRoot!2026'    # <<< set a strong root password here
$AiraAppPassword = 'ChangeMeAira!2026'  # <<< set a strong DB user password here
# =================================

$datadir = Join-Path -Path $env:USERPROFILE -ChildPath 'mysql-data'
$myIniPath = 'C:\ProgramData\MySQL\MySQL Server 8.4\my.ini'
$mysqld = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe'
$svcName = 'MySQLAIRA'

Write-Host "Stopping any running mysqld processes..." -ForegroundColor Cyan
Stop-Process -Name mysqld -ErrorAction SilentlyContinue -Force

Write-Host "Ensuring data directory exists: $datadir" -ForegroundColor Cyan
if(-not (Test-Path $datadir)) { New-Item -ItemType Directory -Path $datadir -Force | Out-Null }

Write-Host "Writing my.ini to $myIniPath" -ForegroundColor Cyan
if(-not (Test-Path (Split-Path $myIniPath))) { New-Item -ItemType Directory -Path (Split-Path $myIniPath) -Force | Out-Null }
$myIni = @"
[mysqld]
basedir="C:/Program Files/MySQL/MySQL Server 8.4"
datadir="$datadir"
port=3306
# default_authentication_plugin=mysql_native_password
sql_mode=STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
"@
Set-Content -Path $myIniPath -Value $myIni -Encoding ASCII -Force

Write-Host "Registering Windows service '$svcName'..." -ForegroundColor Cyan
# Create service (requires Admin privileges)
$bin = "`"$mysqld`" --defaults-file=`"$myIniPath`""
try {
	Write-Host "Creating service via sc.exe..." -ForegroundColor Yellow
	& sc.exe create $svcName "binPath= $bin" "DisplayName= MySQL AIRA" "start= auto"
} catch {
	Write-Host ("Warning: failed to create service (it may already exist): " + $_) -ForegroundColor Yellow
}

Write-Host "Starting service $svcName..." -ForegroundColor Cyan
try {
	Start-Service -Name $svcName -ErrorAction Stop
	Start-Sleep -Seconds 5
} catch {
	Write-Host ("Failed to start service " + $svcName + ": " + $_) -ForegroundColor Red
	Write-Host "You may need to start the service manually or run this script as Administrator." -ForegroundColor Yellow
}

Write-Host "Securing root account and creating application user..." -ForegroundColor Cyan
$mysqlPath = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
$sql = "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$RootPassword'; FLUSH PRIVILEGES; CREATE USER IF NOT EXISTS 'aira_app'@'localhost' IDENTIFIED BY '$AiraAppPassword'; GRANT ALL PRIVILEGES ON aira_dbms.* TO 'aira_app'@'localhost'; FLUSH PRIVILEGES;"
if (Test-Path $mysqlPath) {
	Write-Host "Running SQL to set passwords and create user..." -ForegroundColor Yellow
	try {
		& "$mysqlPath" -u root -h 127.0.0.1 -e $sql
	} catch {
		Write-Host ("Warning: failed to run mysql client: " + $_) -ForegroundColor Yellow
		Write-Host "You may need to run these SQL statements manually once MySQL is accessible." -ForegroundColor Yellow
	}
} else {
	Write-Host "mysql client not found at $mysqlPath — skipping automatic SQL execution." -ForegroundColor Yellow
	Write-Host "Run the following SQL manually when MySQL is running:" -ForegroundColor Yellow
	Write-Host $sql -ForegroundColor White
}

# Attempt to import the schema file if present
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir
$schemaPath = Join-Path $projectRoot 'database\aira_dbms_schema.sql'
if (Test-Path $schemaPath) {
	if (Test-Path $mysqlPath) {
		Write-Host "Importing schema from $schemaPath using root credentials..." -ForegroundColor Yellow
		try {
			& "$mysqlPath" -u root "--password=$RootPassword" -e "source \"$schemaPath\""
			Write-Host "Schema import completed (or attempted)." -ForegroundColor Green
		} catch {
			Write-Host ("Warning: schema import failed: " + $_) -ForegroundColor Yellow
			Write-Host ("You can import manually using the mysql client to run the schema file: " + $schemaPath) -ForegroundColor White
		}
	} else {
		Write-Host "Cannot import schema automatically because mysql client is missing." -ForegroundColor Yellow
	}
} else {
	Write-Host "Schema file not found at $schemaPath — skipping import." -ForegroundColor Yellow
}

Write-Host "Setting service startup type to Automatic..." -ForegroundColor Cyan
Set-Service -Name $svcName -StartupType Automatic

Write-Host "Done. MySQL service '$svcName' should be running." -ForegroundColor Green
Write-Host "Root password: $RootPassword" -ForegroundColor Yellow
Write-Host "aira_app password: $AiraAppPassword" -ForegroundColor Yellow
Write-Host "REMEMBER: Do NOT commit passwords to version control. Update backend/.env manually with the aira_app credentials and keep .env ignored." -ForegroundColor Red
