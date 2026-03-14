const canvas = document.getElementById('mesh-canvas');
const ctx = canvas.getContext('2d');
const fileUpload = document.getElementById('file-upload');
const resetBtn = document.getElementById('reset-view');
const sidebar = document.getElementById('sidebar');
const selectionDetails = document.getElementById('selection-details');
const overlayHints = document.getElementById('overlay-hints');
const themeToggle = document.getElementById('theme-toggle');

let isLightMode = localStorage.getItem('theme') === 'light';
if (isLightMode) document.body.classList.add('light-mode');
updateThemeIcon();

const stats = {
    cells: document.getElementById('stat-cells'),
    nodes: document.getElementById('stat-nodes'),
    faces: document.getElementById('stat-faces'),
    internal: document.getElementById('stat-internal')
};

const selection = {
    id: document.getElementById('cell-id'),
    type: document.getElementById('cell-type'),
    physical: document.getElementById('cell-physical'),
    centroid: document.getElementById('cell-centroid'),
    nodes: document.getElementById('cell-nodes'),
    faces: document.getElementById('cell-faces-owner'),
    neighbors: document.getElementById('cell-neighbors')
};

const statusUI = {
    overlay: document.getElementById('status-overlay'),
    text: document.getElementById('status-text'),
    detail: document.getElementById('status-detail'),
    bar: document.getElementById('progress-bar')
};

let currentMesh = null;
let view = {
    zoom: 0.8,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    mouseX: 0,
    mouseY: 0
};

let selectedCellId = null;
let interactionMode = 'pan'; // 'pan', 'zoom', or 'ruler'
let showPhysicalZones = false;
let showQualityMap = false;
let showFaceNormals = false;
let activePhysicalGroup = null;
let rulerData = {
    p1: null,
    p2: null,
    active: false
};
let zoomArea = {
    active: false,
    start: null,
    end: null
};

const zoomToggleBtn = document.getElementById('zoom-toggle');

// Initialization
function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    fileUpload.addEventListener('change', handleFileUpload);
    resetBtn.addEventListener('click', resetView);
    themeToggle.addEventListener('click', toggleTheme);
    zoomToggleBtn.addEventListener('click', toggleZoomMode);
    
    document.getElementById('zones-toggle').addEventListener('click', () => {
        showPhysicalZones = !showPhysicalZones;
        document.getElementById('zones-toggle').classList.toggle('active', showPhysicalZones);
        render();
    });

    document.getElementById('quality-toggle').addEventListener('click', () => {
        showQualityMap = !showQualityMap;
        document.getElementById('quality-toggle').classList.toggle('active', showQualityMap);
        document.getElementById('quality-legend').classList.toggle('hidden', !showQualityMap);
        render();
    });

    document.getElementById('normals-toggle').addEventListener('click', () => {
        showFaceNormals = !showFaceNormals;
        document.getElementById('normals-toggle').classList.toggle('active', showFaceNormals);
        render();
    });

    document.getElementById('ruler-toggle').addEventListener('click', () => {
        interactionMode = interactionMode === 'ruler' ? 'pan' : 'ruler';
        document.getElementById('ruler-toggle').classList.toggle('active', interactionMode === 'ruler');
        canvas.classList.toggle('crosshair', interactionMode === 'ruler');
        // Reset ruler points when entering/leaving
        rulerData.p1 = null;
        rulerData.p2 = null;
        render();
    });

    const searchInput = document.getElementById('cell-search-input');
    const searchBtn = document.getElementById('cell-search-btn');

    const triggerSearch = () => {
        const id = parseInt(searchInput.value);
        if (id && currentMesh) {
            const cell = currentMesh.cells.find(c => c.id === id);
            if (cell) {
                selectCell(id);
                centerOnCell(cell);
            } else {
                alert(`Cell ID ${id} not found in current mesh.`);
            }
        }
    };

    searchBtn.addEventListener('click', triggerSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') triggerSearch();
    });

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousemove', (e) => {
        view.mouseX = e.offsetX;
        view.mouseY = e.offsetY;
        render();
    });

    // Drag and drop hints
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', handleDrop);

    // Restore saved mesh if exists
    const savedMesh = localStorage.getItem('lastMesh');
    if (savedMesh) {
        loadMesh(savedMesh, false);
    }
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Use scale to handle DPR without changing every drawing call
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    render();
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) readFile(file);
}

function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        await loadMesh(e.target.result, true);
    };
    reader.readAsText(file);
}

