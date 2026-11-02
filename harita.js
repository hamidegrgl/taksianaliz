/* ====== AYARLAR ====== */
const TOMTOM_KEY = (window.APP_CONFIG && window.APP_CONFIG.TOMTOM_KEY) || ""; // config.js içinden okunur
const ANKARA = { lat: 39.9334, lon: 32.8597 };  // arama sonuçlarını Ankara'ya yaklaştırmak için
const SEARCH_RADIUS_M = 60000;
/* ===================== */

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const cache = new Map();   // aynı aramayı tekrar göndermemek için (kota tasarrufu)
let marker = null;

function setStatus(msg, isErr) { statusEl.textContent = msg || ""; statusEl.className = isErr ? "err" : ""; }

if (!TOMTOM_KEY) {
  setStatus("config.js dosyasındaki TOMTOM_KEY alanına TomTom API anahtarını yaz.", true);
}

const tileUrl = {
  base: `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
  flow: () => `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_KEY}&t=${Date.now()}`
};

const map = new maplibregl.Map({
  container: "map",
  center: [ANKARA.lon, ANKARA.lat],
  zoom: 11,
  minZoom: 5,
  maxZoom: 18,
  attributionControl: false,
  style: {
    version: 8,
    sources: {
      base: { type: "raster", tiles: [tileUrl.base], tileSize: 256, maxzoom: 22 }
    },
    layers: [{ id: "base", type: "raster", source: "base" }]
  }
});
map.addControl(new maplibregl.NavigationControl(), "bottom-right");
map.addControl(new maplibregl.AttributionControl({ customAttribution: "© TomTom" }), "bottom-left");

function addFlow() {
  if (map.getLayer("flow")) map.removeLayer("flow");
  if (map.getSource("flow")) map.removeSource("flow");
  map.addSource("flow", { type: "raster", tiles: [tileUrl.flow()], tileSize: 256, maxzoom: 22 });
  map.addLayer({ id: "flow", type: "raster", source: "flow",
    layout: { visibility: $("trafficToggle").checked ? "visible" : "none" } });
}

map.on("load", addFlow);

map.on("error", (e) => {
  const code = e && e.error && e.error.status;
  if (code === 403 || code === 401) setStatus("TomTom isteği reddedildi (403/401): anahtarı, alan adı kısıtlamasını veya günlük kotayı kontrol et.", true);
});

$("trafficToggle").addEventListener("change", (e) => {
  if (map.getLayer("flow")) map.setLayoutProperty("flow", "visibility", e.target.checked ? "visible" : "none");
});
$("refresh").addEventListener("click", addFlow);
setInterval(() => { if ($("trafficToggle").checked && map.isStyleLoaded()) addFlow(); }, 5 * 60 * 1000); // 5 dakikada bir

async function searchAddress(query) {
  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json` +
    `?key=${TOMTOM_KEY}&countrySet=TR&limit=6&language=tr-TR` +
    `&lat=${ANKARA.lat}&lon=${ANKARA.lon}&radius=${SEARCH_RADIUS_M}`;
  const res = await fetch(url);
  if (res.status === 403 || res.status === 401) throw new Error("Anahtar geçersiz, alan adı izinli değil veya günlük kota doldu (403/401).");
  if (res.status === 429) throw new Error("Çok sık istek gönderildi, biraz bekleyip tekrar dene.");
  if (!res.ok) throw new Error("Arama servisi hata verdi (" + res.status + ").");
  const data = await res.json();
  const items = (data.results || []).map((r) => ({
    label: (r.poi && r.poi.name ? r.poi.name + " – " : "") + (r.address && r.address.freeformAddress || ""),
    lat: r.position.lat, lon: r.position.lon
  }));
  cache.set(key, items);
  return items;
}

function showPlace(p) {
  if (marker) marker.remove();
  marker = new maplibregl.Marker({ color: "#0b5fff" })
    .setLngLat([p.lon, p.lat])
    .setPopup(new maplibregl.Popup({ offset: 24 }).setText(p.label))
    .addTo(map);
  marker.togglePopup();
  map.flyTo({ center: [p.lon, p.lat], zoom: 16 });
}

$("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("q").value.trim();
  const list = $("results");
  list.replaceChildren();
  if (q.length < 3) { setStatus("En az 3 karakter yaz.", true); return; }
  setStatus("Aranıyor…");
  try {
    const items = await searchAddress(q);
    if (!items.length) { setStatus("Sonuç bulunamadı. Mahalle ve ilçeyi ekleyerek dene."); return; }
    setStatus(items.length + " sonuç bulundu.");
    items.forEach((p) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button"; b.textContent = p.label;
      b.addEventListener("click", () => showPlace(p));
      li.appendChild(b); list.appendChild(li);
    });
    if (items.length === 1) showPlace(items[0]);
  } catch (err) {
    setStatus(err.message, true);
  }
});
