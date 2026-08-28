# TUBOL Document Workspace — ONLYOFFICE Edition

A fresh TUBOL workspace that combines the existing PDF workflow with ONLYOFFICE Docs.

## Architecture

- `onlyoffice-main.js` starts an Electron window and a local document-storage HTTP server.
- `onlyoffice-workspace/` is the fresh UI.
- ONLYOFFICE Docs runs separately, recommended through Docker.
- Documents are stored in the Electron user-data directory.

ONLYOFFICE Docs provides the Document, Spreadsheet, Presentation, PDF and form editors. The integration uses `DocsAPI.DocEditor` plus a callback endpoint for saved documents.

## Start

1. Install dependencies:

```bash
npm install
```

2. Start ONLYOFFICE Docs:

```bash
docker compose -f docker-compose.onlyoffice.yml up -d
```

3. Start the fresh workspace:

```bash
npm run start:editor
```

Defaults:

- TUBOL workspace: `http://127.0.0.1:8787`
- ONLYOFFICE Docs: `http://127.0.0.1:8090`

If ONLYOFFICE is hosted elsewhere, set `TUBOL_ONLYOFFICE_URL` before starting TUBOL.

## Included TUBOL functionality

- Merge PDF files.
- Reorder PDF files.
- Delete PDF entries.
- Rotate controls for the packet workflow.
- Download a merged PDF.
- Create a DOCX document directly in the workspace.
- Open DOCX, XLSX, PPTX and PDF files in ONLYOFFICE.
- Save edited documents back into the local TUBOL document library.
- Delete documents from the local library.

## Integration detail

ONLYOFFICE requires an absolute document URL and callback URL. The local server exposes `/api/documents/:id/content` and `/api/onlyoffice/callback/:id` for this purpose.

The Docker container reaches the Electron host through `host.docker.internal`, while the browser uses `127.0.0.1`.

For production or network use, enable JWT on ONLYOFFICE and place the application behind HTTPS. Do not expose the local document endpoints directly to the public internet.
