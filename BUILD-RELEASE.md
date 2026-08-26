# PDF Workspace Desktop Release Builds

## Windows
On Windows:

```powershell
npm.cmd install
npm.cmd run dist:win
```

Artifacts are written to `dist/`, including the NSIS installer and portable EXE.

## macOS
On macOS:

```bash
npm install
npm run dist:mac
```

Artifacts are written to `dist/`, including the DMG and ZIP. macOS distribution outside your own Mac normally requires Apple signing/notarization.

## Build both from GitHub
Push this project to GitHub. The included workflow at `.github/workflows/build-desktop.yml` builds Windows on `windows-latest` and macOS on `macos-latest`. Run it manually from Actions or create a `v1.0.0`-style tag.

## Important
macOS does not use `.exe`. The native macOS outputs are `.app` packaged as `.dmg` and `.zip`.

## App icons
Windows: `assets/icon.ico`
macOS: `assets/icon.icns`
PNG/source references: `assets/icon.png`, `assets/icon.svg`
