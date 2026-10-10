const C='tt-v4',A=['/','/index.html','/config.js','/manifest.json','/supabase.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(A.map(u=>c.add(u).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});
self.addEventListener('push',e=>{const d=e.data?e.data.json():{};
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cl=>{
    cl.filter(c=>c.visibilityState==='visible').forEach(c=>c.postMessage({alarm:true,kind:d.kind,title:d.title,body:d.body}));
    return self.registration.showNotification(d.title||'Track Training',{body:d.body||'Time to train.',icon:'/icon-192.png',badge:'/icon-192.png',vibrate:[400,150,400,150,800],requireInteraction:true,silent:false,tag:'tt-'+(d.kind||'reminder'),renotify:true})}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow('/'))});
