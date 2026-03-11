# FVM Topology Guide: Face-Based Connectivity

This guide explains the mathematical and data-structure foundations of the **Face-Based** approach used in the FVM 2D Mesh Explorer.

## 1. Why Face-Based?

In Finite Volume Method (FVM), the governing equations (like Navier-Stokes or Heat Diffusion) are integrated over a **Control Volume** (Cell). Using Gauss's Divergence Theorem, the volume integral is converted into a **Surface Integral** over the faces of the cell.

$$ \int_V \nabla \cdot \mathbf{F} \, dV = \oint_S \mathbf{F} \cdot \mathbf{n} \, dS \approx \sum_{f} (\mathbf{F} \cdot \mathbf{n})_f A_f $$

To compute this efficiently for unstructured meshes, we must know exactly which cells share which faces.

## 2. The Data Structure

The explorer builds a connectivity map where the **Face** is the central entity.

### Cell Structure
- `id`: Unique identifier.
- `nodeIds`: Ordered list of nodes (for rendering).
- `faceIds`: List of faces that bound this cell.
- `type`: Triangle or Quad.

### Face Structure
- `id`: Unique identifier.
- `nodeIds`: The two nodes that form the edge (Node A, Node B).
- `owner`: The ID of the cell that "owns" the face.
- `neighbor`: The ID of the cell on the other side.
- `isBoundary`: Boolean flag. If true, `neighbor = -1`.

## 3. Direction and Normals

In a face-based system, each face has an implicit direction (from `owner` to `neighbor`). 
- **Outward Normal**: For the `owner` cell, the face normal points *out*.
- **Inward Normal**: For the `neighbor` cell, the same face normal points *in*.

This convention ensures that the flux leaving one cell is identical to the flux entering the next, maintaining **perfect conservation**—the hallmark of FVM.

## 4. Visualizing Topology in the Explorer

When you click an element in the **FVM 2D Mesh Explorer**:
1. **Selection**: The explorer identifies the `cellId`.
2. **Face Lookup**: It retrieves all `faceIds` for that cell.
3. **Neighbor Discovery**: For each face, it checks the `owner` and `neighbor` properties to find the adjacent cells.
4. **Highlighting**: The clicked cell is highlighted in **Blue**, and its topological neighbors are highlighted in **Green**.

---
*Understanding topology is the first step toward building a robust FVM solver.*
