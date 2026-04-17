"use client";

import React, { useMemo, useCallback } from 'react';
import Map, { NavigationControl, Marker, Source, Layer } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface ClickedMarker {
    lat: number;
    lng: number;
}

interface MapMarker {
    id: string | number;
    lat: number;
    lng: number;
    name: string;
}

interface MapViewProps {
    style?: string;
    initialViewState?: any;
    onMapClick?: (lat: number, lng: number) => void;
    clickedMarker?: ClickedMarker | null;
    markers?: MapMarker[];
    locationName?: string;
    loading?: boolean;
    routeGeometry?: any;
}

// Open-source Style Definitions
const STYLES = {
    satellite: {
        version: 8,
        sources: {
            'google-hybrid': {
                type: 'raster',
                tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
                tileSize: 256,
                attribution: 'Google'
            }
        },
        layers: [{ id: 'google-hybrid', type: 'raster', source: 'google-hybrid', minzoom: 0, maxzoom: 22 }]
    },
    streets: {
        version: 8,
        sources: {
            'google-streets': {
                type: 'raster',
                tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
                tileSize: 256,
                attribution: 'Google'
            }
        },
        layers: [{ id: 'google-streets', type: 'raster', source: 'google-streets', minzoom: 0, maxzoom: 22 }]
    },
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
};

const MapView = ({
    style = 'satellite',
    initialViewState = {
        latitude: 11.6643,
        longitude: 78.1460,
        zoom: 3,
        pitch: 0,
        bearing: 0
    },
    onMapClick,
    clickedMarker,
    markers = [],
    locationName,
    loading = false,
    routeGeometry,
}: MapViewProps) => {

    const mapStyle = useMemo(() => {
        if (style.includes('satellite')) return STYLES.satellite;
        if (style.includes('streets')) return STYLES.streets;
        if (style.includes('dark')) return STYLES.dark;
        return STYLES.satellite;
    }, [style]);

    const handleClick = useCallback((evt: any) => {
        if (onMapClick) {
            onMapClick(evt.lngLat.lat, evt.lngLat.lng);
        }
    }, [onMapClick]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent' }}>
            <Map
                initialViewState={initialViewState}
                mapStyle={mapStyle as any}
                style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                projection="globe"
                mapLib={maplibregl}
                onClick={handleClick}
            >
                <NavigationControl position="top-right" />

                {/* Start Marker */}
                {clickedMarker && (
                    <Marker
                        longitude={clickedMarker.lng}
                        latitude={clickedMarker.lat}
                        anchor="bottom"
                    >
                        <div style={{ position: 'relative', width: '36px', height: '36px', cursor: 'pointer' }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(59,130,246,0.3)', animation: 'pulse-ring 1.4s ease-out infinite' }} />
                            <div style={{ position: 'absolute', top: '4px', left: '4px', width: '28px', height: '28px', background: '#3b82f6', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '2px solid white', boxShadow: '0 0 12px rgba(59,130,246,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', transform: 'rotate(45deg)' }} />
                            </div>
                            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '4px', padding: '2px 10px', background: 'white', color: '#1e293b', fontSize: '11px', fontWeight: '700', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', zIndex: 10 }}>
                                {loading ? 'Fetching...' : (locationName?.includes('°') ? 'Pinned Location' : (locationName || 'Start / Selected'))}
                            </div>
                        </div>
                    </Marker>
                )}

                {/* Saved/Persistent Markers have been removed from map view to prevent clutter. */}

                {/* Destination Marker */}
                {(initialViewState as any)?.toLat && (initialViewState as any)?.toLng && (
                    <Marker
                        longitude={(initialViewState as any).toLng}
                        latitude={(initialViewState as any).toLat}
                        anchor="bottom"
                    >
                        <div style={{ position: 'relative', width: '36px', height: '36px', cursor: 'pointer' }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(244,63,94,0.3)', animation: 'pulse-ring 1.4s ease-out infinite' }} />
                            <div style={{ position: 'absolute', top: '4px', left: '4px', width: '28px', height: '28px', background: '#f43f5e', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '2px solid white', boxShadow: '0 0 12px rgba(244,63,94,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', transform: 'rotate(45deg)' }} />
                            </div>
                            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '4px', padding: '2px 10px', background: 'white', color: '#1e293b', fontSize: '11px', fontWeight: '700', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', zIndex: 10 }}>
                                Destination
                            </div>
                        </div>
                    </Marker>
                )}

                {/* Route Direction Line */}
                {clickedMarker && (initialViewState as any)?.toLat && (initialViewState as any)?.toLng && (
                    <Source
                        id="route-source"
                        type="geojson"
                        data={routeGeometry ? {
                            type: 'Feature',
                            properties: {},
                            geometry: routeGeometry
                        } : {
                            type: 'FeatureCollection',
                            features: [
                                {
                                    type: 'Feature',
                                    properties: {},
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: [
                                            [clickedMarker.lng, clickedMarker.lat],
                                            [(initialViewState as any).toLng, (initialViewState as any).toLat]
                                        ]
                                    }
                                }
                            ]
                        }}
                    >
                        <Layer
                            id="route-layer"
                            type="line"
                            layout={{
                                'line-join': 'round',
                                'line-cap': 'round'
                            }}
                            paint={{
                                'line-color': '#38bdf8',
                                'line-width': 5,
                                'line-opacity': 0.8
                            }}
                        />
                        <Layer
                            id="route-layer-glow"
                            type="line"
                            layout={{
                                'line-join': 'round',
                                'line-cap': 'round'
                            }}
                            paint={{
                                'line-color': '#38bdf8',
                                'line-width': 10,
                                'line-opacity': 0.2,
                                'line-blur': 5
                            }}
                        />
                    </Source>
                )}

            </Map>

            {/* Hint overlay */}
            {!clickedMarker && !loading && (
                <div style={{
                    position: 'absolute', bottom: '24px', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15,23,42,0.85)',
                    backdropFilter: 'blur(8px)',
                    color: '#94a3b8',
                    padding: '8px 18px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: '1px solid rgba(148,163,184,0.2)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                }}>
                    🖱️ Click anywhere on the map to get live weather &amp; AQI data
                </div>
            )}

            <style>{`
                .maplibregl-canvas { outline: none; }
                .maplibregl-ctrl-bottom-right,
                .maplibregl-ctrl-bottom-left { display: none; }
                @keyframes pulse-ring {
                    0%   { transform: scale(0.6); opacity: 1; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default MapView;
