const CACHE_NAME = 'rhythm-mvp-shell-v41';
const SHELL = ['./', './index.html', './styles.css', './app.js', './skills.js', './cycle2.js', './asanas.js', './wardrobe.js', './yoga.js', './garmin.js', './decision.js', './sync.js', './fonts/manrope-latin-wght-normal.woff2', './fonts/manrope-cyrillic-wght-normal.woff2', './config.js', './asanas/boat.svg', './asanas/camel.svg', './asanas/chair.svg', './asanas/chaturanga.svg', './asanas/crow.svg', './asanas/dolphin.svg', './asanas/downward-dog.svg', './asanas/eagle.svg', './asanas/firefly.svg', './asanas/flying-pigeon.svg', './asanas/forearm-stand.svg', './asanas/garland.svg', './asanas/half-moon.svg', './asanas/handstand.svg', './asanas/headstand.svg', './asanas/pigeon.svg', './asanas/scorpion.svg', './asanas/side-crow.svg', './asanas/tree.svg', './asanas/warrior-2.svg', './asanas/warrior-3.svg', './asanas/wheel.svg',  './gear/adidas.webp', './gear/band.webp', './gear/euphoria.webp', './gear/gloves.webp', './gear/gri.webp', './gear/hat.webp', './gear/jedi.webp', './gear/mizuno.webp', './gear/neverlate.webp', './gear/saucony.webp', './gear/sekta.webp', './gear/sekta2.webp', './gear/snood.webp', './gear/ua-black.webp', './gear/ua-grey.webp', './gear/uyn-dark.webp', './gear/uyn-light.webp', './gear/vesna.webp', './gear/veter-lilac.webp', './gear/veter-peach.webp', './gear/veter-tee.webp', './gear/veter-white.webp', './program.js', './schedule.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request)));
});
