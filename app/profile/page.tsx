"use client";

import { Bell, Shield, Settings, LogOut, User as UserIcon, Heart, Sparkles, MapPin, RefreshCw } from 'lucide-react';
import styles from './profile.module.css';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAllData, getAqiLevel } from '@/lib/api';

export default function ProfilePage() {
    const { user, loading, logout, switchAccount } = useAuth();
    const router = useRouter();
    const [currentLoc, setCurrentLoc] = useState<any>(null);
    const [locLoading, setLocLoading] = useState(true);
    const [alertSent, setAlertSent] = useState(false);
    const [alertSending, setAlertSending] = useState(false);
    const [alertError, setAlertError] = useState(false);
    const [testMailUrl, setTestMailUrl] = useState<string | null>(null);

    // Auto-fire real email exactly once per session if AQI > 50
    useEffect(() => {
        if (currentLoc && currentLoc.aqi > 50 && user?.email_or_phone && !alertSent && !alertSending && !alertError) {
            setAlertSending(true);
            
            fetch('/api/send-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: user.email_or_phone, 
                    aqi: currentLoc.aqi,
                    location: currentLoc.displayName
                })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    setAlertSent(true);
                    if (data.testUrl) {
                        setTestMailUrl(data.testUrl);
                    }
                } else {
                    console.error("Mail backend failure (Check .env configs):", data.message);
                    setAlertError(true);
                }
                setAlertSending(false);
            })
            .catch(err => {
                console.error("Fetch email failed:", err);
                setAlertError(true);
                setAlertSending(false);
            });
        }
    }, [currentLoc, user, alertSent, alertSending, alertError]);

    useEffect(() => {
        if (!loading && user && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const { latitude, longitude } = pos.coords;
                        let cityName = "Your Location";
                        try {
                            const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                            const revData = await revRes.json();
                            if (revData && revData.address) {
                                const ad = revData.address;
                                const localName = ad.city || ad.town || ad.village || ad.suburb || ad.neighbourhood || ad.county || ad.state_district;
                                const stateName = ad.state;
                                
                                if (localName && stateName) {
                                    cityName = `${localName}, ${stateName}`;
                                } else {
                                    cityName = localName || stateName || "Your Location";
                                }
                            }
                        } catch (e) { }

                        const data = await fetchAllData(cityName, latitude, longitude);
                        setCurrentLoc(data);
                    } catch (err) {
                        console.error(err);
                    } finally {
                        setLocLoading(false);
                    }
                },
                (err) => {
                    console.error("Location access denied", err);
                    setLocLoading(false);
                }
            );
        } else if (!loading && !user) {
            setLocLoading(false);
        }
    }, [user, loading]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (!user) {
        return null;
    }

    const userData = {
        name: user.displayName || "User",
        email: user.email || "No email",
        joinedDate: user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Recently",
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=fb7185&color=fff&size=128`
    };

    return (
        <div className={`${styles.container} container`}>
            <header className={styles.profileHeader}>
                <div className={styles.avatar}>
                    <img src={userData.photoURL} alt="Avatar" />
                </div>
                <div className={styles.profileInfo}>
                    <div className={styles.nameRow}>
                        <h1>{userData.name}</h1>
                        <span className={styles.memberBadge}>Member</span>
                    </div>
                    <p className={styles.email}>{userData.email}</p>
                    <p className={styles.memberSince}>Member since {userData.joinedDate}</p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.switchBtn} onClick={switchAccount} title="Switch Account">
                        <RefreshCw size={18} /> Switch
                    </button>
                    <button className={styles.logoutBtn} onClick={logout}>
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </header>

            <div className={styles.dashboard}>
                {/* Health Section */}
                <div className={`${styles.dashCard} glass-card`}>
                    <div className={styles.dashHeader}>
                        <Heart size={20} color="#fb7185" />
                        <h3>Health Profile</h3>
                    </div>
                    <div className={styles.cardContent}>
                        <p className={styles.emptyMsg}>No health conditions added yet.</p>
                        <button className={styles.addBtn}>+ Add Condition</button>
                    </div>
                </div>

                {/* Current Location Section */}
                <div className={`${styles.dashCard} glass-card`}>
                    <div className={styles.dashHeader}>
                        <MapPin size={20} color="#6366f1" />
                        <h3>Your Current Location</h3>
                    </div>
                    <div className={styles.cardContent}>
                        {locLoading ? (
                            <p className={styles.emptyMsg}>Locating you...</p>
                        ) : currentLoc ? (
                            <div className={styles.locationList}>
                                <div className={styles.locationItem}>
                                    <div>
                                        <p className={styles.locationName}>{currentLoc.displayName}</p>
                                        <p className={styles.locationMeta}>Lat: {currentLoc.lat.toFixed(2)}, Lng: {currentLoc.lng.toFixed(2)} • {currentLoc.aqi} AQI</p>
                                    </div>
                                    <span style={{ 
                                        backgroundColor: getAqiLevel(currentLoc.aqi).color + '20', 
                                        color: getAqiLevel(currentLoc.aqi).color,
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}>
                                        {getAqiLevel(currentLoc.aqi).label}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className={styles.emptyMsg}>Location permission denied or unavailable.</p>
                        )}
                    </div>
                </div>

                {/* Notifications/Alerts Section */}
                <div className={`${styles.dashCard} glass-card`}>
                    <div className={styles.dashHeader}>
                        <Bell size={20} color={currentLoc?.aqi > 200 ? "#ef4444" : "#f59e0b"} />
                        <h3>Alerts</h3>
                    </div>
                    <div className={styles.cardContent}>
                        {locLoading ? (
                            <p className={styles.emptyMsg}>Checking health alerts...</p>
                        ) : currentLoc ? (
                            <div className={styles.alertItem}>
                                <span className={styles.alertDot} style={{ background: currentLoc.aqi > 200 ? '#ef4444' : (currentLoc.aqi > 100 ? '#f59e0b' : '#10b981') }}></span>
                                <div style={{ flex: 1 }}>
                                    <p>
                                        <strong>{currentLoc.displayName}:</strong>{' '}
                                        {currentLoc.aqi > 200 
                                            ? `CRITICAL ALERT (AQI ${currentLoc.aqi}): Air quality is extremely hazardous! Avoid all outdoor physical activity and wear a mask if you must go outside.` 
                                            : currentLoc.aqi > 100
                                            ? `Warning (AQI ${currentLoc.aqi}): Air quality is unhealthy. Sensitive groups should reduce prolonged outdoor exertion.`
                                            : `Air quality is looking great today (${currentLoc.aqi} AQI)! Enjoy your outdoor activities.`}
                                    </p>
                                    
                                    {/* Automated Real Email Warning */}
                                    {currentLoc.aqi > 50 && (
                                        <div style={{ marginTop: '14px', background: currentLoc.aqi > 200 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: currentLoc.aqi > 200 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                <Bell size={18} />
                                                <div style={{ width: '100%' }}>
                                                    <strong style={{ fontSize: '13px', color: alertError ? '#fca5a5' : '#10b981' }}>
                                                        {alertError ? 'Automated Email Failed' : (alertSending ? 'Dispatching Email...' : 'Automated Email Dispatch Sent!')}
                                                    </strong><br/>
                                                    
                                                    {alertError ? (
                                                        <span style={{ color: '#fca5a5', display: 'inline-block', marginTop: '6px' }}>
                                                            Could not dispatch real email. Please ensure the app developers added a configured Gmail App Password to their .env file (EMAIL_USER / EMAIL_PASS).
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: currentLoc.aqi > 200 ? '#fca5a5' : '#fcd34d', display: 'inline-block', marginTop: '6px' }}>
                                                            {currentLoc.aqi > 200 ? 'CRITICAL:' : 'WARNING:'} An emergency health alert has been automatically sent to your registered inbox <strong>{user?.email_or_phone || 'email'}</strong>! Please check your mail carefully.
                                                        </span>
                                                    )}

                                                    {/* ETHEREAL INBOX PREVIEW LINK */}
                                                    {testMailUrl && !alertSending && (
                                                        <div style={{ marginTop: '10px' }}>
                                                            <a 
                                                                href={testMailUrl} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid #10b981', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}
                                                            >
                                                                View Sent Email in Live Sandbox ↗
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className={styles.emptyMsg}>Please enable location to view your alerts.</p>
                        )}
                    </div>
                </div>

                {/* Security/Access Section */}
                <div className={`${styles.dashCard} glass-card`}>
                    <div className={styles.dashHeader}>
                        <Shield size={20} color="#10b981" />
                        <h3>Account Security</h3>
                    </div>
                    <div className={styles.cardContent}>
                        <p className={styles.infoText}>Google Authentication is enabled for your account.</p>
                        <button className={styles.actionLink}>Manage Access</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
