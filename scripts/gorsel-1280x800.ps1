# Mağaza ekran görüntülerini 1280x800 tuvale ortalar.
# Kullanım: powershell -ExecutionPolicy Bypass -File scripts\gorsel-1280x800.ps1
# Girdi: store\ham\*.png|*.jpg  Çıktı: store\ekran\*-1280x800.png
param(
    [string]$Kaynak = "store\ham",
    [string]$Hedef = "store\ekran"
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $Kaynak)) {
    throw "Girdi klasörü yok: $Kaynak. Önce ekran görüntülerini buraya koyun."
}

New-Item -ItemType Directory -Force -Path $Hedef | Out-Null

$dosyalar = Get-ChildItem -LiteralPath $Kaynak -File | Where-Object {
    $_.Extension -match '^\.(png|jpe?g)$'
}

if (-not $dosyalar -or $dosyalar.Count -eq 0) {
    throw "Girdi klasöründe PNG/JPEG bulunamadı: $Kaynak"
}

$genislik = 1280
$yukseklik = 800

foreach ($dosya in $dosyalar) {
    $img = [System.Drawing.Image]::FromFile($dosya.FullName)
    try {
        $bmp = New-Object System.Drawing.Bitmap $genislik, $yukseklik
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
            $g.Clear([System.Drawing.Color]::FromArgb(15, 15, 15))
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

            $olcek = [Math]::Min($genislik / [double]$img.Width, $yukseklik / [double]$img.Height)
            $w = [int][Math]::Round($img.Width * $olcek)
            $h = [int][Math]::Round($img.Height * $olcek)
            $x = [int][Math]::Floor(($genislik - $w) / 2)
            $y = [int][Math]::Floor(($yukseklik - $h) / 2)

            $g.DrawImage($img, $x, $y, $w, $h)

            $hedefDosya = Join-Path $Hedef ($dosya.BaseName + "-1280x800.png")
            $bmp.Save($hedefDosya, [System.Drawing.Imaging.ImageFormat]::Png)
            Write-Host "OK  $($dosya.Name) -> $hedefDosya"
        }
        finally {
            $g.Dispose()
            $bmp.Dispose()
        }
    }
    finally {
        $img.Dispose()
    }
}

Write-Host "Bitti: $Hedef"
