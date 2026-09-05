'use strict';

const game = document.querySelector('#game');
const P = document.querySelector('#player'), SH = document.querySelector('#shadow');
const F = document.querySelector('#far'), M = document.querySelector('#mid'), R = document.querySelector('#fore');
const J = document.querySelector('#joy'), S = document.querySelector('#stick');

const GRAV = 1550, MOVE = 245, JUMP = -650;
const W = 96, H = 128, CELL = 96, FRAME_COUNT = 54;
const STEP = 1 / 120;
const WALK_STRIDE = 118;
const STOP_EPSILON = 0.35;
const FACE_EPSILON = 10;
const JOY_RADIUS = 38;
const JOY_DEADZONE = 0.14;

const anim = {
  idle: {f: [0]},
  walk: {f: [6, 7, 8, 9, 10, 11], distance: WALK_STRIDE},
  jump: {f: [20, 21, 22, 23], fps: 14, once: true},
  air: {f: [24, 25, 26, 27], fps: 12},
  fall: {f: [28, 29, 30, 31], fps: 11},
  land: {f: [32, 33, 34, 35, 36, 37], fps: 16, once: true},
  shoot: {f: [38, 39, 40, 41, 42, 43], fps: 18, once: true},
  bat: {f: [44, 45, 46, 47, 48, 49], fps: 16, once: true},
  damage: {f: [50, 51, 52, 53], fps: 12, once: true}
};

let px = 0, py = 0, vx = 0, vy = 0, face = 1, world = 0, ammo = 12;
let previousX = 0, previousY = 0, previousWorld = 0;
let onGround = false, state = 'idle', animTime = 0, actionLeft = 0;
let gaitDistance = 0;
let joyAxis = 0, jumpQueued = false, joyPointer = null;
let last = null, accumulator = 0, initialized = false, platforms = [];
const keys = new Set();

const CTX = P && typeof P.getContext === 'function'
  ? P.getContext('2d', {alpha: true, desynchronized: true})
  : null;

let spriteReady = false;
let lastDrawnFrame = -1;
let pendingFrame = 0;
const sprite = typeof Image !== 'undefined' ? new Image() : null;

if (CTX) {
  CTX.imageSmoothingEnabled = false;
}

