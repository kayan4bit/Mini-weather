/**
 * Mini Weather — Production-Ready Weather App
 * APIs: WeatherAPI.com (primary), Open-Meteo, NWS, wttr.in
 * Features: Search, Favourites, History, Export, Comparison, Filtering,
 *           Virtual Garden, 80+ Themes, Device Detection, PWA, Notifications
 *
 * @version 2.0.0
 */

'use strict';

/* ============================================================
   SERVICE WORKER REGISTRATION
   ============================================================ */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ============================================================
   DEVICE DETECTION
   ============================================================ */
const Device = {
    type: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    isLandscape: false,

    detect() {
        const w = window.innerWidth;
        this.hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.isLandscape = window.innerWidth > window.innerHeight;

        if (w < 768 || (this.hasTouch && w < 1024)) {
            this.type = w < 481 ? 'mobile' : 'tablet';
            this.isMobile = w < 481;
            this.isTablet = w >= 481 && w < 1024;
            this.isDesktop = false;
        } else {
            this.type = 'desktop';
            this.isMobile = false;
            this.isTablet = false;
            this.isDesktop = true;
        }

        localStorage.setItem('mini-weather-device', this.type);
        document.body.setAttribute('data-device', this.type);

        const badge = document.getElementById('device-badge');
        if (badge) {
            const icons = { mobile: '📱', tablet: '📟', desktop: '🖥️' };
            badge.textContent = `${icons[this.type] || '💻'} ${this.type}`;
        }

        return this.type;
    }
};

Device.detect();
window.addEventListener('resize', () => Device.detect(), { passive: true });

/* ============================================================
   NOTIFICATION MANAGER
   ============================================================ */
class NotificationManager {
    constructor() {
        this.supported = 'Notification' in window;
        this.enabled = localStorage.getItem('mini-weather-notifications') === 'true';
    }

    async requestPermission() {
        if (!this.supported) return false;
        if (Notification.permission === 'granted') {
            this.enabled = true;
            localStorage.setItem('mini-weather-notifications', 'true');
            return true;
        }
        if (Notification.permission !== 'denied') {
            const perm = await Notification.requestPermission();
            this.enabled = perm === 'granted';
            localStorage.setItem('mini-weather-notifications', this.enabled ? 'true' : 'false');
            return this.enabled;
        }
        return false;
    }

    send(title, options = {}) {
        if (!this.enabled || !this.supported) return;
        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, options });
            } else {
                new Notification(title, options);
            }
        } catch (e) { /* silent */ }
    }
}

const notifications = new NotificationManager();

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg, duration = 2800) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ============================================================
   THEME SYSTEM
   ============================================================ */
const THEMES = {
    // Core
    dark:              { label: 'Dark',            bg: '#0a0a0a', accent: '#1e88e5' },
    light:             { label: 'Light',           bg: '#f5f7fa', accent: '#1565c0' },
    // Nature
    ocean:             { label: 'Ocean',           bg: '#0d1b2a', accent: '#00b4d8' },
    forest:            { label: 'Forest',          bg: '#0a1a0a', accent: '#4caf50' },
    jungle:            { label: 'Jungle',          bg: '#081208', accent: '#388e3c' },
    desert:            { label: 'Desert',          bg: '#1a1208', accent: '#e65100' },
    glacier:           { label: 'Glacier',         bg: '#0a1520', accent: '#00b0ff' },
    aurora:            { label: 'Aurora',          bg: '#050f1a', accent: '#00e5ff' },
    // Warm
    sunset:            { label: 'Sunset',          bg: '#1a0a00', accent: '#ff6b35' },
    warm:              { label: 'Warm',            bg: '#1a1208', accent: '#ff8f00' },
    amber:             { label: 'Amber',           bg: '#1a1200', accent: '#ffc107' },
    retro:             { label: 'Retro',           bg: '#1a1000', accent: '#ff8800' },
    solstice:          { label: 'Solstice',        bg: '#1a0a00', accent: '#ff6f00' },
    flame:             { label: 'Flame',           bg: '#100500', accent: '#ff3d00' },
    coral:             { label: 'Coral',           bg: '#1a0a08', accent: '#ff5722' },
    // Cool
    cool:              { label: 'Cool',            bg: '#0a1020', accent: '#4488ff' },
    nord:              { label: 'Nord',            bg: '#2e3440', accent: '#88c0d0' },
    solarized:         { label: 'Solarized',       bg: '#002b36', accent: '#268bd2' },
    slate:             { label: 'Slate',           bg: '#1a1f2e', accent: '#7c9ef8' },
    midnight:          { label: 'Midnight',        bg: '#020408', accent: '#3a6fd8' },
    storm:             { label: 'Storm',           bg: '#0a0c10', accent: '#546e7a' },
    // Purple/Pink
    lavender:          { label: 'Lavender',        bg: '#1a1025', accent: '#9c27b0' },
    berry:             { label: 'Berry',           bg: '#1a0a15', accent: '#e91e63' },
    dracula:           { label: 'Dracula',         bg: '#282a36', accent: '#bd93f9' },
    eclipse:           { label: 'Eclipse',         bg: '#0a0510', accent: '#7c4dff' },
    nebula:            { label: 'Nebula',          bg: '#080510', accent: '#aa00ff' },
    twilight:          { label: 'Twilight',        bg: '#0f0a1a', accent: '#7e57c2' },
    mystic:            { label: 'Mystic',          bg: '#080510', accent: '#6a1b9a' },
    amethyst:          { label: 'Amethyst',        bg: '#0f0818', accent: '#9c27b0' },
    rose:              { label: 'Rose',            bg: '#1a0810', accent: '#f06292' },
    // Green
    mint:              { label: 'Mint',            bg: '#0a1a15', accent: '#00bfa5' },
    emerald:           { label: 'Emerald',         bg: '#051a10', accent: '#00c853' },
    jade:              { label: 'Jade',            bg: '#081510', accent: '#00897b' },
    topaz:             { label: 'Topaz',           bg: '#0a1510', accent: '#26a69a' },
    // Special
    cyberpunk:         { label: 'Cyberpunk',       bg: '#0a0015', accent: '#ff0080' },
    neon:              { label: 'Neon',            bg: '#050510', accent: '#00ff88' },
    gruvbox:           { label: 'Gruvbox',         bg: '#282828', accent: '#d79921' },
    monochrome:        { label: 'Mono',            bg: '#000000', accent: '#ffffff' },
    obsidian:          { label: 'Obsidian',        bg: '#050505', accent: '#424242' },
    shadow:            { label: 'Shadow',          bg: '#080808', accent: '#808080' },
    // Light themes
    pastel:            { label: 'Pastel',          bg: '#fef9ff', accent: '#c084fc' },
    ice:               { label: 'Ice',             bg: '#f0f8ff', accent: '#0288d1' },
    pearl:             { label: 'Pearl',           bg: '#f8f8ff', accent: '#7986cb' },
    ethereal:          { label: 'Ethereal',        bg: '#f8f0ff', accent: '#ab47bc' },
    radiant:           { label: 'Radiant',         bg: '#fff8e8', accent: '#f57f17' },
    // Gems
    ruby:              { label: 'Ruby',            bg: '#1a0505', accent: '#c62828' },
    sapphire:          { label: 'Sapphire',        bg: '#050a1a', accent: '#1565c0' },
    bronze:            { label: 'Bronze',          bg: '#150e05', accent: '#a0522d' },
    silver:            { label: 'Silver',          bg: '#1a1a1e', accent: '#9e9e9e' },
    gold:              { label: 'Gold',            bg: '#120e00', accent: '#ffd600' },
    copper:            { label: 'Copper',          bg: '#120a05', accent: '#bf6030' },
    platinum:          { label: 'Platinum',        bg: '#f0f2f5', accent: '#607d8b' },
    coffee:            { label: 'Coffee',          bg: '#1a1008', accent: '#8d6e63' },
    cherry:            { label: 'Cherry',          bg: '#1a0a15', accent: '#e91e63' },
    // New themes from requirements
    'ocean-deep':      { label: 'Ocean Deep',      bg: '#020d1a', accent: '#0066cc' },
    'sunset-warm':     { label: 'Sunset Warm',     bg: '#1a0800', accent: '#ff6600' },
    'forest-dark':     { label: 'Forest Dark',     bg: '#050f05', accent: '#2e7d32' },
    'aurora-borealis': { label: 'Aurora Borealis', bg: '#020810', accent: '#00e5cc' },
    'midnight-blue':   { label: 'Midnight Blue',   bg: '#010308', accent: '#1a3a8a' },
    'cherry-blossom':  { label: 'Cherry Blossom',  bg: '#fff0f5', accent: '#e91e8c' },
    'desert-sand':     { label: 'Desert Sand',     bg: '#1e1808', accent: '#d4a017' },
    'glacier-ice':     { label: 'Glacier Ice',     bg: '#e8f4ff', accent: '#0277bd' },
    'storm-dark':      { label: 'Storm Dark',      bg: '#050608', accent: '#37474f' },
    'flame-fire':      { label: 'Flame Fire',      bg: '#0f0300', accent: '#ff1a00' },
    'twilight-purple': { label: 'Twilight Purple', bg: '#0c0818', accent: '#673ab7' },
    'mystic-dark':     { label: 'Mystic Dark',     bg: '#060408', accent: '#4a148c' },
    'jade-green':      { label: 'Jade Green',      bg: '#041008', accent: '#00695c' },
    'bronze-gold':     { label: 'Bronze Gold',     bg: '#100a02', accent: '#b8860b' },
    'silver-white':    { label: 'Silver White',    bg: '#f8f8fa', accent: '#8888b0' },
    'platinum-light':  { label: 'Platinum Light',  bg: '#f4f6f8', accent: '#5c6bc0' },
    'ruby-red':        { label: 'Ruby Red',        bg: '#120303', accent: '#b71c1c' },
    'sapphire-blue':   { label: 'Sapphire Blue',   bg: '#020510', accent: '#1a237e' },
    'emerald-green':   { label: 'Emerald Green',   bg: '#021008', accent: '#1b5e20' },
    'amethyst-purple': { label: 'Amethyst Purple', bg: '#0a0515', accent: '#7b1fa2' },
    'coral-pink':      { label: 'Coral Pink',      bg: '#1a0808', accent: '#ff4081' },
    'teal-cyan':       { label: 'Teal Cyan',       bg: '#041418', accent: '#00838f' },
    'indigo-dark':     { label: 'Indigo Dark',     bg: '#060818', accent: '#283593' },
    'rose-pink':       { label: 'Rose Pink',       bg: '#180810', accent: '#e91e63' },
    'gold-warm':       { label: 'Gold Warm',       bg: '#100c00', accent: '#f9a825' },
    'copper-brown':    { label: 'Copper Brown',    bg: '#100805', accent: '#bf5a30' },
    'slate-gray':      { label: 'Slate Gray',      bg: '#141820', accent: '#607d8b' },
    'charcoal-dark':   { label: 'Charcoal Dark',   bg: '#0c0c0c', accent: '#616161' },
    'cream-light':     { label: 'Cream Light',     bg: '#fdf8f0', accent: '#8d6e63' },
    'mint-fresh':      { label: 'Mint Fresh',      bg: '#f0fff8', accent: '#00c853' },
};

