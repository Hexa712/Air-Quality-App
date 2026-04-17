async function test() {
    const lat = 40.7128; const lng = -74.0060;
    try {
        const u1 = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index&wind_speed_unit=kmh`;
        const r1 = await fetch(u1);
        const w = await r1.json();
        console.log('weather:', w);
    } catch(e) { console.error('weather err:', e); }

    try {
        const u2 = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5`;
        const r2 = await fetch(u2);
        const a = await r2.json();
        console.log('aqi:', a);
    } catch(e) { console.error('aqi err:', e); }

    try {
        const u3 = `http://localhost:3000/api/reverse?lat=${lat}&lng=${lng}`;
        const r3 = await fetch(u3);
        const r = await r3.json();
        console.log('reverse:', r);
    } catch(e) { console.error('reverse err:', e); }
}
test();
