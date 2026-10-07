const SIZE = 72;   // taille d'une face
const STEP = 76;   // écart entre deux petits cubes

// Chaque face : sa couleur et sa rotation
const FACES = [
  { id: "f", color: "green",  normal: { x: 0,  y: 0,  z: 1 },  transform: "rotateY(0deg)" },
  { id: "b", color: "blue",   normal: { x: 0,  y: 0,  z: -1 }, transform: "rotateY(180deg)" },
  { id: "r", color: "red",    normal: { x: 1,  y: 0,  z: 0 },  transform: "rotateY(90deg)" },
  { id: "l", color: "orange", normal: { x: -1, y: 0,  z: 0 },  transform: "rotateY(-90deg)" },
  { id: "u", color: "white",  normal: { x: 0,  y: -1, z: 0 },  transform: "rotateX(90deg)" },
  { id: "d", color: "yellow", normal: { x: 0,  y: 1,  z: 0 },  transform: "rotateX(-90deg)" },
];
  


const cubeEl = document.getElementById("cube");

function createCubie(x, y, z) {
  const cubie = document.createElement("div");
  cubie.className = "cubie";
  cubie.style.transform =
    `translate3d(${x * STEP}px, ${y * STEP}px, ${z * STEP}px)`;

  for (const face of FACES) {
    const el = document.createElement("div");
    el.className = "face";
    // Une face est colorée seulement si elle est à l'extérieur du cube
const isOutside =
  x === face.normal.x && face.normal.x !== 0 ||
  y === face.normal.y && face.normal.y !== 0 ||
  z === face.normal.z && face.normal.z !== 0;

el.style.background = isOutside ? face.color : "#111";
el.dataset.face = face.id;
if (isOutside) el.dataset.sticker = "1";
    el.style.transform = `${face.transform} translateZ(${SIZE / 2}px)`;
    cubie.appendChild(el);
  }
  return cubie;
}

// Test : un seul petit cube au centre
const cubies = [];

function buildCube() {
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const el = createCubie(x, y, z);
        cubeEl.appendChild(el);
        cubies.push({
          el, x, y, z,
          transform: el.style.transform,
          normals: Object.fromEntries(FACES.map((f) => [f.id, { ...f.normal }])),
        });
      }
    }
  }
}

buildCube();
// axis : "x", "y" ou "z"
// layer : -1, 0 ou 1 (quelle tranche)
// dir : 1 ou -1 (sens du quart de tour)
function rotateVec(v, axis, dir) {
  const { x, y, z } = v;
  if (axis === "x") return { x, y: -dir * z, z: dir * y };
  if (axis === "y") return { x: dir * z, y, z: -dir * x };
  return { x: -dir * y, y: dir * x, z };
}

function rotateLayer(axis, layer, dir) {
  const angle = 90 * dir;

  for (const c of cubies) {
    if (c[axis] !== layer) continue;

    c.transform = `rotate${axis.toUpperCase()}(${angle}deg) ${c.transform}`;
    c.el.style.transform = c.transform;

    const p = rotateVec(c, axis, dir);
    c.x = p.x; c.y = p.y; c.z = p.z;

    for (const id in c.normals) {
      c.normals[id] = rotateVec(c.normals[id], axis, dir);
    }
  }
}
let animating = false;

const moveHistory = [];
let locked = false;
const STORAGE_KEY = "rubiks-cube-state";

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(moveHistory));
  } catch (e) {
    // stockage indisponible : on ignore
  }
}
const movesEl = document.getElementById("moves");

