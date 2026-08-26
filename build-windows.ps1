$ErrorActionPreference = 'Stop'
Write-Host 'Installing dependencies...'
npm install
Write-Host 'Building PDF Workspace for Windows...'
npm run dist:win
Write-Host 'Done. Check the dist folder.'
