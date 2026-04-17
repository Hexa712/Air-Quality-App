"use client";

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchSuggestions, calculateDistance, estimateTravelTime, fetchRoadRoute, type GeoResult, type LocationEnvironmentData, fetchAllData, getAqiLevel, analyzePath, type TravelPlan } from '@/lib/api';
import { Search, MapPin, Navigation, Info, Car, Train, Bus, Anchor, Plane, ArrowRight, Loader2, AlertTriangle, CheckCircle, Wind, Clock, Ruler, Maximize2 } from 'lucide-react';
import styles from './page.module.css';
import LocationAutocomplete from '@/components/LocationAutocomplete';

const MapView = dynamic(() => import('@/components/MapView'), {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading Map...</div>,
});

import TrafficAnimation from '@/components/TrafficAnimation';

export default function TrafficMonitorPage() {
    // Basic Search State
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    // Resolved Data State
    const [fromGeo, setFromGeo] = useState<GeoResult | null>(null);
    const [toGeo, setToGeo] = useState<GeoResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [fromData, setFromData] = useState<LocationEnvironmentData | null>(null);
    const [toData, setToData] = useState<LocationEnvironmentData | null>(null);
    const [roadDetails, setRoadDetails] = useState<{ distanceKm: number, durationText: string } | null>(null);
    const [analyzeStep, setAnalyzeStep] = useState('');
    const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
    const [showPathAnalysis, setShowPathAnalysis] = useState(false);
    const [activePathTab, setActivePathTab] = useState<'recommended' | 'faster' | 'cheaper' | 'scenic'>('recommended');

    const resultsRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    const toggleMapFullscreen = () => {
        if (mapRef.current) {
            if (!document.fullscreenElement) {
                mapRef.current.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
    };

    const analyze = async () => {
        if (!from.trim() || !to.trim()) {
            setError('Please enter both start and destination cities');
            return;
        }
        setLoading(true);
        setError('');
        setAnalyzeStep('Fetching data for both locations...');

        try {
            const [fd, td] = await Promise.all([
                fetchAllData(from, fromGeo?.lat, fromGeo?.lng),
                fetchAllData(to, toGeo?.lat, toGeo?.lng)
            ]);

            setAnalyzeStep('Calculating real road route...');
            setFromData(fd);
            setToData(td);

            const road = await fetchRoadRoute(fd.lat, fd.lng, td.lat, td.lng);
            setRoadDetails(road);

            // Analyze complete path
            if (fromGeo && toGeo) {
                try {
                    setAnalyzeStep('Analyzing complete path...');
                    const plan = await analyzePath(fromGeo.lat, fromGeo.lng, toGeo.lat, toGeo.lng, from, to);
                    setTravelPlan(plan);
                    setShowPathAnalysis(true);
                } catch (pathErr) {
                    console.warn('Path analysis failed:', pathErr);
                    setShowPathAnalysis(false);
                }
            }

            if (fd.useFallback || td.useFallback) {
                setError('ℹ️ Demo Mode: Using demonstration data. Real data will appear when external services are available.');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
            setAnalyzeStep('');
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    const routeAqi = fromData && toData ? Math.round((fromData.aqi + toData.aqi) / 2) : null;
    const routeLevel = routeAqi !== null ? getAqiLevel(routeAqi) : null;
    const distance = roadDetails?.distanceKm ?? null;
    const eta = roadDetails?.durationText ?? null;

    return (
        <div className={styles.page}>
            <div className={styles.bg}>
                <TrafficAnimation />
                <div className={styles.orb1} />
                <div className={styles.orb2} />
            </div>

            <div className={styles.inner}>
                <div className={styles.pageHeader}>
                    <div></div>
                    <div>
                        <h1 className={styles.pageTitle}>Traffic Monitor</h1>
                        <p className={styles.pageSubtitle}>Live pollution, travel time & weather for your route</p>
                    </div>
                </div>

                <div className={styles.routeCard}>
                    <div className={styles.routeInputs}>
                        <div className={styles.inputGroup}>
                            <div className={styles.inputLabel}>From</div>
                            <LocationAutocomplete
                                value={from}
                                onChange={setFrom}
                                onSelect={(s) => { setFrom(s.displayName); setFromGeo(s); }}
                                placeholder="Start city"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.routeDivider}></div>
                        <div className={styles.inputGroup}>
                            <div className={styles.inputLabel}>To</div>
                            <LocationAutocomplete
                                value={to}
                                onChange={setTo}
                                onSelect={(s) => { setTo(s.displayName); setToGeo(s); }}
                                placeholder="Destination city"
                                className={styles.input}
                            />
                        </div>
                    </div>
                    <button className={styles.analyzeBtn} onClick={analyze} disabled={loading || !from || !to}>
                        {loading
                            ? <><Loader2 size={18} className={styles.spin} /> Calculating route...</>
                            : <><Search size={18} /> Analyze Route & Travel Time</>}
                    </button>
                </div>

                {error && !fromData && (
                    <div className={styles.alert}>
                        <AlertTriangle size={20} color="#ef4444" />
                        <p>{error}</p>
                    </div>
                )}

                <div ref={resultsRef}>
                    {loading && (
                        <div className={styles.resultsLoading}>
                            <Loader2 size={32} className={styles.spin} />
                            <h3>Analyzing route conditions</h3>
                            <p>{analyzeStep}</p>
                        </div>
                    )}

                    {fromData && toData && routeAqi !== null && routeLevel && (
                        <div className={styles.results}>
                            <div className={styles.alert} style={{ borderColor: routeLevel.color }}>
                                {routeAqi > 100 ? <AlertTriangle size={20} color={routeLevel.color} /> : <CheckCircle size={20} color={routeLevel.color} />}
                                <div>
                                    <strong>{routeAqi > 100 ? 'Unhealthy air along route!' : 'Route air quality looks good!'}</strong>
                                    <p>Distance: {distance} km · Travel Time: {eta} · Avg AQI: {routeAqi}</p>
                                </div>
                            </div>

                            <div className={styles.metricsGrid}>
                                <div className={styles.bigMetric} style={{ background: routeLevel.bg, borderColor: routeLevel.color + '40' }}>
                                    <span className={styles.bigEmoji}>{routeLevel.emoji}</span>
                                    <span className={styles.bigValue} style={{ color: routeLevel.color }}>{routeAqi}</span>
                                    <span className={styles.bigLabel}>Route AQI avg – {routeLevel.label}</span>
                                </div>
                                {[
                                    { icon: <Ruler size={20} color="#34d399" />, label: 'Distance', value: `${distance} km`, color: '#34d399' },
                                    { icon: <Clock size={20} color="#38bdf8" />, label: 'Travel Time', value: eta, color: '#38bdf8' },
                                    { icon: <Wind size={20} color="#a78bfa" />, label: 'Avg Wind', value: `${Math.round((fromData.windSpeed + toData.windSpeed) / 2)} km/h`, color: '#a78bfa' },
                                    { icon: '🌫️', label: 'Avg PM2.5', value: `${Math.round(((fromData.pm25 + toData.pm25) / 2) * 10) / 10} µg/m³`, color: '#f97316' },
                                ].map((m, i) => (
                                    <div key={i} className={styles.metricCard}>
                                        <span className={styles.metricIcon}>{m.icon}</span>
                                        <span className={styles.metricValue} style={{ color: m.color }}>{m.value}</span>
                                        <span className={styles.metricLabel}>{m.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.hotspotsCard}>
                                <h3 className={styles.hotspotsTitle}>📍 Live Conditions at Each End</h3>
                                <div className={styles.hotspotsList}>
                                    {[
                                        { loc: fromData, label: '🛫 Start', level: getAqiLevel(fromData.aqi) },
                                        { loc: toData, label: '🛬 End', level: getAqiLevel(toData.aqi) },
                                    ].map(({ loc, label, level }) => (
                                        <div key={label} className={styles.hotspot} style={{ borderLeft: `3px solid ${level.color}` }}>
                                            <div>
                                                <span className={styles.hotspotName}>{label}: {loc.displayName}</span>
                                                <span className={styles.hotspotLabel}>
                                                    AQI <strong style={{ color: level.color }}>{loc.aqi}</strong> · {level.label} · {loc.temp}°C · {loc.humidity}% humidity
                                                </span>
                                            </div>
                                            <span className={styles.hotspotEmoji}>{level.emoji}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {showPathAnalysis && travelPlan && (
                                <div className={styles.pathAnalysisSection}>
                                    <h3>📊 Complete Path Analysis</h3>
                                    <div className={styles.pathGrid}>
                                        {travelPlan.recommendedRoute.map((leg, idx) => (
                                            <div key={idx} className={styles.pathLeg}>
                                                <div className={styles.legHeader}>
                                                    <span>Leg {leg.legNumber}</span>
                                                    <span className={styles.legMode}>{leg.transportMode.toUpperCase()}</span>
                                                </div>
                                                <div className={styles.legTitle}>{leg.from} → {leg.to}</div>
                                                <div className={styles.legDesc}>{leg.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div ref={mapRef} style={{ height: '450px', borderRadius: '24px', overflow: 'hidden', marginBottom: '20px', position: 'relative', border: '1px solid rgba(16, 185, 129, 0.2)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                                <button
                                    onClick={toggleMapFullscreen}
                                    style={{
                                        position: 'absolute',
                                        top: '16px',
                                        right: '16px',
                                        zIndex: 10,
                                        background: 'rgba(10, 22, 15, 0.9)',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        color: '#34d399',
                                        padding: '10px 18px',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(10, 22, 15, 0.9)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <Maximize2 size={16} /> Enter Fullscreen View
                                </button>
                                <MapView
                                    style="streets"
                                    initialViewState={{
                                        latitude: (fromData.lat + toData.lat) / 2,
                                        longitude: (fromData.lng + toData.lng) / 2,
                                        zoom: distance && distance > 500 ? 3 : 5,
                                        toLat: toData.lat,
                                        toLng: toData.lng
                                    }}
                                    clickedMarker={{ lat: fromData.lat, lng: fromData.lng }}
                                    locationName={fromData.displayName}
                                    routeGeometry={roadDetails?.geometry}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {!fromData && !loading && (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}></span>
                        <h3>Enter a route to analyze</h3>
                        <p>We calculate real distance and travel time, plus live AQI for both your start and destination cities.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
