const C='eco-v096-alter-perfect-motion';
const A=['./','./index.html','./game.js?v=096','./manifest.json','./layer_far.png','./layer_mid.png','./layer_fore.png','./alter_master_sheet.png'];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('eco-v')&&x!==C).map(x=>caches.delete(x))))
])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request).then(r=>{
      if(!r||!r.ok)return r;
      const copy=r.clone();
      caches.open(C).then(c=>c.put(e.request,copy)).catch(()=>{});
      return r;
    }).catch(()=>caches.open(C).then(c=>c.match(e.request,{ignoreSearch:true})).then(r=>r||Response.error()))
  );
});
