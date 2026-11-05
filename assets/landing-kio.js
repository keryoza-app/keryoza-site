/* keryoza.com v3 — the one 3D Kio. The founder's own rigged model (kio_dance.glb: clips KIO_Wave, KIO_Dance),
   textures re-encoded for the web (no bump map: smooth like the 2D Kio), geometry untouched. Moves: a spring glide
   between stations, a walk while the page scrolls, and tap reactions (jump with a spin, giggle, peekaboo). He walks between "stations" (empty boxes in each section),
   waves, dances, hops, looks around and turns his head toward the pointer. Self-hosted three.js, no network
   beyond our own files. Reduced motion, no WebGL or a slow load = the 2D poster in each station stays. */
import * as THREE from "./three.module.min.js";
import { GLTFLoader } from "./GLTFLoader.js";

const root = document.documentElement;
const canvas = document.querySelector("[data-kio-canvas]");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;

function webgl() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }

// The 2D posters show only when the 3D Kio cannot (html.kio2d); no 2D-then-3D swap on a normal load.
if (canvas && !reduced && webgl()) start(); else root.classList.add("kio2d");

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff3e2, 0x8a5a43, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(300, 600, 900); scene.add(sun);
  const cam = new THREE.OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  cam.position.z = 1000;

  let W = 0, H = 0, HA = 0;   // W, H = the viewport; HA = the canvas height we allocated
  // Phones resize the viewport while scrolling (the address bar). Re-allocating the canvas each time
  // blanks it for a frame (a flicker), so only grow it, or rebuild when the width really changes.
  function size() {
    const w = innerWidth, h = innerHeight;
    H = h;
    if (w === W && h <= HA) return;
    const sameW = w === W;
    W = w; HA = Math.max(sameW ? HA : 0, Math.round(h * 1.15));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(W, HA, false);
    canvas.style.height = HA + "px";
    cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = -HA; cam.updateProjectionMatrix();
  }
  size(); addEventListener("resize", size);

  const pivot = new THREE.Group(); scene.add(pivot);
  let model = null, modelH = 1, mixer = null, idle = null, clips = {}, busy = null;
  // live state, eased every frame
  const cur = { x: W * 0.75, y: H * 0.8, h: 0 }, tgt = { x: 0, y: 0, h: 0 };
  let yaw = 0, yawT = 0, hop = 0, look = 0, visibleWanted = false;   // + jump, giggle, peek in tick()

  const slow = setTimeout(() => root.classList.add("kio2d"), 12000);   // very slow line: posters meanwhile
  new GLTFLoader().load(new URL("kio.glb", import.meta.url).href, (g) => {
    clearTimeout(slow);
    model = g.scene;
    model.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });   // skinned parts were culled near edges
    mixer = new THREE.AnimationMixer(model);
    g.animations.forEach((c) => { clips[c.name] = c; });
    idle = mixer.clipAction(clips.KIO_Wave); idle.play(); idle.paused = true; idle.time = 0;
    mixer.update(0); model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    modelH = s.y;
    model.position.set(-c.x, -box.min.y, -c.z);
    pivot.add(model);
    mixer.addEventListener("finished", () => { if (busy) { busy.fadeOut(0.45); idle.reset(); idle.paused = true; idle.fadeIn(0.45); busy = null; } });
    root.classList.add("kio3d"); root.classList.remove("kio2d");
    tick();
  }, undefined, () => { clearTimeout(slow); root.classList.add("kio2d"); });

  function playClip(name, maxSec) {
    if (!mixer || !clips[name]) return;
    if (busy) busy.stop();
    const a = mixer.clipAction(clips[name]);
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false;
    if (maxSec && clips[name].duration > maxSec) a.setDuration(Math.max(maxSec, clips[name].duration * 0.75));
    idle.fadeOut(0.4); a.fadeIn(0.4).play(); busy = a;
  }
  document.addEventListener("kio:act", (e) => {
    const n = e.detail;
    if (n === "wave") playClip("KIO_Wave");
    else if (n === "dance") playClip("KIO_Dance", 3.2);
    else if (n === "hop") hop = 1;
    else if (n === "jump") jump = 1;
    else if (n === "giggle") giggle = 1;
    else if (n === "peek") peek = 1;
    else if (n === "look") look = 1;
  });

  // head (whole body) gently follows the pointer near him, desktop only
  let px = null;
  if (fine) addEventListener("pointermove", (e) => { px = e.clientX; });

  function station() {
    const name = root.getAttribute("data-at");
    if (!name || name === "none") return null;
    const el = document.querySelector('[data-station="' + name + '"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || getComputedStyle(el).display === "none") return null;
    return r;
  }

  const clock = new THREE.Clock();
  let t = 0, lastSY = scrollY, walk = 0, jump = 0, giggle = 0, peek = 0, shown = false, arrived = false;
  // spring state: critically damped, so he accelerates and settles smoothly instead of snapping
  const vel = { x: 0, y: 0, h: 0 };
  function spring(k, w, dt) { const a = w * w * (tgt[k] - cur[k]) - 2 * w * vel[k]; vel[k] += a * dt; cur[k] += vel[k] * dt; }
  function tick() {
    requestAnimationFrame(tick);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05); t += dt;
    const r = performance.now() < 1150 ? null : station();   // wait for the entrance doors to open (landing.css)
    visibleWanted = !!r;
    if (r) { tgt.x = r.left + r.width / 2; tgt.y = r.bottom; tgt.h = r.height * 0.96; }
    else { tgt.h = 0; }
    if (r && !arrived) { arrived = true; cur.x = tgt.x; cur.y = tgt.y; vel.x = vel.y = 0; jump = 1; }   // first arrival: grow in with a spin
    const jumpTo = Math.hypot(tgt.x - cur.x, tgt.y - cur.y) > H * 1.4;   // a far hop (e.g. a jump-link): no long slide
    if (jumpTo && cur.h < 2) { cur.x = tgt.x; cur.y = tgt.y; vel.x = vel.y = 0; }
    spring("x", 6.5, dt); spring("y", 6.5, dt); spring("h", 7, dt);
    if (cur.h < 0) cur.h = 0;
    if (!visibleWanted && cur.h < 2) {
      if (shown) { renderer.clear(); canvas.style.visibility = "hidden"; shown = false; }
      return;
    }

    // walking: while he travels between stations, or while the page scrolls under him (the hall walk)
    const sv = Math.abs(scrollY - lastSY) / Math.max(dt, 0.001); lastSY = scrollY;
    const speed = Math.hypot(vel.x, vel.y);
    walk += (Math.min(1, Math.max(speed / 900, sv / 1400)) - walk) * Math.min(1, dt * 6);

    if (hop > 0) hop = Math.max(0, hop - dt * 2.4);
    if (jump > 0) jump = Math.max(0, jump - dt * 1.25);
    if (giggle > 0) giggle = Math.max(0, giggle - dt * 1.1);
    if (peek > 0) peek = Math.max(0, peek - dt * 0.9);
    const hopY = hop > 0 ? Math.sin((1 - hop) * Math.PI) * 0.12 : 0;
    const jq = 1 - jump, jumpY = jump > 0 ? Math.max(0, Math.sin(Math.min(1, jq / 0.8) * Math.PI)) * 0.42 : 0;
    const squash = jump > 0 ? (jq < 0.12 ? -0.12 * Math.sin(jq / 0.12 * Math.PI) : jq > 0.8 ? -0.1 * Math.sin((jq - 0.8) / 0.2 * Math.PI) : 0.05) : 0;
    const peekQ = peek > 0 ? Math.sin((1 - peek) * Math.PI) : 0;
    if (look > 0) look = Math.max(0, look - dt / 2.6);
    const lookYaw = look > 0 ? Math.sin((1 - look) * Math.PI * 2) * 0.55 : 0;
    yawT = 0;
    if (px !== null && !busy && look === 0) yawT = Math.max(-0.26, Math.min(0.26, (px - cur.x) / (W * 0.6) * 0.5));
    const spin = jump > 0 ? Math.PI * 2 * (1 - Math.pow(1 - Math.min(1, jq / 0.8), 2)) : 0;
    yaw += ((lookYaw || yawT) - yaw) * Math.min(1, dt * 4);

    const breathe = Math.sin(t * 2.2) * 0.012;
    const sq = 1 + squash - peekQ * 0.42;
    const s = cur.h / modelH;
    pivot.scale.set(Math.max(s * (1 - squash * 0.5 + breathe * -0.5), 0.0001), Math.max(s * (sq + breathe), 0.0001), Math.max(s, 0.0001));
    const bob = walk * Math.abs(Math.sin(t * 7.5)) * 0.045;
    pivot.position.set(cur.x, -cur.y + (hopY + jumpY + bob) * cur.h, 0);
    pivot.rotation.y = yaw + spin;
    pivot.rotation.z = walk * Math.sin(t * 7.5) * 0.045 + (giggle > 0 ? Math.sin(t * 38) * 0.06 * giggle : 0);
    mixer.update(dt);
    renderer.render(scene, cam);
    if (!shown) { canvas.style.visibility = "visible"; shown = true; }   // show only after a fresh frame: no stale flash
  }
}