let currentTheme = localStorage.getItem('mini-weather-theme') || 'dark';

function initThemes() {
    const grid = document.getElementById('theme-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.entries(THEMES).forEach(([key, theme]) => {
        const swatch = document.createElement('div');
        swatch.className = 'theme-swatch' + (key === currentTheme ? ' active' : '');
        swatch.title = theme.label;
        swatch.setAttribute('aria-label', theme.label);
        swatch.style.cssText = `background: linear-gradient(135deg, ${theme.bg} 50%, ${theme.accent} 100%);`;
        swatch.addEventListener('click', (e) => {
            e.stopPropagation();
            applyTheme(key);
            document.getElementById('theme-dropdown').classList.remove('active');
        });
        grid.appendChild(swatch);
    });
}

function applyTheme(key) {
    if (!THEMES[key]) key = 'dark';
    document.body.setAttribute('data-theme', key);
    currentTheme = key;
    localStorage.setItem('mini-weather-theme', key);

    // Update active swatch
    document.querySelectorAll('.theme-swatch').forEach((s, i) => {
        s.classList.toggle('active', Object.keys(THEMES)[i] === key);
    });

    showToast(`Theme: ${THEMES[key]?.label || key}`);
}

// Theme toggle button
document.getElementById('theme-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('theme-dropdown').classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.theme-wrapper')) {
        document.getElementById('theme-dropdown').classList.remove('active');
    }
});

/* ============================================================
   WEATHER UTILITIES
   ============================================================ */
function getWeatherIcon(code, isDay = true) {
    if (code === 0) return isDay ? '☀️' : '🌙';
    if (code === 1) return isDay ? '🌤️' : '🌤️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code === 45 || code === 48) return '🌫️';
    if (code === 51 || code === 53 || code === 55) return '🌦️';
    if (code === 56 || code === 57) return '🌨️';
    if (code === 61 || code === 63 || code === 65) return '🌧️';
    if (code === 66 || code === 67) return '🌨️';
    if (code === 71 || code === 73 || code === 75 || code === 77) return '❄️';
    if (code === 80 || code === 81 || code === 82) return '⛈️';
    if (code === 85 || code === 86) return '🌨️';
    if (code === 95) return '⛈️';
    if (code === 96 || code === 99) return '⛈️';
    return '🌡️';
}

function getWeatherDescription(code) {
    const map = {
        0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Rime Fog',
        51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
        56: 'Freezing Drizzle', 57: 'Heavy Freezing Drizzle',
        61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
        66: 'Freezing Rain', 67: 'Heavy Freezing Rain',
        71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 77: 'Snow Grains',
        80: 'Rain Showers', 81: 'Heavy Showers', 82: 'Violent Showers',
        85: 'Snow Showers', 86: 'Heavy Snow Showers',
        95: 'Thunderstorm', 96: 'Thunderstorm + Hail', 99: 'Severe Thunderstorm'
    };
    return map[code] || 'Unknown';
}

function getWindDirection(deg) {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16] || '—';
}

function getUVLabel(uv) {
    if (uv < 3) return 'Low';
    if (uv < 6) return 'Moderate';
    if (uv < 8) return 'High';
    if (uv < 11) return 'Very High';
    return 'Extreme';
}

function getPressureLabel(hpa) {
    if (hpa > 1022) return 'High (Clear)';
    if (hpa < 1000) return 'Low (Stormy)';
    return 'Normal';
}

function getHumidityLabel(h) {
    if (h < 30) return 'Dry';
    if (h < 60) return 'Comfortable';
    if (h < 80) return 'Humid';
    return 'Very Humid';
}

/* ============================================================
   VIRTUAL GARDEN
   ============================================================ */
const Garden = {
    KEY_PLANT: 'mini-weather-garden-plant',
    KEY_STREAK: 'mini-weather-garden-streak',
    KEY_LAST: 'mini-weather-garden-last',
    KEY_MONTH: 'mini-weather-garden-month',
    KEY_BORN: 'mini-weather-garden-born',

    init() {
        // Monthly reset on 1st of month
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
        const savedMonth = localStorage.getItem(this.KEY_MONTH);

        if (savedMonth !== monthKey) {
            // New month — reset garden
            localStorage.setItem(this.KEY_MONTH, monthKey);
            localStorage.setItem(this.KEY_STREAK, '0');
            localStorage.setItem(this.KEY_BORN, now.toISOString());
            localStorage.removeItem(this.KEY_LAST);
        }

        // Ensure born date exists
        if (!localStorage.getItem(this.KEY_BORN)) {
            localStorage.setItem(this.KEY_BORN, now.toISOString());
        }
    },

    getStreak() {
        return parseInt(localStorage.getItem(this.KEY_STREAK) || '0', 10);
    },

    getDaysAlive() {
        const born = localStorage.getItem(this.KEY_BORN);
        if (!born) return 0;
        const diff = Date.now() - new Date(born).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    },

    updateStreak() {
        const today = new Date().toDateString();
        const last = localStorage.getItem(this.KEY_LAST);
        if (last !== today) {
            const streak = this.getStreak() + 1;
            localStorage.setItem(this.KEY_STREAK, String(streak));
            localStorage.setItem(this.KEY_LAST, today);
        }
    },

    getGrowthStage(daysAlive) {
        if (daysAlive < 3) return { size: 'small', label: 'Seedling' };
        if (daysAlive < 7) return { size: 'medium', label: 'Sprout' };
        if (daysAlive < 14) return { size: 'large', label: 'Growing' };
        if (daysAlive < 21) return { size: 'xlarge', label: 'Mature' };
        return { size: 'xlarge', label: 'Ancient' };
    },

    getPlantEmoji(temp, state) {
        // Temperature-based emoji
        if (temp <= 0) return '❄️';
        if (temp <= 8) return '🌿';
        if (temp <= 15) return '🌱';
        if (temp <= 25) {
            if (state === 'thriving') return '🌻';
            if (state === 'healthy') return '🌿';
            if (state === 'stressed') return '🌾';
            return '🍂';
        }
        if (temp <= 32) return '🌻';
        return '🔥';
    },

    getState(temp, humidity, windSpeed, precipitation, uvIndex) {
        let score = 0;
        const details = [];

        // Temperature (25 pts)
        if (temp >= 15 && temp <= 25) { score += 25; details.push('✅ Perfect temperature'); }
        else if (temp >= 8 && temp <= 32) { score += 15; details.push('⚠️ Acceptable temperature'); }
        else { score += 3; details.push('❌ Extreme temperature'); }

        // Humidity (25 pts)
        if (humidity >= 40 && humidity <= 70) { score += 25; details.push('✅ Ideal humidity'); }
        else if (humidity >= 25 && humidity <= 85) { score += 14; details.push('⚠️ Acceptable humidity'); }
        else { score += 3; details.push('❌ Poor humidity'); }

        // Wind (20 pts)
        if (windSpeed < 15) { score += 20; details.push('✅ Calm winds'); }
        else if (windSpeed < 35) { score += 10; details.push('⚠️ Breezy'); }
        else { score += 2; details.push('❌ Strong winds'); }

        // Precipitation (15 pts)
        if (precipitation === 0) { score += 15; details.push('✅ No precipitation'); }
        else if (precipitation < 5) { score += 12; details.push('✅ Light rain'); }
        else if (precipitation < 20) { score += 6; details.push('⚠️ Heavy rain'); }
        else { score += 1; details.push('❌ Extreme rain'); }

        // UV (15 pts)
        if (uvIndex <= 3) { score += 15; details.push('✅ Safe UV'); }
        else if (uvIndex <= 6) { score += 10; details.push('⚠️ Moderate UV'); }
        else if (uvIndex <= 9) { score += 5; details.push('⚠️ High UV'); }
        else { score += 2; details.push('❌ Extreme UV'); }

        if (score >= 88) return { state: 'thriving', text: 'THRIVING', score, details };
        if (score >= 68) return { state: 'healthy',  text: 'HEALTHY',  score, details };
        if (score >= 45) return { state: 'stressed', text: 'STRESSED', score, details };
        return { state: 'wilted', text: 'WILTED', score, details };
    },

    render(weatherData) {
        if (!weatherData) return;

        this.init();
        this.updateStreak();

        const { temp, humidity, windSpeed, precipitation, uvIndex } = weatherData;
        const gardenState = this.getState(temp, humidity, windSpeed, precipitation, uvIndex);
        const daysAlive = this.getDaysAlive();
        const streak = this.getStreak();
        const growth = this.getGrowthStage(daysAlive);
        const emoji = this.getPlantEmoji(temp, gardenState.state);

        // Decorative plants
        const decos = ['🌿', '🍀', '🌸', '🌺', '🌼'];
        const deco1 = decos[daysAlive % decos.length];
        const deco2 = decos[(daysAlive + 2) % decos.length];

        const statusClass = `status-${gardenState.state}`;

        const html = `
            <div class="garden-header">
                <div class="garden-title">🌱 Virtual Garden</div>
                <div class="garden-streak">🔥 ${streak} day streak</div>
            </div>

            <div class="garden-scene">
                <div class="garden-deco">${deco1}</div>
                <div class="garden-plant ${gardenState.state} ${growth.size}" id="garden-plant">${emoji}</div>
                <div class="garden-deco">${deco2}</div>
                <div class="garden-ground"></div>
            </div>

            <div style="text-align:center; margin-top: 10px;">
                <span class="garden-status-badge ${statusClass}">
                    ${emoji} ${gardenState.text} — ${growth.label}
                </span>
            </div>

            <div class="garden-info">
                <div class="garden-stat">
                    <div class="garden-stat-label">🌱 Days Alive</div>
                    <div class="garden-stat-value">${daysAlive}</div>
                </div>
                <div class="garden-stat">
                    <div class="garden-stat-label">💚 Health Score</div>
                    <div class="garden-stat-value">${gardenState.score}/100</div>
                </div>
                <div class="garden-stat">
                    <div class="garden-stat-label">📈 Growth Stage</div>
                    <div class="garden-stat-value">${growth.label}</div>
                </div>
                <div class="garden-stat">
                    <div class="garden-stat-label">🌡️ Temp Effect</div>
                    <div class="garden-stat-value">${temp <= 0 ? '❄️ Frozen' : temp <= 15 ? '🌿 Cool' : temp <= 28 ? '🌻 Ideal' : '🔥 Hot'}</div>
                </div>
            </div>

            <div class="garden-conditions">
                ${gardenState.details.map(d => `<div class="garden-condition-item">${d}</div>`).join('')}
            </div>
        `;

        const card = document.getElementById('garden-card');
        if (card) card.innerHTML = html;
    }
};

