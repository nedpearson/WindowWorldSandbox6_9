# Create-Shortcuts.ps1
# Creates desktop shortcuts for Window World Assistant

$WshShell = New-Object -comObject WScript.Shell
$target   = 'C:\dev\github\business\WindowWorldAssistant\launch.bat'
$workDir  = 'C:\dev\github\business\WindowWorldAssistant'
$desc     = 'Window World Assistant — Launch API + Web UI'
$icon     = '%SystemRoot%\System32\shell32.dll,135'

# ── New shortcut on Desktop ───────────────────────────────
$desktop = [System.Environment]::GetFolderPath('Desktop')
$newPath = Join-Path $desktop 'Window World Assistant.lnk'
$sc = $WshShell.CreateShortcut($newPath)
$sc.TargetPath       = $target
$sc.WorkingDirectory = $workDir
$sc.WindowStyle      = 1
$sc.Description      = $desc
$sc.IconLocation     = $icon
$sc.Save()
Write-Host "Created: $newPath"

# ── Update existing AI Programs Shortcut if present ───────
$existing = 'C:\Users\nedpe\Desktop\AI Programs Shortcut.lnk'
if (Test-Path $existing) {
    $sc2 = $WshShell.CreateShortcut($existing)
    $sc2.TargetPath       = $target
    $sc2.WorkingDirectory = $workDir
    $sc2.Description      = $desc
    $sc2.IconLocation     = $icon
    $sc2.Save()
    Write-Host "Updated: $existing"
} else {
    Write-Host "Not found (skipped): $existing"
}

Write-Host "Done."
