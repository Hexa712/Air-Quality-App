"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './map.module.css';
import { MapIcon, GlobeIcon, Layers, Crosshair, Thermometer, Droplets, Wind, Info, ChevronDown, Search, Trash2 } from 'lucide-react';
import { fetchAllData, getAqiLevel } from '@/lib/api';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import SpaceAnimation from '@/components/SpaceAnimation';

const MapView = dynamic(() => import('@/components/MapView'), {
    ssr: false,
    loading: () => <div className={styles.loading}>Preparing Industrial Globe...</div>
});

// ────────── helpers ──────────
function getAqiColor(aqi: number) {
    if (aqi <= 50) return '#4ade80';
    if (aqi <= 100) return '#fbbf24';
    if (aqi <= 150) return '#f97316';
    if (aqi <= 200) return '#ef4444';
    return '#a855f7';
}
function getAqiLabel(aqi: number) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy (Sensitive)';
    if (aqi <= 200) return 'Unhealthy';
    return 'Hazardous';
}


// ────────── reverse geocode with Nominatim (free, no key) ──────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const url = `/api/reverse?lat=${lat}&lng=${lng}`;
        const res = await fetch(url);
        if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        const data = await res.json();
        return data.displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
}

function MapContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [mapStyle, setMapStyle] = useState<any>('satellite');
    const [showStyleMenu, setShowStyleMenu] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [healthCondition, setHealthCondition] = useState('asthma'); // Mocked from user profile
    const [markers, setMarkers] = useState<any[]>([]);

    const [clickedMarker, setClickedMarker] = useState<{ lat: number; lng: number } | null>(null);

    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [isMobile, setIsMobile] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const [locationData, setLocationData] = useState<any>({
        latitude: 11.6643,
        longitude: 78.1460,
        name: "Salem, Tamil Nadu",
        zoom: 3,
    });

    // ── core: fetch all data for a clicked/searched point ──
    const handleFetchData = useCallback(async (lat: number, lng: number, name?: string) => {
        setFetchLoading(true);
        try {
            // Get name first if not provided
            const locationName = name || await reverseGeocode(lat, lng);

            // Use the unified API for data
            const data = await fetchAllData(locationName, lat, lng);

            setSelectedLocation({
                name: data.displayName,
                aqi: data.aqi,
                pm25: data.pm25,
                temp: data.temp,
                hum: data.humidity,
                wind: data.windSpeed,
                uv: data.uvIndex,
                apiSource: (data as any).apiSource || 'Open-Meteo'
            });
        } catch (err) {
            console.error('Data fetch error:', err);
            if (!name) {
                setSelectedLocation((prev: any) => ({
                    ...prev,
                    name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                }));
            }
        } finally {
            setFetchLoading(false);
        }
    }, []);

    // ── handle URL params (coming from search page) ──
    useEffect(() => {
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const name = searchParams.get('name');
        const toLat = searchParams.get('toLat');
        const toLng = searchParams.get('toLng');
        const mode = searchParams.get('mode');

        if (lat && lng) {
            const newLat = parseFloat(lat);
            const newLng = parseFloat(lng);

            setLocationData({
                latitude: newLat,
                longitude: newLng,
                name: name || "Selected Location",
                zoom: mode === 'route' ? 6 : 12,
                toLat: toLat ? parseFloat(toLat) : null,
                toLng: toLng ? parseFloat(toLng) : null
            });
            setClickedMarker({ lat: newLat, lng: newLng });

            // Fetch real data for the searched location
            handleFetchData(newLat, newLng, name || undefined);
        }
    }, [searchParams, handleFetchData]);

    // ── map click handler ──
    const handleMapClick = useCallback((lat: number, lng: number) => {
        setClickedMarker({ lat, lng });
        handleFetchData(lat, lng);
    }, [handleFetchData]);

    const addMarker = (lat: number, lng: number, name: string) => {
        const newMarker = {
            id: Date.now(),
            lat,
            lng,
            name: name || `Marker ${markers.length + 1}`
        };
        setMarkers(prev => [newMarker, ...prev]);
    };

    const removeMarker = (id: number) => {
        setMarkers(prev => prev.filter(m => m.id !== id));
    };

    const handleSearchSelect = (geo: any) => {
        const lat = parseFloat(geo.lat);
        const lng = parseFloat(geo.lng);
        setSearchQuery(geo.displayName);

        // Update map view (fly animation via key change)
        setLocationData({
            latitude: lat,
            longitude: lng,
            name: geo.displayName,
            zoom: 14,
        });

        setClickedMarker({ lat, lng });
        handleFetchData(lat, lng, geo.displayName);

        // Add to saved list automatically like MapForge selectPlace
        addMarker(lat, lng, geo.displayName);
    };

    const handleLocate = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            setLocationData({
                latitude,
                longitude,
                name: "Your Location",
                zoom: 14,
            });
            setClickedMarker({ lat: latitude, lng: longitude });
            handleFetchData(latitude, longitude, "Your Location");
            addMarker(latitude, longitude, "Your Location");
        });
    };

    const scrollToDetails = () => {
        sidebarRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const aqi = selectedLocation?.aqi ?? 0;

    return (
        <div className={styles.mapContainer}>
            <SpaceAnimation />
            <div className={styles.mapViewWrapper}>
                <div className={styles.searchOverlay}>
                    <LocationAutocomplete
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onSelect={handleSearchSelect}
                        placeholder="Search any place in the world..."
                        className={styles.mapSearch}
                    />
                </div>

                <MapView
                    style={mapStyle}
                    initialViewState={{
                        latitude: locationData.latitude,
                        longitude: locationData.longitude,
                        zoom: locationData.zoom,
                        pitch: 0,
                        bearing: 0,
                        toLat: locationData.toLat,
                        toLng: locationData.toLng,
                    }}
                    key={`${locationData.latitude}-${locationData.longitude}`}
                    onMapClick={handleMapClick}
                    clickedMarker={clickedMarker}
                    markers={markers}
                    locationName={selectedLocation ? `${selectedLocation.name} (AQI: ${selectedLocation.aqi})` : undefined}
                    loading={fetchLoading}
                />

                {/* Layer Switcher */}
                <div className={styles.controls}>
                    <button className={styles.controlBtn} onClick={handleLocate} title="Locate Me">
                        <Crosshair size={20} />
                    </button>
                    <div className={styles.controlWrapper}>
                        {showStyleMenu && (
                            <div className={`${styles.styleMenu} ${styles['glass-card']}`}>
                                <button onClick={() => { setMapStyle('streets'); setShowStyleMenu(false); }} className={mapStyle === 'streets' ? styles.activeStyle : ''}>
                                    <MapIcon size={16} /> <span>Street Map</span>
                                </button>
                                <button onClick={() => { setMapStyle('satellite'); setShowStyleMenu(false); }} className={mapStyle === 'satellite' ? styles.activeStyle : ''}>
                                    <GlobeIcon size={16} /> <span>Satellite Globe</span>
                                </button>
                                <button onClick={() => { setMapStyle('dark'); setShowStyleMenu(false); }} className={mapStyle === 'dark' ? styles.activeStyle : ''}>
                                    <Layers size={16} /> <span>Dark Terrain</span>
                                </button>
                            </div>
                        )}
                        <button
                            className={`${styles.controlBtn} ${showStyleMenu ? styles.activeBtn : ''}`}
                            onClick={() => setShowStyleMenu(!showStyleMenu)}
                        >
                            <Layers size={20} />
                        </button>
                    </div>
                    <button className={styles.controlBtn} title="App Info"><Info size={20} /></button>
                </div>

                {/* Scroll Indicator for Mobile */}
                {isMobile && (
                    <button className={styles.scrollIndicator} onClick={scrollToDetails}>
                        <ChevronDown size={14} />
                        <span>Show Details</span>
                    </button>
                )}
            </div>

            {/* Stats Sidebar */}
            <div className={styles.sidebar} ref={sidebarRef}>
                {selectedLocation && (
                    <div className={styles['glass-card']}>
                        <div className={styles.locationTitle}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ marginBottom: '2px', fontSize: '1.4rem' }}>{fetchLoading ? 'Loading...' : (selectedLocation?.name || 'Searching...')}</h2>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span
                                        className={styles.statusBadge}
                                        style={{ background: fetchLoading ? 'rgba(100,116,139,0.2)' : 'rgba(74,222,128,0.15)', color: fetchLoading ? '#64748b' : '#4ade80' }}
                                    >
                                        {fetchLoading ? 'Fetching AQI…' : 'Live Data'}
                                    </span>
                                    {clickedMarker && (
                                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <Crosshair size={10} /> {clickedMarker.lat.toFixed(3)}, {clickedMarker.lng.toFixed(3)}
                                        </span>
                                    )}
                                    {selectedLocation?.apiSource && !fetchLoading && (
                                        <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 600 }}>via {selectedLocation.apiSource}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: `${getAqiColor(selectedLocation.aqi || 0)}18`,
                            border: `1px solid ${getAqiColor(selectedLocation.aqi || 0)}44`,
                            borderRadius: '10px', padding: '10px 14px', marginBottom: '12px',
                        }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '50%',
                                background: `${getAqiColor(selectedLocation.aqi || 0)}22`,
                                border: `2px solid ${getAqiColor(selectedLocation.aqi || 0)}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '14px', fontWeight: 800, color: getAqiColor(selectedLocation.aqi || 0),
                            }}>
                                {fetchLoading ? '…' : (selectedLocation.aqi || 0)}
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Air Quality Index</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: getAqiColor(selectedLocation.aqi || 0) }}>{fetchLoading ? '—' : getAqiLabel(selectedLocation.aqi || 0)}</div>
                            </div>
                        </div>

                        {!fetchLoading && healthCondition === 'asthma' && (selectedLocation.aqi || 0) > 100 && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '10px', padding: '12px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                <p style={{ fontSize: '0.85rem', color: '#fca5a5', margin: 0, fontWeight: 500 }}>
                                    <strong>Health Alert:</strong> High AQI detected. As you have Asthma, please avoid staying outdoors for long.
                                </p>
                            </div>
                        )}

                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}><Thermometer size={18} /><div className={styles.statVal}><span className={styles.val}>{fetchLoading ? '—' : selectedLocation.temp}</span><span className={styles.unit}>°C</span></div><span className={styles.statLabel}>Temp</span></div>
                            <div className={styles.statItem}><Droplets size={18} /><div className={styles.statVal}><span className={styles.val}>{fetchLoading ? '—' : selectedLocation.hum}</span><span className={styles.unit}>%</span></div><span className={styles.statLabel}>Humidity</span></div>
                            <div className={styles.statItem}><Wind size={18} /><div className={styles.statVal}><span className={styles.val}>{fetchLoading ? '—' : selectedLocation.wind}</span><span className={styles.unit}>km/h</span></div><span className={styles.statLabel}>Wind</span></div>
                            <div className={styles.statItem}><Info size={18} /><div className={styles.statVal}><span className={styles.val}>{fetchLoading ? '—' : selectedLocation.pm25}</span><span className={styles.unit}>µg/m³</span></div><span className={styles.statLabel}>PM2.5</span></div>
                            <div className={styles.statItem}><Thermometer size={18} color={selectedLocation.uv > 6 ? '#ef4444' : '#fbbf24'} /><div className={styles.statVal}><span className={styles.val}>{fetchLoading ? '—' : selectedLocation.uv}</span><span className={styles.unit}>Index</span></div><span className={styles.statLabel}>UV</span></div>
                            <div className={styles.statItem}><Layers size={18} /><div className={styles.statVal}><span className={styles.val}>{(selectedLocation.aqi || 0) > 100 ? 'Low' : 'Opt'}</span></div><span className={styles.statLabel}>Safety</span></div>
                        </div>

                        <button className={styles.actionBtn} onClick={() => router.push(`/crop?aqi=${selectedLocation.aqi}&temp=${selectedLocation.temp}&hum=${selectedLocation.hum}&name=${encodeURIComponent(selectedLocation.name)}`)}>
                            Agriculture AI
                        </button>
                    </div>
                )}

                <div className={styles['glass-card']}>
                    <div className={styles.cardHeader}>
                        <GlobeIcon size={18} className={styles.headerIcon} />
                        <h3>Air Intelligence</h3>
                    </div>
                    <p className={styles.helpText}>Click anywhere on the map for live data</p>
                    <div className={styles.legend}>
                        <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#4ade80' }}></span><span className={styles.label}>AQI: Good (0–50)</span></div>
                        <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#fbbf24' }}></span><span className={styles.label}>AQI: Moderate (51–100)</span></div>
                        <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#f97316' }}></span><span className={styles.label}>AQI: Unhealthy (101+)</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MapPage() {
    return (
        <Suspense fallback={<div className={styles.loading}>Loading Map Intelligence...</div>}>
            <MapContent />
        </Suspense>
    );
}