/* ============================================================
   TEMPERATURE / UNIT CONVERSION
   ============================================================ */
let unit = localStorage.getItem('mini-weather-unit') || 'C';

function toDisplay(tempC) {
    if (unit === 'F') return Math.round((tempC * 9 / 5) + 32);
    return Math.round(tempC);
}

function windDisplay(kmh) {
    if (unit === 'F') return (Math.round(kmh * 0.621371 * 10) / 10);
    return Math.round(kmh * 10) / 10;
}

function windUnit() { return unit === 'F' ? 'mph' : 'km/h'; }

/* ============================================================
   LOCATION NAME (Nominatim)
   ============================================================ */
async function getLocationName(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
            { signal: AbortSignal.timeout(6000) }
        );
        if (!res.ok) throw new Error('Nominatim error');
        const data = await res.json();
        const a = data.address || {};
        const parts = [];
        if (a.city) parts.push(a.city);
        else if (a.town) parts.push(a.town);
        else if (a.village) parts.push(a.village);
        else if (a.county) parts.push(a.county);
        if (a.state && a.state !== parts[0]) parts.push(a.state);
        if (a.country) parts.push(a.country);
        return parts.join(', ') || 'Your Location';
    } catch {
        return `${parseFloat(lat).toFixed(2)}°, ${parseFloat(lon).toFixed(2)}°`;
    }
}

/* ============================================================
   API: WeatherAPI.com (PRIMARY)
   ============================================================ */
const WEATHERAPI_KEY = 'd2cbbf50a55542749d8151557260406';

async function fetchWeatherAPI(lat, lon) {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${lat},${lon}&days=14&aqi=no&alerts=yes`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`WeatherAPI HTTP ${res.status}`);
    const d = await res.json();
    return normalizeWeatherAPI(d);
}

function normalizeWeatherAPI(d) {
    const c = d.current;
    const loc = d.location;

    // Build hourly from all forecast days
    const hourly = [];
    d.forecast.forecastday.forEach(day => {
        day.hour.forEach(h => {
            hourly.push({
                time: h.time,
                temp: h.temp_c,
                code: mapWeatherAPICode(h.condition.code, h.is_day),
                precipitation: h.chance_of_rain || 0,
                wind: h.wind_kph,
                humidity: h.humidity,
                feelsLike: h.feelslike_c,
                dewPoint: h.dewpoint_c,
                uvIndex: h.uv,
                cloudCover: h.cloud,
                pressure: h.pressure_mb,
                visibility: h.vis_km
            });
        });
    });

    // Daily
    const daily = d.forecast.forecastday.map(day => ({
        date: day.date,
        code: mapWeatherAPICode(day.day.condition.code, 1),
        maxTemp: day.day.maxtemp_c,
        minTemp: day.day.mintemp_c,
        precipitation: day.day.totalprecip_mm || 0,
        precipChance: day.day.daily_chance_of_rain || 0,
        wind: day.day.maxwind_kph,
        uvIndex: day.day.uv,
        sunrise: day.astro.sunrise,
        sunset: day.astro.sunset,
        cloudCover: day.day.avghumidity,
        condition: day.day.condition.text
    }));

    return {
        source: 'WeatherAPI',
        location: { latitude: loc.lat, longitude: loc.lon, timezone: loc.tz_id, name: loc.name, region: loc.region, country: loc.country },
        current: {
            temp: c.temp_c,
            code: mapWeatherAPICode(c.condition.code, c.is_day),
            description: c.condition.text,
            icon: c.is_day ? getWeatherIcon(mapWeatherAPICode(c.condition.code, 1), true) : getWeatherIcon(mapWeatherAPICode(c.condition.code, 0), false),
            humidity: c.humidity,
            windSpeed: c.wind_kph,
            windGusts: c.gust_kph,
            windDir: c.wind_degree,
            feelsLike: c.feelslike_c,
            pressure: c.pressure_mb,
            visibility: c.vis_km,
            uvIndex: c.uv,
            cloudCover: c.cloud,
            precipitation: c.precip_mm || 0,
            dewPoint: c.dewpoint_c || (c.temp_c - ((100 - c.humidity) / 5)),
            isDay: c.is_day === 1
        },
        hourly: hourly.slice(0, 48),
        daily
    };
}

// Map WeatherAPI condition codes to WMO-like codes for icon lookup
function mapWeatherAPICode(code, isDay) {
    if (code === 1000) return isDay ? 0 : 0;
    if ([1003].includes(code)) return 1;
    if ([1006].includes(code)) return 2;
    if ([1009].includes(code)) return 3;
    if ([1030, 1135, 1147].includes(code)) return 45;
    if ([1063, 1180, 1183].includes(code)) return 61;
    if ([1186, 1189].includes(code)) return 63;
    if ([1192, 1195].includes(code)) return 65;
    if ([1066, 1210, 1213].includes(code)) return 71;
    if ([1216, 1219].includes(code)) return 73;
    if ([1222, 1225].includes(code)) return 75;
    if ([1069, 1204, 1207].includes(code)) return 77;
    if ([1072, 1150, 1153].includes(code)) return 51;
    if ([1168, 1171].includes(code)) return 56;
    if ([1198, 1201].includes(code)) return 66;
    if ([1240, 1243].includes(code)) return 80;
    if ([1246].includes(code)) return 82;
    if ([1255, 1258].includes(code)) return 85;
    if ([1273, 1276].includes(code)) return 95;
    if ([1279, 1282].includes(code)) return 99;
    return 0;
}

/* ============================================================
   API: Open-Meteo (FALLBACK 1)
   ============================================================ */
async function fetchOpenMeteo(lat, lon) {
    const params = new URLSearchParams({
        latitude: parseFloat(lat).toFixed(4),
        longitude: parseFloat(lon).toFixed(4),
        current: 'temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,relative_humidity_2m,apparent_temperature,pressure_msl,visibility,uv_index,precipitation,cloud_cover,dew_point_2m',
        hourly: 'temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m,dew_point_2m,uv_index,cloud_cover,pressure_msl',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset,cloud_cover_max',
        timezone: 'auto',
        forecast_days: '14'
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
        signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const d = await res.json();
    return normalizeOpenMeteo(d);
}

function normalizeOpenMeteo(d) {
    const c = d.current;
    const h = d.hourly;
    const day = d.daily;

    return {
        source: 'Open-Meteo',
        location: { latitude: d.latitude, longitude: d.longitude, timezone: d.timezone },
        current: {
            temp: c.temperature_2m,
            code: c.weather_code,
            description: getWeatherDescription(c.weather_code),
            icon: getWeatherIcon(c.weather_code, true),
            humidity: c.relative_humidity_2m,
            windSpeed: c.wind_speed_10m,
            windGusts: c.wind_gusts_10m || 0,
            windDir: c.wind_direction_10m || 0,
            feelsLike: c.apparent_temperature,
            pressure: c.pressure_msl,
            visibility: (c.visibility || 0) / 1000,
            uvIndex: c.uv_index || 0,
            cloudCover: c.cloud_cover || 0,
            precipitation: c.precipitation || 0,
            dewPoint: c.dew_point_2m || 0,
            isDay: true
        },
        hourly: h.time.slice(0, 48).map((time, i) => ({
            time,
            temp: h.temperature_2m[i],
            code: h.weather_code[i],
            precipitation: h.precipitation_probability[i] || 0,
            wind: h.wind_speed_10m[i],
            humidity: h.relative_humidity_2m[i],
            dewPoint: h.dew_point_2m ? h.dew_point_2m[i] : 0,
            uvIndex: h.uv_index ? h.uv_index[i] : 0,
            cloudCover: h.cloud_cover ? h.cloud_cover[i] : 0,
            pressure: h.pressure_msl ? h.pressure_msl[i] : 1013
        })),
        daily: day.time.map((date, i) => ({
            date,
            code: day.weather_code[i],
            maxTemp: day.temperature_2m_max[i],
            minTemp: day.temperature_2m_min[i],
            precipitation: day.precipitation_sum[i] || 0,
            precipChance: day.precipitation_probability_max[i] || 0,
            wind: day.wind_speed_10m_max[i],
            uvIndex: day.uv_index_max[i] || 0,
            sunrise: day.sunrise[i],
            sunset: day.sunset[i],
            cloudCover: day.cloud_cover_max ? day.cloud_cover_max[i] : 0,
            condition: getWeatherDescription(day.weather_code[i])
        }))
    };
}

/* ============================================================
   API: NWS (FALLBACK 2 — US only)
   ============================================================ */
async function fetchNWS(lat, lon) {
    const gridRes = await fetch(`https://api.weather.gov/points/${parseFloat(lat).toFixed(4)},${parseFloat(lon).toFixed(4)}`, {
        signal: AbortSignal.timeout(8000)
    });
    if (!gridRes.ok) throw new Error('NWS: Not in US coverage area');
    const gridData = await gridRes.json();

    const forecastRes = await fetch(gridData.properties.forecast, { signal: AbortSignal.timeout(8000) });
    if (!forecastRes.ok) throw new Error('NWS: Forecast unavailable');
    const forecastData = await forecastRes.json();

    return normalizeNWS(forecastData, lat, lon);
}

function normalizeNWS(d, lat, lon) {
    const periods = d.properties.periods;
    const current = periods[0];
    const tempC = current.temperatureUnit === 'F'
        ? (current.temperature - 32) * 5 / 9
        : current.temperature;

    return {
        source: 'NWS',
        location: { latitude: lat, longitude: lon, timezone: 'US' },
        current: {
            temp: tempC,
            code: 0,
            description: current.shortForecast,
            icon: getWeatherIcon(0, current.isDaytime),
            humidity: 55,
            windSpeed: parseInt(current.windSpeed) || 0,
            windGusts: 0,
            windDir: 0,
            feelsLike: tempC,
            pressure: 1013,
            visibility: 10,
            uvIndex: 4,
            cloudCover: 50,
            precipitation: 0,
            dewPoint: tempC - 5,
            isDay: current.isDaytime
        },
        hourly: [],
        daily: periods.filter((_, i) => i % 2 === 0).slice(0, 7).map(p => {
            const tC = p.temperatureUnit === 'F' ? (p.temperature - 32) * 5 / 9 : p.temperature;
            return {
                date: p.startTime.split('T')[0],
                code: 0,
                maxTemp: tC,
                minTemp: tC - 5,
                precipitation: 0,
                precipChance: parseInt(p.probabilityOfPrecipitation?.value) || 0,
                wind: parseInt(p.windSpeed) || 0,
                uvIndex: 4,
                sunrise: '06:00',
                sunset: '18:30',
                cloudCover: 50,
                condition: p.shortForecast
            };
        })
    };
}

/* ============================================================
   API: wttr.in (FALLBACK 3)
   ============================================================ */
