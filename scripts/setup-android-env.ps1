<#
.SYNOPSIS
  配置青灯 Android 构建所需的环境变量（写入当前用户，永久生效）。

.DESCRIPTION
  Android SDK 放在 D:\enviroment\android-sdk，与项目代码分开，
  这样重装项目或清理 target 都不会动到几个 GB 的 SDK。
  脚本会：
    1. 设置 ANDROID_HOME / ANDROID_SDK_ROOT 指向 SDK 根目录
    2. 自动找出台 NDK 版本并设置 NDK_HOME
    3. 把 platform-tools（adb）与 cmdline-tools\latest\bin（sdkmanager）加进用户 PATH
  只在缺失时追加，不会重复写入，也不会覆盖 PATH 里已有的内容。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\setup-android-env.ps1
  powershell -ExecutionPolicy Bypass -File scripts\setup-android-env.ps1 -SdkPath D:\enviroment\android-sdk
#>
param(
  [string]$SdkPath = "D:\enviroment\android-sdk"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SdkPath)) {
  throw "找不到 Android SDK 目录：$SdkPath。请先装 SDK，或用 -SdkPath 指定实际位置。"
}

if (-not (Test-Path (Join-Path $SdkPath "cmdline-tools\latest\bin\sdkmanager.bat"))) {
  throw "$SdkPath 下缺少 cmdline-tools\latest，sdkmanager 用不了。请重新解压 command line tools。"
}

function Set-UserVariable([string]$Name, [string]$Value) {
  [Environment]::SetEnvironmentVariable($Name, $Value, "User")
  # 让当前会话立刻也能用，省得再开一个终端
  Set-Item -Path "Env:$Name" -Value $Value
  Write-Host ("  {0} = {1}" -f $Name, $Value)
}

Write-Host "写入用户环境变量："
Set-UserVariable "ANDROID_HOME" $SdkPath
Set-UserVariable "ANDROID_SDK_ROOT" $SdkPath

# NDK 目录名就是版本号，直接取现成的，避免写死版本
$ndkRoot = Join-Path $SdkPath "ndk"
if (Test-Path $ndkRoot) {
  $ndk = Get-ChildItem $ndkRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
}
if ($ndk) {
  Set-UserVariable "NDK_HOME" $ndk.FullName
} else {
  Write-Warning "没在 $ndkRoot 找到 NDK，先跳过 NDK_HOME。装好 NDK 后重新跑一次本脚本即可。"
}

$additions = @(
  (Join-Path $SdkPath "platform-tools"),
  (Join-Path $SdkPath "cmdline-tools\latest\bin")
)

$current = [Environment]::GetEnvironmentVariable("Path", "User")
$parts = @($current -split ";" | Where-Object { $_ -ne "" })
$changed = $false

foreach ($dir in $additions) {
  if ($parts -notcontains $dir) {
    $parts += $dir
    $changed = $true
    Write-Host "  PATH += $dir"
  } else {
    Write-Host "  PATH 已包含 $dir"
  }
}

if ($changed) {
  [Environment]::SetEnvironmentVariable("Path", ($parts -join ";"), "User")
  $env:Path = ($env:Path.TrimEnd(";") + ";" + ($additions -join ";"))
  Write-Host "用户 PATH 已更新"
} else {
  Write-Host "用户 PATH 无需改动"
}

Write-Host ""
Write-Host "完成。新开的终端会带上这些变量；已开着的终端需要重启，或手动执行："
Write-Host "  `$env:Path = [Environment]::GetEnvironmentVariable('Path','User')"
