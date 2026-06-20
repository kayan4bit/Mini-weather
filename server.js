import Hono from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';

const app = new Hono();

// Enable CORS for all origins
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const rateLimitStore = new Map();
const RATE_LIMIT = 2000;
const RATE_WINDOW = 3600000; // 1 hour

function checkRateLimit(key) {
    const now = Date.now();
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_WINDOW });
        return { allowed: true, remaining: RATE_LIMIT - 1 };
    }
    
    const data = rateLimitStore.get(key);
    if (now > data.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_WINDOW });
        return { allowed: true, remaining: RATE_LIMIT - 1 };
    }
    
    if (data.count >= RATE_LIMIT) {
        return { allowed: false, remaining: 0 };
    }
    
    data.count++;
    return { allowed: true, remaining: RATE_LIMIT - data.count };
}

// Weather API endpoint
app.get('/api/weather', async (c) => {
    const lat = c.req.query('lat');
    const lon = c.req.query('lon');
    const apiKey = c.req.query('key') || 'public';
    
    if (!lat || !lon) {
        return c.json({ error: 'Missing lat/lon parameters' }, 400);
    }
    
    const rateLimit = checkRateLimit(apiKey);
    if (!rateLimit.allowed) {
        return c.json({ error: 'Rate limit exceeded (2000/hour)' }, 429);
    }
    
    try {
        const params = new URLSearchParams({
            latitude: parseFloat(lat).toFixed(4),
            longitude: parseFloat(lon).toFixed(4),
            current: 'temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,relative_humidity_2m,apparent_temperature,pressure_msl,visibility,uv_index,precipitation,cloud_cover,dew_point_2m,is_day',
            hourly: 'temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m,dew_point_2m,uv_index,cloud_cover,pressure_msl',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset,cloud_cover_max',
            timezone: 'auto',
            forecast_days: '14'
        });
        
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
            signal: AbortSignal.timeout(8000)
        });
        
        if (!response.ok) {
            throw new Error(`Open-Meteo HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        return c.json({
            ...data,
            _meta: {
                source: 'Open-Meteo',
                rateLimit: rateLimit.remaining,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Weather API error:', error);
        return c.json({ 
            error: 'Failed to fetch weather data',
            details: error.message 
        }, 500);
    }
});

// Reverse geocoding
app.get('/api/location', async (c) => {
    const lat = c.req.query('lat');
    const lon = c.req.query('lon');
    
    if (!lat || !lon) {
        return c.json({ error: 'Missing lat/lon' }, 400);
    }
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
            { signal: AbortSignal.timeout(5000) }
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const addr = data.address || {};
        
        return c.json({
            city: addr.city || addr.town || addr.village || 'Unknown',
            state: addr.state || '',
            country: addr.country || '',
            display_name: data.display_name || 'Unknown Location'
        });
    } catch (error) {
        console.error('Geocoding error:', error);
        return c.json({ 
            city: `${lat}, ${lon}`,
            state: '',
            country: '',
            display_name: `${parseFloat(lat).toFixed(2)}°, ${parseFloat(lon).toFixed(2)}°`
        });
    }
});

// Health check
app.get('/health', (c) => {
    return c.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Serve static files
app.use('/*', serveStatic({ root: './' }));

// Root
app.get('/', (c) => {
    return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Mini Weather Pro API</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #f5f7fa; color: #1a1a2e; }
                h1 { color: #1e88e5; margin-bottom: 10px; }
                .subtitle { color: #666; margin-bottom: 30px; }
                .section { background: white; padding: 25px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .endpoint { background: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #1e88e5; border-radius: 4px; font-family: 'Courier New', monospace; }
                code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
                strong { color: #1e88e5; }
                ul { line-height: 1.8; }
                a { color: #1e88e5; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h1>🌤️ Mini Weather Pro API v2.0</h1>
            <p class="subtitle">Fast, accurate, privacy-first weather API with 2000 requests/hour</p>
            
            <div class="section">
                <h2>📍 Endpoints</h2>
                
                <div class="endpoint">
                    <strong>GET /api/weather</strong>
                    <p>Fetch weather data for a location</p>
                    <p><strong>Parameters:</strong></p>
                    <ul>
                        <li><code>lat</code> - Latitude (-90 to 90)</li>
                        <li><code>lon</code> - Longitude (-180 to 180)</li>
                        <li><code>key</code> - API key (optional, defaults to 'public')</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <code>GET /api/weather?lat=51.5074&lon=-0.1278</code>
                </div>
                
                <div class="endpoint">
                    <strong>GET /api/location</strong>
                    <p>Reverse geocode coordinates to location name</p>
                    <p><strong>Parameters:</strong></p>
                    <ul>
                        <li><code>lat</code> - Latitude</li>
                        <li><code>lon</code> - Longitude</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <code>GET /api/location?lat=51.5074&lon=-0.1278</code>
                </div>
                
                <div class="endpoint">
                    <strong>GET /health</strong>
                    <p>Health check endpoint</p>
                </div>
            </div>
            
            <div class="section">
                <h2>⚡ Rate Limiting</h2>
                <p><strong>2000 requests per hour</strong> per API key</p>
                <p>Rate limit resets every hour. Use the <code>key</code> parameter to track your usage.</p>
            </div>
            
            <div class="section">
                <h2>📊 Data Source</h2>
                <p>Weather data from <a href="https://open-meteo.com" target="_blank">Open-Meteo</a> (free, no API key required)</p>
                <p>Location data from <a href="https://nominatim.org" target="_blank">Nominatim/OpenStreetMap</a></p>
            </div>
            
            <div class="section">
                <h2>🔒 Privacy</h2>
                <p>All requests are processed securely. No data is stored or shared with third parties.</p>
            </div>
        </body>
        </html>
    `);
});

export default app;

