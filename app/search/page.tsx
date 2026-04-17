"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, TrendingUp, History, Loader2, Thermometer, Droplets, Wind, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import styles from './search.module.css';
import { fetchAllData, getAqiLevel, type LocationEnvironmentData, type GeoResult } from '@/lib/api';
import Link from 'next/link';
import { useRef } from 'react';
import LocationAutocomplete from '@/components/LocationAutocomplete';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<LocationEnvironmentData | null>(null);
    const [error, setError] = useState('');
    const resultsRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const handleSearch = async (geo?: GeoResult) => {
        const searchInput = geo ? geo.displayName : query;
        if (!searchInput.trim()) return;

        setLoading(true);
        setError('');
        try {
            const data = await fetchAllData(searchInput, geo?.lat, geo?.lng);
            setResult(data);
            if (geo) setQuery(geo.displayName);
            // Smooth scroll to results
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (err: any) {
            setError(err.message || 'Location not found');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        'Bangalore, India', 'New York, USA', 'London, UK', 'Tokyo, Japan', 'Paris, France'
    ];

    return (
        <div className={`${styles.container} container`}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className="gradient-text">Global Search</h1>
                    <p>Find real-time air quality and environmental data for any location on Earth.</p>
                </div>

                <div className={`${styles.searchBox} glass-card`}>
                    <Search className={styles.searchIcon} size={24} />
                    <LocationAutocomplete
                        value={query}
                        onChange={setQuery}
                        onSelect={(geo) => handleSearch(geo)}
                        onEnter={() => handleSearch()}
                        placeholder="Search by city, country or region..."
                        className={styles.autocomplete}
                    />
                    <button type="button" className="btn-primary" disabled={loading} onClick={() => handleSearch()}>
                        {loading ? <Loader2 size={18} className={styles.spin} /> : 'Search'}
                    </button>
                </div>

                {error && <div className={styles.error}><AlertCircle size={16} /> {error}</div>}

                {/* Live Results Section */}
                {result && (
                    <div className={styles.results} ref={resultsRef}>
                        <div className={`${styles.resultsCard} glass-card`}>
                            <div className={styles.resultsHeader}>
                                <div>
                                    <div className={styles.locationBadge}><MapPin size={14} /> {result.displayName}</div>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: 600 }}>
                                        <span>{result.lat.toFixed(3)}, {result.lng.toFixed(3)}</span>
                                        <span>API SOURCE: OPEN-METEO AIR QUALITY</span>
                                    </div>
                                    <h2 className={styles.resultsTitle}>Detailed Air Statistics</h2>
                                </div>
                                <div className={styles.levelBadge} style={{ backgroundColor: getAqiLevel(result.aqi).color }}>
                                    {getAqiLevel(result.aqi).label}
                                </div>
                            </div>

                            <div className={styles.resultsGrid}>
                                <div className={styles.gaugeContainer}>
                                    <div className={styles.gaugeValue} style={{ color: getAqiLevel(result.aqi).color }}>
                                        {result.aqi}
                                    </div>
                                    <div className={styles.gaugeLabel}>AQI INDEX</div>
                                    <div className={styles.gaugeEmoji}>{getAqiLevel(result.aqi).emoji}</div>
                                </div>

                                <div className={styles.statsList}>
                                    <div className={styles.statLine}>
                                        <span><Thermometer size={16} /> Temperature</span>
                                        <strong>{result.temp}°C</strong>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span><Droplets size={16} /> Humidity</span>
                                        <strong>{result.humidity}%</strong>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span><Wind size={16} /> Wind Speed</span>
                                        <strong>{result.windSpeed} km/h</strong>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span><ShieldCheck size={16} /> UV Index</span>
                                        <strong>{result.uvIndex}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.actions}>
                                <Link href={`/map?lat=${result.lat}&lng=${result.lng}&name=${encodeURIComponent(result.displayName)}`} className={styles.actionBtn}>
                                    View on Interactive Map <ArrowRight size={16} />
                                </Link>
                                <Link href={`/health-care?lat=${result.lat}&lng=${result.lng}`} className={styles.secondaryBtn}>
                                    Health Advice
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.grid}>
                    <div className={`${styles.card} glass-card`}>
                        <h3><MapPin size={18} color="#3b82f6" /> Popular Searches</h3>
                        <div className={styles.chips}>
                            {suggestions.map((city) => (
                                <button
                                    key={city}
                                    onClick={() => {
                                        setQuery(city);
                                        // Trigger search immediately
                                        setLoading(true);
                                        setTimeout(() => handleSearch(), 100);
                                    }}
                                    className={styles.chip}
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`${styles.card} glass-card`}>
                        <h3><TrendingUp size={18} color="#10b981" /> Recently Viewed</h3>
                        <div className={styles.recentList}>
                            <div className={styles.recentItem}>
                                <span>Mumbai, India</span>
                                <span className={styles.aqiBadge} style={{ background: '#f87171' }}>142</span>
                            </div>
                            <div className={styles.recentItem}>
                                <span>Sydney, Australia</span>
                                <span className={styles.aqiBadge} style={{ background: '#4ade80' }}>18</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
