/* keryoza.com v3 — the page's own script: no network, no cookies, no tracking. The only thing kept is the
   language: each language is its own page (/ Arabic, /en/ English), so nothing is kept. Without this file the page still reads fully (Arabic,
   every section, still layouts). The 3D Kio lives in landing-kio.js and listens for "kio:act" events. */
(function () {
  "use strict";
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow = window.matchMedia("(max-width: 60rem)");
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var rtl = function () { return root.getAttribute("dir") === "rtl"; };
  function act(name) { document.dispatchEvent(new CustomEvent("kio:act", { detail: name })); }
  // The assets folder, wherever this page lives (/ or /en/): this script sits in it.
  var A = document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, "") : "assets/";

  // ---------- Sound: Kio's real recorded lines, only after a tap ----------
  var audio = null, playingBtn = null, audioFrom = null;
  function onScreen(el) { var r = el.getBoundingClientRect(); return r.bottom > 90 && r.top < window.innerHeight - 60; }   // 90: the sticky top bar covers the top strip
  function play(key, btn) {
    try {
      if (audio) { audio.pause(); }
      if (playingBtn) playingBtn.classList.remove("playing");
      audio = new Audio(A + key + ".mp3");
      playingBtn = btn || null; audioFrom = btn || stage;   // where the voice came from: it stops when that leaves the screen
      if (btn) btn.classList.add("playing");
      audio.addEventListener("ended", function () { if (btn) btn.classList.remove("playing"); });
      audio.play().catch(function () { if (btn) btn.classList.remove("playing"); });
    } catch (e) { /* no audio support: silent */ }
  }

  // ---------- Language ----------
  var lang = "ar";
  function setLang(l) {
    lang = l === "en" ? "en" : "ar";
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "en" ? "ltr" : "rtl");
    if (lang === "en") root.setAttribute("data-lang", "en"); else root.removeAttribute("data-lang");
    hallLayout(); scenes.forEach(function (o) { o.cur = -1; });
  }

  // ---------- Which section is in the middle: Kio's station ----------
  var at = null, seen = {};
  function enter(sec) {
    var st = sec.getAttribute("data-at");
    if (st === at) return;
    at = st;
    root.setAttribute("data-at", st);
    var id = sec.id || "hero";
    if (!seen[id]) {
      seen[id] = true;
      if (id === "hero") greet();
      if (id === "join") setTimeout(function () { act("wave"); }, 300);
      if (id === "kio") act("wave");
      if (id === "try") { act("look"); tryStart(); }
    }
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) enter(e.target); }); }, { rootMargin: "-45% 0px -45% 0px" });
    $$("main > section").forEach(function (s) { io.observe(s); });
  }
  // Tap Kio: one reaction per tap, in turn: a move (3D) + a short line in the one speech bubble.
  var KLINES = $$("b", $("template[data-kio-lines]").content).map(function (b) { return { move: b.getAttribute("data-move"), html: b.innerHTML }; });
  var kix = 0, sayEl = $("[data-kio-say]"), sayT = 0, sayY = 0, tapped = false;
  // Each word in its own span (built with the DOM: the CSP blocks inline style attributes), so they arrive one by one.
  function words(html) {
    var box = document.createElement("div"); box.innerHTML = html;
    $$(".ar, .en", box).forEach(function (s) {
      var ws = s.textContent.trim().split(/\s+/); s.textContent = "";
      ws.forEach(function (w, i) {
        var e = document.createElement("span"); e.className = "w"; e.textContent = w; e.style.setProperty("--i", i);
        s.appendChild(e); if (i < ws.length - 1) s.appendChild(document.createTextNode(" "));
      });
    });
    return box;
  }
  // The bubble sits beside Kio's head, on his outer side when it fits, its tail aimed at him.
  function kioSay(html, btn) {
    var r = btn.getBoundingClientRect(), vw = root.clientWidth, box = words(html);
    sayEl.replaceChildren.apply(sayEl, Array.prototype.slice.call(box.childNodes));
    sayEl.classList.remove("on"); void sayEl.offsetWidth;
    var bw = sayEl.offsetWidth, bh = sayEl.offsetHeight, cx = r.left + r.width / 2;
    var out = cx < vw / 2 ? -1 : 1, ax = cx + out * r.width * 0.2, ay = r.top + r.height * 0.13;
    var left = out < 0 ? ax - bw + 26 : ax - 26;
    if (left < 12 || left + bw > vw - 12) { ax = cx - out * r.width * 0.2; left = out < 0 ? ax - 26 : ax - bw + 26; }
    left = clamp(left, 12, vw - 12 - bw);
    if (left < cx && left + bw > cx) ay = r.top + r.height * 0.02;   // no room beside him (phones): sit above his head
    var tx = clamp(ax - left, 22, bw - 22);
    sayEl.style.left = left + "px";
    sayEl.style.top = Math.max(ay - bh - 14, 80) + "px";
    sayEl.style.setProperty("--tx", tx + "px");
    sayEl.classList.toggle("lean-r", left + tx < cx);              // the tail curls toward his head
    sayEl.classList.add("on");
    sayY = window.scrollY; clearTimeout(sayT);
    sayT = setTimeout(function () { sayEl.classList.remove("on"); }, 2600 + $$(".w", sayEl).length * 260);
  }
  // Hello, once the doors have opened and Kio has arrived (3D or poster); never over a tap.
  function greet() {
    if (!root.classList.contains("kio3d") && !root.classList.contains("kio2d")) return void setTimeout(greet, 300);
    setTimeout(function () {
      if (tapped || at !== "hero") return;
      act("wave");
      setTimeout(function () { if (!tapped && at === "hero") kioSay($("template[data-kio-lines]").content.querySelector("[data-greet]").innerHTML, $(".station-hero")); }, 450);
    }, Math.max(0, 1900 - performance.now()));
  }
  $$("[data-kio-tap]").forEach(function (b) {
    b.addEventListener("click", function () {
      var l = KLINES[kix++ % KLINES.length]; tapped = true;
      act(l.move);
      b.classList.remove("bop"); void b.offsetWidth; b.classList.add("bop");   // poster hop when there is no 3D
      if (b.getAttribute("data-station") === "try") return;                    // the game has its own bubble
      kioSay(l.html, b);
    });
  });

  // ---------- Reveal (quiet sections) ----------
  if (!reduced && "IntersectionObserver" in window) {
    var rv = $$(".reveal, .tiles");
    rv.forEach(function (el) { el.classList.add("pre"); });
    $$(".tiles li").forEach(function (li, i) { li.style.setProperty("--n", i); });
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove("pre"); rio.unobserve(e.target); } });
    }, { threshold: 0.25 });
    rv.forEach(function (el) { rio.observe(el); });
  }

  // ---------- Hero parallax (pointer) ----------
  var hero = $(".hero"), props = $$(".prop");
  if (!reduced && window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", function (ev) {
      var r = hero.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
      props.forEach(function (p) { var d = +p.getAttribute("data-depth"); p.style.setProperty("--px", (-x * d * 1.4) + "px"); p.style.setProperty("--py", (-y * d) + "px"); });
    });
  }

  // ---------- Scroll scrubs ----------
  function progress(sec) {
    var r = sec.getBoundingClientRect(), len = r.height - window.innerHeight;
    return len > 0 ? clamp(-r.top / len, 0, 1) : 0;
  }
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  // 3. The screen becomes a new window. The phone is a window (clip-path) cut into the page onto a full-size
  //    sea video; three creatures swim OUT of it one by one (far, mid, near), then the window opens wide.
  var portal = $(".portal"), pst = $(".sticky", portal), video = $(".portal-video", portal), bezel = $(".portal-bezel", portal);
  var swims = $$("[data-swim]", portal), PG = null, portalActs = {};
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  function portalLayout() {
    var W = pst.clientWidth, H = pst.clientHeight, nar = W < 760;
    var ph = H * (nar ? 0.48 : 0.64), pw = ph * 9 / 19.5, cx = W / 2, cy = H * (nar ? 0.6 : 0.54);
    PG = { W: W, H: H, nar: nar, l: cx - pw / 2, t: cy - ph / 2, w: pw, h: ph, rad: pw * 0.16,
      c: nar
        ? [null, { x: -0.3, y: -0.04, w: 0.19, win: [0.16, 0.36] }, { x: 0.2, y: 0.31, w: 0.34, win: [0.34, 0.54] }]
        : [{ x: -0.37, y: -0.27, w: 0.15, win: [0.14, 0.3], blur: 2.5 }, { x: -0.23, y: -0.04, w: 0.27, win: [0.26, 0.42] }, { x: 0.25, y: 0.2, w: 0.5, win: [0.38, 0.55] }] };
    swims.forEach(function (im, i) { var c = PG.c[i]; im.hidden = !c; if (c) im.style.width = (c.w * H) + "px"; });
  }
  function scrubPortal(p, now) {
    if (!PG) return;
    var g = PG, m = rtl() ? 1 : -1, open = smooth((p - 0.64) / 0.26), t = (now || 0) / 1000;
    // the window: phone rect -> full screen
    var l = lerp(g.l, -2, open), tp = lerp(g.t, -2, open), w = lerp(g.w, g.W + 4, open), h = lerp(g.h, g.H + 4, open), rad = lerp(g.rad, 0, open);
    pst.style.setProperty("--ct", tp + "px"); pst.style.setProperty("--cl", l + "px");
    pst.style.setProperty("--cr", (g.W - l - w) + "px"); pst.style.setProperty("--cb", (g.H - tp - h) + "px"); pst.style.setProperty("--crad", rad + "px");
    // the bezel rides exactly on the window edge (no cream gap), and fades as the sea takes the screen
    bezel.style.transform = "translate(" + (l + w / 2) + "px," + (tp + h / 2) + "px)";
    bezel.style.width = w + "px"; bezel.style.height = h + "px"; bezel.style.margin = (-h / 2) + "px 0 0 " + (-w / 2) + "px"; bezel.style.setProperty("--rad", rad + "px");
    bezel.style.opacity = (1 - smooth((p - 0.66) / 0.14)).toFixed(3);
    var emerge = 0;
    swims.forEach(function (im, i) {
      var c = g.c[i]; if (!c) return;
      var q = clamp((p - c.win[0]) / (c.win[1] - c.win[0]), 0, 1), e = ease(q); emerge = Math.max(emerge, q > 0 ? 1 : 0);
      var dx = c.x * g.W * m, dy = c.y * g.H, cx = g.l + g.w / 2 - g.W / 2, cy = g.t + g.h / 2 - g.H / 2;
      var x = lerp(cx + dx * 0.04, dx, e) * (1 + open * 0.7), y = lerp(cy + dy * 0.04, dy, e) * (1 + open * 0.7);
      y += Math.sin(t * 0.9 + i * 2.1) * g.H * 0.008 * e; x += Math.cos(t * 0.6 + i) * g.H * 0.006 * e;   // slow swim
      var sc = lerp(0.3, 1, e) * (1 + open * 0.6);
      im.style.transform = "translate(-50%,-50%) translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + sc.toFixed(3) + ") rotate(" + (Math.sin(t * 0.7 + i) * 2).toFixed(2) + "deg)";
      // still inside the glass at first: the clip opens just behind the creature (ease-in), so it presses through the edge
      var k = Math.pow(q, 2.2), pad = -g.H;
      im.parentNode.style.clipPath = q >= 1 || open > 0 ? "none" : "inset(" + [lerp(g.t, pad, k), lerp(g.W - g.l - g.w, pad, k), lerp(g.H - g.t - g.h, pad, k), lerp(g.l, pad, k)].map(function (v) { return v.toFixed(1) + "px"; }).join(" ") + ")";
      im.style.opacity = q <= 0 ? "0" : (1 - open).toFixed(3);
      im.style.setProperty("--sh", (smooth((q - 0.55) / 0.45) * 0.35).toFixed(3));
      if (c.blur) im.style.setProperty("--bl", c.blur + "px");
      if (q > 0.3 && !portalActs[i]) { portalActs[i] = true; act(i === 2 ? "jump" : "look"); }
    });
    pst.style.setProperty("--go", (smooth(p / 0.3) * (1 - open)).toFixed(3));
    pst.style.setProperty("--to", (1 - smooth((p - 0.58) / 0.1)).toFixed(3));
    pst.style.setProperty("--lo", smooth((p - 0.86) / 0.1).toFixed(3));
  }
  if (window.innerHeight > window.innerWidth && video.getAttribute("data-tall")) {
    var tall = video.getAttribute("data-tall");
    video.poster = video.getAttribute("data-tall-poster");
    $$("source", video).forEach(function (sr) { sr.src = tall + (sr.type === "video/webm" ? ".webm" : ".mp4"); });
    video.load();
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { var pr = video.play(); if (pr) pr.catch(function () {}); } else video.pause();
    }).observe(portal);
  }

  // 4. The hall: a dark warm gallery lit by its pictures (art director round 4). The scroll walks a smoothed
  //    camera down it; every frame opens from the wall by a continuous function of its distance (no triggers),
  //    and the caption is one quiet line that crossfades when a frame is centred.
  var hall = $(".hall"), hallOn = false, hallView = $("[data-hall-view]"), hallWorld = $("[data-hall-world]");
  var exList = $("[data-exhibits]"), exs = $$(".exhibit", exList), hallEnd = $("[data-hall-end]"), hud = $("[data-hud]"), hallSign = $("[data-hall-sign]");
  var hudIn = $("[data-hud-in]"), hudCount = $("[data-hud-count]"), hudT = 0;
  var HG = null, segs = [], activeEx = -2, lastHallAct = 0;
  var digits = function (n) { return lang === "en" ? String(n) : String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); };
  function hallBuild() {
    if (reduced || !hall) return;
    hallOn = true; hall.classList.add("on");
    hallWorld.appendChild(exList); hallWorld.appendChild(hallEnd);
    hallLayout();
    // far off screen the whole 3D view is switched off, so its GPU layers cost nothing on the other sections
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { hall.classList.toggle("near", es[0].isIntersecting); }, { rootMargin: "100% 0px" }).observe(hall);
    else hall.classList.add("near");
  }
  function hallLayout() {
    if (!hallOn) return;
    var st = $(".sticky", hall), W = st.clientWidth, Ht = st.clientHeight, nar = W < 760;
    var per = nar ? 560 : 900, hw = W / 2, top = Ht * 0.46, bot = Ht * 0.54;
    var ew = nar ? Math.min(W * 0.6, 250) : Math.min(W * 0.24, Ht * 0.4, 380);
    var G = nar ? 560 : Math.max(760, ew * 2.1), D0 = nar ? 820 : 1150;
    var len = D0 + (exs.length - 1) * G + G * 1.4;
    HG = { W: W, Ht: Ht, per: per, hw: hw, top: top, bot: bot, ew: ew, G: G, D0: D0, len: len, near: per * (nar ? 0.55 : 0.45) };
    hallView.style.setProperty("--per", per + "px");
    hall.style.setProperty("--ew", ew + "px");
    segs.forEach(function (sg) { sg.el.remove(); }); segs = [];
    var frag = document.createDocumentFragment();
    hallRoom(W, Ht, per, hw, top, bot, len);
    // arches: a portal every two frames, the corridor's rhythm
    for (var a = D0 + G * 1.5; a < len - G * 0.5; a += G * 2) {
      var el = document.createElement("i"); el.className = "seg arch"; el.style.width = W + "px"; el.style.height = (top + bot) + "px";
      el.style.transform = "translate3d(" + (-hw) + "px," + (-top) + "px," + (-a) + "px)"; frag.appendChild(el); segs.push({ el: el, z0: a, gone: false });
    }
    hallWorld.insertBefore(frag, hallWorld.firstChild);
    hallEnd.style.setProperty("--endw", W + "px"); hallEnd.style.setProperty("--endh", (top + bot) + "px");
    hallEnd.style.transform = "translate3d(" + (-hw) + "px," + (-top) + "px," + (-len) + "px)";
    exs.forEach(function (ex, i) { ex._d = D0 + i * G; ex._side = ex.getAttribute("data-side"); });
    activeEx = -2;
    scrubHall(progress(hall));
  }
  // The corridor's walls, floor and ceiling as ONE flat drawing in the same perspective as the 3D world.
  // They used to be ~70 3D pieces (one GPU layer each): ~500 MB on a Galaxy A26, a crashed tab and flicker.
  // Plain colour looks the same from every step, so only the pictures, arches and end wall still move in 3D.
  var room = null;
  function hallRoom(W, H, per, hw, top, bot, far) {
    if (!room) { room = document.createElementNS("http://www.w3.org/2000/svg", "svg"); room.setAttribute("class", "hall-room"); room.setAttribute("aria-hidden", "true"); room.setAttribute("preserveAspectRatio", "none"); hallView.insertBefore(room, hallWorld); }
    room.setAttribute("viewBox", "0 0 " + W + " " + H);
    var cx = W / 2, cy = top, k = per / (per + far), f = function (n) { return n.toFixed(1); };
    function P(x, y) { return f(cx + (x - cx) * k) + "," + f(cy + (y - cy) * k); }   // the same screen point, pushed back to the far end
    function quad(x0, y0, x1, y1, fill) { return '<polygon fill="' + fill + '" points="' + f(x0) + "," + f(y0) + " " + f(x1) + "," + f(y1) + " " + P(x1, y1) + " " + P(x0, y0) + '"/>'; }
    function wall(x, fill) { return '<polygon fill="' + fill + '" points="' + f(x) + ",0 " + P(x, 0) + " " + P(x, H) + " " + f(x) + "," + H + '"/>'; }
    var rail = cy - top + 0.7 * (top + bot), s = "";
    s += quad(0, 0, W, 0, "#170B0C");                                     // ceiling
    s += quad(0, H, W, H, "#24150F");                                     // floor
    for (var i = 1; i < 11; i++) { var x = W * i * 0.09 + W * 0.05; s += '<line stroke="#1C100B" stroke-width="2" x1="' + f(x) + '" y1="' + H + '" x2="' + P(x, H).replace(",", '" y2="') + '"/>'; }   // floor boards
    s += quad(W * 0.33, H, W * 0.67, H, "#B98A3E") + quad(W * 0.336, H, W * 0.664, H, "#8E3324");                             // the red runner, gold edged
    s += wall(0, "#2A1416") + wall(W, "#2A1416");                         // walls
    s += '<polygon fill="#1F0E10" points="0,' + f(rail) + " " + P(0, rail) + " " + P(0, H) + " 0," + H + '"/>';               // dark wainscot under the rail
    s += '<polygon fill="#1F0E10" points="' + W + "," + f(rail) + " " + P(W, rail) + " " + P(W, H) + " " + W + "," + H + '"/>';
    s += '<line stroke="#B98A3E" stroke-width="3" x1="0" y1="' + f(rail) + '" x2="' + P(0, rail).replace(",", '" y2="') + '"/>';   // gold rail
    s += '<line stroke="#B98A3E" stroke-width="3" x1="' + W + '" y1="' + f(rail) + '" x2="' + P(W, rail).replace(",", '" y2="') + '"/>';
    room.innerHTML = s;
  }
  function showHud(i) {
    clearTimeout(hudT);
    if (i < 0) { hud.classList.remove("on"); return; }
    hud.classList.add("on"); hudIn.classList.add("swap");
    hudT = setTimeout(function () {
      var pl = $(".placard", exs[i]), h = $("h3", pl), ps = $$("p:not(.pk)", pl), sp = $(".speak", pl);
      hudIn.innerHTML = h.outerHTML + (ps[0] ? ps[0].outerHTML : "") + (sp ? sp.outerHTML : "");
      hudCount.textContent = digits(i + 1) + " / " + digits(exs.length);
      hudIn.classList.remove("swap");
    }, 160);
  }
  function scrubHall(p) {
    if (!hallOn) return;
    var g = HG, cz = (g.len - g.per * 0.08) * clamp((p - 0.03) / 0.94, 0, 1);
    hallWorld.style.setProperty("--cz", cz.toFixed(1) + "px");
    hallSign.style.setProperty("--so", (1 - smooth(p / 0.05)).toFixed(3));
    // Only the stretch near the camera is drawn: every visible piece is a GPU layer, and the whole corridor at once
    // took ~850 MB on a Galaxy A26 and crashed the tab. Far pieces are tiny and dark, so hiding them doesn't show.
    var far = g.G * 5;
    segs.forEach(function (sg) { var d = sg.z0 - cz, gone = d < 4 || d > far; if (gone !== sg.gone) { sg.gone = gone; sg.el.classList.toggle("gone", gone); } });
    var best = -1, bestD = 1e9, yc = -g.Ht * 0.04;
    exs.forEach(function (ex, i) {
      var rel = ex._d - cz;
      var op = smooth((rel - 20) / 340) * (1 - smooth((rel - g.G * 3) / (g.G * 2)));   // passes softly; far ones melt into the dark before the walls end
      ex.style.opacity = op.toFixed(3);
      ex.style.visibility = op <= 0.001 ? "hidden" : "visible";
      ex.style.transform = ex._side === "a"
        ? "translate3d(" + (-g.hw + 3) + "px," + yc + "px," + (-ex._d) + "px) rotateY(90deg) translateY(-50%)"        // hung flat on the wall, 3px off it
        : "translate3d(" + (g.hw - 3) + "px," + yc + "px," + (-ex._d) + "px) rotateY(-90deg) translate(-100%,-50%)";
      var dd = Math.abs(rel - g.near * 1.3);
      if (rel > 80 && rel < g.near + g.G * 0.9 && dd < bestD) { bestD = dd; best = i; }
    });
    if (p < 0.035 || p > 0.985) best = -1;
    if (best !== activeEx) {
      activeEx = best; showHud(best);
      if (best >= 0 && Date.now() - lastHallAct > 1200) { lastHallAct = Date.now(); act(exs[best].getAttribute("data-act")); }
    }
  }
  function scrollToProgress(sec, p) {
    var top = sec.getBoundingClientRect().top + window.scrollY, len = sec.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + len * p, behavior: reduced ? "auto" : "smooth" });
  }

  // The slogan ribbon slides with the scroll (the two bands in opposite directions).
  var bandTracks = $$("[data-band-track]");
  function scrubBand() {
    var y = window.scrollY; if (y > window.innerHeight * 1.6) return;
    bandTracks.forEach(function (t) { t.style.setProperty("--bx", (+t.getAttribute("data-band-track") * (y * 0.22 + 20)).toFixed(1) + "px"); });
  }

  // Scroll parallax (2026-11-05). Every layer moves by the CSS `translate` property only (no layout, no repaint),
  // so it never fights the hover/reveal `transform`s. Positions come from the parent section (sections never move),
  // so a moved layer never feeds back into its own position. data-par > 0: drifts faster than the page (near);
  // < 0: slower (far). The hero props float by their depth; the gold rays behind everything drift slowest.
  // Decoration only: text never moves against text. Phones move them about a third as far (they sit in the margins).
  var pars = $$("[data-par]").map(function (el) { return { el: el, f: +el.getAttribute("data-par"), sec: el.closest("section"), v: null }; });
  var meadow = $(".meadow"), meadowV = null;
  function setY(o, v) { v = Math.round(v * 2) / 2; if (v !== o.v) { o.v = v; o.el.style.translate = "0 " + v + "px"; } }
  function scrubPar() {
    var y = window.scrollY, vh = window.innerHeight;
    var my = -((y * 0.12) % 160); if (meadow && my !== meadowV) { meadowV = my; meadow.style.translate = "0 " + my.toFixed(1) + "px"; }
    if (y < vh * 1.4) props.forEach(function (p) { if (!p._o) p._o = { el: p, v: null }; setY(p._o, -y * (+p.getAttribute("data-depth")) * 0.014); });
    for (var i = 0; i < pars.length; i++) {
      var o = pars[i], r = o.sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      setY(o, (r.top + r.height / 2 - vh / 2) * o.f * (narrow.matches ? 0.35 : 1));
    }
  }

  // 7. Gains wheel
  var gains = $(".gains"), skills = $$(".skill", gains), gainsPos = 0;
  function scrubGains(p) {
    var n = skills.length, raw = p * (n - 1), fl = Math.floor(raw), fr = raw - fl, s = rtl() ? -1 : 1;
    var pos = fl + fr * fr * (3 - 2 * fr);   // dwell on each card, then turn to the next
    var R = parseFloat(getComputedStyle($(".wheel", gains)).getPropertyValue("--R")) / 100 * window.innerHeight;
    var deg = (skills[0].offsetWidth * 1.06 / R) * 180 / Math.PI;   // cards sit side by side on the arc
    gainsPos = pos;
    skills.forEach(function (el, i) {
      var d = i - pos, a = Math.min(1, Math.abs(d));
      el.style.setProperty("--deg", (d * deg * s).toFixed(2) + "deg");
      el.style.setProperty("--sc", (1.1 - 0.16 * a).toFixed(3));
      el.style.setProperty("--op", Math.abs(d) > 2.2 ? 0 : (1 - 0.32 * a).toFixed(3));
      el.style.zIndex = String(10 - Math.round(Math.abs(d)));
      el.classList.toggle("on", Math.abs(d) < 0.5);
    });
  }
  $$("[data-wheel-step]").forEach(function (b) {
    b.addEventListener("click", function () {
      var n = skills.length, next = clamp(Math.round(gainsPos) + (+b.getAttribute("data-wheel-step")), 0, n - 1);
      scrollToProgress(gains, next / (n - 1));
    });
  });

  // One loop drives every scroll scene. Each eases toward the real scroll position (about 0.1 per frame),
  // so a mouse-wheel step becomes a glide instead of a jump. Big jumps (a nav link) snap.
  var scenes = [];   // filled at start (the try section is set up further down)
  var lastT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, ((now - lastT) / 1000) || 0.016); lastT = now;
    var k = 1 - Math.exp(-dt * 6.5);
    scrubBand(); scrubPar();
    for (var i = 0; i < scenes.length; i++) {
      var o = scenes[i], r = o.sec.getBoundingClientRect();
      if (r.bottom < -40 || r.top > window.innerHeight + 40) { o.cur = -1; continue; }
      var tgt = progress(o.sec), was = o.cur;
      o.cur = (o.cur < 0 || Math.abs(tgt - o.cur) > 0.3) ? tgt : o.cur + (tgt - o.cur) * k;
      if (o.live || Math.abs(o.cur - was) > 0.00002) o.fn(o.cur, now);
    }
  }
  function onScroll() {
    if (audio && !audio.paused && audioFrom && !onScreen(audioFrom)) { audio.pause(); if (playingBtn) playingBtn.classList.remove("playing"); }
    if (hintTimer && !onScreen(stage)) { clearTimeout(hintTimer); hintTimer = 0; }   // no late hint once the game is off screen
    if (sayEl.classList.contains("on") && Math.abs(window.scrollY - sayY) > 90) sayEl.classList.remove("on");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { portalLayout(); hallLayout(); scenes.forEach(function (o) { o.cur = -1; }); });

  // ---------- Kio's real voice, on tap only (also inside the hall HUD, which clones placards) ----------
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".speak");
    if (b) { ev.stopPropagation(); play(b.getAttribute("data-audio"), b); }
  });

  // ---------- 6. Try it with Kio ----------
  var trySec = $(".try"), tryScrolly = !reduced;
  if (tryScrolly) trySec.classList.add("scrolly");
  var stage = $("[data-stage]"), layers, spots, friend, world = "sea";
  function useWorld(w) {   // two worlds share the stage; only the shown one pans and plays
    world = w; stage.setAttribute("data-on", w);
    $$("[data-world]", stage).forEach(function (el) { el.hidden = el.getAttribute("data-world") !== w; });
    var el = $('[data-world="' + w + '"]', stage);
    layers = $$("[data-layer]", el); spots = $$("[data-spot]", el); friend = $("[data-friend]", el);
    $$("[data-go]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-go") === w ? "true" : "false"); });
  }
  useWorld("sea");
  var missionPic = $("[data-mission-pic]"), missionName = $("[data-mission-name]");
  var bubble = $("[data-try-bubble]"), resetBtn = $("[data-try-reset]"), soundBox = $("[data-try-sound]"), sparks = $(".sparks", stage);
  var LINES = {};
  $$("[data-k]", $("template[data-try-lines]").content).forEach(function (b) { LINES[b.getAttribute("data-k")] = { html: b.innerHTML, audio: b.getAttribute("data-audio") }; });
  var FRIENDS = { sea: ["friend-clownfish", "friend-sea_turtle", "friend-seahorse"], zoo: ["friend-lion", "friend-panda", "friend-penguin"] };
  var px = 0, hide = 2, found = false, seenOnce = false, hintTimer = 0, started = false, friendIx = 0;
  function say(k) {
    var l = LINES[k]; bubble.innerHTML = l.html; bubble.classList.remove("on"); void bubble.offsetWidth; bubble.classList.add("on");
    if (soundBox.checked && onScreen(stage)) play(l.audio);
  }
  function minX() { var lw = layers[1].offsetWidth; return Math.min(0, stage.clientWidth - lw); }
  function pan(x) {
    px = clamp(x, minX(), 0);
    layers.forEach(function (l) { l.style.setProperty("--x", (px * +l.getAttribute("data-layer")) + "px"); });
    if (!found && !seenOnce && inView(spots[hide])) { seenOnce = true; clearTimeout(hintTimer); say("seen"); }
  }
  function inView(el) { var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); var c = r.left + r.width / 2; return c > s.left + s.width * 0.12 && c < s.right - s.width * 0.08; }
  function placeFriend() {
    var sp = spots[hide];
    var leftPct = parseFloat(getComputedStyle(sp).left) / layers[1].offsetWidth * 100, wPct = sp.offsetWidth / layers[1].offsetWidth * 100;
    friend.style.left = (leftPct + wPct / 2 - 2.75) + "%";
    var f = FRIENDS[world][friendIx % FRIENDS[world].length];
    friend.src = missionPic.src = A + f + ".webp"; missionName.innerHTML = LINES[f].html;
  }
  function armHint() { clearTimeout(hintTimer); hintTimer = setTimeout(function () { if (!found && !seenOnce) { say("hint"); act("look"); } }, 6000); }
  function tryStart() { if (started) return; started = true; placeFriend(); if (!tryScrolly) pan(0); else scrubTry(); say("start"); armHint(); }
  $$("[data-spot]", stage).forEach(function (sp) {
    sp.addEventListener("click", function () {
      var i = spots.indexOf(sp);
      if (i < 0 || found || dragMoved > 6) return;
      if (!started) tryStart();
      if (i !== hide) {
        sp.classList.remove("nope"); void sp.offsetWidth; sp.classList.add("nope");
        say("wrong"); act("look"); armHint(); return;
      }
      found = true; clearTimeout(hintTimer);
      stage.classList.add("found"); sp.classList.add("hit");
      var fr = friend.getBoundingClientRect(), s = stage.getBoundingClientRect();
      $$("i", sparks).forEach(function (sk, j) {
        sk.style.left = (fr.left - s.left + fr.width * (0.1 + 0.4 * j)) + "px";
        sk.style.top = (fr.top - s.top - fr.height * (1.1 + (j % 2) * 0.4)) + "px";
      });
      say("found"); act("dance");
      resetBtn.hidden = false;
    });
  });
  // Sea or zoo: a quick fade, a fresh game in the new world (the friend hides at the far end again).
  $$("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () {
      var w = b.getAttribute("data-go"); if (w === world) return;
      stage.classList.add("swap"); clearTimeout(hintTimer);
      setTimeout(function () {
        useWorld(w); found = false; seenOnce = false; hide = 2; friendIx = 0; resetBtn.hidden = true;
        stage.classList.remove("found"); $$(".spot.hit", stage).forEach(function (s) { s.classList.remove("hit"); });
        placeFriend(); if (tryScrolly) scrubTry(); else pan(0);
        stage.classList.remove("swap"); started = true; say("start"); act("look"); armHint();
      }, 350);
    });
  });
  resetBtn.addEventListener("click", function () {
    found = false; seenOnce = false; stage.classList.remove("found"); resetBtn.hidden = true; spots.forEach(function (s) { s.classList.remove("hit"); });
    var n; do { n = Math.floor(Math.random() * spots.length); } while (n === hide || inView(spots[n]));
    hide = n; friendIx++;
    setTimeout(function () { placeFriend(); say("start"); act("look"); armHint(); }, 350);
  });
  function scrubTry(p) {
    if (!tryScrolly) return;
    var q = clamp(((p == null ? progress(trySec) : p) - 0.08) / 0.8, 0, 1);
    pan(minX() * q);
  }
  function tryNudge(dx) {   // drag or arrow keys: in scroll mode they move the page, so both inputs agree
    if (!tryScrolly) { pan(px + dx); return; }
    var len = trySec.offsetHeight - window.innerHeight, range = Math.abs(minX()) || 1;
    window.scrollBy(0, -dx * (len * 0.8) / range);
  }
  var dragging = false, dragX = 0, dragMoved = 0;
  stage.addEventListener("pointerdown", function (ev) { dragging = true; dragX = ev.clientX; dragMoved = 0; });
  window.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    var dx = ev.clientX - dragX; dragX = ev.clientX; dragMoved += Math.abs(dx);
    if (dragMoved > 6) stage.classList.add("dragging");
    tryNudge(dx);
  });
  window.addEventListener("pointerup", function () { dragging = false; stage.classList.remove("dragging"); setTimeout(function () { dragMoved = 0; }, 0); });
  stage.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowLeft") { tryNudge(80); ev.preventDefault(); } else if (ev.key === "ArrowRight") { tryNudge(-80); ev.preventDefault(); }
  });
  stage.setAttribute("tabindex", "0");
  window.addEventListener("resize", function () { if (!tryScrolly) pan(px); });

  // ---------- 8. Play, then rest ----------
  var steps = $$("[data-rest-step]"), shots = $$("[data-rest-img]"), restAt = 0;
  if ("IntersectionObserver" in window) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = +e.target.getAttribute("data-rest-step");
        if (n === restAt) return;
        restAt = n;
        steps.forEach(function (s) { s.classList.toggle("on", s === e.target); });
        shots.forEach(function (im) { im.classList.toggle("on", +im.getAttribute("data-rest-img") === n); });
        if (n === 2) act("dance");
      });
    }, { rootMargin: "-48% 0px -48% 0px" });
    steps.forEach(function (s) { sio.observe(s); });
  }

  // ---------- 10. Join: the golden ticket ----------
  // No form, no server: the button opens the parent's own email app with a ready message (in the page language).
  // Sending it is the parent's own clear opt-in. The ticket shines once and the line under it says what to do next.
  (function () {
    var btn = $("[data-join-btn]"); if (!btn) return;
    var ticket = $("[data-ticket]"), msg = $("[data-join-msg]"), tpl = $("template[data-join-lines]").content;
    function line(k) { var el = $('[data-k="' + k + '"] .' + lang, tpl); return el ? el.textContent : ""; }
    var ok = $("[data-join-ok]");
    function sync() {
      btn.setAttribute("aria-disabled", ok.checked ? "false" : "true");
      if (!ok.checked) { btn.href = "mailto:support@keryoza.com"; msg.textContent = ""; ticket.classList.remove("stamped"); }   // consent taken back: no leftover "email is open"
    }
    ok.addEventListener("change", sync); sync();
    btn.addEventListener("click", function (ev) {
      if (!ok.checked) { ev.preventDefault(); ok.focus(); return; }   // keyboard Enter skips the CSS block
      btn.href = "mailto:support@keryoza.com?subject=" + encodeURIComponent(line("subject")) + "&body=" + encodeURIComponent(line("body"));
      msg.innerHTML = $('[data-k="mail"]', tpl).innerHTML;
      ticket.classList.remove("stamped"); void ticket.offsetWidth; ticket.classList.add("stamped"); act("dance");
    });
    // a gentle tilt toward the pointer (desktop only)
    if (!reduced && window.matchMedia("(pointer: fine)").matches) {
      ticket.addEventListener("pointermove", function (ev) {
        var r = ticket.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
        ticket.classList.add("tilting"); ticket.style.setProperty("--ry", (x * 5).toFixed(2) + "deg"); ticket.style.setProperty("--rx", (-y * 4).toFixed(2) + "deg");
      });
      ticket.addEventListener("pointerleave", function () { ticket.classList.remove("tilting"); ticket.style.setProperty("--ry", "0deg"); ticket.style.setProperty("--rx", "0deg"); });
    }
  })();

  // ---------- Copy the email ----------
  var copyBtn = $("[data-copy]");
  function copied() {
    $("[data-copy-idle]", copyBtn).hidden = true; $("[data-copy-done]", copyBtn).hidden = false;
    setTimeout(function () { $("[data-copy-idle]", copyBtn).hidden = false; $("[data-copy-done]", copyBtn).hidden = true; }, 2200);
  }
  function selectMail() { var r = document.createRange(); r.selectNodeContents($("[data-mail]")); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  copyBtn.addEventListener("click", function () {
    var t = copyBtn.getAttribute("data-copy");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(copied, selectMail); else selectMail();
  });

  // ---------- Start ----------
  scenes = [
    { sec: portal, fn: scrubPortal, live: true },
    { sec: hall, fn: scrubHall }, { sec: gains, fn: scrubGains }, { sec: trySec, fn: scrubTry }
  ].map(function (o) { o.cur = -1; return o; });
  portalLayout();
  if (reduced) scrubPortal(0.6, 0); else { portal.classList.add("on"); requestAnimationFrame(loop); }
  hallBuild();
  if (location.hash === "#en" && root.getAttribute("lang") !== "en") location.replace("en/");   // old #en links
  setLang(root.getAttribute("lang") === "en" ? "en" : "ar");
})();
