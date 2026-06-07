Add-Type -AssemblyName System.Drawing

$inputPath = "public\company_stamp_official.png"
$outputPath = "public\company_stamp_transparent.png"

if (Test-Path $inputPath) {
    Write-Host "Loading $inputPath..."
    $img = [System.Drawing.Image]::FromFile($inputPath)
    $bmp = New-Object System.Drawing.Bitmap($img)
    
    $width = $bmp.Width
    $height = $bmp.Height
    Write-Host "Image dimensions: $width x $height"
    
    # Create a new transparent bitmap
    $newBmp = New-Object System.Drawing.Bitmap($width, $height)
    
    for ($y = 0; $y -lt $height; $y++) {
        for ($x = 0; $x -lt $width; $x++) {
            $pixel = $bmp.GetPixel($x, $y)
            $r = $pixel.R
            $g = $pixel.G
            $b = $pixel.B
            
            # If the pixel is close to white (brightness threshold)
            # JPEG conversion may cause slight compression noise, so we check if R, G, B are all > 175
            if ($r -gt 175 -and $g -gt 175 -and $b -gt 175) {
                # Set transparent pixel
                $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
            } else {
                # Keep the original pixel (or make the blue ink pop)
                $newBmp.SetPixel($x, $y, $pixel)
            }
        }
    }
    
    $newBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $img.Dispose()
    $bmp.Dispose()
    $newBmp.Dispose()
    Write-Host "Transparent stamp saved to $outputPath."
} else {
    Write-Host "Input file not found."
}
