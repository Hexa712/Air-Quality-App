"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Leaf, ArrowRight, Sparkles, Sprout, Info, AlertCircle, X } from 'lucide-react';

import styles from './page.module.css';
import { getSeedRecommendations, getAqiLevel, type SeedRecommendation } from '@/lib/api';

const PLANTS = [
    { id: 'tulsi', name: 'Tulsi (Holy Basil)', emoji: '🌿', color: '#4ade80', pm25: 18.4, co2: 5.2, benefits: ['O₂ boost', 'Stress relief'], description: 'Tulsi is one of the most powerful air-purifying plants. It releases oxygen 20 hours a day and absorbs pollutants like CO, SO₂, and particulate matter.', image: '/plants/tulsi.png', video: 'https://cdn.pixabay.com/video/2019/09/07/26637-360259342_large.mp4' },
    { id: 'neem', name: 'Neem Tree', emoji: '🌳', color: '#22c55e', pm25: 28.6, co2: 14.8, benefits: ['Natural filter', 'Cooling'], description: 'A single mature Neem tree can filter up to 28.6 µg/m³ of PM2.5 daily and acts as a natural air conditioner reducing local temperature by 2-3°C.', image: '/plants/neem.png', video: 'https://cdn.pixabay.com/video/2024/05/15/212037_large.mp4' },
    { id: 'peepal', name: 'Peepal Tree', emoji: '🍂', color: '#16a34a', pm25: 22.1, co2: 21.3, benefits: ['24h Oxygen', 'CO₂ sink'], description: 'Unlike most trees, Peepal undergoes CAM photosynthesis releasing oxygen even at night. It is a powerhouse CO₂ absorber in urban environments.', image: '/plants/peepal.png', video: 'https://cdn.pixabay.com/video/2024/05/15/212037_large.mp4' },
    { id: 'snake-plant', name: 'Snake Plant', emoji: '🎍', color: '#86efac', pm25: 15.2, co2: 4.1, benefits: ['Nocturnal O₂', 'Removes Toluene'], description: 'Snake plants are legendary survivors. They can handle hazardous air levels while continuing to release oxygen during the night.', image: '/plants/snake_plant.png', video: 'https://cdn.pixabay.com/video/2019/09/07/26637-360259342_large.mp4' },
    { id: 'peace-lily', name: 'Peace Lily', emoji: '🥀', color: '#d1fae5', pm25: 12.8, co2: 3.2, benefits: ['Humidity control', 'VoC removal'], description: 'Peace lilies excel at absorbing mold spores and toxic vapors like Formaldehyde and Carbon Monoxide through their leaves.', image: '/plants/peace_lily.png', video: 'https://cdn.pixabay.com/video/2019/09/07/26637-360259342_large.mp4' },
    { id: 'aloe-vera', name: 'Aloe Vera', emoji: '🌵', color: '#4ade80', pm25: 10.5, co2: 2.8, benefits: ['Healing', 'Air Monitor'], description: 'Aloe Vera helps clear formaldehyde and benzene, which can be a byproduct of chemical-based cleaners and paints.', image: '/plants/aloe_vera.png', video: 'https://cdn.pixabay.com/video/2019/09/07/26637-360259342_large.mp4' },
    { id: 'spider-plant', name: 'Spider Plant', emoji: '🌱', color: '#22c55e', pm25: 14.3, co2: 3.5, benefits: ['Rapid Oxygen', 'Pet safe'], description: 'Spider plants are among the easiest to grow and are extremely effective at fighting carbon monoxide and xylene.', image: '/plants/spider_plant.png', video: 'https://cdn.pixabay.com/video/2019/09/07/26637-360259342_large.mp4' },
    { id: 'rubber-plant', name: 'Rubber Plant', emoji: '🌿', color: '#14532d', pm25: 19.8, co2: 7.2, benefits: ['Large leafy area', 'Natural toxin absorber'], description: 'With its large waxy leaves, the Rubber Plant is a heavyweight when it comes to absorbing toxins and purifying indoor air.', image: '/plants/rubber_plant.png', video: 'https://cdn.pixabay.com/video/2025/02/02/255932_large.mp4' },
    { id: 'boston-fern', name: 'Boston Fern', emoji: '🌿', color: '#166534', pm25: 13.5, co2: 4.4, benefits: ['Air humidifier', 'Formaldehyde fighter'], description: 'Boston Ferns are perfect for improving humidity and removing indoor air pollutants, especially in bathrooms and kitchens.', image: '/plants/boston_fern.png', video: 'https://cdn.pixabay.com/video/2025/02/02/255932_large.mp4' },
    { id: 'bamboo-palm', name: 'Bamboo Palm', emoji: '🎋', color: '#15803d', pm25: 25.4, co2: 12.6, benefits: ['Transpiration queen', 'Filter king'], description: 'Bamboo Palms are top-rated air purifiers that add much-needed moisture to indoor air during dry winter months.', image: '/plants/bamboo_palm.png', video: 'https://cdn.pixabay.com/video/2025/02/02/255932_large.mp4' },
];





