"use client";

import { useState, useRef, useEffect } from 'react';
import {
  Upload, ChevronRight, ChevronLeft, Loader2, X, MapPin, Camera,
  Download, AlertTriangle, CheckCircle, Droplets, Wind, Thermometer, Sun,
  ShieldCheck, FlaskConical, Leaf, Moon
} from 'lucide-react';
import styles from './page.module.css';
import { fetchAllData, getAqiLevel } from '@/lib/api';
import LocationAutocomplete from '@/components/LocationAutocomplete';

const SKIN_TYPES = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'];
const SKIN_PROBLEMS = ['Acne / Pimples', 'Dark Spots', 'Redness', 'Wrinkles', 'Excess Oil', 'Dryness', 'None'];

type FormData = {
  gender: string; age: string; skinType: string; problems: string[];
  location: string;
};

type SkinAnalysisResult = {
  valid_image: boolean;
  skin_type?: string;
  issues_detected?: string[];
  severity?: string;
  environment_impact?: string;
  recommendations?: {
    morning_routine: string[];
    night_routine: string[];
    ingredients: string[];
    avoid: string[];
    lifestyle: string[];
  };
  locationName?: string;
  aqi?: number;
  uvIndex?: number;
  humidity?: number;
  temp?: number;
  windSpeed?: number;
  pm25?: number;
};

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`${styles.stepDot} ${i < step ? styles.stepDone : ''} ${i === step - 1 ? styles.stepActive : ''}`} />
      ))}
      <span className={styles.stepText}>Step {step} of {total}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cfg: Record<string, { color: string; bg: string; label: string }> = {
    mild: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Mild' },
    moderate: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Moderate' },
    severe: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Severe' },
  };
  const s = cfg[severity?.toLowerCase()] ?? cfg.mild;
  return (
    <span style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}30`, borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {s.label}
    </span>
  );
}

// Compress image aggressively — smaller = faster + fewer tokens
function compressImage(dataUrl: string, maxDim = 400, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

export default function SkinCarePage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({ gender: '', age: '', skinType: '', problems: [], location: '' });
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState('image/jpeg');
  const [analyzing, setAnalyzing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [result, setResult] = useState<SkinAnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  // Cache env data so we don't re-fetch if already loaded
  const envCacheRef = useRef<any>(null);
  const envCacheLocationRef = useRef<string>('');

  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => setRetryCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [retryCountdown]);


  const openCamera = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      alert('Camera access denied or unavailable.');
    }
  };

  const takePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL('image/jpeg', 0.8));
        setPhotoMime('image/jpeg');
      }
      closeCamera(e);
    }
  };

  const closeCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const raw = ev.target?.result as string;
      // Compress before storing — smaller payload = fewer tokens
      const compressed = await compressImage(raw);
      setPhoto(compressed);
      setPhotoMime('image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const toggleProblem = (p: string) =>
    setForm(f => ({ ...f, problems: f.problems.includes(p) ? f.problems.filter(x => x !== p) : [...f.problems, p] }));

  // Pre-fetch env data when city is selected so it's ready before Analyze is clicked
  const prefetchEnv = async (location: string) => {
    if (!location || location === envCacheLocationRef.current) return;
    try {
      const data = await fetchAllData(location);
      envCacheRef.current = data;
      envCacheLocationRef.current = location;
    } catch { /* silent — will retry on Analyze */ }
  };

  const runAnalysis = async () => {
    if (!photo || !form.location) return;
    setAnalyzing(true);
    setFetchError('');
    setRetryCountdown(0);

    try {
      setLoadingStep('📡 Fetching live air quality data...');

      // 1. Use cached env data or fetch in parallel with image prep
      const [envData, base64Result] = await Promise.all([
        envCacheRef.current && envCacheLocationRef.current === form.location
          ? Promise.resolve(envCacheRef.current)
          : fetchAllData(form.location),
        // Extract image base64 concurrently
        new Promise<{mimeType: string; imageBase64: string}>((resolve, reject) => {
          const match = photo.match(/^data:([^;]+);base64,(.+)$/);
          if (!match) return reject(new Error('Invalid image format'));
          resolve({ mimeType: match[1], imageBase64: match[2] });
        })
      ]);

      envCacheRef.current = envData;
      envCacheLocationRef.current = form.location;

      setLoadingStep('🔬 AI is analyzing your skin...');

      // 2. Call the Gemini Vision skin-analyze API
      const res = await fetch('/api/skin-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Result.imageBase64,
          imageMimeType: base64Result.mimeType,
          gender: form.gender,
          age: form.age,
          skinType: form.skinType,
          problems: form.problems,
          ...envData,
        }),
      });

      setLoadingStep('✨ Building your personalised report...');
      const data = await res.json();

      if (res.status === 429) {
        setFetchError('');
        setRetryCountdown(20);
        setAnalyzing(false);
        setLoadingStep('');
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      if (data.valid_image === false) {
        setFetchError('⚠️ No valid skin detected. Please upload a clear face photo showing your skin.');
        setAnalyzing(false);
        setLoadingStep('');
        return;
      }

      setResult(data);
      setStep(4);
    } catch (e: any) {
      setFetchError(e.message || 'Could not complete analysis. Please try again.');
    } finally {
      setAnalyzing(false);
      setLoadingStep('');
    }
  };

  const downloadReport = () => {
    if (!result) return;
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      let y = 0;
      
      // jsPDF default font (Helvetica) only supports basic Latin. 
      // This function removes emojis and converts special characters to safe versions.
      const cleanText = (str: string) => {
        if (!str) return "";
        return str
          .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F900}-\u{1F9FF}]/gu, '') // Remove emojis
          .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII
          .trim();
      };

      const drawSection = (title: string, items: string[], bgColor: [number, number, number], borderColor: [number, number, number], textColor: [number, number, number], itemColor: [number, number, number]) => {
        if (!items || items.length === 0) return;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        const maxWidth = 160;
        const processedItems = items.map(item => doc.splitTextToSize(`- ${cleanText(item)}`, maxWidth));
        const totalLines = processedItems.reduce((sum, lines) => sum + lines.length, 0);
        
        // Approximate height calculation: 10pt is ~3.5mm. With 1.2 line spacing, it's ~4.2mm per line.
        // We'll use 5mm per line for safety + 15mm for title/padding.
        const sectionHeight = 15 + (totalLines * 5) + (processedItems.length * 2);

        if (y + sectionHeight > 280) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.roundedRect(20, y, 170, sectionHeight, 3, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(title, 26, y + 9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(itemColor[0], itemColor[1], itemColor[2]);
        
        let currentY = y + 17;
        processedItems.forEach(itemLines => {
          doc.text(itemLines, 26, currentY);
          currentY += (itemLines.length * 5) + 2;
        });

        y += sectionHeight + 8;
      };

      // Header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 48, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('AI Skin Care Report', 20, 22);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 20, 34);
      doc.text(`Location: ${cleanText(result.locationName || 'N/A')}`, 20, 42);
      y = 58;

      // Summary Box
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Skin Type: ${cleanText(result.skin_type || 'N/A')}  |  Severity: ${cleanText(result.severity || 'N/A')}`, 20, y);
      y += 12;

      // Environmental Data
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, y, 170, 32, 3, 3, 'FD');
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text('Environmental Context', 26, y + 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`AQI: ${result.aqi ?? 'N/A'}  |  UV: ${result.uvIndex ?? 'N/A'}  |  Wind: ${result.windSpeed ?? 'N/A'} km/h`, 26, y + 18);
      doc.text(`Humidity: ${result.humidity ?? 'N/A'}%  |  Temp: ${result.temp ?? 'N/A'}C  |  PM2.5: ${result.pm25 ?? 'N/A'}`, 26, y + 26);
      y += 42;

      // Detected Issues
      if (result.issues_detected?.length) {
        drawSection('Detected Issues', result.issues_detected, [254, 252, 232], [254, 240, 138], [161, 98, 7], [66, 32, 6]);
      }

      // Recommendations
      const recs = result.recommendations;
      if (recs) {
        drawSection('Morning Routine', recs.morning_routine, [240, 253, 244], [187, 247, 208], [21, 128, 61], [20, 83, 45]);
        drawSection('Night Routine', recs.night_routine, [240, 253, 244], [187, 247, 208], [21, 128, 61], [20, 83, 45]);
        drawSection('Ingredients', recs.ingredients, [240, 253, 244], [187, 247, 208], [21, 128, 61], [20, 83, 45]);
        drawSection('Things to Avoid', recs.avoid, [254, 242, 242], [254, 202, 202], [185, 28, 28], [127, 29, 29]);
        drawSection('Lifestyle Tips', recs.lifestyle, [240, 249, 255], [186, 230, 253], [3, 105, 161], [12, 74, 110]);
      }

      doc.save(`SkinCare-Report-${new Date().getTime()}.pdf`);
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg}><div className={styles.orb1} /><div className={styles.orb2} /></div>

      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div className={styles.headerIcon}><Droplets size={28} color="#a78bfa" strokeWidth={1.5} /></div>
          <div>
            <h1 className={styles.pageTitle}>AI Dermatologist</h1>
            <p className={styles.pageSubtitle}>Real face analysis · Live environmental data · Personalised care</p>
          </div>
        </div>

        <div className={styles.card}>
          <StepIndicator step={step} total={4} />

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Tell us about yourself</h2>
              <p className={styles.stepDesc}>We&rsquo;ll personalise your AI skin analysis.</p>

              <div className={styles.field}>
                <label className={styles.label}>Gender</label>
                <div className={styles.optionRow}>
                  {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(g => (
                    <button key={g} id={`gender-${g}`}
                      className={`${styles.optionBtn} ${form.gender === g ? styles.optionSelected : ''}`}
                      onClick={() => setForm(f => ({ ...f, gender: g }))}>{g}</button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Age</label>
                <input id="age-input" type="number" className={styles.input} placeholder="e.g. 24"
                  min={5} max={100} value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Skin Type (self-reported)</label>
                <div className={styles.optionRow}>
                  {SKIN_TYPES.map(t => (
                    <button key={t} id={`skin-type-${t}`}
                      className={`${styles.optionBtn} ${form.skinType === t ? styles.optionSelected : ''}`}
                      onClick={() => setForm(f => ({ ...f, skinType: t }))}>{t}</button>
                  ))}
                </div>
              </div>

              <button className={styles.nextBtn}
                disabled={!form.gender || !form.age || !form.skinType}
                onClick={() => setStep(2)}>
                Continue <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Step 2: Skin Problems */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Existing skin concerns</h2>
              <p className={styles.stepDesc}>Select all that apply — the AI will verify from the image.</p>
              <div className={styles.problemGrid}>
                {SKIN_PROBLEMS.map(p => (
                  <button key={p} id={`problem-${p.replace(/\s/g, '-')}`}
                    className={`${styles.problemBtn} ${form.problems.includes(p) ? styles.problemSelected : ''}`}
                    onClick={() => toggleProblem(p)}>{p}</button>
                ))}
              </div>
              <div className={styles.navBtns}>
                <button className={styles.backBtn} onClick={() => setStep(1)}><ChevronLeft size={18} /> Back</button>
                <button className={styles.nextBtn} onClick={() => setStep(3)}>Continue <ChevronRight size={18} /></button>
              </div>
            </div>
          )}

          {/* Step 3: Location + Photo */}
          {step === 3 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Your location &amp; selfie</h2>
              <p className={styles.stepDesc}>AI will analyze your <strong>actual skin</strong> from the photo + live environmental data.</p>

              <div className={styles.field}>
                <label className={styles.label}><MapPin size={14} /> Your city / area</label>
                <LocationAutocomplete
                  id="skin-location-input"
                  value={form.location}
                  onChange={(val) => setForm(f => ({ ...f, location: val }))}
                  onSelect={(s) => {
                    setForm(f => ({ ...f, location: s.displayName }));
                    prefetchEnv(s.displayName); // start loading env data in background immediately
                  }}
                  placeholder="Search your city..."
                  className={styles.input}
                />
              </div>

              {/* AI notice */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '12px', marginBottom: '16px' }}>
                <Droplets size={16} color="#a78bfa" style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#a78bfa' }}>Gemini Vision AI</strong> will analyze your photo to detect skin type, issues, and severity — not guesswork. Please upload a clear, well-lit face photo. Blank images, objects or non-face photos will be rejected.
                </p>
              </div>

              {cameraOpen ? (
                <div className={styles.uploadArea} style={{ padding: '10px' }}>
                  <div style={{ position: 'relative', width: '100%', height: '240px', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                    <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px', width: '100%', justifyContent: 'center' }}>
                    <button onClick={takePhoto} style={{ padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Capture</button>
                    <button onClick={closeCamera} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className={styles.uploadArea} onClick={() => fileRef.current?.click()} id="photo-upload-area">
                  {photo ? (
                    <div className={styles.photoPreview}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt="Selfie preview" className={styles.previewImg} />
                      <button className={styles.removePhoto} onClick={e => { e.stopPropagation(); setPhoto(null); }}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Upload size={40} color="rgba(167,139,250,0.5)" strokeWidth={1.5} />
                        </div>
                      </div>
                      <p style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        Click to upload a face selfie
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>or</span>
                        <button onClick={openCamera} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(167,139,250,0.2)', color: '#c084fc', border: '1px solid rgba(167,139,250,0.4)', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                          <Camera size={14} /> Open Camera
                        </button>
                      </p>
                      <span>JPG, PNG, WebP — max 10MB</span>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handlePhoto} id="photo-file-input" />
                </div>
              )}

              {fetchError && (
                <div className={styles.errorMsg} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{fetchError}</span>
                </div>
              )}


              {/* Rate-limit countdown banner */}
              {retryCountdown > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px' }}>
                  <Loader2 size={18} color="#fbbf24" className={styles.spin} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>Rate limit — auto-retrying in {retryCountdown}s</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Free tier: 15 req/min. Or retry manually now.</div>
                  </div>
                  <button
                    onClick={() => { setRetryCountdown(0); runAnalysis(); }}
                    style={{ flexShrink: 0, padding: '7px 16px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)', borderRadius: '8px', color: '#fbbf24', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    Retry Now
                  </button>
                </div>
              )}

              <div className={styles.navBtns}>
                <button className={styles.backBtn} onClick={() => setStep(2)}><ChevronLeft size={18} /> Back</button>
                <button className={styles.nextBtn} onClick={runAnalysis}
                  disabled={!photo || !form.location || analyzing}>
                  {analyzing
                    ? <><Loader2 size={18} className={styles.spin} /> {loadingStep || 'AI Analyzing...'}</>
                    : retryCountdown > 0
                        ? <>Retry Now <Droplets size={18} /></>
                      : <>Analyze with AI <Droplets size={18} /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: AI Results */}
          {step === 4 && result && result.valid_image && (
            <div className={styles.stepContent}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h2 className={styles.stepTitle} style={{ margin: 0 }}>Your AI Skin Analysis</h2>
                <SeverityBadge severity={result.severity || 'mild'} />
              </div>
              <p className={styles.stepDesc}>
                Based on your <strong>face photo</strong> + live data from <strong>{result.locationName}</strong>
              </p>

              {/* Skin Type Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(192,132,252,0.08))', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '14px', marginBottom: '20px' }}>
                <Droplets size={20} color="#a78bfa" />
                <div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>AI Detected Skin Type</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', textTransform: 'capitalize' }}>{result.skin_type}</div>
                </div>
              </div>

              {/* Live Environmental Data */}
              <div className={styles.envRow}>
                {[
                  { icon: <Wind size={16} />, label: 'AQI', value: result.aqi, color: (result.aqi ?? 0) > 100 ? '#ef4444' : '#22c55e', suffix: '' },
                  { icon: <Sun size={16} />, label: 'UV Index', value: result.uvIndex, color: (result.uvIndex ?? 0) > 6 ? '#f59e0b' : '#34d399', suffix: '/11' },
                  { icon: <Droplets size={16} />, label: 'Humidity', value: result.humidity, color: '#38bdf8', suffix: '%' },
                  { icon: <Thermometer size={16} />, label: 'Temp', value: result.temp, color: '#fb923c', suffix: '°C' },
                  { icon: <Wind size={16} />, label: 'Wind', value: result.windSpeed, color: '#6ee7b7', suffix: ' km/h' },
                ].map(e => (
                  <div key={e.label} className={styles.envCard}>
                    <span style={{ color: e.color }}>{e.icon}</span>
                    <span style={{ color: e.color, fontWeight: 700 }}>{e.value}{e.suffix}</span>
                    <span>{e.label}</span>
                  </div>
                ))}
              </div>

              <p className={styles.dataNote}>📡 Live data · {new Date().toLocaleTimeString()}</p>

              {/* Issues Detected */}
              {result.issues_detected && result.issues_detected.length > 0 && (
                <div className={styles.detectedSection}>
                  <h3>🔍 AI Detected Issues</h3>
                  <ul className={styles.detectedList}>
                    {result.issues_detected.map((d, i) => (
                      <li key={i} className={styles.detectedItem}>
                        <span className={styles.detectedDot} />{d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Environment Impact */}
              {result.environment_impact && (
                <div style={{ padding: '16px 18px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '14px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Leaf size={16} color="#38bdf8" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Environmental Impact</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>{result.environment_impact}</p>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && (
                <div className={styles.adviceSection}>
                  <h3>💆 Personalised Recommendations</h3>

                  {/* Morning & Night Routines */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    {/* Morning */}
                    <div style={{ padding: '14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#fbbf24', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        ☀️ Morning Routine
                      </div>
                      <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {result.recommendations.morning_routine.map((step, i) => (
                          <li key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{step}</li>
                        ))}
                      </ol>
                    </div>
                    {/* Night */}
                    <div style={{ padding: '14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#818cf8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        <Moon size={14} /> Night Routine
                      </div>
                      <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {result.recommendations.night_routine.map((step, i) => (
                          <li key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div style={{ padding: '14px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#4ade80', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      <FlaskConical size={14} /> Recommended Ingredients
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {result.recommendations.ingredients.map((ing, i) => (
                        <span key={i} style={{ padding: '5px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '20px', fontSize: '12px', color: '#86efac' }}>{ing}</span>
                      ))}
                    </div>
                  </div>

                  {/* Avoid */}
                  <div style={{ padding: '14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#f87171', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      <AlertTriangle size={14} /> Things to Avoid
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {result.recommendations.avoid.map((item, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                          <X size={14} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />{item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Lifestyle */}
                  <div style={{ padding: '14px', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#c084fc', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      <ShieldCheck size={14} /> Lifestyle Tips
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {result.recommendations.lifestyle.map((tip, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                          <CheckCircle size={14} color="#a78bfa" style={{ flexShrink: 0, marginTop: 2 }} />{tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button className={styles.nextBtn} onClick={downloadReport} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Download size={16} /> Download PDF Report
                </button>
                <button className={styles.nextBtn} style={{ flex: 1 }} onClick={() => {
                  setStep(1); setForm({ gender: '', age: '', skinType: '', problems: [], location: '' });
                  setPhoto(null); setResult(null); setFetchError('');
                }}>
                  New Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
