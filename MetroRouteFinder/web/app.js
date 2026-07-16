// ═══════════════════════════════════════════════════════════════
//  app.js — Delhi Metro Route Finder Web Application
//  Graph algorithms: BFS, Dijkstra, DFS, A*, Min-Interchange
// ═══════════════════════════════════════════════════════════════

// ───────────── Graph Data Structure ─────────────

class MetroGraph {
    constructor() {
        this.adjList = new Map();        // station → [neighbors]
        this.weightedAdj = new Map();    // station → Map(neighbor → distance)
        this.stationLines = new Map();   // station → Set(lines)
        this.lineStations = new Map();   // line → [ordered stations]
    }

    addStation(name) {
        if (!this.adjList.has(name)) {
            this.adjList.set(name, []);
            this.weightedAdj.set(name, new Map());
            this.stationLines.set(name, new Set());
        }
    }

    addConnection(s1, s2, line, dist) {
        this.addStation(s1);
        this.addStation(s2);
        if (!this.adjList.get(s1).includes(s2)) this.adjList.get(s1).push(s2);
        if (!this.adjList.get(s2).includes(s1)) this.adjList.get(s2).push(s1);
        this.weightedAdj.get(s1).set(s2, dist);
        this.weightedAdj.get(s2).set(s1, dist);
        this.stationLines.get(s1).add(line);
        this.stationLines.get(s2).add(line);
    }

    loadFromData(metroLines) {
        for (const [lineName, lineData] of Object.entries(metroLines)) {
            this.lineStations.set(lineName, lineData.stations);
            for (let i = 0; i < lineData.stations.length - 1; i++) {
                this.addConnection(
                    lineData.stations[i],
                    lineData.stations[i + 1],
                    lineName,
                    lineData.distances[i]
                );
            }
        }
    }

    getAllStations() { return Array.from(this.adjList.keys()).sort(); }
    getNeighbors(station) { return this.adjList.get(station) || []; }
    getDistance(s1, s2) { return this.weightedAdj.get(s1)?.get(s2) || 0; }
    getLinesForStation(s) { return this.stationLines.get(s) || new Set(); }
    isInterchange(s) { return (this.stationLines.get(s)?.size || 0) >= 2; }
    getStationCount() { return this.adjList.size; }

    getConnectionCount() {
        let count = 0;
        for (const neighbors of this.adjList.values()) count += neighbors.length;
        return count / 2;
    }

    getInterchangeStations() {
        return this.getAllStations().filter(s => this.isInterchange(s));
    }

    findLineBetween(s1, s2) {
        for (const [line, stations] of this.lineStations) {
            for (let i = 0; i < stations.length - 1; i++) {
                if ((stations[i] === s1 && stations[i+1] === s2) ||
                    (stations[i] === s2 && stations[i+1] === s1)) {
                    return line;
                }
            }
        }
        return "Unknown";
    }

    getRouteLineInfo(route) {
        const info = [];
        for (let i = 0; i < route.length - 1; i++) {
            info.push(this.findLineBetween(route[i], route[i+1]));
        }
        return info;
    }

    getRouteDistance(route) {
        let total = 0;
        for (let i = 0; i < route.length - 1; i++) {
            total += this.getDistance(route[i], route[i+1]);
        }
        return Math.round(total * 10) / 10;
    }

    // ═══════════════════════════════════════
    //  BFS — Shortest by Stops
    // ═══════════════════════════════════════

