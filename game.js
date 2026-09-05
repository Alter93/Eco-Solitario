'use strict';

const stage = document.getElementById('stage');
const player = document.getElementById('player');
const shadow = document.getElementById('shadow');
const joy = document.getElementById('joy');
const stick = document.getElementById('stick');
const stateLabel = document.getElementById('state');
const speedLabel = document.getElementById('speed');
const frameLabel = document.getElementById('frame');

const ctx = player.getContext('2d', {alpha: true, desynchronized: true});
ctx.imageSmoothingEnabled = false;

const W = 96, H = 128, CELL = 96, FRAME_COUNT = 54;
const GRAV = 1650;
const MAX_SPEED = 255;
const JUMP_SPEED = -650;
const STEP = 1 / 120;
const STOP_EPSILON = 0.35;
const FACE_EPSILON = 7;
const JOY_RADIUS = 42;
const JOY_DEADZONE = 0.12;
const RUN_THRESHOLD = 188;

const anim = {
  idle:   {frames: [0]},
  walk:   {frames: [6, 7, 8, 9, 10, 11], stride: 116},
  run:    {frames: [12, 13, 14, 15, 16, 17, 18, 19], stride: 156},
  jump:   {frames: [20, 21, 22, 23], fps: 14, once: true},
  air:    {frames: [24, 25, 26, 27], fps: 12},
  fall:   {frames: [28, 29, 30, 31], fps: 11},
  land:   {frames: [32, 33, 34, 35, 36, 37], fps: 16, once: true},
  shoot:  {frames: [38, 39, 40, 41, 42, 43], fps: 18, once: true},
  bat:    {frames: [44, 45, 46, 47, 48, 49], fps: 16, once: true},
  damage: {frames: [50, 51, 52, 53], fps: 12, once: true}
};

const sprite = new Image();
let spriteReady = false;
let lastFrame = -1;
let pendingFrame = 0;
sprite.onload = () => {
  spriteReady = true;
  if (sprite.naturalWidth && (sprite.naturalWidth !== FRAME_COUNT * CELL || sprite.naturalHeight !== H)) {
    console.warn(`Sprite sheet inatteso: ${sprite.naturalWidth}x${sprite.naturalHeight}`);
  }
  lastFrame = -1;
  drawFrame(pendingFrame);
};
sprite.onerror = () => console.warn('Sprite di Alter non disponibile.');
sprite.decoding = 'async';
sprite.src = './alter_master_sheet.png?v=098';

let x = 120, y = 0, previousX = 120, previousY = 0;
let vx = 0, vy = 0, face = 1;
let grounded = true;
let state = 'idle', animTime = 0, gaitPhase = 0, actionLeft = 0;
let joyAxis = 0, joyPointer = null, jumpQueued = false;
let last = null, accumulator = 0;
const keys = new Set();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function approach(current, target, delta) {
  if (current < target) return Math.min(current + delta, target);
  if (current > target) return Math.max(current - delta, target);
  return target;
}

function deadzone(value) {
  const magnitude = Math.abs(value);
  if (magnitude <= JOY_DEADZONE) return 0;
  return Math.sign(value) * clamp((magnitude - JOY_DEADZONE) / (1 - JOY_DEADZONE), 0, 1);
}

function snapToDevicePixel(value) {
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  return Math.round(value * dpr) / dpr;
}

function groundY() {
  return stage.clientHeight - 92 - H;
}

function drawFrame(frame) {
  frame = clamp(Math.floor(frame), 0, FRAME_COUNT - 1);
  pendingFrame = frame;
  if (!spriteReady || frame === lastFrame) return;

  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;

  // One source cell only. No CSS background-position, no neighbour-frame bleed.
  ctx.drawImage(sprite, frame * CELL, 0, CELL, H, 0, 0, W, H);
  lastFrame = frame;
}

function isGait(name) {
  return name === 'walk' || name === 'run';
}

function setState(next) {
  if (state === next) return;
  const wasGait = isGait(state);
  const nextIsGait = isGait(next);

  state = next;
  animTime = 0;

  // Preserve the exact gait phase between walk and run.
  if (!wasGait && nextIsGait) gaitPhase = 0;
  if (next === 'idle') gaitPhase = 0;
}

function startAction(next) {
  if (actionLeft > 0) return;
  setState(next);
  const sequence = anim[next];
  actionLeft = sequence.frames.length / sequence.fps + STEP;
}

function currentAxis() {
  const keyboard =
    Number(keys.has('ArrowRight') || keys.has('KeyD')) -
    Number(keys.has('ArrowLeft') || keys.has('KeyA'));
  return keyboard || joyAxis;
}

function chooseLocomotion() {
  if (!grounded) {
    setState(vy < -150 ? 'jump' : vy < 110 ? 'air' : 'fall');
    return;
  }

  const speed = Math.abs(vx);
  if (speed < 6) setState('idle');
  else if (speed >= RUN_THRESHOLD) setState('run');
  else setState('walk');
}

function advanceGait(distance) {
  if (!isGait(state) || !grounded || distance <= 0) return;
  gaitPhase = (gaitPhase + distance / anim[state].stride) % 1;
}

function frameForState() {
  const sequence = anim[state];

  if (state === 'idle') return sequence.frames[0];

  if (isGait(state)) {
    const index = Math.floor(gaitPhase * sequence.frames.length + 1e-9) % sequence.frames.length;
    return sequence.frames[index];
  }

  const n = Math.floor((animTime + 1e-9) * sequence.fps);
  const index = sequence.once
    ? Math.min(n, sequence.frames.length - 1)
    : n % sequence.frames.length;
  return sequence.frames[index];
}

