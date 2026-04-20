import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Fallback logic in case AI fails or key is missing
function buildFallbackAnalysis(body: any): SkinAnalysisResult {
  const {
    gender, age, skinType, problems = [],
    aqi = 0, pm25 = 0, uvIndex = 0, windSpeed = 0, humidity = 50, temp = 25,
    locationName = 'your location',
  } = body;

  const ageNum = parseInt(age) || 25;
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

  if (aqi > 100) issues.push(`Pollution particle deposits on skin (AQI: ${aqi})`);
  if (uvIndex > 6) issues.push(`UV-induced oxidative stress (UV Index: ${uvIndex}/11)`);

  if (issues.length === 0) issues.push('Skin appears healthy based on profile');

  let severityScore = 0;
  if (problems.includes('Acne / Pimples')) severityScore += 2;
  if (problems.includes('Dark Spots')) severityScore += 1;
  if (aqi > 100) severityScore += 1;

  const severity = severityScore >= 5 ? 'severe' : severityScore >= 3 ? 'moderate' : 'mild';

  return {
    valid_image: true,
    skin_type: skinType || 'Combination',
    issues_detected: issues,
    severity,
    environment_impact: `Current conditions in ${locationName} (AQI ${aqi}) may affect your skin barrier.`,
    recommendations: {
      morning_routine: ['Cleanse', 'Antioxidant Serum', 'SPF 50 (Crucial for protection)'],
      night_routine: ['Double Cleanse', 'Moisturise', 'Repair Cream'],
      ingredients: ['Niacinamide', 'Ceramides', 'Vitamin C'],
      avoid: ['Harsh scrubs', 'Alcohol-based toners'],
      lifestyle: ['Drink 3L water', 'Use mask in pollution'],
    },
    locationName, aqi, uvIndex, humidity, temp, windSpeed, pm25,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, imageMimeType, gender, age, skinType, problems, aqi, uvIndex, humidity, temp, windSpeed, pm25, locationName } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY missing, using fallback analysis');
      return NextResponse.json(buildFallbackAnalysis(body));
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        You are a premium AI Dermatologist. Analyze this skin photo for a ${age} year old ${gender} who reports ${skinType} skin and concerns with: ${problems?.join(', ')}.
        Also consider the live environmental data for their location (${locationName}):
        - AQI: ${aqi} (Air Quality Index)
        - UV Index: ${uvIndex}/11
        - Humidity: ${humidity}%
        - Temperature: ${temp}°C
        - PM2.5: ${pm25} µg/m³
        
        Focus on how the environment is specifically impacting their skin issues.
        Return ONLY a JSON object with this exact structure:
        {
          "valid_image": boolean (is it a clear photo of skin/face?),
          "skin_type": "string",
          "issues_detected": ["string", "string"],
          "severity": "mild" | "moderate" | "severe",
          "environment_impact": "detailed explanation of how AQI/UV is affecting their skin right now",
          "recommendations": {
            "morning_routine": ["step 1", "step 2", "step 3", "step 4"],
            "night_routine": ["step 1", "step 2", "step 3", "step 4"],
            "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
            "avoid": ["thing 1", "thing 2"],
            "lifestyle": ["tip 1", "tip 2"]
          }
        }
        Be professional, reassuring, and technically accurate. If valid_image is false, return only valid_image: false.
      `;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageMimeType || 'image/jpeg',
          },
        },
      ]);

      const text = result.response.text();
      // Clean up markdown code blocks if AI returns them
      const jsonStr = text.replace(/```json|```/g, '').trim();
      const aiData = JSON.parse(jsonStr);

      // Merge with environmental data
      return NextResponse.json({
        ...aiData,
        locationName, aqi, uvIndex, humidity, temp, windSpeed, pm25
      });

    } catch (aiError: any) {
      console.error('Gemini AI error:', aiError);
      // If AI fails (e.g. quota), use fallback
      return NextResponse.json(buildFallbackAnalysis(body));
    }

  } catch (error: any) {
    console.error('[skin-analyze] Route error:', error);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
