# Enables Windows Developer Mode (AllowDevelopmentWithoutDevLicense).
#
# Why it is needed: `tauri android build` does not copy the Rust .so into
# gen/android/app/src/main/jniLibs, it creates a symbolic link. Windows only
# allows unprivileged symlink creation when Developer Mode is on, otherwise the
# build fails with "Creation symbolic link is not allowed for this system".
#
# This script must run elevated. Run it from scripts\setup-android-env.ps1 or
# approve the UAC prompt.

$ErrorActionPreference = "Stop"

$key = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"

if (-not (Test-Path $key)) {
  New-Item -Path $key -Force | Out-Null
}

$current = (Get-ItemProperty -Path $key -Name AllowDevelopmentWithoutDevLicense -ErrorAction SilentlyContinue).AllowDevelopmentWithoutDevLicense

if ($current -eq 1) {
  Write-Host "Developer Mode is already on."
  exit 0
}

New-ItemProperty -Path $key -Name AllowDevelopmentWithoutDevLicense -PropertyType DWord -Value 1 -Force | Out-Null

$verify = (Get-ItemProperty -Path $key -Name AllowDevelopmentWithoutDevLicense).AllowDevelopmentWithoutDevLicense
if ($verify -eq 1) {
  Write-Host "Developer Mode enabled. New terminals can create symlinks without elevation."
} else {
  throw "Failed to enable Developer Mode."
}
