# PDF Workspace

A local-first browser application for building document packets:

- Merge multiple PDFs into one packet.
- Rearrange individual PDF pages with drag-and-drop.
- Select pages to rotate, duplicate, or delete.
- Create a polished letter in a Google Docs-style editor.
- Convert the letter into PDF and insert it into the packet.
- Extract selected page ranges into a new PDF.
- Create an optimized copy of a PDF using browser-side PDF serialization.
- Export/import a lightweight project file containing the letter content.

## Run

The app is designed to run as static files. For best browser compatibility, serve the folder with any local static web server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Important note

The current implementation uses `pdf-lib` and `html2pdf.js` from public CDNs. The app itself does not upload user PDFs to a server, but the browser needs internet access to load those libraries on first page load. For a fully offline build, vendor those library files locally.
