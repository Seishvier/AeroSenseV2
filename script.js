/* ============================================================
   AeroSense — script.js
   Live weather + air quality via Open-Meteo (no API key needed)
   ============================================================ */

'use strict';

/* ---------- STATE ---------- */
const state = {
  unit: 'c',
  lat: null,
  lon: null,
  cityInfo: { name: 'AeroSense', sub: 'Search a city to begin' },
  weather: null,
  air: null,
};

/* ---------- DOM HELPER ---------- */
const el = (id) => document.getElementById(id);

/* ---------- WMO WEATHER CODE MAP ---------- */
const WMO_DESC = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  56: 'Freezing drizzle', 57: 'Dense freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Heavy freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Violent showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Severe thunderstorm + hail',
};

const WMO_EMOJI = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  56: '🌧️', 57: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '⛈️',
  66: '🌧️', 67: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️', 77: '🌨️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  85: '🌨️', 86: '❄️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

/* ---------- THEME RESOLVER ---------- */
function getTheme(code, isDay) {
  if (code >= 95) return 'storm';
  if (code >= 71 && code <= 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'cloudy';
  if (code >= 2) return 'cloudy';
  return isDay ? 'clear-day' : 'clear-night';
}

/* ---------- INLINE SVG ICONS ---------- */
const ICONS = {
  drop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7 6.6 9.4a6.7 6.7 0 1 0 10.8 0Z"/></svg>`,
  wind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h8"/></svg>`,
  gauge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14l4-4"/><circle cx="12" cy="14" r="8"/><path d="M12 6V4M5 9 3.5 7.5M19 9l1.5-1.5"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 7 19Z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>`,
  sprout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V10"/><path d="M12 10C12 6 9 3 4 3c0 5 3 8 8 7Z"/><path d="M12 13c0-3 3-6 7-6 0 4-2 7-7 6Z"/></svg>`,
};

/* ---------- HERO ART SVGs ---------- */
const HERO_ART = {
  'clear-day': `
    <svg class="art-svg" viewBox="0 0 200 200" fill="none">
      <defs>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="currentColor" stop-opacity=".55"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="82" fill="url(#sunGlow)"/>
      <g class="rays" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" opacity=".8">
        ${Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x1 = 100 + Math.cos(a) * 48, y1 = 100 + Math.sin(a) * 48;
          const x2 = 100 + Math.cos(a) * 66, y2 = 100 + Math.sin(a) * 66;
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
        }).join('')}
      </g>
      <circle cx="100" cy="100" r="34" fill="currentColor"/>
      <circle cx="100" cy="100" r="34" fill="url(#sunGlow)"/>
    </svg>`,

  'clear-night': `
    <svg class="art-svg" viewBox="0 0 200 200" fill="none">
      <defs>
        <mask id="moonMask">
          <rect width="200" height="200" fill="black"/>
          <circle cx="100" cy="100" r="56" fill="white"/>
          <circle cx="128" cy="80" r="48" fill="black"/>
        </mask>
      </defs>
      <circle cx="100" cy="100" r="56" fill="currentColor" mask="url(#moonMask)"/>
      <g fill="currentColor">
        <circle class="twinkle" cx="52" cy="62" r="2.6"/>
        <circle class="twinkle" cx="150" cy="48" r="2"/>
        <circle class="twinkle" cx="160" cy="126" r="2.8"/>
        <circle class="twinkle" cx="46" cy="140" r="1.9"/>
        <circle class="twinkle" cx="70" cy="36" r="1.6"/>
      </g>
    </svg>`,

  'cloudy': `
    <svg class="art-svg" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M60 130c-16 0-29-13-29-29s13-29 29-29c5 0 9 1 13 3 6-17 22-29 41-29 23 0 42 19 42 42v4c14 3 24 16 24 31 0 18-14 32-32 32H60Z" fill="currentColor" fill-opacity=".18"/>
      <path d="M40 158c-9 0-16-7-16-16s7-16 16-16c3 0 6 1 8 2 3-9 12-15 22-15 13 0 23 10 23 23v3c8 2 14 9 14 18 0 10-8 18-18 18H40Z" fill="currentColor" fill-opacity=".32"/>
    </svg>`,

  'rain': `
    <svg class="art-svg" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M62 118c-16 0-29-13-29-29s13-29 29-29c5 0 9 1 13 3 6-17 22-29 41-29 23 0 42 19 42 42v4c14 3 24 16 24 31 0 18-14 32-32 32H62Z" fill="currentColor" fill-opacity=".2"/>
      <g class="fall" stroke="currentColor" stroke-width="4" opacity=".85">
        <line x1="78" y1="140" x2="74" y2="156"/>
        <line x1="102" y1="140" x2="98" y2="156"/>
        <line x1="126" y1="140" x2="122" y2="156"/>
      </g>
    </svg>`,

  'storm': `
    <svg class="art-svg" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M62 112c-16 0-29-13-29-29s13-29 29-29c5 0 9 1 13 3 6-17 22-29 41-29 23 0 42 19 42 42v4c14 3 24 16 24 31 0 18-14 32-32 32H62Z" fill="currentColor" fill-opacity=".2"/>
      <path class="bolt" d="M104 132l-16 26h14l-6 22 22-30h-14l6-18Z" fill="currentColor"/>
      <g class="fall" stroke="currentColor" stroke-width="3.4" opacity=".7">
        <line x1="58" y1="140" x2="54" y2="154"/>
        <line x1="146" y1="140" x2="142" y2="154"/>
      </g>
    </svg>`,

  'snow': `
    <svg class="art-svg" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M62 112c-16 0-29-13-29-29s13-29 29-29c5 0 9 1 13 3 6-17 22-29 41-29 23 0 42 19 42 42v4c14 3 24 16 24 31 0 18-14 32-32 32H62Z" fill="currentColor" fill-opacity=".2"/>
      <g stroke="currentColor" stroke-width="3.2" opacity=".9">
        <g transform="translate(70 148)"><line x1="-8" y1="0" x2="8" y2="0"/><line x1="-4" y1="-7" x2="4" y2="7"/><line x1="-4" y1="7" x2="4" y2="-7"/></g>
        <g transform="translate(100 156)"><line x1="-8" y1="0" x2="8" y2="0"/><line x1="-4" y1="-7" x2="4" y2="7"/><line x1="-4" y1="7" x2="4" y2="-7"/></g>
        <g transform="translate(130 148)"><line x1="-8" y1="0" x2="8" y2="0"/><line x1="-4" y1="-7" x2="4" y2="7"/><line x1="-4" y1="7" x2="4" y2="-7"/></g>
      </g>
    </svg>`,
};

/* ---------- HELPERS ---------- */
function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function timeOf(isoLocal) {
  return isoLocal ? isoLocal.split('T')[1].slice(0, 5) : '—';
}

function formatCityDate(isoLocal) {
  if (!isoLocal) return '';
  const [datePart, timePart] = isoLocal.split('T');
  const d = new Date(datePart + 'T00:00:00');
  const dayName = d.toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return `${dayName} · ${timePart.slice(0, 5)}`;
}

function weatherEmoji(code) {
  return WMO_EMOJI[code] || '🌡️';
}

function unitLabel() { return state.unit === 'f' ? '°F' : '°C'; }
function windLabel() { return state.unit === 'f' ? 'mph' : 'km/h'; }

function toast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.classList.add('is-open');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('is-open'), 2800);
}

