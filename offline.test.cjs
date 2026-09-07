const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('offline worker caches chapter, preserves other apps and never substitutes JS versions',async()=>{
 const handlers={},removed=[],added=[];let claimed=false;const fallback={html:true};
 const cache={addAll:async a=>added.push(...a),match:async r=>r==='./index.html'?fallback:undefined};
 const self={location:{origin:'https://example.test'},registration:{scope:'https://example.test/Eco-Solitario/'},clients:{claim:async()=>{claimed=true}},skipWaiting:async()=>{},addEventListener:(k,v)=>handlers[k]=v};
 vm.runInNewContext(fs.readFileSync(__dirname+'/sw.js','utf8'),{self,URL,Response,caches:{open:async()=>cache,keys:async()=>['eco-vold','another-app'],delete:async k=>removed.push(k)},fetch:async()=>{throw Error('offline')}});
 let pending;handlers.install({waitUntil:p=>pending=p});await pending;assert.ok(added.includes('./assets/bandits-v2.png'));
 handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(removed,['eco-vold']);assert.equal(claimed,true);
 const request=(path,mode)=>{let result;handlers.fetch({request:{url:'https://example.test/Eco-Solitario/'+path,method:'GET',mode},respondWith:p=>result=p});return result;};
 assert.equal(await request('index.html','navigate'),fallback);assert.equal((await request('game.js?v=old','cors')).type,'error');
});
