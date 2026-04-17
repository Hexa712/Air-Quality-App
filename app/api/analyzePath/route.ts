import { NextRequest, NextResponse } from 'next/server';

interface JourneyLeg {
    legNumber: number;
    from: string;
    to: string;
    transportMode: 'car' | 'train' | 'bus' | 'flight' | 'ship';
    distance?: number;
    estimatedTime: string;
    description: string;
    reason: string;
    cost: 'low' | 'medium' | 'high';
    difficulty: 'easy' | 'moderate' | 'difficult';
}

interface RouteAnalysis {
    directRoadPossible: boolean;
    reason: string;
    obstacle?: string;
    distance: number;
}

interface TravelPlan {
    source: string;
    destination: string;
    routeAnalysis: RouteAnalysis;
    fasterRoute: JourneyLeg[];
    cheaperRoute: JourneyLeg[];
    scenicRoute: JourneyLeg[];
    recommendedRoute: JourneyLeg[];
    totalDistance: number;
    estimatedTime: string;
}

async function fetchWithTimeout(url: string, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timeoutId);
    }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

interface CountryData {
    country: string;
    lat: number;
    lon: number;
}

async function getCountryFromCoords(lat: number, lon: number): Promise<string> {
    try {
        const res = await fetchWithTimeout(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            3000
        );
        if (!res.ok) return 'Unknown';
        const data = await res.json();
        return data.address?.country || 'Unknown';
    } catch {
        return 'Unknown';
    }
}

