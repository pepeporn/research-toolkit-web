# Structure Viewer

Static, single-structure viewer for Research Toolkit share URLs. XYZ data is compressed and stored only in the URL fragment (`#v=1&data=...`); it is not sent to a server by the viewer.

## Local check

Open `index.html` through the Research Toolkit Local Helper, or serve the repository with any static HTTP server. A URL without share data intentionally shows an error.

## Static hosting and GitHub Pages

Publish the complete `web/structure-viewer/` directory, including `vendor/`, without changing its internal layout. For GitHub Pages, copy this directory into the published branch/folder, then set the resulting public directory URL in Toolkit's **Share structure as Web URL** dialog. Relative paths allow deployment at either `/structure-viewer/` or a repository subdirectory such as `/research-toolkit/web/structure-viewer/`.

## URL format

`https://example.org/structure-viewer/#v=1&data=<codec>.<base64url>`

The payload schema is `structure-share/1`. Modern browsers use deflate compression; a plain UTF-8 fallback is retained for browsers without `CompressionStream`.

## Browsers

Current Chrome, Edge, Firefox, and Safari on Windows, macOS, iOS, and Android are supported. Mouse/touch rotation and wheel/pinch zoom are provided by the bundled 3Dmol.js viewer.

## Limits

- One XYZ structure per URL.
- No editing, server storage, analytics, or backend is used.
- Very large structures can exceed URL limits in messaging apps or browsers. Toolkit warns at 8,000 characters.
- A `localhost` or `file:` URL works only on the computer that generated it. Configure the deployed public viewer URL before sharing to another device.