type PlantGrowthStage = 'seed' | 'sprout' | 'sapling' | 'full';

function CropContent() {
    const searchParams = useSearchParams();
    const [started, setStarted] = useState(false);
    const [selectedPlant, setSelectedPlant] = useState<typeof PLANTS[0] | null>(null);
    const [stage, setStage] = useState<PlantGrowthStage>('seed');
    const [growing, setGrowing] = useState(false);
    const [recommendations, setRecommendations] = useState<SeedRecommendation[]>([]);
    const [currentAqi, setCurrentAqi] = useState<number | null>(null);
    const [locationName, setLocationName] = useState<string | null>(null);
    const [currentTemp, setCurrentTemp] = useState<number | null>(null);
    const [currentHum, setCurrentHum] = useState<number | null>(null);
    const [previewPlant, setPreviewPlant] = useState<typeof PLANTS[0] | null>(null);

    useEffect(() => {
        const aqiParam = searchParams.get('aqi');
        const nameParam = searchParams.get('name');
        const tempParam = searchParams.get('temp');
        const humParam = searchParams.get('hum');

        if (aqiParam) {
            const aqi = parseInt(aqiParam);
            const temp = tempParam ? parseInt(tempParam) : undefined;
            const hum = humParam ? parseInt(humParam) : undefined;

            setCurrentAqi(aqi);
            if (temp !== undefined) setCurrentTemp(temp);
            if (hum !== undefined) setCurrentHum(hum);

            setRecommendations(getSeedRecommendations(aqi, temp, hum));
            if (nameParam) setLocationName(nameParam);
            setStarted(true); // Automatically show selection if coming from map
        }
    }, [searchParams]);

    const startGrowing = async () => {
        setGrowing(true);
        const stages: PlantGrowthStage[] = ['seed', 'sprout', 'sapling', 'full'];
        for (let i = 1; i < stages.length; i++) {
            await new Promise(r => setTimeout(r, 1000));
            setStage(stages[i]);
        }
        setGrowing(false);
    };

    const choosePlant = (plant: typeof PLANTS[0] | SeedRecommendation) => {
        // Find full plant data if it's a recommendation
        const fullPlant = PLANTS.find(p => p.id === plant.id) || {
            id: plant.id,
            name: plant.name,
            emoji: '🌱',
            color: '#34d399',
            pm25: 15.0,
            co2: 5.0,
            benefits: ['AI Recommended', 'Air Purifying'],
            description: (plant as SeedRecommendation).reason || 'Recommended plant for your current environment.'
        };

        setSelectedPlant(fullPlant);
        setStage('seed');
        startGrowing();
    };

    const reset = () => {
        setStarted(false);
        setSelectedPlant(null);
        setStage('seed');
    };

    const aqiLevel = currentAqi ? getAqiLevel(currentAqi) : null;

    return (
        <div className={styles.page}>
            <div className={styles.bg}>
                <video 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    className={styles.bgVideo}
                    src="https://cdn.pixabay.com/video/2017/06/02/9491-220088147_large.mp4"
                />
                <div className={styles.videoOverlay} />
                <div className={styles.orb1} />
                <div className={styles.orb2} />
            </div>
            <div className={styles.inner}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerIcon}>
                        <Leaf size={28} color="#34d399" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className={styles.pageTitle}>Agriculture AI</h1>
                        <p className={styles.pageSubtitle}>Seed recommendation based on air quality</p>
                    </div>
                </div>

                {/* Step 1: Call to Action */}
                {!started && (
                    <div className={styles.ctaSection}>
                        <div className={styles.ctaCard}>
                            <div className={styles.ctaEmoji}>🌍</div>
                            <h2 className={styles.ctaTitle}>Do you want to save your area by planting?</h2>
                            <p className={styles.ctaDesc}>
                                Every plant you grow Virtually represents a real action. Use our 3D AI Generator to find the best seeds
                                for your current air quality conditions.
                            </p>

                            <button className={styles.ctaBtn} onClick={() => setStarted(true)} id="start-planting-btn">
                                Let's Plant Together! <ArrowRight size={18} />
                            </button>
                        </div>

                        <div className={styles.encyclopedia}>
                            <div className={styles.encyclopediaHeader}>
                                <h2 className={styles.encyclopediaTitle}>Pollution Fighters</h2>
                                <p className={styles.encyclopediaSubtitle}>Discover nature's most powerful air purifiers and their unique biological capabilities</p>
                            </div>

                            <div className={styles.encyclopediaGrid}>
                                {PLANTS.map((plant) => (
                                    <div key={plant.id} className={styles.encyclopediaCard}>
                                        <div className={styles.encyclopediaTop}>
                                            <div className={styles.encyclopediaImageWrapper} style={{ borderColor: plant.color }} onClick={(e) => { e.stopPropagation(); setPreviewPlant(plant); }}>
                                                <img src={plant.image} alt={plant.name} className={styles.encyclopediaImg} />
                                            </div>
                                            <h3 className={styles.encyclopediaName}>{plant.name}</h3>
                                        </div>
                                        <p className={styles.encyclopediaDesc}>{plant.description}</p>
                                        <div className={styles.encyclopediaStats}>
                                            <div className={styles.encyclopediaStat}>
                                                <span className={styles.statLabel}>PM2.5 Absorb</span>
                                                <span className={styles.statValue} style={{ color: plant.color }}>{plant.pm25} µg/m³</span>
                                            </div>
                                            <div className={styles.encyclopediaStat}>
                                                <span className={styles.statLabel}>CO₂ Storage</span>
                                                <span className={styles.statValue} style={{ color: plant.color }}>{plant.co2}kg/yr</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* Step 2: Plant Selection & AI Recommendations */}
                {started && !selectedPlant && (
                    <div className={styles.plantSelection}>
                        {currentAqi && (
                            <div className={styles.aiDashboard}>
                                <div className={styles.aiHeader}>
                                    <Sparkles size={20} color="#a78bfa" />
                                    <h3>AI Recommendation for {locationName || 'your area'}</h3>
                                </div>
                                <div className={styles.aqiSummary} style={{ background: aqiLevel?.bg }}>
                                    <div className={styles.aqiPrimary}>
                                        <span className={styles.aqiVal} style={{ color: aqiLevel?.color }}>AQI {currentAqi}</span>
                                        <span className={styles.aqiStatus}>Status: {aqiLevel?.label}</span>
                                    </div>
                                    {(currentTemp !== null || currentHum !== null) && (
                                        <div className={styles.envSecondary}>
                                            {currentTemp !== null && <span>🌡️ {currentTemp}°C</span>}
                                            {currentHum !== null && <span>💧 {currentHum}% Hum</span>}
                                        </div>
                                    )}
                                </div>

                                <div className={styles.recommendationGrid}>
                                    {recommendations.map(rec => (
                                        <div key={rec.id} className={styles.recCard} onClick={() => choosePlant(rec)}>
                                            <div className={styles.recHeader}>
                                                <span className={styles.recName}>{rec.name}</span>
                                                <span className={`${styles.suitability} ${styles['suit' + rec.suitability]}`}>
                                                    {rec.suitability} Suitability
                                                </span>
                                            </div>
                                            <p className={styles.recReason}>{rec.reason}</p>
                                            <button className={styles.plantRecBtn}>Plant Seed</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <h2 className={styles.sectionTitle}>{currentAqi ? 'All Available Plants' : 'Choose your plant'}</h2>
                        <div className={styles.plantGrid}>
                            {PLANTS.map(plant => (
                                <button
                                    key={plant.id}
                                    id={`plant-${plant.id}`}
                                    className={styles.plantCard}
                                    onClick={() => choosePlant(plant)}
                                    style={{ '--plant-color': plant.color } as React.CSSProperties}
                                >
                                    <div className={styles.plantImageContainer} onClick={(e) => { e.stopPropagation(); setPreviewPlant(plant); }}>
                                        <img src={plant.image} alt={plant.name} className={styles.plantInnerImg} />
                                    </div>
                                    <h3 className={styles.plantName}>{plant.name}</h3>
                                    <div className={styles.plantStat}>
                                        <span>🌫️ PM2.5: <strong style={{ color: plant.color }}>{plant.pm25}</strong></span>
                                        <span>🌱 CO₂: <strong style={{ color: plant.color }}>{plant.co2}</strong></span>
                                    </div>
                                    <div className={styles.plantCta}>Plant this <ArrowRight size={14} /></div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}


                {/* Step 3: Growing Animation + Results */}
                {selectedPlant && (
                    <div className={styles.growingSection}>
                        <div className={styles.growingCard}>
                                <div className={styles.gardenBox}>
                                    <div className={styles.pot3d}>
                                        <img src="/3d/pot.png" alt="3d pot" className={styles.potImg} />
                                    </div>
                                    <div className={styles.plantAnim3d}>
                                        {stage === 'seed' && <img src="/3d/seed.png" alt="seed" className={styles.growthImg3d} style={{ filter: `drop-shadow(0 0 10px ${selectedPlant.color}44)` }} />}
                                        {stage === 'sprout' && <img src="/3d/sprout.png" alt="sprout" className={styles.growthImg3d} style={{ filter: `drop-shadow(0 0 15px ${selectedPlant.color}66)` }} />}
                                        {stage === 'sapling' && <img src="/3d/sapling.png" alt="sapling" className={styles.growthImg3d} style={{ filter: `drop-shadow(0 0 20px ${selectedPlant.color}88)` }} />}
                                        {stage === 'full' && (
                                            <div className={styles.fullPlant3d}>
                                                <video 
                                                    autoPlay 
                                                    muted 
                                                    loop 
                                                    playsInline 
                                                    className={styles.fullVideo3d}
                                                    src={selectedPlant.video}
                                                    style={{ borderColor: selectedPlant.color }}
                                                />
                                                <div className={styles.sparkles}>
                                                    <Sparkles size={24} color={selectedPlant.color} className={styles.sparkle1} />
                                                    <Sparkles size={18} color="#34d399" className={styles.sparkle2} />
                                                    <Sparkles size={20} color="#6ee7b7" className={styles.sparkle3} />
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                                {stage === 'full' && (
                                    <div className={styles.absorbing}>
                                        {['💨', '🌫️', '☁️'].map((e, i) => (
                                            <div key={i} className={styles.absorbParticle} style={{ animationDelay: `${i * 0.4}s` }}>{e}</div>
                                        ))}
                                    </div>
                                )}


                            <div className={styles.stageLabel}>
                                {growing
                                    ? `🌱 Growing... (${stage})`
                                    : `✅ ${selectedPlant.name} fully grown!`}
                            </div>

                            {stage === 'full' && (
                                <div className={styles.metrics}>
                                    <div className={styles.metricCard}>
                                        <span className={styles.metricIcon}>🌫️</span>
                                        <span className={styles.metricValue} style={{ color: selectedPlant.color }}>{selectedPlant.pm25} µg/m³</span>
                                        <span className={styles.metricLabel}>PM2.5 absorbed/day</span>
                                    </div>
                                    <div className={styles.metricCard}>
                                        <span className={styles.metricIcon}>🌿</span>
                                        <span className={styles.metricValue} style={{ color: selectedPlant.color }}>{selectedPlant.co2} kg</span>
                                        <span className={styles.metricLabel}>CO₂ absorbed/year</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {stage === 'full' && (
                            <div className={styles.benefitsCard}>
                                <h3 className={styles.benefitsTitle}>About {selectedPlant.name}</h3>
                                <p className={styles.benefitsDesc}>{selectedPlant.description}</p>
                                <div className={styles.benefitsList}>
                                    {selectedPlant.benefits.map((b, i) => (
                                        <div key={i} className={styles.benefitItem}>
                                            <span style={{ color: selectedPlant.color }}>✓</span>
                                            {b}
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.actionBtns}>
                                    <button className={styles.newPlantBtn} onClick={() => { setSelectedPlant(null); setStage('seed'); }} id="plant-another-btn">
                                        🌱 Plant Another
                                    </button>
                                    <button className={styles.resetBtn} onClick={reset} id="reset-btn">
                                        Start Over
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {/* Preview Modal */}
                {previewPlant && (
                    <div className={styles.modalOverlay} onClick={() => setPreviewPlant(null)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <button className={styles.modalClose} onClick={() => setPreviewPlant(null)}>
                                <X size={24} />
                            </button>
                            <div className={styles.modalImageWrapper}>
                                <img src={previewPlant.image} alt={previewPlant.name} className={styles.modalImg} />
                                <div className={styles.modalLabel}>
                                    <h2 className={styles.modalTitle}>{previewPlant.name}</h2>
                                    <p className={styles.modalSubtitle}>{previewPlant.emoji} Premium Species</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CropPage() {
    return (
        <Suspense fallback={<div>Loading Agriculture AI...</div>}>
            <CropContent />
        </Suspense>
    );
}
