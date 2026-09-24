/**
 * astronomy.js
 * Moteur de calcul astronomique képlérien de haute précision
 * Basé sur les éphémérides analytiques NASA JPL (Standish / Simon et al.)
 */

export const AU_TO_KM = 149597870.7; // 1 Unité Astronomique en km
export const G_SUN = 1.32712440018e11; // Paramètre gravitationnel héliocentrique km^3/s^2

/**
 * Convertit une date standard JavaScript (Date) en Date Julienne (JD)
 * @param {Date} date 
 * @returns {number} Julian Date
 */
export function toJulianDate(date) {
    const time = date.getTime();
    return (time / 86400000.0) + 2440587.5;
}

/**
 * Convertit une Date Julienne (JD) en date JavaScript
 * @param {number} jd 
 * @returns {Date}
 */
export function fromJulianDate(jd) {
    const time = (jd - 2440587.5) * 86400000.0;
    return new Date(time);
}

/**
 * Normalise un angle en degrés dans l'intervalle [0, 360[
 */
export function normalizeDeg(deg) {
    let d = deg % 360;
    if (d < 0) d += 360;
    return d;
}

/**
 * Normalise un angle en radians dans l'intervalle [0, 2*PI[
 */
export function normalizeRad(rad) {
    const twoPi = 2 * Math.PI;
    let r = rad % twoPi;
    if (r < 0) r += twoPi;
    return r;
}

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

/**
 * Résout l'équation de Kepler : M = E - e * sin(E)
 * par méthode itérative de Newton-Raphson
 * @param {number} M Anomalie moyenne (en radians)
 * @param {number} e Excentricité orbitale
 * @returns {number} Anomalie excentrique E (en radians)
 */
export function solveKepler(M, e) {
    M = normalizeRad(M);
    // Approximation initiale de E
    let E = e > 0.8 ? Math.PI : M;
    const tolerance = 1e-8;
    const maxIterations = 30;

    for (let i = 0; i < maxIterations; i++) {
        const delta = E - e * Math.sin(E) - M;
        if (Math.abs(delta) < tolerance) break;
        const derivative = 1 - e * Math.cos(E);
        E = E - delta / derivative;
    }
    return E;
}

/**
 * Calcule la position 3D héliocentrique (en AU) à une date julienne JD donnée
 * à partir des 6 éléments képlériens standard
 * @param {Object} elements { a, e, i, om, w, ma, epoch, n }
 *        a: demi-grand axe (AU)
 *        e: excentricité
 *        i: inclinaison (degrés)
 *        om: longitude du nœud ascendant (degrés)
 *        w: argument du périhélie (degrés)
 *        ma: anomalie moyenne à l'époque (degrés)
 *        epoch: date julienne de l'époque (ex: 2451545.0 pour J2000.0)
 *        n: moyen mouvement (degrés/jour, facultatif : déduit de a si omis)
 * @param {number} jd Date julienne cible
 * @returns {Object} { x, y, z, r, v, trueAnomaly } où x, y, z sont en UA (système Three.js : X=ecliptic X, Y=tilt/Z, Z=ecliptic Y)
 */