if (sprite) {
  sprite.onload = () => {
    spriteReady = true;
    lastDrawnFrame = -1;
    setFrame(pendingFrame);
  };
  sprite.onerror = () => console.warn('Sprite di Alter non disponibile.');
  sprite.decoding = 'async';
  sprite.src = './alter_master_sheet.png';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function approach(current, target, delta) {
  if (current < target) return Math.min(current + delta, target);
  if (current > target) return Math.max(current - delta, target);
  return target;
}

function snapToDevicePixel(value) {
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  return Math.round(value * dpr) / dpr;
}

function applyDeadzone(value) {
  const magnitude = Math.abs(value);
  if (magnitude <= JOY_DEADZONE) return 0;
  const normalized = (magnitude - JOY_DEADZONE) / (1 - JOY_DEADZONE);
  return Math.sign(value) * clamp(normalized, 0, 1);
}

function setFrame(frame) {
  frame = clamp(Math.floor(frame), 0, FRAME_COUNT - 1);
  pendingFrame = frame;
  if (!CTX || !spriteReady || frame === lastDrawnFrame) return;

  CTX.clearRect(0, 0, W, H);
  CTX.imageSmoothingEnabled = false;

  // Draw exactly one 96x128 cell into its own canvas.
  // This completely prevents neighbouring sprite cells from bleeding in on iOS/GPU transforms.
  CTX.drawImage(sprite, frame * CELL, 0, CELL, H, 0, 0, W, H);
  lastDrawnFrame = frame;
}

function setState(next) {
  if (state === next) return;
  state = next;
  animTime = 0;
  if (next === 'idle') gaitDistance = 0;
}

function startAction(next) {
  setState(next);
  animTime = 0;
  const sequence = anim[next];
  actionLeft = sequence.f.length / sequence.fps + STEP;
}

function chooseMovement() {
  if (!onGround) {
    setState(vy < -140 ? 'jump' : vy < 100 ? 'air' : 'fall');
    return;
  }
  setState(Math.abs(vx) > 7 ? 'walk' : 'idle');
}

function currentInputAxis() {
  const keyboard =
    Number(keys.has('ArrowRight') || keys.has('KeyD')) -
    Number(keys.has('ArrowLeft') || keys.has('KeyA'));
  return keyboard || joyAxis;
}

function resetInput() {
  const pointer = joyPointer;
  joyPointer = null;
  if (pointer !== null && J.hasPointerCapture(pointer)) J.releasePointerCapture(pointer);
  joyAxis = 0;
  jumpQueued = false;
  keys.clear();
  S.style.transform = 'translate3d(0px,0,0)';
}

function layout() {
  resetInput();
  last = null;
  accumulator = 0;

  if (!game.clientWidth || !game.clientHeight) return;

  const bounds = game.getBoundingClientRect();
  platforms = [...document.querySelectorAll('.platform')].map(element => {
    const rect = element.getBoundingClientRect();
    return {x: rect.left - bounds.left, y: rect.top - bounds.top, w: rect.width};
  });

  px = game.clientWidth * .18;
  py = platforms[0].y - H;
  vx = 0;
  vy = 0;
  onGround = true;
  state = 'idle';
  animTime = 0;
  actionLeft = 0;
  gaitDistance = 0;
  previousX = px;
  previousY = py;
  previousWorld = world;
  initialized = true;
  setFrame(0);
  render(1);
}

function collide(oldY) {
  const wasGrounded = onGround;
  onGround = false;
  const footBefore = oldY + H;
  const footNow = py + H;

  for (const platform of platforms) {
    const overlaps = px + W * .68 > platform.x && px + W * .32 < platform.x + platform.w;
    if (overlaps && vy >= 0 && footBefore <= platform.y + .5 && footNow >= platform.y) {
      py = platform.y - H;
      onGround = true;
      break;
    }
  }

  const floor = game.clientHeight * .88;
  if (py + H >= floor) {
    py = floor - H;
    onGround = true;
  }

  if (onGround) {
    vy = 0;
    if (!wasGrounded && !actionLeft) startAction('land');
  }
}

function simulate(dt) {
  previousX = px;
  previousY = py;
  previousWorld = world;

  animTime += dt;
  actionLeft = Math.max(0, actionLeft - dt);

  const direction = currentInputAxis();

  if (!actionLeft) {
    const target = direction * MOVE;
    const reversing = direction && vx && Math.sign(direction) !== Math.sign(vx);
    const acceleration = direction ? (reversing ? 2450 : 1550) : 2250;
    vx = approach(vx, target, acceleration * dt);

    if (!direction && Math.abs(vx) <= STOP_EPSILON) vx = 0;
    if (Math.abs(vx) > FACE_EPSILON) face = Math.sign(vx);
  } else {
    vx *= Math.pow(.18, dt);
    if (Math.abs(vx) <= STOP_EPSILON) vx = 0;
  }

  if (jumpQueued && onGround && !actionLeft) {
    vy = JUMP;
    onGround = false;
    setState('jump');
  }
  jumpQueued = false;

  const oldX = px;
  const oldY = py;

  px += vx * dt;
  py += vy * dt;
  vy += GRAV * dt;

  const min = 65;
  const max = Math.max(min, game.clientWidth * .50);

  if (px < min) {
    px = min;
    vx = Math.max(0, vx);
  }

  if (px > max) {
    world += px - max;
    px = max;
  }

  collide(oldY);

  if (!actionLeft) {
    chooseMovement();
    if (state === 'walk' && onGround) {
      gaitDistance += Math.abs(px - oldX);
    }
  }
}

function frameForState() {
  const sequence = anim[state];

  if (state === 'idle') return sequence.f[0];

  if (state === 'walk') {
    const phase = ((gaitDistance % sequence.distance) / sequence.distance);
    const index = Math.floor(phase * sequence.f.length + 1e-9) % sequence.f.length;
    return sequence.f[index];
  }

  const frame = Math.floor((animTime + 1e-9) * sequence.fps);
  const index = sequence.once
    ? Math.min(frame, sequence.f.length - 1)
    : frame % sequence.f.length;
  return sequence.f[index];
}

function render(alpha) {
  const x = previousX + (px - previousX) * alpha;
  const y = previousY + (py - previousY) * alpha;
  const scroll = previousWorld + (world - previousWorld) * alpha;

  const drawX = snapToDevicePixel(x);
  const drawY = snapToDevicePixel(y);

  P.style.transform = `translate3d(${drawX}px, ${drawY}px, 0) scaleX(${face})`;
  SH.style.transform = `translate3d(${snapToDevicePixel(x + W * .24)}px, ${snapToDevicePixel(y + H - 5)}px, 0)`;
  SH.style.opacity = onGround ? '.7' : '.2';

  F.style.backgroundPositionX = `${-scroll * .10}px`;
  M.style.backgroundPositionX = `${-scroll * .30}px`;
  R.style.backgroundPositionX = `${-scroll * .66}px`;

  setFrame(frameForState());
}

function update(now) {
  requestAnimationFrame(update);

  if (document.hidden || !game.clientWidth || !game.clientHeight) {
    last = null;
    return;
  }

  if (!initialized) layout();
  if (last === null) last = now;

  accumulator += Math.min(Math.max((now - last) / 1000, 0), .1);
  last = now;

  while (accumulator + 1e-9 >= STEP) {
    simulate(STEP);
    accumulator = Math.max(0, accumulator - STEP);
  }

  render(accumulator / STEP);
}

function moveJoystick(event) {
  const rect = J.getBoundingClientRect();
  const rawDx = event.clientX - rect.left - rect.width / 2;
  const dx = clamp(rawDx, -JOY_RADIUS, JOY_RADIUS);

  S.style.transform = `translate3d(${dx}px,0,0)`;
  joyAxis = applyDeadzone(dx / JOY_RADIUS);
}

J.addEventListener('pointerdown', event => {
  if (joyPointer !== null) return;
  event.preventDefault();
  joyPointer = event.pointerId;
  J.setPointerCapture(joyPointer);
  moveJoystick(event);
});

J.addEventListener('pointermove', event => {
  if (event.pointerId === joyPointer) {
    event.preventDefault();
    moveJoystick(event);
  }
});

for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  J.addEventListener(type, event => {
    if (event.pointerId === joyPointer) resetInput();
  });
}

