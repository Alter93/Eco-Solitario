const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
function boot({images=true,width=852,height=393}={}){
 const draws=[];let queue=[],now=0;
 function node(){const handlers={};return {style:{},dataset:{},hidden:false,textContent:'',classList:{toggle(){},remove(){}},
 addEventListener(type,fn){(handlers[type]??=[]).push(fn)},
 emit(type,event={}){for(const fn of handlers[type]||[])fn({preventDefault(){},...event})},
 getBoundingClientRect(){return {left:0,top:0,width,height}},setPointerCapture(){},
 getContext(){return new Proxy({drawImage(...args){draws.push(args)},createLinearGradient(){return {addColorStop(){}}}}, {get:(o,k)=>k in o?o[k]:(()=>{})})}}}
 const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],node()]));
 const buttons=Object.fromEntries([...html.matchAll(/data-action="([^"]+)"/g)].map(m=>{const n=node();n.dataset.action=m[1];return [m[1],n]}));
 const doc=Object.assign(node(),{hidden:false,getElementById:id=>nodes[id]??null,querySelectorAll:()=>Object.values(buttons)});
 const win=node();
 class Image{set src(s){this.naturalWidth=s.includes('master')?5184:1152;this.naturalHeight=128;if(images)this.onload?.();else this.onerror?.()}}
 const context=vm.createContext({document:doc,window:win,location:{protocol:'http:'},navigator:{},Image,console,performance:{now:()=>now},requestAnimationFrame:fn=>queue.push(fn),innerWidth:width,innerHeight:height,addEventListener:win.addEventListener.bind(win)});
 const injection=`\nthis.__test={P,keys,touch,buttons:null,start,reset,update,draw,spriteFrame,loop,STEP,get state(){return {started,paused,gameOver,complete,cam,gait,jumpQueued,bullets,enemies,platforms}}};\n`;
 vm.runInContext(source.replace(/\}\)\(\);\s*$/,injection+'})();'),context);
 const game=context.__test;
 function frames(seconds,hz=60){for(let i=0;i<Math.round(seconds*hz);i++){now+=1000/hz;const pending=queue;queue=[];for(const fn of pending)fn(now)}}
 const key=(type,k,repeat=false)=>win.emit(type,{key:k,repeat});
 return {game,nodes,buttons,doc,win,draws,key,frames};
}
test('entry point loads exactly the chapter engine and required DOM',()=>{
 assert.match(html,/<script src="\.\/game\.js\?v=chapter1-20260906"/);
 assert.equal((html.match(/<script/g)||[]).length,1);
 for(const v of [2,3,4])assert.match(fs.readFileSync(path.join(root,`alter-motion-v${v}.html`),'utf8'),/url=\.\/index.html/);
 const b=boot();b.frames(.1);assert.equal(b.game.state.started,false);
});
test('all declared offline assets exist; actual sprite dimensions match cell layout',()=>{
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const assets=sw.match(/const ASSETS=(\[[\s\S]*?\]);/)[1];
 for(const asset of vm.runInNewContext(assets)){const file=asset==='./'?'index.html':asset.split('?')[0];assert.ok(fs.existsSync(path.join(root,file)),file)}
 const png=fs.readFileSync(path.join(root,'alter_master_sheet.png'));assert.equal(png.readUInt32BE(16),54*96);assert.equal(png.readUInt32BE(20),128);
});
test('Enter starts and keyboard movement advances both player and camera',()=>{
 const b=boot();b.key('keydown','Enter');b.frames(1);const x=b.game.P.x;
 b.key('keydown','d');b.frames(2);b.key('keyup','d');b.frames(.3);
 assert.ok(b.game.P.x>x+300);assert.ok(b.game.state.cam>0);assert.equal(b.game.P.vx,0);
});
test('frame-rate independent movement and stamina at 30/60/120 Hz',()=>{
 const states=[30,60,120].map(hz=>{const b=boot();b.game.start();b.frames(1,hz);b.key('keydown','d');b.key('keydown','Shift');b.frames(1,hz);return b.game.P});
 for(const p of states.slice(1)){assert.ok(Math.abs(p.x-states[0].x)<.001);assert.ok(Math.abs(p.stamina-states[0].stamina)<.001)}
});
test('pointer release outside original button clears that finger only',()=>{
 const b=boot();b.game.start();b.frames(1);
 b.buttons.right.emit('pointerdown',{pointerId:1});b.buttons.run.emit('pointerdown',{pointerId:2});b.frames(.4);
 b.buttons.right.emit('pointerup',{pointerId:1,clientX:-100,clientY:-100});
 assert.equal(b.game.touch.right,false);assert.equal(b.game.touch.run,true);b.frames(.3);assert.equal(b.game.P.vx,0);
 b.buttons.run.emit('pointercancel',{pointerId:2});assert.equal(b.game.touch.run,false);
});
test('two fingers on one button, capture loss and simultaneous jump',()=>{
 const b=boot();b.game.start();b.frames(1);
 b.buttons.right.emit('pointerdown',{pointerId:1});b.buttons.right.emit('pointerdown',{pointerId:2});
 b.buttons.right.emit('lostpointercapture',{pointerId:1});assert.equal(b.game.touch.right,true);
 b.buttons.jump.emit('pointerdown',{pointerId:3});b.frames(.2);assert.ok(b.game.P.vy<0);assert.ok(b.game.P.vx>0);
 b.win.emit('pointercancel',{pointerId:2});assert.equal(b.game.touch.right,false);assert.equal(b.game.touch.jump,true);
});
test('held jump does not repeatedly bounce; new press jumps again',()=>{
 const b=boot();b.game.start();b.frames(1);b.key('keydown',' ');b.frames(1.5);
 assert.equal(b.game.P.onGround,true);assert.equal(b.game.P.vy,0);
 b.key('keyup',' ');b.key('keydown',' ');b.frames(.15);assert.ok(b.game.P.vy<0);
});
test('blur and background clear inputs and pause; resume has no time jump',()=>{
 const b=boot();b.game.start();b.frames(1);b.key('keydown','d');b.frames(.3);b.win.emit('blur');
 const x=b.game.P.x;assert.equal(b.game.state.paused,true);assert.equal(b.game.keys.d,undefined);
 b.doc.hidden=true;b.doc.emit('visibilitychange');b.frames(10);assert.equal(b.game.P.x,x);
 b.doc.hidden=false;b.doc.emit('visibilitychange');b.nodes.pause.emit('click');b.frames(.1);assert.ok(Math.abs(b.game.P.x-x)<30);
});
test('pause repeat ignored and viewport rotation preserves world position',()=>{
 const b=boot();b.game.start();b.frames(1);b.key('keydown','p');b.key('keydown','p',true);assert.equal(b.game.state.paused,true);
 b.key('keydown','p');assert.equal(b.game.state.paused,false);const x=b.game.P.x;b.win.emit('resize');assert.equal(b.game.P.x,x);
});
test('single cells, idle stable, gait changes with travel and mirrored direction',()=>{
 const b=boot();b.game.start();b.frames(1);assert.equal(b.game.spriteFrame().frame,0);
 b.frames(.5);assert.equal(b.game.spriteFrame().frame,0);b.key('keydown','d');b.frames(.2);const phase=b.game.state.gait;b.frames(.2);assert.notEqual(b.game.state.gait,phase);
 b.key('keyup','d');b.key('keydown','a');b.frames(.4);assert.equal(b.game.P.dir,-1);
 assert.ok(b.draws.length>0);for(const args of b.draws){assert.equal(args[3],96);assert.equal(args[4],128);assert.equal(args[1]%96,0);assert.ok(args[1]>=0&&args[1]<5184)}
});
test('missing sprite does not prevent starting, drawing or movement',()=>{
 const b=boot({images:false});b.game.start();b.frames(1);b.key('keydown','d');b.frames(.5);assert.ok(b.game.P.x>250);assert.equal(b.draws.length,0);assert.match(b.nodes.note.textContent,/Capitolo/);
});
test('platform landing from above and world boundaries',()=>{
 const b=boot();b.game.start();Object.assign(b.game.P,{x:1300,y:390,vy:50});b.frames(.4);assert.equal(b.game.P.y,470-64);assert.equal(b.game.P.onGround,true);
 Object.assign(b.game.P,{x:0,vx:-20});b.key('keydown','a');b.frames(.4);assert.equal(b.game.P.x,0);assert.equal(b.game.P.vx,0);
});
test('weapons consume ammo and damage mobs; chapter can complete and restart',()=>{
 const b=boot();b.game.start();b.frames(1);const e=b.game.state.enemies[0];e.x=b.game.P.x+70;
 b.key('keydown','j');b.frames(.15);b.key('keyup','j');assert.equal(b.game.P.ammo,11);assert.ok(e.hp<e.maxHp);
 e.x=b.game.P.x+36;b.key('keydown','k');b.frames(.03);assert.ok(e.dead);
 b.game.P.x=5930;b.frames(.1);assert.equal(b.game.state.complete,true);
 b.key('keydown','r');assert.equal(b.game.state.complete,false);assert.equal(b.game.P.x,210);assert.equal(b.game.P.ammo,12);
});
