Mesh.MshFileVersion = 2.2;
// y_junction.geo - Custom Y-Junction / Tuning Fork shape
lc = 0.01;

// Stem Points
Point(1) = {0.45, 0.0, 0.0, lc};
Point(2) = {0.55, 0.0, 0.0, lc};
Point(3) = {0.55, 0.3, 0.0, lc};
Point(13) = {0.45, 0.3, 0.0, lc};

// Branching points (outer)
Point(4) = {0.7, 0.5, 0.0, lc};
Point(5) = {0.7, 1.0, 0.0, lc};
Point(11) = {0.3, 1.0, 0.0, lc};
Point(12) = {0.3, 0.5, 0.0, lc};

// Branching points (inner)
Point(6) = {0.6, 1.0, 0.0, lc};
Point(7) = {0.6, 0.6, 0.0, lc};
Point(8) = {0.5, 0.5, 0.0, lc};
Point(9) = {0.4, 0.6, 0.0, lc};
Point(10) = {0.4, 1.0, 0.0, lc};

// Boundary lines
Line(1) = {1, 2};           // Inlet (Bottom)
Line(2) = {2, 3};           // Wall
Spline(3) = {3, 4, 5};      // Right Outer Wall
Line(4) = {5, 6};           // Outlet Right (Top)
Spline(5) = {6, 7, 8};      // Right Inner Wall
Spline(6) = {8, 9, 10};     // Left Inner Wall
Line(7) = {10, 11};         // Outlet Left (Top)
Spline(8) = {11, 12, 13};    // Left Outer Wall
Line(9) = {13, 1};          // Wall

Curve Loop(1) = {1, 2, 3, 4, 5, 6, 7, 8, 9};
Plane Surface(1) = {1};

// Physical Groups
Physical Line("inlet") = {1};
Physical Line("outlet_right") = {4};
Physical Line("outlet_left") = {7};
Physical Line("walls") = {2, 3, 5, 6, 8, 9};
Physical Surface("fluid") = {1};
