# NACA 63-412 Coordinate generation and .geo script creation
import math

# Coordinates from search results for NACA 63-412 (Normalized by chord)
# (x, y) pairs
upper_surface = [
    (1.000000, 0.000000), (0.950230, 0.008810), (0.900490, 0.017390),
    (0.850700, 0.026180), (0.800840, 0.034920), (0.750890, 0.043440),
    (0.700870, 0.051530), (0.650760, 0.058990), (0.600570, 0.065620),
    (0.550310, 0.071250), (0.500000, 0.075670), (0.449640, 0.078940),
    (0.399240, 0.080620), (0.348820, 0.080590), (0.298400, 0.078720),
    (0.248000, 0.074990), (0.197650, 0.069290), (0.147350, 0.061380),
    (0.097180, 0.050630), (0.072180, 0.043790), (0.047270, 0.035440),
    (0.022570, 0.024600), (0.010410, 0.017190), (0.005670, 0.013200),
    (0.003360, 0.010710), (0.000000, 0.000000)
]

lower_surface = [
    (0.000000, 0.000000), (0.006640, -0.008710), (0.009330, -0.010400),
    (0.014590, -0.012910), (0.027430, -0.017160), (0.052730, -0.022800),
    (0.077820, -0.026850), (0.102820, -0.029950), (0.152650, -0.034460),
    (0.202350, -0.037450), (0.252000, -0.039190), (0.301600, -0.039840),
    (0.351118, -0.039390), (0.400760, -0.037780), (0.450350, -0.035140),
    (0.500000, -0.031640), (0.549690, -0.027450), (0.599430, -0.022780),
    (0.649240, -0.017990), (0.699130, -0.012650), (0.749110, -0.007640),
    (0.799160, -0.003080), (0.849300, 0.000740), (0.899510, 0.003290),
    (0.949770, 0.003300), (1.000000, 0.000000)
]

def write_geo(filename, upper, lower):
    with open(filename, 'w') as f:
        # Mesh parameters
        f.write("// NACA 63-412 Airfoil Mesh Script\n")
        f.write("lc_airfoil = 0.01;\n")
        f.write("lc_farfield = 1.0;\n\n")
        
        # Upper surface points
        p_ids_upper = []
        for i, (x, y) in enumerate(upper):
            f.write(f"Point({i+1}) = {{{x}, {y}, 0, lc_airfoil}};\n")
            p_ids_upper.append(i+1)
            
        # Lower surface points (skip LE (0,0,0) as it's the last point of upper)
        # Skip TE (1,0,0) as it's the first point of upper
        p_ids_lower = []
        offset = len(upper)
        for i, (x, y) in enumerate(lower[1:-1]):
            f.write(f"Point({offset + i + 1}) = {{{x}, {y}, 0, lc_airfoil}};\n")
            p_ids_lower.append(offset + i + 1)
            
        f.write("\n// Airfoil Surfaces as Splines\n")
        # Define Splines
        # Upper Spline
        f.write(f"Spline(1) = {{{p_ids_upper[0]}")
        for pid in p_ids_upper[1:]:
            f.write(f", {pid}")
        f.write("};\n")
        
        # Lower Spline (connects LE back to TE)
        f.write(f"Spline(2) = {{{p_ids_upper[-1]}")
        for pid in p_ids_lower:
            f.write(f", {pid}")
        f.write(f", {p_ids_upper[0]}}};\n")
        
        # Farfield
        f.write("\n// Farfield (Ellipse)\n")
        f.write("Point(100) = {0.5, 0, 0, lc_farfield};\n") # Farfield center
        f.write("Point(101) = {10, 0, 0, lc_farfield};\n") # Right
        f.write("Point(102) = {0.5, 10, 0, lc_farfield};\n") # Top
        f.write("Point(103) = {-9, 0, 0, lc_farfield};\n") # Left
        f.write("Point(104) = {0.5, -10, 0, lc_farfield};\n") # Bottom
        
        f.write("Ellipse(3) = {101, 100, 101, 102};\n")
        f.write("Ellipse(4) = {102, 100, 101, 103};\n")
        f.write("Ellipse(5) = {103, 100, 101, 104};\n")
        f.write("Ellipse(6) = {104, 100, 101, 101};\n")
        
        # Line Loops and Surfaces
        f.write("\nLine Loop(1) = {1, 2};\n") # Airfoil
        f.write("Line Loop(2) = {3, 4, 5, 6};\n") # Farfield
        f.write("Plane Surface(1) = {2, 1};\n")
        
        # Boundary Layer
        f.write("\n// Field for boundary layer refinement\n")
        f.write("Field[1] = Distance;\n")
        f.write("Field[1].NodesList = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41};\n")
        f.write("Field[1].EdgesList = {1, 2};\n")
        
        f.write("Field[2] = Threshold;\n")
        f.write("Field[2].IField = 1;\n")
        f.write("Field[2].LcMin = 0.005;\n")
        f.write("Field[2].LcMax = 0.5;\n")
        f.write("Field[2].DistMin = 0.05;\n")
        f.write("Field[2].DistMax = 1.0;\n")
        
        f.write("Background Field = 2;\n")
        
        # Physical groups
        f.write("\nPhysical Line(\"airfoil\") = {1, 2};\n")
        f.write("Physical Line(\"farfield\") = {3, 4, 5, 6};\n")
        f.write("Physical Surface(\"fluid\") = {1};\n")
        
        # Mesh settings
        f.write("\nMesh.Algorithm = 6; // Front-al delaunay\n")
        f.write("Mesh.RecombineAll = 1;\n") # Try to make it quads where possible

if __name__ == "__main__":
    write_geo("meshes/naca63412.geo", upper_surface, lower_surface)
    print("Generated meshes/naca63412.geo")