function muzzle() {
  const flash = document.createElement('div');
  flash.className = 'muzzle';
  flash.style.left = `${px + (face > 0 ? W - 5 : -18)}px`;
  flash.style.top = `${py + 55}px`;
  game.appendChild(flash);
  setTimeout(() => flash.remove(), 80);
}

function bullet() {
  const element = document.createElement('div');
  const direction = face;
  let x = px + (direction > 0 ? W - 4 : -12);
  let started = performance.now();
  let previous = started;

  element.className = 'projectile';
  element.style.left = `${x}px`;
  element.style.top = `${py + 62}px`;
  game.appendChild(element);

  function fly(now) {
    x += direction * 760 * Math.min((now - previous) / 1000, .1);
    previous = now;
    element.style.left = `${x}px`;

    if (now - started < 1200 && x > -30 && x < game.clientWidth + 30) {
      requestAnimationFrame(fly);
    } else {
      element.remove();
    }
  }

  requestAnimationFrame(fly);
}

function shoot() {
  if (ammo <= 0 || actionLeft) return;
  document.querySelector('#ammo').textContent = `${--ammo}/12`;
  startAction('shoot');
  muzzle();
  bullet();
}

function hit() {
  if (actionLeft) return;
  startAction('bat');

  const effect = document.createElement('div');
  effect.className = 'hitfx';
  effect.style.left = `${px + (face > 0 ? W - 4 : -46)}px`;
  effect.style.top = `${py + 38}px`;
  game.appendChild(effect);
  effect.animate(
    [{transform: 'scale(.3)', opacity: 1}, {transform: 'scale(1.3)', opacity: 0}],
    {duration: 280}
  );
  setTimeout(() => effect.remove(), 290);
}

let radioOpen = false;
let lineIndex = 0;
const lines = [
  'Segnali deboli... ma sei ancora lì?',
  'Finché ascolti, non sei solo.',
  'Qualcuno trasmette ancora.',
  'Alter... resta sulla frequenza.'
];

function radio() {
  radioOpen = !radioOpen;
  document.querySelector('#radioBox').style.display = radioOpen ? 'block' : 'none';
  if (radioOpen) document.querySelector('#line').textContent = lines[lineIndex++ % lines.length];
}

const actions = {
  jump: () => { jumpQueued = true; },
  shoot,
  hit,
  radio
};

for (const [id, action] of Object.entries(actions)) {
  const button = document.querySelector(`#${id}`);
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    action();
  });
  button.addEventListener('click', event => {
    if (event.detail === 0) action();
  });
}

const keyboardActions = {
  Space: actions.jump,
  KeyJ: shoot,
  KeyK: hit,
  KeyR: radio
};

window.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code) || keyboardActions[event.code]) {
    event.preventDefault();
    keys.add(event.code);
    if (!event.repeat && keyboardActions[event.code]) keyboardActions[event.code]();
  }
});

window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', resetInput);
window.addEventListener('resize', layout);

document.addEventListener('visibilitychange', () => {
  resetInput();
  last = null;
  accumulator = 0;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?v=096', {updateViaCache: 'none'})
    .then(registration => registration.update())
    .catch(error => console.warn('Modalità offline non disponibile:', error));
}

layout();
requestAnimationFrame(update);
