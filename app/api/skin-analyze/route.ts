import { NextRequest, NextResponse } from 'next/server';

export interface SkinAnalysisResult {
  valid_image: boolean;
  skin_type: string;
  issues_detected: string[];
  severity: string;
  environment_impact: string;
  recommendations: {
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
}

function buildAnalysis(body: any): SkinAnalysisResult {
  const {
    gender, age, skinType, problems = [],
    aqi = 0, pm25 = 0, uvIndex = 0, windSpeed = 0, humidity = 50, temp = 25,
    locationName = 'your location',
  } = body;

  const ageNum = parseInt(age) || 25;

  // ── Detected Issues ─────────────────────────────────────────────
  const issues: string[] = [];

  if (skinType === 'Oily' || problems.includes('Acne / Pimples'))
    issues.push('Excess sebum production & pore congestion');
  if (skinType === 'Dry' || problems.includes('Dryness'))
    issues.push('Low moisture retention & compromised skin barrier');
  if (problems.includes('Dark Spots'))
    issues.push('Hyperpigmentation & uneven skin tone');
  if (problems.includes('Redness'))
    issues.push('Skin sensitivity & inflammation');
  if (problems.includes('Wrinkles') || ageNum > 35)
    issues.push('Fine lines & early photoaging signs');
  if (problems.includes('Excess Oil'))
    issues.push('Overactive sebaceous glands');
  if (aqi > 100)
    issues.push(`Pollution particle deposits on skin (AQI: ${aqi})`);
  if (uvIndex > 6)
    issues.push(`UV-induced oxidative stress (UV Index: ${uvIndex}/11)`);
  if (pm25 > 25)
    issues.push(`High PM2.5 (${pm25} µg/m³) weakening skin barrier`);
  if (humidity < 35)
    issues.push(`Dehydration risk from low humidity (${humidity}%)`);

  if (issues.length === 0)
    issues.push('Skin appears healthy based on your profile & current environment');

  // ── Severity ─────────────────────────────────────────────────────
  let severityScore = 0;
  if (problems.includes('Acne / Pimples')) severityScore += 2;
  if (problems.includes('Dark Spots')) severityScore += 1;
  if (problems.includes('Redness')) severityScore += 1;
  if (aqi > 150) severityScore += 2;
  else if (aqi > 100) severityScore += 1;
  if (uvIndex > 8) severityScore += 2;
  else if (uvIndex > 5) severityScore += 1;
  if (pm25 > 35) severityScore += 1;

  const severity = severityScore >= 5 ? 'severe' : severityScore >= 3 ? 'moderate' : 'mild';

  // ── Environment Impact ───────────────────────────────────────────
  const envParts: string[] = [];
  if (aqi > 100)
    envParts.push(`The AQI of ${aqi} in ${locationName} is unhealthy — fine particles settle on skin, clogging pores and triggering inflammation.`);
  else if (aqi > 50)
    envParts.push(`Moderate air quality (AQI ${aqi}) means some particulate exposure; regular cleansing is essential.`);
  if (uvIndex > 6)
    envParts.push(`UV Index ${uvIndex} is high — accelerates collagen breakdown and can worsen pigmentation within hours of exposure.`);
  if (humidity < 40)
    envParts.push(`Low humidity (${humidity}%) pulls moisture from skin, causing tightness and flaking.`);
  else if (humidity > 75)
    envParts.push(`High humidity (${humidity}%) promotes excess oil and may trigger fungal issues on sensitive skin.`);
  if (temp > 35)
    envParts.push(`High temperature (${temp}°C) increases sweat and oil production, worsening acne-prone skin.`);
  if (windSpeed > 20)
    envParts.push(`Strong wind (${windSpeed} km/h) strips the skin's moisture layer — use a barrier cream.`);

  const environment_impact = envParts.length > 0
    ? envParts.slice(0, 2).join(' ')
    : `Current conditions in ${locationName} are relatively skin-friendly. Maintain your routine consistently.`;

  // ── Morning Routine ──────────────────────────────────────────────
  const morning: string[] = [];

  if (skinType === 'Oily' || problems.includes('Acne / Pimples'))
    morning.push('Step 1: Gel-based salicylic acid (BHA) cleanser — removes overnight oil buildup');
  else if (skinType === 'Dry')
    morning.push('Step 1: Gentle cream or milk cleanser — preserves natural moisture');
  else
    morning.push('Step 1: Gentle foaming cleanser — removes overnight impurities');

  morning.push('Step 2: Alcohol-free toner — restores skin pH after cleansing');

  if (aqi > 100 || uvIndex > 5)
    morning.push('Step 3: Vitamin C serum (10–15%) — antioxidant shield against UV & pollution');
  else if (humidity < 40)
    morning.push('Step 3: Hyaluronic acid serum — boosts hydration in dry conditions');
  else
    morning.push('Step 3: Niacinamide serum — reduces pores and balances oil');

  if (skinType === 'Oily')
    morning.push('Step 4: Oil-free gel moisturiser + SPF 50+ sunscreen (non-comedogenic)');
  else
    morning.push('Step 4: Lightweight moisturiser + SPF 50+ broad-spectrum sunscreen');

  // ── Night Routine ────────────────────────────────────────────────
  const night: string[] = [];

  if (aqi > 80)
    night.push('Step 1: Double cleanse — oil cleanser first to remove pollution particles, then gentle cleanser');
  else
    night.push('Step 1: Gentle cleanser — removes makeup, sunscreen and daily grime');

  if (problems.includes('Dark Spots'))
    night.push('Step 2: Niacinamide 10% serum — fades hyperpigmentation overnight');
  else if (skinType === 'Dry')
    night.push('Step 2: Hyaluronic acid + ceramide serum — deep hydration repair');
  else
    night.push('Step 2: Retinol 0.25–0.5% (2–3× weekly) — boosts cell turnover');

  if (problems.includes('Acne / Pimples'))
    night.push('Step 3: Benzoyl peroxide spot treatment on active breakouts only');
  else
    night.push('Step 3: Nourishing face oil or sleeping mask — locks in moisture');

  if (skinType === 'Dry' || humidity < 40)
    night.push('Step 4: Thick ceramide night cream — rebuilds skin barrier while you sleep');
  else
    night.push('Step 4: Lightweight gel night moisturiser — non-comedogenic repair');

  // ── Ingredients ──────────────────────────────────────────────────
  const ingredients: string[] = [];
  if (uvIndex > 5 || aqi > 100)
    ingredients.push('Vitamin C (L-ascorbic acid) — neutralises free radicals from UV & pollution');
  if (skinType === 'Oily' || problems.includes('Acne / Pimples'))
    ingredients.push('Salicylic acid (BHA 2%) — unclogs pores and reduces acne');
  if (skinType === 'Dry' || humidity < 40)
    ingredients.push('Hyaluronic acid — draws moisture into skin cells');
  if (problems.includes('Dark Spots'))
    ingredients.push('Niacinamide 10% — reduces melanin transfer and fades dark spots');
  if (ageNum > 30 || problems.includes('Wrinkles'))
    ingredients.push('Retinol 0.3% — stimulates collagen and reduces fine lines');
  ingredients.push('Ceramides — repair and strengthen the skin barrier');
  if (aqi > 80)
    ingredients.push('Zinc oxide (in SPF) — physical UV blocker that also soothes irritated skin');

  // ── Avoid ─────────────────────────────────────────────────────────
  const avoid: string[] = ['Alcohol-based toners — strip natural oils and damage the microbiome'];
  if (skinType === 'Oily' || problems.includes('Acne / Pimples'))
    avoid.push('Heavy oil-based creams & comedogenic ingredients (coconut oil, lanolin)');
  if (aqi > 100)
    avoid.push('Skipping cleansing after outdoor exposure — pollution particles cause oxidative damage');
  if (uvIndex > 5)
    avoid.push('Going outdoors between 10am–4pm without SPF 50+ — peak UV hours');
  avoid.push('Harsh physical scrubs — micro-tears worsen sensitivity and pigmentation');
  if (problems.includes('Redness'))
    avoid.push('Fragranced products and essential oils — common irritants for sensitive skin');

  // ── Lifestyle ─────────────────────────────────────────────────────
  const lifestyle: string[] = [];
  if (aqi > 100)
    lifestyle.push(`🌿 Air quality is ${aqi} AQI — wear a mask outdoors and keep windows closed during peak pollution hours`);
  if (uvIndex > 6)
    lifestyle.push(`☀️ UV Index is ${uvIndex} — apply SPF 50+ every 2 hours outdoors; seek shade between 11am–3pm`);
  lifestyle.push('💧 Drink 2.5–3 litres of water daily — internal hydration directly improves skin elasticity');
  lifestyle.push('😴 7–9 hours of sleep — skin cell regeneration peaks between 10pm–2am');
  if (temp > 33)
    lifestyle.push(`🌡️ Temperature is ${temp}°C — shower with cool water to prevent pore dilation and excess oil`);
  if (humidity < 40)
    lifestyle.push(`💦 Indoor humidity is low — use a humidifier at home to prevent moisture loss from skin`);
  lifestyle.push('🥗 Include omega-3 foods (fish, walnuts, flaxseed) — reduce skin inflammation from within');

  return {
    valid_image: true,
    skin_type: skinType || 'Combination',
    issues_detected: issues,
    severity,
    environment_impact,
    recommendations: {
      morning_routine: morning,
      night_routine: night,
      ingredients: ingredients.slice(0, 5),
      avoid: avoid.slice(0, 4),
      lifestyle: lifestyle.slice(0, 5),
    },
    locationName,
    aqi,
    uvIndex,
    humidity,
    temp,
    windSpeed,
    pm25,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation — require at least skin type or location
    const { skinType, locationName, imageBase64 } = body;
    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check image is not a blank/tiny file (basic validation)
    if (imageBase64.length < 1000) {
      return NextResponse.json({
        valid_image: false,
      });
    }

    const result = buildAnalysis(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[skin-analyze] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