async function fetchWttr(lat, lon) {
    const res = await fetch(`https://wttr.in/${lat},${lon}?format=j1`, {
        signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error('wttr.in unavailable');
    const d = await res.json();
    return normalizeWttr(d);
}

function normalizeWttr(d) {
    const c = d.current_condition[0];
    const forecast = d.weather[0];
    const tempC = parseFloat(c.temp_C);

    return {
        source: 'wttr.in',
        location: {
            latitude: parseFloat(d.nearest_area[0].latitude),
            longitude: parseFloat(d.nearest_area[0].longitude),
            timezone: 'UTC'
        },
        current: {
            temp: tempC,
            code: 0,
            description: c.weatherDesc[0].value,
            icon: getWeatherIcon(0, true),
            humidity: parseInt(c.humidity),
            windSpeed: parseFloat(c.windspeedKmph),
            windGusts: parseFloat(c.WindGustKmph) || 0,
            windDir: parseInt(c.winddirDegree) || 0,
            feelsLike: parseFloat(c.FeelsLikeC),
            pressure: parseFloat(c.pressure),
            visibility: parseFloat(c.visibility),
            uvIndex: parseFloat(c.uvIndex) || 0,
            cloudCover: parseInt(c.cloudcover) || 0,
            precipitation: parseFloat(c.precipMM) || 0,
            dewPoint: parseFloat(c.DewPointC) || (tempC - 5),
            isDay: true
        },
        hourly: [],
        daily: d.weather.slice(0, 7).map(w => ({
            date: w.date,
            code: 0,
            maxTemp: parseFloat(w.maxtempC),
            minTemp: parseFloat(w.mintempC),
            precipitation: parseFloat(w.hourly[0]?.precipMM) || 0,
            precipChance: parseInt(w.hourly[0]?.chanceofrain) || 0,
            wind: parseFloat(w.hourly[0]?.windspeedKmph) || 0,
            uvIndex: parseFloat(w.uvIndex) || 0,
            sunrise: w.astronomy[0]?.sunrise || '06:00 AM',
            sunset: w.astronomy[0]?.sunset || '06:00 PM',
            cloudCover: parseInt(w.hourly[0]?.cloudcover) || 0,
            condition: w.hourly[0]?.weatherDesc[0]?.value || 'Unknown'
        }))
    };
}

/* ============================================================
   MAIN APP CLASS
   ============================================================ */
class WeatherApp {
    constructor() {
        this.currentLocation = null;
        this.currentWeather = null;
        this.locationName = null;
        this.cache = new Map();
        this.cacheTime = 10 * 60 * 1000; // 10 min
        this.isFetching = false;

        this.apis = {
            'weatherapi': {
                name: 'WeatherAPI.com',
                desc: 'Most accurate — 14-day forecast, hourly data',
                badge: 'PRIMARY',
                fetch: (lat, lon) => fetchWeatherAPI(lat, lon)
            },
            'open-meteo': {
                name: 'Open-Meteo',
                desc: 'Free, no API key, global coverage',
                badge: 'FREE',
                fetch: (lat, lon) => fetchOpenMeteo(lat, lon)
            },
            'nws': {
                name: 'National Weather Service',
                desc: 'US only — official government data',
                badge: 'US ONLY',
                fetch: (lat, lon) => fetchNWS(lat, lon)
            },
            'wttr': {
                name: 'wttr.in',
                desc: 'Fast, simple, global fallback',
                badge: 'FALLBACK',
                fetch: (lat, lon) => fetchWttr(lat, lon)
            }
        };

        this.apiSource = localStorage.getItem('mini-weather-api') || 'weatherapi';
        if (!this.apis[this.apiSource]) this.apiSource = 'weatherapi';

        this._bindEvents();
        this._restoreLocation();
    }

    _bindEvents() {
        document.getElementById('location-btn').addEventListener('click', () => this.requestLocation());
        document.getElementById('refresh-btn').addEventListener('click', () => this.refresh());
        document.getElementById('unit-btn').addEventListener('click', () => this.toggleUnit());
        document.getElementById('notify-btn').addEventListener('click', () => this.toggleNotifications());
        document.getElementById('api-btn').addEventListener('click', () => this.showAPIModal());
        document.getElementById('api-modal-close').addEventListener('click', () => this.closeAPIModal());
        document.getElementById('api-modal').addEventListener('click', (e) => {
            if (e.target.id === 'api-modal') this.closeAPIModal();
        });

        // Favourites save button
        document.getElementById('fav-save-btn').addEventListener('click', () => {
            if (!this.currentLocation) { showToast('📍 No location loaded yet'); return; }
            const { latitude, longitude } = this.currentLocation;
            const name = this.locationName || 'Unknown';
            if (Favourites.isFavourite(latitude, longitude)) {
                showToast('⭐ Already in favourites');
            } else {
                Favourites.add({ name, display: name, lat: latitude, lon: longitude });
                showToast(`⭐ Saved: ${name}`);
            }
        });

        // Favourites panel toggle
        document.getElementById('fav-toggle-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const panel = document.getElementById('favorites-panel');
            const isOpen = panel.classList.toggle('active');
            document.getElementById('fav-toggle-btn').setAttribute('aria-expanded', String(isOpen));
            document.getElementById('fav-toggle-btn').classList.toggle('btn-active', isOpen);
            if (isOpen) {
                Favourites.renderPanel();
                History.renderHistory();
            }
        });

        // Clear all favourites
        document.getElementById('fav-clear-btn').addEventListener('click', () => {
            Favourites.clear();
            History.clear();
            showToast('🗑️ Favourites & history cleared');
        });

        // Update clock every minute
        setInterval(() => {
            const el = document.getElementById('loc-time');
            if (el && this.currentLocation) {
                el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }, 60000);
    }

    _restoreLocation() {
        const saved = localStorage.getItem('mini-weather-location');
        if (saved) {
            try {
                this.currentLocation = JSON.parse(saved);
                this.fetchWeather();
            } catch { /* ignore */ }
        }
    }

    /**
     * Load weather for a specific lat/lon with a known display name.
     * Called by Search, Favourites, History, and Comparison modules.
     * @param {number} lat
     * @param {number} lon
     * @param {string} name - Display name for the location
     */
    async loadLocation(lat, lon, name) {
        this.currentLocation = { latitude: lat, longitude: lon };
        this.locationName = name || null;
        localStorage.setItem('mini-weather-location', JSON.stringify(this.currentLocation));

        // Show the save-to-favourites button now that we have a location
        const saveBtn = document.getElementById('fav-save-btn');
        if (saveBtn) saveBtn.style.display = '';

        // If comparison panel is open, offer to add to comparison
        const compPanel = document.getElementById('comparison-panel');
        if (compPanel && compPanel.classList.contains('active')) {
            Comparison.addLocation(lat, lon, name || 'Unknown');
        }

        await this.fetchWeather();
    }

    /**
     * Fetch weather for a given lat/lon without updating the main UI.
     * Used by the Comparison module to load weather for additional locations.
     * @param {number} lat
     * @param {number} lon
     * @returns {Promise<Object>} Normalised weather object
     */
    async _fetchWeatherForLocation(lat, lon) {
        const cacheKey = `${parseFloat(lat).toFixed(3)}-${parseFloat(lon).toFixed(3)}-${this.apiSource}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.time < this.cacheTime) return cached.data;
        }

        const api = this.apis[this.apiSource];
        let weather = null;
        try {
            weather = await api.fetch(lat, lon);
        } catch {
            const fallbacks = ['weatherapi', 'open-meteo', 'nws', 'wttr'].filter(k => k !== this.apiSource);
            for (const key of fallbacks) {
                try { weather = await this.apis[key].fetch(lat, lon); break; } catch { /* try next */ }
            }
        }
        if (!weather) throw new Error('All APIs failed');
        this.cache.set(cacheKey, { data: weather, time: Date.now() });
        return weather;
    }

    async requestLocation() {
        const btn = document.getElementById('location-btn');
        btn.disabled = true;
        btn.textContent = '⏳';

        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 300000
                });
            });

            const { latitude, longitude } = pos.coords;
            this.currentLocation = { latitude, longitude };
            localStorage.setItem('mini-weather-location', JSON.stringify(this.currentLocation));
            this.locationName = null; // Force re-fetch

            // Clear search input so _render can populate it with the resolved name
            const searchInput = document.getElementById('search-input');
            if (searchInput) { searchInput.value = ''; document.getElementById('search-clear').classList.remove('visible'); }

            await this.fetchWeather();
        } catch (err) {
            const msg = err.code === 1
                ? 'Location access denied. Please enable location permissions in your browser.'
                : err.code === 2
                    ? 'Location unavailable. Check your device settings.'
                    : 'Location request timed out. Please try again.';
            this.showError(msg);
        } finally {
            btn.disabled = false;
            btn.textContent = '📍';
        }
    }

    async fetchWeather() {
        if (!this.currentLocation || this.isFetching) return;

        const { latitude, longitude } = this.currentLocation;
        const cacheKey = `${parseFloat(latitude).toFixed(3)}-${parseFloat(longitude).toFixed(3)}-${this.apiSource}`;

        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.time < this.cacheTime) {
                this.currentWeather = cached.data;
                await this._render();
                return;
            }
        }

        this.isFetching = true;
        this.showLoading();

        try {
            const api = this.apis[this.apiSource];
            let weather = null;

            try {
                weather = await api.fetch(latitude, longitude);
            } catch (primaryErr) {
                console.warn(`${api.name} failed:`, primaryErr.message);

                // Auto-fallback chain
                const fallbacks = ['weatherapi', 'open-meteo', 'nws', 'wttr'].filter(k => k !== this.apiSource);
                for (const fallbackKey of fallbacks) {
                    try {
                        weather = await this.apis[fallbackKey].fetch(latitude, longitude);
                        weather.source += ' (fallback)';
                        showToast(`⚠️ Using ${this.apis[fallbackKey].name} as fallback`);
                        break;
                    } catch (fbErr) {
                        console.warn(`Fallback ${fallbackKey} failed:`, fbErr.message);
                    }
                }
            }

            if (!weather) throw new Error('All weather APIs failed. Check your connection.');

            this.currentWeather = weather;
            this.cache.set(cacheKey, { data: weather, time: Date.now() });
            await this._render();
        } catch (err) {
            this.showError(err.message || 'Failed to fetch weather data.');
            console.error('Weather fetch error:', err);
        } finally {
            this.isFetching = false;
        }
    }

    async _render() {
        if (!this.currentWeather) return;

        const { current, hourly, daily, source, location } = this.currentWeather;
        const { latitude, longitude } = this.currentLocation;

        // Get location name (cached)
        if (!this.locationName) {
            // Use WeatherAPI location name if available
            if (location && location.name) {
                const parts = [location.name];
                if (location.region && location.region !== location.name) parts.push(location.region);
                if (location.country) parts.push(location.country);
                this.locationName = parts.join(', ');
            } else {
                this.locationName = await getLocationName(latitude, longitude);
            }
        }

        // Update location bar
        const locDisplay = document.getElementById('location-display');
        document.getElementById('loc-name').textContent = `📍 ${this.locationName}`;
        document.getElementById('loc-coords').textContent = `${parseFloat(latitude).toFixed(3)}°, ${parseFloat(longitude).toFixed(3)}°`;
        document.getElementById('loc-time').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('source-badge').textContent = `📡 ${source}`;
        document.getElementById('footer-api').textContent = source;
        locDisplay.style.display = 'flex';

        // Update unit button
        document.getElementById('unit-btn').textContent = `°${unit}`;

        // Show favourites save button and update its state
        const saveBtn = document.getElementById('fav-save-btn');
        if (saveBtn) {
            saveBtn.style.display = '';
            const already = Favourites.isFavourite(latitude, longitude);
            saveBtn.textContent = already ? '★' : '⭐';
            saveBtn.title = already ? 'Already saved as favourite' : 'Save as favourite';
            saveBtn.setAttribute('aria-label', already ? 'Already saved as favourite' : 'Save current location as favourite');
        }

        // Update search input to reflect current location name (if loaded via GPS)
        const searchInput = document.getElementById('search-input');
        if (searchInput && !searchInput.value) {
            searchInput.value = this.locationName;
            document.getElementById('search-clear').classList.add('visible');
        }

        // Build alerts
        const alerts = this._buildAlerts(current, daily);

        // Build weather HTML
        const weatherHTML = this._buildWeatherCard(current, hourly, daily, source, alerts);

        // Build garden HTML
        const gardenHTML = `<div class="garden-card" id="garden-card"></div>`;

        // Render
        const container = document.getElementById('weather-content');
        container.innerHTML = weatherHTML + gardenHTML;

        // Render garden (after DOM update)
        Garden.render({
            temp: current.temp,
            humidity: current.humidity,
            windSpeed: current.windSpeed,
            precipitation: current.precipitation,
            uvIndex: current.uvIndex
        });

        // Send notifications for severe conditions
        this._sendAlertNotifications(current, daily);
    }

    _buildAlerts(current, daily) {
        const alertItems = [];

        if (current.uvIndex >= 11) {
            alertItems.push({ type: 'danger', msg: `☀️ EXTREME UV Index ${Math.round(current.uvIndex)} — Avoid sun exposure` });
        } else if (current.uvIndex >= 8) {
            alertItems.push({ type: 'warning', msg: `☀️ Very High UV Index ${Math.round(current.uvIndex)} — Use SPF 50+` });
        } else if (current.uvIndex >= 6) {
            alertItems.push({ type: 'info', msg: `☀️ High UV Index ${Math.round(current.uvIndex)} — Wear sunscreen` });
        }

        if (current.windSpeed >= 60) {
            alertItems.push({ type: 'danger', msg: `💨 SEVERE WINDS: ${windDisplay(current.windSpeed)} ${windUnit()} — Extreme caution` });
        } else if (current.windSpeed >= 40) {
            alertItems.push({ type: 'warning', msg: `💨 Strong winds: ${windDisplay(current.windSpeed)} ${windUnit()}` });
        }

        if (daily && daily[0]) {
            if (daily[0].precipChance >= 80) {
                alertItems.push({ type: 'warning', msg: `⛈️ Heavy rain expected — ${daily[0].precipChance}% chance` });
            } else if (daily[0].precipChance >= 60) {
                alertItems.push({ type: 'info', msg: `🌧️ Rain likely today — ${daily[0].precipChance}% chance` });
            }
        }

        if (current.temp <= -10) {
            alertItems.push({ type: 'danger', msg: `❄️ EXTREME COLD: ${toDisplay(current.temp)}°${unit} — Frostbite risk` });
        } else if (current.temp <= 0) {
            alertItems.push({ type: 'warning', msg: `❄️ Freezing conditions — Watch for ice` });
        }

        if (current.temp >= 40) {
            alertItems.push({ type: 'danger', msg: `🔥 EXTREME HEAT: ${toDisplay(current.temp)}°${unit} — Heat stroke risk` });
        } else if (current.temp >= 35) {
            alertItems.push({ type: 'warning', msg: `🌡️ Very hot: ${toDisplay(current.temp)}°${unit} — Stay hydrated` });
        }

        if (current.visibility < 1) {
            alertItems.push({ type: 'warning', msg: `🌫️ Very low visibility: ${current.visibility.toFixed(1)} km` });
        }

        if (!alertItems.length) return '';

        return `<div class="alerts">${alertItems.map(a =>
            `<div class="alert alert-${a.type}">${a.msg}</div>`
        ).join('')}</div>`;
    }

    _buildWeatherCard(current, hourly, daily, source, alerts) {
        const displayTemp = toDisplay(current.temp);
        const displayFeels = toDisplay(current.feelsLike);
        const displayWind = windDisplay(current.windSpeed);
        const displayGusts = windDisplay(current.windGusts);
        const wUnit = windUnit();
        const icon = getWeatherIcon(current.code, current.isDay !== false);

        let html = `<div class="weather-card">
            <div class="temp-display">
                <span class="weather-icon-main">${icon}</span>
                <div class="temp-value">${displayTemp}°${unit}</div>
                <div class="condition">${current.description}</div>
                <div class="feels-like">Feels like ${displayFeels}°${unit}</div>
            </div>

            <div class="stats">
                <div class="stat">
                    <div class="stat-label">💧 Humidity</div>
                    <div class="stat-value">${current.humidity}%</div>
                    <div class="stat-unit">${getHumidityLabel(current.humidity)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">💨 Wind</div>
                    <div class="stat-value">${displayWind}</div>
                    <div class="stat-unit">${wUnit}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">💨 Gusts</div>
                    <div class="stat-value">${displayGusts}</div>
                    <div class="stat-unit">${wUnit}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">🔬 Pressure</div>
                    <div class="stat-value">${Math.round(current.pressure)}</div>
                    <div class="stat-unit">hPa</div>
                </div>
                <div class="stat">
                    <div class="stat-label">☀️ UV Index</div>
                    <div class="stat-value">${Math.round(current.uvIndex)}</div>
                    <div class="stat-unit">${getUVLabel(current.uvIndex)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">👁️ Visibility</div>
                    <div class="stat-value">${parseFloat(current.visibility).toFixed(1)}</div>
                    <div class="stat-unit">km</div>
                </div>
                <div class="stat">
                    <div class="stat-label">☁️ Cloud Cover</div>
                    <div class="stat-value">${current.cloudCover}%</div>
                    <div class="stat-unit">${current.cloudCover < 25 ? 'Clear' : current.cloudCover < 75 ? 'Partly' : 'Overcast'}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">🌡️ Dew Point</div>
                    <div class="stat-value">${toDisplay(current.dewPoint || 0)}°</div>
                    <div class="stat-unit">${unit}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">🌧️ Precip</div>
                    <div class="stat-value">${parseFloat(current.precipitation || 0).toFixed(1)}</div>
                    <div class="stat-unit">mm</div>
                </div>
                <div class="stat">
                    <div class="stat-label">🧭 Wind Dir</div>
                    <div class="stat-value">${getWindDirection(current.windDir || 0)}</div>
                    <div class="stat-unit">${current.windDir || 0}°</div>
                </div>
            </div>
        </div>`;

        // Alerts
        if (alerts) html += alerts;

        // Hourly forecast
        if (hourly && hourly.length > 0) {
            html += `<div class="weather-card">
                <div class="section-title">⏰ Hourly Forecast</div>
                <div class="hourly">`;

            const now = new Date();
            const currentHour = now.getHours();

            let hourlyRendered = 0;
            hourly.slice(0, 24).forEach((h, idx) => {
                if (!Filter.passes({ code: h.code, temp: h.temp, precipChance: h.precipitation || 0 })) return;
                const hDate = new Date(h.time);
                const hHour = hDate.getHours();
                const isNow = idx === 0;
                const timeLabel = isNow ? 'Now' : hDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const hIcon = getWeatherIcon(h.code, hHour >= 6 && hHour < 20);
                const hTemp = toDisplay(h.temp);

                html += `<div class="hour${isNow ? '" style="border-color:var(--accent);background:var(--accent-glow)' : ''}" role="listitem">
                    <div class="hour-time">${timeLabel}</div>
                    <div class="hour-icon" aria-hidden="true">${hIcon}</div>
                    <div class="hour-temp">${hTemp}°</div>
                    <div class="hour-precip">💧${h.precipitation}%</div>
                </div>`;
                hourlyRendered++;
            });
            if (hourlyRendered === 0) html += `<div style="color:var(--text-muted);font-size:0.8rem;padding:10px;">No hourly data matches the current filters.</div>`;

            html += `</div></div>`;
        }

        // Daily forecast
        if (daily && daily.length > 0) {
            const filterActive = Filter.isActive();
            html += `<div class="weather-card">
                <div class="section-title">📅 14-Day Forecast${filterActive ? ' <span style="font-size:0.65rem;color:var(--accent-light);font-weight:400;">(filtered)</span>' : ''}</div>
                <div class="daily" role="list">`;

            let dailyRendered = 0;
            daily.slice(0, 14).forEach((d, i) => {
                if (!Filter.passes(d)) return;
                const dateObj = new Date(d.date + 'T12:00:00');
                const dateLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
                const dIcon = getWeatherIcon(d.code, true);

                html += `<div class="day" role="listitem" aria-label="${dateLabel}: ${d.condition}, ${toDisplay(d.maxTemp)}° / ${toDisplay(d.minTemp)}°">
                    <div class="day-date">${dateLabel}</div>
                    <div class="day-icon" aria-hidden="true">${dIcon}</div>
                    <div class="day-condition">${(d.condition || '').substring(0, 14)}</div>
                    <div class="day-temps">
                        <span class="day-max">${toDisplay(d.maxTemp)}°</span>
                        <span class="day-min">${toDisplay(d.minTemp)}°</span>
                    </div>
                    <div class="day-precip">💧${d.precipChance}%</div>
                </div>`;
                dailyRendered++;
            });

            if (dailyRendered === 0) html += `<div style="color:var(--text-muted);font-size:0.8rem;padding:10px;">No days match the current filters.</div>`;

            html += `</div></div>`;
        }

        // Detailed analysis
        html += `<div class="weather-card">
            <div class="section-title">📊 Detailed Analysis</div>
            <div class="detailed-grid">
                <div class="detail-card">
                    <div class="detail-title">Apparent Temperature</div>
                    <div class="detail-value">${toDisplay(current.feelsLike)}°${unit}</div>
                    <div class="detail-sub">Wind chill + humidity effect</div>
                </div>
                <div class="detail-card">
                    <div class="detail-title">Dew Point</div>
                    <div class="detail-value">${toDisplay(current.dewPoint || 0)}°${unit}</div>
                    <div class="detail-sub">Moisture condensation point</div>
                </div>
                <div class="detail-card">
                    <div class="detail-title">UV Index</div>
                    <div class="detail-value">${Math.round(current.uvIndex)}</div>
                    <div class="detail-sub">${getUVLabel(current.uvIndex)} — ${current.uvIndex < 3 ? 'No protection needed' : current.uvIndex < 6 ? 'Wear sunscreen' : 'Limit sun exposure'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-title">Atmospheric Pressure</div>
                    <div class="detail-value">${Math.round(current.pressure)} hPa</div>
                    <div class="detail-sub">${getPressureLabel(current.pressure)}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-title">Wind</div>
                    <div class="detail-value">${windDisplay(current.windSpeed)} ${windUnit()}</div>
                    <div class="detail-sub">${getWindDirection(current.windDir || 0)} · Gusts ${windDisplay(current.windGusts)} ${windUnit()}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-title">Visibility</div>
                    <div class="detail-value">${parseFloat(current.visibility).toFixed(1)} km</div>
                    <div class="detail-sub">${current.visibility >= 10 ? 'Excellent' : current.visibility >= 5 ? 'Good' : current.visibility >= 2 ? 'Moderate' : 'Poor'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-title">Cloud Cover</div>
                    <div class="detail-value">${current.cloudCover}%</div>
                    <div class="detail-sub">${current.cloudCover < 25 ? 'Clear sky' : current.cloudCover < 75 ? 'Partly cloudy' : 'Overcast'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-title">Humidity</div>
                    <div class="detail-value">${current.humidity}%</div>
                    <div class="detail-sub">${getHumidityLabel(current.humidity)}</div>
                </div>
            </div>
        </div>`;

        return html;
    }

    _sendAlertNotifications(current, daily) {
        if (!notifications.enabled) return;
        if (current.uvIndex >= 11) {
            notifications.send('⚠️ Extreme UV Alert', { body: `UV Index: ${Math.round(current.uvIndex)} — Avoid sun exposure` });
        }
        if (current.windSpeed >= 60) {
            notifications.send('⚠️ Severe Wind Alert', { body: `Winds: ${windDisplay(current.windSpeed)} ${windUnit()}` });
        }
        if (daily && daily[0] && daily[0].precipChance >= 80) {
            notifications.send('🌧️ Heavy Rain Expected', { body: `${daily[0].precipChance}% chance of rain today` });
        }
    }

    showLoading() {
        document.getElementById('weather-content').innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p class="loading-text">Fetching weather data…</p>
            </div>`;
    }

    /**
     * Display a user-friendly error message in the weather content area.
     * @param {string} message - Error description
     */
    showError(message) {
        // Translate technical errors into user-friendly language
        let friendly = message;
        if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('net::')) {
            friendly = 'No internet connection. Please check your network and try again.';
        } else if (message.includes('timeout') || message.includes('AbortError')) {
            friendly = 'The request timed out. Your connection may be slow — please try again.';
        } else if (message.includes('HTTP 4')) {
            friendly = 'The weather service returned an error. Please try a different data source.';
        } else if (message.includes('HTTP 5') || message.includes('All weather APIs')) {
            friendly = 'All weather services are temporarily unavailable. Please try again in a moment.';
        } else if (message.includes('Not in US coverage')) {
            friendly = 'The National Weather Service only covers the United States. Try switching to Open-Meteo.';
        }

        document.getElementById('weather-content').innerHTML = `
            <div class="error" role="alert">
                <div class="error-title">⚠️ Unable to load weather</div>
                <div class="error-msg">${friendly}</div>
                <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px;">
                    <button class="btn-primary" onclick="app.requestLocation()" aria-label="Try getting location again">📍 Use My Location</button>
                    <button onclick="document.getElementById('search-input').focus()" aria-label="Search for a location">🔍 Search Location</button>
                    <button onclick="app.showAPIModal()" aria-label="Change data source">🔌 Change Source</button>
                </div>
            </div>`;
    }

    toggleUnit() {
        unit = unit === 'C' ? 'F' : 'C';
        localStorage.setItem('mini-weather-unit', unit);
        document.getElementById('unit-btn').textContent = `°${unit}`;
        showToast(`Switched to °${unit}`);
        if (this.currentWeather) this._render();
    }

    async toggleNotifications() {
        const granted = await notifications.requestPermission();
        if (granted) {
            showToast('🔔 Notifications enabled!');
            notifications.send('Mini Weather', { body: 'Weather alerts are now active.' });
        } else {
            showToast('🔕 Notifications blocked');
        }
    }

    refresh() {
        if (!this.currentLocation) {
            showToast('📍 Please get your location first');
            return;
        }
        // Clear cache for current location
        const { latitude, longitude } = this.currentLocation;
        const cacheKey = `${parseFloat(latitude).toFixed(3)}-${parseFloat(longitude).toFixed(3)}-${this.apiSource}`;
        this.cache.delete(cacheKey);
        this.locationName = null;
        showToast('🔄 Refreshing…');
        this.fetchWeather();
    }

    showAPIModal() {
        const list = document.getElementById('api-list');
        list.innerHTML = '';

        Object.entries(this.apis).forEach(([key, api]) => {
            const div = document.createElement('div');
            div.className = 'api-option' + (key === this.apiSource ? ' selected' : '');
            div.innerHTML = `
                <div class="api-name">
                    ${api.name}
                    <span class="api-badge">${api.badge}</span>
                    ${key === this.apiSource ? '<span class="api-badge" style="background:var(--success)">ACTIVE</span>' : ''}
                </div>
                <div class="api-desc">${api.desc}</div>`;
            div.addEventListener('click', () => {
                this.apiSource = key;
                localStorage.setItem('mini-weather-api', key);
                this.closeAPIModal();
                // Clear cache and re-fetch
                this.cache.clear();
                showToast(`📡 Switched to ${api.name}`);
                if (this.currentLocation) this.fetchWeather();
            });
            list.appendChild(div);
        });

        document.getElementById('api-modal').classList.add('active');
    }

    closeAPIModal() {
        document.getElementById('api-modal').classList.remove('active');
    }
}

/* ============================================================
   SEARCH MODULE
   ============================================================ */

/**
 * Rate-limited Nominatim search with debounce.
 * Enforces a 1-second gap between requests per Nominatim usage policy.
 */
const Search = (() => {
    const NOMINATIM = 'https://nominatim.openstreetmap.org';
    const DEBOUNCE_MS = 400;
    const MIN_QUERY_LEN = 2;
    const MAX_RESULTS = 6;
    const RATE_LIMIT_MS = 1000;

    let _debounceTimer = null;
    let _lastRequestTime = 0;
    let _abortController = null;
    let _focusedIndex = -1;

    /** @type {Array<{name:string, lat:number, lon:number, display:string, type:string}>} */
    let _currentResults = [];

    /**
     * Search Nominatim for locations matching `query`.
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async function searchLocations(query) {
        const now = Date.now();
        const wait = RATE_LIMIT_MS - (now - _lastRequestTime);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));

        if (_abortController) _abortController.abort();
        _abortController = new AbortController();
        _lastRequestTime = Date.now();

        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: String(MAX_RESULTS),
            addressdetails: '1',
            'accept-language': navigator.language || 'en'
        });

        const res = await fetch(`${NOMINATIM}/search?${params}`, {
            signal: _abortController.signal,
            headers: { 'Accept-Language': navigator.language || 'en' }
        });

        if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
        return res.json();
    }

    /**
     * Format a Nominatim result into a display-friendly object.
     * @param {Object} r - Raw Nominatim result
     * @returns {{name:string, lat:number, lon:number, display:string, type:string}}
     */
    function formatResult(r) {
        const a = r.address || {};
        const name = a.city || a.town || a.village || a.county || a.state || r.display_name.split(',')[0];
        const parts = [];
        if (a.state && a.state !== name) parts.push(a.state);
        if (a.country) parts.push(a.country);
        return {
            name,
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            display: parts.length ? `${name}, ${parts.join(', ')}` : name,
            sub: parts.join(', '),
            type: r.type || r.class || 'place'
        };
    }

    /** Show loading indicator in autocomplete dropdown. */
    function showLoading() {
        const el = document.getElementById('search-autocomplete');
        el.innerHTML = '<div class="autocomplete-loading">🔍 Searching…</div>';
        el.classList.add('active');
        document.getElementById('search-input').setAttribute('aria-expanded', 'true');
    }

    /** Hide the autocomplete dropdown. */
    function hideDropdown() {
        const el = document.getElementById('search-autocomplete');
        el.classList.remove('active');
        el.innerHTML = '';
        document.getElementById('search-input').setAttribute('aria-expanded', 'false');
        _focusedIndex = -1;
        _currentResults = [];
    }

    /**
     * Render autocomplete results, optionally prepending history/favourites.
     * @param {Array} results - Formatted location results
     */
    function renderResults(results) {
        const el = document.getElementById('search-autocomplete');
        el.innerHTML = '';
        _currentResults = results;
        _focusedIndex = -1;

        if (!results.length) {
            el.innerHTML = '<div class="autocomplete-loading">No results found</div>';
            el.classList.add('active');
            document.getElementById('search-input').setAttribute('aria-expanded', 'true');
            return;
        }

        // Prepend history/favourites suggestions when query is short
        const query = document.getElementById('search-input').value.trim().toLowerCase();
        const history = History.get();
        const favs = Favourites.get();
        const suggestions = [...favs, ...history].filter(
            s => s.name.toLowerCase().includes(query) && query.length > 0
        ).slice(0, 3);

        if (suggestions.length) {
            const label = document.createElement('div');
            label.className = 'autocomplete-section-label';
            label.textContent = 'Recent & Favourites';
            el.appendChild(label);

            suggestions.forEach(s => {
                const item = _makeItem('🕐', s.name, s.sub || '', s);
                el.appendChild(item);
            });

            const label2 = document.createElement('div');
            label2.className = 'autocomplete-section-label';
            label2.textContent = 'Search Results';
            el.appendChild(label2);
        }

        results.forEach(r => {
            const icon = _typeIcon(r.type);
            const item = _makeItem(icon, r.name, r.sub, r);
            el.appendChild(item);
        });

        el.classList.add('active');
        document.getElementById('search-input').setAttribute('aria-expanded', 'true');
    }

    /**
     * Build a single autocomplete list item element.
     * @param {string} icon
     * @param {string} name
     * @param {string} sub
     * @param {{lat:number, lon:number, name:string}} location
     * @returns {HTMLElement}
     */
    function _makeItem(icon, name, sub, location) {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-label', location.display || name);
        item.innerHTML = `
            <span class="autocomplete-item-icon" aria-hidden="true">${icon}</span>
            <div>
                <div class="autocomplete-item-name">${_escHtml(name)}</div>
                ${sub ? `<div class="autocomplete-item-sub">${_escHtml(sub)}</div>` : ''}
            </div>`;
        item.addEventListener('mousedown', (e) => {
            e.preventDefault(); // prevent input blur before click fires
            selectLocation(location);
        });
        return item;
    }

    /** Map Nominatim type to an emoji icon. */
    function _typeIcon(type) {
        if (['city', 'town', 'village', 'hamlet'].includes(type)) return '🏙️';
        if (['administrative', 'county', 'state'].includes(type)) return '🗺️';
        if (['airport'].includes(type)) return '✈️';
        if (['peak', 'mountain'].includes(type)) return '⛰️';
        if (['beach'].includes(type)) return '🏖️';
        return '📍';
    }

    /** Escape HTML special characters. */
    function _escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Select a location from the autocomplete list and load its weather.
     * @param {{lat:number, lon:number, name:string, display:string}} location
     */
    function selectLocation(location) {
        hideDropdown();
        const input = document.getElementById('search-input');
        input.value = location.display || location.name;
        document.getElementById('search-clear').classList.add('visible');

        History.add(location);
        app.loadLocation(location.lat, location.lon, location.display || location.name);
    }

    /** Handle keyboard navigation within the autocomplete dropdown. */
    function handleKeydown(e) {
        const el = document.getElementById('search-autocomplete');
        if (!el.classList.contains('active')) return;

        const items = el.querySelectorAll('.autocomplete-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            _focusedIndex = Math.min(_focusedIndex + 1, items.length - 1);
            _updateFocus(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            _focusedIndex = Math.max(_focusedIndex - 1, 0);
            _updateFocus(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (_focusedIndex >= 0 && items[_focusedIndex]) {
                items[_focusedIndex].dispatchEvent(new MouseEvent('mousedown'));
            } else if (_currentResults.length) {
                selectLocation(_currentResults[0]);
            }
        } else if (e.key === 'Escape') {
            hideDropdown();
            document.getElementById('search-input').blur();
        }
    }

    function _updateFocus(items) {
        items.forEach((item, i) => item.classList.toggle('focused', i === _focusedIndex));
        if (items[_focusedIndex]) items[_focusedIndex].scrollIntoView({ block: 'nearest' });
    }

    /** Initialise search input event listeners. */
    function init() {
        const input = document.getElementById('search-input');
        const clearBtn = document.getElementById('search-clear');

        input.addEventListener('input', () => {
            const q = input.value.trim();
            clearBtn.classList.toggle('visible', q.length > 0);

            clearTimeout(_debounceTimer);
            if (q.length < MIN_QUERY_LEN) {
                hideDropdown();
                return;
            }

            _debounceTimer = setTimeout(async () => {
                showLoading();
                try {
                    const raw = await searchLocations(q);
                    renderResults(raw.map(formatResult));
                } catch (err) {
                    if (err.name === 'AbortError') return;
                    const el = document.getElementById('search-autocomplete');
                    el.innerHTML = `<div class="autocomplete-loading">⚠️ Search failed — check your connection</div>`;
                }
            }, DEBOUNCE_MS);
        });

        input.addEventListener('keydown', handleKeydown);

        input.addEventListener('focus', () => {
            const q = input.value.trim();
            if (q.length >= MIN_QUERY_LEN) return; // already showing results

            // Show recent history/favourites on focus with empty input
            const history = History.get();
            const favs = Favourites.get();
            const recent = [...favs.slice(0, 3), ...history.slice(0, 3)];
            if (!recent.length) return;

            const el = document.getElementById('search-autocomplete');
            el.innerHTML = '';
            const label = document.createElement('div');
            label.className = 'autocomplete-section-label';
            label.textContent = 'Recent & Favourites';
            el.appendChild(label);
            recent.forEach(s => {
                const item = _makeItem('🕐', s.name, s.sub || '', s);
                el.appendChild(item);
            });
            el.classList.add('active');
            input.setAttribute('aria-expanded', 'true');
        });

        input.addEventListener('blur', () => {
            // Delay to allow mousedown on item to fire first
            setTimeout(hideDropdown, 200);
        });

        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.classList.remove('visible');
            hideDropdown();
            input.focus();
        });

        // Close autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-wrapper')) hideDropdown();
        });
    }

    return { init, selectLocation, hideDropdown };
})();

/* ============================================================
   FAVOURITES MODULE
   ============================================================ */

/**
 * Manages saved favourite locations in localStorage.
 * Each favourite: { name, display, sub, lat, lon }
 */
const Favourites = (() => {
    const KEY = 'mini-weather-favourites';
    const MAX = 10;

    /** @returns {Array} */
    function get() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
    }

    /**
     * Add a location to favourites.
     * @param {{name:string, display:string, lat:number, lon:number}} loc
     */
    function add(loc) {
        const list = get().filter(f => !(Math.abs(f.lat - loc.lat) < 0.01 && Math.abs(f.lon - loc.lon) < 0.01));
        list.unshift({ name: loc.name, display: loc.display || loc.name, sub: loc.sub || '', lat: loc.lat, lon: loc.lon });
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
        renderPanel();
    }

    /**
     * Remove a favourite by index.
     * @param {number} idx
     */
    function remove(idx) {
        const list = get();
        list.splice(idx, 1);
        localStorage.setItem(KEY, JSON.stringify(list));
        renderPanel();
    }

    /** Clear all favourites. */
    function clear() {
        localStorage.removeItem(KEY);
        renderPanel();
    }

    /**
     * Check if a location is already a favourite.
     * @param {number} lat
     * @param {number} lon
     * @returns {boolean}
     */
    function isFavourite(lat, lon) {
        return get().some(f => Math.abs(f.lat - lat) < 0.01 && Math.abs(f.lon - lon) < 0.01);
    }

    /** Re-render the favourites panel UI. */
    function renderPanel() {
        const list = get();
        const el = document.getElementById('favorites-list');
        if (!el) return;

        el.innerHTML = '';
        if (!list.length) {
            el.innerHTML = '<span class="favorites-empty">No saved favourites yet. Search a location and tap ⭐ to save it.</span>';
        } else {
            list.forEach((fav, i) => {
                const chip = document.createElement('div');
                chip.className = 'favorite-chip';
                chip.setAttribute('role', 'listitem');
                chip.setAttribute('aria-label', `Load ${fav.display}`);
                chip.innerHTML = `
                    <span aria-hidden="true">⭐</span>
                    <span class="favorite-chip-name" title="${fav.display}">${fav.name}</span>
                    <span class="favorite-chip-remove" role="button" aria-label="Remove ${fav.name} from favourites" tabindex="0" data-idx="${i}">✕</span>`;

                chip.addEventListener('click', (e) => {
                    if (e.target.classList.contains('favorite-chip-remove')) return;
                    app.loadLocation(fav.lat, fav.lon, fav.display);
                });
                chip.querySelector('.favorite-chip-remove').addEventListener('click', (e) => {
                    e.stopPropagation();
                    remove(i);
                });
                chip.querySelector('.favorite-chip-remove').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); remove(i); }
                });
                el.appendChild(chip);
            });
        }

        // Update save button state
        const saveBtn = document.getElementById('fav-save-btn');
        if (saveBtn && app.currentLocation) {
            const { latitude, longitude } = app.currentLocation;
            const already = isFavourite(latitude, longitude);
            saveBtn.textContent = already ? '★' : '⭐';
            saveBtn.title = already ? 'Already saved' : 'Save as favourite';
            saveBtn.setAttribute('aria-label', already ? 'Already saved as favourite' : 'Save current location as favourite');
        }
    }

    return { get, add, remove, clear, isFavourite, renderPanel };
})();

