# Start the fresh TUBOL ONLYOFFICE workspace

This branch contains a fresh document workspace under `onlyoffice-workspace/`.

## 1. Install dependencies

```bash
npm install
```

## 2. Start the ONLYOFFICE Document Server

```bash
docker compose -f docker-compose.onlyoffice.yml up -d
```

Wait until the Document Server is ready.

## 3. Start TUBOL

```bash
npm run workspace
```

Or start both services with:

```bash
npm run start:workspace
```

The app opens the fresh TUBOL Document Workspace.

## ONLYOFFICE document workspace

- DOCX editor
- XLSX spreadsheet editor
- PPTX presentation editor
- PDF editor
- Local document library
- New DOCX document
- Open/upload documents
- Save edited documents through the ONLYOFFICE callback

ONLYOFFICE is embedded with `DocsAPI.DocEditor`. The integration uses the documented callback flow so the edited document is written back to TUBOL's local document store. See the official ONLYOFFICE documentation for the editor and callback architecture.

## TUBOL PDF workflow

The PDF workspace now works at the **page level**:

- Add multiple PDFs
- Render individual page thumbnails
- Select one or multiple pages
- Drag pages to reorder them
- Rotate pages
- Duplicate pages
- Delete pages
- Continuous PDF preview
- Merge and download
- Optimize/export the current packet
- Original source PDFs remain unchanged

## Local storage model

Documents are stored in Electron's per-user application data directory under `tubol-documents/`, not inside the Git repository. This keeps user documents separate from application code.

The Electron storage service listens on `127.0.0.1:8787`.

The Dockerized ONLYOFFICE server is exposed on `127.0.0.1:8090`.

ONLYOFFICE accesses the Electron storage service through `host.docker.internal:8787`.

For a network/production deployment, configure a real server hostname, HTTPS, authentication and JWT rather than the local development configuration.
