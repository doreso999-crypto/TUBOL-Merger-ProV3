# Start the fresh TUBOL ONLYOFFICE workspace

This branch contains a fresh document workspace under `onlyoffice-workspace/`.

## 1. Install dependencies

```bash
npm install
```

## 2. Start ONLYOFFICE Docs

```bash
docker compose -f docker-compose.onlyoffice.yml up -d
```

Wait for the Document Server container to finish starting.

## 3. Start TUBOL

```bash
npx electron onlyoffice-main.js
```

The app opens the fresh TUBOL Document Workspace.

## What is included

### ONLYOFFICE

- DOCX editor
- XLSX spreadsheet editor
- PPTX presentation editor
- PDF editor
- Local document library
- New DOCX document
- Open/upload document
- Save edited documents through the ONLYOFFICE callback

### TUBOL PDF workflow

- Add multiple PDFs
- Reorder PDF files
- Delete files from the packet
- Merge and download

## Network model

The Electron app listens on `127.0.0.1:8787`.

The Dockerized ONLYOFFICE server is exposed on `127.0.0.1:8090`.

ONLYOFFICE accesses the Electron storage service through `host.docker.internal:8787`.

For a network/production deployment, configure a real server hostname, HTTPS and JWT rather than the local development configuration.