/* ---------- AQI META ---------- */
function aqiInfo(aqi) {
  if (aqi == null) return { label: '—', color: '#3ddc97', pct: 0 };
  const pct = Math.min((aqi / 300) * 100, 100);
  if (aqi <= 50)   return { label: 'Good', color: '#3ddc97', pct };
  if (aqi <= 100)  return { label: 'Moderate', color: '#ffd166', pct };
  if (aqi <= 150)  return { label: 'Unhealthy for sensitive groups', color: '#ff9f43', pct };
  if (aqi <= 200)  return { label: 'Unhealthy', color: '#ff6b6b', pct };
  if (aqi <= 300)  return { label: 'Very unhealthy', color: '#a78bfa', pct };
  return { label: 'Hazardous', color: '#c026d3', pct: 100 };
}

/* ---------- API CALLS ---------- */
async function geocode(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  return data.results || [];
}

async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const d = await r.json();
    return {
      name: d.city || d.locality || d.principalSubdivision || 'My location',
      sub: [d.principalSubdivision, d.countryName].filter(Boolean).join(', '),
    };
  } catch {
    return { name: 'My location', sub: '' };
  }
}

async function fetchWeather(lat, lon) {
  const tempUnit = state.unit === 'f' ? 'fahrenheit' : 'celsius';
  const windUnit = state.unit === 'f' ? 'mph' : 'kmh';
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max` +
    `&timezone=auto&forecast_days=7&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

async function fetchAir(lat, lon) {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Air-quality fetch failed');
  return res.json();
}

/* ---------- LOAD FLOW ---------- */
async function loadByCoords(lat, lon, cityInfo) {
  el('tempValue').classList.add('is-loading');
  try {
    state.lat = lat;
    state.lon = lon;
    state.cityInfo = cityInfo;

    const [weather, air] = await Promise.all([
      fetchWeather(lat, lon),
      fetchAir(lat, lon),
    ]);

    state.weather = weather;
    state.air = air;

    renderAll();
    toast(`Loaded ${cityInfo.name}`);
  } catch (err) {
    console.error(err);
    toast('Could not load data. Please try again.');
  } finally {
    el('tempValue').classList.remove('is-loading');
  }
}

async function searchCity(query) {
  if (!query) return;
  try {
    const results = await geocode(query);
    if (!results.length) {
      toast(`No results for "${query}"`);
      return;
    }
    const r = results[0];
    const cityInfo = {
      name: r.name,
      sub: [r.admin1, r.country].filter(Boolean).join(', '),
    };
    await loadByCoords(r.latitude, r.longitude, cityInfo);
  } catch (err) {
    console.error(err);
    toast('Search failed. Check your connection.');
  }
}

/* ---------- RENDER ---------- */
function renderAll() {
  const w = state.weather;
  const a = state.air;
  if (!w) return;

  renderTheme(w);
  renderHero(w, state.cityInfo);
  renderStats(w);
  renderAir(a);
  renderHourly(w);
  renderDaily(w);
  renderInsights(w, a);
  renderSummary(w, a);
}

function renderTheme(w) {
  const theme = getTheme(w.current.weather_code, w.current.is_day);
  document.body.dataset.theme = theme;
}

function renderHero(w, city) {
  const cur = w.current;
  const d = w.daily;

  el('cityName').textContent = city.name;
  el('citySub').textContent = city.sub || '';
  el('heroDate').textContent = formatCityDate(cur.time);
  el('conditionPill').textContent = WMO_DESC[cur.weather_code] || '—';

  el('tempValue').textContent = Math.round(cur.temperature_2m);
  el('tempUnit').textContent = unitLabel();
  el('feelsLike').textContent = `Feels like ${Math.round(cur.apparent_temperature)}°`;

  el('heroHighLow').textContent =
    `${Math.round(d.temperature_2m_max[0])}° / ${Math.round(d.temperature_2m_min[0])}°`;
  el('heroSunrise').textContent = timeOf(d.sunrise[0]);
  el('heroSunset').textContent = timeOf(d.sunset[0]);
  el('heroWind').textContent = `${Math.round(cur.wind_speed_10m)} ${windLabel()}`;

  const theme = getTheme(cur.weather_code, cur.is_day);
  el('heroArt').innerHTML = HERO_ART[theme] || '';
}

function renderStats(w) {
  const cur = w.current;
  const d = w.daily;

  el('statHumidity').textContent = `${Math.round(cur.relative_humidity_2m)}%`;
  el('statHumidityNote').textContent = humidityNote(cur.relative_humidity_2m);

  el('statWind').textContent = `${Math.round(cur.wind_speed_10m)} ${windLabel()}`;
  el('statWindNote').textContent = windNote(cur.wind_speed_10m);

  el('statPressure').textContent = `${Math.round(cur.pressure_msl)} hPa`;
  el('statPressureNote').textContent =
    cur.pressure_msl > 1015 ? 'High pressure' : cur.pressure_msl < 1005 ? 'Low pressure' : 'Normal';

  el('statPrecip').textContent = `${(cur.precipitation ?? 0).toFixed(1)} mm`;
  el('statPrecipNote').textContent = (cur.precipitation ?? 0) > 0 ? 'Falling now' : 'None now';

  el('statCloud').textContent = `${Math.round(cur.cloud_cover)}%`;
  el('statCloudNote').textContent =
    cur.cloud_cover > 80 ? 'Overcast' : cur.cloud_cover > 40 ? 'Partly cloudy' : 'Mostly clear';

  const uv = d.uv_index_max?.[0] ?? 0;
  el('statUv').textContent = uv.toFixed(1);
  el('statUvNote').textContent = uvNote(uv);
}

function humidityNote(h) {
  if (h > 80) return 'Very humid';
  if (h > 60) return 'Humid';
  if (h > 40) return 'Comfortable';
  return 'Dry';
}
function windNote(ws) {
  if (ws > 40) return 'Very strong';
  if (ws > 25) return 'Strong';
  if (ws > 12) return 'Breezy';
  return 'Calm';
}
function uvNote(uv) {
  if (uv >= 8) return 'Very high';
  if (uv >= 6) return 'High';
  if (uv >= 3) return 'Moderate';
  return 'Low';
}

function renderAir(a) {
  const cur = a?.current;
  const ring = el('aqiRing');
  const aqi = cur?.us_aqi;

  const info = aqiInfo(aqi);
  ring.style.setProperty('--pct', info.pct.toFixed(1));
  ring.style.setProperty('--aqi', info.color);

  el('aqiValue').textContent = aqi != null ? Math.round(aqi) : '—';
  el('aqiLabel').textContent = info.label;
  el('aqiLabel').style.color = info.color;

  el('aqiHint').textContent = aqiHint(aqi);

  const box = el('pollutants');
  if (!cur) {
    box.innerHTML = '<p class="empty-note">No measurements available.</p>';
    return;
  }

  const rows = [
    { name: 'PM2.5', val: cur.pm2_5, unit: 'µg/m³', max: 75 },
    { name: 'PM10', val: cur.pm10, unit: 'µg/m³', max: 150 },
    { name: 'Ozone (O₃)', val: cur.ozone, unit: 'µg/m³', max: 180 },
    { name: 'NO₂', val: cur.nitrogen_dioxide, unit: 'µg/m³', max: 200 },
    { name: 'SO₂', val: cur.sulphur_dioxide, unit: 'µg/m³', max: 125 },
    { name: 'CO', val: cur.carbon_monoxide, unit: 'µg/m³', max: 4000 },
  ];

  box.innerHTML = rows.map((r) => {
    const v = r.val ?? 0;
    const w = Math.min((v / r.max) * 100, 100);
    return `
      <div class="pollutant">
        <span class="pollutant-name">${r.name}</span>
        <div class="pollutant-bar"><span style="--w:${w.toFixed(1)}%"></span></div>
        <span class="pollutant-val">${v.toFixed(1)}<span class="pollutant-unit">${r.unit}</span></span>
      </div>`;
  }).join('');
}

function aqiHint(aqi) {
  if (aqi == null) return 'No air-quality data for this location.';
  if (aqi <= 50) return 'Air quality is satisfactory. Great for outdoor activity.';
  if (aqi <= 100) return 'Acceptable. Sensitive individuals should take it easy.';
  if (aqi <= 150) return 'Sensitive groups should reduce prolonged outdoor exertion.';
  if (aqi <= 200) return 'Everyone may begin to feel effects. Limit outdoor time.';
  if (aqi <= 300) return 'Health alert. Avoid outdoor activity where possible.';
  return 'Emergency conditions. Stay indoors with filtered air.';
}

function renderHourly(w) {
  const box = el('hourly');
  const curTime = w.current.time;
  const currentHour = curTime.slice(0, 13);
  let start = w.hourly.time.findIndex((t) => t.slice(0, 13) === currentHour);
  if (start < 0) start = 0;

  const slice = (arr) => arr.slice(start, start + 24);
  const times = slice(w.hourly.time);
  const temps = slice(w.hourly.temperature_2m);
  const codes = slice(w.hourly.weather_code);
  const pops = slice(w.hourly.precipitation_probability);

  box.innerHTML = times.map((t, i) => {
    const hour = t.split('T')[1].slice(0, 5);
    const pop = pops[i] ?? 0;
    return `
      <div class="hour">
        <span class="hour-time">${hour}</span>
        <span class="hour-emoji">${weatherEmoji(codes[i])}</span>
        <span class="hour-temp">${Math.round(temps[i])}°</span>
        ${pop > 5 ? `<span class="hour-pop">${Math.round(pop)}%</span>` : '<span class="hour-pop" style="opacity:0">·</span>'}
      </div>`;
  }).join('');
}

function renderDaily(w) {
  const box = el('daily');
  const d = w.daily;

  box.innerHTML = d.time.map((iso, i) => {
    const date = new Date(iso + 'T00:00:00');
    const isToday = i === 0;
    const dayName = isToday
      ? 'Today'
      : date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateLabel = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const pop = d.precipitation_probability_max?.[i] ?? 0;

    return `
      <div class="day">
        <div>
          <div class="day-name">${dayName}</div>
          <div class="day-date">${dateLabel}</div>
        </div>
        <div class="day-emoji">${weatherEmoji(d.weather_code[i])}</div>
        <div class="day-bar"><span style="--w:${Math.round(pop)}%"></span></div>
        <div class="day-temps">
          <b>${Math.round(d.temperature_2m_max[i])}°</b>
          <span>${Math.round(d.temperature_2m_min[i])}°</span>
        </div>
      </div>`;
  }).join('');
}

function renderInsights(w, a) {
  const health = [];
  const agri = [];

  const cur = w.current;
  const d = w.daily;
  const aqi = a?.current?.us_aqi ?? null;
  const temp = cur.temperature_2m;
  const hum = cur.relative_humidity_2m;
  const wind = cur.wind_speed_10m;
  const precip24 = (d.precipitation_sum?.[0] ?? 0);
  const uv = d.uv_index_max?.[0] ?? 0;
  const code = cur.weather_code;

  /* ---------- HEALTH ---------- */
  if (aqi != null) {
    if (aqi > 150) health.push('Air is unhealthy — wear an N95 mask and avoid outdoor exercise.');
    else if (aqi > 100) health.push('Sensitive groups should limit prolonged outdoor exertion today.');
    else if (aqi > 50) health.push('Air quality is moderate — sensitive individuals take care.');
    else health.push('Air quality is good — a great day to be outside.');
  }

  if (temp >= 33) health.push('High heat — hydrate frequently and avoid the midday sun.');
  else if (temp <= 10) health.push('Cold conditions — layer up and watch for wind chill.');

  if (uv >= 8) health.push('Very high UV — SPF 50+, sunglasses and a hat are essential.');
  else if (uv >= 3) health.push('Moderate UV — sunscreen is recommended outdoors.');

  if (hum > 80 && temp > 27) health.push('Muggy air — pace yourself and take cool breaks.');

  if (code >= 95) health.push('Thunderstorm active — stay indoors and avoid open areas.');
  else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) health.push('Rain expected — carry an umbrella and watch slippery roads.');

  if (!health.length) health.push('Conditions look comfortable — enjoy your day.');

  /* ---------- AGRICULTURE ---------- */
  if (precip24 >= 5) agri.push(`Skip irrigation — about ${precip24.toFixed(1)} mm of rain is forecast today.`);
  else if (precip24 < 1 && temp > 28) agri.push('Irrigate early morning or late evening to reduce evaporation.');

  if (wind > 25) agri.push('Avoid spraying pesticides — strong wind increases drift risk.');
  else if (wind > 15) agri.push('Spray with caution — moderate wind may affect coverage.');

  if (hum > 85) agri.push('High humidity — scout crops for fungal disease pressure.');
  else if (hum < 40) agri.push('Low humidity — monitor soil moisture closely.');

  if (uv >= 7) agri.push('High UV means faster evapotranspiration — check soil moisture.');

  if (temp <= 5) agri.push('Frost risk overnight — protect sensitive crops and seedlings.');

  if (aqi != null && aqi > 100) agri.push('Poor air quality — limit outdoor field-worker hours.');

  if (!agri.length) agri.push('Conditions are favourable for normal field operations.');

  el('healthTips').innerHTML = health.map((t) => `<li>${t}</li>`).join('');
  el('agriTips').innerHTML = agri.map((t) => `<li>${t}</li>`).join('');
}

