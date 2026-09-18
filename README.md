# Structure Viewer

Static, single-structure viewer for Research Toolkit share URLs. XYZ data is compressed and stored only in the URL fragment (`#v=1&data=...`); it is not sent to a server by the viewer.

## Local check

Open `index.html` through the Research Toolkit Local Helper, or serve the repository with any static HTTP server. A URL without share data intentionally shows an error.

## Public viewer

The default cross-device viewer is:

`https://pepeporn.github.io/research-toolkit-web/`

The complete `research-toolkit/web/structure-viewer/` directory is the only source of truth. Do not edit matching files directly in `research-toolkit-web`; publish them with the synchronization script below.

## Publish workflow

1. Implement and test changes in the private `research-toolkit` repository.
2. Run all related tests before touching the public repository:

   ```powershell
   node tests/structure_share.test.js
   py -m unittest tests.test_structure_viewer_sync
   ```

3. Preview the exact allowlisted copy operation. This does not write files:

   ```powershell
   .\scripts\sync_structure_viewer_to_public.ps1 -DryRun
   ```

4. Synchronize the allowlisted Viewer files:

   ```powershell
   .\scripts\sync_structure_viewer_to_public.ps1
   ```

5. Review the public repository before committing:

   ```powershell
   git -C ..\research-toolkit-web status --short
   git -C ..\research-toolkit-web diff --
   ```

6. Commit and push from `research-toolkit-web` only after the diff contains the expected generated Viewer changes. Then open the GitHub Pages URL with a real `#v=1&data=...` payload and verify rendering, desktop resize, fixed mobile sizing, labels, measurements, reset, XYZ display, and XYZ copy.

The sync script validates the source, destination Git repository, and expected GitHub remote. It copies only its explicit file allowlist, never pushes, never recursively deletes the destination, and never changes `.git/`. Retired public files must be added explicitly to the script's safe retired-file list.

## URL format

`https://pepeporn.github.io/research-toolkit-web/#v=1&data=<codec>.<base64url>`

The payload schema is `structure-share/1`. Modern browsers use deflate compression; a plain UTF-8 fallback is retained for browsers without `CompressionStream`.

## Browsers

Current Chrome, Edge, Firefox, and Safari on Windows, macOS, iOS, and Android are supported. Mouse/touch rotation and wheel/pinch zoom are provided by the bundled 3Dmol.js viewer.

## Limits

- One XYZ structure per URL.
- No editing, server storage, analytics, or backend is used.
- Very large structures can exceed URL limits in messaging apps or browsers. Toolkit warns at 8,000 characters.
- A `localhost` or `file:` URL works only on the computer that generated it. The Toolkit defaults new links to the public GitHub Pages viewer; the share dialog still permits an intentional custom deployment URL.
