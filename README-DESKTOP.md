# PDF Workspace Desktop

Electron desktop wrapper for PDF Workspace.

## Requirements
- Node.js 20+ recommended
- npm 10+

## Run in development
```bash
npm install
npm start
```

## Build Windows
```bash
npm install
npm run dist:win
```

This creates a Windows installer and portable `.exe` under `dist/`.

## Build macOS
Run this on a Mac because macOS packaging/signing is best performed on macOS:

```bash
npm install
npm run dist:mac
```

This creates a `.dmg` and `.zip` under `dist/`.

## Desktop behavior
- Native Save dialog is used for PDF exports when running inside Electron.
- The browser version continues to use its existing save/download behavior.
- PDF processing remains client-side in the renderer.
- No server is required.

## Distribution
For a production Mac release, add Apple Developer signing and notarization credentials. For a production Windows release, consider code signing the installer and executable.

## Recent UI updates
- The desktop window can be resized down to compact PowerToys layouts; the sidebar changes to a compact rail and then a horizontal navigation strip at smaller widths.
- Main content stays anchored close to the top navigation and uses the available window width without forcing a wide minimum canvas.
- The dedicated Compress PDF and Extract Pages pages were removed. Packet compression remains available from Merge & Organize.
- Added Authorization Templates with local template storage, consumer-name entry, Washington, DC time-zone date default, bureau selection, automatic bureau-address population, manual editing, PDF export, and Add to Packet.


## App icon

Windows icon: replace `assets/icon.ico`.
macOS icon: replace `assets/icon.icns`.
Then rebuild with `npm.cmd run dist:win` or `npm run dist:mac`.

## UI themes

Open Settings from the top bar. Theme options are Light, Gray, Warm, and High contrast. Selection highlight color is also configurable there.