async function loadMesh(content, save = true) {
    statusUI.overlay.classList.remove('hidden');
    statusUI.text.textContent = "Processing Mesh...";
    statusUI.bar.style.width = '0%';

    const isLocalFile = window.location.protocol === 'file:';

    if (isLocalFile) {
        // Fallback for file:// protocol where Workers are often blocked
        console.log("Detected file:// protocol, falling back to main-thread parsing.");
        statusUI.detail.textContent = "Parsing (Main Thread)...";
        
        try {
            const parser = new MshParser();
            currentMesh = await parser.parse(content, (message, percent) => {
                statusUI.detail.textContent = message;
                statusUI.bar.style.width = `${(percent * 100).toFixed(0)}%`;
            });
            finalizeLoad(content, save);
        } catch (err) {
            handleLoadError(err.message);
        }
    } else {
        // Use Web Worker for http/https
        statusUI.detail.textContent = "Spawning worker...";

        try {
            if (window.meshWorker) window.meshWorker.terminate();
            window.meshWorker = new Worker('mesh_worker.js');

            window.meshWorker.onmessage = (e) => {
                const data = e.data;
                if (data.type === 'progress') {
                    statusUI.detail.textContent = data.message;
                    statusUI.bar.style.width = `${(data.percent * 100).toFixed(0)}%`;
                } else if (data.type === 'done') {
                    currentMesh = data.mesh;
                    finalizeLoad(content, save);
                } else if (data.type === 'error') {
                    handleLoadError(data.error);
                }
            };

            window.meshWorker.onerror = (err) => {
                handleLoadError("Worker Error: " + err.message);
            };

            window.meshWorker.postMessage({ content });
        } catch (err) {
            console.warn("Worker creation failed, falling back to main thread:", err);
            // Fallback if worker creation fails for other reasons
            const parser = new MshParser();
            currentMesh = await parser.parse(content, (message, percent) => {
                statusUI.detail.textContent = message;
                statusUI.bar.style.width = `${(percent * 100).toFixed(0)}%`;
            });
            finalizeLoad(content, save);
        }
    }
}

function finalizeLoad(content, save) {
    if (save) {
        // LocalStorage typically has a 5MB limit. To be safe, don't store meshes > 2MB.
        const sizeMB = content.length / (1024 * 1024);
        if (sizeMB < 2.0) {
            try {
                localStorage.setItem('lastMesh', content);
            } catch (e) {
                console.warn("Failed to save mesh to LocalStorage:", e);
            }
        } else {
            console.log(`Mesh size (${sizeMB.toFixed(2)}MB) exceeds safe LocalStorage limit. Persistence disabled for this file.`);
            // Clear previous lastMesh to avoid confusion if it exists
            localStorage.removeItem('lastMesh');
        }
    }

    overlayHints.classList.add('hidden');
    sidebar.classList.remove('hidden');

    statusUI.bar.style.width = '100%';
    statusUI.detail.textContent = "Finalizing rendering...";
    
    // Crucial: Resize canvas AFTER sidebar is visible
    resizeCanvas();
    updateStats();
    populatePhysicalGroups();
    resetView();
    render();

    // Hide overlay after a short delay
    setTimeout(() => {
        statusUI.overlay.classList.add('hidden');
    }, 500);
}

function handleLoadError(message) {
    console.error("Load failed:", message);
    statusUI.text.textContent = "Error Loading Mesh";
    statusUI.detail.textContent = message;
    setTimeout(() => statusUI.overlay.classList.add('hidden'), 3000);
}

function updateStats() {
    stats.cells.textContent = currentMesh.cells.length;
    stats.nodes.textContent = currentMesh.nodes.size;
    stats.faces.textContent = currentMesh.faces.length;
    let internal = currentMesh.faces.filter(f => !f.isBoundary).length;
    stats.internal.textContent = internal;
}

