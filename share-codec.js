(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StructureShare = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  const SCHEMA = "structure-share/1";
  const WARNING_LENGTH = 8000;
  const STORAGE_KEY = "researchToolkit.structureShare.viewerBaseUrl.v1";

  function bytesToBase64Url(bytes) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    const encoded = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes(value) {
    const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");
    const binary = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  async function transformBytes(bytes, TransformClass, format) {
    const stream = new Blob([bytes]).stream().pipeThrough(new TransformClass(format));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function encodePayload(payload) {
    validatePayload(payload);
    const source = new TextEncoder().encode(JSON.stringify(payload));
    if (typeof CompressionStream === "function") {
      try {
        return `d.${bytesToBase64Url(await transformBytes(source, CompressionStream, "deflate"))}`;
      } catch (_error) {
        // A plain UTF-8 fallback keeps sharing available in older browsers.
      }
    }
    return `u.${bytesToBase64Url(source)}`;
  }

  async function decodePayload(encoded) {
    const value = String(encoded || "");
    const separator = value.indexOf(".");
    if (separator < 1) throw new Error("Unsupported structure share encoding.");
    const codec = value.slice(0, separator);
    let bytes = base64UrlToBytes(value.slice(separator + 1));
    if (codec === "d") {
      if (typeof DecompressionStream !== "function") throw new Error("This browser cannot decompress the shared structure URL.");
      bytes = await transformBytes(bytes, DecompressionStream, "deflate");
    } else if (codec !== "u") {
      throw new Error("Unsupported structure share codec.");
    }
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    validatePayload(payload);
    return payload;
  }

  function normalizeXyz(xyz, title) {
    const lines = String(xyz || "").replace(/\r/g, "").split("\n").filter((line) => line.trim());
    if (!lines.length) throw new Error("XYZ structure is empty.");
    const declared = Number.parseInt(lines[0].trim(), 10);
    if (Number.isInteger(declared) && declared > 0 && lines.length >= declared + 2) {
      return lines.slice(0, declared + 2).join("\n");
    }
    const coordinates = lines.filter((line) => /^\s*[A-Z][a-z]?\s+[-+.\dEe]+\s+[-+.\dEe]+\s+[-+.\dEe]+/.test(line));
    if (!coordinates.length) throw new Error("No XYZ coordinate rows were found.");
    return `${coordinates.length}\n${title || "Shared structure"}\n${coordinates.join("\n")}`;
  }

  function createPayload(options) {
    const title = String(options?.title || "Shared structure").trim() || "Shared structure";
    return {
      schema: SCHEMA,
      title,
      structure: {
        name: String(options?.name || title),
        format: "xyz",
        xyz: normalizeXyz(options?.xyz, title),
        charge: Number.isFinite(Number(options?.charge)) ? Number(options.charge) : 0,
        multiplicity: Math.max(1, Number.parseInt(options?.multiplicity, 10) || 1),
      },
      view: {
        style: ["stick", "ball-stick", "spacefill"].includes(options?.style) ? options.style : "ball-stick",
        atomLabels: Boolean(options?.atomLabels),
      },
    };
  }

  function validatePayload(payload) {
    if (!payload || payload.schema !== SCHEMA) throw new Error("Unsupported structure share schema.");
    if (!payload.structure || payload.structure.format !== "xyz" || !String(payload.structure.xyz || "").trim()) {
      throw new Error("The shared structure does not contain XYZ data.");
    }
    if (String(payload.structure.xyz).length > 2_000_000) throw new Error("The shared XYZ structure is too large.");
    return payload;
  }

  function payloadFromHash(hash) {
    const parameters = new URLSearchParams(String(hash || "").replace(/^#/, ""));
    if (parameters.get("v") !== "1" || !parameters.get("data")) throw new Error("No supported structure was found in this URL.");
    return decodePayload(parameters.get("data"));
  }

  async function buildUrl(payload, baseUrl) {
    const url = new URL(String(baseUrl || ""), root?.location?.href || "http://localhost/");
    url.hash = `v=1&data=${await encodePayload(payload)}`;
    return url.href;
  }

  function defaultViewerUrl() {
    try {
      const saved = root?.localStorage?.getItem(STORAGE_KEY);
      if (saved) return saved;
    } catch (_error) {
      // Storage is optional.
    }
    return new URL("../../web/structure-viewer/", root.location.href).href;
  }

  function describeUrl(url) {
    const value = String(url || "");
    const localOnly = /^(file:|https?:\/\/(localhost|127\.0\.0\.1)(:|\/))/i.test(value);
    if (value.length > WARNING_LENGTH) {
      return { warning: true, reason: "length", text: `URL is ${value.length.toLocaleString()} characters and may be too long for some apps.` };
    }
    if (localOnly) {
      return { warning: true, reason: "local", text: `URL length: ${value.length.toLocaleString()}. This local address works only on this computer; set a public viewer URL for sharing to another device.` };
    }
    return { warning: false, reason: "none", text: `URL length: ${value.length.toLocaleString()}. Structure data remains in the URL fragment and is not sent to a server.` };
  }

  async function copyText(text, input) {
    try {
      await root.navigator.clipboard.writeText(text);
      return true;
    } catch (_error) {
      if (!input || !root.document) return false;
      input.focus();
      input.select();
      return root.document.execCommand("copy");
    }
  }

  function injectDialogStyle() {
    if (!root.document || root.document.getElementById("structureShareDialogStyle")) return;
    const style = root.document.createElement("style");
    style.id = "structureShareDialogStyle";
    style.textContent = `.structure-share-dialog{width:min(680px,calc(100vw - 24px));border:0;padding:0;color:#17202a}.structure-share-dialog::backdrop{background:rgba(15,23,42,.48)}.structure-share-dialog form{padding:18px;display:grid;gap:12px}.structure-share-dialog header{display:flex;align-items:center;justify-content:space-between;gap:12px}.structure-share-dialog h2{margin:0;font-size:1.1rem}.structure-share-dialog label{display:grid;gap:5px;font-weight:700;font-size:.82rem}.structure-share-dialog input,.structure-share-dialog textarea{box-sizing:border-box;width:100%;border:1px solid #b8c8c7;border-radius:6px;padding:9px;font:inherit}.structure-share-dialog textarea{min-height:94px;resize:vertical;font-family:ui-monospace,monospace;font-size:.76rem}.structure-share-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.structure-share-message{margin:0;font-size:.8rem;color:#52616b}.structure-share-message.warn{color:#a04800}.structure-share-dialog button{min-height:34px;padding:5px 12px}`;
    root.document.head.appendChild(style);
  }

  async function openDialog(options) {
    if (!root.document) throw new Error("Sharing UI requires a browser.");
    injectDialogStyle();
    const payload = createPayload(options);
    root.document.getElementById("structureShareDialog")?.remove();
    const dialog = root.document.createElement("dialog");
    dialog.id = "structureShareDialog";
    dialog.className = "structure-share-dialog";
    dialog.innerHTML = `<form method="dialog"><header><h2>Share structure as Web URL</h2><button value="close" type="submit" class="secondary" aria-label="Close">Close</button></header><label>Viewer base URL<input data-share-base type="url" spellcheck="false"></label><label>Share URL<textarea data-share-url readonly spellcheck="false"></textarea></label><p class="structure-share-message" data-share-message>Generating URL...</p><div class="structure-share-actions"><button type="button" class="secondary" data-share-regenerate>Update URL</button><button type="button" data-share-copy disabled>Copy URL</button></div></form>`;
    root.document.body.appendChild(dialog);
    const baseInput = dialog.querySelector("[data-share-base]");
    const urlOutput = dialog.querySelector("[data-share-url]");
    const message = dialog.querySelector("[data-share-message]");
    const copyButton = dialog.querySelector("[data-share-copy]");
    baseInput.value = defaultViewerUrl();
    const regenerate = async () => {
      copyButton.disabled = true;
      try {
        const url = await buildUrl(payload, baseInput.value);
        urlOutput.value = url;
        try { root.localStorage?.setItem(STORAGE_KEY, new URL(baseInput.value, root.location.href).href.split("#")[0]); } catch (_error) {}
        const description = describeUrl(url);
        message.className = `structure-share-message${description.warning ? " warn" : ""}`;
        message.textContent = description.text;
        copyButton.disabled = false;
      } catch (error) {
        message.className = "structure-share-message warn";
        message.textContent = error.message;
      }
    };
    dialog.querySelector("[data-share-regenerate]").addEventListener("click", regenerate);
    copyButton.addEventListener("click", async () => {
      const copied = await copyText(urlOutput.value, urlOutput);
      message.textContent = copied ? "Share URL copied." : "Copy failed. Select the URL and copy it manually.";
    });
    dialog.addEventListener("close", () => dialog.remove());
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
    await regenerate();
    return { payload, dialog };
  }

  return { SCHEMA, WARNING_LENGTH, createPayload, validatePayload, encodePayload, decodePayload, payloadFromHash, buildUrl, defaultViewerUrl, describeUrl, openDialog };
});
