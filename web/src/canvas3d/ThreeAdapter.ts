// The one file that imports three. It owns the renderer, camera, orbit,
// picking, labels and disposal, and turns a Scene3D into meshes. Rendering is
// on demand: a frame is drawn after input or a state change, never on a free
// running loop (facets#435 stage 1: no particle motion).

import * as THREE from "three";
import type { SceneColors, Rgb } from "./colors";
import { flowLabel, type Entity3D, type Flow3D, type Scene3D } from "./scene";
import { exploded, shellPoint, type Shell } from "./layout";
import { NO_FILTER, filterActive, litUnder, type ViewFilter } from "./filter";
import { add, lerp, norm, scale, sub, v3, type Vec3 } from "./vec3";

export interface AdapterEvents {
  onSelect: (thingId: number | null) => void;
  onEnter: (thingId: number) => void;
}

const FIT_PAD = 1.25;
const EXPLODE_REACH = 2.6;
const LANE_GAP = 0.22;
const TUBE_R = 0.028;
const DIM_BODY = 0.12;
const DIM_FLOW = 0.06;

const toColor = (c: Rgb) => new THREE.Color().setRGB(c.r / 255, c.g / 255, c.b / 255, THREE.SRGBColorSpace);
const tv = (v: Vec3) => new THREE.Vector3(v.x, v.y, v.z);
const UP = new THREE.Vector3(0, 1, 0);

interface Body {
  entity: Entity3D;
  mesh: THREE.Mesh;
  label: HTMLDivElement;
}

interface Wire {
  flow: Flow3D;
  group: THREE.Group;
  material: THREE.MeshStandardMaterial;
  label: HTMLDivElement;
  mid: THREE.Vector3;
}

