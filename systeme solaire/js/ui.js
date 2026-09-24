/**
 * ui.js
 * Contrôleur d'interface utilisateur (HUD, télémétrie, contrôles temporels, filtres et recherche NASA)
 */

import { FAMOUS_ASTEROIDS_LIST, CELESTIAL_BODIES } from './bodiesData.js';

export class UIController {
    constructor(solarApp) {
        this.app = solarApp;

        // Éléments DOM
        this.liveBadge = document.getElementById('live-indicator');
        this.utcClock = document.getElementById('utc-clock');
        this.jdClock = document.getElementById('jd-clock');
        this.datePicker = document.getElementById('date-picker');

        // Boutons temporels
        this.btnLive = document.getElementById('btn-live');
        this.btnPlayPause = document.getElementById('btn-play-pause');
        this.speedSelector = document.getElementById('speed-select');
        this.btnStepBack = document.getElementById('btn-step-back');
        this.btnStepForward = document.getElementById('btn-step-forward');

        // Panneau d'information
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

        // Recherche & suggestions
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.searchSuggestions = document.getElementById('search-suggestions');
        this.searchLoading = document.getElementById('search-loading');

        // Filtres d'astéroïdes
        this.chkMainBelt = document.getElementById('chk-main-belt');
        this.chkTrojans = document.getElementById('chk-trojans');
        this.chkNeas = document.getElementById('chk-neas');
        this.chkKuiper = document.getElementById('chk-kuiper');
        this.chkOrbits = document.getElementById('chk-orbits');

        // Barre d'accès rapide aux planètes
        this.quickNavContainer = document.getElementById('quick-nav-planets');

        this.initEventListeners();
        this.initQuickNav();
        this.bindAppCallbacks();
    }

