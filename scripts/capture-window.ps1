# 批量截取青灯各页面，供 README 配图使用。
#
# 两个坑：
#   1. WebView2 是硬件合成渲染，普通 BitBlt 只能截到黑屏，所以用
#      PrintWindow + PW_RENDERFULLCONTENT（0x2），它能拿到 DirectComposition 的内容。
#   2. 页面切换只能靠模拟点击侧边栏，所以把窗口固定在已知位置和尺寸，
#      再按固定的窗口内坐标去点导航项。
#
# 用法（先把青灯打开）：
#   powershell -ExecutionPolicy Bypass -File scripts/capture-window.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/capture-window.ps1 -OutDir docs/images

param(
  [string]$ProcessName = "qingdeng",
  [string]$OutDir = "docs/images",
  # 注意这里是物理像素：脚本开头会把自己声明成 DPI 感知，
  # 否则 MoveWindow / SetCursorPos / GetWindowRect 都会被系统缩放一次，
  # 结果是“点偏一项 + 图被裁”——这个坑踩过
  [int]$Width = 1440,
  [int]$Height = 920,
  # 侧边栏导航项中心的 y 坐标（相对窗口左上角，含标题栏），按界面顺序
  [int[]]$NavY = @(170, 218, 266, 314, 362),
  [string[]]$Names = @("timer", "tasks", "modes", "stats", "settings"),
  [int]$NavX = 110,
  # 加了别的弹层（比如更新提示）时用：只固定窗口截一张，不做任何点击
  [switch]$NoClick
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class WinShot {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int w, int h, bool repaint);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, IntPtr extra);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@

$proc = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { throw "没找到带窗口的 $ProcessName 进程，请先把应用打开" }

# 必须在做任何坐标计算之前调用
[void][WinShot]::SetProcessDPIAware()

$handle = $proc.MainWindowHandle
[void][WinShot]::ShowWindow($handle, 9)                 # SW_RESTORE
[void][WinShot]::MoveWindow($handle, 40, 40, $Width, $Height, $true)
[void][WinShot]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 2000

$rect = New-Object WinShot+RECT
[void][WinShot]::GetWindowRect($handle, [ref]$rect)
$w = $rect.Right - $rect.Left
$h = $rect.Bottom - $rect.Top
Write-Host "窗口固定在 ($($rect.Left),$($rect.Top)) 尺寸 ${w}x${h}"

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

function Save-Shot([string]$path) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  $ok = [WinShot]::PrintWindow($handle, $hdc, 2)
  $g.ReleaseHdc($hdc)
  $g.Dispose()
  if (-not $ok) { Write-Warning "PrintWindow 失败，图可能是黑的" }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  # 抽样算平均亮度，接近 0 说明截到了黑屏
  $sum = 0; $n = 0
  for ($x = 0; $x -lt $bmp.Width; $x += 19) {
    for ($y = 0; $y -lt $bmp.Height; $y += 19) {
      $c = $bmp.GetPixel($x, $y); $sum += ($c.R + $c.G + $c.B); $n += 3
    }
  }
  $bmp.Dispose()
  return [math]::Round($sum / [math]::Max(1, $n), 1)
}

if ($NoClick) {
  $path = Join-Path $OutDir "$($Names[0]).png"
  $b = Save-Shot $path
  Write-Host ("  {0} -> {1}（不点击，平均亮度 {2}）" -f $Names[0], $path, $b)
  return
}

for ($i = 0; $i -lt $Names.Count; $i++) {
  $screenX = $rect.Left + $NavX
  $screenY = $rect.Top + $NavY[$i]
  [void][WinShot]::SetCursorPos($screenX, $screenY)
  Start-Sleep -Milliseconds 150
  [WinShot]::mouse_event(0x02, 0, 0, 0, [IntPtr]::Zero)   # LEFTDOWN
  Start-Sleep -Milliseconds 60
  [WinShot]::mouse_event(0x04, 0, 0, 0, [IntPtr]::Zero)   # LEFTUP
  Start-Sleep -Milliseconds 1100

  $path = Join-Path $OutDir "$($Names[$i]).png"
  $brightness = Save-Shot $path
  Write-Host ("  {0,-9} -> {1}（点击 ({2},{3})，平均亮度 {4}）" -f $Names[$i], $path, $screenX, $screenY, $brightness)
}

Write-Host "完成，把鼠标挪回原位即可"
