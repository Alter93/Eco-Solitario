// One coherent chapter, including offline launches from historical URLs.
const CACHE='eco-v100-chapter1-20260906';
const ASSETS=['./','./index.html','./game.js?v=chapter1-20260906','./manifest.json',
 './alter_master_sheet.png','./icon-192.png','./icon-512.png',
 './alter-motion-v2.html','./alter-motion-v3.html','./alter-motion-v4.html'];
self.addEventListener('install',event=>event.waitUntil(
 caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
 caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('eco-v')&&key!==CACHE).map(key=>caches.delete(key))))
 .then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{}))}
  return response;
 }).catch(async()=>{
  const cache=await caches.open(CACHE);
  // Never use ignoreSearch for JS: old HTML must not receive a different engine.
  return await cache.match(event.request)||
   (event.request.mode==='navigate'?await cache.match('./index.html'):null)||Response.error();
 }));
});
