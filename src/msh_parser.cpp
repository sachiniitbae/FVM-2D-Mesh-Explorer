#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <sstream>
#include <map>
#include <algorithm>
#include <tuple>

#include <omp.h>
#include <chrono>

struct Node {
    double x, y, z;
};

struct Face {
    int id;
    int v1, v2;         // Vertex IDs (for geometry)
    int owner = -1;     // Cell ID
    int neighbor = -1;  // Cell ID (-1 for boundary)
    bool isBoundary = true;

    Face(int _id, int _v1, int _v2, int _owner) 
        : id(_id), v1(_v1), v2(_v2), owner(_owner) {}
};

struct Cell {
    int id;
    std::string type;
    int physicalTag = -1;
    std::string physicalName = "unspecified";
    std::vector<int> nodeIds;
    std::vector<int> faceIds;
};

// Helper for parallel face discovery
struct EdgeRef {
    int v1, v2;
    int cellId;
    int localFaceIdx;

    EdgeRef(int a, int b, int cid, int lidx) : cellId(cid), localFaceIdx(lidx) {
        v1 = std::min(a, b);
        v2 = std::max(a, b);
    }

    bool operator<(const EdgeRef& other) const {
        if (v1 != other.v1) return v1 < other.v1;
        return v2 < other.v2;
    }
};

class MshParser {
public:
    std::vector<Node> nodes;
    std::vector<Cell> cells;
    std::vector<Face> faces;
    std::map<int, std::string> physicalGroups;

    bool load(const std::string& filename) {
        auto start = std::chrono::high_resolution_clock::now();
        std::cout << "Attempting to load: " << filename << std::endl;
        std::ifstream file(filename);
        if (!file.is_open()) {
            std::cerr << "Could not open file: " << filename << std::endl;
            return false;
        }

        std::string line;
        while (std::getline(file, line)) {
            if (!line.empty() && line.back() == '\r') line.pop_back();

            if (line.find("$PhysicalNames") != std::string::npos) {
                parsePhysicalNames(file);
            } else if (line.find("$Nodes") != std::string::npos) {
                parseNodes(file);
            } else if (line.find("$Elements") != std::string::npos) {
                parseElements(file);
            }
        }
        
        if (cells.empty()) {
            std::cerr << "No 2D elements found in " << filename << std::endl;
            return false;
        }

        std::cout << "Building Topology (Parallel OpenMP)..." << std::endl;
        buildTopologyParallel();
        
        auto end = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> diff = end - start;
        std::cout << "Total processing time: " << diff.count() << "s" << std::endl;
        return true;
    }

    void printSummary() {
        std::cout << "Mesh Summary:" << std::endl;
        std::cout << "  Nodes: " << nodes.size() - 1 << std::endl;
        std::cout << "  Cells (2D Elements): " << cells.size() << std::endl;
        std::cout << "  Faces (Edges): " << faces.size() << std::endl;

        int triCount = 0, quadCount = 0;
        for (const auto& c : cells) {
            if (c.type == "Triangle") triCount++;
            else if (c.type == "Quad") quadCount++;
        }
        std::cout << "  Triangles: " << triCount << ", Quads: " << quadCount << std::endl;

        int boundaryCount = 0;
        for (const auto& f : faces) if (f.isBoundary) boundaryCount++;
        std::cout << "  Internal Faces: " << faces.size() - boundaryCount << std::endl;
        std::cout << "  Boundary Faces: " << boundaryCount << std::endl;
    }

private:
    void parsePhysicalNames(std::ifstream& file) {
        int numNames;
        file >> numNames;
        for (int i = 0; i < numNames; ++i) {
            int dim, tag;
            std::string name;
            file >> dim >> tag >> name;
            if (name.size() >= 2 && name.front() == '"') {
                name = name.substr(1, name.size() - 2);
            }
            physicalGroups[tag] = name;
        }
    }

