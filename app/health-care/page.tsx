"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Search, MapPin, AlertTriangle, CheckCircle, Wind, Car, Loader2, Activity, ShieldAlert } from 'lucide-react';
import styles from './page.module.css';
import { fetchAllData, getAqiLevel, type LocationEnvironmentData, type GeoResult } from '@/lib/api';
import LocationAutocomplete from '@/components/LocationAutocomplete';

const MapView = dynamic(() => import('@/components/MapView'), {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading Map...</div>,
});

export default function HealthCarePage() {
    const [location, setLocation] = useState('');
    const [hasCondition, setHasCondition] = useState(false);
    const [data, setData] = useState<LocationEnvironmentData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [mapKey, setMapKey] = useState(0);

    const handleSearch = async (geo?: GeoResult) => {
        const searchInput = geo ? geo.displayName : location;
        if (!searchInput.trim()) return;
        
        setLoading(true);
        setError('');

        try {
            const result = await fetchAllData(searchInput, geo?.lat, geo?.lng);
            setData(result);
            setMapCoords({ lat: result.lat, lng: result.lng });
            setMapKey(k => k + 1);
            if (geo) setLocation(geo.displayName);
        } catch (e: any) {
            setError(e.message || 'Could not fetch data. Try a different city name.');
        } finally {
            setLoading(false);
        }
    };

    const level = data ? getAqiLevel(data.aqi) : null;
    const unsafe = data && (data.aqi > 100 || data.windSpeed > 20);

    return (
        <div className={styles.page}>
            <div className={styles.bg}>
                <div className={styles.orb1} />
                <div className={styles.orb2} />
            </div>

            <div className={styles.inner}>
                {/* Page Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerIcon}>
                        <Activity size={28} color="#34d399" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className={styles.pageTitle}>Health Care</h1>
                        <p className={styles.pageSubtitle}>Real-time air quality &amp; health routing</p>
                    </div>
                </div>

                {/* Health Profile Toggle */}
                <div className={styles.profileCard}>
                    <ShieldAlert size={18} color="#f59e0b" />
                    <span>Do you have lung issues, asthma or respiratory conditions?</span>
                    <button
                        className={`${styles.toggle} ${hasCondition ? styles.toggleOn : ''}`}
                        onClick={() => setHasCondition(!hasCondition)}
                        id="health-condition-toggle"
                    >
                        {hasCondition ? 'YES' : 'NO'}
                    </button>
                </div>

                {/* Search */}
                <div className={styles.searchRow}>
                    <div className={styles.searchBox}>
                        <MapPin size={18} color="#34d399" />
                        <LocationAutocomplete
                            id="location-search"
                            value={location}
                            onChange={setLocation}
                            onSelect={(geo) => handleSearch(geo)}
                            onEnter={() => handleSearch()}
                            placeholder="Search city or area (e.g. Salem, Chennai, Mumbai...)"
                            className={styles.searchInput}
                        />
                    </div>
                    <button className={styles.searchBtn} onClick={() => handleSearch()} disabled={loading} id="search-btn">
                        {loading ? <Loader2 size={18} className={styles.spin} /> : <Search size={18} />}
                        {loading ? 'Fetching...' : 'Analyze'}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className={styles.errorMsg}>
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                {/* Map — always visible */}
                <div className={styles.mapWrapper}>
                    <div className={styles.mapHeader}>
                        <MapPin size={16} color="#34d399" />
                        <span>
                            {data
                                ? <><strong>{data.displayName}</strong> — satellite view</>
                                : 'Search a location to pin it on the map'}
                        </span>
                    </div>
                    <div className={styles.mapContainer}>
                        <MapView
                            key={mapKey}
                            style="satellite"
                            initialViewState={{
                                latitude: mapCoords?.lat ?? 20.5937,
                                longitude: mapCoords?.lng ?? 78.9629,
                                zoom: mapCoords ? 11 : 4,
                                pitch: 0, bearing: 0,
                            }}
                            clickedMarker={mapCoords ?? undefined}
                            loading={loading}
                        />
                    </div>
                </div>

                {/* Results */}
                {data && level && (
                    <div className={styles.results}>
                        {/* Alert Banner */}
                        {unsafe ? (
                            <div className={styles.alertBanner} style={{ borderColor: hasCondition ? '#ef4444' : '#f59e0b' }}>
                                <AlertTriangle size={20} color={hasCondition ? '#ef4444' : '#f59e0b'} />
                                <div>
                                    <strong>{hasCondition ? '⚠️ High Risk! Avoid going out.' : '⚠️ Caution advised.'}</strong>
                                    <p>
                                        {data.aqi > 100 ? `Live AQI is ${data.aqi} — air quality is unhealthy. ` : ''}
                                        {data.windSpeed > 20 ? `Strong winds at ${data.windSpeed} km/h — may carry pollutants. ` : ''}
                                        {hasCondition ? 'Please wear an N95 mask or stay indoors.' : 'Consider wearing a mask.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.alertBanner} style={{ borderColor: '#22c55e' }}>
                                <CheckCircle size={20} color="#22c55e" />
                                <div>
                                    <strong>✅ Conditions look good in {data.displayName}!</strong>
                                    <p>Live AQI is {data.aqi} — air quality is within safe limits for outdoor activity.</p>
                                </div>
                            </div>
                        )}

                        {/* Metric Cards */}
                        <div className={styles.metricsGrid}>
                            <div className={styles.aqiCard} style={{ background: level.bg, borderColor: level.color + '44' }}>
                                <span className={styles.aqiEmoji}>{level.emoji}</span>
                                <span className={styles.aqiValue} style={{ color: level.color }}>{data.aqi}</span>
                                <span className={styles.aqiLabel}>AQI – {level.label}</span>
                                <div className={styles.aqiBar}>
                                    <div className={styles.aqiBarFill} style={{ width: `${Math.min((data.aqi / 300) * 100, 100)}%`, background: level.color }} />
                                </div>
                            </div>

                            {[
                                { icon: <Wind size={20} color="#a78bfa" />, value: `${data.pm25} µg/m³`, label: 'PM2.5 (Live)', color: '#a78bfa' },
                                { icon: <Car size={20} color="#38bdf8" />, value: `${data.windSpeed} km/h`, label: 'Wind Speed', color: '#38bdf8' },
                                { icon: '💧', value: `${data.humidity}%`, label: 'Humidity (Live)', color: '#34d399' },
                                { icon: '🌡️', value: `${data.temp}°C`, label: 'Temperature', color: '#fb923c' },
                            ].map((m, i) => (
                                <div key={i} className={styles.metricCard}>
                                    <span className={styles.metricIcon}>{m.icon}</span>
                                    <span className={styles.metricValue} style={{ color: m.color }}>{m.value}</span>
                                    <span className={styles.metricLabel}>{m.label}</span>
                                </div>
                            ))}
                        </div>

                        <p className={styles.dataNotes}>
                            📡 Live data via Open-Meteo & Air Quality APIs · Updated {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                )}

                {/* Empty state */}
                {!data && !loading && !error && (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🗺️</div>
                        <h3>Search a location to begin</h3>
                        <p>Enter any city or area to see live AQI, PM2.5, temperature, humidity and wind speed.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
