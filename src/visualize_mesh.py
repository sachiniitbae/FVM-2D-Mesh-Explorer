import webbrowser
import os
import sys

def launch_explorer():
    """
    Launches the FVM Mesh Explorer in the default web browser.
    """
    # Get the absolute path to the web_explorer directory
    # visualize_mesh.py is in src/, web_explorer is also in src/
    current_dir = os.path.dirname(os.path.abspath(__file__))
    explorer_path = os.path.join(current_dir, "web_explorer", "index.html")
    
    if not os.path.exists(explorer_path):
        print(f"Error: Could not find Mesh Explorer at {explorer_path}")
        print("Please ensure the project structure is intact.")
        sys.exit(1)
        
    print(f"Launching FVM Mesh Explorer: {explorer_path}")
    
    # Open the local HTML file in the default browser
    webbrowser.open(f"file://{explorer_path}")

if __name__ == "__main__":
    launch_explorer()
