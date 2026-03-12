// Flower Pattern Mesh Geometry for FVM Diffusion Solver
// -----------------------------------------------------------------------------
// This script creates a central disk with several petals.

SetFactory("OpenCASCADE");

Mesh.Algorithm = 6; // Frontal-Delaunay for 2D
Mesh.CharacteristicLengthMin = 0.05;
Mesh.CharacteristicLengthMax = 0.05;

// Parameters
R_disk = 0.2;
Petal_L = 0.8;
Petal_W = 0.4;
N_petals = 6;

// 1. Central Disk
Circle(1) = {0, 0, 0, R_disk};
Curve Loop(1) = {1};
Plane Surface(1) = {1};

// 2. Petals (using polar coordinates to place ellipses)
petal_surfaces[] = {};
For i In {0:N_petals-1}
  angle = i * (2*Pi/N_petals);
  // Place center such that inner tip overlaps disk by ~5% of R_disk
  dist_center = R_disk + Petal_L/2 - 0.05 * R_disk; 
  cx = dist_center * Cos(angle);
  cy = dist_center * Sin(angle);
  
  Ellipse(100 + i) = {cx, cy, 0, Petal_L/2, Petal_W/2};
  Rotate {{0, 0, 1}, {cx, cy, 0}, angle} { Curve{100 + i}; }
  
  Curve Loop(100 + i) = {100+i};
  Plane Surface(100 + i) = {100+i};
  petal_surfaces[] += {100+i};
EndFor

// 3. Merge petals first, then fragment with disk
petals_union[] = BooleanUnion{ Surface{petal_surfaces[0]}; Delete; }{ Surface{petal_surfaces[{1:N_petals-1}]}; Delete; };
BooleanFragments{ Surface{1}; Delete; }{ Surface{petals_union[]}; Delete; }

// After Fragments, we need to find which surface is where.
// The center disk is at (0,0).
center_surf[] = Surface In BoundingBox{-R_disk*1.1, -R_disk*1.1, -0.1, R_disk*1.1, R_disk*1.1, 0.1};
all_surfs[] = Surface { : };

// Define Physical Groups - must be mutually exclusive for MshParser v2
Physical Surface("center_source") = {center_surf[]};
Physical Surface("petals") = {all_surfs[]};
// Note: We'll remove the center_surf from the "petals" list using Gmsh list subtraction
Physical Surface("petals") -= {center_surf[]};

// Boundaries
all_curves[] = Curve { : };
Physical Curve("boundary") = {all_curves[]};