function simulate(dt) {
  previousX = x;
  previousY = y;
  animTime += dt;
  actionLeft = Math.max(0, actionLeft - dt);

  const axis = currentAxis();

  if (actionLeft <= 0) {
    const target = axis * MAX_SPEED;
    const reversing = axis && vx && Math.sign(axis) !== Math.sign(vx);
    const acceleration = axis ? (reversing ? 2850 : 1780) : 2500;
    vx = approach(vx, target, acceleration * dt);

    if (!axis && Math.abs(vx) <= STOP_EPSILON) vx = 0;
    if (Math.abs(vx) > FACE_EPSILON) face = Math.sign(vx);
  } else {
    vx *= Math.pow(0.10, dt);
    if (Math.abs(vx) <= STOP_EPSILON) vx = 0;
  }

  if (jumpQueued && grounded && actionLeft <= 0) {
    vy = JUMP_SPEED;
    grounded = false;
    setState('jump');
  }
  jumpQueued = false;

  const beforeX = x;
  x += vx * dt;
  y += vy * dt;
  vy += GRAV * dt;

  const minX = 26;
  const maxX = Math.max(minX, stage.clientWidth - W - 26);
  if (x < minX) {
    x = minX;
    vx = Math.max(0, vx);
  }
  if (x > maxX) {
    x = maxX;
    vx = Math.min(0, vx);
  }

  const gy = groundY();
  if (y >= gy) {
    const landed = !grounded && vy > 0;
    y = gy;
    vy = 0;
    grounded = true;
    if (landed && actionLeft <= 0) startAction('land');
  } else {
    grounded = false;
  }

  if (actionLeft <= 0) {
    chooseLocomotion();
    advanceGait(Math.abs(x - beforeX));
  }
}

function render(alpha) {
  const rx = previousX + (x - previousX) * alpha;
  const ry = previousY + (y - previousY) * alpha;
  const drawX = snapToDevicePixel(rx);
  const drawY = snapToDevicePixel(ry);

  player.style.transform = `translate3d(${drawX}px,${drawY}px,0) scaleX(${face})`;
  shadow.style.transform = `translate3d(${snapToDevicePixel(rx + 22)}px,${snapToDevicePixel(groundY() + H - 5)}px,0)`;
  shadow.style.opacity = grounded ? '0.55' : '0.22';

  const frame = frameForState();
  drawFrame(frame);
  stateLabel.textContent = state.toUpperCase();
  speedLabel.textContent = Math.round(Math.abs(vx));
  frameLabel.textContent = frame;
}

function loop(now) {
  requestAnimationFrame(loop);

  if (document.hidden || !stage.clientWidth || !stage.clientHeight) {
    last = null;
    return;
  }

  if (last === null) last = now;
  accumulator += Math.min(Math.max((now - last) / 1000, 0), 0.1);
  last = now;

  while (accumulator + 1e-9 >= STEP) {
    simulate(STEP);
    accumulator = Math.max(0, accumulator - STEP);
  }

  render(accumulator / STEP);
}

function resetInput() {
  const pointer = joyPointer;
  joyPointer = null;
  if (pointer !== null && joy.hasPointerCapture(pointer)) joy.releasePointerCapture(pointer);
  joyAxis = 0;
  jumpQueued = false;
  keys.clear();
  stick.style.transform = 'translate3d(0,0,0)';
}

function resetPosition() {
  resetInput();
  x = Math.max(40, stage.clientWidth * 0.22);
  y = groundY();
  previousX = x;
  previousY = y;
  vx = 0;
  vy = 0;
  face = 1;
  grounded = true;
  state = 'idle';
  animTime = 0;
  gaitPhase = 0;
  actionLeft = 0;
  accumulator = 0;
  last = null;
  lastFrame = -1;
  drawFrame(0);
  render(1);
}

function moveJoystick(event) {
  const rect = joy.getBoundingClientRect();
  const raw = event.clientX - rect.left - rect.width / 2;
  const dx = clamp(raw, -JOY_RADIUS, JOY_RADIUS);
  stick.style.transform = `translate3d(${dx}px,0,0)`;
  joyAxis = deadzone(dx / JOY_RADIUS);
}

joy.addEventListener('pointerdown', event => {
  if (joyPointer !== null) return;
  event.preventDefault();
  joyPointer = event.pointerId;
  joy.setPointerCapture(event.pointerId);
  moveJoystick(event);
});

joy.addEventListener('pointermove', event => {
  if (event.pointerId === joyPointer) {
    event.preventDefault();
    moveJoystick(event);
  }
});

for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  joy.addEventListener(type, event => {
    if (event.pointerId === joyPointer) resetInput();
  });
}

function bindAction(id, action) {
  document.getElementById(id).addEventListener('pointerdown', event => {
    event.preventDefault();
    action();
  });
}

bindAction('jump', () => { jumpQueued = true; });
bindAction('shoot', () => startAction('shoot'));
bindAction('bat', () => startAction('bat'));
bindAction('damage', () => startAction('damage'));
document.getElementById('reset').addEventListener('click', resetPosition);

window.addEventListener('keydown', event => {
  const handled = ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'KeyJ', 'KeyK', 'KeyH'];
  if (handled.includes(event.code)) event.preventDefault();
  keys.add(event.code);

  if (!event.repeat) {
    if (event.code === 'Space') jumpQueued = true;
    if (event.code === 'KeyJ') startAction('shoot');
    if (event.code === 'KeyK') startAction('bat');
    if (event.code === 'KeyH') startAction('damage');
  }
});

window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', resetInput);
window.addEventListener('resize', resetPosition);
document.addEventListener('visibilitychange', () => {
  resetInput();
  last = null;
  accumulator = 0;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(error =>
    console.warn('Modalità offline non disponibile:', error)
  );
}

resetPosition();
requestAnimationFrame(loop);