    initEventListeners() {
        // Mode LIVE
        this.btnLive.addEventListener('click', () => {
            this.app.setLiveMode(true);
            this.updateTimeControlsUI();
        });

        // Lecture / Pause
        this.btnPlayPause.addEventListener('click', () => {
            const isNowPlaying = !this.app.isPlaying;
            this.app.setPlaying(isNowPlaying);
            this.updateTimeControlsUI();
        });

        // Vitesse de simulation
        this.speedSelector.addEventListener('change', (e) => {
            const speed = parseFloat(e.target.value);
            this.app.setTimeSpeed(speed);
            this.updateTimeControlsUI();
        });

        // Pas à pas (+/- 1 jour)
        this.btnStepBack.addEventListener('click', () => {
            this.app.stepDays(-1);
            this.updateTimeControlsUI();
        });
        this.btnStepForward.addEventListener('click', () => {
            this.app.stepDays(1);
            this.updateTimeControlsUI();
        });

        // Sélecteur de date
        this.datePicker.addEventListener('change', (e) => {
            if (e.target.value) {
                const targetDate = new Date(e.target.value);
                if (!isNaN(targetDate.getTime())) {
                    this.app.setDate(targetDate);
                    this.updateTimeControlsUI();
                }
            }
        });

        // Filtres de ceintures d'astéroïdes
        this.chkMainBelt.addEventListener('change', (e) => {
            this.app.beltsManager.toggleCategory('mainBelt', e.target.checked);
        });
        this.chkTrojans.addEventListener('change', (e) => {
            this.app.beltsManager.toggleCategory('trojans', e.target.checked);
        });
        this.chkNeas.addEventListener('change', (e) => {
            this.app.beltsManager.toggleCategory('neas', e.target.checked);
        });
        this.chkKuiper.addEventListener('change', (e) => {
            this.app.beltsManager.toggleCategory('kuiper', e.target.checked);
        });
        this.chkOrbits.addEventListener('change', (e) => {
            this.app.toggleOrbits(e.target.checked);
        });

        // Recherche & API NASA JPL
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        this.searchInput.addEventListener('input', (e) => {
            this.updateSearchSuggestions(e.target.value);
        });

        // Clic en dehors pour fermer les suggestions
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.searchSuggestions.contains(e.target)) {
                this.searchSuggestions.classList.add('hidden');
            }
        });

        // Bouton centrer la vue globale
        document.getElementById('btn-reset-cam').addEventListener('click', () => {
            this.app.controls.target.set(0, 0, 0);
            this.app.camera.position.set(0, 45, 60);
            this.app.trackedObject = null;
        });

        // Raccourci vers le survol historique d'Apophis 2029
        const btnApophis2029 = document.getElementById('btn-event-apophis');
        if (btnApophis2029) {
            btnApophis2029.addEventListener('click', () => {
                this.app.setDate(new Date('2029-04-13T21:46:00Z'));
                this.app.selectBody('apophis', true);
                this.updateTimeControlsUI();
            });
        }
    }

    /**
     * Barre d'accès rapide aux planètes principales
     */
    initQuickNav() {
        const planets = [
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
        planets.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'quick-nav-btn';
            btn.innerHTML = `<span class="dot" style="background: ${p.color}"></span>${p.label}`;
            btn.addEventListener('click', () => {
                this.app.selectBody(p.id, true);
            });
            this.quickNavContainer.appendChild(btn);
        });
    }

    bindAppCallbacks() {
        // Callback sélection d'un astre
        this.app.onBodySelected = (data) => {
            this.renderInspector(data);
        };

        // Callback télémétrie en temps réel
        this.app.onTelemetryUpdate = (telemetry) => {
            this.renderTelemetry(telemetry);
        };
    }

    /**
     * Met à jour la barre d'état temporel et le badge LIVE
     */
    updateTimeControlsUI() {
        if (this.app.isLive) {
            this.liveBadge.classList.remove('paused');
            this.liveBadge.classList.add('active');
            this.liveBadge.innerHTML = '<span class="pulse"></span> DIRECT LIVE UTC';
            this.btnLive.classList.add('active');
            this.btnPlayPause.innerHTML = '⏸ Pause';
        } else {
            this.liveBadge.classList.remove('active');
            this.liveBadge.classList.add('paused');
            this.liveBadge.innerHTML = '<span class="dot"></span> SIMULATION';
            this.btnLive.classList.remove('active');
            this.btnPlayPause.innerHTML = this.app.isPlaying ? '⏸ Pause' : '▶ Lecture';
        }
    }

    /**
     * Affiche les informations de l'astre sélectionné
     */
    renderInspector(data) {
        this.inspectorPanel.classList.remove('hidden');
        this.inspectorTitle.innerText = data.name;
        this.inspectorSubtitle.innerText = data.typeLabel || 'Corps Céleste';
        this.inspectorSubtitle.style.color = data.color || '#00e5ff';
        this.inspectorDescription.innerText = data.description || 'Données fournies par le Jet Propulsion Laboratory (NASA).';

        this.inspectorPeriod.innerText = data.orbitalPeriodDays 
            ? `${data.orbitalPeriodDays.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} jours (${(data.orbitalPeriodDays / 365.25).toFixed(2)} ans)`
            : 'Non applicable';

        this.inspectorRadius.innerText = data.radiusKm 
            ? `${data.radiusKm.toLocaleString('fr-FR')} km (Ø ${(data.radiusKm * 2).toLocaleString('fr-FR')} km)`
            : 'Non mesuré';

        this.inspectorMass.innerText = data.massKg || 'Inconnue';

        this.inspectorRotation.innerText = data.rotationPeriodHours 
            ? `${Math.abs(data.rotationPeriodHours).toFixed(1)} h ${data.rotationPeriodHours < 0 ? '(Rétrograde)' : ''}`
            : 'Inconnue';
    }

    /**
     * Met à jour les valeurs télémétriques dynamiques (distance, vitesse, date)
     */
    renderTelemetry(telem) {
        // Horloge
        const d = telem.currentDate;
        this.utcClock.innerText = d.toUTCString().replace('GMT', 'UTC');
        this.jdClock.innerText = `JD ${telem.currentJD.toFixed(4)}`;

        // Télémétrie de l'objet
        if (this.inspectorDistanceSun) {
            this.inspectorDistanceSun.innerText = `${telem.distanceSunAU.toFixed(3)} UA (${(telem.distanceSunKm / 1e6).toFixed(2)} M km)`;
        }
        if (this.inspectorVelocity) {
            this.inspectorVelocity.innerText = `${telem.velocityKmS.toFixed(2)} km/s (${(telem.velocityKmS * 3600).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km/h)`;
        }
        if (this.inspectorCoords) {
            this.inspectorCoords.innerText = `X: ${telem.eclipticX.toFixed(2)} | Y: ${telem.eclipticZ.toFixed(2)} | Z: ${telem.eclipticY.toFixed(2)} UA`;
        }
    }

    /**
     * Traite la recherche locale ou via l'API NASA JPL
     */
    async handleSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        this.searchLoading.classList.remove('hidden');
        this.searchSuggestions.classList.add('hidden');

        try {
            const bodyData = await this.app.searchAndAddJplAsteroid(query);
            if (bodyData) {
                this.searchInput.value = bodyData.name;
            }
        } catch (err) {
            alert(`Erreur NASA JPL : ${err.message}`);
        } finally {
            this.searchLoading.classList.add('hidden');
        }
    }

    /**
     * Propose des suggestions dynamiques lors de la saisie
     */
    updateSearchSuggestions(text) {
        const query = text.trim().toLowerCase();
        if (!query) {
            this.searchSuggestions.classList.add('hidden');
            return;
        }

        const matches = [];

        // Recherche dans le catalogue interne
        for (const [id, body] of Object.entries(CELESTIAL_BODIES)) {
            if (body.name.toLowerCase().includes(query) || (body.latinName && body.latinName.toLowerCase().includes(query))) {
                matches.push({ id, name: body.name, type: body.typeLabel, color: body.color });
            }
        }

        // Suggestions célèbres
        FAMOUS_ASTEROIDS_LIST.forEach(item => {
            if (item.name.toLowerCase().includes(query) && !matches.some(m => m.name === item.name)) {
                matches.push({ id: item.id, name: item.name, type: item.type, color: '#ff7043' });
            }
        });

        if (matches.length === 0) {
            this.searchSuggestions.innerHTML = `
                <div class="suggestion-item jpl-query">
                    <span>Interroger l'API NASA JPL pour "<strong>${text}</strong>"...</span>
                </div>
            `;
            this.searchSuggestions.firstElementChild.addEventListener('click', () => {
                this.handleSearch();
            });
            this.searchSuggestions.classList.remove('hidden');
            return;
        }

        this.searchSuggestions.innerHTML = '';
        matches.slice(0, 8).forEach(item => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <div class="name"><span class="dot" style="background: ${item.color || '#00e5ff'}"></span>${item.name}</div>
                <div class="type">${item.type}</div>
            `;
            div.addEventListener('click', () => {
                this.searchInput.value = item.name;
                this.searchSuggestions.classList.add('hidden');
                if (CELESTIAL_BODIES[item.id]) {
                    this.app.selectBody(item.id, true);
                } else {
                    this.handleSearch();
                }
            });
            this.searchSuggestions.appendChild(div);
        });

        this.searchSuggestions.classList.remove('hidden');
    }
}