    void parseNodes(std::ifstream& file) {
        int numNodes;
        if (!(file >> numNodes)) return;
        nodes.assign(numNodes + 1, {0,0,0}); 
        for (int i = 0; i < numNodes; ++i) {
            int id;
            if (!(file >> id)) break;
            file >> nodes[id].x >> nodes[id].y >> nodes[id].z;
        }
    }

    void parseElements(std::ifstream& file) {
        int numElements;
        file >> numElements;
        for (int i = 0; i < numElements; ++i) {
            int id, type, tags;
            file >> id >> type >> tags;
            std::vector<int> elementTags(tags);
            for (int t = 0; t < tags; ++t) file >> elementTags[t];

            if (type == 2 || type == 3) {
                Cell c;
                c.id = cells.size() + 1;
                c.type = (type == 2) ? "Triangle" : "Quad";
                if (tags > 0) {
                    c.physicalTag = elementTags[0];
                    if (physicalGroups.count(c.physicalTag)) c.physicalName = physicalGroups[c.physicalTag];
                }
                int nNodes = (type == 2) ? 3 : 4;
                c.nodeIds.resize(nNodes);
                for (int n = 0; n < nNodes; ++n) file >> c.nodeIds[n];
                cells.push_back(c);
            } else {
                std::string dummy;
                std::getline(file, dummy);
            }
        }
    }

    void buildTopologyParallel() {
        // 1. Collect all edges from all cells
        std::vector<EdgeRef> allEdges;
        allEdges.reserve(cells.size() * 4);

        for (const auto& cell : cells) {
            int n = cell.nodeIds.size();
            for (int i = 0; i < n; ++i) {
                allEdges.emplace_back(cell.nodeIds[i], cell.nodeIds[(i + 1) % n], cell.id, i);
            }
        }

        // 2. Sort edges so shared ones are adjacent
        std::sort(allEdges.begin(), allEdges.end());

        // 3. Match edges and build faces
        faces.reserve(allEdges.size()); // Upper bound
        int totalEdges = allEdges.size();
        
        for (int i = 0; i < totalEdges; ++i) {
            const auto& e1 = allEdges[i];
            
            if (i + 1 < totalEdges && e1.v1 == allEdges[i+1].v1 && e1.v2 == allEdges[i+1].v2) {
                // Shared Internal Face
                const auto& e2 = allEdges[i+1];
                int fId = faces.size();
                Face f(fId, e1.v1, e1.v2, e1.cellId);
                f.neighbor = e2.cellId;
                f.isBoundary = false;
                faces.push_back(f);
                
                cells[e1.cellId - 1].faceIds.push_back(fId);
                cells[e2.cellId - 1].faceIds.push_back(fId);
                i++; // Skip the next edge as it's already paired
            } else {
                // Boundary Face
                int fId = faces.size();
                faces.emplace_back(fId, e1.v1, e1.v2, e1.cellId);
                cells[e1.cellId - 1].faceIds.push_back(fId);
            }
        }
    }
};

int main() {
    try {
        std::cout << "Starting MshParser..." << std::endl;
        MshParser parser;
        if (parser.load("../meshes/hybrid_test.msh")) {
            parser.printSummary();
            
            std::cout << "\nConnectivity check (first 5 cells):" << std::endl;
            for (int i = 0; i < std::min((int)parser.cells.size(), 5); ++i) {
                std::cout << "Cell " << parser.cells[i].id << " neighbors: ";
                for (int fId : parser.cells[i].faceIds) {
                    const auto& f = parser.faces[fId];
                    int nb = (f.owner == parser.cells[i].id) ? f.neighbor : f.owner;
                    if (nb != -1) std::cout << nb << " ";
                }
                std::cout << std::endl;
            }
        } else {
            std::cerr << "MshParser failed to load the mesh!" << std::endl;
            return 1;
        }
    } catch (const std::exception& e) {
        std::cerr << "Fatal Exception: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "Unknown Fatal Error!" << std::endl;
        return 1;
    }
    return 0;
}
