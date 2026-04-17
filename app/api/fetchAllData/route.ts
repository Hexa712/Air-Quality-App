import { NextRequest, NextResponse } from 'next/server';

// Mock data for fallback
const mockData: Record<string, any> = {
    'salem': {
        displayName: 'Salem, Tamil Nadu',
        lat: 11.6643,
        lng: 78.1460,
        temp: 32,
        humidity: 65,
        windSpeed: 12,
        uvIndex: 8,
        aqi: 78,
        pm25: 32.5,
    },
    'chennai': {
        displayName: 'Chennai, Tamil Nadu',
        lat: 13.0827,
        lng: 80.2707,
        temp: 34,
        humidity: 75,
        windSpeed: 15,
        uvIndex: 7,
        aqi: 95,
        pm25: 42.3,
    },
};

function getFallbackData(query: string) {
    const queryLower = query.toLowerCase();
    for (const [key, data] of Object.entries(mockData)) {
        if (queryLower.includes(key)) {
            return data;
        }
    }
    return {
        displayName: query,
        lat: 12.9716,
        lng: 80.2384,
        temp: 33,
        humidity: 70,
        windSpeed: 13,
        uvIndex: 7,
        aqi: 85,
        pm25: 37.0,
    };
}

async function fetchWithTimeout(url: string, timeout = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'RespiraflarApp/1.0' }
        });
        return res;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchWithRetry(url: string, serviceName: string, maxRetries = 2): Promise<Response> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`[${serviceName}] Attempt ${i + 1}/${maxRetries}`);
            const res = await fetchWithTimeout(url, 8000);
            
            if (res.ok) {
                console.log(`[${serviceName}] ✓ Success`);
                return res;
            }
            
            if (res.status >= 400 && res.status < 500) {
                console.log(`[${serviceName}] ✗ Client error ${res.status}`);
                return res;
            }
            
            lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
            console.warn(`[${serviceName}] ✗ Attempt ${i + 1} failed`);
            
            if (i < maxRetries - 1) {
                const delayMs = 2000 * Math.pow(2, i);
                console.log(`[${serviceName}] ⏳ Retrying in ${delayMs}ms...`);
                await new Promise(r => setTimeout(r, delayMs));
            }
        } catch (err: any) {
            lastError = err;
            console.error(`[${serviceName}] ✗ Attempt ${i + 1} error`);
            
            if (i < maxRetries - 1) {
                const delayMs = 2000 * Math.pow(2, i);
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
    }
    
    throw lastError;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        let latitude = lat ? parseFloat(lat) : null;
        let longitude = lng ? parseFloat(lng) : null;
        let displayName = query || "Selected Location";

        // If coordinates are missing, perform server-side geocoding first
        if ((latitude === null || longitude === null) && query) {
            console.log(`[Server] Geocoding missing coordinates for: ${query}`);
            try {
                const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
                const geoRes = await fetchWithTimeout(geoUrl, 5000);
                if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    if (geoData.results && geoData.results.length > 0) {
                        const item = geoData.results[0];
                        latitude = item.latitude;
                        longitude = item.longitude;
                        displayName = [item.name, item.admin1, item.country].filter(Boolean).slice(0, 2).join(', ');
                    }
                }
            } catch (err) {
                console.warn('[Server] Geocoding failed, falling back to mock data');
            }
        }

        if (latitude === null || longitude === null) {
            // If still no coordinates, return fallback immediately
            const fallback = getFallbackData(query || 'Unknown');
            return NextResponse.json({
                ...fallback,
                useFallback: true,
                apiSource: "DEMO DATA (Geocoding Failed)",
            });
        }

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index&wind_speed_unit=kmh&timezone=auto`;
        const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm2_5`;

        let weatherData: any = null;
        let airData: any = null;
        let usesFallback = false;

        // Fetch weather and air quality in parallel for better performance
        try {
            const [weatherRes, airRes] = await Promise.all([
                fetchWithRetry(weatherUrl, 'Weather', 1).catch(err => {
                    console.warn('Weather fetch failed:', err);
                    return null;
                }),
                fetchWithRetry(airQualityUrl, 'AirQuality', 1).catch(err => {
                    console.warn('Air quality fetch failed:', err);
                    return null;
                })
            ]);

            if (weatherRes && weatherRes.ok) {
                weatherData = await weatherRes.json();
            } else {
                usesFallback = true;
            }

            if (airRes && airRes.ok) {
                airData = await airRes.json();
            } else {
                usesFallback = true;
            }
        } catch (err) {
            console.warn('Parallel fetch error:', err);
            usesFallback = true;
        }

        if (!weatherData?.current || !airData?.current) {
            const fallback = getFallbackData(query || 'Unknown');
            return NextResponse.json({
                displayName: displayName || fallback.displayName,
                lat: latitude !== null ? latitude : fallback.lat,
                lng: longitude !== null ? longitude : fallback.lng,
                temp: fallback.temp,
                humidity: fallback.humidity,
                windSpeed: fallback.windSpeed,
                uvIndex: fallback.uvIndex,
                aqi: fallback.aqi,
                pm25: fallback.pm25,
                useFallback: true,
                apiSource: "DEMO DATA (Service Offline)",
            });
        }

        const current = weatherData.current;
        const airCurrent = airData.current;

        return NextResponse.json({
            displayName: displayName,
            lat: latitude,
            lng: longitude,
            temp: Math.round(current.temperature_2m ?? 0),
            humidity: Math.round(current.relative_humidity_2m ?? 0),
            windSpeed: Math.round(current.wind_speed_10m ?? 0),
            uvIndex: Math.round(current.uv_index ?? 0),
            aqi: Math.round(airCurrent.us_aqi ?? 0),
            pm25: Math.round((airCurrent.pm2_5 ?? 0) * 10) / 10,
            useFallback: false,
            apiSource: "Open-Meteo",
        });
    } catch (error: any) {
        console.error('API error:', error);
        
        let query, latParam, lngParam;
        try {
            const { searchParams } = new URL(request.url);
            query = searchParams.get('query');
            latParam = searchParams.get('lat');
            lngParam = searchParams.get('lng');
        } catch { /* ignore */ }

        const fallback = getFallbackData(query || 'Unknown');
        return NextResponse.json({
            displayName: query || fallback.displayName,
            lat: latParam ? parseFloat(latParam) : fallback.lat,
            lng: lngParam ? parseFloat(lngParam) : fallback.lng,
            temp: fallback.temp,
            humidity: fallback.humidity,
            windSpeed: fallback.windSpeed,
            uvIndex: fallback.uvIndex,
            aqi: fallback.aqi,
            pm25: fallback.pm25,
            useFallback: true,
            apiSource: "DEMO DATA (Error)",
        });
    }
}
