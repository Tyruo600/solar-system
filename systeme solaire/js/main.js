/**
 * main.js
 * Moteur 3D principal Three.js pour la simulation du Système Solaire en temps réel
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from 'three/addons/libs/tween.module.js';

import { 
    toJulianDate, 
    fromJulianDate, 
    calculateMajorPlanetPosition, 
    calculateKeplerianPosition, 
    generateOrbitPath,
    AU_TO_KM 
} from './astronomy.js';

import { CELESTIAL_BODIES } from './bodiesData.js';
import { AsteroidBeltsManager } from './asteroidBelt.js';
import { NasaJplService } from './nasaJplApi.js';

export class SolarSystemApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Horloge & Contrôle temporel
        this.isLive = true;
        this.isPlaying = true;
        this.timeSpeed = 1.0; // 1 = temps réel (1 sec simu = 1 sec réelle)
        this.currentDate = new Date();
        this.currentJD = toJulianDate(this.currentDate);
        this.lastFrameTime = performance.now();

        // Échelles
        this.scaleMode = 'visual'; // 'visual' ou 'true'
        this.orbitScale = 12.0; // 1 UA = 12 unités Three.js en mode visuel

        // Objets célestes créés
        this.bodyMeshes = new Map(); // id -> { mesh, orbitLine, label, data }
        this.selectedBody = null;
        this.cameraTarget = null;
        this.trackedObject = null; // Objet suivi par la caméra

        // Gestionnaires
        this.beltsManager = null;
        this.jplService = new NasaJplService();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Options d'affichage
        this.showOrbits = true;
        this.showLabels = true;

        // Callbacks UI
        this.onTelemetryUpdate = null;
        this.onBodySelected = null;

        this.init();
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLighting();
        this.createStarfield();

        // Création du Soleil et des corps célestes intégrés
        this.createSun();
        this.createAllBodies();

        // Initialisation des ceintures massives d'astéroïdes
        this.beltsManager = new AsteroidBeltsManager(this.scene);

        // Événements
        window.addEventListener('resize', () => this.onWindowResize());
        this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));

        // Sélection par défaut : Terre
        this.selectBody('earth', false);

        // Lancement de la boucle de rendu
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x020208, 0.0003);
    }

    setupCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500000);
        this.camera.position.set(0, 35, 45); // Vue plongeante initiale
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            logarithmicDepthBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 20000;
        this.controls.maxPolarAngle = Math.PI;
    }

    setupLighting() {
        // Lumière ambiante très douce pour voir la face sombre des corps
        const ambientLight = new THREE.AmbientLight(0x334466, 0.4);
        this.scene.add(ambientLight);

        // Source lumineuse ponctuelle au cœur du Soleil
        const sunLight = new THREE.PointLight(0xffffff, 2.5, 0, 0);
        sunLight.position.set(0, 0, 0);
        this.scene.add(sunLight);
    }

    createStarfield() {
        const starCount = 8000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            // Distribution sphérique lointaine
            const r = 8000 + Math.random() * 4000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // Teintes stellaires réalistes (blanc, bleu chaud, orangé)
            const tint = Math.random();
            if (tint < 0.6) {
                colors[i * 3] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 2] = 1.0;
            } else if (tint < 0.85) {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 2] = 0.6;
            } else {
                colors[i * 3] = 0.7;
                colors[i * 3 + 1] = 0.85;
                colors[i * 3 + 2] = 1.0;
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 2.0,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });

        const starfield = new THREE.Points(geometry, material);
        this.scene.add(starfield);
    }

    /**
     * Crée le Soleil avec texture procédurale en fusion et halo coronale
     */
    createSun() {
        const sunData = CELESTIAL_BODIES.sun;
        const radius = sunData.visualSizeScale;

        // Texture procédurale de plasma solaire
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Dégradé de base
        const grad = ctx.createLinearGradient(0, 0, 512, 256);
        grad.addColorStop(0, '#ff9900');
        grad.addColorStop(0.3, '#ffcc00');
        grad.addColorStop(0.7, '#ff5500');
        grad.addColorStop(1, '#ff8800');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 256);

        // Taches et granulation solaire
        for (let i = 0; i < 300; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 200, 0.2)' : 'rgba(150, 40, 0, 0.25)';
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 256, 1 + Math.random() * 8, 0, Math.PI * 2);
            ctx.fill();
        }

        const sunTexture = new THREE.CanvasTexture(canvas);

        const geometry = new THREE.SphereGeometry(radius, 48, 48);
        const material = new THREE.MeshBasicMaterial({
            map: sunTexture,
            color: 0xffffff
        });

        const sunMesh = new THREE.Mesh(geometry, material);
        sunMesh.userData = { id: 'sun', data: sunData };
        this.scene.add(sunMesh);

        // Halo lumineux coronal (Glow Sprite)
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = 128;
        glowCanvas.height = 128;
        const gCtx = glowCanvas.getContext('2d');
        const gGrad = gCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gGrad.addColorStop(0, 'rgba(255, 240, 180, 1)');
        gGrad.addColorStop(0.2, 'rgba(255, 170, 40, 0.6)');
        gGrad.addColorStop(0.5, 'rgba(255, 80, 10, 0.2)');
        gGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        gCtx.fillStyle = gGrad;
        gCtx.fillRect(0, 0, 128, 128);

        const glowTexture = new THREE.CanvasTexture(glowCanvas);
        const glowMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0xffddaa,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const glowSprite = new THREE.Sprite(glowMaterial);
        glowSprite.scale.set(radius * 4.5, radius * 4.5, 1.0);
        sunMesh.add(glowSprite);

        this.bodyMeshes.set('sun', {
            mesh: sunMesh,
            data: sunData,
            orbitLine: null
        });
    }

    /**
     * Crée tous les corps répertoriés dans bodiesData
     */
    createAllBodies() {
        for (const [id, data] of Object.entries(CELESTIAL_BODIES)) {
            if (id === 'sun') continue;
            this.createBody(data);
        }
    }

    /**
     * Crée un corps céleste individuel et son orbite
     */
    createBody(data) {
        const radius = data.visualSizeScale || 0.4;
        const geometry = new THREE.SphereGeometry(radius, 32, 32);

        // Génération d'une texture de surface procédurale adaptée
        const texture = this.generateBodyTexture(data);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: data.typeLabel && data.typeLabel.includes('Métallique') ? 0.6 : 0.1
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { id: data.id, data: data };

        // Inclinaison axiale
        if (data.axialTiltDeg) {
            mesh.rotation.z = data.axialTiltDeg * (Math.PI / 180);
        }

        // Anneaux si applicables (Saturne, Uranus)
        if (data.rings) {
            this.createRings(mesh, data.rings, radius);
        }

        // Ligne de l'orbite
        const orbitLine = this.createOrbitLine(data);
        if (orbitLine) {
            this.scene.add(orbitLine);
        }

        this.scene.add(mesh);

        this.bodyMeshes.set(data.id, {
            mesh: mesh,
            data: data,
            orbitLine: orbitLine
        });

        return mesh;
    }

    /**
     * Crée les anneaux pour Saturne ou Uranus
     */
    createRings(parentMesh, ringsData, bodyRadius) {
        const inner = bodyRadius * 1.5;
        const outer = bodyRadius * 2.8;
        const ringGeo = new THREE.RingGeometry(inner, outer, 64);
        // Orientation dans le plan équatorial
        ringGeo.rotateX(Math.PI / 2);

        const ringCanvas = document.createElement('canvas');
        ringCanvas.width = 256;
        ringCanvas.height = 1;
        const ctx = ringCanvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.1, 'rgba(210, 195, 160, 0.4)');
        grad.addColorStop(0.5, 'rgba(235, 220, 185, 0.9)');
        grad.addColorStop(0.65, 'rgba(30, 25, 20, 0.1)'); // Division de Cassini
        grad.addColorStop(0.75, 'rgba(215, 200, 165, 0.8)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 1);

        const ringTexture = new THREE.CanvasTexture(ringCanvas);

        const ringMat = new THREE.MeshStandardMaterial({
            map: ringTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });

        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        parentMesh.add(ringMesh);
    }

    /**
     * Génère une texture procédurale réaliste pour un corps céleste
     */
    generateBodyTexture(data) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Fond principal
        ctx.fillStyle = data.color || '#888888';
        ctx.fillRect(0, 0, 256, 128);

        if (data.id === 'earth') {
            // Continents et océans
            ctx.fillStyle = '#1b5e20'; // Terres émergées
            for (let i = 0; i < 40; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * 256, 30 + Math.random() * 68, 8 + Math.random() * 25, 0, Math.PI * 2);
                ctx.fill();
            }
            // Calottes polaires blanches
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 256, 14);
            ctx.fillRect(0, 114, 256, 14);
            // Tourbillons nuageux translucides
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            for (let i = 0; i < 20; i++) {
                ctx.fillRect(Math.random() * 256, Math.random() * 128, 40 + Math.random() * 40, 6 + Math.random() * 10);
            }
        } else if (data.id === 'jupiter' || data.id === 'saturn') {
            // Bandes nuageuses gazeuses
            for (let y = 0; y < 128; y += 4) {
                const shade = Math.sin(y * 0.15) * 20;
                ctx.fillStyle = `rgba(0, 0, 0, ${Math.abs(shade) / 100})`;
                ctx.fillRect(0, y, 256, 4);
            }
            if (data.id === 'jupiter') {
                // Grande Tache Rouge
                ctx.fillStyle = '#b71c1c';
                ctx.beginPath();
                ctx.ellipse(160, 85, 22, 12, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (data.id === 'mars') {
            // Cratères sombres et calottes martiennes
            ctx.fillStyle = 'rgba(90, 25, 10, 0.35)';
            for (let i = 0; i < 35; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * 256, Math.random() * 128, 4 + Math.random() * 16, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#fff0f0';
            ctx.fillRect(0, 0, 256, 8);
            ctx.fillRect(0, 120, 256, 8);
        } else {
            // Astéroïdes / Mercure / Lune : cratères et texture rocheuse
            for (let i = 0; i < 50; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.15)';
                ctx.beginPath();
                ctx.arc(Math.random() * 256, Math.random() * 128, 2 + Math.random() * 12, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    /**
     * Trace la ligne fermée de l'orbite képlérienne
     */
    createOrbitLine(data) {
        let elements = data.elements;
        if (!elements && data.a0) {
            elements = {
                a: data.a0,
                e: data.e0,
                i: data.i0,
                om: data.om0,
                w: (data.varpi0 - data.om0)
            };
        }
        if (!elements || !elements.a) return null;

        const rawPoints = generateOrbitPath(elements, 128);
        const points = rawPoints.map(p => new THREE.Vector3(
            p.x * this.orbitScale,
            p.y * this.orbitScale,
            p.z * this.orbitScale
        ));

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: new THREE.Color(data.color || 0x4fc3f7),
            transparent: true,
            opacity: 0.35,
            linewidth: 1
        });

        const line = new THREE.LineLoop(geometry, material);
        line.userData = { bodyId: data.id };
        return line;
    }

    /**
     * Recherche et ajoute dynamiquement un astéroïde depuis l'API NASA JPL
     */
    async searchAndAddJplAsteroid(query) {
        // Vérifie si déjà chargé
        for (const [id, item] of this.bodyMeshes.entries()) {
            if (
                item.data.name.toLowerCase().includes(query.toLowerCase()) || 
                (item.data.latinName && item.data.latinName.toLowerCase().includes(query.toLowerCase()))
            ) {
                this.selectBody(id, true);
                return item.data;
            }
        }

        const jplData = await this.jplService.searchSmallBody(query);
        if (!jplData) return null;

        // Créer l'objet 3D et l'orbite
        this.createBody(jplData);

        // Sélectionner immédiatement et voler vers lui
        this.selectBody(jplData.id, true);

        return jplData;
    }

    /**
     * Sélectionne un corps céleste et anime la caméra
     */
    selectBody(id, animateCamera = true) {
        const bodyObj = this.bodyMeshes.get(id);
        if (!bodyObj) return;

        this.selectedBody = bodyObj;
        this.trackedObject = bodyObj.mesh;

        if (this.onBodySelected) {
            this.onBodySelected(bodyObj.data);
        }

        if (animateCamera) {
            this.focusCameraOnObject(bodyObj.mesh, bodyObj.data.visualSizeScale || 0.5);
        }
    }

    /**
     * Animation fluide de la caméra vers l'objet avec TWEEN
     */
    focusCameraOnObject(targetMesh, objectRadius) {
        const targetPos = targetMesh.position.clone();
        // Distance proportionnelle à la taille pour un cadrage élégant
        const offsetDist = Math.max(2.5, objectRadius * 6.5);
        const newCamPos = targetPos.clone().add(new THREE.Vector3(offsetDist * 0.7, offsetDist * 0.5, offsetDist * 0.8));

        new TWEEN.Tween(this.camera.position)
            .to(newCamPos, 1500)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();

        new TWEEN.Tween(this.controls.target)
            .to(targetPos, 1500)
            .easing(TWEEN.Easing.Cubic.Out)
            .onUpdate(() => this.controls.update())
            .start();
    }

    /**
     * Événement de clic sur un corps céleste
     */
    onPointerDown(event) {
        // Empêche le clic si l'utilisateur interagit avec l'UI
        if (event.target.tagName !== 'CANVAS') return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const meshesToTest = [];
        for (const [id, item] of this.bodyMeshes.entries()) {
            meshesToTest.push(item.mesh);
        }

        const intersects = this.raycaster.intersectObjects(meshesToTest, false);
        if (intersects.length > 0) {
            const hit = intersects[0].object;
            if (hit.userData && hit.userData.id) {
                this.selectBody(hit.userData.id, true);
            }
        }
    }

    /**
     * Met à jour le temps et les positions képlériennes
     */
    updatePositions(deltaTimeSec) {
        if (this.isLive) {
            // Synchronisation directe avec l'heure réelle
            this.currentDate = new Date();
            this.currentJD = toJulianDate(this.currentDate);
        } else if (this.isPlaying) {
            // Avancement selon le multiplicateur temporel
            const simSecondsPassed = deltaTimeSec * this.timeSpeed;
            const daysPassed = simSecondsPassed / 86400.0;
            this.currentJD += daysPassed;
            this.currentDate = fromJulianDate(this.currentJD);
        }

        let jupiterPos = null;

        // Mise à jour de tous les corps célestes
        for (const [id, item] of this.bodyMeshes.entries()) {
            if (id === 'sun') {
                // Rotation propre du Soleil
                item.mesh.rotation.y += deltaTimeSec * 0.05;
                continue;
            }

            const data = item.data;
            let coords = null;

            if (data.a0) {
                // Planète majeure avec taux séculaires J2000
                coords = calculateMajorPlanetPosition(data, this.currentJD);
            } else if (data.elements) {
                // Astéroïde ou planète naine avec éléments képlériens standard
                coords = calculateKeplerianPosition(data.elements, this.currentJD);
            }

            if (coords) {
                item.mesh.position.set(
                    coords.x * this.orbitScale,
                    coords.y * this.orbitScale,
                    coords.z * this.orbitScale
                );

                // Rotation propre axiale
                if (data.rotationPeriodHours) {
                    const rotSpeed = (2 * Math.PI) / (Math.abs(data.rotationPeriodHours) * 3600);
                    item.mesh.rotation.y += deltaTimeSec * rotSpeed * 50;
                }

                // Sauvegarde pour synchroniser les astéroïdes Troyens
                if (id === 'jupiter') {
                    jupiterPos = coords;
                }

                // Télémétrie en temps réel si l'objet est sélectionné
                if (this.selectedBody && this.selectedBody.data.id === id && this.onTelemetryUpdate) {
                    this.onTelemetryUpdate({
                        currentJD: this.currentJD,
                        currentDate: this.currentDate,
                        distanceSunAU: coords.r,
                        distanceSunKm: coords.r * AU_TO_KM,
                        velocityKmS: coords.v,
                        eclipticX: coords.x,
                        eclipticY: coords.z, // Y Three.js
                        eclipticZ: coords.y,
                        trueAnomalyDeg: coords.trueAnomaly
                    });
                }
            }
        }

        // Mise à jour des ceintures massives d'astéroïdes (37 000+ particules)
        if (this.beltsManager) {
            const jupAnomaly = jupiterPos ? (jupiterPos.trueAnomaly * Math.PI / 180) : 0;
            this.beltsManager.update(this.currentJD, this.orbitScale, jupAnomaly);
        }

        // Suivi de caméra si un objet est verrouillé
        if (this.trackedObject && this.controls) {
            const currentTarget = this.controls.target;
            currentTarget.lerp(this.trackedObject.position, 0.08);
        }
    }

    /**
     * Boucle d'animation principale
     */
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

    // --- CONTRÔLES TEMPORELS ---
    setLiveMode(isLive) {
        this.isLive = isLive;
        if (isLive) {
            this.isPlaying = true;
            this.timeSpeed = 1.0;
        }
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
        for (const [id, item] of this.bodyMeshes.entries()) {
            if (item.orbitLine) {
                item.orbitLine.visible = visible;
            }
        }
    }
}