function populatePhysicalGroups() {
    const list = document.getElementById('physical-groups-list');
    list.innerHTML = '';

    const cellGroups = new Map();
    const faceGroups = new Map();

    currentMesh.cells.forEach(c => {
        if (!c.physicalName || c.physicalName === "internal") return;
        cellGroups.set(c.physicalName, (cellGroups.get(c.physicalName) || 0) + 1);
    });

    currentMesh.faces.forEach(f => {
        if (!f.physicalName || f.physicalName === "internal") return;
        faceGroups.set(f.physicalName, (faceGroups.get(f.physicalName) || 0) + 1);
    });

    const createItem = (name, count, type) => {
        const item = document.createElement('div');
        item.className = 'tag-item';
        item.innerHTML = `
            <div class="tag-info">
                <span class="tag-type-icon">${type === 'cell' ? '▤' : '▥'}</span>
                <span class="tag-name">${name}</span>
            </div>
            <span class="tag-count">${count}</span>
        `;
        item.onclick = () => {
            if (activePhysicalGroup && activePhysicalGroup.name === name) {
                activePhysicalGroup = null;
                item.classList.remove('active');
            } else {
                document.querySelectorAll('.tag-item').forEach(i => i.classList.remove('active'));
                activePhysicalGroup = { name, type };
                item.classList.add('active');
            }
            render();
        };
        return item;
    };

    if (faceGroups.size > 0) {
        const h = document.createElement('h4');
        h.textContent = "Boundaries";
        h.className = "sidebar-subtitle";
        list.appendChild(h);
        Array.from(faceGroups.entries()).sort().forEach(([name, count]) => {
            list.appendChild(createItem(name, count, 'face'));
        });
    }

    if (cellGroups.size > 0) {
        const h = document.createElement('h4');
        h.textContent = "Cell Zones";
        h.className = "sidebar-subtitle";
        list.appendChild(h);
        Array.from(cellGroups.entries()).sort().forEach(([name, count]) => {
            list.appendChild(createItem(name, count, 'cell'));
        });
    }
}

function computeCellQuality(cell) {
    const nodes = cell.nodeIds.map(nid => currentMesh.nodes.get(nid));
    if (nodes.length < 3) return 1.0;

    // Aspect Ratio Calculation (Max Edge / Min Edge)
    let maxDist = 0;
    let minDist = Infinity;

    for (let i = 0; i < nodes.length; i++) {
        const p1 = nodes[i];
        const p2 = nodes[(i + 1) % nodes.length];
        const d = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        maxDist = Math.max(maxDist, d);
        minDist = Math.min(minDist, d);
    }

    return maxDist / (minDist || 1e-12);
}

function getQualityColor(ar) {
    if (ar < 1.5) return '#1a7f37'; // Green
    if (ar < 3.0) return '#d29922'; // Yellow/Orange
    if (ar < 6.0) return '#bc4c00'; // Orange/Red
    return '#cf222e'; // Red
}

function resetView() {
    if (!currentMesh) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    currentMesh.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
    });

    const meshWidth = maxX - minX || 1;
    const meshHeight = maxY - minY || 1;
    const meshCenterX = (minX + maxX) / 2;
    const meshCenterY = (minY + maxY) / 2;

    const rect = canvas.getBoundingClientRect();
    const padding = 0.8;

    // Uniform scale
    view.zoom = Math.min(rect.width / meshWidth, rect.height / meshHeight) * padding;

    // Set offsets so world center matches canvas center
    view.offsetX = -meshCenterX * view.zoom;
    view.offsetY = -meshCenterY * view.zoom;

    render();
}

// Coordinate transforms
// view.offsetX/Y are now pixel offsets from the canvas center
function worldToCanvas(wx, wy) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: rect.width / 2 + (wx * view.zoom + view.offsetX),
        y: rect.height / 2 - (wy * view.zoom + view.offsetY) // Center logic + flip Y
    };
}

function canvasToWorld(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (cx - rect.width / 2 - view.offsetX) / view.zoom,
        y: (rect.height / 2 - cy - view.offsetY) / view.zoom
    };
}

function centerOnCell(cell) {
    if (!cell || !currentMesh) return;

    const nodes = cell.nodeIds.map(nid => currentMesh.nodes.get(nid));
    const centroidX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
    const centroidY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;

    view.offsetX = -centroidX * view.zoom;
    view.offsetY = -centroidY * view.zoom;

    render();
}

function toggleZoomMode() {
    interactionMode = interactionMode === 'pan' ? 'zoom' : 'pan';
    zoomToggleBtn.classList.toggle('active', interactionMode === 'zoom');
    canvas.classList.toggle('crosshair', interactionMode === 'zoom');
}

// Interaction
function onMouseDown(e) {
    if (interactionMode === 'zoom') {
        zoomArea.active = true;
        zoomArea.start = canvasToWorld(e.offsetX, e.offsetY);
        zoomArea.end = zoomArea.start;
    } else if (interactionMode === 'ruler') {
        const mouse = canvasToWorld(e.offsetX, e.offsetY);
        if (!rulerData.p1 || (rulerData.p1 && rulerData.p2)) {
            rulerData.p1 = mouse;
            rulerData.p2 = null;
        } else {
            rulerData.p2 = mouse;
        }
        render();
    } else {
        view.isDragging = true;
        view.lastMouseX = e.clientX;
        view.lastMouseY = e.clientY;
    }
}