    bfs(source, destination) {
        if (!this.adjList.has(source) || !this.adjList.has(destination)) return [];
        if (source === destination) return [source];

        const queue = [source];
        const visited = new Set([source]);
        const parent = new Map([[source, null]]);

        while (queue.length > 0) {
            const current = queue.shift();
            if (current === destination) return this._reconstructPath(parent, destination);

            for (const neighbor of this.adjList.get(current)) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    parent.set(neighbor, current);
                    queue.push(neighbor);
                }
            }
        }
        return [];
    }

    // ═══════════════════════════════════════
    //  Dijkstra — Shortest by Distance
    // ═══════════════════════════════════════

    dijkstra(source, destination) {
        if (!this.adjList.has(source) || !this.adjList.has(destination)) return [];
        if (source === destination) return [source];

        const dist = new Map();
        const parent = new Map();
        const finalized = new Set();

        // MinHeap using sorted insert (simple priority queue)
        const pq = [];

        for (const station of this.adjList.keys()) dist.set(station, Infinity);
        dist.set(source, 0);
        parent.set(source, null);
        pq.push({ station: source, dist: 0 });

        while (pq.length > 0) {
            pq.sort((a, b) => a.dist - b.dist);
            const { station: current, dist: currentDist } = pq.shift();

            if (finalized.has(current)) continue;
            finalized.add(current);

            if (current === destination) return this._reconstructPath(parent, destination);

            const neighbors = this.weightedAdj.get(current);
            if (neighbors) {
                for (const [neighbor, weight] of neighbors) {
                    const newDist = currentDist + weight;
                    if (newDist < dist.get(neighbor)) {
                        dist.set(neighbor, newDist);
                        parent.set(neighbor, current);
                        pq.push({ station: neighbor, dist: newDist });
                    }
                }
            }
        }
        return [];
    }

    // ═══════════════════════════════════════
    //  A* — Heuristic Pathfinding
    // ═══════════════════════════════════════

    aStar(source, destination) {
        if (!this.adjList.has(source) || !this.adjList.has(destination)) return [];
        if (source === destination) return [source];

        const destPos = STATION_POSITIONS[destination];
        if (!destPos) return this.dijkstra(source, destination); // Fallback

        const heuristic = (station) => {
            const pos = STATION_POSITIONS[station];
            if (!pos) return 0;
            const dx = pos.x - destPos.x;
            const dy = pos.y - destPos.y;
            return Math.sqrt(dx * dx + dy * dy) * 0.02; // Scale factor
        };

        const gScore = new Map();
        const fScore = new Map();
        const parent = new Map();
        const openSet = [];
        const closedSet = new Set();

        for (const station of this.adjList.keys()) {
            gScore.set(station, Infinity);
            fScore.set(station, Infinity);
        }

        gScore.set(source, 0);
        fScore.set(source, heuristic(source));
        parent.set(source, null);
        openSet.push({ station: source, f: fScore.get(source) });

        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const { station: current } = openSet.shift();

            if (current === destination) return this._reconstructPath(parent, destination);
            if (closedSet.has(current)) continue;
            closedSet.add(current);

            const neighbors = this.weightedAdj.get(current);
            if (neighbors) {
                for (const [neighbor, weight] of neighbors) {
                    if (closedSet.has(neighbor)) continue;
                    const tentativeG = gScore.get(current) + weight;
                    if (tentativeG < gScore.get(neighbor)) {
                        parent.set(neighbor, current);
                        gScore.set(neighbor, tentativeG);
                        fScore.set(neighbor, tentativeG + heuristic(neighbor));
                        openSet.push({ station: neighbor, f: fScore.get(neighbor) });
                    }
                }
            }
        }
        return [];
    }

    // ═══════════════════════════════════════
    //  DFS — Find All Routes
    // ═══════════════════════════════════════

    findAllRoutes(source, destination, maxRoutes = 8) {
        if (!this.adjList.has(source) || !this.adjList.has(destination)) return [];
        if (source === destination) return [[source]];

        const allRoutes = [];
        const visited = new Set([source]);
        const currentPath = [source];

        this._dfsHelper(source, destination, visited, currentPath, allRoutes, maxRoutes);
        allRoutes.sort((a, b) => a.length - b.length);
        return allRoutes;
    }

    _dfsHelper(current, destination, visited, path, allRoutes, maxRoutes) {
        if (current === destination) {
            allRoutes.push([...path]);
            return;
        }
        if (allRoutes.length >= maxRoutes) return;

        for (const neighbor of this.adjList.get(current)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                path.push(neighbor);
                this._dfsHelper(neighbor, destination, visited, path, allRoutes, maxRoutes);
                visited.delete(neighbor);
                path.pop();
            }
        }
    }

    // ═══════════════════════════════════════
    //  Min-Interchange Route
    // ═══════════════════════════════════════

    minInterchange(source, destination) {
        if (!this.adjList.has(source) || !this.adjList.has(destination)) return [];
        if (source === destination) return [source];

        const queue = [];
        const visited = new Set();
        const parentMap = new Map();

        const srcLines = this.stationLines.get(source);
        for (const line of srcLines) {
            const key = `${source}|${line}`;
            queue.push({ station: source, line });
            visited.add(key);
            parentMap.set(key, null);
        }

        let destKey = null;

        while (queue.length > 0) {
            const { station, line: currentLine } = queue.shift();
            if (station === destination) {
                destKey = `${station}|${currentLine}`;
                break;
            }

            for (const neighbor of this.adjList.get(station)) {
                const connectingLine = this.findLineBetween(station, neighbor);
                const neighborKey = `${neighbor}|${connectingLine}`;
                if (!visited.has(neighborKey)) {
                    visited.add(neighborKey);
                    parentMap.set(neighborKey, { station, line: currentLine });
                    queue.push({ station: neighbor, line: connectingLine });
                }
            }
        }

        if (!destKey) return [];

        const path = [];
        let currentKey = destKey;
        while (currentKey) {
            const station = currentKey.split("|")[0];
            if (path.length === 0 || path[path.length - 1] !== station) {
                path.push(station);
            }
            const parent = parentMap.get(currentKey);
            currentKey = parent ? `${parent.station}|${parent.line}` : null;
        }
        path.reverse();
        return path;
    }

    _reconstructPath(parent, destination) {
        const path = [];
        let current = destination;
        while (current !== null) {
            path.push(current);
            current = parent.get(current);
        }
        path.reverse();
        return path;
    }

    // ═══════════════════════════════════════
    //  Analytics
    // ═══════════════════════════════════════

    isNetworkConnected() {
        if (this.adjList.size === 0) return true;
        const start = this.adjList.keys().next().value;
        const visited = new Set();
        const queue = [start];
        visited.add(start);
        while (queue.length > 0) {
            const current = queue.shift();
            for (const neighbor of this.adjList.get(current)) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        return visited.size === this.adjList.size;
    }

    getMostConnectedStation() {
        let best = null, maxDeg = 0;
        for (const [station, neighbors] of this.adjList) {
            if (neighbors.length > maxDeg) {
                maxDeg = neighbors.length;
                best = station;
            }
        }
        return { station: best, degree: maxDeg };
    }

    getDegreeDistribution() {
        const dist = {};
        for (const neighbors of this.adjList.values()) {
            const deg = neighbors.length;
            dist[deg] = (dist[deg] || 0) + 1;
        }
        return dist;
    }
}

