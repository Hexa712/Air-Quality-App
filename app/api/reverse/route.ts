import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        if (!lat || !lng) {
            return NextResponse.json(
                { error: 'Missing lat or lng parameter' },
                { status: 400 }
            );
        }

        // Use BigDataCloud free reverse geocoding API for more reliable place names
        // It has no strict rate limits like Nominatim and returns clean locality data.
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
        
        const res = await fetch(url);

        if (!res.ok) {
            return NextResponse.json(
                { error: `Geocoding API failed: ${res.status}` },
                { status: 502 }
            );
        }

        const data = await res.json();
        
        // Build a nice display name from BigDataCloud's structured response
        const locName = data.city || data.locality;
        const stateName = data.principalSubdivision;
        const countryName = data.countryName;

        const parts = [
            locName,
            stateName,
            countryName,
        ].filter(Boolean);

        // Limit to 3 parts to keep it concise but descriptive
        let displayName = parts.slice(0, 3).join(', ');

        // Fallback for oceans/remote areas
        if (!displayName) {
            displayName = "Unknown Region";
        }

        return NextResponse.json({ displayName });
    } catch (error: any) {
        console.error('Reverse geocode error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
