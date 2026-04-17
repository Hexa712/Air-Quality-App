import { NextResponse } from 'next/server';

// Mock data for testing and fallback
const mockData: Record<string, any> = {
    'Salem, Tamil Nadu': {
        displayName: 'Salem, Tamil Nadu',
        lat: 11.1271,
        lng: 80.2743,
        temp: 32,
        humidity: 65,
        windSpeed: 12,
        uvIndex: 8,
        aqi: 78,
        pm25: 32.5,
    },
    'Chennai, Tamil Nadu': {
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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const useFallback = searchParams.get('useFallback') === 'true';

    if (!query) {
        return NextResponse.json(
            { error: 'Missing query parameter' },
            { status: 400 }
        );
    }

    // Check for mock data
    for (const [key, data] of Object.entries(mockData)) {
        if (key.toLowerCase().includes(query.toLowerCase())) {
            return NextResponse.json(data);
        }
    }

    if (useFallback) {
        // Return generic fallback data
        return NextResponse.json({
            displayName: query,
            lat: 12.9716,
            lng: 80.2384,
            temp: 33,
            humidity: 70,
            windSpeed: 13,
            uvIndex: 7,
            aqi: 85,
            pm25: 37.0,
        });
    }

    return NextResponse.json(
        { error: `No data available for "${query}"` },
        { status: 404 }
    );
}