// ═══════════════════════════════════════════════════════════════
//  FARE CALCULATOR
// ═══════════════════════════════════════════════════════════════

function calculateFare(route, lineInfo, totalDistance, isPeakHour) {
    let fare = FARE_CONFIG.baseFare;
    fare += totalDistance * FARE_CONFIG.perKmRate;
    const interchanges = countInterchanges(lineInfo);
    fare += interchanges * FARE_CONFIG.interchangeSurcharge;
    if (isPeakHour) fare += FARE_CONFIG.peakHourSurcharge;
    return Math.ceil(fare);
}

function countInterchanges(lineInfo) {
    if (!lineInfo || lineInfo.length <= 1) return 0;
    let changes = 0;
    let current = lineInfo[0];
    for (let i = 1; i < lineInfo.length; i++) {
        if (lineInfo[i] !== current) { changes++; current = lineInfo[i]; }
    }
    return changes;
}

function estimateTravelTime(stops, interchanges) {
    return Math.round((stops * FARE_CONFIG.avgTimePerStop + interchanges * FARE_CONFIG.interchangeWalkTime) * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════
//  SVG METRO MAP RENDERER
// ═══════════════════════════════════════════════════════════════

class MetroMapRenderer {
    constructor(svgElement, graph) {
        this.svg = svgElement;
        this.graph = graph;
        this.stationElements = new Map();
        this.lineElements = [];
        this.routeOverlay = null;
        this.activeStation = null;
        this.tooltip = document.getElementById('map-tooltip');
    }

    render() {
        this.svg.innerHTML = '';

        // Create groups for layering
        const lineGroup = this._createGroup('map-lines');
        const routeGroup = this._createGroup('route-overlay');
        const stationGroup = this._createGroup('map-stations');
        const labelGroup = this._createGroup('map-labels');

        this.routeOverlay = routeGroup;

        // Draw lines
        for (const [lineName, lineData] of Object.entries(METRO_LINES)) {
            this._drawLine(lineGroup, lineName, lineData);
        }

        // Draw stations
        for (const [stationName, pos] of Object.entries(STATION_POSITIONS)) {
            this._drawStation(stationGroup, labelGroup, stationName, pos);
        }
    }

    _createGroup(id) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.id = id;
        this.svg.appendChild(g);
        return g;
    }

    _drawLine(group, lineName, lineData) {
        const stations = lineData.stations;
        for (let i = 0; i < stations.length - 1; i++) {
            const p1 = STATION_POSITIONS[stations[i]];
            const p2 = STATION_POSITIONS[stations[i + 1]];
            if (!p1 || !p2) continue;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', p1.x);
            line.setAttribute('y1', p1.y);
            line.setAttribute('x2', p2.x);
            line.setAttribute('y2', p2.y);
            line.setAttribute('stroke', lineData.color);
            line.setAttribute('stroke-width', '4');
            line.setAttribute('stroke-linecap', 'round');
            line.setAttribute('opacity', '0.7');
            line.classList.add('metro-line-segment');
            line.dataset.line = lineName;
            group.appendChild(line);
        }
    }

    _drawStation(stationGroup, labelGroup, name, pos) {
        const isInterchange = this.graph.isInterchange(name);
        const radius = isInterchange ? 8 : 5;

        // Station glow (behind)
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        glow.setAttribute('cx', pos.x);
        glow.setAttribute('cy', pos.y);
        glow.setAttribute('r', radius + 4);
        glow.setAttribute('fill', 'none');
        glow.setAttribute('stroke', 'none');
        glow.classList.add('station-glow');
        stationGroup.appendChild(glow);

        // Station dot
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pos.x);
        circle.setAttribute('cy', pos.y);
        circle.setAttribute('r', radius);
        circle.classList.add('station-dot');
        if (isInterchange) circle.classList.add('interchange');

        // Color by primary line
        const lines = this.graph.getLinesForStation(name);
        const primaryLine = lines.values().next().value;
        const color = METRO_LINES[primaryLine]?.color || '#ffffff';
        circle.setAttribute('fill', isInterchange ? '#ffffff' : color);
        circle.setAttribute('stroke', isInterchange ? color : '#1a1a2e');
        circle.setAttribute('stroke-width', isInterchange ? '3' : '2');

        circle.dataset.station = name;
        circle.addEventListener('mouseenter', (e) => this._onStationHover(e, name, pos));
        circle.addEventListener('mouseleave', () => this._onStationLeave());
        circle.addEventListener('click', () => this._onStationClick(name));

        stationGroup.appendChild(circle);
        this.stationElements.set(name, { circle, glow });

        // Label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', pos.x + radius + 6);
        label.setAttribute('y', pos.y + 4);
        label.setAttribute('class', 'station-label');
        label.textContent = this._shortenName(name);
        labelGroup.appendChild(label);
    }

    _shortenName(name) {
        if (name.length <= 16) return name;
        // Abbreviate common words
        return name
            .replace('Sector ', 'Sec ')
            .replace('Terminal 1 IGI Airport', 'T1 Airport')
            .replace('Sadar Bazaar Cantonment', 'Sadar Bazar')
            .replace('Durgabai Deshmukh South Campus', 'South Campus')
            .replace('Netaji Subhash Place', 'NSP');
    }

    _onStationHover(e, name, pos) {
        const lines = Array.from(this.graph.getLinesForStation(name));
        const neighbors = this.graph.getNeighbors(name);
        const isInt = this.graph.isInterchange(name);

        this.tooltip.innerHTML = `
            <div class="tooltip-name">${name} ${isInt ? '<span class="interchange-badge">⇄ Interchange</span>' : ''}</div>
            <div class="tooltip-lines">${lines.map(l =>
                `<span class="line-tag" style="background:${METRO_LINES[l]?.color || '#666'}">${l}</span>`
            ).join('')}</div>
            <div class="tooltip-connections">${neighbors.length} connection${neighbors.length !== 1 ? 's' : ''}</div>
        `;
        this.tooltip.style.display = 'block';

        const rect = this.svg.getBoundingClientRect();
        const scale = rect.width / 900;
        this.tooltip.style.left = `${rect.left + pos.x * scale + 15}px`;
        this.tooltip.style.top = `${rect.top + pos.y * scale - 10}px`;

        // Glow effect
        const el = this.stationElements.get(name);
        if (el) {
            const primaryLine = lines[0];
            el.glow.setAttribute('stroke', METRO_LINES[primaryLine]?.color || '#fff');
            el.glow.setAttribute('stroke-width', '2');
            el.glow.setAttribute('fill', `${METRO_LINES[primaryLine]?.color || '#fff'}33`);
            el.circle.setAttribute('r', parseFloat(el.circle.getAttribute('r')) + 2);
        }
    }

    _onStationLeave() {
        this.tooltip.style.display = 'none';
        for (const [, el] of this.stationElements) {
            el.glow.setAttribute('stroke', 'none');
            el.glow.setAttribute('fill', 'none');
            const isInt = el.circle.classList.contains('interchange');
            el.circle.setAttribute('r', isInt ? 8 : 5);
        }
    }

    _onStationClick(name) {
        const srcInput = document.getElementById('source-input');
        const destInput = document.getElementById('dest-input');

        if (!srcInput.value || this.activeStation === 'dest') {
            srcInput.value = name;
            this.activeStation = 'src';
            this._highlightStation(name, '#00ff88');
        } else {
            destInput.value = name;
            this.activeStation = 'dest';
            this._highlightStation(name, '#ff4466');
        }
    }

    _highlightStation(name, color) {
        const el = this.stationElements.get(name);
        if (el) {
            el.circle.setAttribute('fill', color);
            el.circle.setAttribute('r', '10');
            el.glow.setAttribute('fill', `${color}44`);
            el.glow.setAttribute('stroke', color);
            el.glow.setAttribute('stroke-width', '2');
        }
    }

    // ═══════════════════════════════════════
    //  Route Visualization
    // ═══════════════════════════════════════

    async highlightRoute(route, lineInfo) {
        this.clearRoute();
        if (!route || route.length < 2) return;

        // Draw route segments with animation
        for (let i = 0; i < route.length - 1; i++) {
            const p1 = STATION_POSITIONS[route[i]];
            const p2 = STATION_POSITIONS[route[i + 1]];
            if (!p1 || !p2) continue;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', p1.x);
            line.setAttribute('y1', p1.y);
            line.setAttribute('x2', p2.x);
            line.setAttribute('y2', p2.y);

            const color = METRO_LINES[lineInfo[i]]?.color || '#ffffff';
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', '7');
            line.setAttribute('stroke-linecap', 'round');
            line.classList.add('route-segment');
            line.style.opacity = '0';
            this.routeOverlay.appendChild(line);

            // Animate segment appearance
            await this._delay(80);
            line.style.opacity = '1';
        }

        // Highlight stations on route
        for (let i = 0; i < route.length; i++) {
            const el = this.stationElements.get(route[i]);
            if (!el) continue;

            const isEndpoint = i === 0 || i === route.length - 1;
            const color = isEndpoint ?
                (i === 0 ? '#00ff88' : '#ff4466') :
                '#ffffff';

            el.circle.setAttribute('fill', color);
            el.circle.setAttribute('r', isEndpoint ? 12 : 8);
            el.circle.setAttribute('stroke', '#1a1a2e');
            el.circle.setAttribute('stroke-width', '3');
            el.circle.classList.add('route-station');

            if (isEndpoint) {
                el.glow.setAttribute('fill', `${color}33`);
                el.glow.setAttribute('stroke', color);
                el.glow.setAttribute('stroke-width', '2');
                el.glow.setAttribute('r', '18');
            }
        }
    }

    clearRoute() {
        if (this.routeOverlay) this.routeOverlay.innerHTML = '';
        // Reset all stations
        for (const [name, el] of this.stationElements) {
            const isInt = this.graph.isInterchange(name);
            const lines = Array.from(this.graph.getLinesForStation(name));
            const primaryColor = METRO_LINES[lines[0]]?.color || '#ffffff';
            el.circle.setAttribute('fill', isInt ? '#ffffff' : primaryColor);
            el.circle.setAttribute('stroke', isInt ? primaryColor : '#1a1a2e');
            el.circle.setAttribute('stroke-width', isInt ? '3' : '2');
            el.circle.setAttribute('r', isInt ? 8 : 5);
            el.circle.classList.remove('route-station');
            el.glow.setAttribute('stroke', 'none');
            el.glow.setAttribute('fill', 'none');
            el.glow.setAttribute('r', (isInt ? 8 : 5) + 4);
        }
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ═══════════════════════════════════════════════════════════════
//  APP CONTROLLER
// ═══════════════════════════════════════════════════════════════

class App {
    constructor() {
        this.graph = new MetroGraph();
        this.graph.loadFromData(METRO_LINES);
        this.mapRenderer = null;
        this.currentRoute = null;
        this.currentLineInfo = null;
    }

    init() {
        // Initialize SVG map
        const svg = document.getElementById('metro-map-svg');
        this.mapRenderer = new MetroMapRenderer(svg, this.graph);
        this.mapRenderer.render();

        // Setup autocomplete
        this._setupAutocomplete('source-input', 'source-dropdown');
        this._setupAutocomplete('dest-input', 'dest-dropdown');

        // Bind events
        document.getElementById('find-route-btn').addEventListener('click', () => this.findRoute());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearAll());
        document.getElementById('swap-btn').addEventListener('click', () => this.swapStations());
        document.getElementById('peak-toggle').addEventListener('change', () => this.updateFare());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Algorithm buttons
        document.querySelectorAll('.algo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Load initial stats
        this._loadStats();
        this._loadLinesList();

        // Auto-show route panel hint
        this._showWelcome();
    }

    // ───────────── Route Finding ─────────────

    findRoute() {
        const source = document.getElementById('source-input').value.trim();
        const dest = document.getElementById('dest-input').value.trim();

        if (!source || !dest) {
            this._showNotification('Please enter both source and destination stations', 'warning');
            return;
        }

        if (!this.graph.adjList.has(source)) {
            this._showNotification(`Station "${source}" not found`, 'error');
            return;
        }
        if (!this.graph.adjList.has(dest)) {
            this._showNotification(`Station "${dest}" not found`, 'error');
            return;
        }

        const algo = document.querySelector('.algo-btn.active')?.dataset.algo || 'bfs';

        let route;
        const startTime = performance.now();

        switch (algo) {
            case 'bfs':
                route = this.graph.bfs(source, dest);
                break;
            case 'dijkstra':
                route = this.graph.dijkstra(source, dest);
                break;
            case 'astar':
                route = this.graph.aStar(source, dest);
                break;
            case 'min-interchange':
                route = this.graph.minInterchange(source, dest);
                break;
            default:
                route = this.graph.bfs(source, dest);
        }

        const elapsed = (performance.now() - startTime).toFixed(2);

        if (route.length === 0) {
            this._showNotification(`No route found between "${source}" and "${dest}"`, 'error');
            return;
        }

        if (route.length === 1) {
            this._showNotification('You are already at the destination!', 'info');
            return;
        }

        this.currentRoute = route;
        this.currentLineInfo = this.graph.getRouteLineInfo(route);

        // Display results
        this._displayRoute(route, this.currentLineInfo, algo, elapsed);
        this.mapRenderer.highlightRoute(route, this.currentLineInfo);
        this.updateFare();

        // Switch to route tab
        this.switchTab('route');

        this._showNotification(`Route found in ${elapsed}ms via ${this._algoName(algo)}`, 'success');
    }

    _displayRoute(route, lineInfo, algo, elapsed) {
        const panel = document.getElementById('route-result');
        const totalDist = this.graph.getRouteDistance(route);
        const stops = route.length - 1;
        const interchanges = countInterchanges(lineInfo);
        const travelTime = estimateTravelTime(stops, interchanges);
        const linesUsed = [...new Set(lineInfo)];

        let html = `
            <div class="route-summary">
                <div class="summary-card">
                    <div class="summary-icon">🚏</div>
                    <div class="summary-value">${stops}</div>
                    <div class="summary-label">Stops</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">📏</div>
                    <div class="summary-value">${totalDist} km</div>
                    <div class="summary-label">Distance</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">🔄</div>
                    <div class="summary-value">${interchanges}</div>
                    <div class="summary-label">Interchanges</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">⏱️</div>
                    <div class="summary-value">${Math.round(travelTime)} min</div>
                    <div class="summary-label">Est. Time</div>
                </div>
            </div>

            <div class="route-meta">
                <span class="algo-badge">${this._algoName(algo)}</span>
                <span class="time-badge">${elapsed}ms</span>
                <div class="lines-used">
                    ${linesUsed.map(l => `<span class="line-pill" style="background:${METRO_LINES[l]?.color || '#666'}">${l}</span>`).join('')}
                </div>
            </div>

            <div class="route-steps">
        `;

        let prevLine = '';
        for (let i = 0; i < route.length; i++) {
            const station = route[i];
            const isInterchange = this.graph.isInterchange(station);
            const currentLine = i < lineInfo.length ? lineInfo[i] : (i > 0 ? lineInfo[i-1] : '');
            const color = METRO_LINES[currentLine]?.color || '#ffffff';

            // Interchange notification
            if (prevLine && i < lineInfo.length && prevLine !== lineInfo[i]) {
                html += `
                    <div class="interchange-notice">
                        <span class="interchange-icon">⇄</span>
                        Change to <span class="line-pill" style="background:${METRO_LINES[lineInfo[i]]?.color || '#666'}">${lineInfo[i]}</span>
                    </div>
                `;
            }

            const isStart = i === 0;
            const isEnd = i === route.length - 1;

            html += `
                <div class="route-step ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''} ${isInterchange ? 'interchange' : ''}">
                    <div class="step-line" style="background:${color}"></div>
                    <div class="step-dot" style="border-color:${color};${isStart ? 'background:#00ff88' : isEnd ? 'background:#ff4466' : isInterchange ? 'background:#fff' : `background:${color}`}"></div>
                    <div class="step-info">
                        <div class="step-name">${station}</div>
                        ${isInterchange ? '<span class="step-badge">⇄ Interchange</span>' : ''}
                    </div>
                    ${i < route.length - 1 ? `<div class="step-dist">${this.graph.getDistance(route[i], route[i+1]).toFixed(1)} km</div>` : ''}
                </div>
            `;

            if (i < lineInfo.length) prevLine = lineInfo[i];
        }

        html += '</div>';
        panel.innerHTML = html;
    }

    updateFare() {
        if (!this.currentRoute || !this.currentLineInfo) return;

        const isPeak = document.getElementById('peak-toggle').checked;
        const totalDist = this.graph.getRouteDistance(this.currentRoute);
        const stops = this.currentRoute.length - 1;
        const interchanges = countInterchanges(this.currentLineInfo);
        const fare = calculateFare(this.currentRoute, this.currentLineInfo, totalDist, isPeak);
        const travelTime = estimateTravelTime(stops, interchanges);

        const panel = document.getElementById('fare-result');
        panel.innerHTML = `
            <div class="fare-receipt">
                <div class="receipt-header">🎫 Fare Receipt</div>
                <div class="receipt-row">
                    <span>From</span>
                    <span class="receipt-value">${this.currentRoute[0]}</span>
                </div>
                <div class="receipt-row">
                    <span>To</span>
                    <span class="receipt-value">${this.currentRoute[this.currentRoute.length - 1]}</span>
                </div>
                <div class="receipt-divider"></div>
                <div class="receipt-row">
                    <span>Base Fare</span>
                    <span class="receipt-value">₹ ${FARE_CONFIG.baseFare}</span>
                </div>
                <div class="receipt-row">
                    <span>Distance (${totalDist} km × ₹${FARE_CONFIG.perKmRate})</span>
                    <span class="receipt-value">₹ ${Math.round(totalDist * FARE_CONFIG.perKmRate)}</span>
                </div>
                ${interchanges > 0 ? `
                <div class="receipt-row">
                    <span>Interchange Fee (${interchanges} × ₹${FARE_CONFIG.interchangeSurcharge})</span>
                    <span class="receipt-value">₹ ${interchanges * FARE_CONFIG.interchangeSurcharge}</span>
                </div>` : ''}
                ${isPeak ? `
                <div class="receipt-row peak">
                    <span>⚡ Peak Hour Surcharge</span>
                    <span class="receipt-value">₹ ${FARE_CONFIG.peakHourSurcharge}</span>
                </div>` : ''}
                <div class="receipt-divider"></div>
                <div class="receipt-row total">
                    <span>Total Fare</span>
                    <span class="receipt-value">₹ ${fare}</span>
                </div>
                <div class="receipt-row time">
                    <span>Est. Travel Time</span>
                    <span class="receipt-value">${Math.round(travelTime)} min</span>
                </div>
            </div>
        `;
    }

    // ───────────── UI Helpers ─────────────

    swapStations() {
        const src = document.getElementById('source-input');
        const dest = document.getElementById('dest-input');
        [src.value, dest.value] = [dest.value, src.value];
    }

    clearAll() {
        document.getElementById('source-input').value = '';
        document.getElementById('dest-input').value = '';
        document.getElementById('route-result').innerHTML = '<div class="empty-state"><div class="empty-icon">🚇</div><p>Select source & destination to find a route</p></div>';
        document.getElementById('fare-result').innerHTML = '';
        this.currentRoute = null;
        this.currentLineInfo = null;
        this.mapRenderer.clearRoute();
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add('active');
        document.getElementById(`tab-${tabId}`)?.classList.add('active');
    }

    _setupAutocomplete(inputId, dropdownId) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        const allStations = this.graph.getAllStations();

        input.addEventListener('input', () => {
            const query = input.value.toLowerCase().trim();
            if (query.length < 1) { dropdown.style.display = 'none'; return; }

            const matches = allStations.filter(s =>
                s.toLowerCase().includes(query)
            ).slice(0, 8);

            if (matches.length === 0) { dropdown.style.display = 'none'; return; }

            dropdown.innerHTML = matches.map(s => {
                const lines = Array.from(this.graph.getLinesForStation(s));
                return `<div class="autocomplete-item" data-station="${s}">
                    <span class="ac-name">${this._highlightMatch(s, query)}</span>
                    <div class="ac-lines">${lines.map(l =>
                        `<span class="ac-line-dot" style="background:${METRO_LINES[l]?.color || '#666'}"></span>`
                    ).join('')}</div>
                </div>`;
            }).join('');

            dropdown.style.display = 'block';

            dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    input.value = item.dataset.station;
                    dropdown.style.display = 'none';
                });
            });
        });

        input.addEventListener('blur', () => {
            setTimeout(() => dropdown.style.display = 'none', 200);
        });

        input.addEventListener('focus', () => {
            if (input.value.length >= 1) input.dispatchEvent(new Event('input'));
        });
    }

    _highlightMatch(text, query) {
        const idx = text.toLowerCase().indexOf(query);
        if (idx === -1) return text;
        return text.substring(0, idx) +
            `<strong>${text.substring(idx, idx + query.length)}</strong>` +
            text.substring(idx + query.length);
    }

    _loadStats() {
        const stats = document.getElementById('stats-content');
        const mostConnected = this.graph.getMostConnectedStation();
        const degreeDist = this.graph.getDegreeDistribution();
        const interchanges = this.graph.getInterchangeStations();

        const maxDegCount = Math.max(...Object.values(degreeDist));

        stats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">🏢</div>
                    <div class="stat-value">${this.graph.getStationCount()}</div>
                    <div class="stat-label">Stations</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🔗</div>
                    <div class="stat-value">${this.graph.getConnectionCount()}</div>
                    <div class="stat-label">Connections</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🚇</div>
                    <div class="stat-value">${Object.keys(METRO_LINES).length}</div>
                    <div class="stat-label">Metro Lines</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⇄</div>
                    <div class="stat-value">${interchanges.length}</div>
                    <div class="stat-label">Interchanges</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🌐</div>
                    <div class="stat-value">${this.graph.isNetworkConnected() ? '✅ Yes' : '❌ No'}</div>
                    <div class="stat-label">Connected</div>
                </div>
                <div class="stat-card highlight">
                    <div class="stat-icon">⭐</div>
                    <div class="stat-value">${mostConnected.station || 'N/A'}</div>
                    <div class="stat-label">Most Connected (${mostConnected.degree})</div>
                </div>
            </div>

            <div class="stats-section">
                <h3>📊 Degree Distribution</h3>
                <div class="degree-chart">
                    ${Object.entries(degreeDist).sort((a,b) => a[0]-b[0]).map(([deg, count]) => `
                        <div class="degree-row">
                            <span class="degree-label">${deg}</span>
                            <div class="degree-bar-track">
                                <div class="degree-bar" style="width:${(count / maxDegCount * 100)}%">${count}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="stats-section">
                <h3>⇄ Interchange Stations</h3>
                <div class="interchange-list">
                    ${interchanges.map(s => {
                        const lines = Array.from(this.graph.getLinesForStation(s));
                        return `<div class="interchange-item">
                            <span class="interchange-name">${s}</span>
                            <div class="interchange-lines">
                                ${lines.map(l => `<span class="line-pill small" style="background:${METRO_LINES[l]?.color || '#666'}">${l}</span>`).join('')}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }

    _loadLinesList() {
        const panel = document.getElementById('lines-content');
        panel.innerHTML = Object.entries(METRO_LINES).map(([name, data]) => {
            const totalDist = data.distances.reduce((a, b) => a + b, 0).toFixed(1);
            return `
                <div class="line-card" style="--line-color:${data.color}">
                    <div class="line-card-header">
                        <div class="line-color-dot" style="background:${data.color}"></div>
                        <div class="line-card-info">
                            <div class="line-card-name">${name}</div>
                            <div class="line-card-meta">${data.stations.length} stations · ${totalDist} km</div>
                        </div>
                    </div>
                    <div class="line-stations-list">
                        ${data.stations.map((s, i) => `
                            <div class="line-station-item">
                                <div class="ls-dot" style="background:${data.color}"></div>
                                <span class="ls-name">${s}</span>
                                ${i < data.distances.length ? `<span class="ls-dist">${data.distances[i]} km</span>` : ''}
                                ${this.graph.isInterchange(s) ? '<span class="ls-interchange">⇄</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    _showWelcome() {
        document.getElementById('route-result').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🚇</div>
                <p>Select source & destination to find a route</p>
                <span class="empty-hint">Or click stations on the map!</span>
            </div>
        `;
    }

    _algoName(algo) {
        const names = {
            'bfs': 'BFS (Fewest Stops)',
            'dijkstra': 'Dijkstra (Shortest Distance)',
            'astar': 'A* (Heuristic)',
            'min-interchange': 'Min Interchange'
        };
        return names[algo] || algo;
    }

    _showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        notif.innerHTML = `<span>${icons[type] || ''} ${message}</span>`;
        container.appendChild(notif);

        setTimeout(() => notif.classList.add('show'), 10);
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }
}

// ═══════════════════════════════════════════════════════════════
//  INITIALIZE
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
