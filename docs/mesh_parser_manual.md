# MshParser: Technical Manual

This manual explains how `msh_parser.cpp` converts a standard Gmsh mesh into a **Face-Based Topology** ready for Finite Volume Method (FVM) simulations.

## 1. The Core Problem
Gmsh (and most meshers) output **Elements**:
- Element 1: Nodes (A, B, C)
- Element 2: Nodes (B, D, C)

However, FVM solvers (like OpenFOAM) need to know about **Faces**:
- Face 1: Shared between Element 1 and Element 2.
- Flux is calculated across Face 1 and applied to both elements.

## 2. Parsing the MSH Format (v2.2)
The parser looks for two main sections:

### `$Nodes`
```text
44          // Total number of nodes
1 0 0 0     // NodeID X Y Z
2 1 0 0
...
```
The parser stores these in a `std::vector<Node>`. We use **1-based indexing** to match Gmsh's internal ID system.

### `$Elements`
```text
86          // Total number of elements
15 1 2 4 1 10 11        // Line (Type 1) - Boundary
21 2 2 5 1 35 37 38     // Triangle (Type 2) - Cell
22 3 2 5 1 40 41 42 43  // Quad (Type 3) - Cell
```
The parser handles three main types:
- **Type 2 & 3 (Triangles/Quads)**: Stored as `Cells`. These form the 2D computational domain.
- **Type 1 (Lines)**: Stored in a `boundaryElements` map. These explicitly define boundary edges (Inlet, Outlet, etc.) based on physical tags.

### `$PhysicalNames` & Mapping
The parser maps physical tags differently based on element dimensions:
- **Cell Zones**: High-level regional tags (e.g., "Fluid", "Solid").
- **Boundaries**: Node-to-node edge keys are used to link Line elements to topological faces created during the match step.

---

## 3. Mesh Quality & Diagnostics

The visualizer computes real-time metrics for every cell to identify numerical instability risks.

### Aspect Ratio (AR)
Calculated as the ratio of the maximum edge length to the minimum edge length:
$$ AR = \frac{\max(L_{edge})}{\min(L_{edge})} $$
- **Ideal (1.0)**: Perfect equilateral triangles or squares.
- **Critical (> 5.0)**: Highly stretched cells that may lead to poor solver convergence.

### Face Normals
For each face, the parser computes the geometric normal vector $\mathbf{n}$ pointing from the `owner` to the `neighbor`. This is visualized as an arrow $\vec{V}$ at the face midpoint.

---

## 3. Parallel Sort-Match Algorithm (High Performance)

While the initial version used a `std::map` (O(log N)), the production version uses a **Sort-Match** approach which is significantly faster and easier to parallelize with **OpenMP**.

### Step-by-Step:
1. **List All Edges**: For every cell, we list all its edges (3 for triangles, 4 for quads).
2. **Canonical Form**: Each edge is stored as `(min(n1, n2), max(n1, n2))` to ensure consistent ID regardless of orientation.
3. **The Sort Step**: We use `std::sort` on the entire list of edges. Shared edges (internal faces) will now be adjacent in the sorted list.
4. **The Match Step**:
   - Loop through the sorted list.
   - If `Edge[i] == Edge[i+1]`: It's an **Internal Face**. Both cells own this face.
   - If `Edge[i]` is unique: It's a **Boundary Face**. Only one cell owns it.

### Performance:
This refactor improved processing time for 100k+ cell meshes from seconds to **milliseconds**, enabling the high-speed experience in the 2D Mesh Explorer.

---

## 4. Why Use This Structure?
This **Owner/Neighbor** format is standard because:
1. **Memory Efficiency**: Each internal face is stored exactly once.
2. **Numerical Consistency**: The flux leaving Cell A is *guaranteed* to be the exact same flux entering Cell B because they share the same physical face.
3. **Ease of Computation**: To solve, you simply loop over `faces`, calculate the flux, and add/subtract it from the connected `cells`.

```cpp
// Pseudocode for Solver Loop
for (Face& f : faces) {
    double flux = calculateFlux(f);
    cells[f.owner].field -= flux;
    if (!f.isBoundary) {
        cells[f.neighbor].field += flux;
    }
}
```
