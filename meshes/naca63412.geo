// NACA 63-412 Airfoil Mesh Script
lc_airfoil = 0.01;
lc_farfield = 1.0;

Point(1) = {1.0, 0.0, 0, lc_airfoil};
Point(2) = {0.95023, 0.00881, 0, lc_airfoil};
Point(3) = {0.90049, 0.01739, 0, lc_airfoil};
Point(4) = {0.8507, 0.02618, 0, lc_airfoil};
Point(5) = {0.80084, 0.03492, 0, lc_airfoil};
Point(6) = {0.75089, 0.04344, 0, lc_airfoil};
Point(7) = {0.70087, 0.05153, 0, lc_airfoil};
Point(8) = {0.65076, 0.05899, 0, lc_airfoil};
Point(9) = {0.60057, 0.06562, 0, lc_airfoil};
Point(10) = {0.55031, 0.07125, 0, lc_airfoil};
Point(11) = {0.5, 0.07567, 0, lc_airfoil};
Point(12) = {0.44964, 0.07894, 0, lc_airfoil};
Point(13) = {0.39924, 0.08062, 0, lc_airfoil};
Point(14) = {0.34882, 0.08059, 0, lc_airfoil};
Point(15) = {0.2984, 0.07872, 0, lc_airfoil};
Point(16) = {0.248, 0.07499, 0, lc_airfoil};
Point(17) = {0.19765, 0.06929, 0, lc_airfoil};
Point(18) = {0.14735, 0.06138, 0, lc_airfoil};
Point(19) = {0.09718, 0.05063, 0, lc_airfoil};
Point(20) = {0.07218, 0.04379, 0, lc_airfoil};
Point(21) = {0.04727, 0.03544, 0, lc_airfoil};
Point(22) = {0.02257, 0.0246, 0, lc_airfoil};
Point(23) = {0.01041, 0.01719, 0, lc_airfoil};
Point(24) = {0.00567, 0.0132, 0, lc_airfoil};
Point(25) = {0.00336, 0.01071, 0, lc_airfoil};
Point(26) = {0.0, 0.0, 0, lc_airfoil};
Point(27) = {0.00664, -0.00871, 0, lc_airfoil};
Point(28) = {0.00933, -0.0104, 0, lc_airfoil};
Point(29) = {0.01459, -0.01291, 0, lc_airfoil};
Point(30) = {0.02743, -0.01716, 0, lc_airfoil};
Point(31) = {0.05273, -0.0228, 0, lc_airfoil};
Point(32) = {0.07782, -0.02685, 0, lc_airfoil};
Point(33) = {0.10282, -0.02995, 0, lc_airfoil};
Point(34) = {0.15265, -0.03446, 0, lc_airfoil};
Point(35) = {0.20235, -0.03745, 0, lc_airfoil};
Point(36) = {0.252, -0.03919, 0, lc_airfoil};
Point(37) = {0.3016, -0.03984, 0, lc_airfoil};
Point(38) = {0.351118, -0.03939, 0, lc_airfoil};
Point(39) = {0.40076, -0.03778, 0, lc_airfoil};
Point(40) = {0.45035, -0.03514, 0, lc_airfoil};
Point(41) = {0.5, -0.03164, 0, lc_airfoil};
Point(42) = {0.54969, -0.02745, 0, lc_airfoil};
Point(43) = {0.59943, -0.02278, 0, lc_airfoil};
Point(44) = {0.64924, -0.01799, 0, lc_airfoil};
Point(45) = {0.69913, -0.01265, 0, lc_airfoil};
Point(46) = {0.74911, -0.00764, 0, lc_airfoil};
Point(47) = {0.79916, -0.00308, 0, lc_airfoil};
Point(48) = {0.8493, 0.00074, 0, lc_airfoil};
Point(49) = {0.89951, 0.00329, 0, lc_airfoil};
Point(50) = {0.94977, 0.0033, 0, lc_airfoil};

// Airfoil Surfaces as Splines
Spline(1) = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26};
Spline(2) = {26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 1};

// Farfield (Ellipse)
Point(100) = {0.5, 0, 0, lc_farfield};
Point(101) = {10, 0, 0, lc_farfield};
Point(102) = {0.5, 10, 0, lc_farfield};
Point(103) = {-9, 0, 0, lc_farfield};
Point(104) = {0.5, -10, 0, lc_farfield};
Ellipse(3) = {101, 100, 101, 102};
Ellipse(4) = {102, 100, 101, 103};
Ellipse(5) = {103, 100, 101, 104};
Ellipse(6) = {104, 100, 101, 101};

Line Loop(1) = {1, 2};
Line Loop(2) = {3, 4, 5, 6};
Plane Surface(1) = {2, 1};

// Field for boundary layer refinement
Field[1] = Distance;
Field[1].NodesList = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41};
Field[1].EdgesList = {1, 2};
Field[2] = Threshold;
Field[2].IField = 1;
Field[2].LcMin = 0.005;
Field[2].LcMax = 0.5;
Field[2].DistMin = 0.05;
Field[2].DistMax = 1.0;
Background Field = 2;

Physical Line("airfoil") = {1, 2};
Physical Line("farfield") = {3, 4, 5, 6};
Physical Surface("fluid") = {1};

Mesh.Algorithm = 6; // Front-al delaunay
Mesh.RecombineAll = 1;
