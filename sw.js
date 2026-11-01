// Cache only the public application shell. Never cache Supabase API, user data or uploaded photos.
const CACHE_NAME = 'bdt-shell-v02';
const STATIC = ['./','./index.html','./src/app.js','./src/style.css','./config.js','./assets/tree.svg','./assets/icon-192.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bdt-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const root=new URL(self.registration.scope);
  const relative=url.pathname.startsWith(root.pathname)?url.pathname.slice(root.pathname.length):'';
  if(!['','index.html','src/app.js','src/style.css','config.js','assets/tree.svg','assets/icon-192.png'].includes(relative))return;
  if(event.request.mode==='navigate'||relative==='config.js'){
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>caches.match(event.request)));
  }else{
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
  }
});
