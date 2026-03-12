// Star Geometry for 2D Heat Diffusion
Mesh.MshFileVersion = 2.2;

lc = 0.05;
R = 1.0;  // Outer radius
r = 0.4;  // Inner radius
r_src = 0.05; // Center source radius

// Center Point
Point(0) = {0, 0, 0, lc/2};

// Circle for point source region
Point(101) = {r_src, 0, 0, lc/4};
Point(102) = {0, r_src, 0, lc/4};
Point(103) = {-r_src, 0, 0, lc/4};
Point(104) = {0, -r_src, 0, lc/4};

Circle(101) = {101, 0, 102};
Circle(102) = {102, 0, 103};
Circle(103) = {103, 0, 104};
Circle(104) = {104, 0, 101};

Line Loop(200) = {101, 102, 103, 104};
Plane Surface(300) = {200}; // Central Source Zone

// Star boundary points
Point(1) = {R*Cos(0), R*Sin(0), 0, lc};
Point(2) = {r*Cos(Pi/5), r*Sin(Pi/5), 0, lc};
Point(3) = {R*Cos(2*Pi/5), R*Sin(2*Pi/5), 0, lc};
Point(4) = {r*Cos(3*Pi/5), r*Sin(3*Pi/5), 0, lc};
Point(5) = {R*Cos(4*Pi/5), R*Sin(4*Pi/5), 0, lc};
Point(6) = {r*Cos(5*Pi/5), r*Sin(5*Pi/5), 0, lc};
Point(7) = {R*Cos(6*Pi/5), R*Sin(6*Pi/5), 0, lc};
Point(8) = {r*Cos(7*Pi/5), r*Sin(7*Pi/5), 0, lc};
Point(9) = {R*Cos(8*Pi/5), R*Sin(8*Pi/5), 0, lc};
Point(10) = {r*Cos(9*Pi/5), r*Sin(9*Pi/5), 0, lc};

Line(1) = {1, 2};
Line(2) = {2, 3};
Line(3) = {3, 4};
Line(4) = {4, 5};
Line(5) = {5, 6};
Line(6) = {6, 7};
Line(7) = {7, 8};
Line(8) = {8, 9};
Line(9) = {9, 10};
Line(10) = {10, 1};

Line Loop(1) = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
Plane Surface(1) = {1, 200}; // Main star body with the inner circle as a hole

// Physical Groups
Physical Line("boundary") = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
Physical Surface("star_body") = {1};
Physical Surface("center_source") = {300};
