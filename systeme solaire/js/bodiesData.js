/**
 * bodiesData.js
 * Catalogue exhaustif des corps célestes du Système Solaire :
 * Soleil, Planètes, Lunes majeures, Planètes Naines, Astéroïdes majeurs & Comètes
 */

export const CELESTIAL_BODIES = {
    // ÉTOILE CENTRALE
    sun: {
        id: 'sun',
        name: 'Soleil',
        latinName: 'Sol',
        type: 'star',
        typeLabel: 'Étoile (Naine Jaune G2V)',
        radiusKm: 696340,
        massKg: '1.989 × 10³⁰ kg (99.86% du système)',
        surfaceTemp: '5 500 °C (surface) / 15 000 000 °C (cœur)',
        rotationPeriodHours: 609.12, // ~25.4 jours
        spectralClass: 'G2V',
        color: '#ffaa00',
        emissiveColor: '#ffdd44',
        visualSizeScale: 2.2, // Taille visuelle dans la scène 3D
        description: "L'étoile au centre de notre système solaire. Elle contient 99,86 % de la masse totale du système et fournit l'énergie lumineuse et gravitationnelle qui régit tous les corps célestes.",
        elements: null // Centre du système
    },

    // --- PLANÈTES MAJEURES (Éléments séculaires NASA Standish J2000) ---
    mercury: {
        id: 'mercury',
        name: 'Mercure',
        latinName: 'Mercurius',
        type: 'planet',
        typeLabel: 'Planète Tellurique',
        color: '#a8a59b',
        orbitColor: 'rgba(168, 165, 155, 0.45)',
        radiusKm: 2439.7,
        massKg: '3.301 × 10²³ kg',
        axialTiltDeg: 0.034,
        rotationPeriodHours: 1407.6, // 58.6 jours
        orbitalPeriodDays: 87.97,
        semiMajorAxisAU: 0.387,
        visualSizeScale: 0.5,
        description: "La plus petite planète du système solaire et la plus proche du Soleil. Sa surface criblée de cratères subit les écarts thermiques les plus violents du système (-180°C à +430°C).",
        // Éléments képlériens et taux séculaires J2000
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
        orbitColor: 'rgba(227, 187, 118, 0.45)',
        radiusKm: 6051.8,
        massKg: '4.867 × 10²⁴ kg',
        axialTiltDeg: 177.3, // Rétrograde
        rotationPeriodHours: -5832.5, // 243 jours rétrograde
        orbitalPeriodDays: 224.7,
        semiMajorAxisAU: 0.723,
        atmosphere: 'CO2 (96.5%), N2 (3.5%), nuages d\'acide sulfurique',
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
        orbitColor: 'rgba(43, 130, 201, 0.65)',
        radiusKm: 6371.0,
        massKg: '5.972 × 10²⁴ kg',
        axialTiltDeg: 23.44,
        rotationPeriodHours: 23.934,
        orbitalPeriodDays: 365.256,
        semiMajorAxisAU: 1.000,
        atmosphere: 'N2 (78%), O2 (21%), Ar (0.9%), CO2 (0.04%)',
        visualSizeScale: 0.8,
        description: "Notre berceau, la seule planète connue abritant la vie. Elle possède de vastes océans d'eau liquide recouvrant 71% de sa surface et une atmosphère protectrice riche en oxygène.",
        a0: 1.00000011, aDot: -0.00000005,
        e0: 0.01671022, eDot: -0.00003804,
        i0: 0.00005,    iDot: -0.0129466,
        L0: 100.46435,  LDot: 35999.372449,
        varpi0: 102.94719, varpiDot: 0.3232736,
        om0: 0.0,       omDot: 0.0,
        moons: ['moon']
    },

    mars: {
        id: 'mars',
        name: 'Mars',
        latinName: 'Mars',
        type: 'planet',
        typeLabel: 'Planète Tellurique (Désert)',
        color: '#c9532e',
        orbitColor: 'rgba(201, 83, 46, 0.55)',
        radiusKm: 3389.5,
        massKg: '6.417 × 10²³ kg',
        axialTiltDeg: 25.19,
        rotationPeriodHours: 24.623,
        orbitalPeriodDays: 686.98,
        semiMajorAxisAU: 1.524,
        atmosphere: 'CO2 (95.3%), N2 (2.6%), Ar (1.9%)',
        visualSizeScale: 0.6,
        description: "La planète rouge, marquée par le mont Olympe (plus grand volcan du système solaire) et Valles Marineris. Elle abrite de la glace d'eau à ses pôles et sous son régolithe stérile.",
        a0: 1.52366231, aDot: -0.00007221,
        e0: 0.09341233, eDot: 0.00011902,
        i0: 1.85061,    iDot: -0.0004747,
        L0: 355.45332,  LDot: 19140.302684,
        varpi0: 336.04084, varpiDot: 0.4444108,
        om0: 49.57854,  omDot: -0.2949846,
        moons: ['phobos', 'deimos']
    },

    jupiter: {
        id: 'jupiter',
        name: 'Jupiter',
        latinName: 'Iuppiter',
        type: 'planet',
        typeLabel: 'Géante Gazeuse',
        color: '#d4a373',
        orbitColor: 'rgba(212, 163, 115, 0.45)',
        radiusKm: 69911,
        massKg: '1.898 × 10²⁷ kg (318 Terres)',
        axialTiltDeg: 3.13,
        rotationPeriodHours: 9.925, // Rotation la plus rapide
        orbitalPeriodDays: 4332.59, // ~11.86 ans
        semiMajorAxisAU: 5.204,
        atmosphere: 'H2 (89.8%), He (10.2%), traces de méthane et ammoniac',
        visualSizeScale: 1.6,
        description: "La reine des planètes, gigantesque géante gazeuse possédant plus de 95 lunes connues, un champ magnétique colossal et la célèbre Grande Tache Rouge, tempête anticyclonique tricentenaire.",
        a0: 5.20336301, aDot: 0.00060737,
        e0: 0.04839266, eDot: -0.00012880,
        i0: 1.30530,    iDot: -0.001557,
        L0: 34.40438,   LDot: 3034.74612,
        varpi0: 14.75385, varpiDot: 0.2157529,
        om0: 100.55615, omDot: 0.2052888,
        moons: ['io', 'europa', 'ganymede', 'callisto']
    },

    saturn: {
        id: 'saturn',
        name: 'Saturne',
        latinName: 'Saturnus',
        type: 'planet',
        typeLabel: 'Géante Gazeuse aux Anneaux',
        color: '#ead6a6',
        orbitColor: 'rgba(234, 214, 166, 0.45)',
        radiusKm: 58232,
        massKg: '5.683 × 10²⁶ kg (95 Terres)',
        axialTiltDeg: 26.73,
        rotationPeriodHours: 10.656,
        orbitalPeriodDays: 10759.22, // ~29.45 ans
        semiMajorAxisAU: 9.537,
        visualSizeScale: 1.4,
        rings: {
            innerRadiusAU: 0.00045, // Relatif à l'échelle visuelle
            outerRadiusAU: 0.00095,
            color: '#d6c59b'
        },
        description: "Célèbre pour son splendide et immense système d'anneaux constitué de milliards de morceaux de glace d'eau pure et de poussières. Sa densité moyenne est inférieure à celle de l'eau.",
        a0: 9.53707032, aDot: -0.00301530,
        e0: 0.05415060, eDot: -0.00036762,
        i0: 2.48446,    iDot: 0.001936,
        L0: 49.94432,   LDot: 1222.49362,
        varpi0: 92.43194, varpiDot: -0.040599,
        om0: 113.71504, omDot: -0.2886779,
        moons: ['titan', 'enceladus']
    },

    uranus: {
        id: 'uranus',
        name: 'Uranus',
        latinName: 'Uranus',
        type: 'planet',
        typeLabel: 'Géante de Glaces',
        color: '#70d6ff',
        orbitColor: 'rgba(112, 214, 255, 0.45)',
        radiusKm: 25362,
        massKg: '8.681 × 10²⁵ kg (14.5 Terres)',
        axialTiltDeg: 97.77, // Couchée sur son orbite
        rotationPeriodHours: -17.24,
        orbitalPeriodDays: 30685.4, // ~84 ans
        semiMajorAxisAU: 19.191,
        atmosphere: 'H2 (83%), He (15%), CH4 (2.3% - lui donnant sa teinte cyan)',
        visualSizeScale: 1.1,
        rings: {
            innerRadiusAU: 0.0003,
            outerRadiusAU: 0.0006,
            color: '#a0e1f7'
        },
        description: "Une géante de glace atypique qui 'roule' sur son plan orbital avec une inclinaison axiale de près de 98°, sans doute causée par un impact titanesque au début de l'histoire du système solaire.",
        a0: 19.19126393, aDot: 0.00152025,
        e0: 0.04716771,  eDot: -0.00019150,
        i0: 0.76986,     iDot: -0.000272,
        L0: 313.23218,   LDot: 428.482027,
        varpi0: 170.96424, varpiDot: 0.4080528,
        om0: 74.22988,   omDot: 0.0424058,
        moons: ['titania', 'miranda']
    },

    neptune: {
        id: 'neptune',
        name: 'Neptune',
        latinName: 'Neptunus',
        type: 'planet',
        typeLabel: 'Géante de Glaces',
        color: '#3a86ff',
        orbitColor: 'rgba(58, 134, 255, 0.45)',
        radiusKm: 24622,
        massKg: '1.024 × 10²⁶ kg (17.1 Terres)',
        axialTiltDeg: 28.32,
        rotationPeriodHours: 16.11,
        orbitalPeriodDays: 60189.0, // ~164.8 ans
        semiMajorAxisAU: 30.069,
        visualSizeScale: 1.1,
        description: "La planète la plus éloignée du système solaire. Balayée par les vents les plus violents connus (plus de 2 100 km/h), elle abrite Triton, une lune capturée à l'activité cryovolcanique spectaculaire.",
        a0: 30.06896348, aDot: -0.00125196,
        e0: 0.00858587,  eDot: 0.00002510,
        i0: 1.76917,     iDot: -0.000353,
        L0: 304.88003,   LDot: 218.459453,
        varpi0: 44.97135, varpiDot: -0.3224146,
        om0: 131.72169,  omDot: -0.0059868,
        moons: ['triton']
    },

    // --- PLANÈTES NAINES (Dwarf Planets) & OBJETS TRANS-NEPTUNIENS ---
    pluto: {
        id: 'pluto',
        name: 'Pluton',
        latinName: 'Pluto',
        type: 'dwarf_planet',
        typeLabel: 'Planète Naine (Plutino / Ceinture de Kuiper)',
        color: '#c49a6c',
        orbitColor: 'rgba(196, 154, 108, 0.55)',
        radiusKm: 1188.3,
        massKg: '1.303 × 10²² kg',
        axialTiltDeg: 122.53,
        rotationPeriodHours: -153.29,
        orbitalPeriodDays: 90560.0, // ~248 ans
        semiMajorAxisAU: 39.48,
        visualSizeScale: 0.45,
        description: "Déclassée en planète naine en 2006 par l'UAI, la sonde New Horizons a révélé en 2015 un monde fascinant aux montagnes de glace d'eau, dunes de méthane et la plaine d'azote Spoutnik.",
        a0: 39.48168677, aDot: -0.00076912,
        e0: 0.24880766,  eDot: 0.00006465,
        i0: 17.14175,    iDot: 0.003075,
        L0: 238.92881,   LDot: 145.20780,
        varpi0: 224.06676, varpiDot: -0.040629,
        om0: 110.30347,  omDot: -0.0118348,
        moons: ['charon']
    },

    ceres: {
        id: 'ceres',
        name: '1 Cérès',
        latinName: 'Ceres',
        type: 'dwarf_planet',
        typeLabel: 'Planète Naine (Ceinture Principale)',
        color: '#9e9e9e',
        orbitColor: 'rgba(158, 158, 158, 0.55)',
        radiusKm: 473.0,
        massKg: '9.393 × 10²⁰ kg (1/3 de la ceinture principale)',
        rotationPeriodHours: 9.074,
        orbitalPeriodDays: 1683.1, // ~4.61 ans
        semiMajorAxisAU: 2.767,
        visualSizeScale: 0.35,
        description: "Le plus grand objet de la ceinture d'astéroïdes entre Mars et Jupiter. C'est un monde glacé sphérique avec des dépôts lumineux de carbonates de sodium découverts par la sonde Dawn dans le cratère Occator.",
        elements: {
            a: 2.767,
            e: 0.076,
            i: 10.59,
            om: 80.31,
            w: 73.10,
            ma: 135.0,
            epoch: 2459000.5
        }
    },

    eris: {
        id: 'eris',
        name: '136199 Éris',
        latinName: 'Eris',
        type: 'dwarf_planet',
        typeLabel: 'Planète Naine (Disque Dispersé)',
        color: '#ffffff',
        orbitColor: 'rgba(255, 255, 255, 0.5)',
        radiusKm: 1163.0,
        massKg: '1.66 × 10²² kg',
        rotationPeriodHours: 25.9,
        orbitalPeriodDays: 203830.0, // ~558 ans
        semiMajorAxisAU: 67.78,
        visualSizeScale: 0.45,
        description: "Découverte en 2005 par Mike Brown, sa masse supérieure à celle de Pluton a poussé l'Union Astronomique Internationale à redéfinir la notion même de planète en 2006.",
        elements: {
            a: 67.78,
            e: 0.440,
            i: 44.04,
            om: 35.87,
            w: 151.6,
            ma: 205.8,
            epoch: 2459000.5
        }
    },

    haumea: {
        id: 'haumea',
        name: '136108 Haumea',
        latinName: 'Haumea',
        type: 'dwarf_planet',
        typeLabel: 'Planète Naine (Ceinture de Kuiper)',
        color: '#cfd8dc',
        orbitColor: 'rgba(207, 216, 220, 0.5)',
        radiusKm: 780.0, // ellipsoïde 2322 × 1704 × 1138 km
        rotationPeriodHours: 3.915, // Rotation ultrarapide
        orbitalPeriodDays: 103774.0, // ~284 ans
        semiMajorAxisAU: 43.13,
        visualSizeScale: 0.4,
        description: "Planète naine de forme oblongue très allongée comme un ballon de rugby en raison de sa vitesse de rotation effrénée (moins de 4 heures). Elle possède son propre système d'anneaux.",
        elements: {
            a: 43.13,
            e: 0.191,
            i: 28.19,
            om: 121.9,
            w: 239.2,
            ma: 218.4,
            epoch: 2459000.5
        }
    },

    makemake: {
        id: 'makemake',
        name: '136472 Makemake',
        latinName: 'Makemake',
        type: 'dwarf_planet',
        typeLabel: 'Planète Naine (Ceinture de Kuiper)',
        color: '#ffab91',
        orbitColor: 'rgba(255, 171, 145, 0.5)',
        radiusKm: 715.0,
        rotationPeriodHours: 22.83,
        orbitalPeriodDays: 112897.0, // ~309 ans
        semiMajorAxisAU: 45.43,
        visualSizeScale: 0.4,
        description: "Troisième plus grande planète naine connue, située dans la ceinture de Kuiper. Sa surface est recouverte de méthane, d'éthane et d'azote gelés lui conférant une teinte orangée.",
        elements: {
            a: 45.43,
            e: 0.158,
            i: 28.98,
            om: 79.6,
            w: 295.0,
            ma: 167.3,
            epoch: 2459000.5
        }
    },

    sedna: {
        id: 'sedna',
        name: '90377 Sedna',
        latinName: 'Sedna',
        type: 'dwarf_planet',
        typeLabel: 'Objet Détaché / Nuage d\'Oort Interne',
        color: '#e57373',
        orbitColor: 'rgba(229, 115, 115, 0.5)',
        radiusKm: 498.0,
        orbitalPeriodDays: 4160000.0, // ~11 400 ans !
        semiMajorAxisAU: 506.0,
        visualSizeScale: 0.35,
        description: "L'un des corps les plus distants connus du système solaire, circulant sur une orbite prodigieusement excentrique qui l'amène jusqu'à près de 1 000 UA du Soleil. L'un des objets les plus rouges du système.",
        elements: {
            a: 506.0,
            e: 0.855,
            i: 11.93,
            om: 144.5,
            w: 311.4,
            ma: 358.1,
            epoch: 2459000.5
        }
    },

    // --- ASTÉROÏDES MAJEURS & GÉOCROISEURS HISTORIQUES ---
    vesta: {
        id: 'vesta',
        name: '4 Vesta',
        latinName: 'Vesta',
        type: 'asteroid',
        subType: 'main_belt',
        typeLabel: 'Astéroïde Majeur (Ceinture Principale)',
        color: '#dcdcdc',
        orbitColor: 'rgba(220, 220, 220, 0.45)',
        radiusKm: 262.7,
        orbitalPeriodDays: 1325.7, // 3.63 ans
        semiMajorAxisAU: 2.362,
        visualSizeScale: 0.3,
        description: "Deuxième corps le plus massif de la ceinture d'astéroïdes. Vesta possède un noyau métallique différencié et un cratère géant (Rheasilvia) à son pôle sud résultant d'un impact colossal.",
        elements: {
            a: 2.362,
            e: 0.089,
            i: 7.14,
            om: 103.8,
            w: 151.2,
            ma: 118.4,
            epoch: 2459000.5
        }
    },

    pallas: {
        id: 'pallas',
        name: '2 Pallas',
        latinName: 'Pallas',
        type: 'asteroid',
        subType: 'main_belt',
        typeLabel: 'Astéroïde Majeur (Ceinture Principale)',
        color: '#b0bec5',
        orbitColor: 'rgba(176, 190, 197, 0.45)',
        radiusKm: 256.0,
        orbitalPeriodDays: 1686.0,
        semiMajorAxisAU: 2.772,
        visualSizeScale: 0.3,
        description: "Deuxième astéroïde découvert par Heinrich Olbers en 1802. Il se distingue par une inclinaison orbitale remarquablement forte de 34,8° par rapport au plan des planètes.",
        elements: {
            a: 2.772,
            e: 0.231,
            i: 34.84,
            om: 173.1,
            w: 310.2,
            ma: 96.2,
            epoch: 2459000.5
        }
    },

    hygiea: {
        id: 'hygiea',
        name: '10 Hygiea',
        latinName: 'Hygiea',
        type: 'asteroid',
        subType: 'main_belt',
        typeLabel: 'Astéroïde Majeur (Ceinture Principale)',
        color: '#78909c',
        orbitColor: 'rgba(120, 144, 156, 0.45)',
        radiusKm: 217.0,
        orbitalPeriodDays: 2034.0,
        semiMajorAxisAU: 3.142,
        visualSizeScale: 0.28,
        description: "Quatrième plus grand astéroïde en volume et en masse. Les observations de l'instrument SPHERE du VLT ont montré qu'il est presque parfaitement sphérique.",
        elements: {
            a: 3.142,
            e: 0.112,
            i: 3.83,
            om: 283.2,
            w: 312.3,
            ma: 242.1,
            epoch: 2459000.5
        }
    },

    psyche: {
        id: 'psyche',
        name: '16 Psyché',
        latinName: 'Psyche',
        type: 'asteroid',
        subType: 'main_belt',
        typeLabel: 'Astéroïde Métallique M-type (Mission NASA Psyche)',
        color: '#ffd700',
        orbitColor: 'rgba(255, 215, 0, 0.55)',
        radiusKm: 113.0,
        orbitalPeriodDays: 1822.0,
        semiMajorAxisAU: 2.924,
        visualSizeScale: 0.25,
        description: "Astéroïde métallique unique composé principalement de fer et de nickel, probablement le vestige du noyau d'un embryon planétaire détruit lors d'une collision primitive. La sonde spatiale NASA Psyche est en route pour l'étudier.",
        elements: {
            a: 2.924,
            e: 0.134,
            i: 3.09,
            om: 150.1,
            w: 228.3,
            ma: 34.2,
            epoch: 2459000.5
        }
    },

    apophis: {
        id: 'apophis',
        name: '99942 Apophis',
        latinName: 'Apophis (2004 MN4)',
        type: 'asteroid',
        subType: 'nea_pha',
        typeLabel: 'Astéroïde Géocroiseur Aten (Potentiellement Dangereux - PHA)',
        color: '#ff3366',
        orbitColor: 'rgba(255, 51, 102, 0.75)',
        radiusKm: 0.170, // 340m diamètre
        orbitalPeriodDays: 323.6,
        semiMajorAxisAU: 0.922,
        visualSizeScale: 0.25,
        description: "L'un des géocroiseurs les plus surveillés. Le 13 avril 2029, il frôlera la Terre à seulement 31 600 km de sa surface (plus près que les satellites géostationnaires), visible à l'œil nu depuis l'Europe et l'Afrique !",
        elements: {
            a: 0.922,
            e: 0.191,
            i: 3.34,
            om: 204.0,
            w: 127.0,
            ma: 175.0,
            epoch: 2461200.5
        }
    },

    bennu: {
        id: 'bennu',
        name: '101955 Bennu',
        latinName: 'Bennu (1999 RQ36)',
        type: 'asteroid',
        subType: 'nea_pha',
        typeLabel: 'Astéroïde Géocroiseur Apollon (Mission OSIRIS-REx)',
        color: '#ff5722',
        orbitColor: 'rgba(255, 87, 34, 0.75)',
        radiusKm: 0.245, // 490m
        orbitalPeriodDays: 436.6,
        semiMajorAxisAU: 1.126,
        visualSizeScale: 0.25,
        description: "Astéroïde carboné riche en matière organique et eau piégée. La sonde NASA OSIRIS-REx s'est posée à sa surface en 2020 et a ramené avec succès des échantillons sur Terre en septembre 2023.",
        elements: {
            a: 1.126,
            e: 0.204,
            i: 6.03,
            om: 2.06,
            w: 66.2,
            ma: 101.7,
            epoch: 2459000.5
        }
    },

    ryugu: {
        id: 'ryugu',
        name: '162173 Ryugu',
        latinName: 'Ryugu (1999 JU3)',
        type: 'asteroid',
        subType: 'nea_pha',
        typeLabel: 'Astéroïde Géocroiseur Apollon (Mission Hayabusa2)',
        color: '#ff7043',
        orbitColor: 'rgba(255, 112, 67, 0.75)',
        radiusKm: 0.435, // 870m
        orbitalPeriodDays: 474.0,
        semiMajorAxisAU: 1.190,
        visualSizeScale: 0.25,
        description: "Astéroïde géocroiseur en forme de toupie visité par la sonde japonaise Hayabusa2. Des acides aminés et des molécules prébiotiques y ont été identifiés dans les échantillons ramenés sur Terre.",
        elements: {
            a: 1.190,
            e: 0.190,
            i: 5.88,
            om: 251.6,
            w: 211.4,
            ma: 114.2,
            epoch: 2459000.5
        }
    },

    didymos: {
        id: 'didymos',
        name: '65803 Didymos',
        latinName: 'Didymos (1996 GT)',
        type: 'asteroid',
        subType: 'nea_binary',
        typeLabel: 'Système Binaire Géocroiseur Amor (Mission DART / HERA)',
        color: '#ff9800',
        orbitColor: 'rgba(255, 152, 0, 0.75)',
        radiusKm: 0.39, // 780m
        orbitalPeriodDays: 770.0,
        semiMajorAxisAU: 1.644,
        visualSizeScale: 0.25,
        description: "Cible de la mission historique de défense planétaire NASA DART. Le 26 septembre 2022, un impacteur cinétique a percuté avec succès son satellite Dimorphos pour dévier sa trajectoire orbitale.",
        elements: {
            a: 1.644,
            e: 0.384,
            i: 3.41,
            om: 73.2,
            w: 319.3,
            ma: 288.7,
            epoch: 2459000.5
        }
    },

    eros: {
        id: 'eros',
        name: '433 Éros',
        latinName: 'Eros',
        type: 'asteroid',
        subType: 'nea_amor',
        typeLabel: 'Astéroïde Géocroiseur Amor (Premier atterrissage NEAR)',
        color: '#ffb74d',
        orbitColor: 'rgba(255, 183, 77, 0.65)',
        radiusKm: 8.4, // 34 × 11 × 11 km
        orbitalPeriodDays: 643.0,
        semiMajorAxisAU: 1.458,
        visualSizeScale: 0.25,
        description: "Le premier astéroïde géocroiseur découvert (1898) et le premier autour duquel une sonde s'est mise en orbite puis s'est posée en 2001 (NEAR Shoemaker).",
        elements: {
            a: 1.458,
            e: 0.223,
            i: 10.83,
            om: 304.3,
            w: 178.8,
            ma: 310.2,
            epoch: 2459000.5
        }
    },

    toutatis: {
        id: 'toutatis',
        name: '4179 Toutatis',
        latinName: 'Toutatis',
        type: 'asteroid',
        subType: 'nea_apollo',
        typeLabel: 'Astéroïde Géocroiseur Apollon / Alinda',
        color: '#f06292',
        orbitColor: 'rgba(240, 98, 146, 0.65)',
        radiusKm: 2.2, // Bilobé 4.5 × 2.4 km
        orbitalPeriodDays: 1463.0,
        semiMajorAxisAU: 2.531,
        visualSizeScale: 0.25,
        description: "Astéroïde allongé bilobé en rotation chaotique sans axe principal fixe. Il s'approche régulièrement de la Terre et a été survolé en 2012 par la sonde chinoise Chang'e 2.",
        elements: {
            a: 2.531,
            e: 0.629,
            i: 0.45,
            om: 128.2,
            w: 278.8,
            ma: 120.4,
            epoch: 2459000.5
        }
    },

    chiron: {
        id: 'chiron',
        name: '2060 Chiron',
        latinName: 'Chiron (95P/Chiron)',
        type: 'centaur',
        subType: 'centaur',
        typeLabel: 'Centaure / Comète Périodique',
        color: '#81d4fa',
        orbitColor: 'rgba(129, 212, 250, 0.65)',
        radiusKm: 109.0,
        orbitalPeriodDays: 18429.0, // ~50.5 ans
        semiMajorAxisAU: 13.68,
        visualSizeScale: 0.26,
        description: "Le premier Centaure découvert (1977), oscillant entre l'orbite de Saturne et celle d'Uranus. Il présente à la fois des caractéristiques d'astéroïde et de comète active avec coma.",
        elements: {
            a: 13.68,
            e: 0.381,
            i: 6.93,
            om: 209.3,
            w: 339.6,
            ma: 72.1,
            epoch: 2459000.5
        }
    },

    halley: {
        id: 'halley',
        name: '1P/Halley',
        latinName: 'Comet Halley',
        type: 'comet',
        subType: 'halley_type',
        typeLabel: 'Comète Périodique Rétrograde',
        color: '#00e5ff',
        orbitColor: 'rgba(0, 229, 255, 0.75)',
        radiusKm: 5.5, // 15 × 8 km
        orbitalPeriodDays: 27500.0, // ~75.3 ans
        semiMajorAxisAU: 17.83,
        visualSizeScale: 0.25,
        description: "La plus célèbre comète de l'histoire, visible tous les 75 à 76 ans. Son dernier passage remonte à 1986 et son prochain périhélie aura lieu le 28 juillet 2061.",
        elements: {
            a: 17.83,
            e: 0.967,
            i: 162.26, // Rétrograde
            om: 58.42,
            w: 111.33,
            ma: 38.3,
            epoch: 2449400.5
        }
    },

    oumuamua: {
        id: 'oumuamua',
        name: '1I/\'Oumuamua',
        latinName: '1I/2017 U1',
        type: 'interstellar',
        subType: 'interstellar',
        typeLabel: 'Objet Interstellaire Hyperbolique',
        color: '#e040fb',
        orbitColor: 'rgba(224, 64, 251, 0.85)',
        radiusKm: 0.1, // ~200m forme de cigare
        orbitalPeriodDays: 0, // Hyperbolique (e > 1)
        semiMajorAxisAU: -1.27, // Axe négatif hyperbolique
        visualSizeScale: 0.25,
        description: "Le tout premier objet interstellaire confirmé ayant traversé notre Système Solaire en octobre 2017. Son excentricité de 1,20 et son accélération non-gravitationnelle atypique ont suscité un vif intérêt scientifique mondial.",
        elements: {
            a: -1.27,
            e: 1.20,
            i: 122.7,
            om: 24.6,
            w: 241.8,
            ma: 45.0,
            epoch: 2458080.5
        }
    }
};

