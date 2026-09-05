const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');

function boot({portrait = false} = {}) {
  let now = 0, frames = [];
  function element(rect = {}) {
    const listeners = {}, captured = new Set();
    return {
      style: {}, children: [], clientWidth: 1000, clientHeight: 500,
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      emit(type, data = {}) { for (const fn of listeners[type] || []) fn({preventDefault() {}, ...data}); },
      getBoundingClientRect() { return {left: 0, top: 0, width: 1000, height: 500, ...rect}; },
      setPointerCapture(id) { captured.add(id); },
      hasPointerCapture(id) { return captured.has(id); },
      releasePointerCapture(id) { captured.delete(id); },
      appendChild(child) { this.children.push(child); }, remove() {}, animate() {}
    };
  }
  const nodes = Object.fromEntries(['game','player','shadow','far','mid','fore','joy','stick','jump','shoot','hit','radio','ammo','radioBox','line'].map(id => [id, element()]));
  nodes.joy = element({left: 30, top: 350, width: 118, height: 118});
  if (portrait) nodes.game.clientWidth = nodes.game.clientHeight = 0;
  const platforms = [element({left: -40, top: 395, width: 620}), element({left: 640, top: 355, width: 430})];
  const document = Object.assign(element(), {
    hidden: false,
    querySelector: selector => nodes[selector.slice(1)],
    querySelectorAll: () => platforms,
    createElement: () => element()
  });
  const window = element();
  const context = vm.createContext({document, window, navigator: {}, console, performance: {now: () => now},
    requestAnimationFrame: fn => frames.push(fn), setTimeout: () => 0});
  vm.runInContext(source, context);
  function tick(dt) { now += dt; const pending = frames; frames = []; pending.forEach(fn => fn(now)); }
  tick(0);
  return {nodes, document, window, tick,
    run: code => vm.runInContext(code, context),
    advance(seconds, hz = 60) { for (let i = 0; i < Math.round(seconds * hz); i++) tick(1000 / hz); }
  };
}

test('entry point loads the checked script and the 54-cell sprite sheet matches it', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<script src="game.js"><\/script>/);
  const png = fs.readFileSync(path.join(root, 'alter_master_sheet.png'));
  assert.equal(png.readUInt32BE(16), 54 * 96);
  assert.equal(png.readUInt32BE(20), 128);
  const app = boot();
  assert.equal(app.run('onGround'), true);
  assert.match(app.nodes.player.style.transform, /translate3d/);
});

test('movement has the same distance at 30, 60 and 120 Hz', () => {
  const results = [30, 60, 120].map(hz => {
    const app = boot();
    app.window.emit('keydown', {code: 'ArrowRight'});
    app.advance(1, hz);
    assert.equal(app.run('state'), 'run');
    return app.run('px');
  });
  assert.ok(results[0] > 380);
  assert.ok(Math.max(...results) - Math.min(...results) < .001, results.join(', '));
});

test('walk/run transitions retain gait phase', () => {
  const app = boot();
  app.run("setState('walk'); animTime = .3; setState('run')");
  assert.ok(Math.abs(app.run('animTime') - 4 / 14) < 1e-9);
});

test('each one-shot action displays all frames, including 48–53', () => {
  for (const action of ['land', 'shoot', 'bat', 'damage']) {
    const app = boot(), seen = new Set();
    app.run(`startAction('${action}')`);
    for (let i = 0; i < 70; i++) {
      app.tick(1000 / 120);
      if (app.run('state') === action) seen.add(-parseFloat(app.nodes.player.style.backgroundPosition) / 96);
    }
    assert.deepEqual([...seen], Array.from(app.run(`anim.${action}.f`)), action);
    assert.equal(app.run('actionLeft'), 0);
  }
});

test('jump rises, lands and resumes movement without getting stuck', () => {
  const app = boot(), start = app.run('py');
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

test('joystick owns its pointer while other fingers act; cancellation releases movement', () => {
  const app = boot();
  app.nodes.joy.emit('pointerdown', {pointerId: 1, clientX: 127});
  app.nodes.joy.emit('pointermove', {pointerId: 2, clientX: 51});
  assert.equal(app.run('joyDir'), 1);
  app.nodes.jump.emit('pointerdown', {pointerId: 2});
  app.advance(.2);
  assert.equal(app.run('onGround'), false);
  assert.ok(app.run('vx') > 0);
  app.nodes.joy.emit('pointercancel', {pointerId: 1});
  app.advance(.3);
  assert.equal(app.run('joyPointer'), null);
  assert.equal(app.run('vx'), 0);
});

test('portrait startup and background resume keep valid positions and release input', () => {
  const app = boot({portrait: true});
  app.advance(1);
  assert.equal(app.run('initialized'), false);
  app.nodes.game.clientWidth = 1000; app.nodes.game.clientHeight = 500;
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

test('offline install includes the game script and activates after caching', async () => {
  const listeners = {}, events = [];
  let pending;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), {
    self: {addEventListener: (name, fn) => {listeners[name] = fn;}, skipWaiting: () => events.push('activate')},
    caches: {open: async () => ({addAll: async files => {assert.ok(files.includes('./game.js')); events.push('cached');}})}
  });
  listeners.install({waitUntil: promise => {pending = promise;}});
  await pending;
  assert.deepEqual(events, ['cached', 'activate']);
});
