/**
 * asteroidBelt.js
 * Rendu GPU ultra-performant de nuages massifs d'astéroïdes réels et distribués :
 * - Ceinture Principale (avec lacunes de Kirkwood)
 * - Astéroïdes Troyens de Jupiter (points L4 et L5)
 * - Astéroïdes Géocroiseurs (NEAs - Atira, Aten, Apollon, Amor)
 * - Ceinture de Kuiper (objets transneptuniens)
 */

import * as THREE from 'three';

export class AsteroidBeltsManager {
    constructor(scene) {
        this.scene = scene;
        this.clouds = {};
        this.visibleCategories = {
            mainBelt: true,
            trojans: true,
            neas: true,
            kuiper: true
        };
        this.totalAsteroidCount = 0;
        this.initAllBelts();
    }

    initAllBelts() {
        // 1. Ceinture Principale (~22 000 astéroïdes)
        this.clouds.mainBelt = this.createBeltGroup({
            count: 22000,
            color: new THREE.Color(0xd0d0d8),
            size: 1.6,
            generateParams: (i, count) => {
                // Évite les lacunes de Kirkwood (2.5 AU, 2.82 AU, 3.28 AU)
                let a = 2.1 + Math.random() * 1.2;
                while (
                    (a > 2.48 && a < 2.52) || // Résonance 3:1
                    (a > 2.80 && a < 2.84) || // Résonance 5:2
                    (a > 2.94 && a < 2.98)    // Résonance 7:3
                ) {
                    a = 2.1 + Math.random() * 1.2;
                }
                const e = 0.04 + Math.random() * 0.16;
                const inc = (Math.random() * 18.0) * (Math.PI / 180);
                const om = Math.random() * Math.PI * 2;
                const w = Math.random() * Math.PI * 2;
                const m0 = Math.random() * Math.PI * 2;
                return { a, e, inc, om, w, m0 };
            }
        });

        // 2. Troyens de Jupiter (~4 000 astéroïdes aux points L4 et L5)
        this.clouds.trojans = this.createBeltGroup({
            count: 4000,
            color: new THREE.Color(0x80deea),
            size: 1.8,
            generateParams: (i, count) => {
                const a = 5.2 + (Math.random() - 0.5) * 0.35;
                const e = 0.03 + Math.random() * 0.12;
                const inc = (Math.random() * 22.0) * (Math.PI / 180);
                const om = Math.random() * Math.PI * 2;
                const w = Math.random() * Math.PI * 2;
                // Décalage L4 (+60°) ou L5 (-60°) avec libration gaussienne
                const lagrangeOffset = (i % 2 === 0 ? 60 : -60) * (Math.PI / 180);
                const libration = (Math.random() - 0.5) * 0.45;
                const m0 = lagrangeOffset + libration;
                return { a, e, inc, om, w, m0, isTrojan: true };
            }
        });

        // 3. Géocroiseurs / Near-Earth Asteroids (~3 000 astéroïdes)
        this.clouds.neas = this.createBeltGroup({
            count: 3000,
            color: new THREE.Color(0xff5252), // Teinte rouge/ambre d'alerte
            size: 2.0,
            generateParams: (i, count) => {
                // Types Aten (a < 1.0) et Apollon/Amor (1.0 < a < 2.1)
                const isAten = Math.random() < 0.3;
                const a = isAten ? 0.75 + Math.random() * 0.23 : 1.05 + Math.random() * 0.95;
                const e = 0.15 + Math.random() * 0.45; // Très excentriques
                const inc = (Math.random() * 26.0) * (Math.PI / 180);
                const om = Math.random() * Math.PI * 2;
                const w = Math.random() * Math.PI * 2;
                const m0 = Math.random() * Math.PI * 2;
                return { a, e, inc, om, w, m0, isNea: true };
            }
        });

        // 4. Ceinture de Kuiper (~8 000 astéroïdes et corps transneptuniens)
        this.clouds.kuiper = this.createBeltGroup({
            count: 8000,
            color: new THREE.Color(0x90caf9),
            size: 1.5,
            generateParams: (i, count) => {
                const a = 30.0 + Math.random() * 22.0;
                const e = 0.02 + Math.random() * 0.25;
                const inc = (Math.random() * 32.0) * (Math.PI / 180);
                const om = Math.random() * Math.PI * 2;
                const w = Math.random() * Math.PI * 2;
                const m0 = Math.random() * Math.PI * 2;
                return { a, e, inc, om, w, m0 };
            }
        });

        this.totalAsteroidCount = 22000 + 4000 + 3000 + 8000;
    }