// Liste des astéroïdes pour filtres rapides et suggestions de recherche
export const FAMOUS_ASTEROIDS_LIST = [
    { id: 'apophis', name: '99942 Apophis', type: 'Géocroiseur PHA' },
    { id: 'bennu', name: '101955 Bennu', type: 'Géocroiseur (OSIRIS-REx)' },
    { id: 'ryugu', name: '162173 Ryugu', type: 'Géocroiseur (Hayabusa2)' },
    { id: 'didymos', name: '65803 Didymos', type: 'Système Binaire (DART)' },
    { id: 'vesta', name: '4 Vesta', type: 'Ceinture Principale' },
    { id: 'pallas', name: '2 Pallas', type: 'Ceinture Principale' },
    { id: 'hygiea', name: '10 Hygiea', type: 'Ceinture Principale' },
    { id: 'psyche', name: '16 Psyché', type: 'Métallique (Mission Psyche)' },
    { id: 'eros', name: '433 Éros', type: 'Amor (NEAR)' },
    { id: 'toutatis', name: '4179 Toutatis', type: 'Apollon' },
    { id: 'chiron', name: '2060 Chiron', type: 'Centaure' },
    { id: 'halley', name: '1P/Halley', type: 'Comète Périodique' },
    { id: 'oumuamua', name: '1I/\'Oumuamua', type: 'Interstellaire' },
    { id: 'ceres', name: '1 Cérès', type: 'Planète Naine' },
    { id: 'pluto', name: 'Pluton', type: 'Planète Naine' },
    { id: 'eris', name: '136199 Éris', type: 'Planète Naine' },
    { id: 'haumea', name: '136108 Haumea', type: 'Planète Naine' },
    { id: 'makemake', name: '136472 Makemake', type: 'Planète Naine' },
    { id: 'sedna', name: '90377 Sedna', type: 'Nuage d\'Oort' }
];