function renderSummary(w, a) {
  const cur = w.current;
  const desc = (WMO_DESC[cur.weather_code] || 'Clear').toLowerCase();
  const temp = Math.round(cur.temperature_2m);
  const aqi = a?.current?.us_aqi;
  const aqiTxt = aqi != null ? `Air quality is ${aqiInfo(aqi).label.toLowerCase()} (US AQI ${Math.round(aqi)}).` : '';

  el('summaryText').textContent =
    `${state.cityInfo.name} is currently ${temp}${unitLabel()} with ${desc}. ` +
    `Humidity is ${Math.round(cur.relative_humidity_2m)}% and wind is ${Math.round(cur.wind_speed_10m)} ${windLabel()}. ` +
    aqiTxt;
}

/* ---------- QR CODE ---------- */
function makeQR(containerId, text, size) {
  const box = el(containerId);
  if (!box) return;
  box.innerHTML = '';

  if (typeof QRCode === 'undefined') {
    box.textContent = 'QR unavailable';
    box.style.color = '#0b1220';
    box.style.fontSize = '.7rem';
    box.style.padding = '10px';
    return;
  }

  const canvas = document.createElement('canvas');
  QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 1,
    color: { dark: '#0b1220', light: '#ffffff' },
  }, (err) => {
    if (err) { box.textContent = 'QR error'; return; }
    box.appendChild(canvas);
  });
}

