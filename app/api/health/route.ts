import { NextResponse } from 'next/server';

async function checkAPI(url: string, name: string, timeout = 5000): Promise<{ name: string; status: string; time: number }> {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const res = await fetch(url, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'RespiraflarApp/1.0' }
        });
        
        clearTimeout(timeoutId);
        const time = Date.now() - start;
        
        return {
            name,
            status: res.ok ? `OK (${res.status})` : `Error ${res.status}`,
            time
        };
    } catch (err: any) {
        const time = Date.now() - start;
        return {
            name,
            status: `Failed: ${err.name === 'AbortError' ? 'Timeout' : err.message}`,
            time
        };
    }
}

export async function GET() {
    const checks = await Promise.all([
        checkAPI('https://api.open-meteo.com/v1/forecast?latitude=11.1271&longitude=80.2743&current=temperature_2m', 'Weather API'),
        checkAPI('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=11.1271&longitude=80.2743&current=us_aqi', 'Air Quality API'),
        checkAPI('https://geocoding-api.open-meteo.com/v1/search?name=Chennai&count=1', 'Geocoding API'),
    ]);

    const allOK = checks.every(c => c.status.includes('OK'));

    return NextResponse.json({
        status: allOK ? 'healthy' : 'degraded',
        checks,
        timestamp: new Date().toISOString()
    });
}
