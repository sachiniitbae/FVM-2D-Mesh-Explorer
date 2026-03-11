// Gmsh geometry for a hybrid circle (Triangles + Quads)
SetFactory("OpenCASCADE");

// Parameters
R = 1.0;          // Outer radius
core_side = 0.6;  // Size of the central quad-friendly core
lc = 0.15;        // Mesh size

// Points for the square core
Point(1) = {0, 0, 0, lc};
Point(2) = {-core_side/2, -core_side/2, 0, lc};
Point(3) = {core_side/2, -core_side/2, 0, lc};
Point(4) = {core_side/2, core_side/2, 0, lc};
Point(5) = {-core_side/2, core_side/2, 0, lc};

// Points on the circumference
Point(6) = {0, -R, 0, lc};
Point(7) = {R, 0, 0, lc};
Point(8) = {0, R, 0, lc};
Point(9) = {-R, 0, 0, lc};

// Lines for the square core
Line(1) = {2, 3};
Line(2) = {3, 4};
Line(3) = {4, 5};
Line(4) = {5, 2};

// Circle arcs
Circle(5) = {6, 1, 7};
Circle(6) = {7, 1, 8};
Circle(7) = {8, 1, 9};
Circle(8) = {9, 1, 6};

// Connections from core to circle
Line(9) = {2, 6};
Line(10) = {3, 7};
Line(11) = {4, 8};
Line(12) = {5, 9};

// Surfaces
// 1. Central Square (Structured Quads)
Curve Loop(1) = {1, 2, 3, 4};
Plane Surface(1) = {1};
Transfinite Surface {1};
Recombine Surface {1};

// 2. Bottom segment (Unstructured Triangles)
Curve Loop(2) = {1, 10, -5, -9};
Plane Surface(2) = {2};

// 3. Right segment (Triangles)
Curve Loop(3) = {2, 11, -6, -10};
Plane Surface(3) = {3};

// 4. Top segment (Recombined -> Quads)
Curve Loop(4) = {3, 12, -7, -11};
Plane Surface(4) = {4};
Recombine Surface {4};

// 5. Left segment (Triangles)
Curve Loop(5) = {4, 9, -8, -12};
Plane Surface(5) = {5};

// Physical Groups
Physical Surface("quad_core", 11) = {1};
Physical Surface("quad_top", 12) = {4};
Physical Surface("tri_zones", 13) = {2, 3, 5};
Physical Curve("outer_boundary", 14) = {5, 6, 7, 8};