function setupQR() {
  const shareUrl =
    (location.origin && location.origin !== 'null')
      ? location.origin + location.pathname
      : location.href;

  el('shareUrlText').textContent = shareUrl;
  el('shareUrlSidebar').textContent = shareUrl.replace(/^https?:\/\//, '').slice(0, 40) + (shareUrl.length > 40 ? '…' : '');

  makeQR('qrMain', shareUrl, 200);
  makeQR('qrSidebar', shareUrl, 120);
}

/* ---------- SUGGESTIONS ---------- */
let suggestionResults = [];

function hideSuggestions() {
  el('suggestions').hidden = true;
  el('suggestions').innerHTML = '';
}

function renderSuggestions(results) {
  const box = el('suggestions');
  if (!results.length) { hideSuggestions(); return; }

  box.innerHTML = results.map((r, i) => {
    const sub = [r.admin1, r.country].filter(Boolean).join(', ');
    return `
      <button class="suggestion" data-index="${i}" type="button">
        <span class="suggestion-pin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="10" r="2.5"/>
          </svg>
        </span>
        <span class="suggestion-text">
          <span class="suggestion-name">${r.name}</span><br/>
          <span class="suggestion-sub">${sub || '—'}</span>
        </span>
      </button>`;
  }).join('');

  box.querySelectorAll('.suggestion').forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = suggestionResults[Number(btn.dataset.index)];
      el('cityInput').value = r.name;
      hideSuggestions();
      loadByCoords(r.latitude, r.longitude, {
        name: r.name,
        sub: [r.admin1, r.country].filter(Boolean).join(', '),
      });
    });
  });

  box.hidden = false;
}