    /**
     * Crée un système de particules THREE.Points optimisé
     */
    createBeltGroup({ count, color, size, generateParams }) {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const paramsList = [];

        for (let i = 0; i < count; i++) {
            const p = generateParams(i, count);
            paramsList.push(p);

            // Légère variation de teinte individuelle
            const variation = (Math.random() - 0.5) * 0.15;
            colors[i * 3] = Math.min(1, Math.max(0, color.r + variation));
            colors[i * 3 + 1] = Math.min(1, Math.max(0, color.g + variation));
            colors[i * 3 + 2] = Math.min(1, Math.max(0, color.b + variation));
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Texture de particule ronde et douce
        const particleTexture = this.generateParticleTexture();

        const material = new THREE.PointsMaterial({
            size: size,
            sizeAttenuation: true,
            map: particleTexture,
            transparent: true,
            opacity: 0.85,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        return {
            points,
            paramsList,
            count
        };
    }

    /**
     * Génère une texture circulaire radiale lumineuse pour les particules
     */
    generateParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.3, 'rgba(230, 240, 255, 0.8)');
        grad.addColorStop(0.7, 'rgba(180, 200, 255, 0.3)');
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = true;
        return texture;
    }

    /**
     * Met à jour la position orbitale de chaque astéroïde selon l'équation de Kepler
     * @param {number} jd Date Julienne courante
     * @param {number} scaleFactor Facteur d'échelle de rendu
     * @param {number} jupiterMeanAnomaly Anomalie moyenne de Jupiter pour synchroniser les Troyens
     */
    update(jd, scaleFactor = 10, jupiterMeanAnomaly = 0) {
        // Jours depuis J2000.0
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

                // Moyen mouvement n (rad/jour) : n = 2 * PI / (a^1.5 * 365.25)
                const n = (2.0 * Math.PI) / (Math.pow(a, 1.5) * 365.2568983);
                
                let M = p.m0 + n * days;
                if (p.isTrojan) {
                    // Les Troyens accompagnent Jupiter avec leur écart orbital
                    M = jupiterMeanAnomaly + p.m0 + Math.sin(days * 0.001) * 0.08;
                }
                M = M % (2 * Math.PI);
                if (M < 0) M += 2 * Math.PI;

                // Approximation rapide et efficace de l'anomalie excentrique E
                let E = M + e * Math.sin(M);
                for (let iter = 0; iter < 2; iter++) {
                    E = E - (E - e * Math.sin(E) - M) / (1.0 - e * Math.cos(E));
                }

                // Coordonnées dans le plan orbital
                const xOrb = a * (Math.cos(E) - e);
                const yOrb = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);

                // Rotation képlérienne 3D
                const cosOm = Math.cos(p.om);
                const sinOm = Math.sin(p.om);
                const cosW = Math.cos(p.w);
                const sinW = Math.sin(p.w);
                const cosI = Math.cos(p.inc);
                const sinI = Math.sin(p.inc);

                const Px = cosOm * cosW - sinOm * sinW * cosI;
                const Py = sinOm * cosW + cosOm * sinW * cosI;
                const Pz = sinW * sinI;

                const Qx = -cosOm * sinW - sinOm * cosW * cosI;
                const Qy = -sinOm * sinW + cosOm * cosW * cosI;
                const Qz = cosW * sinI;

                const eclipticX = xOrb * Px + yOrb * Qx;
                const eclipticY = xOrb * Py + yOrb * Qy;
                const eclipticZ = xOrb * Pz + yOrb * Qz;

                // Coordonnées Three.js (X = eclipticX, Y = eclipticZ, Z = eclipticY)
                const idx = i * 3;
                posArray[idx] = eclipticX * scaleFactor;
                posArray[idx + 1] = eclipticZ * scaleFactor;
                posArray[idx + 2] = eclipticY * scaleFactor;
            }

            posAttr.needsUpdate = true;
        }
    }

    /**
     * Active/désactive une catégorie d'astéroïdes
     */
    toggleCategory(categoryName, isVisible) {
        if (this.visibleCategories.hasOwnProperty(categoryName)) {
            this.visibleCategories[categoryName] = isVisible;
            if (this.clouds[categoryName]) {
                this.clouds[categoryName].points.visible = isVisible;
            }
        }
    }

    /**
     * Ajuste la taille des points des astéroïdes
     */
    setPointSize(scale) {
        for (const key of Object.keys(this.clouds)) {
            if (this.clouds[key] && this.clouds[key].points) {
                this.clouds[key].points.material.size = (key === 'neas' ? 2.0 : 1.5) * scale;
            }
        }
    }
}

