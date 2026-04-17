import { NextRequest, NextResponse } from 'next/server';

// Helper function with timeout for fetch
async function fetchWithTimeout(url: string, timeout = 5000) {
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

// Clean string from special symbols and diacritics
function cleanString(str: string): string {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s,]/gi, '')
        .trim();
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');

        if (!query) {
            return NextResponse.json(
                { error: 'Missing query parameter' },
                { status: 400 }
            );
        }

        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
        
        console.log(`Geocoding: ${query}`);
        
        const res = await fetchWithTimeout(url);
        if (!res.ok) {
            console.error('Geocoding API failed:', res.status);
            return NextResponse.json(
                { error: `Geocoding service unavailable (${res.status})` },
                { status: 502 }
            );
        }

        const data = await res.json();

        if (!data.results || !data.results.length) {
            return NextResponse.json(
                { error: `Location "${query}" not found` },
                { status: 404 }
            );
        }

        const item = data.results[0];
        const parts = [
            cleanString(item.name),
            cleanString(item.admin1),
            cleanString(item.country),
        ].filter(Boolean);

        const result = {
            lat: item.latitude,
            lng: item.longitude,
            displayName: parts.slice(0, 2).join(', ') || query,
        };

        console.log(`Geocoded ${query}:`, result);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('API error:', error);
        
        if (error.name === 'AbortError') {
            return NextResponse.json(
                { error: 'Request timeout - geocoding service is slow' },
                { status: 504 }
            );
        }

        return NextResponse.json(
            { error: `Server error: ${error.message}` },
            { status: 500 }
        );
    }
}