/* ---------- EVENT WIRING ---------- */
function setupEvents() {
  /* Search form */
  el('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = el('cityInput').value.trim();
    hideSuggestions();
    if (q) searchCity(q);
  });

  /* Debounced suggestions */
  el('cityInput').addEventListener('input', debounce(async (e) => {
    const q = e.target.value.trim();
    if (q.length < 2) { hideSuggestions(); return; }
    try {
      const results = await geocode(q);
      suggestionResults = results;
      renderSuggestions(results);
    } catch { hideSuggestions(); }
  }, 300));

  /* Click outside closes suggestions */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) hideSuggestions();
  });

  /* Geolocation */
  el('geoBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('Geolocation is not supported.'); return; }
    toast('Locating you…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const info = await reverseGeocode(latitude, longitude);
        loadByCoords(latitude, longitude, info);
      },
      () => toast('Could not access your location.'),
      { timeout: 10000, maximumAge: 60000 }
    );
  });

  /* Unit toggle */
  document.querySelectorAll('.unit').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.unit === state.unit) return;
      state.unit = btn.dataset.unit;
      document.querySelectorAll('.unit').forEach((b) =>
        b.classList.toggle('is-active', b === btn)
      );
      if (state.lat != null) {
        el('tempValue').classList.add('is-loading');
        fetchWeather(state.lat, state.lon)
          .then((w) => {
            state.weather = w;
            renderAll();
          })
          .catch(() => toast('Could not update units.'))
          .finally(() => el('tempValue').classList.remove('is-loading'));
      }
    });
  });

  /* Sidebar (mobile) */
  el('menuBtn').addEventListener('click', () => {
    el('sidebar').classList.add('is-open');
    el('scrim').classList.add('is-open');
  });
  el('scrim').addEventListener('click', () => {
    el('sidebar').classList.remove('is-open');
    el('scrim').classList.remove('is-open');
  });

  /* Nav links close sidebar on mobile + set active */
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('is-active'));
      link.classList.add('is-active');
      if (window.innerWidth <= 1024) {
        el('sidebar').classList.remove('is-open');
        el('scrim').classList.remove('is-open');
      }
    });
  });

  /* Copy share link */
  el('copyBtn').addEventListener('click', async () => {
    const text = el('shareUrlText').textContent;
    try {
      await navigator.clipboard.writeText(text);
      toast('Link copied to clipboard');
    } catch {
      toast('Could not copy link');
    }
  });
}

/* ---------- BOOT ---------- */
function init() {
  document.querySelectorAll('[data-icon]').forEach((node) => {
    node.innerHTML = ICONS[node.dataset.icon] || '';
  });

  el('year').textContent = new Date().getFullYear();

  el('heroDate').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  setupEvents();
  setupQR();

  /* Default city on first paint */
  loadByCoords(-6.2088, 106.8456, {
    name: 'Jakarta',
    sub: 'Special Capital Region of Jakarta, Indonesia',
  });
}

document.addEventListener('DOMContentLoaded', init);
