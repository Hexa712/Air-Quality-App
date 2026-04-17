/**
 * Respira Flora – shared real-time data utilities
 *
 * APIs used (all free, no API key required):
 *  • Nominatim   – geocoding   https://nominatim.openstreetmap.org
 *  • Open-Meteo  – weather     https://api.open-meteo.com
 *  • Open-Meteo Air Quality – AQI / PM2.5  https://air-quality-api.open-meteo.com
 */

// ─────────────────────────────────────────────
// 1. Geocoding – city name → lat/lng
// ─────────────────────────────────────────────
export interface GeoResult {
    lat: number;
    lng: number;
    displayName: string;
}

export async function fetchSuggestions(query: string): Promise<GeoResult[]> {
    if (!query || query.length < 3) return [];
    try {
        const url = `/api/suggestions?query=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data;
    } catch (err) {
        console.error('fetchSuggestions error:', err);
        return [];
    }
}

export async function geocodeCity(query: string): Promise<GeoResult> {
    const url = `/api/geocode?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();

    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}

function processResult(item: any, query: string): GeoResult {
    const parts = [
        item.name,
        item.admin1,
        item.country,
    ].filter(Boolean);

    return {
        lat: item.latitude,
        lng: item.longitude,
        displayName: parts.slice(0, 2).join(', ') || query,
    };
}

// ─────────────────────────────────────────────
// 2. Weather  (Open-Meteo – no key)
// ─────────────────────────────────────────────
export interface WeatherData {
    temp: number;        // °C
    humidity: number;    // %
    windSpeed: number;   // km/h
    uvIndex: number;     // 0-11+
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index` +
        `&wind_speed_unit=kmh&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API error');
    const d = await res.json();
    const c = d.current;
    return {
        temp: Math.round(c.temperature_2m),
        humidity: Math.round(c.relative_humidity_2m),
        windSpeed: Math.round(c.wind_speed_10m),
        uvIndex: Math.round(c.uv_index ?? 0),
    };
}

// ─────────────────────────────────────────────
// 3. Air Quality  (Open-Meteo Air Quality – no key)
// ─────────────────────────────────────────────
export interface AirQualityData {
    aqi: number;    // US AQI
    pm25: number;   // µg/m³
}

export async function fetchAirQuality(lat: number, lng: number): Promise<AirQualityData> {
    const url =
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}` +
        `&current=us_aqi,pm2_5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Air quality API error');
    const d = await res.json();
    const c = d.current;
    return {
        aqi: Math.round(c.us_aqi ?? 0),
        pm25: Math.round((c.pm2_5 ?? 0) * 10) / 10,
    };
}

// ─────────────────────────────────────────────
// 4. Calculations – Distance & ETA
// ─────────────────────────────────────────────

/**
 * Calculates the Haversine distance between two points on the Earth.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

/**
 * Estimates travel time based on distance (km) and average speed (km/h)
 */
export function estimateTravelTime(distanceKm: number, avgSpeedKmh: number = 60): string {
    const totalMinutes = (distanceKm / avgSpeedKmh) * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * Fetches real road distance and time from OSRM API
 */
export async function fetchRoadRoute(lat1: number, lng1: number, lat2: number, lng2: number, includeGeometry: boolean = true) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM API failed');
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
            const route = data.routes[0];
            return {
                distanceKm: Math.round(route.distance / 1000),
                durationSec: route.duration,
                durationText: estimateTravelTime(route.distance / 1000, (route.distance / 1000) / (route.duration / 3600)),
                geometry: includeGeometry ? route.geometry : null
            };
        }
    } catch (err) {
        console.warn('OSRM failed, falling back to Haversine:', err);
    }
    
    // Fallback
    const dist = calculateDistance(lat1, lng1, lat2, lng2);
    return {
        distanceKm: dist,
        durationSec: (dist / 60) * 3600,
        durationText: estimateTravelTime(dist),
        geometry: null
    };
}



// ─────────────────────────────────────────────
// 5. Convenience: fetch everything at once
// ─────────────────────────────────────────────
export interface LocationEnvironmentData extends WeatherData, AirQualityData {
    displayName: string;
    lat: number;
    lng: number;
    useFallback?: boolean;
}

