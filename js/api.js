// =============================================
// API — Geocoding (Nominatim) & Weather (Open-Meteo)
// =============================================

// ── WMO Weather Interpretation Codes ──────────
const WMO = {
  0:  { ja: '快晴',         en: 'Clear sky',            icon: '☀️' },
  1:  { ja: '晴れ',         en: 'Mainly clear',         icon: '🌤️' },
  2:  { ja: '一部曇り',     en: 'Partly cloudy',        icon: '⛅' },
  3:  { ja: '曇り',         en: 'Overcast',             icon: '☁️' },
  45: { ja: '霧',           en: 'Fog',                  icon: '🌫️' },
  48: { ja: '霧（着氷）',   en: 'Icy fog',              icon: '🌫️' },
  51: { ja: '霧雨（弱）',   en: 'Light drizzle',        icon: '🌦️' },
  53: { ja: '霧雨',         en: 'Drizzle',              icon: '🌦️' },
  55: { ja: '霧雨（強）',   en: 'Dense drizzle',        icon: '🌦️' },
  61: { ja: '小雨',         en: 'Light rain',           icon: '🌧️' },
  63: { ja: '雨',           en: 'Moderate rain',        icon: '🌧️' },
  65: { ja: '大雨',         en: 'Heavy rain',           icon: '🌧️' },
  71: { ja: '小雪',         en: 'Light snow',           icon: '🌨️' },
  73: { ja: '雪',           en: 'Moderate snow',        icon: '❄️' },
  75: { ja: '大雪',         en: 'Heavy snow',           icon: '❄️' },
  77: { ja: '霧雪',         en: 'Snow grains',          icon: '🌨️' },
  80: { ja: 'にわか雨（弱）',en: 'Light rain shower',   icon: '🌦️' },
  81: { ja: 'にわか雨',     en: 'Rain showers',         icon: '🌦️' },
  82: { ja: 'にわか雨（強）',en: 'Heavy rain shower',   icon: '⛈️' },
  85: { ja: 'にわか雪（弱）',en: 'Light snow shower',   icon: '🌨️' },
  86: { ja: 'にわか雪（強）',en: 'Heavy snow shower',   icon: '🌨️' },
  95: { ja: '雷雨',         en: 'Thunderstorm',         icon: '⛈️' },
  96: { ja: '雷雨（雹）',   en: 'Thunderstorm w/ hail', icon: '⛈️' },
  99: { ja: '雷雨（大雹）', en: 'Thunderstorm w/ heavy hail', icon: '⛈️' },
};

function wmoLabel(code, lang) {
  // Find exact or nearest lower code
  const entry = WMO[code];
  if (entry) return entry;
  // Fallback: search downward
  for (let c = code - 1; c >= 0; c--) {
    if (WMO[c]) return WMO[c];
  }
  return { ja: '不明', en: 'Unknown', icon: '🌡️' };
}

// ── Geocoding via Nominatim (OpenStreetMap) ──
/**
 * Returns { lat, lng, displayName } or throws an Error.
 */
async function geocode(query) {
  if (!query || !query.trim()) throw new Error('empty query');

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query + ' 神社 OR 寺 OR shrine OR temple');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('accept-language', getLang() === 'en' ? 'en' : 'ja,en');

  const res = await fetch(url.toString(), {
    headers: { 'Accept-Language': getLang() === 'en' ? 'en' : 'ja,en' },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

  const data = await res.json();
  if (!data.length) {
    // Retry without shrine/temple suffix
    const url2 = new URL('https://nominatim.openstreetmap.org/search');
    url2.searchParams.set('q', query);
    url2.searchParams.set('format', 'json');
    url2.searchParams.set('limit', '1');
    const res2 = await fetch(url2.toString());
    const data2 = await res2.json();
    if (!data2.length) throw new Error('not found');
    return {
      lat: parseFloat(data2[0].lat),
      lng: parseFloat(data2[0].lon),
      displayName: data2[0].display_name,
    };
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

// ── Weather via Open-Meteo (free, no API key) ──
/**
 * Returns { code, icon, labelJa, labelEn, tempMax, tempMin } or throws.
 * Uses archive API for historical dates, forecast API for recent/future.
 */
async function fetchWeather(lat, lng, dateStr) {
  if (!lat || !lng || !dateStr) throw new Error('Missing params');

  const visitDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysDiff = Math.round((today - visitDate) / 86400000);

  let baseUrl;
  if (daysDiff >= 7) {
    // Historical archive (data available ~5-7 days lag)
    baseUrl = 'https://archive-api.open-meteo.com/v1/archive';
  } else {
    // Forecast API covers past 7 days + future 16 days
    baseUrl = 'https://api.open-meteo.com/v1/forecast';
  }

  const url = new URL(baseUrl);
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lng);
  url.searchParams.set('start_date', dateStr);
  url.searchParams.set('end_date', dateStr);
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', 'Asia/Tokyo');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();

  if (!data.daily || !data.daily.weather_code || data.daily.weather_code.length === 0) {
    throw new Error('No weather data returned');
  }

  const code    = data.daily.weather_code[0];
  const tempMax = Math.round(data.daily.temperature_2m_max[0]);
  const tempMin = Math.round(data.daily.temperature_2m_min[0]);
  const wmo     = wmoLabel(code, 'ja');

  return {
    code,
    icon:    wmo.icon,
    labelJa: wmo.ja,
    labelEn: wmo.en,
    tempMax,
    tempMin,
  };
}

/**
 * Get weather label in current language.
 */
function weatherText(weatherObj, lang) {
  if (!weatherObj) return null;
  const label = lang === 'en' ? weatherObj.labelEn : weatherObj.labelJa;
  return `${weatherObj.icon} ${label} ${weatherObj.tempMax}°/${weatherObj.tempMin}°C`;
}
