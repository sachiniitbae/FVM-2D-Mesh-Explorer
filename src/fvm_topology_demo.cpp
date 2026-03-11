#include <iostream>
#include <vector>
#include <string>
#include <map>

/**
 * In FVM, the primary data structure is the Cell (or Control Volume).
 * However, the physics (fluxes) are calculated at the Faces.
 * Therefore, a robust mesh topology typically stores:
 * 1. A list of Cells, each knowing its neighbor cells or its faces.
 * 2. A list of Faces, each knowing its left (owner) and right (neighbor) cells.
 */

struct Face {
    int id;
    int ownerCellId;    // The 'left' or 'owner' cell
    int neighborCellId; // The 'right' or 'neighbor' cell (-1 for boundary)
    bool isBoundary;
    
    Face(int _id, int owner, int neighbor = -1) 
        : id(_id), ownerCellId(owner), neighborCellId(neighbor) {
        isBoundary = (neighbor == -1);
    }
};

struct Cell {
    int id;
    std::vector<int> faceIds; // Indices into the global face list
    
    Cell(int _id) : id(_id) {}
};

/**
 * Example 1 Mesh Topology Implementation
 * 
 * Cell Connectivity from image:
 * 1 -> 2, 3
 * 2 -> 1, 3, 4
 * 3 -> 1, 2, 4
 * 4 -> 2, 3
 */

class Mesh {
public:
    std::vector<Cell> cells;
    std::vector<Face> faces;

    void initializeExampleMesh() {
        // 1. Create 4 cells (using 1-based indexing for consistency with the image)
        for (int i = 1; i <= 4; ++i) {
            cells.emplace_back(i);
        }

        // 2. Define Internal Faces (Representing the lines between cells)
        // Face between 1 and 2
        addFace(1, 2); 
        // Face between 1 and 3
        addFace(1, 3);
        // Face between 2 and 3
        addFace(2, 3);
        // Face between 2 and 4
        addFace(2, 4);
        // Face between 3 and 4
        addFace(3, 4);

        // 3. (Optional) Define Boundary Faces
        // Cell 1 has 2 boundary faces (top and left)
        // Cell 2 has 2 boundary faces (top and right)
        // Cell 3 has 1 boundary face (diagonal bottom-left)
        // Cell 4 has 2 boundary faces (bottom and right)
        // Note: For simplicity in this demo, we focus on internal connectivity.
    }

    void addFace(int c1, int c2) {
        int faceId = faces.size();
        faces.emplace_back(faceId, c1, c2);
        
        // Tell cells they have this face
        cells[c1-1].faceIds.push_back(faceId);
        cells[c2-1].faceIds.push_back(faceId);
    }

    void printConnectivity() {
        std::cout << "--- Mesh Connectivity (Internal) ---" << std::endl;
        for (const auto& cell : cells) {
            std::cout << "Cell " << cell.id << " is connected to cells: ";
            for (int fId : cell.faceIds) {
                const auto& face = faces[fId];
                int neighbor = (face.ownerCellId == cell.id) ? face.neighborCellId : face.ownerCellId;
                if (neighbor != -1) {
                    std::cout << neighbor << " ";
                }
            }
            std::cout << std::endl;
        }
    }

    void simulateFluxLoop() {
        std::cout << "\n--- Simulating FVM Flux Calculation ---" << std::endl;
        std::cout << "Iterating over " << faces.size() << " internal faces:" << std::endl;
        
        // In FVM, we iterate over faces to compute fluxes exactly once.
        for (const auto& face : faces) {
            if (!face.isBoundary) {
                std::cout << "  Calculating flux between Cell " << face.ownerCellId 
                          << " and Cell " << face.neighborCellId << std::endl;
                
                // flux = conductivity * (T_neighbor - T_owner) / distance * area;
                // Accumulate: 
                // Source[owner] -= flux;
                // Source[neighbor] += flux;
            }
        }
    }
};

int main() {
    Mesh mesh;
    mesh.initializeExampleMesh();
    mesh.printConnectivity();
    mesh.simulateFluxLoop();
    
    return 0;
}
