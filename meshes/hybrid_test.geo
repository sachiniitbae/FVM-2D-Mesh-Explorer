lc = 0.2;
// Points for a 2x2 grid area
Point(1) = {0, 0, 0, lc};
Point(2) = {1, 0, 0, lc};
Point(3) = {2, 0, 0, lc};
Point(4) = {2, 1, 0, lc};
Point(5) = {1, 1, 0, lc};
Point(6) = {0, 1, 0, lc};
Point(7) = {0, 2, 0, lc};
Point(8) = {1, 2, 0, lc};
Point(9) = {2, 2, 0, lc};

// Bottom lines
Line(1) = {1, 2};
Line(2) = {2, 3};
Line(3) = {3, 4};
Line(4) = {4, 5};
Line(5) = {5, 6};
Line(6) = {6, 1};
Line(7) = {2, 5};

// Top lines
Line(8) = {6, 7};
Line(9) = {7, 8};
Line(10) = {8, 5};
Line(11) = {8, 9};
Line(12) = {9, 4};

// --- SURFACE 1: Unstructured Quads ---
Curve Loop(1) = {1, 7, 5, 6};
Plane Surface(1) = {1};
Recombine Surface(1); 

// --- SURFACE 2: Unstructured Triangles ---
Curve Loop(2) = {2, 3, 4, -7};
Plane Surface(2) = {2};

// --- SURFACE 3: Structured Quads (Transfinite) ---
Curve Loop(3) = {5, 8, 9, 10};
Plane Surface(3) = {3};
Transfinite Curve {5, 8, 9, 10} = 6; // 5 segments
Transfinite Surface {3} = {6, 7, 8, 5};
Recombine Surface(3);

// --- SURFACE 4: Structured Triangles (Transfinite) ---
Curve Loop(4) = {4, -10, 11, 12};
Plane Surface(4) = {4};
Transfinite Curve {4, 10, 11, 12} = 6;
Transfinite Surface {4} = {5, 8, 9, 4};

Physical Surface("unstructured_quads") = {1};
Physical Surface("unstructured_tris") = {2};
Physical Surface("structured_quads") = {3};
Physical Surface("structured_tris") = {4};

Physical Curve("bottom") = {1, 2};
Physical Curve("top") = {9, 11};
Physical Curve("left") = {6, 8};
Physical Curve("right") = {3, 12};