function onMouseMove(e) {
    if (interactionMode === 'zoom' && zoomArea.active) {
        zoomArea.end = canvasToWorld(e.offsetX, e.offsetY);
        render();
    } else if (interactionMode === 'ruler' && rulerData.p1 && !rulerData.p2) {
        // Preview line
        render(); 
    } else if (view.isDragging) {
        const dx = e.clientX - view.lastMouseX;
        const dy = e.clientY - view.lastMouseY;

        view.offsetX += dx;
        view.offsetY -= dy;

        view.lastMouseX = e.clientX;
        view.lastMouseY = e.clientY;
        render();
    }
}

function onMouseUp(e) {
    if (interactionMode === 'zoom' && zoomArea.active) {
        zoomArea.active = false;
        if (zoomArea.start && zoomArea.end) {
            const dx = Math.abs(zoomArea.start.x - zoomArea.end.x);
            const dy = Math.abs(zoomArea.start.y - zoomArea.end.y);
            // Minimum drag distance to trigger zoom
            if (dx > 0.0001 && dy > 0.0001) {
                zoomToRect(zoomArea.start, zoomArea.end);
            }
        }
        zoomArea.start = null;
        zoomArea.end = null;
        render();
    }
    view.isDragging = false;
}

function zoomToRect(p1, p2) {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    const rectWidth = maxX - minX;
    const rectHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const canvasRect = canvas.getBoundingClientRect();
    const padding = 0.9;

    view.zoom = Math.min(canvasRect.width / rectWidth, canvasRect.height / rectHeight) * padding;
    view.offsetX = -centerX * view.zoom;
    view.offsetY = -centerY * view.zoom;

    render();
}

function onWheel(e) {
    e.preventDefault();
    const cx = e.offsetX;
    const cy = e.offsetY;

    const worldBefore = canvasToWorld(cx, cy);

    const scaleFactor = 1.1;
    if (e.deltaY < 0) view.zoom *= scaleFactor;
    else view.zoom /= scaleFactor;

    // Adjust offsets so the point under the mouse remains stable
    const canvasAfter = worldToCanvas(worldBefore.x, worldBefore.y);
    view.offsetX -= (canvasAfter.x - cx);
    view.offsetY -= (cy - canvasAfter.y); // Flipped Y correction

    render();
}

function toggleTheme() {
    isLightMode = !isLightMode;
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
    updateThemeIcon();
    render();
}

function updateThemeIcon() {
    themeToggle.textContent = isLightMode ? '○' : '◐';
}

function getZoneColor(name) {
    if (!name || name === "internal") return null;
    
    // Hash-based deterministic color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h = Math.abs(hash % 360);
    const s = 70; // Vibrant saturation
    const l = isLightMode ? 75 : 35; // Bright for light, darker for dark
    return `hsl(${h}, ${s}%, ${l}%)`;
}

function getThemeColors() {
    if (isLightMode) {
        return {
            mesh: '#8c959f', // Darkened for better contrast on pastel zones
            boundary: '#1a7f37',
            selected: '#0969da',
            neighbor: 'rgba(26, 127, 55, 0.1)',
            labelBg: 'rgba(255, 255, 255, 0.95)',
            textPrimary: '#1f2328',
            highlight: '#cf222e'
        };
    }
    return {
        mesh: '#30363d',
        boundary: '#238636',
        selected: '#58a6ff',
        neighbor: 'rgba(35, 134, 54, 0.1)',
        labelBg: 'rgba(13, 17, 23, 0.85)',
        textPrimary: '#c9d1d9',
        highlight: '#fceea7'
    };
}

function onClick(e) {
    if (!currentMesh) return;

    const x = e.offsetX;
    const y = e.offsetY;
    const mouse = canvasToWorld(x, y);

    // General point-in-polygon hit test
    const cell = currentMesh.cells.find(c => {
        const vertices = c.nodeIds.map(id => currentMesh.nodes.get(id));
        if (vertices.some(v => !v)) return false;
        return pointInPolygon(mouse.x, mouse.y, vertices);
    });

    if (cell) {
        selectCell(cell.id);
    } else {
        deselect();
    }
}

