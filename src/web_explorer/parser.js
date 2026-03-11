class MshParser {
    constructor() {
        this.nodes = new Map();
        this.cells = [];
        this.faces = [];
        this.physicalNames = new Map(); // TagID -> Name
    }

    async parse(content, onProgress) {
        this.nodes.clear();
        this.cells = [];
        this.faces = [];
        this.physicalNames.clear();

        const lines = content.split('\n');
        let i = 0;
        const totalLines = lines.length;

        while (i < lines.length) {
            const line = lines[i].trim();

            // Periodically report progress and yield
            if (i % 5000 === 0 && onProgress) {
                onProgress('Parsing lines...', (i / totalLines) * 0.5); // Parser is 50% of work
                await new Promise(r => setTimeout(r, 0));
            }

            if (line === "$PhysicalNames") {
                const count = parseInt(lines[++i]);
                for (let n = 0; n < count; n++) {
                    const row = lines[++i].trim();
                    if (!row) continue;
                    const parts = row.split(/\s+/);
                    const tag = parseInt(parts[1]);
                    const name = parts[2].replace(/"/g, '');
                    this.physicalNames.set(tag, name);
                }
            } else if (line === "$Nodes") {
                const count = parseInt(lines[++i]);
                for (let n = 0; n < count; n++) {
                    const row = lines[++i].trim();
                    if (!row) continue;
                    const parts = row.split(/\s+/);
                    this.nodes.set(parseInt(parts[0]), {
                        x: parseFloat(parts[1]),
                        y: parseFloat(parts[2]),
                        z: parseFloat(parts[3])
                    });
                }
            } else if (line === "$Elements") {
                const count = parseInt(lines[++i]);
                for (let e = 0; e < count; e++) {
                    const row = lines[++i].trim();
                    if (!row) continue;
                    const parts = row.split(/\s+/).map(Number);
                    const type = parts[1];
                    const tagsCount = parts[2];
                    const physicalTag = tagsCount > 0 ? parts[3] : null;
                    const nodeStartIndex = 3 + tagsCount;

                    if (type === 2 || type === 3) { // Triangle or Quad
                        const nodeIds = parts.slice(nodeStartIndex);
                        this.cells.push({
                            id: this.cells.length + 1,
                            type: type === 2 ? "Triangle" : "Quad",
                            nodeIds: nodeIds,
                            faceIds: [],
                            physicalTag: physicalTag,
                            physicalName: this.physicalNames.get(physicalTag) || "internal"
                        });
                    }
                }
            }
            i++;
        }

        await this.buildTopology(onProgress);

        return {
            nodes: this.nodes,
            cells: this.cells,
            faces: this.faces,
            physicalNames: this.physicalNames
        };
    }

    async buildTopology(onProgress) {
        const edgeToFace = new Map();
        const getEdgeKey = (v1, v2) => v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;

        const totalCells = this.cells.length;
        for (let idx = 0; idx < totalCells; idx++) {
            const cell = this.cells[idx];

            // Periodically report progress and yield
            if (idx % 2000 === 0 && onProgress) {
                onProgress('Building Topology...', 0.5 + (idx / totalCells) * 0.5);
                await new Promise(r => setTimeout(r, 0));
            }

            const n = cell.nodeIds.length;
            for (let i = 0; i < n; i++) {
                const v1 = cell.nodeIds[i];
                const v2 = cell.nodeIds[(i + 1) % n];
                const key = getEdgeKey(v1, v2);

                if (!edgeToFace.has(key)) {
                    const fId = this.faces.length;
                    this.faces.push({
                        id: fId,
                        nodes: [v1, v2],
                        owner: cell.id,
                        neighbor: -1,
                        isBoundary: true
                    });
                    edgeToFace.set(key, fId);
                    cell.faceIds.push(fId);
                } else {
                    const fId = edgeToFace.get(key);
                    this.faces[fId].neighbor = cell.id;
                    this.faces[fId].isBoundary = false;
                    cell.faceIds.push(fId);
                }
            }
        }
    }
}
