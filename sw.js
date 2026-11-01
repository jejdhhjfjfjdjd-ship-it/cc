const CACHE='vn-chill-journey-final-v1';
const CORE=['./','./index.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const cacheable=url.origin===self.location.origin || (req.destination==='script' && (url.hostname==='cdnjs.cloudflare.com'||url.hostname==='cdn.jsdelivr.net'));
  if(!cacheable)return;
  event.respondWith(caches.match(req).then(cached=>{
    if(cached)return cached;
    return fetch(req).then(response=>{
      if(response && (response.ok || response.type==='opaque')){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});}
      return response;
    }).catch(()=>caches.match('./index.html'));
  }));
});
