# Finite State Machine Designer

A web-based visual editor for creating finite state machines with export capabilities for academic and educational use.

**Live Demo:** https://cartersheard.github.io/fsm-mcos/

**Original:** http://madebyevan.com/fsm/

## Features

### Visual Editor
- **Create States**: Double-click on the canvas to add nodes
- **Create Transitions**: Shift+drag between nodes to create links
- **Move Elements**: Drag nodes and adjust link curves
- **Delete Elements**: Select and press Delete key
- **Accept States**: Double-click a node to toggle accept state
- **Self-Loops**: Shift+drag from a node to itself

### Export Options
- **PNG**: Export as raster image
- **SVG**: Export as scalable vector graphics
- **LaTeX**: Export as TikZ diagram code
- **Adjacency Matrix**: Export mathematical matrix representation (NEW)
- **Adjacency List**: Export standard list format (NEW)

### Text Formatting
- **Greek Letters**: Use backslash notation (e.g., `\alpha`, `\beta`)
- **Subscripts**: Use underscore notation (e.g., `q_0`, `q_1`)

### Keyboard Shortcuts
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+D**: Duplicate selected node
- **Ctrl+M**: Export adjacency matrix as LaTeX
- **Ctrl+L**: Export adjacency list as LaTeX
- **A**: Toggle accept state
- **Delete**: Remove selected element
- **Shift+Arrow Keys**: Move selected node
- **Escape**: Deselect all
- **F1 or ?**: Show help

## New: Adjacency Export

The FSM Designer now includes powerful adjacency matrix and list export functionality. These features generate complete, compilable LaTeX documents suitable for academic papers and educational materials.

### Quick Start
1. Create your finite state machine diagram
2. Press **Ctrl+M** for matrix or **Ctrl+L** for list
3. Copy the generated LaTeX code
4. Paste into your LaTeX document

### Features
- Smart node labeling (uses text labels or generates q0, q1, etc.)
- Special notation for start states (→) and accept states (★)
- Supports both directed and undirected graphs
- Handles multiple transitions between nodes
- Proper LaTeX escaping for special characters

For detailed documentation, see [ADJACENCY_EXPORT_GUIDE.md](ADJACENCY_EXPORT_GUIDE.md)

## Graph Types

Toggle between directed and undirected graphs using the "Directed Links" switch. This affects both visual display and adjacency exports:
- **Directed**: Arrows show direction, asymmetric matrices
- **Undirected**: Bidirectional connections, symmetric matrices

## Building from Source

The project uses a Python build script to concatenate JavaScript files:

```bash
# Build once
python build.py

# Watch mode (auto-rebuild on changes)
python build.py --watch
```

### Project Structure
```
fsm-mcos/
├── src/
│   ├── elements/          # Node and link classes
│   ├── export_as/         # Export functionality (SVG, LaTeX, Adjacency)
│   └── main/              # Core FSM logic and keybinds
├── docs/
│   ├── index.html         # Main application page
│   └── fsm.js            # Built/compiled JavaScript
└── build.py              # Build script
```

## Use Cases

### Education
- Teaching finite automata theory
- Computer science coursework
- Graph theory demonstrations
- Algorithm visualization

### Academic
- Research paper diagrams
- Textbook illustrations
- Homework problem sets
- Exam materials

### Professional
- System design documentation
- State machine specifications
- Protocol design
- Workflow diagrams

## Credits

- **Original Creator**: [Evan Wallace](http://madebyevan.com/) (2010)
- **Adjacency Export**: Added 2024
- **Enhanced Keybinds**: Added 2024

## License

Original work by Evan Wallace. Modifications and enhancements maintain the original spirit of educational accessibility.
