// static/main.js
// Relative paths, robust behavior. Does not include API keys.
const COUNTIES = [
  {id:'amelia',name:'Amelia',lat:37.342,lon:-77.980},
  {id:'nottoway',name:'Nottoway',lat:37.142,lon:-78.089},
  {id:'dinwiddie',name:'Dinwiddie',lat:37.077,lon:-77.587},
  {id:'prgeorge',name:'Prince George',lat:37.221,lon:-77.288},
  {id:'brunswick',name:'Brunswick',lat:36.770,lon:-77.880},
  {id:'greensville',name:'Greensville',lat:36.680,lon:-77.540}
];

// Theme init
function initTheme(){
  const saved = localStorage.getItem('theme');
  if(saved) document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');
  else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.setAttribute('data-theme','light');
  const tbtn = document.getElementById('darkToggle');
  if(tbtn) tbtn.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', cur);
    localStorage.setItem('theme', cur);
  });
}

// Map + UI
const map = L.map('map').setView([37.1,-77.7],9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
const markers = {};
const cards = document.getElementById('cards');
COUNTIES.forEach(c=>{
  const el = document.createElement('div'); el.className='card'; el.id=`card-${c.id}`;
  el.innerHTML = `<strong>${c.name}</strong>
    <div id="line-${c.id}" class="muted">Loading…</div>
    <div id="hot-${c.id}" class="muted">Hotspots: —</div>`;
  cards.appendChild(el);
  markers[c.id] = L.marker([c.lat,c.lon]).addTo(map).bindPopup(c.name);
});

function mphFromWindStr(s){ if(!s) return null; const nums = (String(s).match(/\d+(\.\d+)?/g)||[]).map(Number); return nums.length?Math.max(...nums):null; }

async function fetchHourly(lat,lon){
  try{
    const p = await fetch(`https://api.weather.gov/points/${lat},${lon}`).then(r=>r.json());
    if(!p?.properties?.forecastHourly) return [];
    const h = await fetch(p.properties.forecastHourly).then(r=>r.json());
    return h?.properties?.periods||[];
  }catch(e){
    return [];
  }
}

function summarize24h(periods){
  const cutoff = Date.now() + 24*3600*1000;
  let minRH=null,maxWind=null,maxGust=null,peakT=null,dew=null;
  for(const p of periods){
    if(new Date(p.startTime).getTime() >= cutoff) break;
    if(p.relativeHumidity?.value!=null) minRH = minRH==null? p.relativeHumidity.value : Math.min(minRH,p.relativeHumidity.value);
    const wind = mphFromWindStr(p.windSpeed) || mphFromWindStr(p.windGust);
    if(wind!=null) maxWind = maxWind==null?wind:Math.max(maxWind,wind);
    const gust = mphFromWindStr(p.windGust);
    if(gust!=null) maxGust = maxGust==null?gust:Math.max(maxGust,gust);
    if(p.temperature!=null) peakT = peakT==null? p.temperature : Math.max(peakT,p.temperature);
    if(p.dewpoint?.value!=null) dew = dew==null? p.dewpoint.value : Math.max(dew,p.dewpoint.value);
  }
  return {minRH,maxWind,maxGust,peakT,dew};
}

async function refreshAll(force=false){
  const last = new Date().toLocaleString('en-US',{timeZone:'America/New_York'});
  const el = document.getElementById('lastRun'); if(el) el.textContent = last;

  // load server-produced fire_data.json (relative path)
  let fireData = {};
  try{
    const r = await fetch('fire_data.json');
    if(r.ok) {
      const j = await r.json();
      if(j.counties) fireData = j.counties;
      else fireData = j;
    }
  }catch(e){
    // ignore - demo will continue with placeholders
  }

  for(const c of COUNTIES){
    try{
      const periods = await fetchHourly(c.lat,c.lon);
      const s = summarize24h(periods);
      const line = document.getElementById(`line-${c.id}`);
      if(line) line.textContent = `T ${s.peakT==null?'–':s.peakT+'°F'} · RH ${s.minRH==null?'–':Math.round(s.minRH)+'%'} · Wind ${s.maxWind==null?'–':Math.round(s.maxWind)+' mph'} · Gust ${s.maxGust==null?'–':Math.round(s.maxGust)+' mph'} · Dewpt ${s.dew==null?'–':s.dew+'°F'}`;
      const hot = (fireData?.[c.name]?.hotspots ?? fireData?.[c.id]?.hotspots) ?? '—';
      const hotEl = document.getElementById(`hot-${c.id}`);
      if(hotEl) hotEl.textContent = 'Hotspots: ' + hot;
    }catch(err){
      const line = document.getElementById(`line-${c.id}`);
      if(line) line.textContent = 'Data unavailable';
    }
  }
}

// Windy open behaviour: windy_key.js (written by build action) will set window.WINDY_KEY if present
document.getElementById('windyBtn').addEventListener('click', ()=>{
  const lat=37.1, lon=-77.7, zoom=9;
  const key = (window.WINDY_KEY && typeof window.WINDY_KEY === 'string') ? window.WINDY_KEY : '';
  const url = key ? `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=${zoom}&level=surface&overlay=fire,wind&menu=&message=true&marker=&calendar=now&pressure=&type=map&key=${key}` 
                    : `https://www.windy.com/?${lat},${lon},${zoom}`;
  window.open(url,'_blank','noopener');
});

initTheme();
refreshAll();
setInterval(refreshAll, 15*60*1000);
document.getElementById('refresh').addEventListener('click', ()=> refreshAll(true));
