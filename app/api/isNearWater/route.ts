import { NextRequest, NextResponse } from 'next/server';

// Helper function to check if location is near water using OpenStreetMap Nominatim Reverse Geocoding
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

        // Use Nominatim reverse geocoding to get location details
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
        
        console.log(`Checking water proximity for: ${lat},${lng}`);
        
        const res = await fetchWithTimeout(url);
        if (!res.ok) {
            console.error('Nominatim API failed:', res.status);
            // Default to false if service unavailable
            return NextResponse.json({ nearWater: false, reason: 'Could not determine' });
        }

        const data = await res.json();
        
        // Check if location data mentions water/ocean/sea/lake/river
        const address = data.address || {};
        const displayName = (data.display_name || '').toLowerCase();
        
        const waterKeywords = ['ocean', 'sea', 'bay', 'beach', 'lake', 'river', 'coast', 'strait', 'gulf', 'lagoon', 'estuary'];
        
        const nearWater = waterKeywords.some(keyword => 
            displayName.includes(keyword) || 
            Object.values(address).some(val => String(val).toLowerCase().includes(keyword))
        );

        // Get specific water body name if applicable
        let waterBody = null;
        if (nearWater) {
            const match = displayName.match(/(?:ocean|sea|bay|beach|lake|river|coast|strait|gulf|lagoon|estuary)[^,]*/i);
            if (match) {
                waterBody = match[0].trim();
            }
        }

        const result = {
            nearWater,
            waterBody,
            city: address.city || address.town || address.village || '',
            country: address.country || '',
            fullAddress: data.display_name || ''
        };

        console.log(`Water check result for ${lat},${lng}:`, result);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('API error:', error);
        
        if (error.name === 'AbortError') {
            return NextResponse.json(
                { nearWater: false, reason: 'Request timeout' }
            );
        }

        return NextResponse.json(
            { nearWater: false, reason: `Error: ${error.message}` }
        );
    }
}