/* ============================================================
   HISTORY MODULE
   ============================================================ */

/**
 * Tracks the last 10 searched locations.
 * Each entry: { name, display, sub, lat, lon, ts }
 */
const History = (() => {
    const KEY = 'mini-weather-history';
    const MAX = 10;

    /** @returns {Array} */
    function get() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
    }

    /**
     * Add a location to history.
     * @param {{name:string, display:string, lat:number, lon:number}} loc
     */
    function add(loc) {
        const list = get().filter(h => !(Math.abs(h.lat - loc.lat) < 0.01 && Math.abs(h.lon - loc.lon) < 0.01));
        list.unshift({ name: loc.name, display: loc.display || loc.name, sub: loc.sub || '', lat: loc.lat, lon: loc.lon, ts: Date.now() });
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
        renderHistory();
    }

    /** Clear all history. */
    function clear() {
        localStorage.removeItem(KEY);
        renderHistory();
    }

    /** Re-render the history chips inside the favourites panel. */
    function renderHistory() {
        const el = document.getElementById('history-list');
        if (!el) return;
        const list = get();
        el.innerHTML = '';
        if (!list.length) return;

        const label = document.createElement('div');
        label.style.cssText = 'font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px;width:100%;';
        label.textContent = 'Recent Searches';
        el.appendChild(label);

        list.forEach(h => {
            const chip = document.createElement('div');
            chip.className = 'history-chip';
            chip.setAttribute('role', 'listitem');
            chip.setAttribute('aria-label', `Load ${h.display}`);
            chip.innerHTML = `<span aria-hidden="true">🕐</span> ${h.name}`;
            chip.addEventListener('click', () => app.loadLocation(h.lat, h.lon, h.display));
            el.appendChild(chip);
        });
    }

    return { get, add, clear, renderHistory };
})();

