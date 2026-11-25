# TUBOL Merger Pro

A browser-only PDF workspace for building document packets. No desktop app, installer, executable, Node.js runtime, or backend server is required.

## Features

- Merge multiple PDFs into one packet.
- Rearrange individual PDF pages with drag-and-drop.
- Select pages to rotate, duplicate, or delete.
- Add an authorization letter with editable bureau addresses.
- Convert documents and images, including WebP to JPG/PNG.
- Compress packets and preview pages.
- Export PDFs and work with files locally in your browser.

## Use the website

Open the published website:

https://doreso999-crypto.github.io/TUBOL-Merger-ProV3/

You can also run the static website locally with any static file server:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Privacy and browser requirements

PDF processing happens in your browser. The app does not upload your documents to an application server. It loads PDF libraries from public CDNs, so an internet connection is required.

Exports use the browser's Save File Picker when supported and otherwise download the file through the browser.