export async function fetchAllData(query: string, lat?: number, lng?: number): Promise<LocationEnvironmentData> {
    let url = `/api/fetchAllData?query=${encodeURIComponent(query)}`;
    if (lat !== undefined && lng !== undefined) {
        url += `&lat=${lat}&lng=${lng}`;
    }

    try {
        const res = await fetch(url);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `API error: ${res.status}`);
        }
        
        const data = await res.json();
        if (data && typeof data === 'object') {
            return data as LocationEnvironmentData;
        }
        
        throw new Error('Invalid response from API');
    } catch (err: any) {
        console.error(`fetchAllData error for ${query}:`, err);
        throw err;
    }
}

// ─────────────────────────────────────────────
// 6. AQI helpers
// ─────────────────────────────────────────────
export const AQI_LEVELS = [
    { max: 50, label: 'Good', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', emoji: '😊' },
    { max: 100, label: 'Moderate', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', emoji: '😐' },
    { max: 150, label: 'Unhealthy for Sensitive', color: '#f97316', bg: 'rgba(249,115,22,0.12)', emoji: '😷' },
    { max: 200, label: 'Unhealthy', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', emoji: '🤢' },
    { max: 300, label: 'Very Unhealthy', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', emoji: '☠️' },
    { max: 500, label: 'Hazardous', color: '#7f1d1d', bg: 'rgba(127,29,29,0.15)', emoji: '💀' },
] as const;

export function getAqiLevel(aqi: number) {
    return AQI_LEVELS.find(l => aqi <= l.max) ?? AQI_LEVELS[AQI_LEVELS.length - 1];
}

// ─────────────────────────────────────────────
// 7. Water Detection & Transportation Routes
// ─────────────────────────────────────────────
export interface WaterInfo {
    nearWater: boolean;
    waterBody: string | null;
    city: string;
    country: string;
}

export interface TransportRoute {
    available: boolean;
    label: string;
    emoji: string;
    nearest?: {
        name: string;
        lat: number;
        lng: number;
        distance: number;
        type: string;
    };
    alternatives?: any[];
    duration?: string;
    estimatedCost?: string;
}

export interface TransportRoutes {
    airport: TransportRoute;
    train: TransportRoute;
    bus: TransportRoute;
    port: TransportRoute;
    car: TransportRoute;
}

export async function checkIfNearWater(lat: number, lng: number): Promise<WaterInfo> {
    try {
        const res = await fetch(`/api/isNearWater?lat=${lat}&lng=${lng}`);
        if (!res.ok) throw new Error('Failed to check water');
        return await res.json();
    } catch (err) {
        console.error('checkIfNearWater error:', err);
        return { nearWater: false, waterBody: null, city: '', country: '' };
    }
}

export async function fetchNearbyTransportRoutes(lat: number, lng: number): Promise<TransportRoutes | null> {
    try {
        const res = await fetch(`/api/nearbyTransport?lat=${lat}&lng=${lng}`);
        if (!res.ok) throw new Error('Failed to fetch transport routes');
        return await res.json();
    } catch (err) {
        console.error('fetchNearbyTransportRoutes error:', err);
        return null;
    }
}

// ─────────────────────────────────────────────
// 8. Travel Path Analyzer – Complete Route Analysis
// ─────────────────────────────────────────────
export interface JourneyLeg {
    legNumber: number;
    from: string;
    to: string;
    transportMode: 'car' | 'train' | 'bus' | 'flight' | 'ship';
    distance?: number;
    estimatedTime: string;
    description: string;
    reason: string;
    cost: 'low' | 'medium' | 'high';
    difficulty: 'easy' | 'moderate' | 'difficult';
}

export interface RouteAnalysis {
    directRoadPossible: boolean;
    reason: string;
    obstacle?: string;
    distance: number;
}

export interface TravelPlan {
    source: string;
    destination: string;
    routeAnalysis: RouteAnalysis;
    fasterRoute: JourneyLeg[];
    cheaperRoute: JourneyLeg[];
    scenicRoute: JourneyLeg[];
    recommendedRoute: JourneyLeg[];
    totalDistance: number;
    estimatedTime: string;
}

export async function analyzePath(
    sourceLat: number,
    sourceLng: number,
    destLat: number,
    destLng: number,
    sourceName: string,
    destName: string
): Promise<TravelPlan> {
    try {
        const res = await fetch('/api/analyzePath', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sourceLat,
                sourceLng,
                destLat,
                destLng,
                sourceName,
                destName
            })
        });

        if (!res.ok) throw new Error('Path analysis failed');
        return await res.json();
    } catch (err) {
        console.error('analyzePath error:', err);
        throw err;
    }
}

// ─────────────────────────────────────────────
// 9. Agriculture AI – Seed Recommendations
// ─────────────────────────────────────────────
export interface SeedRecommendation {
    id: string;
    name: string;
    description: string;
    suitability: 'High' | 'Moderate' | 'Low';
    reason: string;
}

export function getSeedRecommendations(aqi: number, temp?: number, humidity?: number): SeedRecommendation[] {
    // Logic: Higher AQI -> more resilient plants.
    // Logic: Higher Temp -> drought resistant plants.
    // Logic: Higher Humidity -> tropical plants.

    if (aqi <= 50) {
        const recs: SeedRecommendation[] = [
            { id: 'tulsi', name: 'Tulsi', description: 'Highly oxygenating herb.', suitability: 'High', reason: 'Perfect conditions for delicate herbs and air-purifying plants.' },
        ];

        if (temp && temp > 30) {
            recs.push({ id: 'aloe', name: 'Aloe Vera', description: 'Sun-loving succulent.', suitability: 'High', reason: 'Thrives in warm, clean air and low water conditions.' });
        } else {
            recs.push({ id: 'neem', name: 'Neem', description: 'Hardy tree with medicinal properties.', suitability: 'High', reason: 'Optimal growth conditions for long-term health.' });
        }

        recs.push({ id: 'peepal', name: 'Peepal', description: 'Massive CO2 absorber.', suitability: 'High', reason: 'Great for established root systems in clean air.' });
        return recs;
    } else if (aqi <= 100) {
        return [
            { id: 'neem', name: 'Neem', description: 'Natural air filter.', suitability: 'High', reason: 'Hardy enough to filter moderate particulate matter efficiently.' },
            { id: 'aloe', name: 'Aloe Vera', description: 'Resilient succulent.', suitability: 'High', reason: temp && temp > 25 ? 'Loves the warmth and purifies moderate air quality.' : 'Thrives in moderate quality and starts purifying immediately.' },
            { id: 'tulsi', name: 'Tulsi', description: 'Holy Basil.', suitability: 'Moderate', reason: 'Will grow but needs frequent leaf cleaning to breathe in this dust.' }
        ];
    } else if (aqi <= 200) {
        const recs: SeedRecommendation[] = [
            { id: 'snake_plant', name: 'Snake Plant', description: 'Survivor plant.', suitability: 'High', reason: 'Highly resistant to heavy pollutants (PM2.5/PM10).' },
            { id: 'spider_plant', name: 'Spider Plant', description: 'Formaldehyde filter.', suitability: 'High', reason: 'Effectively absorbs volatile compounds from polluted air.' },
        ];

        if (humidity && humidity > 60) {
            recs.push({ id: 'bamboo_palm', name: 'Bamboo Palm', description: 'Moisture-loving filter.', suitability: 'High', reason: 'Perfect for humid, polluted urban environments.' });
        } else {
            recs.push({ id: 'neem', name: 'Neem', description: 'Tree lung.', suitability: 'Moderate', reason: 'Slow growth in high pollution but vital for filtration.' });
        }
        return recs;
    } else {
        return [
            { id: 'snake_plant', name: 'Snake Plant', description: 'Ultra-resilient.', suitability: 'High', reason: 'One of the few plants that can survive and clean extremely hazardous air.' },
            { id: 'bamboo_palm', name: 'Bamboo Palm', description: 'Heavy duty filter.', suitability: 'Moderate', reason: 'Strong enough to handle hazardous toxins but requires care.' },
            { id: 'peepal', name: 'Peepal', description: 'Legendary purifier.', suitability: 'Moderate', reason: 'Planted as a long-term solution to reclaim the environment.' }
        ];
    }
}
