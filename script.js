const canvasViewport = document.getElementById("canvas-viewport");
const canvas = document.getElementById("canvas");
const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const detailsPane = document.querySelector(".details-pane");




sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});




const offset = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2
};

  
const applyOffset = () => {
  canvas.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
  canvasViewport.style.backgroundPosition = `${offset.x}px ${offset.y}px`;
}

applyOffset();

let recentMoves = [];


const computeVelocity = () => {
  if (recentMoves.length < 2) return {x: 0, y: 0};
  const first = recentMoves[0];
  const last = recentMoves[recentMoves.length - 1];
  const dt = last.t - first.t;
  if (dt === 0) return {x: 0, y: 0};
  return {
    x: (last.x - first.x) / dt,
    y: (last.y - first.y) / dt
  };
};


let momentumVelocity = {x: 0, y: 0};
let momentumFrameId = null;

const FRICTION = 0.8;
const MIN_VELOCITY = 0.01;


function momentumStep() {
  // Advance position by velocity. At ~60fps, ~16ms per frame.
  offset.x += momentumVelocity.x * 16;
  offset.y += momentumVelocity.y * 16;
  applyOffset();

  momentumVelocity.x *= FRICTION;
  momentumVelocity.y *= FRICTION;

  const speed = Math.hypot(momentumVelocity.x, momentumVelocity.y);
  if (speed < MIN_VELOCITY) {
    momentumFrameId = null;
    return;
  }

  momentumFrameId = requestAnimationFrame(momentumStep);
}


let panning = false,
    panStart,
    offsetStart;


canvasViewport.addEventListener("pointerdown", e => {
  if (momentumFrameId !== null) {
    cancelAnimationFrame(momentumFrameId);
    momentumFrameId = null;
  }
  recentMoves = [];

  panning = true;
  panStart = {x: e.clientX, y: e.clientY};
  offsetStart = {...offset};
  canvasViewport.setPointerCapture(e.pointerId);
});


canvasViewport.addEventListener("pointermove", e => {
  if (!panning) return;
  offset.x = offsetStart.x + (e.clientX - panStart.x);
  offset.y = offsetStart.y + (e.clientY - panStart.y);
  applyOffset();

  const now = performance.now();
  recentMoves.push({ t: now, x: e.clientX, y: e.clientY });
  recentMoves = recentMoves.filter(m => now - m.t < 100);
});


canvasViewport.addEventListener("pointerup", e => {
  panning = false;
  canvasViewport.releasePointerCapture(e.pointerId);

  momentumVelocity = computeVelocity();
  const speed = Math.hypot(momentumVelocity.x, momentumVelocity.y);
  if (speed > MIN_VELOCITY) {
    momentumFrameId = requestAnimationFrame(momentumStep);
  }
});




const paneOffset = {x: 0, y: 0};


const applyPaneOffset = () => {
  detailsPane.style.transform = `translate(${paneOffset.x}px, ${paneOffset.y}px)`;
}


let paneDragging = false,
    paneRect,
    paneDragStart,
    paneOffsetStart;


detailsPane.addEventListener("pointerdown", e => {
  paneDragging = true;
  paneRect = detailsPane.getBoundingClientRect();
  paneDragStart = {x: e.clientX, y: e.clientY};
  paneOffsetStart = {...paneOffset};
  detailsPane.setPointerCapture(e.pointerId);
});


const clamp = (n, min, max) => Math.min(max, Math.max(min, n));


detailsPane.addEventListener("pointermove", e => {
  if (!paneDragging) return;

  const rawX = paneOffsetStart.x + (e.clientX - paneDragStart.x);
  const rawY = paneOffsetStart.y + (e.clientY - paneDragStart.y);

  paneOffset.x = clamp(rawX, -(window.innerWidth - paneRect.width), 0);
  paneOffset.y = clamp(rawY, 0, window.innerHeight - paneRect.height);

  applyPaneOffset();
});


detailsPane.addEventListener("pointerup", e => {
  paneDragging = false;
  detailsPane.releasePointerCapture(e.pointerId);
});
