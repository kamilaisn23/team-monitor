#Requires -RunAsAdministrator
param(
    [string]$ResultDirectory = (Join-Path $env:LOCALAPPDATA 'TeamMonitor\docker-setup')
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $ResultDirectory | Out-Null
$resultPath = Join-Path $ResultDirectory 'result.json'
$logPath = Join-Path $ResultDirectory 'install.log'
$setupResult = @{ Status = 'installing'; RestartRequired = $false; LogPath = $logPath }
$setupResult | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding UTF8
try {
    & "$env:SystemRoot\System32\wsl.exe" --install --no-distribution *> $logPath
    $installExitCode = $LASTEXITCODE
    $features = @(
        Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
        Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
    )
    $setupResult.FeatureStates = @($features | ForEach-Object {
        @{ Name = $_.FeatureName; State = [string]$_.State }
    })
    $setupResult.InstallExitCode = $installExitCode
    $logText = (Get-Content -LiteralPath $logPath -Raw).Replace([string][char]0, '')
    $setupResult.RestartRequired = ($installExitCode -eq 3010) -or
        (@($features | Where-Object { $_.State -eq 'EnablePending' }).Count -gt 0) -or
        ($logText -match 'will not be effective until the system is rebooted')
    $setupResult.Status = if ($installExitCode -in @(0, 3010)) { 'installed' } else { 'failed' }
} catch {
    $setupResult.Status = 'failed'
    $setupResult.Error = $_.Exception.Message
    Add-Content -LiteralPath $logPath -Value $_.Exception.Message
} finally {
    $setupResult | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $resultPath -Encoding UTF8
}
# The user chooses when to restart; this script never reboots Windows.