function pointInPolygon(px, py, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;

        const intersect = ((yi > py) !== (yj > py))
            && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function selectCell(id) {
    selectedCellId = id;
    selectionDetails.classList.remove('hidden');

    // O(1) Lookup: assuming currentMesh.cells is indexed by (id - 1)
    const cell = currentMesh.cells[id - 1]; 
    if (!cell) return;
    selection.id.textContent = cell.id;
    selection.type.textContent = cell.type || "Polygon";
    selection.physical.textContent = cell.physicalName;

    // Calculate and display centroid
    const nodes = cell.nodeIds.map(nid => currentMesh.nodes.get(nid));
    const centroidX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
    const centroidY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;
    selection.centroid.textContent = `(${centroidX.toFixed(4)}, ${centroidY.toFixed(4)})`;

    // Update Nodes list with Coordinates
    selection.nodes.innerHTML = cell.nodeIds.map(nid => {
        const node = currentMesh.nodes.get(nid);
        return `<li>
            <span class="tag">${nid}</span>
            <span class="coord-val">(${node.x.toFixed(3)}, ${node.y.toFixed(3)})</span>
        </li>`;
    }).join('');

    const faces = cell.faceIds.map(fid => currentMesh.faces[fid]);
    selection.faces.innerHTML = faces.map(f => {
        const p1 = currentMesh.nodes.get(f.nodes[0]);
        const p2 = currentMesh.nodes.get(f.nodes[1]);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        return `
        <li>
            <div class="face-header">
                <span>Face ${f.id}</span>
                <span class="small text-muted">${f.isBoundary ? 'Boundary' : 'Internal'}</span>
            </div>
            <span class="face-mid">Mid: (${midX.toFixed(3)}, ${midY.toFixed(3)})</span>
        </li>
    `;
    }).join('');

    const neighbors = faces
        .map(f => f.owner === id ? f.neighbor : f.owner)
        .filter(nb => nb !== -1);

    selection.neighbors.innerHTML = neighbors.map(nb => `
        <span class="tag tag-neighbor" onclick="selectCell(${nb})">${nb}</span>
    `).join('');

    render();
}

function deselect() {
    selectedCellId = null;
    selectionDetails.classList.add('hidden');
    render();
}

// Rendering
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!currentMesh) return;

    const colors = getThemeColors();
    const dpr = window.devicePixelRatio || 1;
    
    // Viewport bounds in world coordinates for culling
    const pMin = canvasToWorld(0, 0);
    const pMax = canvasToWorld(canvas.width / dpr, canvas.height / dpr);
    const margin = (pMax.x - pMin.x) * 0.1;
    const xMin = pMin.x - margin, xMax = pMax.x + margin;
    const yMin = pMax.y - margin, yMax = pMin.y + margin; 

    // 1. Draw Physical Zones first (as background)
    if (showPhysicalZones || showQualityMap || activePhysicalGroup) {
        currentMesh.cells.forEach(cell => {
            const pts = cell.nodeIds.map(nid => worldToCanvas(currentMesh.nodes.get(nid).x, currentMesh.nodes.get(nid).y));
            
            // Viewport Culling
            const outX = pts.every(p => p.x < 0 || p.x > canvas.width / dpr);
            const outY = pts.every(p => p.y < 0 || p.y > canvas.height / dpr);
            if (outX || outY) return;

            if (showQualityMap) {
                fillColor = getQualityColor(computeCellQuality(cell));
            } else if (activePhysicalGroup && activePhysicalGroup.type === 'cell' && cell.physicalName === activePhysicalGroup.name) {
                fillColor = isLightMode ? 'rgba(9, 105, 218, 0.4)' : 'rgba(88, 166, 255, 0.4)';
            } else if (showPhysicalZones && cell.physicalName && cell.physicalName !== "internal") {
                fillColor = getZoneColor(cell.physicalName);
            }

            if (fillColor) {
                ctx.fillStyle = fillColor;
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
                ctx.closePath();
                ctx.fill();
            }
        });
    }

    // 2. Batch Mesh Lines
    const isVeryZoomedOut = view.zoom < 0.05;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const internalPath = new Path2D();
    const boundaryPath = new Path2D();

    currentMesh.faces.forEach(f => {
        const p1 = currentMesh.nodes.get(f.nodes[0]);
        const p2 = currentMesh.nodes.get(f.nodes[1]);

        // Viewport Culling
        const outX = (p1.x < xMin && p2.x < xMin) || (p1.x > xMax && p2.x > xMax);
        const outY = (p1.y < yMin && p2.y < yMin) || (p1.y > yMax && p2.y > yMax);
        if (outX || outY) return;

        const path = f.isBoundary ? boundaryPath : internalPath;
        if (!f.isBoundary && isVeryZoomedOut) return; 

        // Special: Highlight active boundary group
        if (activePhysicalGroup && activePhysicalGroup.type === 'face' && f.physicalName === activePhysicalGroup.name) {
            const c1 = worldToCanvas(p1.x, p1.y);
            const c2 = worldToCanvas(p2.x, p2.y);
            ctx.save();
            ctx.strokeStyle = colors.highlight;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(c1.x, c1.y);
            ctx.lineTo(c2.x, c2.y);
            ctx.stroke();
            ctx.restore();
        }

        const c1 = worldToCanvas(p1.x, p1.y);
        const c2 = worldToCanvas(p2.x, p2.y);

        path.moveTo(c1.x, c1.y);
        path.lineTo(c2.x, c2.y);
    });

    // 3. Draw Mesh Skeleton over zones
    ctx.beginPath();
    ctx.strokeStyle = colors.mesh;
    ctx.lineWidth = 1;
    ctx.stroke(internalPath);

    ctx.beginPath();
    ctx.strokeStyle = colors.boundary;
    ctx.lineWidth = 2;
    ctx.stroke(boundaryPath);

    // 4. Draw Highlight for Selection
    if (selectedCellId) {
        const cell = currentMesh.cells[selectedCellId - 1]; // O(1)
        if (!cell) return;

        const pts = cell.nodeIds.map(nid => worldToCanvas(currentMesh.nodes.get(nid).x, currentMesh.nodes.get(nid).y));

        ctx.fillStyle = isLightMode ? 'rgba(9, 105, 218, 0.15)' : 'rgba(88, 166, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = colors.selected;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Highlight neighbors
        const neighborIds = cell.faceIds
            .map(fid => {
                const f = currentMesh.faces[fid];
                return f.owner === selectedCellId ? f.neighbor : f.owner;
            })
            .filter(nb => nb !== -1);

        neighborIds.forEach(nid => {
            const nbCell = currentMesh.cells[nid - 1]; // O(1)
            if (!nbCell) return;
            const pts = nbCell.nodeIds.map(nid => worldToCanvas(currentMesh.nodes.get(nid).x, currentMesh.nodes.get(nid).y));
            ctx.fillStyle = colors.neighbor;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.closePath();
            ctx.fill();
        });

        // 3. Draw On-Canvas Labels
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const nodes = cell.nodeIds.map(nid => currentMesh.nodes.get(nid));
        const faces = cell.faceIds.map(fid => currentMesh.faces[fid]);

        // Draw Face IDs (Cyan/Blue)
        faces.forEach(f => {
            const p1 = currentMesh.nodes.get(f.nodes[0]);
            const p2 = currentMesh.nodes.get(f.nodes[1]);
            const mid = worldToCanvas((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);

            // Draw small background for legibility
            ctx.fillStyle = colors.labelBg;
            const txt = `F${f.id}`;
            const metrics = ctx.measureText(txt);
            ctx.fillRect(mid.x - metrics.width / 2 - 2, mid.y - 7, metrics.width + 4, 14);

            ctx.fillStyle = colors.selected;
            ctx.fillText(txt, mid.x, mid.y);
        });

        // Draw Node IDs (Primary Text Color)
        nodes.forEach((node, i) => {
            const p = worldToCanvas(node.x, node.y);
            const nid = cell.nodeIds[i];

            ctx.fillStyle = colors.labelBg;
            const txt = `N${nid}`;
            const metrics = ctx.measureText(txt);
            ctx.fillRect(p.x - metrics.width / 2 - 2, p.y - 7, metrics.width + 4, 14);

            ctx.fillStyle = colors.textPrimary;
            ctx.fillText(txt, p.x, p.y);
        });

        // Draw Cell ID (Highlight Color)
        const centroidX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
        const centroidY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;
        const center = worldToCanvas(centroidX, centroidY);

        ctx.fillStyle = colors.labelBg;
        const cTxt = `CELL ${cell.id}`;
        const cMetrics = ctx.measureText(cTxt);
        ctx.fillRect(center.x - cMetrics.width / 2 - 4, center.y - 9, cMetrics.width + 8, 18);

        ctx.fillStyle = colors.highlight;
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillText(cTxt, center.x, center.y);

        // Draw Neighbor Cell IDs (Green)
        ctx.font = 'bold 11px "JetBrains Mono", monospace';

        neighborIds.forEach(nid => {
            const nbCell = currentMesh.cells[nid - 1]; // O(1)
            if (!nbCell) return;
            const nbNodes = nbCell.nodeIds.map(id => currentMesh.nodes.get(id));
            const nbCentroidX = nbNodes.reduce((sum, n) => sum + n.x, 0) / nbNodes.length;
            const nbCentroidY = nbNodes.reduce((sum, n) => sum + n.y, 0) / nbNodes.length;
            const nbCenter = worldToCanvas(nbCentroidX, nbCentroidY);

            const nbTxt = `NB ${nid}`;
            const nbMetrics = ctx.measureText(nbTxt);

            ctx.fillStyle = colors.labelBg;
            ctx.fillRect(nbCenter.x - nbMetrics.width / 2 - 2, nbCenter.y - 7, nbMetrics.width + 4, 14);

            ctx.fillStyle = colors.boundary;
            ctx.fillText(nbTxt, nbCenter.x, nbCenter.y);
        });
    }

    // 4. Draw Zoom Area Rectangle
    if (zoomArea.active && zoomArea.start && zoomArea.end) {
        const c1 = worldToCanvas(zoomArea.start.x, zoomArea.start.y);
        const c2 = worldToCanvas(zoomArea.end.x, zoomArea.end.y);

        const rectX = Math.min(c1.x, c2.x);
        const rectY = Math.min(c1.y, c2.y);
        const rectW = Math.abs(c1.x - c2.x);
        const rectH = Math.abs(c1.y - c2.y);

        // Draw shadow/glow for contrast
        ctx.setLineDash([]);
        ctx.strokeStyle = isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(rectX, rectY, rectW, rectH);

        // Primary dashed line
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = colors.selected;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rectX, rectY, rectW, rectH);

        // Fill
        ctx.fillStyle = isLightMode ? 'rgba(9, 105, 218, 0.15)' : 'rgba(88, 166, 255, 0.15)';
        ctx.fillRect(rectX, rectY, rectW, rectH);
        
        ctx.setLineDash([]);
    }

    // 5. Draw Face Normals
    if (showFaceNormals) {
        drawFaceNormals(colors);
    }

    // 6. Draw Overlays (Axis, Scale, Coordinates, Ruler)
    drawAxisCompass(colors);
    drawScaleBar(colors);
    drawMouseCoordinates(colors);
    
    if (interactionMode === 'ruler' || (rulerData.p1 && rulerData.p2)) {
        drawRuler(colors);
    }
}

