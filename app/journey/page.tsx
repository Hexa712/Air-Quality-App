"use client";

import { useState, useRef } from 'react';
import { analyzePath, type GeoResult, type TravelPlan } from '@/lib/api';
import { Loader2, MapPin, AlertTriangle, CheckCircle, Navigation, ArrowRight } from 'lucide-react';
import LocationAutocomplete from '@/components/LocationAutocomplete';

export default function JourneyPlannerPage() {
    const [source, setSource] = useState('');
    const [destination, setDestination] = useState('');
    const [sourceGeo, setSourceGeo] = useState<GeoResult | null>(null);
    const [destGeo, setDestGeo] = useState<GeoResult | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
    const [activeTab, setActiveTab] = useState<'recommended' | 'faster' | 'cheaper' | 'scenic'>('recommended');

    const analyzePath_ = async () => {
        if (!sourceGeo || !destGeo) {
            setError('Please select both source and destination from the suggestions');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const plan = await analyzePath(
                sourceGeo.lat,
                sourceGeo.lng,
                destGeo.lat,
                destGeo.lng,
                source,
                destination
            );
            setTravelPlan(plan);
            setActiveTab('recommended');
        } catch (err: any) {
            setError(err.message || 'Failed to analyze path');
        } finally {
            setLoading(false);
        }
    };

    const getTransportIcon = (mode: string) => {
        const icons: { [key: string]: string } = {
            'car': '🚗',
            'train': '🚂',
            'bus': '🚌',
            'flight': '✈️',
            'ship': '⛴️'
        };
        return icons[mode] || '🚗';
    };

    const getRouteForTab = () => {
        if (!travelPlan) return [];
        switch(activeTab) {
            case 'faster': return travelPlan.fasterRoute;
            case 'cheaper': return travelPlan.cheaperRoute;
            case 'scenic': return travelPlan.scenicRoute;
            case 'recommended':
            default: return travelPlan.recommendedRoute;
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.15) 0%, rgba(0, 0, 0, 0.5) 100%)', color: '#e5e7eb', padding: '40px 20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
                    <Navigation size={32} color="#38bdf8" strokeWidth={1.5} />
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #38bdf8 0%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Journey Path Analyzer</h1>
                        <p style={{ fontSize: '14px', color: '#9ca3af', margin: '4px 0 0 0' }}>Analyze complete paths between any two locations</p>
                    </div>
                </div>

                {/* Input Card */}
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#cbd5e1' }}>📍 Source Location</label>
                        <LocationAutocomplete
                            value={source}
                            onChange={setSource}
                            onSelect={(s) => { setSource(s.displayName); setSourceGeo(s); }}
                            placeholder="Enter source city..."
                            className="journey-input"
                            id="source-input"
                        />
                    </div>

                    <div style={{ textAlign: 'center', margin: '16px 0', color: '#64748b', fontSize: '12px' }}>↓</div>

                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#cbd5e1' }}>🎯 Destination Location</label>
                        <LocationAutocomplete
                            value={destination}
                            onChange={setDestination}
                            onSelect={(s) => { setDestination(s.displayName); setDestGeo(s); }}
                            placeholder="Enter destination city..."
                            className="journey-input"
                            id="dest-input"
                        />
                    </div>

                    <button
                        onClick={analyzePath_}
                        disabled={loading || !sourceGeo || !destGeo}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: loading || !sourceGeo || !destGeo ? 'rgba(56, 189, 248, 0.3)' : 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: loading || !sourceGeo || !destGeo ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '8px'
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...
                            </>
                        ) : (
                            <>📊 Analyze Complete Path</>
                        )}
                    </button>
                </div>

                {/* Results and other UI removed for brevity in this scratch, keeping it consistent with the original file's JSX structure below */}
                {/* Error */}
                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={20} color="#ef4444" />
                        <div>
                            <strong>Error</strong>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                {/* Results */}
                {travelPlan && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Route Analysis */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>🗺️ Route Analysis</h3>
                            {travelPlan.routeAnalysis.directRoadPossible ? (
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                                    <CheckCircle size={20} color="#22c55e" />
                                    <div>
                                        <strong>✅ Direct Road Possible</strong>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{travelPlan.routeAnalysis.reason}</p>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                                    <AlertTriangle size={20} color="#f59e0b" />
                                    <div>
                                        <strong>⚠️ Multi-Leg Journey Required</strong>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{travelPlan.routeAnalysis.reason}</p>
                                        {travelPlan.routeAnalysis.obstacle && (
                                            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#9ca3af' }}><strong>Obstacle:</strong> {travelPlan.routeAnalysis.obstacle}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Total Distance</div>
                                <div style={{ fontSize: '20px', fontWeight: 600, color: '#38bdf8' }}>{travelPlan.totalDistance} km</div>
                            </div>
                            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Estimated Time</div>
                                <div style={{ fontSize: '20px', fontWeight: 600, color: '#34d399' }}>{travelPlan.estimatedTime}</div>
                            </div>
                        </div>

                        {/* Route Tabs */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '20px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(56, 189, 248, 0.1)', paddingBottom: '12px' }}>
                                {(['recommended', 'faster', 'cheaper', 'scenic'] as const).map((tab) => (
                                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                        padding: '8px 12px',
                                        background: activeTab === tab ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                                        border: activeTab === tab ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.1)',
                                        color: activeTab === tab ? '#38bdf8' : '#9ca3af',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        transition: 'all 0.2s',
                                        textTransform: 'capitalize'
                                    }}>
                                        {tab === 'recommended' && '⭐'} {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Journey Legs */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {getRouteForTab().map((leg, idx) => (
                                    <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '8px', padding: '14px', borderLeft: '3px solid #38bdf8' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>Leg {leg.legNumber}</span>
                                            <span style={{ background: 'rgba(34, 211, 153, 0.2)', color: '#34d399', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{getTransportIcon(leg.transportMode)} {leg.transportMode.toUpperCase()}</span>
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {leg.from} <ArrowRight size={14} /> {leg.to}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>{leg.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style jsx>{`
                :global(.journey-input) {
                    width: 100%;
                    padding: 12px 16px;
                    background: rgba(30, 41, 59, 0.8) !important;
                    border: 1px solid rgba(56, 189, 248, 0.3) !important;
                    borderRadius: 8px !important;
                    color: #fff !important;
                }
            `}</style>
        </div>
    );
}
