(function () {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const els = {
    title: byId("structureTitle"), summary: byId("structureSummary"), stage: byId("viewerStage"), viewer: byId("viewer"), overlay: byId("selectionOverlay"),
    style: byId("styleSelect"), labels: byId("labelsButton"), measure: byId("measureButton"), clear: byId("clearButton"),
    reset: byId("resetButton"), showXyz: byId("showXyzButton"), copyXyz: byId("copyXyzButton"), selected: byId("selectedAtoms"),
    result: byId("measurementResult"), xyzPanel: byId("xyzPanel"), xyz: byId("xyzText"), error: byId("errorMessage"),
  };
  let payload = null;
  let viewer = null;
  let model = null;
  let selected = [];
  let labelsVisible = false;
  let measureEnabled = true;
  let resizeFrame = 0;
  let resizeObserver = null;
  const measurement = window.StructureViewerMath;

  function resizeViewer() {
    resizeFrame = 0;
    if (!viewer) return;
    viewer.resize();
    viewer.render();
  }

  function scheduleViewerResize() {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resizeViewer);
  }

  function atomLabel(atom) { return `${atom.elem || atom.element || "X"}${Number(atom.index) + 1}`; }
  function styleSpec() {
    if (els.style.value === "stick") return { stick: { radius: 0.15 } };
    if (els.style.value === "spacefill") return { sphere: { scale: 1 } };
    return { stick: { radius: 0.13 }, sphere: { scale: 0.28 } };
  }

  function renderStyles() {
    if (!viewer || !model) return;
    viewer.removeAllLabels();
    model.setStyle({}, styleSpec());
    selected.forEach((atom) => model.addStyle({ index: atom.index }, { sphere: { scale: 0.48, color: "#f4b400" } }));
    if (labelsVisible) {
      model.selectedAtoms({}).forEach((atom) => viewer.addLabel(atomLabel(atom), {
        position: { x: atom.x, y: atom.y, z: atom.z }, fontSize: 12, fontColor: "#102a43", backgroundColor: "white", backgroundOpacity: 0.72, borderThickness: 0,
      }));
    }
    viewer.render();
  }

  function measurementText() {
    if (selected.length === 2) return `Distance: ${measurement.distance(selected[0], selected[1]).toFixed(3)} Å`;
    if (selected.length === 3) return `Angle: ${measurement.angle(...selected).toFixed(2)}°`;
    if (selected.length === 4) return `Dihedral: ${measurement.dihedral(...selected).toFixed(2)}°`;
    return selected.length ? "Select up to 4 atoms." : "Tap atoms in order to measure.";
  }

  function updateSelection() {
    const names = selected.map(atomLabel);
    els.selected.textContent = `Selected: ${names.join(", ") || "none"}`;
    els.result.textContent = measurementText();
    els.overlay.hidden = !names.length;
    els.overlay.textContent = names.join(" → ");
    renderStyles();
  }

  function selectAtom(atom) {
    if (!measureEnabled) return;
    const existing = selected.findIndex((item) => item.index === atom.index);
    if (existing >= 0) selected.splice(existing, 1);
    else {
      if (selected.length >= 4) selected = [];
      selected.push(atom);
    }
    updateSelection();
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_error) {
      els.xyzPanel.open = true; els.xyz.focus(); els.xyz.select(); return document.execCommand("copy");
    }
  }

  async function initialize() {
    try {
      payload = await window.StructureShare.payloadFromHash(location.hash);
      els.title.textContent = payload.title || payload.structure.name || "Shared molecular structure";
      els.xyz.value = payload.structure.xyz;
      els.style.value = payload.view?.style || "ball-stick";
      labelsVisible = Boolean(payload.view?.atomLabels);
      els.labels.setAttribute("aria-pressed", String(labelsVisible));
      els.viewer.textContent = "";
      viewer = window.$3Dmol.createViewer(els.viewer, { backgroundColor: "white" });
      model = viewer.addModel(payload.structure.xyz, "xyz", { keepH: true });
      const atoms = model.selectedAtoms({});
      atoms.forEach((atom, index) => { atom.index = Number.isInteger(atom.index) ? atom.index : index; });
      model.setClickable({}, true, selectAtom);
      els.summary.textContent = `${atoms.length} atoms · charge ${payload.structure.charge ?? 0} · multiplicity ${payload.structure.multiplicity ?? 1}`;
      renderStyles();
      viewer.zoomTo();
      viewer.render();
      scheduleViewerResize();
    } catch (error) {
      els.viewer.innerHTML = "";
      els.error.hidden = false;
      els.error.textContent = error.message;
      document.querySelectorAll("button, select").forEach((control) => { control.disabled = true; });
    }
  }

  els.style.addEventListener("change", renderStyles);
  els.labels.addEventListener("click", () => { labelsVisible = !labelsVisible; els.labels.setAttribute("aria-pressed", String(labelsVisible)); renderStyles(); });
  els.measure.addEventListener("click", () => { measureEnabled = !measureEnabled; els.measure.setAttribute("aria-pressed", String(measureEnabled)); });
  els.clear.addEventListener("click", () => { selected = []; updateSelection(); });
  els.reset.addEventListener("click", () => { viewer?.zoomTo(); viewer?.render(); });
  els.showXyz.addEventListener("click", () => { els.xyzPanel.open = !els.xyzPanel.open; if (els.xyzPanel.open) els.xyzPanel.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
  els.copyXyz.addEventListener("click", async () => { els.result.textContent = await copyText(payload.structure.xyz) ? "XYZ copied." : "Copy failed. Open XYZ and copy it manually."; });
  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(scheduleViewerResize);
    resizeObserver.observe(els.stage);
  }
  window.addEventListener("resize", scheduleViewerResize);
  initialize();

})();