/** The shell as a lat-long mesh over the superellipsoid of revolution. */
function shellGeometry(shape: Shell, lat = 28, lon = 48): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= lat; i++) {
    const v = -Math.PI / 2 + (i / lat) * Math.PI;
    for (let j = 0; j <= lon; j++) {
      const u = (j / lon) * Math.PI * 2;
      const p = shellPoint(shape, u, v);
      positions.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const a = i * (lon + 1) + j;
      const b = a + lon + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Concatenate non-indexed copies of several geometries into one. */
function mergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const g of parts) {
    const ng = g.index ? g.toNonIndexed() : g;
    positions.push(...(ng.getAttribute("position").array as Float32Array));
    normals.push(...(ng.getAttribute("normal").array as Float32Array));
    if (ng !== g) ng.dispose();
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return out;
}

export class SceneAdapter {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private model = new THREE.Group();
  private bodies: Body[] = [];
  private wires: Wire[] = [];
  private portMeshes: THREE.Mesh[] = [];
  private labels: HTMLDivElement;
  private ro: ResizeObserver;
  private raf = 0;
  private data: Scene3D | null = null;
  private explode = 0;
  private filter: ViewFilter = NO_FILTER;
  private yaw = 0.55;
  private pitch = 0.32;
  private dist = 12;
  private fitDist = 12;
  private drag: { x: number; y: number; moved: boolean } | null = null;
  private disposed = false;
  private readonly onContextLost = (e: Event) => {
    e.preventDefault();
  };

  constructor(
    private host: HTMLElement,
    private colors: SceneColors,
    private events: AdapterEvents,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "Exploded 3D view of the model. Drag to orbit, scroll to zoom, Home to fit, Escape to clear.");
    host.appendChild(canvas);
    canvas.addEventListener("webglcontextlost", this.onContextLost);

    this.labels = host.ownerDocument.createElement("div");
    Object.assign(this.labels.style, { position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none" });
    host.appendChild(this.labels);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    this.scene.add(this.model);
    const hemi = new THREE.HemisphereLight(toColor(colors.paper), toColor(colors.muted), 1.1);
    const key = new THREE.DirectionalLight(toColor(colors.paper), 1.4);
    key.position.set(4, 7, 5);
    const fill = new THREE.DirectionalLight(toColor(colors.paper), 0.5);
    fill.position.set(-5, -2, -4);
    this.scene.add(hemi, key, fill);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("keydown", this.onKey);
    canvas.addEventListener("dblclick", this.onDouble);
  }

  // ---- public ---------------------------------------------------------------

  setScene(data: Scene3D, keepCamera = false): void {
    this.clear();
    this.data = data;
    const c = this.colors;

    if (data.shell !== "none") {
      const geom =
        data.shell === "capsule"
          ? shellGeometry(data.shape)
          : new THREE.BoxGeometry(data.shape.halfLength * 2, data.shape.radius * 2, data.shape.radius * 2);
      const mat = new THREE.MeshStandardMaterial({
        color: toColor(c.lensSoft),
        transparent: true,
        opacity: data.shell === "capsule" ? 0.16 : 0.08,
        roughness: 0.9,
        metalness: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        wireframe: data.shell === "hull",
      });
      const shellMesh = new THREE.Mesh(geom, mat);
      shellMesh.renderOrder = 2;
      this.model.add(shellMesh);
    }

    for (const e of data.entities) {
      const geom = this.geometryFor(e);
      const mat = new THREE.MeshStandardMaterial({
        color: toColor(this.bodyColor(e)),
        roughness: 0.75,
        metalness: 0.05,
        transparent: true,
        opacity: e.orphan ? 0.35 : 1,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData.thingId = e.id;
      this.model.add(mesh);
      const label = this.makeLabel(e.name, e.kind === "interface" ? "interface" : e.kind === "component" ? "component" : "environment");
      this.bodies.push({ entity: e, mesh, label });
    }

    const portGeom = new THREE.TorusGeometry(1, 0.28, 8, 20);
    const authoredIds = new Set(data.entities.filter((e) => e.kind === "interface").map((e) => e.id));
    for (const p of data.ports) {
      if (authoredIds.has(p.component)) continue;
      const mat = new THREE.MeshStandardMaterial({ color: toColor(c.lensAccent), roughness: 0.6 });
      const mesh = new THREE.Mesh(portGeom, mat);
      mesh.scale.setScalar(Math.max(0.07, data.shape.radius * 0.05));
      mesh.userData.portKey = p.key;
      this.model.add(mesh);
      this.portMeshes.push(mesh);
    }

    for (const f of data.flows) {
      const material = new THREE.MeshStandardMaterial({
        color: toColor(c.kind[f.kind]),
        roughness: 0.55,
        transparent: true,
        opacity: f.bond ? 0.95 : 0.35,
      });
      const group = new THREE.Group();
      this.model.add(group);
      const label = this.makeLabel(flowLabel(f), "flow");
      label.style.visibility = "hidden";
      this.wires.push({ flow: f, group, material, label, mid: new THREE.Vector3() });
    }

    this.layout();
    if (!keepCamera) this.fit();
    else this.requestRender();
  }

  setExplode(t: number): void {
    this.explode = Math.max(0, Math.min(1, t));
    this.layout();
    this.requestRender();
  }

  setFilter(f: ViewFilter): void {
    this.filter = f;
    this.applyVisibility();
    // Labels follow the frame; draw it now so a filter change reads at once
    // even where animation frames are throttled (a background tab).
    if (!this.disposed) this.render();
  }

  setColors(colors: SceneColors): void {
    this.colors = colors;
    if (this.data) this.setScene(this.data, true);
  }

  fit(): void {
    if (!this.data) return;
    let far = 0;
    for (const b of this.bodies) far = Math.max(far, b.mesh.position.length() + b.entity.radius);
    far = Math.max(far, this.data.shape.halfLength, this.data.shape.radius);
    const fov = (this.camera.fov * Math.PI) / 180;
    const aspect = Math.max(0.5, this.camera.aspect);
    this.fitDist = (far * FIT_PAD) / Math.tan(fov / 2) / Math.min(1, aspect);
    this.dist = this.fitDist;
    this.yaw = 0.55;
    this.pitch = 0.32;
    this.requestRender();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointercancel", this.onPointerUp);
    canvas.removeEventListener("wheel", this.onWheel);
    canvas.removeEventListener("keydown", this.onKey);
    canvas.removeEventListener("dblclick", this.onDouble);
    canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
    this.labels.remove();
  }

  /** How many WebGL programs the renderer holds — the StrictMode leak probe. */
  get programCount(): number {
    return this.renderer.info.programs?.length ?? 0;
  }

  /** Draw `n` frames synchronously while orbiting and report the mean cost in
   *  ms. A dev probe for the frame budget; rAF-based timing is throttled in a
   *  background tab, this is not. */
  benchmark(n = 60): { msPerFrame: number; drawCalls: number } {
    const yaw = this.yaw;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      this.yaw = yaw + (i / n) * Math.PI * 2;
      this.render();
    }
    const ms = (performance.now() - t0) / n;
    this.yaw = yaw;
    this.render();
    return { msPerFrame: ms, drawCalls: this.renderer.info.render.calls };
  }

  // ---- scene ----------------------------------------------------------------

  private clear(): void {
    this.model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) (mat as THREE.Material).dispose();
    });
    this.model.clear();
    this.bodies = [];
    this.wires = [];
    this.portMeshes = [];
    this.labels.replaceChildren();
  }

  /** Three populations, three form languages: interior bodies are solids
   *  keyed by primitive; interfaces are hatches, a flat disc with a rim lying
   *  in the shell; environment things are directional cones (source, sink) or
   *  an octahedron (neutral). */
  private geometryFor(e: Entity3D): THREE.BufferGeometry {
    const r = e.radius;
    switch (e.kind) {
      case "source":
        return new THREE.ConeGeometry(r * 0.9, r * 1.6, 5).rotateZ(-Math.PI / 2);
      case "sink":
        return new THREE.ConeGeometry(r * 0.9, r * 1.6, 5).rotateZ(Math.PI / 2);
      case "neutral":
        return new THREE.OctahedronGeometry(r);
      case "interface": {
        const disc = new THREE.CylinderGeometry(r * 0.95, r * 0.95, r * 0.22, 24);
        const rim = new THREE.TorusGeometry(r * 0.95, r * 0.14, 8, 28).rotateX(Math.PI / 2);
        return mergeGeometries([disc, rim]);
      }
      default:
        break;
    }
    switch (e.primitive) {
      case "Buffering":
        return new THREE.BoxGeometry(r * 1.5, r * 1.5, r * 1.5);
      case "Combining":
        return new THREE.DodecahedronGeometry(r);
      case "Splitting":
        return new THREE.TetrahedronGeometry(r * 1.3);
      case "Propelling":
        return new THREE.ConeGeometry(r, r * 1.8, 6).rotateZ(-Math.PI / 2);
      case "Impeding":
        return new THREE.TorusGeometry(r * 0.8, r * 0.3, 10, 18).rotateY(Math.PI / 2);
      default:
        return new THREE.IcosahedronGeometry(r, 0);
    }
  }

  private bodyColor(e: Entity3D): Rgb {
    const c = this.colors;
    if (e.kind === "interface") return c.lensAccent;
    if (e.kind === "component") return c.ink;
    return c.muted;
  }

  private makeLabel(text: string, kind: "component" | "interface" | "environment" | "flow"): HTMLDivElement {
    const el = this.labels.ownerDocument.createElement("div");
    el.textContent = text;
    el.className = kind === "flow" ? "text-[10px] leading-tight" : "text-[11px] leading-tight";
    Object.assign(el.style, {
      position: "absolute",
      whiteSpace: "nowrap",
      padding: "1px 5px",
      borderRadius: "var(--radius-sm)",
      background: "var(--bg-primary)",
      color: kind === "component" || kind === "interface" ? "var(--text-primary)" : "var(--text-muted)",
      border: kind === "interface" ? "1px solid var(--lens-accent)" : "1px solid var(--hairline)",
      fontStyle: kind === "interface" ? "italic" : "normal",
    });
    this.labels.appendChild(el);
    return el;
  }

  private positionOf(e: Entity3D): Vec3 {
    if (e.kind === "interface" && e.normal) return add(e.base, scale(e.normal, this.explode * EXPLODE_REACH * 0.35));
    if (e.kind === "component") return exploded(e.base, this.explode, EXPLODE_REACH);
    return add(e.base, scale(norm(e.base), this.explode * EXPLODE_REACH * 0.5));
  }

  private layout(): void {
    if (!this.data) return;
    const at = new Map<string, Vec3>();
    for (const b of this.bodies) {
      const p = this.positionOf(b.entity);
      b.mesh.position.copy(tv(p));
      if (b.entity.normal) b.mesh.quaternion.setFromUnitVectors(UP, tv(b.entity.normal));
      at.set(String(b.entity.id), p);
    }
    const authored = new Set(this.bodies.filter((b) => b.entity.kind === "interface").map((b) => b.entity.id));
    for (const p of this.data.ports) {
      const pos = authored.has(p.component)
        ? at.get(String(p.component)) ?? p.at
        : add(p.at, scale(p.normal, this.explode * EXPLODE_REACH * 0.35));
      at.set("port:" + p.key, pos);
    }
    for (const m of this.portMeshes) {
      const p = this.data.ports.find((x) => x.key === m.userData.portKey);
      m.position.copy(tv(at.get("port:" + m.userData.portKey) ?? v3()));
      if (p) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tv(p.normal));
    }
    for (const w of this.wires) this.rebuildWire(w, at);
    this.applyVisibility();
  }

  private rebuildWire(w: Wire, at: Map<string, Vec3>): void {
    w.group.clear();
    const stops = w.flow.path.map((s) => at.get(s.ref === "port" ? "port:" + s.key : s.key)).filter((p): p is Vec3 => !!p);
    if (stops.length < 2 && !w.flow.selfLoop) return;
    let points: THREE.Vector3[];
    if (w.flow.selfLoop) {
      const c = stops[0] ?? v3();
      const r = 0.6;
      points = [0, 0.25, 0.5, 0.75, 1].map((t) => {
        const a = t * Math.PI * 2;
        return tv(add(c, v3(Math.cos(a) * r - r, Math.sin(a) * r + 0.5, 0)));
      });
    } else {
      const a = stops[0];
      const b = stops[stops.length - 1];
      const dir = norm(sub(b, a));
      const up = Math.abs(dir.y) > 0.9 ? v3(1, 0, 0) : v3(0, 1, 0);
      const side = norm(v3(dir.y * up.z - dir.z * up.y, dir.z * up.x - dir.x * up.z, dir.x * up.y - dir.y * up.x));
      const canonical = w.flow.a < w.flow.b ? 1 : -1;
      const bow = scale(side, w.flow.lane * LANE_GAP * canonical);
      points = [];
      for (let i = 0; i < stops.length; i++) {
        points.push(tv(stops[i]));
        if (i < stops.length - 1) points.push(tv(add(lerp(stops[i], stops[i + 1], 0.5), bow)));
      }
    }
    const curve = new THREE.CatmullRomCurve3(points, w.flow.selfLoop, "centripetal", 0.6);
    const tube = new THREE.TubeGeometry(curve, 40, TUBE_R * (w.flow.ample ? 0.6 : 1), 6, w.flow.selfLoop);
    w.group.add(new THREE.Mesh(tube, w.material));
    w.mid.copy(curve.getPointAt(0.5));
    if (!w.flow.selfLoop) {
      const tip = curve.getPointAt(0.62);
      const tan = curve.getTangentAt(0.62);
      const head = new THREE.Mesh(new THREE.ConeGeometry(TUBE_R * 3.2, TUBE_R * 7, 8), w.material);
      head.position.copy(tip);
      head.quaternion.setFromUnitVectors(UP, tan.normalize());
      w.group.add(head);
    }
  }

  private applyVisibility(): void {
    if (!this.data) return;
    const lit = litUnder(this.data, this.filter);
    const sel = this.filter.selected;
    const showFlowLabels = filterActive(this.filter);
    for (const b of this.bodies) {
      const on = lit.entities.has(b.entity.id);
      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = (b.entity.orphan ? 0.35 : 1) * (on ? 1 : DIM_BODY);
      mat.emissive = toColor(b.entity.id === sel ? this.colors.accent : { r: 0, g: 0, b: 0 });
      mat.emissiveIntensity = b.entity.id === sel ? 0.35 : 0;
      b.label.style.opacity = on ? "1" : "0.25";
    }
    for (const w of this.wires) {
      const on = lit.flows.has(w.flow.id);
      w.material.opacity = (w.flow.bond ? 0.95 : 0.35) * (on ? 1 : DIM_FLOW);
      w.label.dataset.show = showFlowLabels && on ? "1" : "";
    }
    this.requestRender();
  }

  // ---- camera and frame -----------------------------------------------------

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  requestRender(): void {
    if (this.disposed || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }

  private render(): void {
    const cp = Math.max(-1.45, Math.min(1.45, this.pitch));
    this.camera.position.set(
      Math.sin(this.yaw) * Math.cos(cp) * this.dist,
      Math.sin(cp) * this.dist,
      Math.cos(this.yaw) * Math.cos(cp) * this.dist,
    );
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
    this.projectLabels();
  }

  private projectLabels(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const v = new THREE.Vector3();
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const place = (label: HTMLDivElement, world: THREE.Vector3, lift: number): void => {
      v.copy(world);
      v.y += lift;
      v.project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      const bw = label.offsetWidth;
      const bh = label.offsetHeight;
      const box = { x: x - bw / 2, y: y - bh, w: bw, h: bh };
      const clash = placed.some((p) => box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y);
      if (clash || v.z > 1) {
        label.style.visibility = "hidden";
        return;
      }
      placed.push(box);
      label.style.visibility = "visible";
      label.style.transform = `translate(${Math.round(x - bw / 2)}px, ${Math.round(y - bh)}px)`;
    };
    const order = [...this.bodies].sort(
      (a, b) => a.mesh.position.distanceTo(this.camera.position) - b.mesh.position.distanceTo(this.camera.position),
    );
    for (const b of order) place(b.label, b.mesh.position, b.entity.radius * 1.1);
    for (const wire of this.wires) {
      if (wire.label.dataset.show) place(wire.label, wire.mid, 0.08);
      else wire.label.style.visibility = "hidden";
    }
  }

  // ---- input ----------------------------------------------------------------

  private onPointerDown = (e: PointerEvent) => {
    try {
      this.renderer.domElement.setPointerCapture(e.pointerId);
    } catch {
      // a synthetic pointer has no capture; orbit still works
    }
    this.renderer.domElement.focus();
    this.drag = { x: e.clientX, y: e.clientY, moved: false };
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.drag) return;
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    if (!this.drag.moved && Math.hypot(dx, dy) < 5) return;
    this.drag.moved = true;
    this.yaw -= dx * 0.006;
    this.pitch += dy * 0.006;
    this.drag.x = e.clientX;
    this.drag.y = e.clientY;
    this.requestRender();
  };

  private onPointerUp = (e: PointerEvent) => {
    const d = this.drag;
    this.drag = null;
    if (!d || d.moved) return;
    this.events.onSelect(this.pick(e.clientX, e.clientY));
  };

  private onDouble = (e: MouseEvent) => {
    const hit = this.pick(e.clientX, e.clientY);
    if (hit !== null) this.events.onEnter(hit);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const k = e.deltaMode === 1 ? 0.05 : 0.0015;
    this.dist = Math.max(this.fitDist * 0.25, Math.min(this.fitDist * 4, this.dist * Math.exp(e.deltaY * k)));
    this.requestRender();
  };

  private onKey = (e: KeyboardEvent) => {
    const step = 0.12;
    if (e.key === "ArrowLeft") this.yaw += step;
    else if (e.key === "ArrowRight") this.yaw -= step;
    else if (e.key === "ArrowUp") this.pitch += step;
    else if (e.key === "ArrowDown") this.pitch -= step;
    else if (e.key === "Home") this.fit();
    else if (e.key === "Escape") this.events.onSelect(null);
    else return;
    e.preventDefault();
    this.requestRender();
  };

  private pick(clientX: number, clientY: number): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.bodies.map((b) => b.mesh), false);
    const first = hits[0]?.object as THREE.Mesh | undefined;
    return first ? (first.userData.thingId as number) : null;
  }
}
