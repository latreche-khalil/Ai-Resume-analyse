# Script to check if all lucide-react icons used in the project exist

Write-Host "🔍 Checking lucide-react icons..." -ForegroundColor Cyan
Write-Host ""

$iconsPath = "node_modules\lucide-react\dist\esm\icons"
$missing = @()
$found = @()

# Get all TypeScript/TSX files
$files = Get-ChildItem -Recurse -Include *.tsx,*.ts -Exclude node_modules,.next

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Find lucide-react imports
    if ($content -match "from\s+['\"]lucide-react['\"]") {
        $imports = $content -match "import\s+\{([^}]+)\}\s+from\s+['\"]lucide-react['\"]"
        if ($matches) {
            $iconList = $matches[1] -split ',' | ForEach-Object { $_.Trim() }
            
            foreach ($icon in $iconList) {
                if ($icon) {
                    # Convert PascalCase to kebab-case
                    $kebab = $icon -creplace '([A-Z])', '-$1' -replace '^-', '' | ForEach-Object { $_.ToLower() }
                    $iconFile = "$iconsPath\$kebab.mjs"
                    
                    if (Test-Path $iconFile) {
                        if ($icon -notin $found) {
                            $found += $icon
                        }
                    } else {
                        if ($icon -notin $missing) {
                            $missing += $icon
                            Write-Host "❌ Missing: $icon (looking for $kebab.mjs) in $($file.Name)" -ForegroundColor Red
                        }
                    }
                }
            }
        }
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Yellow
Write-Host "  ✅ Found: $($found.Count) icons" -ForegroundColor Green
Write-Host "  ❌ Missing: $($missing.Count) icons" -ForegroundColor Red

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing icons:" -ForegroundColor Red
    $missing | Sort-Object -Unique | ForEach-Object { Write-Host "  - $_" }
    exit 1
} else {
    Write-Host ""
    Write-Host "✅ All icons are available!" -ForegroundColor Green
    exit 0
}
