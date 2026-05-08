$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $projectRoot 'public'
$buildDir = Join-Path $projectRoot 'build-assets'

New-Item -ItemType Directory -Force -Path $publicDir | Out-Null
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

$pngPath = Join-Path $publicDir 'app-icon.png'
$icoPath = Join-Path $buildDir 'icon.ico'

$size = 256
$bitmap = New-Object System.Drawing.Bitmap $size, $size
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.Clear([System.Drawing.Color]::Transparent)

$outerRect = New-Object System.Drawing.RectangleF 10, 10, 236, 236
$innerRect = New-Object System.Drawing.RectangleF 30, 30, 196, 196
$bookRect = New-Object System.Drawing.RectangleF 58, 54, 140, 148
$tabRect = New-Object System.Drawing.RectangleF 78, 42, 64, 24
$nodeRect = New-Object System.Drawing.RectangleF 150, 138, 48, 48

function New-RoundedRectanglePath {
  param(
    [System.Drawing.RectangleF]$Rect,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  $path.AddArc($Rect.X, $Rect.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Rect.X, $Rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

$backgroundPath = New-RoundedRectanglePath -Rect $outerRect -Radius 44
$innerPath = New-RoundedRectanglePath -Rect $innerRect -Radius 34
$bookPath = New-RoundedRectanglePath -Rect $bookRect -Radius 24
$tabPath = New-RoundedRectanglePath -Rect $tabRect -Radius 12
$nodePath = New-RoundedRectanglePath -Rect $nodeRect -Radius 18

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point 20, 20),
  (New-Object System.Drawing.Point 236, 236),
  [System.Drawing.Color]::FromArgb(255, 14, 116, 144),
  [System.Drawing.Color]::FromArgb(255, 16, 185, 129)
)
$bgBlend = New-Object System.Drawing.Drawing2D.ColorBlend
$bgBlend.Colors = @(
  [System.Drawing.Color]::FromArgb(255, 15, 23, 42),
  [System.Drawing.Color]::FromArgb(255, 13, 87, 124),
  [System.Drawing.Color]::FromArgb(255, 16, 185, 129)
)
$bgBlend.Positions = @(0.0, 0.55, 1.0)
$bgBrush.InterpolationColors = $bgBlend

$innerBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point 40, 40),
  (New-Object System.Drawing.Point 216, 216),
  [System.Drawing.Color]::FromArgb(255, 255, 255, 255),
  [System.Drawing.Color]::FromArgb(255, 226, 232, 240)
)

$bookBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point 58, 54),
  (New-Object System.Drawing.Point 198, 202),
  [System.Drawing.Color]::FromArgb(255, 248, 250, 252),
  [System.Drawing.Color]::FromArgb(255, 226, 232, 240)
)

$tabBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 14, 165, 233))
$nodeBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point 150, 138),
  (New-Object System.Drawing.Point 198, 186),
  [System.Drawing.Color]::FromArgb(255, 14, 165, 233),
  [System.Drawing.Color]::FromArgb(255, 16, 185, 129)
)

$shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 15, 23, 42))
$strokePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 255, 255, 255), 3)
$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 71, 85, 105), 8)
$linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$connectorPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 14, 165, 233), 7)
$connectorPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$connectorPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

$graphics.FillPath($bgBrush, $backgroundPath)
$graphics.FillEllipse($shadowBrush, 34, 28, 162, 162)
$graphics.FillPath($innerBrush, $innerPath)
$graphics.DrawPath($strokePen, $innerPath)
$graphics.FillPath($bookBrush, $bookPath)
$graphics.FillPath($tabBrush, $tabPath)
$graphics.FillPath($nodeBrush, $nodePath)

$graphics.DrawLine($linePen, 82, 94, 170, 94)
$graphics.DrawLine($linePen, 82, 124, 152, 124)
$graphics.DrawLine($linePen, 82, 154, 138, 154)
$graphics.DrawLine($connectorPen, 160, 162, 134, 162)
$graphics.DrawLine($connectorPen, 160, 162, 160, 136)
$graphics.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), 162, 150, 24, 24)
$graphics.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), 148, 126, 18, 18)
$graphics.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), 124, 154, 18, 18)

$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$stream = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
$writer = New-Object System.IO.BinaryWriter($stream)

$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$pngBytes.Length)
$writer.Write([UInt32]22)
$writer.Write($pngBytes)
$writer.Flush()
$writer.Close()
$stream.Close()

$connectorPen.Dispose()
$linePen.Dispose()
$strokePen.Dispose()
$shadowBrush.Dispose()
$nodeBrush.Dispose()
$tabBrush.Dispose()
$bookBrush.Dispose()
$innerBrush.Dispose()
$bgBrush.Dispose()
$backgroundPath.Dispose()
$innerPath.Dispose()
$bookPath.Dispose()
$tabPath.Dispose()
$nodePath.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
