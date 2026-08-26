# TUBOL Merger Pro — GitHub Builds

## 1. Put the project on GitHub

Create a new repository and upload all files in this folder.

Make sure this file exists:

`assets/POOP.PNG`

A placeholder is included. Replace it with your actual `POOP.PNG` before publishing.

## 2. Run the builds

Open **GitHub → Actions → Build TUBOL Merger Pro → Run workflow**.

The workflow uses native GitHub runners:

- Windows: x64 installer + portable EXE
- macOS: Intel + Apple Silicon DMG/ZIP

## 3. Download the results

After the workflow finishes, open the workflow run and download the artifacts:

- `TUBOL-Merger-Pro-Windows-x64`
- `TUBOL-Merger-Pro-macOS`

## 4. Build from a release tag

You can also create a tag such as `v1.0.0` and push it. The workflow runs automatically for `v*` tags.

## Important macOS note

The workflow builds unsigned macOS artifacts. For public distribution, Apple Developer signing and notarization should be added later.