function drawFaceNormals(colors) {
    const dpr = window.devicePixelRatio || 1;
    const arrowLen = 15;
    
    ctx.save();
    ctx.strokeStyle = colors.boundary || '#238636';
    ctx.lineWidth = 1.5;

    // To prevent clutter, only draw if zoomed in enough
    if (view.zoom < 20) {
        ctx.restore();
        return;
    }

    currentMesh.faces.forEach(f => {
        const p1 = currentMesh.nodes.get(f.nodes[0]);
        const p2 = currentMesh.nodes.get(f.nodes[1]);
        if (!p1 || !p2) return;

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const mid = worldToCanvas(midX, midY);

        // Viewport Culling
        if (mid.x < 0 || mid.x > canvas.width / dpr || mid.y < 0 || mid.y > canvas.height / dpr) return;

        // Normal direction (90 degrees to face)
        // Face vector (p2 - p1)
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        
        // Perpendicular vector (-dy, dx)
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        // FVM convention: Normal points from Owner to Neighbor
        // We can just draw it pointing "outward" for now
        const tip = worldToCanvas(midX + nx * (arrowLen/view.zoom), midY + ny * (arrowLen/view.zoom));

        ctx.beginPath();
        ctx.moveTo(mid.x, mid.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
        
        const angle = Math.atan2(tip.y - mid.y, tip.x - mid.x);
        drawArrowHead(tip.x, tip.y, angle, colors.boundary || '#238636');
    });
    ctx.restore();
}

function drawRuler(colors) {
    const p1 = rulerData.p1;
    let p2 = rulerData.p2;

    if (!p1) return;
    
    // If not locked, use current mouse pos for feedback
    if (!p2) p2 = canvasToWorld(view.mouseX, view.mouseY);

    const c1 = worldToCanvas(p1.x, p1.y);
    const c2 = worldToCanvas(p2.x, p2.y);

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = colors.highlight || '#fceea7';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.stroke();

    // Crosshairs at endpoints
    ctx.setLineDash([]);
    ctx.beginPath();
    [c1, c2].forEach(p => {
        ctx.moveTo(p.x - 5, p.y); ctx.lineTo(p.x + 5, p.y);
        ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x, p.y + 5);
    });
    ctx.stroke();

    // Labels
    const dist = Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2);
    const midX = (c1.x + c2.x) / 2;
    const midY = (c1.y + c2.y) / 2;

    const label = `L: ${dist.toFixed(4)} (dx: ${Math.abs(p2.x-p1.x).toFixed(4)}, dy: ${Math.abs(p2.y-p1.y).toFixed(4)})`;
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    
    const metrics = ctx.measureText(label);
    ctx.fillStyle = colors.labelBg;
    ctx.fillRect(midX - metrics.width/2 - 5, midY - 10, metrics.width + 10, 20);
    
    ctx.fillStyle = colors.highlight || '#fceea7';
    ctx.textAlign = 'center';
    ctx.fillText(label, midX, midY + 4);

    ctx.restore();
}

