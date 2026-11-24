const CACHE='daily-bingo-v5';
const FILES=['./','./index.html','./styles.css?v=5','./app.js?v=5','./manifest.json','./icon.svg'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('daily-bingo-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(response&&response.ok) await cache.put(request,response.clone());
      return response;
    }catch(error){
      const cached=await cache.match(request)||await cache.match('./index.html');
      if(cached)return cached;
      throw error;
    }
  })());
});
