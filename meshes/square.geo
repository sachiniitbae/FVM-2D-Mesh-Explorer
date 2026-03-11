Point(1) = {0, 0, 0, 0.2};
Point(2) = {1, 0, 0, 0.2};
Point(3) = {1, 1, 0, 0.2};
Point(4) = {0, 1, 0, 0.2};

Line(1) = {1, 2};
Line(2) = {2, 3};
Line(3) = {3, 4};
Line(4) = {4, 1};

Line Loop(1) = {1, 2, 3, 4};
Plane Surface(1) = {1};

// Recombine triangles to quads or keep as triangles (default)
// Physical groups for BC identification later
Physical Line("bottom") = {1};
Physical Line("right") = {2};
Physical Line("top") = {3};
Physical Line("left") = {4};
Physical Surface("internal") = {1};