function drawAxisCompass(colors) {
    const size = 60;
    const padding = 20;
    const bottom = canvas.height / (window.devicePixelRatio || 1) - padding;
    const left = padding + size/2;

    ctx.save();
    ctx.translate(left, bottom);
    
    // Y-Axis (Up)
    ctx.strokeStyle = colors.highlight || '#fceea7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -size/2);
    ctx.stroke();
    
    // X-Axis (Right)
    ctx.strokeStyle = colors.selected;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size/2, 0);
    ctx.stroke();

    // Arrows
    drawArrowHead(0, -size/2, -Math.PI/2, colors.highlight || '#fceea7');
    drawArrowHead(size/2, 0, 0, colors.selected);

    // Labels
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.textPrimary;
    ctx.textAlign = 'center';
    ctx.fillText('Y', 0, -size/2 - 10);
    ctx.fillText('X', size/2 + 10, 4);

    ctx.restore();
}

function drawArrowHead(x, y, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-6, -3);
    ctx.lineTo(-6, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawScaleBar(colors) {
    if (!currentMesh) return;

    // Calculate a good scale unit (1, 2, 5 * 10^n)
    const targetPx = 100; // Desired width in pixels
    const worldDist = targetPx / view.zoom;
    
    const exponent = Math.floor(Math.log10(worldDist));
    const base = worldDist / Math.pow(10, exponent);
    
    let unit;
    if (base < 1.5) unit = 1;
    else if (base < 3.5) unit = 2;
    else if (base < 7.5) unit = 5;
    else unit = 10;
    
    const scaleValue = unit * Math.pow(10, exponent);
    const scalePx = scaleValue * view.zoom;

    const padding = 20;
    const bottom = canvas.height / (window.devicePixelRatio || 1) - padding;
    const right = canvas.width / (window.devicePixelRatio || 1) - padding;

    ctx.save();
    ctx.strokeStyle = colors.textPrimary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(right - scalePx, bottom - 5);
    ctx.lineTo(right - scalePx, bottom);
    ctx.lineTo(right, bottom);
    ctx.lineTo(right, bottom - 5);
    ctx.stroke();

    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.textPrimary;
    ctx.textAlign = 'center';
    ctx.fillText(scaleValue.toPrecision(2), right - scalePx/2, bottom - 10);
    ctx.restore();
}

function drawMouseCoordinates(colors) {
    const world = canvasToWorld(view.mouseX, view.mouseY);
    const padding = 20;
    const top = padding + 15;
    const left = padding;

    ctx.save();
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    
    const textX = `X: ${world.x.toFixed(4)}`;
    const textY = `Y: ${world.y.toFixed(4)}`;
    const width = Math.max(ctx.measureText(textX).width, ctx.measureText(textY).width) + 10;
    
    // Background Box
    ctx.fillStyle = colors.labelBg;
    ctx.fillRect(left - 5, top - 12, width, 32);
    ctx.strokeStyle = colors.border || colors.mesh;
    ctx.lineWidth = 1;
    ctx.strokeRect(left - 5, top - 12, width, 32);

    ctx.fillStyle = colors.textPrimary;
    ctx.textAlign = 'left';
    ctx.fillText(textX, left, top);
    ctx.fillText(textY, left, top + 15);
    ctx.restore();
}

init();