const borderCountries: { [key: string]: string[] } = {
    'India': ['Pakistan', 'Bangladesh', 'Nepal', 'Bhutan', 'Myanmar', 'Sri Lanka'],
    'Pakistan': ['India', 'Afghanistan', 'Iran', 'China'],
    'Bangladesh': ['India', 'Myanmar'],
    'Nepal': ['India', 'China', 'Tibet'],
    'Bhutan': ['India', 'China'],
    'Myanmar': ['India', 'Bangladesh', 'China', 'Laos', 'Thailand'],
    'Sri Lanka': ['India'],
    'Afghanistan': ['Pakistan', 'Iran', 'Tajikistan', 'Uzbekistan', 'Turkmenistan', 'China'],
    'Iran': ['Pakistan', 'Afghanistan', 'Turkey', 'Iraq', 'Azerbaijan'],
    'United Arab Emirates': ['Saudi Arabia', 'Oman'],
    'Saudi Arabia': ['Jordan', 'Iraq', 'Kuwait', 'Qatar', 'United Arab Emirates', 'Oman', 'Yemen'],
    'Thailand': ['Myanmar', 'Laos', 'Cambodia', 'Malaysia'],
    'Malaysia': ['Thailand', 'Brunei', 'Indonesia'],
    'Indonesia': ['Malaysia', 'Timor-Leste', 'Papua New Guinea'],
    'China': ['Russia', 'Mongolia', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Afghanistan', 'Pakistan', 'India', 'Nepal', 'Bhutan', 'Myanmar', 'Laos', 'Vietnam', 'North Korea', 'South Korea (maritime)'],
};

function areCountriesNeighbors(country1: string, country2: string): boolean {
    const c1 = country1.toLowerCase();
    const c2 = country2.toLowerCase();

    for (const [main, neighbors] of Object.entries(borderCountries)) {
        if (main.toLowerCase() === c1) {
            return neighbors.some(n => n.toLowerCase().includes(c2));
        }
    }
    return false;
}

function analyzeRoute(
    distance: number,
    country1: string,
    country2: string
): RouteAnalysis {
    // Same country
    if (country1.toLowerCase() === country2.toLowerCase()) {
        if (distance < 2000) {
            return {
                directRoadPossible: true,
                reason: `Direct road travel is possible. Both locations are in ${country1}.`,
                distance
            };
        }
    }

    // Neighboring countries
    if (areCountriesNeighbors(country1, country2)) {
        return {
            directRoadPossible: true,
            reason: `Direct road via land border is possible. ${country1} and ${country2} share a border.`,
            distance
        };
    }

    // Sea / Multiple countries
    let obstacle = 'Ocean/Sea';
    if (distance > 1000 && !areCountriesNeighbors(country1, country2)) {
        obstacle = 'Multiple countries/International borders/Ocean';
    }

    return {
        directRoadPossible: false,
        obstacle,
        reason: `Direct road travel is NOT possible. ${obstacle} between ${country1} and ${country2}.`,
        distance
    };
}

function generateJourneyPlans(source: string, dest: string, distance: number, directPossible: boolean): {
    faster: JourneyLeg[];
    cheaper: JourneyLeg[];
    scenic: JourneyLeg[];
} {
    // Short direct distance - all routes by car/road
    if (directPossible && distance < 500) {
        const route: JourneyLeg = {
            legNumber: 1,
            from: source,
            to: dest,
            transportMode: 'car',
            distance,
            estimatedTime: `${Math.ceil(distance / 70)}h`,
            description: `Drive directly from ${source} to ${dest}`,
            reason: 'Direct road connection available for short distance.',
            cost: 'low',
            difficulty: 'easy'
        };
        return { faster: [route], cheaper: [route], scenic: [route] };
    }

    // Medium distance same country - car or train
    if (directPossible && distance >= 500 && distance < 1500) {
        const carRoute: JourneyLeg = {
            legNumber: 1,
            from: source,
            to: dest,
            transportMode: 'car',
            distance,
            estimatedTime: `${Math.ceil(distance / 80)}h`,
            description: `Drive from ${source} to ${dest}`,
            reason: 'Road network available for medium distance.',
            cost: 'medium',
            difficulty: 'moderate'
        };

        const trainRoute: JourneyLeg = {
            legNumber: 1,
            from: source,
            to: dest,
            transportMode: 'train',
            distance,
            estimatedTime: `${Math.ceil(distance / 60)}h`,
            description: `Train from ${source} to ${dest}`,
            reason: 'Scenic and comfortable for longer distances.',
            cost: 'low',
            difficulty: 'easy'
        };

        return { faster: [carRoute], cheaper: [trainRoute], scenic: [trainRoute] };
    }

    // International or long distance - flight preferred for speed
    const flightRoute: JourneyLeg = {
        legNumber: 1,
        from: source,
        to: dest,
        transportMode: 'flight',
        distance,
        estimatedTime: `${Math.ceil(distance / 900)}h (+ transfers)`,
        description: `Flight from ${source} to ${dest}`,
        reason: 'Fastest option for long-distance international travel.',
        cost: 'high',
        difficulty: 'easy'
    };

    // Cheaper multi-leg options
    const cheaperLegs: JourneyLeg[] = [
        {
            legNumber: 1,
            from: source,
            to: 'Nearest Major City',
            transportMode: 'bus',
            distance: Math.round(distance * 0.2),
            estimatedTime: `${Math.ceil(distance * 0.2 / 60)}h`,
            description: `Bus from ${source} to nearest major transport hub`,
            reason: 'Most economical first leg.',
            cost: 'low',
            difficulty: 'easy'
        },
        {
            legNumber: 2,
            from: 'Major Hub',
            to: dest,
            transportMode: distance > 3000 ? 'flight' : 'train',
            distance: Math.round(distance * 0.8),
            estimatedTime: distance > 3000 ? `${Math.ceil(distance * 0.8 / 900)}h` : `${Math.ceil(distance * 0.8 / 60)}h`,
            description: `${distance > 3000 ? 'Flight' : 'Train'} to ${dest}`,
            reason: distance > 3000 ? 'Most economical for long distance.' : 'Scenic and budget-friendly.',
            cost: 'low',
            difficulty: 'moderate'
        }
    ];

    // Scenic option - train/ship if possible
    const scenicLegs: JourneyLeg[] = distance > 2000
        ? [
            {
                legNumber: 1,
                from: source,
                to: 'Nearest Port/Station',
                transportMode: 'train',
                distance: Math.round(distance * 0.3),
                estimatedTime: `${Math.ceil(distance * 0.3 / 60)}h`,
                description: `Train to nearest port or station in ${source}`,
                reason: 'Connect to scenic long-distance transport.',
                cost: 'low',
                difficulty: 'easy'
            },
            {
                legNumber: 2,
                from: 'Port/Station',
                to: dest,
                transportMode: 'ship',
                distance: Math.round(distance * 0.7),
                estimatedTime: distance > 3000 ? '5-8 days' : `${Math.ceil(distance * 0.7 / 40)}h`,
                description: `Scenic ship/cruise to ${dest}`,
                reason: 'Beautiful journey with ocean views.',
                cost: 'medium',
                difficulty: 'moderate'
            }
        ]
        : [flightRoute];

    return { faster: [flightRoute], cheaper: cheaperLegs, scenic: scenicLegs };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sourceLat, sourceLng, destLat, destLng, sourceName, destName } = body;

        if (!sourceLat || !sourceLng || !destLat || !destLng) {
            return NextResponse.json(
                { error: 'Missing coordinates' },
                { status: 400 }
            );
        }

        // Get countries
        const [sourceCountry, destCountry] = await Promise.all([
            getCountryFromCoords(sourceLat, sourceLng),
            getCountryFromCoords(destLat, destLng)
        ]);

        // Calculate distance
        const distance = calculateDistance(sourceLat, sourceLng, destLat, destLng);

        // Analyze route possibility
        const routeAnalysis = analyzeRoute(distance, sourceCountry, destCountry);

        // Generate journey plans
        const { faster: fasterRoute, cheaper: cheaperRoute, scenic: scenicRoute } = generateJourneyPlans(
            sourceName,
            destName,
            distance,
            routeAnalysis.directRoadPossible
        );

        // Recommend best route
        const recommendedRoute = routeAnalysis.directRoadPossible ? fasterRoute : cheaperRoute;

        // Calculate total time
        const getTotalTime = (legs: JourneyLeg[]): string => {
            let totalHours = 0;
            legs.forEach(leg => {
                const match = leg.estimatedTime.match(/(\d+)/);
                if (match) totalHours += parseInt(match[0]);
            });
            if (totalHours >= 24) {
                return `${Math.ceil(totalHours / 24)} days`;
            }
            return `${totalHours}h`;
        };

        const plan: TravelPlan = {
            source: sourceName,
            destination: destName,
            routeAnalysis,
            fasterRoute,
            cheaperRoute,
            scenicRoute,
            recommendedRoute,
            totalDistance: distance,
            estimatedTime: getTotalTime(recommendedRoute)
        };

        console.log('[TravelPlanner] Plan generated:', { source: sourceName, dest: destName, distance, countries: { sourceCountry, destCountry } });
        return NextResponse.json(plan);
    } catch (error: any) {
        console.error('Travel planner error:', error);
        return NextResponse.json(
            { error: `Server error: ${error.message}` },
            { status: 500 }
        );
    }
}
