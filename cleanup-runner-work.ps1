# cleanup-runner-work.ps1
param(
  [int]$Days = 7,
  [switch]$WhatIf  # gebruik -WhatIf voor dry-run
)

$workDir = "C:\Users\projo\royal-equips-orchestrator\actions-runner\_work"
if (!(Test-Path $workDir)) { Write-Host "Work folder not found: $workDir"; exit 0 }

$cutoff = (Get-Date).AddDays(-$Days)
$oldItems = Get-ChildItem $workDir -Recurse -Force |
  Where-Object { $_.LastWriteTime -lt $cutoff }

Write-Host ("Cleaning items older than {0} days (before {1}) in {2}" -f $Days, $cutoff, $workDir)

if ($WhatIf) {
  $oldItems | Select-Object FullName, LastWriteTime | Format-Table -Auto
} else {
  $oldItems | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "Cleanup complete ✅"
}
