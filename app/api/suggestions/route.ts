import { NextRequest, NextResponse } from 'next/server';

// Helper function with timeout for fetch
async function fetchWithTimeout(url: string, timeout = 3000) {
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
        .normalize('NFD') // Decompose combined characters (e.g., á -> a + ´)
        .replace(/[\u0300-\u036f]/g, '') // Remove the diacritic marks
        .replace(/[^\w\s,]/gi, '') // Remove any other non-alphanumeric symbols except spaces and commas
        .trim();
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');

        if (!query || query.length < 3) {
            return NextResponse.json([]);
        }

        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
        
        const res = await fetchWithTimeout(url);
        if (!res.ok) {
            console.error('Suggestions API failed:', res.status);
            return NextResponse.json([]);
        }

        const data = await res.json();
        if (!data.results) {
            return NextResponse.json([]);
        }

        const results = data.results.map((item: any) => {
            const parts = [
                cleanString(item.name),
                cleanString(item.admin1),
                cleanString(item.country),
            ].filter(Boolean);

            return {
                lat: item.latitude,
                lng: item.longitude,
                displayName: parts.slice(0, 2).join(', ') || query,
            };
        });

        return NextResponse.json(results);
    } catch (error: any) {
        console.error('API error:', error);
        return NextResponse.json([]);
    }
}
