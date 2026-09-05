const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = __dirname;
const source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');

function boot({dpr = 3} = {}) {
  let now = 0;
  let frames = [];
  const drawCalls = [];

  function element(rect = {}) {
    const listeners = {};
    const captured = new Set();
    return {
      style: {},
      textContent: '',
      clientWidth: rect.clientWidth ?? 1000,
      clientHeight: rect.clientHeight ?? 500,
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      emit(type, data = {}) {
        for (const fn of listeners[type] || []) fn({preventDefault() {}, detail: 1, ...data});
      },
      getBoundingClientRect() { return {left: 0, top: 0, width: 1000, height: 500, ...rect}; },
      setPointerCapture(id) { captured.add(id); },
      hasPointerCapture(id) { return captured.has(id); },
      releasePointerCapture(id) { captured.delete(id); }
    };
  }

  const ids = ['stage','player','shadow','joy','stick','state','speed','frame','jump','shoot','bat','damage','reset'];
  const nodes = Object.fromEntries(ids.map(id => [id, element()]));
  nodes.joy = element({left: 30, top: 350, width: 124, height: 124});

  const ctx = {
    imageSmoothingEnabled: true,
    clearRect() {},
    drawImage(...args) { drawCalls.push(args); }
  };
  nodes.player.getContext = () => ctx;

  const document = Object.assign(element(), {
    hidden: false,
    getElementById: id => nodes[id],
    addEventListener(type, fn) { this._listeners ||= {}; (this._listeners[type] ||= []).push(fn); },
    emit(type, data = {}) { for (const fn of this._listeners?.[type] || []) fn(data); }
  });

  const window = Object.assign(element(), {devicePixelRatio: dpr});

  class MockImage {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.decoding = '';
      this.naturalWidth = 54 * 96;
      this.naturalHeight = 128;
      this._src = '';
    }
    set src(value) {
      this._src = value;
      if (this.onload) this.onload();
    }
    get src() { return this._src; }
  }

  const context = vm.createContext({
    document,
    window,
    navigator: {},
    console,
    Image: MockImage,
    requestAnimationFrame: fn => frames.push(fn)
  });

  vm.runInContext(source, context);

  function tick(dt) {
    now += dt;
    const pending = frames;
    frames = [];
    pending.forEach(fn => fn(now));
  }

  tick(0);

  return {
    nodes,
    document,
    window,
    drawCalls,
    tick,
    run: code => vm.runInContext(code, context),
    advance(seconds, hz = 60) {
      for (let i = 0; i < Math.round(seconds * hz); i++) tick(1000 / hz);
    }
  };
}

test('active build is external v0.9.8 canvas motion engine', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<canvas id="player" width="96" height="128"/);
  assert.match(html, /<script src="game\.js\?v=098"><\/script>/);
  assert.doesNotMatch(html, /background-image\s*:\s*url\([^)]*alter_master_sheet/);
});

test('canvas crops exactly one 96x128 source cell', () => {
  const app = boot();
  app.run("setState('walk'); gaitPhase = .5; render(1)");
  const args = app.drawCalls.at(-1);
  assert.equal(args[1] % 96, 0);
  assert.equal(args[2], 0);
  assert.equal(args[3], 96);
  assert.equal(args[4], 128);
  assert.equal(args[5], 0);
  assert.equal(args[6], 0);
  assert.equal(args[7], 96);
  assert.equal(args[8], 128);
});

test('idle is one fixed frame and exact zero velocity', () => {
  const app = boot();
  app.advance(2, 120);
  assert.equal(app.run('state'), 'idle');
  assert.equal(app.run('frameForState()'), 0);
  assert.equal(app.run('vx'), 0);
});

test('movement distance is refresh-rate independent at 30, 60 and 120 Hz', () => {
  const results = [30, 60, 120].map(hz => {
    const app = boot();
    app.window.emit('keydown', {code: 'ArrowRight'});
    app.advance(1, hz);
    return app.run('x');
  });
  assert.ok(results[0] > 300);
  assert.ok(Math.max(...results) - Math.min(...results) < .001, results.join(', '));
});

