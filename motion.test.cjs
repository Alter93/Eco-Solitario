const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = __dirname;
const source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');

function boot({portrait = false, dpr = 3} = {}) {
  let now = 0;
  let frames = [];
  const drawCalls = [];

  function element(rect = {}) {
    const listeners = {};
    const captured = new Set();
    return {
      style: {},
      children: [],
      clientWidth: 1000,
      clientHeight: 500,
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      emit(type, data = {}) {
        for (const fn of listeners[type] || []) {
          fn({preventDefault() {}, detail: 1, ...data});
        }
      },
      getBoundingClientRect() {
        return {left: 0, top: 0, width: 1000, height: 500, ...rect};
      },
      setPointerCapture(id) { captured.add(id); },
      hasPointerCapture(id) { return captured.has(id); },
      releasePointerCapture(id) { captured.delete(id); },
      appendChild(child) { this.children.push(child); },
      remove() {},
      animate() {}
    };
  }

  const nodes = Object.fromEntries(
    ['game','player','shadow','far','mid','fore','joy','stick','jump','shoot','hit','radio','ammo','radioBox','line']
      .map(id => [id, element()])
  );

  const ctx = {
    imageSmoothingEnabled: true,
    clearRect() {},
    drawImage(...args) { drawCalls.push(args); }
  };
  nodes.player.getContext = () => ctx;
  nodes.joy = element({left: 30, top: 350, width: 118, height: 118});

  if (portrait) {
    nodes.game.clientWidth = 0;
    nodes.game.clientHeight = 0;
  }

  const platforms = [
    element({left: -40, top: 395, width: 620}),
    element({left: 640, top: 355, width: 430})
  ];

  const document = Object.assign(element(), {
    hidden: false,
    querySelector: selector => nodes[selector.slice(1)],
    querySelectorAll: () => platforms,
    createElement: () => element()
  });

  const window = Object.assign(element(), {devicePixelRatio: dpr});

  class MockImage {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.decoding = '';
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
    performance: {now: () => now},
    requestAnimationFrame: fn => frames.push(fn),
    setTimeout: () => 0
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

test('entry point uses a canvas and the 54-cell sprite sheet dimensions match', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<canvas id="player" width="96" height="128"/);
  assert.match(html, /game\.js\?v=096/);
  assert.doesNotMatch(html, /#player[^}]*background-image:url\('alter_master_sheet\.png'\)/s);

  const png = fs.readFileSync(path.join(root, 'alter_master_sheet.png'));
  assert.equal(png.readUInt32BE(16), 54 * 96);
  assert.equal(png.readUInt32BE(20), 128);

  const app = boot();
  assert.equal(app.run('onGround'), true);
  assert.match(app.nodes.player.style.transform, /translate3d/);
});

test('canvas crops exactly one sprite cell so neighbouring frames cannot bleed', () => {
  const app = boot();
  app.run("setState('walk'); gaitDistance = 40");
  app.advance(1 / 60);

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

test('idle is a single perfectly still frame', () => {
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
    assert.equal(app.run('state'), 'walk');
    return app.run('px');
  });

  assert.ok(results[0] > 380);
  assert.ok(Math.max(...results) - Math.min(...results) < .001, results.join(', '));
});

test('walk animation is driven by travelled distance, not display refresh rate', () => {
  const results = [30, 60, 120].map(hz => {
    const app = boot();
    app.window.emit('keydown', {code: 'ArrowRight'});
    app.advance(.8, hz);
    return [app.run('gaitDistance'), app.run('frameForState()')];
  });

  assert.ok(Math.max(...results.map(x => x[0])) - Math.min(...results.map(x => x[0])) < .001);
  assert.equal(new Set(results.map(x => x[1])).size, 1);
});

test('release decelerates cleanly to exact zero and returns to idle frame 0', () => {
  const app = boot();
  app.window.emit('keydown', {code: 'ArrowRight'});
  app.advance(.4);
  app.window.emit('keyup', {code: 'ArrowRight'});
  app.advance(.4);

  assert.equal(app.run('vx'), 0);
  assert.equal(app.run('state'), 'idle');
  assert.equal(app.run('frameForState()'), 0);
});

test('joystick is analog and cancellation releases movement', () => {
  const app = boot();
  app.nodes.joy.emit('pointerdown', {pointerId: 1, clientX: 118});
  assert.ok(app.run('joyAxis') > 0 && app.run('joyAxis') < 1);

  app.advance(.2);
  const partialSpeed = app.run('vx');
  assert.ok(partialSpeed > 0 && partialSpeed < app.run('MOVE'));

  app.nodes.joy.emit('pointermove', {pointerId: 1, clientX: 127});
  app.advance(.3);
  assert.ok(app.run('vx') > partialSpeed);

  app.nodes.joy.emit('pointercancel', {pointerId: 1});
  app.advance(.3);
  assert.equal(app.run('joyPointer'), null);
  assert.equal(app.run('vx'), 0);
});

test('jump rises, lands and resumes movement without getting stuck', () => {
  const app = boot();
  const start = app.run('py');

  app.nodes.jump.emit('pointerdown', {pointerId: 2});
  app.advance(.2);
  assert.ok(app.run('py') < start - 60);
  assert.equal(app.run('onGround'), false);

  app.advance(1.4);
  assert.equal(app.run('onGround'), true);
  assert.equal(app.run('state'), 'idle');
  assert.equal(app.run('py'), start);

  app.window.emit('keydown', {code: 'ArrowRight'});
  app.advance(.3);
  assert.ok(app.run('vx') > 200);
});

test('one-shot actions retain every declared action frame', () => {
  for (const action of ['land', 'shoot', 'bat', 'damage']) {
    const app = boot();
    const seen = new Set();
    app.run(`startAction('${action}')`);

    for (let i = 0; i < 100; i++) {
      app.tick(1000 / 120);
      if (app.run('state') === action) seen.add(app.run('frameForState()'));
    }

    assert.deepEqual([...seen], Array.from(app.run(`anim.${action}.f`)), action);
  }
});

test('portrait startup and background resume keep valid positions and release input', () => {
  const app = boot({portrait: true});
  app.advance(1);
  assert.equal(app.run('initialized'), false);

  app.nodes.game.clientWidth = 1000;
  app.nodes.game.clientHeight = 500;
  app.window.emit('resize');
  app.advance(.1);
  assert.equal(app.run('onGround'), true);

  app.window.emit('keydown', {code: 'ArrowRight'});
  app.advance(.3);
  app.document.hidden = true;
  app.document.emit('visibilitychange');
  const position = app.run('px');

  app.tick(60000);
  app.document.hidden = false;
  app.document.emit('visibilitychange');
  app.tick(60000);

  assert.equal(app.run('px'), position);
  app.advance(.3);
  assert.equal(app.run('vx'), 0);
  assert.equal(app.run('keys.size'), 0);
});

test('device-pixel snapping uses the screen DPR instead of whole CSS pixels', () => {
  const app = boot({dpr: 3});
  assert.equal(app.run('snapToDevicePixel(10.2)'), 10 + 1 / 3);
  assert.equal(app.run('snapToDevicePixel(10.55)'), 10 + 2 / 3);
});

test('a fired bullet keeps its direction when Alter turns', () => {
  const app = boot();
  app.nodes.shoot.emit('pointerdown', {pointerId: 2});
  const bullet = app.nodes.game.children.find(e => e.className === 'projectile');
  const start = parseFloat(bullet.style.left);

  app.run('face = -1');
  app.tick(1000 / 60);

  assert.ok(parseFloat(bullet.style.left) > start);
  assert.equal(app.nodes.ammo.textContent, '11/12');
});

test('offline install includes the game script and new cache version', async () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /eco-v096-alter-perfect-motion/);

  const listeners = {};
  const events = [];
  let pending;

  vm.runInNewContext(sw, {
    self: {
      addEventListener: (name, fn) => { listeners[name] = fn; },
      skipWaiting: () => events.push('activate')
    },
    caches: {
      open: async () => ({
        addAll: async files => {
          assert.ok(files.includes('./game.js?v=096'));
          events.push('cached');
        }
      })
    }
  });

  listeners.install({waitUntil: promise => { pending = promise; }});
  await pending;
  assert.deepEqual(events, ['cached', 'activate']);
});
