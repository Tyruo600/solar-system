/**
 * nasaJplApi.js
 * Intégration de l'API officielle NASA JPL Small-Body Database (SBDB)
 * Permet d'interroger et d'afficher n'importe lequel des 1 300 000+ astéroïdes et comètes répertoriés
 */

export class NasaJplService {
    constructor() {
        this.baseUrl = 'https://ssd-api.jpl.nasa.gov/sbdb.api';
        this.cache = new Map();
    }

    /**
     * Recherche un astéroïde ou une comète par son nom, numéro ou désignation provisoire
     * @param {string} query Ex: "99942", "Apophis", "2024 YR4", "Florence", "Halley"
     * @returns {Promise<Object>} Données orbitales et physiques prêtes pour le moteur 3D
     */
    async searchSmallBody(query) {
        const cleanQuery = query.trim();
        if (!cleanQuery) return null;

        if (this.cache.has(cleanQuery.toLowerCase())) {
            return this.cache.get(cleanQuery.toLowerCase());
        }

        const targetUrl = `${this.baseUrl}?sstr=${encodeURIComponent(cleanQuery)}&phys-par=1`;

        let data = null;

        // 1. Essai de requête directe
        try {
            const res = await fetch(targetUrl);
            if (res.ok) {
                data = await res.json();
            }
        } catch (corsErr) {
            console.warn('[NASA JPL] Requête directe restreinte par CORS, tentative via proxy sécurisé...');
        }

        // 2. Fallback automatique via proxy CORS public si nécessaire
        if (!data) {
            const proxies = [
                `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
                `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
            ];

            for (const proxyUrl of proxies) {
                try {
                    const res = await fetch(proxyUrl);
                    if (res.ok) {
                        data = await res.json();
                        break;
                    }
                } catch (e) {
                    console.warn('[NASA JPL Proxy error]', e);
                }
            }
        }

        if (!data || !data.orbit || !data.orbit.elements) {
            throw new Error(`Aucun corps céleste trouvé sous la désignation "${cleanQuery}" auprès du JPL.`);
        }

        const parsed = this.parseJplResponse(data);
        this.cache.set(cleanQuery.toLowerCase(), parsed);
        this.cache.set(parsed.id.toLowerCase(), parsed);
        return parsed;
    }

    /**
     * Parse et convertit les éléments bruts du JPL en structure normalisée pour la simulation
     */
    parseJplResponse(data) {
        const obj = data.object || {};
        const orbit = data.orbit || {};
        const elementsList = orbit.elements || [];

        // Récupération des éléments képlériens
        const elMap = {};
        for (const el of elementsList) {
            elMap[el.name] = parseFloat(el.value);
        }

        const epoch = parseFloat(orbit.epoch) || 2451545.0;
        const a = elMap['a'] || (elMap['q'] ? elMap['q'] / (1 - (elMap['e'] || 0)) : 1.0);
        const e = elMap['e'] !== undefined ? elMap['e'] : 0.0;
        const i = elMap['i'] !== undefined ? elMap['i'] : 0.0;
        const om = elMap['om'] !== undefined ? elMap['om'] : 0.0;
        const w = elMap['w'] !== undefined ? elMap['w'] : 0.0;
        const ma = elMap['ma'] !== undefined ? elMap['ma'] : 0.0;
        const n = elMap['n'] !== undefined ? elMap['n'] : undefined;
        const per = elMap['per'] !== undefined ? elMap['per'] : Math.pow(Math.abs(a), 1.5) * 365.25;

        // Paramètres physiques
        let diameterKm = null;
        let rotPeriodHours = null;
        let albedo = null;
        let specType = null;

        if (data.phys_par) {
            for (const p of data.phys_par) {
                if (p.name === 'diameter') diameterKm = parseFloat(p.value);
                if (p.name === 'rot_per') rotPeriodHours = parseFloat(p.value);
                if (p.name === 'albedo') albedo = parseFloat(p.value);
                if (p.name === 'spec_B' || p.name === 'spec_T') specType = p.value;
            }
        }

        const isPha = !!obj.pha;
        const isNeo = !!obj.neo;
        const orbitClass = obj.orbit_class ? obj.orbit_class.name : 'Astéroïde';

        const id = 'jpl_' + (obj.spkid || obj.des || Math.random().toString(36).substr(2, 9));
        const displayName = obj.fullname || obj.shortname || `Astéroïde ${obj.des}`;

        return {
            id: id,
            name: displayName,
            shortName: obj.shortname || obj.des || displayName,
            latinName: obj.des || '',
            type: 'asteroid_custom',
            typeLabel: `${orbitClass} ${isPha ? '⚠️ Géocroiseur Potentiellement Dangereux (PHA)' : isNeo ? '🛸 Géocroiseur (NEO)' : ''}`,
            color: isPha ? '#ff1744' : isNeo ? '#ff9100' : '#00e5ff',
            orbitColor: isPha ? 'rgba(255, 23, 68, 0.8)' : isNeo ? 'rgba(255, 145, 0, 0.7)' : 'rgba(0, 229, 255, 0.7)',
            radiusKm: diameterKm ? diameterKm / 2 : 1.0,
            massKg: 'Non mesuré directement',
            orbitalPeriodDays: per,
            rotationPeriodHours: rotPeriodHours,
            albedo: albedo,
            spectralClass: specType || 'Inconnue',
            semiMajorAxisAU: a,
            visualSizeScale: 0.25,
            isJplQueried: true,
            description: `Objet répertorié au catalogue JPL/SSD de la NASA (ID SPK: ${obj.spkid || 'N/A'}). Classe orbitale : ${orbitClass}. Périhélie : ${(elMap['q'] || 0).toFixed(3)} UA, Aphélie : ${(elMap['ad'] || 0).toFixed(3)} UA.`,
            elements: {
                a: a,
                e: e,
                i: i,
                om: om,
                w: w,
                ma: ma,
                epoch: epoch,
                n: n
            }
        };
    }
}

