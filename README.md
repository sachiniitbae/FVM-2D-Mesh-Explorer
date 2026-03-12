# FVM 2D Mesh Explorer

A high-performance, interactive 2D Finite Volume Method (FVM) mesh explorer and topology analysis suite. Designed for CFD engineers and researchers to visualize and verify complex unstructured meshes with ease.

![FVM Mesh Explorer](https://via.placeholder.com/800x450.png?text=FVM+2D+Mesh+Explorer+Preview) <!-- Replace with actual screenshot when uploaded to GitHub -->

## Key Features

- **High-Performance Rendering**: Optimized for meshes with **0.1M+ cells**, maintaining a fluid **60FPS** interface.
- **Parallel Processing**:
  - **C++ Backend**: Utilizes **OpenMP** for near-instant topology building using a high-speed sort-and-match algorithm.
  - **JS Frontend**: Offloads mesh parsing and topology generation to **Web Workers** to keep the UI responsive.
- **Physical Zone Visualization**: 🎨 Interactive coloring and labeling of physical groups (zones) defined in Gmsh. 
## Technical Highlights

- **Face-Based Topology**: Implements standard CFD connectivity (Face-to-Cell, Cell-to-Face, Face-to-Node) used in solvers like OpenFOAM.
- **Advanced Interactions**:
  - **Zoom to Area Selection**: Drag a rectangle to instantly zoom into mesh details.
  - **Universal Hit-Test**: Point-in-polygon selection for any cell (Triangle, Quad, etc.).
  - **Search by ID**: Quickly locate specific elements in massive datasets.
- **User Interface**:
  - **Dynamic Theme Icons**: ☀️/🌙 icons for high-contrast Dark and Light modes.
  - **Professional Aesthetics**: Minimalist, functional emoji set for intuitive navigation.
  - **High-DPI Support**: Razor-sharp rendering on high-resolution displays.
- **Multi-Format Support**: Native support for **Gmsh .msh (v2.2)** files.

## Technical Stack

- **C++20**: High-performance parser and topology engine.
- **Vanilla JavaScript**: Lightweight, dependency-free frontend logic.
- **HTML5 Canvas**: Accelerated 2D rendering with viewport culling and LOD.
- **OpenMP**: Multi-core parallelization for the CLI suite.

## Project Structure

```text
├── bin/              # Compiled C++ executables
├── docs/             # Technical manuals and topology guides
├── src/              # Source code
│   ├── web_explorer/ # Web application (index.html, app.js, mesh_worker.js)
│   ├── msh_parser.cpp# High-performance C++ parser
│   └── generate_naca63412.py # Airfoil coordinate generator
└── README.md         # You are here!
```

## Getting Started

### 1. Web Explorer
No installation required! Simply open the web interface:
1. Navigate to `src/web_explorer/index.html`.
2. Open it in any modern browser.
3. Drag and drop any `.msh` file from the `meshes/` folder.

### 2. C++ Parser (CLI)
To build the high-performance CLI tool:
```bash
g++ -O3 -fopenmp src/msh_parser.cpp -o bin/msh_parser
./bin/msh_parser ../meshes/naca63412.msh
```

## Sample Meshes (Centralized)

Meshes are now centralized in the root `meshes/` directory for project-wide use:

- **NACA 63-412 Airfoil**: Precise 6-series profile with C-Mesh topology.
- **Refined Circle**: 0.1M+ cells stress-test for renderer performance.
- **L-Shaped Channel**: Multi-zone hybrid mesh (Triangles + Quads).
- **Five-Pointed Star**: Complex boundary geometry with a central source zone.
- **Y-Junction (Tuning Fork)**: Multi-branch domain using spline-based curves.
- **Flower Pattern**: Highly intricate aesthetic mesh with overlapping petal topology.

## Documentation

Detailed guides are available in the [`docs/`](docs/) directory:
- [Mesh Parser Manual](docs/mesh_parser_manual.md): Detailed explanation of the `.msh` parsing logic.
- [Topology Guide](docs/topology_guide.md): Understanding the face-based connectivity implementation.

## Contributing

Feel free to fork this repository, report issues, or submit pull requests to enhance the FVM 2D Mesh Explorer!

---
*Built for the next generation of CFD analysis.*
