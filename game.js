'use strict';

const game = document.querySelector('#game');
const P = document.querySelector('#player'), SH = document.querySelector('#shadow');
const F = document.querySelector('#far'), M = document.querySelector('#mid'), R = document.querySelector('#fore');
const J = document.querySelector('#joy'), S = document.querySelector('#stick');
const GRAV = 1550, MOVE = 245, JUMP = -650, W = 96, H = 128, CELL = 96;
const STEP = 1 / 120, FRAME_COUNT = 54;
const anim = {
  idle: {f: [0, 1, 2, 3, 4, 5], fps: 6},
  walk: {f: [6, 7, 8, 9, 10, 11], fps: 10},
  run: {f: [12, 13, 14, 15, 16, 17, 18, 19], fps: 14},
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
let joyDir = 0, jumpQueued = false, joyPointer = null;
let last = null, accumulator = 0, initialized = false, platforms = [];
const keys = new Set();

function setFrame(frame) {
  frame = Math.max(0, Math.min(FRAME_COUNT - 1, Math.floor(frame)));
  P.style.backgroundPosition = `${-CELL * frame}px 0px`;
}

function setState(next) {
  if (state === next) return;
  // Preserve the gait phase instead of restarting at every walk/run threshold.
  const gait = s => s === 'walk' || s === 'run';
  const phase = gait(state) && gait(next)
    ? (animTime * anim[state].fps / anim[state].f.length) % 1 : 0;
  state = next;
  animTime = phase * anim[next].f.length / anim[next].fps;
}

function startAction(next) {
  setState(next);
  animTime = 0;
  // Keep every frame visible for its full duration, including bat frames 48/49.
  actionLeft = anim[next].f.length / anim[next].fps;
}

function chooseMovement() {
  if (!onGround) return setState(vy < -140 ? 'jump' : vy < 100 ? 'air' : 'fall');
  const speed = Math.abs(vx);
  if (speed > 175 || (state === 'run' && speed > 150)) setState('run');
  else if (speed > 22 || (state === 'walk' && speed > 8)) setState('walk');
  else setState('idle');
}

function resetInput() {
  const pointer = joyPointer;
  joyPointer = null;
  if (pointer !== null && J.hasPointerCapture(pointer)) J.releasePointerCapture(pointer);
  joyDir = 0;
  jumpQueued = false;
  keys.clear();
  S.style.transform = 'translateX(0px)';
}

function layout() {
  resetInput();
  last = null;
  accumulator = 0;
  // Portrait hides the game. Do not initialize against zero-sized platforms.
  if (!game.clientWidth || !game.clientHeight) return;
  const bounds = game.getBoundingClientRect();
  platforms = [...document.querySelectorAll('.platform')].map(element => {
    const rect = element.getBoundingClientRect();
    return {x: rect.left - bounds.left, y: rect.top - bounds.top, w: rect.width};
  });
  // A rotation returns Alter to a safe platform with a fresh simulation clock.
  px = game.clientWidth * .18;
  py = platforms[0].y - H;
  vx = vy = 0;
  onGround = true;
  state = 'idle';
  animTime = actionLeft = 0;
  previousX = px; previousY = py; previousWorld = world;
  initialized = true;
  render(1);
}

function collide(oldY) {
  const wasGrounded = onGround;
  onGround = false;
  const footBefore = oldY + H, footNow = py + H;
  for (const platform of platforms) {
    const overlaps = px + W * .68 > platform.x && px + W * .32 < platform.x + platform.w;
    if (overlaps && vy >= 0 && footBefore <= platform.y + .5 && footNow >= platform.y) {
      py = platform.y - H;
      onGround = true;
      break;
    }
  }
  const floor = game.clientHeight * .88;
  if (py + H >= floor) { py = floor - H; onGround = true; }
  if (onGround) {
    vy = 0;
    if (!wasGrounded && !actionLeft) startAction('land');
  }
}

function simulate(dt) {
  previousX = px; previousY = py; previousWorld = world;
  animTime += dt;
  actionLeft = Math.max(0, actionLeft - dt);
  const keyDir = Number(keys.has('ArrowRight') || keys.has('KeyD'))
    - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
  const direction = joyPointer !== null ? joyDir : keyDir;
  if (!actionLeft) {
    const target = direction * MOVE;
    const change = Math.min(Math.abs(target - vx), (direction ? 1350 : 1900) * dt);
    vx += Math.sign(target - vx) * change;
    // Face the actual motion while decelerating through a direction reversal.
    if (Math.abs(vx) > 8) face = Math.sign(vx);
  } else vx *= Math.pow(.18, dt);
  if (jumpQueued && onGround && !actionLeft) {
    vy = JUMP;
    onGround = false;
    setState('jump');
  }
  jumpQueued = false;
  const oldY = py;
  px += vx * dt;
  py += vy * dt;
  vy += GRAV * dt;
  const min = 65, max = Math.max(min, game.clientWidth * .50);
  if (px < min) { px = min; vx = Math.max(0, vx); }
  if (px > max) { world += px - max; px = max; }
  collide(oldY);
  if (!actionLeft) chooseMovement();
}

function render(alpha) {
  const x = previousX + (px - previousX) * alpha;
  const y = previousY + (py - previousY) * alpha;
  const scroll = previousWorld + (world - previousWorld) * alpha;
  P.style.transform = `translate3d(${x}px, ${y}px, 0) scaleX(${face})`;
  SH.style.transform = `translate3d(${x + W * .24}px, ${y + H - 5}px, 0)`;
  SH.style.opacity = onGround ? '.7' : '.2';
  F.style.backgroundPositionX = `${-scroll * .10}px`;
  M.style.backgroundPositionX = `${-scroll * .30}px`;
  R.style.backgroundPositionX = `${-scroll * .66}px`;
  const sequence = anim[state];
  const frame = Math.floor((animTime + 1e-9) * sequence.fps);
  setFrame(sequence.f[sequence.once ? Math.min(frame, sequence.f.length - 1) : frame % sequence.f.length]);
}

function update(now) {
  requestAnimationFrame(update);
  if (document.hidden || !game.clientWidth || !game.clientHeight) { last = null; return; }
  if (!initialized) layout();
  if (last === null) last = now;
  // Fixed physics plus interpolated rendering works at 30, 60 and 120 Hz.
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
  const dx = Math.max(-38, Math.min(38, event.clientX - rect.left - rect.width / 2));
  S.style.transform = `translateX(${dx}px)`;
  joyDir = Math.abs(dx) > 9 ? Math.sign(dx) : 0;
}
J.addEventListener('pointerdown', event => {
  if (joyPointer !== null) return;
  event.preventDefault();
  joyPointer = event.pointerId;
  J.setPointerCapture(joyPointer);
  moveJoystick(event);
});
J.addEventListener('pointermove', event => {
  if (event.pointerId === joyPointer) { event.preventDefault(); moveJoystick(event); }
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  J.addEventListener(type, event => { if (event.pointerId === joyPointer) resetInput(); });
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
  const element = document.createElement('div'), direction = face;
  element.className = 'projectile';
  let x = px + (direction > 0 ? W - 4 : -12), started = performance.now(), previous = started;
  element.style.left = `${x}px`; element.style.top = `${py + 62}px`;
  game.appendChild(element);
  function fly(now) {
    x += direction * 760 * Math.min((now - previous) / 1000, .1);
    previous = now;
    element.style.left = `${x}px`;
    if (now - started < 1200 && x > -30 && x < game.clientWidth + 30) requestAnimationFrame(fly);
    else element.remove();
  }
  requestAnimationFrame(fly);
}
function shoot() {
  if (ammo <= 0 || actionLeft) return;
  document.querySelector('#ammo').textContent = `${--ammo}/12`;
  startAction('shoot'); muzzle(); bullet();
}
function hit() {
  if (actionLeft) return;
  startAction('bat');
  const effect = document.createElement('div');
  effect.className = 'hitfx';
  effect.style.left = `${px + (face > 0 ? W - 4 : -46)}px`;
  effect.style.top = `${py + 38}px`;
  game.appendChild(effect);
  effect.animate([{transform: 'scale(.3)', opacity: 1}, {transform: 'scale(1.3)', opacity: 0}], {duration: 280});
  setTimeout(() => effect.remove(), 290);
}
let radioOpen = false, lineIndex = 0;
const lines = ['Segnali deboli... ma sei ancora lì?', 'Finché ascolti, non sei solo.', 'Qualcuno trasmette ancora.', 'Alter... resta sulla frequenza.'];
function radio() {
  radioOpen = !radioOpen;
  document.querySelector('#radioBox').style.display = radioOpen ? 'block' : 'none';
  if (radioOpen) document.querySelector('#line').textContent = lines[lineIndex++ % lines.length];
}
const actions = {jump: () => { jumpQueued = true; }, shoot, hit, radio};
for (const [id, action] of Object.entries(actions)) {
  const button = document.querySelector(`#${id}`);
  button.addEventListener('pointerdown', event => { event.preventDefault(); action(); });
  button.addEventListener('click', event => { if (event.detail === 0) action(); });
}
const keyboardActions = {Space: actions.jump, KeyJ: shoot, KeyK: hit, KeyR: radio};
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
  resetInput(); last = null; accumulator = 0;
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Modalità offline non disponibile:', error));
}
layout();
requestAnimationFrame(update);
