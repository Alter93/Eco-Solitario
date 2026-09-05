const C='eco-v098-alter-motion-lock';
const A=['./','./index.html','./game.js?v=098','./manifest.json','./alter_master_sheet.png?v=098'];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('eco-v')&&k!==C).map(k=>caches.delete(k))))
])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request).then(response=>{
      if(!response||!response.ok)return response;
      const copy=response.clone();
      caches.open(C).then(c=>c.put(e.request,copy)).catch(()=>{});
      return response;
    }).catch(()=>caches.open(C).then(c=>c.match(e.request,{ignoreSearch:true})).then(r=>r||Response.error()))
  );
});
