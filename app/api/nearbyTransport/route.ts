import { NextRequest, NextResponse } from 'next/server';

async function fetchWithTimeout(url: string, timeout = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { 
            signal: controller.signal,
            headers: {
                'User-Agent': 'RespiraflarApp/1.0'
            }
        });
        return res;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Find transportation facilities near a location
async function findNearbyTransport(lat: number, lng: number, type: string, radius: number = 50000) {
    try {
        // Use Nominatim to search for transportation amenities
        // radius in meters (50km default)
        const url = `https://nominatim.openstreetmap.org/search?q=${type}+near+${lat},${lng}&format=json&limit=5&viewbox=${lng-0.5},${lat+0.5},${lng+0.5},${lat-0.5}&bounded=1`;
        
        const res = await fetchWithTimeout(url, 5000);
        if (!res.ok) return [];

        const data = await res.json();
        return data.map((item: any) => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: type,
            distance: calculateDistance(lat, lng, parseFloat(item.lat), parseFloat(item.lon))
        })).sort((a: any, b: any) => a.distance - b.distance).slice(0, 3);
    } catch (err) {
        console.error(`Error finding ${type}:`, err);
        return [];
    }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        if (!lat || !lng) {
            return NextResponse.json(
                { error: 'Missing lat/lng parameters' },
                { status: 400 }
            );
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        console.log(`Finding transportation near: ${latitude},${longitude}`);

        // Search for different transportation types in parallel
        const [airports, trainStations, busStations, ports] = await Promise.all([
            findNearbyTransport(latitude, longitude, 'airport'),
            findNearbyTransport(latitude, longitude, 'train station'),
            findNearbyTransport(latitude, longitude, 'bus station'),
            findNearbyTransport(latitude, longitude, 'port'),
        ]);

        const routes = {
            airport: airports.length > 0 ? {
                available: true,
                nearest: airports[0],
                alternatives: airports,
                emoji: '✈️',
                label: 'Flight',
                estimatedCost: airports[0].distance < 50 ? 'Medium' : 'High',
                duration: calculateTravelTime(airports[0].distance, 60) // avg 60 km/h to airport
            } : {
                available: false,
                label: 'Flight',
                emoji: '✈️'
            },
            
            train: trainStations.length > 0 ? {
                available: true,
                nearest: trainStations[0],
                alternatives: trainStations,
                emoji: '🚂',
                label: 'Train',
                estimatedCost: 'Low',
                duration: calculateTravelTime(trainStations[0].distance, 40) // avg 40 km/h arrival
            } : {
                available: false,
                label: 'Train',
                emoji: '🚂'
            },
            
            bus: busStations.length > 0 ? {
                available: true,
                nearest: busStations[0],
                alternatives: busStations,
                emoji: '🚌',
                label: 'Bus',
                estimatedCost: 'Low',
                duration: calculateTravelTime(busStations[0].distance, 30) // avg 30 km/h arrival
            } : {
                available: false,
                label: 'Bus',
                emoji: '🚌'
            },
            
            port: ports.length > 0 ? {
                available: true,
                nearest: ports[0],
                alternatives: ports,
                emoji: '⛴️',
                label: 'Ferry/Port',
                estimatedCost: 'Medium',
                duration: calculateTravelTime(ports[0].distance, 50) // avg 50 km/h to port
            } : {
                available: false,
                label: 'Ferry/Port',
                emoji: '⛴️'
            },
            
            car: {
                available: true,
                label: 'Car/Taxi',
                emoji: '🚗',
                estimatedCost: 'Low-Medium'
            }
        };

        console.log(`Transportation routes found near ${latitude},${longitude}:`, routes);
        return NextResponse.json(routes);
    } catch (error: any) {
        console.error('API error:', error);
        
        if (error.name === 'AbortError') {
            return NextResponse.json(
                { error: 'Request timeout' },
                { status: 504 }
            );
        }

        return NextResponse.json(
            { error: `Server error: ${error.message}` },
            { status: 500 }
        );
    }
}

function calculateTravelTime(distanceKm: number, avgSpeedKmh: number): string {
    const totalMinutes = (distanceKm / avgSpeedKmh) * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