/* ============================================================
   EXPORT MODULE
   ============================================================ */

/**
 * Exports current weather data as JSON, CSV, or clipboard text.
 */
const Exporter = (() => {
    /**
     * Trigger a file download in the browser.
     * @param {string} content - File content
     * @param {string} filename
     * @param {string} mimeType
     */
    function _download(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Export weather data as a formatted JSON file.
     * @param {Object} weather - Normalised weather object
     * @param {string} locationName
     */
    function toJSON(weather, locationName) {
        if (!weather) { showToast('⚠️ No weather data to export'); return; }
        const payload = {
            exportedAt: new Date().toISOString(),
            location: locationName,
            source: weather.source,
            current: weather.current,
            daily: weather.daily,
            hourly: weather.hourly
        };
        _download(JSON.stringify(payload, null, 2), `weather-${_slug(locationName)}.json`, 'application/json');
        showToast('📄 JSON exported');
    }

    /**
     * Export the 14-day daily forecast as a CSV file.
     * @param {Object} weather - Normalised weather object
     * @param {string} locationName
     */
    function toCSV(weather, locationName) {
        if (!weather || !weather.daily || !weather.daily.length) {
            showToast('⚠️ No forecast data to export');
            return;
        }
        const headers = ['Date', 'Condition', 'Max Temp (°C)', 'Min Temp (°C)', 'Precip (mm)', 'Precip Chance (%)', 'Wind (km/h)', 'UV Index', 'Cloud Cover (%)'];
        const rows = weather.daily.map(d => [
            d.date,
            `"${(d.condition || '').replace(/"/g, '""')}"`,
            d.maxTemp,
            d.minTemp,
            d.precipitation,
            d.precipChance,
            d.wind,
            d.uvIndex,
            d.cloudCover
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        _download(csv, `weather-${_slug(locationName)}.csv`, 'text/csv');
        showToast('📊 CSV exported');
    }

    /**
     * Copy a plain-text weather summary to the clipboard.
     * @param {Object} weather - Normalised weather object
     * @param {string} locationName
     */
    async function toClipboard(weather, locationName) {
        if (!weather) { showToast('⚠️ No weather data to copy'); return; }
        const c = weather.current;
        const text = [
            `Mini Weather — ${locationName}`,
            `Updated: ${new Date().toLocaleString()}`,
            `Source: ${weather.source}`,
            '',
            `Temperature: ${Math.round(c.temp)}°C (feels like ${Math.round(c.feelsLike)}°C)`,
            `Condition: ${c.description}`,
            `Humidity: ${c.humidity}%`,
            `Wind: ${Math.round(c.windSpeed)} km/h ${getWindDirection(c.windDir || 0)}`,
            `UV Index: ${Math.round(c.uvIndex)} (${getUVLabel(c.uvIndex)})`,
            `Pressure: ${Math.round(c.pressure)} hPa`,
            `Visibility: ${parseFloat(c.visibility).toFixed(1)} km`,
            '',
            '14-Day Forecast:',
            ...(weather.daily || []).slice(0, 7).map(d =>
                `  ${d.date}: ${d.condition} | ${Math.round(d.maxTemp)}°/${Math.round(d.minTemp)}° | 💧${d.precipChance}%`
            )
        ].join('\n');

        try {
            await navigator.clipboard.writeText(text);
            showToast('📋 Copied to clipboard');
        } catch {
            showToast('⚠️ Clipboard access denied');
        }
    }

    /** Slugify a string for use in filenames. */
    function _slug(str) {
        return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'weather';
    }

    /** Initialise export button and dropdown. */
    function init() {
        const btn = document.getElementById('export-btn');
        const dropdown = document.getElementById('export-dropdown');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.toggle('active');
            btn.setAttribute('aria-expanded', String(isOpen));
        });

        dropdown.querySelectorAll('.export-option').forEach(opt => {
            const handler = () => {
                dropdown.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
                const fmt = opt.dataset.format;
                const weather = app.currentWeather;
                const name = app.locationName || 'Unknown';
                if (fmt === 'json') toJSON(weather, name);
                else if (fmt === 'csv') toCSV(weather, name);
                else if (fmt === 'copy') toClipboard(weather, name);
            };
            opt.addEventListener('click', handler);
            opt.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.export-menu')) {
                dropdown.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    return { init, toJSON, toCSV, toClipboard };
})();

/* ============================================================
   COMPARISON MODULE
   ============================================================ */

/**
 * Manages side-by-side weather comparison for up to 3 locations.
 */
const Comparison = (() => {
    const MAX_SLOTS = 3;
    /** @type {Array<{name:string, lat:number, lon:number, weather:Object|null}>} */
    let _slots = [];

    /**
     * Add a location to the comparison view.
     * @param {number} lat
     * @param {number} lon
     * @param {string} name
     */
    async function addLocation(lat, lon, name) {
        if (_slots.length >= MAX_SLOTS) {
            showToast(`⚖️ Max ${MAX_SLOTS} locations for comparison`);
            return;
        }
        if (_slots.some(s => Math.abs(s.lat - lat) < 0.01 && Math.abs(s.lon - lon) < 0.01)) {
            showToast('⚖️ Location already in comparison');
            return;
        }

        const slot = { name, lat, lon, weather: null, loading: true };
        _slots.push(slot);
        render();
        showToast(`⚖️ Loading ${name}…`);

        try {
            slot.weather = await app._fetchWeatherForLocation(lat, lon);
            slot.loading = false;
        } catch (err) {
            slot.loading = false;
            slot.error = err.message || 'Failed to load';
        }
        render();
    }

    /**
     * Remove a slot by index.
     * @param {number} idx
     */
    function removeSlot(idx) {
        _slots.splice(idx, 1);
        render();
    }

    /** Clear all comparison slots. */
    function clear() {
        _slots = [];
        render();
    }

    /** Re-render the comparison slots UI. */
    function render() {
        const container = document.getElementById('comparison-slots');
        if (!container) return;
        container.innerHTML = '';

        _slots.forEach((slot, i) => {
            const div = document.createElement('div');
            div.className = 'comparison-slot';
            div.setAttribute('role', 'listitem');

            if (slot.loading) {
                div.innerHTML = `
                    <div class="comparison-slot-name">${slot.name}</div>
                    <div class="spinner" style="width:28px;height:28px;border-width:2px;" role="status" aria-label="Loading"></div>`;
            } else if (slot.error) {
                div.innerHTML = `
                    <div class="comparison-slot-name">${slot.name}</div>
                    <div style="color:var(--danger);font-size:0.72rem;">⚠️ ${slot.error}</div>`;
            } else if (slot.weather) {
                const c = slot.weather.current;
                const icon = getWeatherIcon(c.code, c.isDay !== false);
                div.innerHTML = `
                    <button class="comparison-slot-remove" aria-label="Remove ${slot.name} from comparison">✕</button>
                    <div class="comparison-slot-name">${slot.name}</div>
                    <div class="comparison-slot-icon" aria-hidden="true">${icon}</div>
                    <div class="comparison-slot-temp">${Math.round(c.temp)}°</div>
                    <div class="comparison-slot-desc">${c.description}</div>
                    <div class="comparison-slot-stats">
                        💧${c.humidity}% · 💨${Math.round(c.windSpeed)} km/h<br>
                        ☀️UV ${Math.round(c.uvIndex)} · 🔬${Math.round(c.pressure)} hPa
                    </div>`;
                div.querySelector('.comparison-slot-remove').addEventListener('click', () => removeSlot(i));
            }

            container.appendChild(div);
        });

        // Add empty slot placeholders
        for (let i = _slots.length; i < MAX_SLOTS; i++) {
            const div = document.createElement('div');
            div.className = 'comparison-slot empty';
            div.setAttribute('role', 'listitem');
            div.setAttribute('aria-label', 'Add location to compare');
            div.innerHTML = `<span aria-hidden="true">➕</span><span>Add location</span>`;
            div.addEventListener('click', () => {
                document.getElementById('search-input').focus();
                showToast('🔍 Search a location to add to comparison');
            });
            container.appendChild(div);
        }
    }

    /** Initialise comparison panel toggle. */
    function init() {
        document.getElementById('compare-toggle-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const panel = document.getElementById('comparison-panel');
            const isOpen = panel.classList.toggle('active');
            document.getElementById('compare-toggle-btn').setAttribute('aria-expanded', String(isOpen));
            document.getElementById('compare-toggle-btn').classList.toggle('btn-active', isOpen);
            if (isOpen) render();
        });

        document.getElementById('compare-clear-btn').addEventListener('click', clear);
    }

    return { init, addLocation, removeSlot, clear, render };
})();

/* ============================================================
   FILTER MODULE
   ============================================================ */

/**
 * Filters the rendered daily/hourly forecast cards by condition,
 * temperature range, and precipitation chance.
 */
const Filter = (() => {
    /** @type {{condition:string, tempMin:number|null, tempMax:number|null, precipMax:number|null}} */
    let _active = { condition: '', tempMin: null, tempMax: null, precipMax: null };

    /** WMO code → condition category mapping. */
    const CODE_CATEGORY = {
        0: 'clear', 1: 'clear',
        2: 'cloudy', 3: 'cloudy',
        45: 'fog', 48: 'fog',
        51: 'rain', 53: 'rain', 55: 'rain', 56: 'rain', 57: 'rain',
        61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain',
        71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
        80: 'rain', 81: 'rain', 82: 'rain',
        85: 'snow', 86: 'snow',
        95: 'storm', 96: 'storm', 99: 'storm'
    };

    /**
     * Check whether a forecast day/hour passes the active filters.
     * @param {{code:number, maxTemp?:number, temp?:number, precipChance:number}} item
     * @returns {boolean}
     */
    function passes(item) {
        const { condition, tempMin, tempMax, precipMax } = _active;
        if (condition) {
            const cat = CODE_CATEGORY[item.code] || 'clear';
            if (cat !== condition) return false;
        }
        const temp = item.maxTemp !== undefined ? item.maxTemp : item.temp;
        if (tempMin !== null && temp < tempMin) return false;
        if (tempMax !== null && temp > tempMax) return false;
        if (precipMax !== null && (item.precipChance || 0) > precipMax) return false;
        return true;
    }

    /** Read filter inputs and update _active state. */
    function readFilters() {
        _active.condition = document.getElementById('filter-condition').value;
        const tMin = document.getElementById('filter-temp-min').value;
        const tMax = document.getElementById('filter-temp-max').value;
        const pMax = document.getElementById('filter-precip-max').value;
        _active.tempMin = tMin !== '' ? parseFloat(tMin) : null;
        _active.tempMax = tMax !== '' ? parseFloat(tMax) : null;
        _active.precipMax = pMax !== '' ? parseFloat(pMax) : null;
    }

    /** Reset all filter inputs and state. */
    function reset() {
        _active = { condition: '', tempMin: null, tempMax: null, precipMax: null };
        document.getElementById('filter-condition').value = '';
        document.getElementById('filter-temp-min').value = '';
        document.getElementById('filter-temp-max').value = '';
        document.getElementById('filter-precip-max').value = '';
        if (app.currentWeather) app._render();
        showToast('🔽 Filters cleared');
    }

    /** Check if any filter is currently active. */
    function isActive() {
        return _active.condition !== '' || _active.tempMin !== null || _active.tempMax !== null || _active.precipMax !== null;
    }

    /** Initialise filter bar event listeners. */
    function init() {
        const toggleBtn = document.getElementById('filter-toggle-btn');
        const filterBar = document.getElementById('filter-bar');

        toggleBtn.addEventListener('click', () => {
            const isOpen = filterBar.classList.toggle('active');
            toggleBtn.setAttribute('aria-expanded', String(isOpen));
            toggleBtn.classList.toggle('btn-active', isOpen);
        });

        ['filter-condition', 'filter-temp-min', 'filter-temp-max', 'filter-precip-max'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                readFilters();
                if (app.currentWeather) app._render();
            });
            document.getElementById(id).addEventListener('input', () => {
                readFilters();
                if (app.currentWeather) app._render();
            });
        });

        document.getElementById('filter-reset-btn').addEventListener('click', reset);
    }

    return { init, passes, isActive, readFilters, reset };
})();

/* ============================================================
   INITIALIZE
   ============================================================ */
// Apply saved theme
applyTheme(currentTheme);
initThemes();

// Create app instance
const app = new WeatherApp();

// Initialise new feature modules (after app is created so they can reference it)
Search.init();
Exporter.init();
Comparison.init();
Filter.init();

// Render initial favourites/history panels
Favourites.renderPanel();
History.renderHistory();
