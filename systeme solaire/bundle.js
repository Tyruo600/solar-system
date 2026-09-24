/**
 * bundle.js
 * Version universelle autonome pour exécution locale (file:// ou http://)
 * Regroupe :
 * 1. Moteur képlérien (astronomy)
 * 2. Données physiques & orbitales (bodiesData)
 * 3. Rendu GPU des ceintures d'astéroïdes (asteroidBelt)
 * 4. API NASA JPL Small-Body Database (nasaJplApi)
 * 5. Moteur 3D Three.js (main)
 * 6. Interface HUD & télémétrie (ui)
 */

(function() {
    'use strict';

    // --- 1. ASTRONOMIE & CALCULS KÉPLÉRIENS ---
    const AU_TO_KM = 149597870.7;
    const G_SUN = 1.32712440018e11;
    const DEG2RAD = Math.PI / 180;
    const RAD2DEG = 180 / Math.PI;

    function toJulianDate(date) {
        return (date.getTime() / 86400000.0) + 2440587.5;
    }

    function fromJulianDate(jd) {
        return new Date((jd - 2440587.5) * 86400000.0);
    }

    function normalizeDeg(deg) {
        let d = deg % 360;
        if (d < 0) d += 360;
        return d;
    }

    function normalizeRad(rad) {
        const twoPi = 2 * Math.PI;
        let r = rad % twoPi;
        if (r < 0) r += twoPi;
        return r;
    }

    function solveKepler(M, e) {
        M = normalizeRad(M);
        let E = e > 0.8 ? Math.PI : M;
        const tolerance = 1e-8;
        for (let i = 0; i < 30; i++) {
            const delta = E - e * Math.sin(E) - M;
            if (Math.abs(delta) < tolerance) break;
            E = E - delta / (1 - e * Math.cos(E));
        }
        return E;
    }

    function calculateKeplerianPosition(elements, jd) {
        const a = elements.a;
        const e = elements.e;
        const iRad = elements.i * DEG2RAD;
        const omRad = (elements.om || 0) * DEG2RAD;
        const wRad = (elements.w || 0) * DEG2RAD;

        const epoch = elements.epoch || 2451545.0;
        const dt = jd - epoch;

        let n = elements.n;
        if (n === undefined || n === null) {
            const periodDays = Math.pow(Math.abs(a), 1.5) * 365.2568983;
            n = 360.0 / periodDays;
        }

        const M_deg = normalizeDeg(elements.ma + n * dt);
        const M_rad = M_deg * DEG2RAD;
        const E_rad = solveKepler(M_rad, e);

        const sinNu = (Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E_rad)) / (1 - e * Math.cos(E_rad));
        const cosNu = (Math.cos(E_rad) - e) / (1 - e * Math.cos(E_rad));
        const nuRad = Math.atan2(sinNu, cosNu);

        const r = Math.abs(a) * (1 - e * Math.cos(E_rad));

        const xPrime = r * Math.cos(nuRad);
        const yPrime = r * Math.sin(nuRad);

        const cosOm = Math.cos(omRad);
        const sinOm = Math.sin(omRad);
        const cosW = Math.cos(wRad);
        const sinW = Math.sin(wRad);
        const cosI = Math.cos(iRad);
        const sinI = Math.sin(iRad);

        const Px = cosOm * cosW - sinOm * sinW * cosI;
        const Py = sinOm * cosW + cosOm * sinW * cosI;
        const Pz = sinW * sinI;

        const Qx = -cosOm * sinW - sinOm * cosW * cosI;
        const Qy = -sinOm * sinW + cosOm * cosW * cosI;
        const Qz = cosW * sinI;

        const eclipticX = xPrime * Px + yPrime * Qx;
        const eclipticY = xPrime * Py + yPrime * Qy;
        const eclipticZ = xPrime * Pz + yPrime * Qz;

        const r_km = r * AU_TO_KM;
        const a_km = Math.abs(a) * AU_TO_KM;
        const velocityKmS = Math.sqrt(Math.max(0, G_SUN * (2.0 / r_km - 1.0 / a_km)));

        return {
            x: eclipticX,
            y: eclipticZ,
            z: eclipticY,
            r: r,
            v: velocityKmS,
            trueAnomaly: normalizeDeg(nuRad * RAD2DEG)
        };
    }

    function calculateMajorPlanetPosition(planetData, jd) {
        const T = (jd - 2451545.0) / 36525.0;

        const a = planetData.a0 + (planetData.aDot || 0) * T;
        const e = planetData.e0 + (planetData.eDot || 0) * T;
        const i = planetData.i0 + (planetData.iDot || 0) * T;
        const L = normalizeDeg(planetData.L0 + (planetData.LDot || 0) * T);
        const varpi = normalizeDeg(planetData.varpi0 + (planetData.varpiDot || 0) * T);
        const om = normalizeDeg(planetData.om0 + (planetData.omDot || 0) * T);

        const w = normalizeDeg(varpi - om);
        const ma = normalizeDeg(L - varpi);

        const elements = { a, e, i, om, w, ma, epoch: jd, n: 0 };
        return calculateKeplerianPosition(elements, jd);
    }

    function generateOrbitPath(elements, segments = 128) {
        const path = [];
        const a = elements.a;
        const e = elements.e;
        const iRad = elements.i * DEG2RAD;
        const omRad = (elements.om || 0) * DEG2RAD;
        const wRad = (elements.w || 0) * DEG2RAD;

        const cosOm = Math.cos(omRad);
        const sinOm = Math.sin(omRad);
        const cosW = Math.cos(wRad);
        const sinW = Math.sin(wRad);
        const cosI = Math.cos(iRad);
        const sinI = Math.sin(iRad);

        const Px = cosOm * cosW - sinOm * sinW * cosI;
        const Py = sinOm * cosW + cosOm * sinW * cosI;
        const Pz = sinW * sinI;

        const Qx = -cosOm * sinW - sinOm * cosW * cosI;
        const Qy = -sinOm * sinW + cosOm * cosW * cosI;
        const Qz = cosW * sinI;

        for (let s = 0; s <= segments; s++) {
            const E_rad = (s / segments) * 2 * Math.PI;
            const xPrime = a * (Math.cos(E_rad) - e);
            const yPrime = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E_rad);

            const x = xPrime * Px + yPrime * Qx;
            const y = xPrime * Py + yPrime * Qy;
            const z = xPrime * Pz + yPrime * Qz;

            path.push({ x: x, y: z, z: y });
        }
        return path;
    }

    // --- 2. DONNÉES CÉLESTES ---
    const CELESTIAL_BODIES = {
        sun: {
            id: 'sun',
            name: 'Soleil',
            latinName: 'Sol',
            type: 'star',
            typeLabel: 'Étoile (Naine Jaune G2V)',
            radiusKm: 696340,
            massKg: '1.989 × 10³⁰ kg (99.86% du système)',
            surfaceTemp: '5 500 °C (surface) / 15 000 000 °C (cœur)',
            rotationPeriodHours: 609.12,
            spectralClass: 'G2V',
            color: '#ffaa00',
            visualSizeScale: 2.4,
            description: "L'étoile au centre de notre système solaire. Elle contient 99,86 % de la masse totale du système et fournit l'énergie lumineuse et gravitationnelle qui régit tous les corps célestes.",
            elements: null
        },
        mercury: {
            id: 'mercury',
            name: 'Mercure',
            latinName: 'Mercurius',
            type: 'planet',
            typeLabel: 'Planète Tellurique',
            color: '#a8a59b',
            radiusKm: 2439.7,
            massKg: '3.301 × 10²³ kg',
            axialTiltDeg: 0.034,
            rotationPeriodHours: 1407.6,
            orbitalPeriodDays: 87.97,
            semiMajorAxisAU: 0.387,
            visualSizeScale: 0.5,
            description: "La plus petite planète du système solaire et la plus proche du Soleil. Sa surface criblée de cratères subit les écarts thermiques les plus violents du système (-180°C à +430°C).",
            a0: 0.38709893, aDot: 0.00000066,
            e0: 0.20563069, eDot: 0.00002527,
            i0: 7.00487,    iDot: -0.005947,
            L0: 252.250845, LDot: 149472.674111,
            varpi0: 77.45645, varpiDot: 0.160476,
            om0: 48.33167,  omDot: -0.125340
        },
        venus: {
            id: 'venus',
            name: 'Vénus',
            latinName: 'Venus',
            type: 'planet',
            typeLabel: 'Planète Tellurique',
            color: '#e3bb76',
            radiusKm: 6051.8,
            massKg: '4.867 × 10²⁴ kg',
            axialTiltDeg: 177.3,
            rotationPeriodHours: -5832.5,
            orbitalPeriodDays: 224.7,
            semiMajorAxisAU: 0.723,
            visualSizeScale: 0.75,
            description: "Sœur jumelle de la Terre par sa taille, mais transformée en enfer par un effet de serre cataclysmique. Sa pression au sol atteint 92 bars et sa température de surface dépasse 465°C.",
            a0: 0.72333199, aDot: 0.00000092,
            e0: 0.00677323, eDot: -0.00004938,
            i0: 3.39471,    iDot: -0.0007889,
            L0: 181.97973,  LDot: 58517.81538,
            varpi0: 131.53298, varpiDot: 0.002683,
            om0: 76.68069,  omDot: -0.277694
        },
        earth: {
            id: 'earth',
            name: 'Terre',
            latinName: 'Terra',
            type: 'planet',
            typeLabel: 'Planète Tellurique (Océan)',
            color: '#2b82c9',
            radiusKm: 6371.0,
            massKg: '5.972 × 10²⁴ kg',
            axialTiltDeg: 23.44,
            rotationPeriodHours: 23.934,
            orbitalPeriodDays: 365.256,
            semiMajorAxisAU: 1.000,
            visualSizeScale: 0.8,
            description: "Notre berceau, la seule planète connue abritant la vie. Elle possède de vastes océans d'eau liquide recouvrant 71% de sa surface et une atmosphère protectrice riche en oxygène.",
            a0: 1.00000011, aDot: -0.00000005,
            e0: 0.01671022, eDot: -0.00003804,
            i0: 0.00005,    iDot: -0.0129466,
            L0: 100.46435,  LDot: 35999.372449,
            varpi0: 102.94719, varpiDot: 0.3232736,
            om0: 0.0,       omDot: 0.0
        },
        mars: {
            id: 'mars',
            name: 'Mars',
            latinName: 'Mars',
            type: 'planet',
            typeLabel: 'Planète Tellurique (Désert)',
            color: '#c9532e',
            radiusKm: 3389.5,
            massKg: '6.417 × 10²³ kg',
            axialTiltDeg: 25.19,
            rotationPeriodHours: 24.623,
            orbitalPeriodDays: 686.98,
            semiMajorAxisAU: 1.524,
            visualSizeScale: 0.6,
            description: "La planète rouge, marquée par le mont Olympe (plus grand volcan du système solaire) et Valles Marineris. Elle abrite de la glace d'eau à ses pôles et sous son régolithe stérile.",
            a0: 1.52366231, aDot: -0.00007221,
            e0: 0.09341233, eDot: 0.00011902,
            i0: 1.85061,    iDot: -0.0004747,
            L0: 355.45332,  LDot: 19140.302684,
            varpi0: 336.04084, varpiDot: 0.4444108,
            om0: 49.57854,  omDot: -0.2949846
        },
        jupiter: {
            id: 'jupiter',
            name: 'Jupiter',
            latinName: 'Iuppiter',
            type: 'planet',
            typeLabel: 'Géante Gazeuse',
            color: '#d4a373',
            radiusKm: 69911,
            massKg: '1.898 × 10²⁷ kg (318 Terres)',
            axialTiltDeg: 3.13,
            rotationPeriodHours: 9.925,
            orbitalPeriodDays: 4332.59,
            semiMajorAxisAU: 5.204,
            visualSizeScale: 1.7,
            description: "La reine des planètes, gigantesque géante gazeuse possédant plus de 95 lunes connues, un champ magnétique colossal et la célèbre Grande Tache Rouge, tempête anticyclonique tricentenaire.",
            a0: 5.20336301, aDot: 0.00060737,
            e0: 0.04839266, eDot: -0.00012880,
            i0: 1.30530,    iDot: -0.001557,
            L0: 34.40438,   LDot: 3034.74612,
            varpi0: 14.75385, varpiDot: 0.2157529,
            om0: 100.55615, omDot: 0.2052888
        },
        saturn: {
            id: 'saturn',
            name: 'Saturne',
            latinName: 'Saturnus',
            type: 'planet',
            typeLabel: 'Géante Gazeuse aux Anneaux',
            color: '#ead6a6',
            radiusKm: 58232,
            massKg: '5.683 × 10²⁶ kg (95 Terres)',
            axialTiltDeg: 26.73,
            rotationPeriodHours: 10.656,
            orbitalPeriodDays: 10759.22,
            semiMajorAxisAU: 9.537,
            visualSizeScale: 1.5,
            rings: { inner: 1.5, outer: 2.8 },
            description: "Célèbre pour son splendide et immense système d'anneaux constitué de milliards de morceaux de glace d'eau pure et de poussières. Sa densité moyenne est inférieure à celle de l'eau.",
            a0: 9.53707032, aDot: -0.00301530,
            e0: 0.05415060, eDot: -0.00036762,
            i0: 2.48446,    iDot: 0.001936,
            L0: 49.94432,   LDot: 1222.49362,
            varpi0: 92.43194, varpiDot: -0.040599,
            om0: 113.71504, omDot: -0.2886779
        },
        uranus: {
            id: 'uranus',
            name: 'Uranus',
            latinName: 'Uranus',
            type: 'planet',
            typeLabel: 'Géante de Glaces',
            color: '#70d6ff',
            radiusKm: 25362,
            massKg: '8.681 × 10²⁵ kg (14.5 Terres)',
            axialTiltDeg: 97.77,
            rotationPeriodHours: -17.24,
            orbitalPeriodDays: 30685.4,
            semiMajorAxisAU: 19.191,
            visualSizeScale: 1.1,
            rings: { inner: 1.4, outer: 2.0 },
            description: "Une géante de glace atypique qui 'roule' sur son plan orbital avec une inclinaison axiale de près de 98°, sans doute causée par un impact titanesque au début de l'histoire du système solaire.",
            a0: 19.19126393, aDot: 0.00152025,
            e0: 0.04716771,  eDot: -0.00019150,
            i0: 0.76986,     iDot: -0.000272,
            L0: 313.23218,   LDot: 428.482027,
            varpi0: 170.96424, varpiDot: 0.4080528,
            om0: 74.22988,   omDot: 0.0424058
        },
        neptune: {
            id: 'neptune',
            name: 'Neptune',
            latinName: 'Neptunus',
            type: 'planet',
            typeLabel: 'Géante de Glaces',
            color: '#3a86ff',
            radiusKm: 24622,
            massKg: '1.024 × 10²⁶ kg (17.1 Terres)',
            axialTiltDeg: 28.32,
            rotationPeriodHours: 16.11,
            orbitalPeriodDays: 60189.0,
            semiMajorAxisAU: 30.069,
            visualSizeScale: 1.1,
            description: "La planète la plus éloignée du système solaire. Balayée par les vents les plus violents connus (plus de 2 100 km/h), elle abrite Triton, une lune capturée à l'activité cryovolcanique spectaculaire.",
            a0: 30.06896348, aDot: -0.00125196,
            e0: 0.00858587,  eDot: 0.00002510,
            i0: 1.76917,     iDot: -0.000353,
            L0: 304.88003,   LDot: 218.459453,
            varpi0: 44.97135, varpiDot: -0.3224146,
            om0: 131.72169,  omDot: -0.0059868
        },
        pluto: {
            id: 'pluto',
            name: 'Pluton',
            latinName: 'Pluto',
            type: 'dwarf_planet',
            typeLabel: 'Planète Naine (Plutino / Ceinture de Kuiper)',
            color: '#c49a6c',
            radiusKm: 1188.3,
            massKg: '1.303 × 10²² kg',
            axialTiltDeg: 122.53,
            rotationPeriodHours: -153.29,
            orbitalPeriodDays: 90560.0,
            semiMajorAxisAU: 39.48,
            visualSizeScale: 0.45,
            description: "Déclassée en planète naine en 2006 par l'UAI, la sonde New Horizons a révélé en 2015 un monde fascinant aux montagnes de glace d'eau, dunes de méthane et la plaine d'azote Spoutnik.",
            a0: 39.48168677, aDot: -0.00076912,
            e0: 0.24880766,  eDot: 0.00006465,
            i0: 17.14175,    iDot: 0.003075,
            L0: 238.92881,   LDot: 145.20780,
            varpi0: 224.06676, varpiDot: -0.040629,
            om0: 110.30347,  omDot: -0.0118348
        },
        ceres: {
            id: 'ceres',
            name: '1 Cérès',
            type: 'dwarf_planet',
            typeLabel: 'Planète Naine (Ceinture Principale)',
            color: '#9e9e9e',
            radiusKm: 473.0,
            massKg: '9.39 × 10²⁰ kg',
            orbitalPeriodDays: 1683.1,
            semiMajorAxisAU: 2.767,
            visualSizeScale: 0.35,
            description: "Le plus grand objet de la ceinture d'astéroïdes entre Mars et Jupiter. C'est un monde glacé sphérique avec des dépôts lumineux de carbonates de sodium découverts par la sonde Dawn dans le cratère Occator.",
            elements: { a: 2.767, e: 0.076, i: 10.59, om: 80.31, w: 73.10, ma: 135.0, epoch: 2459000.5 }
        },
        apophis: {
            id: 'apophis',
            name: '99942 Apophis',
            type: 'asteroid',
            typeLabel: 'Astéroïde Géocroiseur Aten (Potentiellement Dangereux - PHA)',
            color: '#ff3366',
            radiusKm: 0.170,
            orbitalPeriodDays: 323.6,
            semiMajorAxisAU: 0.922,
            visualSizeScale: 0.25,
            description: "L'un des géocroiseurs les plus surveillés. Le 13 avril 2029, il frôlera la Terre à seulement 31 600 km de sa surface (plus près que les satellites géostationnaires), visible à l'œil nu depuis l'Europe et l'Afrique !",
            elements: { a: 0.922, e: 0.191, i: 3.34, om: 204.0, w: 127.0, ma: 175.0, epoch: 2461200.5 }
        },
        bennu: {
            id: 'bennu',
            name: '101955 Bennu',
            type: 'asteroid',
            typeLabel: 'Astéroïde Géocroiseur Apollon (Mission OSIRIS-REx)',
            color: '#ff5722',
            radiusKm: 0.245,
            orbitalPeriodDays: 436.6,
            semiMajorAxisAU: 1.126,
            visualSizeScale: 0.25,
            description: "Astéroïde carboné riche en matière organique et eau piégée. La sonde NASA OSIRIS-REx s'est posée à sa surface en 2020 et a ramené avec succès des échantillons sur Terre en septembre 2023.",
            elements: { a: 1.126, e: 0.204, i: 6.03, om: 2.06, w: 66.2, ma: 101.7, epoch: 2459000.5 }
        },
        ryugu: {
            id: 'ryugu',
            name: '162173 Ryugu',
            type: 'asteroid',
            typeLabel: 'Astéroïde Géocroiseur Apollon (Mission Hayabusa2)',
            color: '#ff7043',
            radiusKm: 0.435,
            orbitalPeriodDays: 474.0,
            semiMajorAxisAU: 1.190,
            visualSizeScale: 0.25,
            description: "Astéroïde géocroiseur en forme de toupie visité par la sonde japonaise Hayabusa2. Des acides aminés et des molécules prébiotiques y ont été identifiés dans les échantillons ramenés sur Terre.",
            elements: { a: 1.190, e: 0.190, i: 5.88, om: 251.6, w: 211.4, ma: 114.2, epoch: 2459000.5 }
        },
        psyche: {
            id: 'psyche',
            name: '16 Psyché',
            type: 'asteroid',
            typeLabel: 'Astéroïde Métallique M-type (Mission NASA Psyche)',
            color: '#ffd700',
            radiusKm: 113.0,
            orbitalPeriodDays: 1822.0,
            semiMajorAxisAU: 2.924,
            visualSizeScale: 0.25,
            description: "Astéroïde métallique unique composé principalement de fer et de nickel, probablement le vestige du noyau d'un embryon planétaire détruit lors d'une collision primitive. La sonde spatiale NASA Psyche est en route pour l'étudier.",
            elements: { a: 2.924, e: 0.134, i: 3.09, om: 150.1, w: 228.3, ma: 34.2, epoch: 2459000.5 }
        },
        vesta: {
            id: 'vesta',
            name: '4 Vesta',
            type: 'asteroid',
            typeLabel: 'Astéroïde Majeur (Ceinture Principale)',
            color: '#dcdcdc',
            radiusKm: 262.7,
            orbitalPeriodDays: 1325.7,
            semiMajorAxisAU: 2.362,
            visualSizeScale: 0.3,
            description: "Deuxième corps le plus massif de la ceinture d'astéroïdes. Vesta possède un noyau métallique différencié et un cratère géant (Rheasilvia) à son pôle sud résultant d'un impact colossal.",
            elements: { a: 2.362, e: 0.089, i: 7.14, om: 103.8, w: 151.2, ma: 118.4, epoch: 2459000.5 }
        },
        halley: {
            id: 'halley',
            name: '1P/Halley',
            type: 'comet',
            typeLabel: 'Comète Périodique Rétrograde',
            color: '#00e5ff',
            radiusKm: 5.5,
            orbitalPeriodDays: 27500.0,
            semiMajorAxisAU: 17.83,
            visualSizeScale: 0.25,
            description: "La plus célèbre comète de l'histoire, visible tous les 75 à 76 ans. Son dernier passage remonte à 1986 et son prochain périhélie aura lieu le 28 juillet 2061.",
            elements: { a: 17.83, e: 0.967, i: 162.26, om: 58.42, w: 111.33, ma: 38.3, epoch: 2449400.5 }
        }
    };

    const FAMOUS_LIST = [
        { id: 'apophis', name: '99942 Apophis', type: 'Géocroiseur PHA' },
        { id: 'bennu', name: '101955 Bennu', type: 'Géocroiseur (OSIRIS-REx)' },
        { id: 'ryugu', name: '162173 Ryugu', type: 'Géocroiseur (Hayabusa2)' },
        { id: 'psyche', name: '16 Psyché', type: 'Métallique (Psyche)' },
        { id: 'vesta', name: '4 Vesta', type: 'Ceinture Principale' },
        { id: 'halley', name: '1P/Halley', type: 'Comète Périodique' }
    ];

    // --- 3. GESTIONNAIRE DES CEINTURES D'ASTÉROÏDES GPU ---
    class AsteroidBeltsManager {
        constructor(scene) {
            this.scene = scene;
            this.clouds = {};
            this.visibleCategories = { mainBelt: true, trojans: true, neas: true, kuiper: true };
            this.initAllBelts();
        }

        initAllBelts() {
            this.clouds.mainBelt = this.createBeltGroup({
                count: 22000,
                color: new THREE.Color(0xd0d0d8),
                size: 1.6,
                generateParams: () => {
                    let a = 2.1 + Math.random() * 1.2;
                    while ((a > 2.48 && a < 2.52) || (a > 2.80 && a < 2.84) || (a > 2.94 && a < 2.98)) {
                        a = 2.1 + Math.random() * 1.2;
                    }
                    return {
                        a, e: 0.04 + Math.random() * 0.16,
                        inc: (Math.random() * 18.0) * DEG2RAD,
                        om: Math.random() * Math.PI * 2,
                        w: Math.random() * Math.PI * 2,
                        m0: Math.random() * Math.PI * 2
                    };
                }
            });

            this.clouds.trojans = this.createBeltGroup({
                count: 4000,
                color: new THREE.Color(0x80deea),
                size: 1.8,
                generateParams: (i) => {
                    const lagrangeOffset = (i % 2 === 0 ? 60 : -60) * DEG2RAD;
                    return {
                        a: 5.2 + (Math.random() - 0.5) * 0.35,
                        e: 0.03 + Math.random() * 0.12,
                        inc: (Math.random() * 22.0) * DEG2RAD,
                        om: Math.random() * Math.PI * 2,
                        w: Math.random() * Math.PI * 2,
                        m0: lagrangeOffset + (Math.random() - 0.5) * 0.45,
                        isTrojan: true
                    };
                }
            });

            this.clouds.neas = this.createBeltGroup({
                count: 3000,
                color: new THREE.Color(0xff5252),
                size: 2.0,
                generateParams: () => {
                    const isAten = Math.random() < 0.3;
                    return {
                        a: isAten ? 0.75 + Math.random() * 0.23 : 1.05 + Math.random() * 0.95,
                        e: 0.15 + Math.random() * 0.45,
                        inc: (Math.random() * 26.0) * DEG2RAD,
                        om: Math.random() * Math.PI * 2,
                        w: Math.random() * Math.PI * 2,
                        m0: Math.random() * Math.PI * 2
                    };
                }
            });

            this.clouds.kuiper = this.createBeltGroup({
                count: 8000,
                color: new THREE.Color(0x90caf9),
                size: 1.5,
                generateParams: () => ({
                    a: 30.0 + Math.random() * 22.0,
                    e: 0.02 + Math.random() * 0.25,
                    inc: (Math.random() * 32.0) * DEG2RAD,
                    om: Math.random() * Math.PI * 2,
                    w: Math.random() * Math.PI * 2,
                    m0: Math.random() * Math.PI * 2
                })
            });
        }

        createBeltGroup({ count, color, size, generateParams }) {
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            const paramsList = [];

            for (let i = 0; i < count; i++) {
                paramsList.push(generateParams(i));
                const variation = (Math.random() - 0.5) * 0.15;
                colors[i * 3] = Math.min(1, Math.max(0, color.r + variation));
                colors[i * 3 + 1] = Math.min(1, Math.max(0, color.g + variation));
                colors[i * 3 + 2] = Math.min(1, Math.max(0, color.b + variation));
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const canvas = document.createElement('canvas');
            canvas.width = 32; canvas.height = 32;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.3, 'rgba(230,240,255,0.8)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 32, 32);

            const mat = new THREE.PointsMaterial({
                size: size,
                map: new THREE.CanvasTexture(canvas),
                transparent: true,
                opacity: 0.85,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const points = new THREE.Points(geometry, mat);
            this.scene.add(points);
            return { points, paramsList, count };
        }

        update(jd, scaleFactor, jupAnomaly) {
            const days = jd - 2451545.0;
            for (const [key, cloud] of Object.entries(this.clouds)) {
                if (!this.visibleCategories[key]) {
                    cloud.points.visible = false;
                    continue;
                }
                cloud.points.visible = true;

                const posAttr = cloud.points.geometry.attributes.position;
                const posArray = posAttr.array;
                const params = cloud.paramsList;

                for (let i = 0; i < cloud.count; i++) {
                    const p = params[i];
                    const a = p.a;
                    const e = p.e;
                    const n = (2.0 * Math.PI) / (Math.pow(a, 1.5) * 365.2568983);
                    let M = p.isTrojan ? (jupAnomaly + p.m0) : (p.m0 + n * days);
                    M = M % (2 * Math.PI);
                    if (M < 0) M += 2 * Math.PI;

                    let E = M + e * Math.sin(M);
                    E = E - (E - e * Math.sin(E) - M) / (1.0 - e * Math.cos(E));

                    const xOrb = a * (Math.cos(E) - e);
                    const yOrb = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);

                    const cosOm = Math.cos(p.om); const sinOm = Math.sin(p.om);
                    const cosW = Math.cos(p.w); const sinW = Math.sin(p.w);
                    const cosI = Math.cos(p.inc); const sinI = Math.sin(p.inc);

                    const Px = cosOm * cosW - sinOm * sinW * cosI;
                    const Py = sinOm * cosW + cosOm * sinW * cosI;
                    const Pz = sinW * sinI;

                    const Qx = -cosOm * sinW - sinOm * cosW * cosI;
                    const Qy = -sinOm * sinW + cosOm * cosW * cosI;
                    const Qz = cosW * sinI;

                    const eclipticX = xOrb * Px + yOrb * Qx;
                    const eclipticY = xOrb * Py + yOrb * Qy;
                    const eclipticZ = xOrb * Pz + yOrb * Qz;

                    const idx = i * 3;
                    posArray[idx] = eclipticX * scaleFactor;
                    posArray[idx + 1] = eclipticZ * scaleFactor;
                    posArray[idx + 2] = eclipticY * scaleFactor;
                }
                posAttr.needsUpdate = true;
            }
        }

        toggleCategory(key, isVisible) {
            this.visibleCategories[key] = isVisible;
            if (this.clouds[key]) this.clouds[key].points.visible = isVisible;
        }
    }

    // --- 4. SERVICE NASA JPL SBDB ---
    class NasaJplService {
        constructor() {
            this.baseUrl = 'https://ssd-api.jpl.nasa.gov/sbdb.api';
            this.cache = new Map();
        }

        async searchSmallBody(query) {
            const cleanQuery = query.trim();
            if (!cleanQuery) return null;
            if (this.cache.has(cleanQuery.toLowerCase())) return this.cache.get(cleanQuery.toLowerCase());

            const targetUrl = `${this.baseUrl}?sstr=${encodeURIComponent(cleanQuery)}&phys-par=1`;
            let data = null;

            try {
                const res = await fetch(targetUrl);
                if (res.ok) data = await res.json();
            } catch (e) {}

            if (!data) {
                const proxies = [
                    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
                    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
                ];
                for (const p of proxies) {
                    try {
                        const res = await fetch(p);
                        if (res.ok) { data = await res.json(); break; }
                    } catch (err) {}
                }
            }

            if (!data || !data.orbit || !data.orbit.elements) {
                throw new Error(`Aucun corps trouvé pour "${cleanQuery}" sur NASA JPL.`);
            }

            const parsed = this.parseJplResponse(data);
            this.cache.set(cleanQuery.toLowerCase(), parsed);
            return parsed;
        }

        parseJplResponse(data) {
            const obj = data.object || {};
            const elementsList = data.orbit.elements || [];
            const elMap = {};
            for (const el of elementsList) elMap[el.name] = parseFloat(el.value);

            const epoch = parseFloat(data.orbit.epoch) || 2451545.0;
            const a = elMap['a'] || (elMap['q'] ? elMap['q'] / (1 - (elMap['e'] || 0)) : 1.0);
            const e = elMap['e'] || 0.0;
            const i = elMap['i'] || 0.0;
            const om = elMap['om'] || 0.0;
            const w = elMap['w'] || 0.0;
            const ma = elMap['ma'] || 0.0;
            const per = elMap['per'] || Math.pow(Math.abs(a), 1.5) * 365.25;

            let diam = null;
            if (data.phys_par) {
                for (const p of data.phys_par) {
                    if (p.name === 'diameter') diam = parseFloat(p.value);
                }
            }

            const isPha = !!obj.pha;
            const isNeo = !!obj.neo;
            const orbitClass = obj.orbit_class ? obj.orbit_class.name : 'Astéroïde';

            return {
                id: 'jpl_' + (obj.spkid || obj.des || Math.random().toString(36).substr(2, 9)),
                name: obj.fullname || obj.shortname || `Astéroïde ${obj.des}`,
                typeLabel: `${orbitClass} ${isPha ? '⚠️ Géocroiseur PHA' : isNeo ? '🛸 Géocroiseur NEO' : ''}`,
                color: isPha ? '#ff1744' : isNeo ? '#ff9100' : '#00e5ff',
                radiusKm: diam ? diam / 2 : 1.0,
                orbitalPeriodDays: per,
                semiMajorAxisAU: a,
                visualSizeScale: 0.25,
                description: `Objet répertorié au Jet Propulsion Laboratory (SPK: ${obj.spkid || 'N/A'}). Classe : ${orbitClass}.`,
                elements: { a, e, i, om, w, ma, epoch }
            };
        }
    }

    // --- 5. APPLICATION THREE.JS PRINCIPALE ---
    class SolarSystemApp {
        constructor() {
            this.container = document.getElementById('canvas-container');
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;

            this.isLive = true;
            this.isPlaying = true;
            this.timeSpeed = 1.0;
            this.currentDate = new Date();
            this.currentJD = toJulianDate(this.currentDate);
            this.lastFrameTime = performance.now();

            this.orbitScale = 12.0;
            this.bodyMeshes = new Map();
            this.selectedBody = null;
            this.trackedObject = null;

            this.beltsManager = null;
            this.jplService = new NasaJplService();
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();

            this.showOrbits = true;
            this.onTelemetryUpdate = null;
            this.onBodySelected = null;

            this.init();
        }

        init() {
            // Scène
            this.scene = new THREE.Scene();
            this.scene.fog = new THREE.FogExp2(0x020208, 0.0003);

            // Caméra
            const aspect = window.innerWidth / window.innerHeight;
            this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500000);
            this.camera.position.set(0, 35, 45);

            // Rendu
            this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.1;
            this.container.appendChild(this.renderer.domElement);

            // Contrôles orbitaux
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 0.5;
            this.controls.maxDistance = 20000;

            // Éclairage
            this.scene.add(new THREE.AmbientLight(0x334466, 0.45));
            const sunLight = new THREE.PointLight(0xffffff, 2.5, 0, 0);
            this.scene.add(sunLight);

            // Ciel étoilé
            this.createStarfield();

            // Création des astres
            this.createSun();
            for (const [id, data] of Object.entries(CELESTIAL_BODIES)) {
                if (id === 'sun') continue;
                this.createBody(data);
            }

            // Ceintures massives GPU
            this.beltsManager = new AsteroidBeltsManager(this.scene);

            // Événements
            window.addEventListener('resize', () => this.onWindowResize());
            this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));

            // Sélection Terre par défaut
            this.selectBody('earth', false);

            this.animate();
        }

        createStarfield() {
            const count = 7000;
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const col = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                const r = 8000 + Math.random() * 4000;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                pos[i * 3 + 2] = r * Math.cos(phi);

                const c = Math.random() > 0.3 ? 1.0 : 0.8;
                col[i * 3] = c; col[i * 3 + 1] = c; col[i * 3 + 2] = 1.0;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
            const mat = new THREE.PointsMaterial({ size: 2.0, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
            this.scene.add(new THREE.Points(geo, mat));
        }

        createSun() {
            const sunData = CELESTIAL_BODIES.sun;
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createLinearGradient(0, 0, 256, 128);
            grad.addColorStop(0, '#ff9900'); grad.addColorStop(0.5, '#ffcc00'); grad.addColorStop(1, '#ff5500');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 128);
            for (let i = 0; i < 150; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,220,0.3)' : 'rgba(180,40,0,0.3)';
                ctx.beginPath(); ctx.arc(Math.random()*256, Math.random()*128, 2+Math.random()*5, 0, Math.PI*2); ctx.fill();
            }

            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(sunData.visualSizeScale, 48, 48),
                new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
            );
            mesh.userData = { id: 'sun', data: sunData };
            this.scene.add(mesh);

            // Halo Sprite
            const gCanvas = document.createElement('canvas');
            gCanvas.width = 128; gCanvas.height = 128;
            const gCtx = gCanvas.getContext('2d');
            const gGrad = gCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
            gGrad.addColorStop(0, 'rgba(255,240,180,1)');
            gGrad.addColorStop(0.3, 'rgba(255,150,30,0.6)');
            gGrad.addColorStop(1, 'rgba(0,0,0,0)');
            gCtx.fillStyle = gGrad; gCtx.fillRect(0, 0, 128, 128);

            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: new THREE.CanvasTexture(gCanvas),
                color: 0xffddaa,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            sprite.scale.set(sunData.visualSizeScale * 4.5, sunData.visualSizeScale * 4.5, 1.0);
            mesh.add(sprite);

            this.bodyMeshes.set('sun', { mesh, data: sunData, orbitLine: null });
        }

        createBody(data) {
            const radius = data.visualSizeScale || 0.4;
            const geo = new THREE.SphereGeometry(radius, 32, 32);

            const canvas = document.createElement('canvas');
            canvas.width = 128; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = data.color || '#888888';
            ctx.fillRect(0, 0, 128, 64);

            if (data.id === 'earth') {
                ctx.fillStyle = '#1b5e20';
                for (let i = 0; i < 20; i++) {
                    ctx.beginPath(); ctx.arc(Math.random()*128, 15+Math.random()*34, 4+Math.random()*12, 0, Math.PI*2); ctx.fill();
                }
                ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 6); ctx.fillRect(0, 58, 128, 6);
            } else if (data.id === 'jupiter' || data.id === 'saturn') {
                for (let y = 0; y < 64; y += 4) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${Math.abs(Math.sin(y * 0.2)) * 0.35})`;
                    ctx.fillRect(0, y, 128, 4);
                }
            }

            const mat = new THREE.MeshStandardMaterial({
                map: new THREE.CanvasTexture(canvas),
                roughness: 0.8,
                metalness: 0.1
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.userData = { id: data.id, data: data };

            if (data.rings) {
                const ringGeo = new THREE.RingGeometry(radius * 1.5, radius * 2.8, 64);
                ringGeo.rotateX(Math.PI / 2);
                const ringMat = new THREE.MeshStandardMaterial({ color: 0xd6c59b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
                mesh.add(new THREE.Mesh(ringGeo, ringMat));
            }

            const orbitLine = this.createOrbitLine(data);
            if (orbitLine) this.scene.add(orbitLine);

            this.scene.add(mesh);
            this.bodyMeshes.set(data.id, { mesh, data, orbitLine });
            return mesh;
        }

        createOrbitLine(data) {
            let elements = data.elements;
            if (!elements && data.a0) {
                elements = { a: data.a0, e: data.e0, i: data.i0, om: data.om0, w: (data.varpi0 - data.om0) };
            }
            if (!elements || !elements.a) return null;

            const rawPoints = generateOrbitPath(elements, 128);
            const points = rawPoints.map(p => new THREE.Vector3(p.x * this.orbitScale, p.y * this.orbitScale, p.z * this.orbitScale));
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(data.color || 0x4fc3f7), transparent: true, opacity: 0.35 });
            return new THREE.LineLoop(geo, mat);
        }

        async searchAndAddJplAsteroid(query) {
            for (const [id, item] of this.bodyMeshes.entries()) {
                if (item.data.name.toLowerCase().includes(query.toLowerCase())) {
                    this.selectBody(id, true);
                    return item.data;
                }
            }

            const jplData = await this.jplService.searchSmallBody(query);
            if (!jplData) return null;
            this.createBody(jplData);
            this.selectBody(jplData.id, true);
            return jplData;
        }

        selectBody(id, animateCamera = true) {
            const bodyObj = this.bodyMeshes.get(id);
            if (!bodyObj) return;

            this.selectedBody = bodyObj;
            this.trackedObject = bodyObj.mesh;

            if (this.onBodySelected) this.onBodySelected(bodyObj.data);

            if (animateCamera) {
                const targetPos = bodyObj.mesh.position.clone();
                const offsetDist = Math.max(2.5, (bodyObj.data.visualSizeScale || 0.5) * 6.5);
                const newCamPos = targetPos.clone().add(new THREE.Vector3(offsetDist * 0.7, offsetDist * 0.5, offsetDist * 0.8));

                new TWEEN.Tween(this.camera.position).to(newCamPos, 1400).easing(TWEEN.Easing.Cubic.Out).start();
                new TWEEN.Tween(this.controls.target).to(targetPos, 1400).easing(TWEEN.Easing.Cubic.Out).start();
            }
        }

        onPointerDown(event) {
            if (event.target.tagName !== 'CANVAS') return;
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const meshes = [];
            for (const item of this.bodyMeshes.values()) meshes.push(item.mesh);

            const hits = this.raycaster.intersectObjects(meshes, false);
            if (hits.length > 0 && hits[0].object.userData && hits[0].object.userData.id) {
                this.selectBody(hits[0].object.userData.id, true);
            }
        }

        updatePositions(deltaSec) {
            if (this.isLive) {
                this.currentDate = new Date();
                this.currentJD = toJulianDate(this.currentDate);
            } else if (this.isPlaying) {
                const daysPassed = (deltaSec * this.timeSpeed) / 86400.0;
                this.currentJD += daysPassed;
                this.currentDate = fromJulianDate(this.currentJD);
            }

            let jupAnomaly = 0;

            for (const [id, item] of this.bodyMeshes.entries()) {
                if (id === 'sun') {
                    item.mesh.rotation.y += deltaSec * 0.05;
                    continue;
                }

                const data = item.data;
                let coords = null;
                if (data.a0) coords = calculateMajorPlanetPosition(data, this.currentJD);
                else if (data.elements) coords = calculateKeplerianPosition(data.elements, this.currentJD);

                if (coords) {
                    item.mesh.position.set(coords.x * this.orbitScale, coords.y * this.orbitScale, coords.z * this.orbitScale);

                    if (id === 'jupiter') jupAnomaly = coords.trueAnomaly * DEG2RAD;

                    if (this.selectedBody && this.selectedBody.data.id === id && this.onTelemetryUpdate) {
                        this.onTelemetryUpdate({
                            currentJD: this.currentJD,
                            currentDate: this.currentDate,
                            distanceSunAU: coords.r,
                            distanceSunKm: coords.r * AU_TO_KM,
                            velocityKmS: coords.v,
                            eclipticX: coords.x,
                            eclipticY: coords.z,
                            eclipticZ: coords.y
                        });
                    }
                }
            }

            if (this.beltsManager) {
                this.beltsManager.update(this.currentJD, this.orbitScale, jupAnomaly);
            }

            if (this.trackedObject && this.controls) {
                this.controls.target.lerp(this.trackedObject.position, 0.08);
            }
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            const now = performance.now();
            const deltaSec = Math.min((now - this.lastFrameTime) / 1000.0, 0.1);
            this.lastFrameTime = now;

            TWEEN.update();
            this.updatePositions(deltaSec);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        }

        onWindowResize() {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }

        setLiveMode(isLive) {
            this.isLive = isLive;
            if (isLive) { this.isPlaying = true; this.timeSpeed = 1.0; }
        }

        setPlaying(isPlaying) {
            this.isPlaying = isPlaying;
            if (isPlaying) this.isLive = false;
        }

        setTimeSpeed(multiplier) {
            this.timeSpeed = multiplier;
            this.isLive = false;
            this.isPlaying = true;
        }

        stepDays(deltaDays) {
            this.isLive = false;
            this.currentJD += deltaDays;
            this.currentDate = fromJulianDate(this.currentJD);
        }

        setDate(date) {
            this.isLive = false;
            this.currentDate = date;
            this.currentJD = toJulianDate(date);
        }

        toggleOrbits(visible) {
            this.showOrbits = visible;
            for (const item of this.bodyMeshes.values()) {
                if (item.orbitLine) item.orbitLine.visible = visible;
            }
        }
    }

    // --- 6. CONTRÔLEUR D'INTERFACE UTILISATEUR ---
    class UIController {
        constructor(app) {
            this.app = app;

            this.liveBadge = document.getElementById('live-indicator');
            this.utcClock = document.getElementById('utc-clock');
            this.jdClock = document.getElementById('jd-clock');
            this.datePicker = document.getElementById('date-picker');

            this.btnLive = document.getElementById('btn-live');
            this.btnPlayPause = document.getElementById('btn-play-pause');
            this.speedSelector = document.getElementById('speed-select');
            this.btnStepBack = document.getElementById('btn-step-back');
            this.btnStepForward = document.getElementById('btn-step-forward');

            this.inspectorPanel = document.getElementById('inspector-panel');
            this.inspectorTitle = document.getElementById('inspector-title');
            this.inspectorSubtitle = document.getElementById('inspector-subtitle');
            this.inspectorDescription = document.getElementById('inspector-description');
            this.inspectorDistanceSun = document.getElementById('telemetry-dist-sun');
            this.inspectorVelocity = document.getElementById('telemetry-velocity');
            this.inspectorPeriod = document.getElementById('telemetry-period');
            this.inspectorRadius = document.getElementById('telemetry-radius');
            this.inspectorMass = document.getElementById('telemetry-mass');
            this.inspectorRotation = document.getElementById('telemetry-rotation');
            this.inspectorCoords = document.getElementById('telemetry-coords');

            this.searchInput = document.getElementById('search-input');
            this.searchBtn = document.getElementById('search-btn');
            this.searchSuggestions = document.getElementById('search-suggestions');
            this.searchLoading = document.getElementById('search-loading');

            this.chkMainBelt = document.getElementById('chk-main-belt');
            this.chkTrojans = document.getElementById('chk-trojans');
            this.chkNeas = document.getElementById('chk-neas');
            this.chkKuiper = document.getElementById('chk-kuiper');
            this.chkOrbits = document.getElementById('chk-orbits');

            this.quickNavContainer = document.getElementById('quick-nav-planets');

            this.initEvents();
            this.initQuickNav();
            this.bindCallbacks();
        }

        initEvents() {
            this.btnLive.addEventListener('click', () => { this.app.setLiveMode(true); this.updateUI(); });
            this.btnPlayPause.addEventListener('click', () => { this.app.setPlaying(!this.app.isPlaying); this.updateUI(); });
            this.speedSelector.addEventListener('change', (e) => { this.app.setTimeSpeed(parseFloat(e.target.value)); this.updateUI(); });
            this.btnStepBack.addEventListener('click', () => { this.app.stepDays(-1); this.updateUI(); });
            this.btnStepForward.addEventListener('click', () => { this.app.stepDays(1); this.updateUI(); });

            this.datePicker.addEventListener('change', (e) => {
                if (e.target.value) {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) { this.app.setDate(d); this.updateUI(); }
                }
            });

            this.chkMainBelt.addEventListener('change', (e) => this.app.beltsManager.toggleCategory('mainBelt', e.target.checked));
            this.chkTrojans.addEventListener('change', (e) => this.app.beltsManager.toggleCategory('trojans', e.target.checked));
            this.chkNeas.addEventListener('change', (e) => this.app.beltsManager.toggleCategory('neas', e.target.checked));
            this.chkKuiper.addEventListener('change', (e) => this.app.beltsManager.toggleCategory('kuiper', e.target.checked));
            this.chkOrbits.addEventListener('change', (e) => this.app.toggleOrbits(e.target.checked));

            this.searchBtn.addEventListener('click', () => this.handleSearch());
            this.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.handleSearch(); });
            this.searchInput.addEventListener('input', (e) => this.showSuggestions(e.target.value));

            document.addEventListener('click', (e) => {
                if (!this.searchInput.contains(e.target) && !this.searchSuggestions.contains(e.target)) {
                    this.searchSuggestions.classList.add('hidden');
                }
            });

            document.getElementById('btn-reset-cam').addEventListener('click', () => {
                this.app.controls.target.set(0, 0, 0);
                this.app.camera.position.set(0, 45, 60);
                this.app.trackedObject = null;
            });

            const btnApophis = document.getElementById('btn-event-apophis');
            if (btnApophis) {
                btnApophis.addEventListener('click', () => {
                    this.app.setDate(new Date('2029-04-13T21:46:00Z'));
                    this.app.selectBody('apophis', true);
                    this.updateUI();
                });
            }
        }

        initQuickNav() {
            const list = [
                { id: 'sun', label: 'Soleil', color: '#ffaa00' },
                { id: 'mercury', label: 'Mercure', color: '#a8a59b' },
                { id: 'venus', label: 'Vénus', color: '#e3bb76' },
                { id: 'earth', label: 'Terre', color: '#2b82c9' },
                { id: 'mars', label: 'Mars', color: '#c9532e' },
                { id: 'jupiter', label: 'Jupiter', color: '#d4a373' },
                { id: 'saturn', label: 'Saturne', color: '#ead6a6' },
                { id: 'uranus', label: 'Uranus', color: '#70d6ff' },
                { id: 'neptune', label: 'Neptune', color: '#3a86ff' },
                { id: 'pluto', label: 'Pluton', color: '#c49a6c' },
                { id: 'ceres', label: 'Cérès', color: '#9e9e9e' },
                { id: 'apophis', label: 'Apophis', color: '#ff3366' },
                { id: 'psyche', label: 'Psyché', color: '#ffd700' }
            ];

            this.quickNavContainer.innerHTML = '';
            list.forEach(p => {
                const btn = document.createElement('button');
                btn.className = 'quick-nav-btn';
                btn.innerHTML = `<span class="dot" style="background: ${p.color}"></span>${p.label}`;
                btn.addEventListener('click', () => this.app.selectBody(p.id, true));
                this.quickNavContainer.appendChild(btn);
            });
        }

        bindCallbacks() {
            this.app.onBodySelected = (data) => this.renderInspector(data);
            this.app.onTelemetryUpdate = (telem) => {
                this.utcClock.innerText = telem.currentDate.toUTCString().replace('GMT', 'UTC');
                this.jdClock.innerText = `JD ${telem.currentJD.toFixed(4)}`;
                if (this.inspectorDistanceSun) this.inspectorDistanceSun.innerText = `${telem.distanceSunAU.toFixed(3)} UA (${(telem.distanceSunKm / 1e6).toFixed(2)} M km)`;
                if (this.inspectorVelocity) this.inspectorVelocity.innerText = `${telem.velocityKmS.toFixed(2)} km/s (${(telem.velocityKmS * 3600).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km/h)`;
                if (this.inspectorCoords) this.inspectorCoords.innerText = `X: ${telem.eclipticX.toFixed(2)} | Y: ${telem.eclipticZ.toFixed(2)} | Z: ${telem.eclipticY.toFixed(2)} UA`;
            };
        }

        updateUI() {
            if (this.app.isLive) {
                this.liveBadge.className = 'status-badge active';
                this.liveBadge.innerHTML = '<span class="pulse"></span> DIRECT LIVE UTC';
                this.btnLive.classList.add('active');
                this.btnPlayPause.innerHTML = '⏸ Pause';
            } else {
                this.liveBadge.className = 'status-badge paused';
                this.liveBadge.innerHTML = '<span class="dot"></span> SIMULATION';
                this.btnLive.classList.remove('active');
                this.btnPlayPause.innerHTML = this.app.isPlaying ? '⏸ Pause' : '▶ Lecture';
            }
        }

        renderInspector(data) {
            this.inspectorPanel.classList.remove('hidden');
            this.inspectorTitle.innerText = data.name;
            this.inspectorSubtitle.innerText = data.typeLabel || 'Corps Céleste';
            this.inspectorSubtitle.style.color = data.color || '#00e5ff';
            this.inspectorDescription.innerText = data.description || 'Données fournies par NASA JPL.';
            this.inspectorPeriod.innerText = data.orbitalPeriodDays ? `${data.orbitalPeriodDays.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} jours` : 'N/A';
            this.inspectorRadius.innerText = data.radiusKm ? `${data.radiusKm.toLocaleString('fr-FR')} km` : 'Non mesuré';
            this.inspectorMass.innerText = data.massKg || 'Inconnue';
            this.inspectorRotation.innerText = data.rotationPeriodHours ? `${Math.abs(data.rotationPeriodHours).toFixed(1)} h` : 'Inconnue';
        }

        async handleSearch() {
            const query = this.searchInput.value.trim();
            if (!query) return;

            this.searchLoading.classList.remove('hidden');
            this.searchSuggestions.classList.add('hidden');

            try {
                const body = await this.app.searchAndAddJplAsteroid(query);
                if (body) this.searchInput.value = body.name;
            } catch (err) {
                alert(`Erreur JPL : ${err.message}`);
            } finally {
                this.searchLoading.classList.add('hidden');
            }
        }

        showSuggestions(text) {
            const q = text.trim().toLowerCase();
            if (!q) { this.searchSuggestions.classList.add('hidden'); return; }

            const matches = [];
            for (const [id, body] of Object.entries(CELESTIAL_BODIES)) {
                if (body.name.toLowerCase().includes(q)) matches.push({ id, name: body.name, type: body.typeLabel, color: body.color });
            }
            FAMOUS_LIST.forEach(item => {
                if (item.name.toLowerCase().includes(q) && !matches.some(m => m.name === item.name)) {
                    matches.push({ id: item.id, name: item.name, type: item.type, color: '#ff7043' });
                }
            });

            if (matches.length === 0) {
                this.searchSuggestions.innerHTML = `
                    <div class="suggestion-item jpl-query">
                        <span>Interroger l'API NASA JPL pour "<strong>${text}</strong>"...</span>
                    </div>
                `;
                this.searchSuggestions.firstElementChild.addEventListener('click', () => this.handleSearch());
                this.searchSuggestions.classList.remove('hidden');
                return;
            }

            this.searchSuggestions.innerHTML = '';
            matches.slice(0, 7).forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerHTML = `<div class="name"><span class="dot" style="background: ${item.color || '#00e5ff'}"></span>${item.name}</div><div class="type">${item.type}</div>`;
                div.addEventListener('click', () => {
                    this.searchInput.value = item.name;
                    this.searchSuggestions.classList.add('hidden');
                    if (CELESTIAL_BODIES[item.id]) this.app.selectBody(item.id, true);
                    else this.handleSearch();
                });
                this.searchSuggestions.appendChild(div);
            });
            this.searchSuggestions.classList.remove('hidden');
        }
    }

    // Démarrage automatique
    window.addEventListener('DOMContentLoaded', () => {
        const app = new SolarSystemApp();
        const ui = new UIController(app);
        window.solarApp = app;
    });

})();

