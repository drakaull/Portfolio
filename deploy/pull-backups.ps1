<#
.SYNOPSIS
  Copies the site's latest backups from the server to this PC, keeping only the newest $Keep.

.DESCRIPTION
  Run by the Windows Task Scheduler (register it once with -Install): daily at noon, and at log-on
  when a run was missed. Uses Windows' own SSH with the key set up in docs/deployment.md, so it
  never asks for a password. Every run is written to pull-backups.log in the backup folder.

.EXAMPLE
  .\pull-backups.ps1            # one run now
  .\pull-backups.ps1 -Install   # register the scheduled task (once)
#>
param(
  [string]$Server = 'portfolio', # host alias from ~/.ssh/config (docs/deployment.md)
  [string]$RemoteDir = '/var/backups/portfolio',
  [string]$LocalDir = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Sauvegardes portfolio'),
  [int]$Keep = 8,
  [string]$SshConfig, # another ssh config file, for tests only
  [switch]$Install
)
# Not 'Stop': Windows PowerShell would treat any line ssh prints on stderr (even a warning) as a
# failure. Success is judged on ssh's exit code instead.
$ErrorActionPreference = 'Continue'

New-Item -ItemType Directory -Force -Path $LocalDir -ErrorAction Stop | Out-Null
$log = Join-Path $LocalDir 'pull-backups.log'
function Write-Log([string]$message) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $message" | Add-Content -Path $log -Encoding utf8
  Write-Output $message
}

if ($Install) {
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  $triggers = @(
    (New-ScheduledTaskTrigger -Daily -At '12:00'),
    (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME)
  )
  # StartWhenAvailable: a run missed while the PC was off happens as soon as it is back on.
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
  Register-ScheduledTask -TaskName 'Portfolio - backups' -Action $action -Trigger $triggers `
    -Settings $settings -Force | Out-Null
  Write-Log 'Scheduled task "Portfolio - backups" registered: daily at noon, and at log-on.'
  return
}

# BatchMode: fail instead of waiting for a password nobody will type.
$sshOptions = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20')
if ($SshConfig) { $sshOptions = @('-F', $SshConfig) + $sshOptions }

try {
  $output = & ssh @sshOptions $Server "ls -1t $RemoteDir/portfolio-*.tar.gz" 2>&1
  $messages = @($output | Where-Object { $_ -is [Management.Automation.ErrorRecord] })
  if ($LASTEXITCODE -ne 0) { throw "cannot list the server's backups: $($messages -join ' ')" }
  $listing = @($output | Where-Object { $_ -isnot [Management.Automation.ErrorRecord] })
  $newest = @($listing | Select-Object -First $Keep | ForEach-Object { Split-Path -Leaf $_ })

  $copied = 0
  foreach ($name in $newest) {
    $target = Join-Path $LocalDir $name
    if (Test-Path $target) { continue }
    # Downloaded under a temporary name: an interrupted copy never looks like a good backup.
    & scp @sshOptions -q "${Server}:$RemoteDir/$name" "$target.part" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Remove-Item "$target.part" -ErrorAction SilentlyContinue
      throw "download failed: $name"
    }
    Move-Item "$target.part" $target -ErrorAction Stop
    $copied++
  }

  # Rotation: names start with the date; newest first, everything after the first $Keep goes.
  Get-ChildItem -Path $LocalDir -Filter 'portfolio-*.tar.gz' | Sort-Object Name -Descending |
    Select-Object -Skip $Keep | Remove-Item
  $kept = @(Get-ChildItem -Path $LocalDir -Filter 'portfolio-*.tar.gz').Count
  Write-Log "OK: $copied new, $kept kept in $LocalDir"
} catch {
  Write-Log "FAILED: $_"
  exit 1
}
