# PDF Workspace — Desktop Build

## Windows

```powershell
npm.cmd install
npm.cmd run dist:win
```

Output: `dist/PDF-Workspace-...Windows-x64.exe` (installer/portable builds depending on target).

## macOS

Run on a Mac:

```bash
npm install
npm run dist:mac
```

Output: `.dmg` and `.zip` in `dist/`.

## Build both automatically

Push this project to a GitHub repository. The included workflow at `.github/workflows/build-desktop.yml` builds Windows and macOS in separate GitHub-hosted runners and uploads both as workflow artifacts.

## App icon

- Windows: `assets/icon.ico`
- macOS: `assets/icon.icns`
- Source SVG: `assets/icon.svg`

Replace the relevant icon files and rebuild.