test('gait phase is refresh-rate independent', () => {
  const results = [30, 60, 120].map(hz => {
    const app = boot();
    app.window.emit('keydown', {code: 'ArrowRight'});
    app.advance(.8, hz);
    return [app.run('gaitPhase'), app.run('frameForState()')];
  });
  assert.ok(Math.max(...results.map(x => x[0])) - Math.min(...results.map(x => x[0])) < .001);
  assert.equal(new Set(results.map(x => x[1])).size, 1);
});

test('walk to run transition preserves gait phase', () => {
  const app = boot();
  app.run("state='walk'; gaitPhase=.63; setState('run')");
  assert.equal(app.run('gaitPhase'), .63);
});

test('release brakes to zero and returns to idle frame 0', () => {
  const app = boot();
  app.window.emit('keydown', {code: 'ArrowRight'});
  app.advance(.45);
  app.window.emit('keyup', {code: 'ArrowRight'});
  app.advance(.35);
  assert.equal(app.run('vx'), 0);
  assert.equal(app.run('state'), 'idle');
  assert.equal(app.run('frameForState()'), 0);
});

test('direction flip follows real velocity during reversal', () => {
  const app = boot();
  app.window.emit('keydown', {code: 'ArrowRight'});
  app.advance(.3);
  assert.equal(app.run('face'), 1);
  app.window.emit('keyup', {code: 'ArrowRight'});
  app.window.emit('keydown', {code: 'ArrowLeft'});
  app.advance(.03);
  assert.equal(app.run('face'), 1);
  app.advance(.2);
  assert.equal(app.run('face'), -1);
  assert.ok(app.run('vx') < 0);
});

test('joystick has deadzone, analog range and releases cleanly', () => {
  const app = boot();
  const center = 30 + 124 / 2;
  app.nodes.joy.emit('pointerdown', {pointerId: 1, clientX: center + 3});
  assert.equal(app.run('joyAxis'), 0);
  app.nodes.joy.emit('pointermove', {pointerId: 1, clientX: center + 22});
  assert.ok(app.run('joyAxis') > 0 && app.run('joyAxis') < 1);
  app.advance(.2);
  assert.ok(app.run('vx') > 0 && app.run('vx') < app.run('MAX_SPEED'));
  app.nodes.joy.emit('pointercancel', {pointerId: 1});
  app.advance(.3);
  assert.equal(app.run('joyPointer'), null);
  assert.equal(app.run('vx'), 0);
});

test('jump rises, lands and does not get stuck', () => {
  const app = boot();
  const start = app.run('y');
  app.nodes.jump.emit('pointerdown', {pointerId: 2});
  app.advance(.2);
  assert.ok(app.run('y') < start - 60);
  assert.equal(app.run('grounded'), false);
  app.advance(1.5);
  assert.equal(app.run('grounded'), true);
  app.advance(.5);
  assert.equal(app.run('state'), 'idle');
});

test('one-shot action sequences expose every declared frame', () => {
  for (const action of ['land', 'shoot', 'bat', 'damage']) {
    const app = boot();
    const seen = new Set();
    app.run(`startAction('${action}')`);
    for (let i = 0; i < 120; i++) {
      app.tick(1000 / 120);
      if (app.run('state') === action) seen.add(app.run('frameForState()'));
    }
    assert.deepEqual([...seen], Array.from(app.run(`anim.${action}.frames`)), action);
  }
});

test('device pixel snapping uses DPR', () => {
  const app = boot({dpr: 3});
  assert.equal(app.run('snapToDevicePixel(10.2)'), 10 + 1 / 3);
  assert.equal(app.run('snapToDevicePixel(10.55)'), 10 + 2 / 3);
});

test('service worker cache is v0.9.8 and caches active script', async () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /eco-v098-alter-motion-lock/);
  assert.match(sw, /game\.js\?v=098/);
});
