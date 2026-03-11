lc = 0.15;

// Define Points
Point(1) = {0, 0, 0, lc};
Point(2) = {1, 0, 0, lc};
Point(3) = {2, 0, 0, lc};
Point(4) = {2, 1, 0, lc};
Point(5) = {1, 1, 0, lc};
Point(6) = {1, 2, 0, lc};
Point(7) = {0, 2, 0, lc};
Point(8) = {0, 1, 0, lc};

// Define Lines
Line(1) = {1, 2}; // Bottom 1
Line(2) = {2, 3}; // Bottom 2
Line(3) = {3, 4}; // Outlet
Line(4) = {4, 5}; // Inner loop
Line(5) = {5, 6}; // Inner loop
Line(6) = {6, 7}; // Inlet
Line(7) = {7, 8}; // Left 1
Line(8) = {8, 1}; // Left 2

// Internal dividing lines
Line(9) = {2, 5};
Line(10) = {8, 5};

// --- Surface 1: Bottom-Left (Structured Quads) ---
Curve Loop(1) = {1, 9, -10, 8};
Plane Surface(1) = {1};
Transfinite Curve {1, 9, 10, 8} = 8;
Transfinite Surface {1} = {1, 2, 5, 8};
Recombine Surface(1);

// --- Surface 2: Bottom-Right (Structured Triangles) ---
Curve Loop(2) = {2, 3, 4, -9};
Plane Surface(2) = {2};
Transfinite Curve {2, 3, 4, 9} = 8;
Transfinite Surface {2} = {2, 3, 4, 5};

// --- Surface 3: Top-Left (Unstructured Mixed) ---
Curve Loop(3) = {10, 5, 6, 7};
Plane Surface(3) = {3};
Recombine Surface(3); // Semi-structured quads/tris

// Physical Groups
Physical Surface("structured_quad_zone") = {1};
Physical Surface("structured_tri_zone") = {2};
Physical Surface("unstructured_mixed_zone") = {3};

Physical Curve("inlet") = {6};
Physical Physical Curve("outlet") = {3};
Physical Curve("walls") = {1, 2, 4, 5, 7, 8};
