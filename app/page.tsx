"use client";

import Link from 'next/link';
import { Activity, Droplets, ArrowRight, Wind, Leaf, ChevronDown, Search, MapPin, Loader2, Thermometer, AlertCircle } from 'lucide-react';
import styles from './page.module.css';
import { useState, useRef, useEffect } from 'react';
import { fetchAllData, getAqiLevel, type LocationEnvironmentData, type GeoResult } from '@/lib/api';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import Logo from '@/components/Logo';

import AtmosphericAnimation from '@/components/AtmosphericAnimation';

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LocationEnvironmentData | null>(null);
  const [error, setError] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (geo?: GeoResult) => {
    const searchInput = geo ? geo.displayName : query;
    if (!searchInput.trim()) return;

    setLoading(true);
    setError('');
    try {
      const data = await fetchAllData(searchInput, geo?.lat, geo?.lng);
      setResult(data);
      if (geo) setQuery(geo.displayName);
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

  const level = result ? getAqiLevel(result.aqi) : null;

  return (
    <div className={styles.page}>
      {/* Animated background */}
      <div className={styles.heroBackground}>
        <div className={styles.videoOverlay} />
        <AtmosphericAnimation />
      </div>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.brand}>
          <Logo size={120} className={styles.heroLogo} />
          <div className={styles.brandText}>
            <h1 className={styles.brandName}>
              Respira <span style={{ color: '#2dd4bf', fontWeight: 900 }}>Flare</span>
            </h1>
            <p className={styles.brandTagline}>
              <Droplets size={16} className={styles.sparkleIcon} />
              Your Environmental Wellness Guardian
            </p>
          </div>
        </div>

        <p className={styles.heroSubtitle}>
          Real-time awareness for your health and planet. Protecting your lungs and your skin from the invisible threats of pollution.
        </p>

        {/* Hero Search Section */}
        <div className={styles.heroSearch}>
          <div className={styles.searchForm}>
            <div className={styles.searchInputWrapper}>
              <LocationAutocomplete
                value={query}
                onChange={setQuery}
                onSelect={(geo) => handleSearch(geo)}
                onEnter={() => handleSearch()}
                placeholder="Search your city for instant details..."
                className={styles.searchInput}
              />
            </div>
            <button type="button" className={styles.searchBtn} disabled={loading} onClick={() => handleSearch()}>
              {loading ? <Loader2 size={18} className={styles.spin} /> : 'Check Air Quality'}
            </button>
          </div>
          {error && <p className={styles.searchError}><AlertCircle size={14} /> {error}</p>}
        </div>

        {/* Main Cards */}
        <div className={styles.cards}>
          {/* Health Care Card */}
          <Link href="/health-care" className={styles.card} id="healthcare-btn">
            <div className={styles.cardGlow} style={{ background: 'radial-gradient(circle, rgba(251,113,133,0.25) 0%, transparent 70%)' }} />
            <div className={styles.cardIcon} style={{ background: 'rgba(251,113,133,0.12)', borderColor: 'rgba(251,113,133,0.3)' }}>
              <Activity size={36} color="#fb7185" strokeWidth={1.5} />
            </div>
            <h2 className={styles.cardTitle}>Healthcare</h2>
            <p className={styles.cardDesc}>
              Interactive global map with real-time AQI and pollution monitoring. Personalized alerts based on your health conditions.
            </p>
            <div className={styles.cardTags}>
              <span className={styles.tag} style={{ borderColor: 'rgba(251,113,133,0.3)', color: '#fb7185' }}>🌍 Global Map</span>
              <span className={styles.tag} style={{ borderColor: 'rgba(251,113,133,0.3)', color: '#fb7185' }}>🚨 Health Alerts</span>
            </div>
            <div className={styles.cardArrow}>
              <ArrowRight size={20} color="#fb7185" />
            </div>
          </Link>

          {/* Skin Care Card */}
          <Link href="/skin-care" className={styles.card} id="skincare-btn">
            <div className={styles.cardGlow} style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)' }} />
            <div className={styles.cardIcon} style={{ background: 'rgba(167,139,250,0.12)', borderColor: 'rgba(167,139,250,0.3)' }}>
              <Droplets size={36} color="#a78bfa" strokeWidth={1.5} />
            </div>
            <h2 className={styles.cardTitle}>Skincare</h2>
            <p className={styles.cardDesc}>
              Analyze how current air quality affects your skin type. Get personalized protection advice and AI face analysis.
            </p>
            <div className={styles.cardTags}>
              <span className={styles.tag} style={{ borderColor: 'rgba(167,139,250,0.3)', color: '#a78bfa' }}>✨ Skin Damage Analysis</span>
              <span className={styles.tag} style={{ borderColor: 'rgba(167,139,250,0.3)', color: '#a78bfa' }}>🧴 Precautions</span>
            </div>
            <div className={styles.cardArrow}>
              <ArrowRight size={20} color="#a78bfa" />
            </div>
          </Link>
        </div>


      </section>

      {/* Search Results Section - The "Further Details" */}
      {result && level && (
        <section className={styles.liveResults} ref={resultsRef}>
          <div className={styles.container}>
            <div className={styles.resultsGrid}>
              <div className={styles.resultsInfo}>
                <div className={styles.locationBadge}>
                  <MapPin size={16} /> {result.displayName}
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontWeight: 600 }}>
                  <span>{result.lat.toFixed(3)}°N, {result.lng.toFixed(3)}°E</span>
                  <span>•</span>
                  <span style={{ color: '#38bdf8' }}>REAL-TIME API: OPEN-METEO</span>
                </div>
                <h2 className={styles.resultsTitle}>
                  Current Air Quality is <span style={{ color: level.color }}>{level.label}</span>
                </h2>
                <p className={styles.resultsDesc}>
                  The AQI in {result.displayName} is currently <strong>{result.aqi}</strong>.
                  {result.aqi > 100 ? ' We recommend avoiding prolonged outdoor activities.' : ' The air is generally safe for everyone today.'}
                </p>

                <div className={styles.miniStats}>
                  <div className={styles.miniStat}>
                    <Thermometer size={18} color="#f87171" />
                    <span>{result.temp}°C</span>
                    <label>Temp</label>
                  </div>
                  <div className={styles.miniStat}>
                    <Droplets size={18} color="#38bdf8" />
                    <span>{result.humidity}%</span>
                    <label>Humidity</label>
                  </div>
                  <div className={styles.miniStat}>
                    <Wind size={18} color="#34d399" />
                    <span>{result.windSpeed} km/h</span>
                    <label>Wind</label>
                  </div>
                </div>

                <Link href={`/health-care?lat=${result.lat}&lng=${result.lng}`} className={styles.detailsBtn}>
                  Personalized Health Advice <ArrowRight size={16} />
                </Link>
              </div>

              <div className={styles.resultsGauge} style={{ backgroundColor: level.bg, borderColor: level.color + '30' }}>
                <span className={styles.gaugeEmoji}>{level.emoji}</span>
                <span className={styles.gaugeValue} style={{ color: level.color }}>{result.aqi}</span>
                <span className={styles.gaugeLabel}>Global US AQI</span>
                <div className={styles.gaugeBar}>
                  <div className={styles.gaugeProgress} style={{ width: `${Math.min(100, (result.aqi / 300) * 100)}%`, backgroundColor: level.color }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}



      {/* Feature row */}
      <section className={styles.features}>
        <div className={styles.featuresInner}>
          <h2 className={styles.sectionTitle}>
            Full Awareness, <span className="gradient-text">Total Protection</span>
          </h2>
          <div className={styles.featureGrid}>
            {[
              { icon: '🌬️', title: 'Real-time AQI', desc: 'Live pollutant data from global stations.', href: '/map' },
              { icon: '🚨', title: 'Personalized Alerts', desc: 'Health-specific warnings for Asthma & Allergies.', href: '/health-care' },
              { icon: '🌾', title: 'Crop Advisory', desc: 'Pollution-reducing plant suggestions for your area.', href: '/crop' },
              { icon: '🚗', title: 'Traffic Monitor', desc: 'Live congestion data to identify pollution hotspots.', href: '/traffic' },
            ].map((f) => (
              <Link key={f.title} href={f.href} className={`${styles.featureCard} glass-card`}>
                <span className={styles.featureEmoji}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>
            <Logo size={32} style={{ marginRight: '12px' }} />
            Respira<span style={{ color: '#2dd4bf', fontWeight: 700 }}>Flare</span>
          </span>
          <p>© 2026 Respira Flare. Breathing life into environmental health.</p>

        </div>
      </footer>
    </div>
  );
}