function updateMoves() {
  movesEl.textContent = moveHistory.length;
  saveState();
}
function animateLayer(axis, layer, dir, duration = 300, record = true) {
  return new Promise((resolve) => {
    if (animating) return resolve();
    animating = true;

    const moving = cubies.filter((c) => c[axis] === layer);
    const start = performance.now();

    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const angle = 90 * dir * eased;

      for (const c of moving) {
        c.el.style.transform = `rotate${axis.toUpperCase()}(${angle}deg) ${c.transform}`;
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotateLayer(axis, layer, dir);
        if (record) moveHistory.push({ axis, layer, dir });
        updateMoves();
        animating = false;
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}
const pivotEl = document.getElementById("pivot");
const stageEl = document.getElementById("stage");

let rotX = -25;
let rotY = -35;
let dragging = false;
let lastX = 0;
let lastY = 0;

function updateView() {
  pivotEl.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

stageEl.addEventListener("pointerdown", (e) => {
  // Plus tard, glisser sur une pastille tournera une face.
  // Pour l'instant, on ne gère que le fond.
  if (e.target.closest(".face")) return;
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  stageEl.setPointerCapture(e.pointerId);
});

stageEl.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  rotY += (e.clientX - lastX) * 0.5;
  rotX -= (e.clientY - lastY) * 0.5;
  lastX = e.clientX;
  lastY = e.clientY;
  updateView();
});

stageEl.addEventListener("pointerup", () => {
  dragging = false;
});
const AXES = ["x", "y", "z"];

function unit(axis, sign = 1) {
  return { x: axis === "x" ? sign : 0, y: axis === "y" ? sign : 0, z: axis === "z" ? sign : 0 };
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// {x:0, y:-1, z:0} -> "y"
function axisOf(v) {
  return AXES.find((a) => Math.round(v[a]) !== 0);
}

// Où apparaît un vecteur 3D à l'écran, selon la rotation de la vue
function toScreen(v) {
  const a = (rotX * Math.PI) / 180;
  const b = (rotY * Math.PI) / 180;
  const x1 = v.x * Math.cos(b) + v.z * Math.sin(b);
  const z1 = -v.x * Math.sin(b) + v.z * Math.cos(b);
  const y1 = v.y * Math.cos(a) - z1 * Math.sin(a);
  return { x: x1, y: y1 };
}

// Glissement (dx, dy) sur une pastille -> mouvement de couche
function moveFromDrag(cubie, faceId, dx, dy) {
  const n = cubie.normals[faceId];
  const nAxis = axisOf(n);

  // Quelle direction de la face est la plus proche du glissement ?
  let best = null;
  for (const tAxis of AXES) {
    if (tAxis === nAxis) continue;
    const s = toScreen(unit(tAxis));
    const dot = s.x * dx + s.y * dy;
    if (!best || Math.abs(dot) > Math.abs(best.dot)) best = { tAxis, dot };
  }

  const t = unit(best.tAxis, Math.sign(best.dot));
  const rAxis = AXES.find((a) => a !== nAxis && a !== best.tAxis);

  // Sens de rotation : règle de la main droite
  const c = cross(unit(rAxis), n);
  const dir = c.x * t.x + c.y * t.y + c.z * t.z;

  animateLayer(rAxis, cubie[rAxis], dir);
}
let grab = null;

stageEl.addEventListener("pointerdown", (e) => {
    if (locked) return;
  const faceEl = e.target.closest(".face");
  if (!faceEl || !faceEl.dataset.sticker) return;
  const cubie = cubies.find((c) => c.el === faceEl.parentElement);
  grab = { cubie, faceId: faceEl.dataset.face, x: e.clientX, y: e.clientY };
  stageEl.setPointerCapture(e.pointerId);
});

stageEl.addEventListener("pointermove", (e) => {
  if (!grab) return;
  const dx = e.clientX - grab.x;
  const dy = e.clientY - grab.y;
  if (Math.hypot(dx, dy) < 12) return; // petit seuil avant de décider
  moveFromDrag(grab.cubie, grab.faceId, dx, dy);
  grab = null;
});

stageEl.addEventListener("pointerup", () => { grab = null; });
stageEl.addEventListener("pointercancel", () => { grab = null; });
document.getElementById("undoBtn").addEventListener("click", () => {
  if (animating || locked || moveHistory.length === 0) return;
  const m = moveHistory.pop();
  updateMoves();
  animateLayer(m.axis, m.layer, -m.dir, 300, false); // sens inverse, non enregistré
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  if (animating || locked) return;
  if (moveHistory.length > 0 &&
      !(await confirmAction("Réinitialiser le cube ? Tous les mouvements seront effacés."))) return;
  cubies.length = 0;
  cubeEl.innerHTML = "";
  moveHistory.length = 0;
  updateMoves();
  buildCube();
});
async function scramble(count = 20) {
  if (animating || locked) return;
  locked = true; // bloque les glissements pendant le mélange

  let lastAxis = null;
  for (let i = 0; i < count; i++) {
    // évite deux mouvements de suite sur le même axe
    let axis;
    do {
      axis = AXES[Math.floor(Math.random() * 3)];
    } while (axis === lastAxis);
    lastAxis = axis;

    const layer = Math.floor(Math.random() * 3) - 1; // -1, 0 ou 1
    const dir = Math.random() < 0.5 ? -1 : 1;

    await animateLayer(axis, layer, dir, 120); // attend la fin du mouvement
  }

  locked = false;
}

document.getElementById("scrambleBtn").addEventListener("click", async () => {
  if (animating || locked) return;
  if (moveHistory.length > 0 &&
      !(await confirmAction("Mélanger le cube maintenant ?"))) return;
  scramble();
});

function confirmAction(message) {
  return new Promise((resolve) => {
    confirmText.textContent = message;
    confirmModal.onclose = () => resolve(false); // Échap = refus
    document.getElementById("confirmYes").onclick = () => {
      confirmModal.close();
      resolve(true);
    };
    document.getElementById("confirmNo").onclick = () => confirmModal.close();
    confirmModal.showModal();
  });
}
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return;

    for (const m of saved) {
      const valid =
        AXES.includes(m.axis) && [-1, 0, 1].includes(m.layer) && (m.dir === 1 || m.dir === -1);
      if (!valid) continue;
      rotateLayer(m.axis, m.layer, m.dir); // rejoué sans animation
      moveHistory.push(m);
    }
    updateMoves();
  } catch (e) {
    // sauvegarde illisible : on repart d'un cube résolu
  }
}

loadState();