export function calculateKeplerianPosition(elements, jd) {
    const a = elements.a;
    const e = elements.e;
    const iRad = elements.i * DEG2RAD;
    const omRad = (elements.om || 0) * DEG2RAD; // Longitude nœud ascendant
    const wRad = (elements.w || 0) * DEG2RAD;   // Argument périhélie

    // Époque de référence
    const epoch = elements.epoch || 2451545.0; // J2000 par défaut
    const dt = jd - epoch; // Jours écoulés depuis l'époque

    // Moyen mouvement n (deg/jour)
    let n = elements.n;
    if (n === undefined || n === null) {
        // n = 360 / Période (en jours) selon 3ème loi de Kepler : P = a^(3/2) années
        const periodDays = Math.pow(a, 1.5) * 365.2568983;
        n = 360.0 / periodDays;
    }

    // Anomalie moyenne à la date JD
    const M_deg = normalizeDeg(elements.ma + n * dt);
    const M_rad = M_deg * DEG2RAD;

    // Résolution de Kepler pour obtenir l'anomalie excentrique E
    const E_rad = solveKepler(M_rad, e);

    // Anomalie vraie nu (True Anomaly)
    const sinNu = (Math.sqrt(1 - e * e) * Math.sin(E_rad)) / (1 - e * Math.cos(E_rad));
    const cosNu = (Math.cos(E_rad) - e) / (1 - e * Math.cos(E_rad));
    const nuRad = Math.atan2(sinNu, cosNu);

    // Distance héliocentrique r en UA
    const r = a * (1 - e * Math.cos(E_rad));

    // Coordonnées dans le plan orbital
    const xPrime = r * Math.cos(nuRad);
    const yPrime = r * Math.sin(nuRad);

    // Matrice de rotation vers le plan écliptique standard J2000
    // Rotation par w (argument périhélie), i (inclinaison), om (nœud ascendant)
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

    // Coordonnées écliptiques cartésiennes (en UA)
    const eclipticX = xPrime * Px + yPrime * Qx;
    const eclipticY = xPrime * Py + yPrime * Qy;
    const eclipticZ = xPrime * Pz + yPrime * Qz;

    // Vitesse orbitale instantanée (vis-viva equation) v = sqrt(GM * (2/r - 1/a)) en km/s
    const r_km = r * AU_TO_KM;
    const a_km = a * AU_TO_KM;
    const velocityKmS = Math.sqrt(Math.max(0, G_SUN * (2.0 / r_km - 1.0 / a_km)));

    // Mapping vers coordonnées Three.js :
    // Three.js X = eclipticX
    // Three.js Y = eclipticZ (composante verticale perpendiculaire au plan écliptique)
    // Three.js Z = eclipticY
    return {
        x: eclipticX,
        y: eclipticZ,
        z: eclipticY,
        r: r,
        v: velocityKmS,
        trueAnomaly: normalizeDeg(nuRad * RAD2DEG),
        eclipticCoords: { x: eclipticX, y: eclipticY, z: eclipticZ }
    };
}

/**
 * Calcule les positions précises pour les 8 planètes majeures avec taux séculaires NASA Standish J2000
 * @param {Object} planetData Données avec paramètres de base et variations séculaires
 * @param {number} jd Date julienne cible
 * @returns {Object} Coordonnées 3D et vitesse
 */
export function calculateMajorPlanetPosition(planetData, jd) {
    const T = (jd - 2451545.0) / 36525.0; // Siècles juliens depuis J2000.0

    const a = planetData.a0 + (planetData.aDot || 0) * T;
    const e = planetData.e0 + (planetData.eDot || 0) * T;
    const i = planetData.i0 + (planetData.iDot || 0) * T;
    const L = normalizeDeg(planetData.L0 + (planetData.LDot || 0) * T);
    const varpi = normalizeDeg(planetData.varpi0 + (planetData.varpiDot || 0) * T);
    const om = normalizeDeg(planetData.om0 + (planetData.omDot || 0) * T);

    const w = normalizeDeg(varpi - om);
    const ma = normalizeDeg(L - varpi);

    const elements = {
        a: a,
        e: e,
        i: i,
        om: om,
        w: w,
        ma: ma,
        epoch: jd, // ma a déjà été projetée à la date jd via L
        n: 0       // pas de décalage supplémentaire
    };

    return calculateKeplerianPosition(elements, jd);
}

/**
 * Génère un tableau de points 3D (vecteurs) pour tracer l'orbite complète d'un astre
 * @param {Object} elements 
 * @param {number} segments Nombre d'échantillons (ex: 120)
 * @returns {Array<{x:number, y:number, z:number}>}
 */
export function generateOrbitPath(elements, segments = 128) {
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
        // x' = a * (cos E - e)
        // y' = a * sqrt(1 - e^2) * sin E
        const xPrime = a * (Math.cos(E_rad) - e);
        const yPrime = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E_rad);

        const x = xPrime * Px + yPrime * Qx;
        const y = xPrime * Py + yPrime * Qy;
        const z = xPrime * Pz + yPrime * Qz;

        // Three.js coord: (x, z, y)
        path.push({ x: x, y: z, z: y });
    }

    return path;
}

