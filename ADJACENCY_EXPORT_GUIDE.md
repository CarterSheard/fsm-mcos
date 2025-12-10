# Adjacency Matrix and List Export Guide

## Overview

The FSM Designer now includes functionality to export adjacency matrices and adjacency lists from your finite state machine graphs. Both export formats generate complete, compilable LaTeX documents suitable for academic papers, textbooks, and computer science education.

## Features

### 1. Adjacency Matrix Export (M key)
- Generates an n×n matrix representation of the graph
- Displays transition labels in matrix cells
- Supports both directed and undirected graphs
- Includes special notation for start and accept states
- Outputs complete LaTeX document ready for compilation

### 2. Adjacency List Export (L key)
- Generates a standard adjacency list format
- Format: `Node: [Connected_Node (transition_label), ...]`
- Supports both directed and undirected graphs
- Includes special notation for start and accept states
- Outputs complete LaTeX document ready for compilation

## Usage

### Keyboard Shortcuts
- **Ctrl+M** - Export adjacency matrix as LaTeX
- **Ctrl+L** - Export adjacency list as LaTeX

### Workflow
1. Create or load your FSM diagram
2. Press **Ctrl+M** for matrix or **Ctrl+L** for list
3. The LaTeX code appears in the output area below the canvas
4. Click "Copy" to copy the LaTeX code
5. Paste into your LaTeX document and compile

## Node Labeling

The system intelligently handles node labels:

### With Text Labels
If nodes have text labels (e.g., "A", "Start", "q0"), those labels are used in the export:
```
Node A with text "Start" → exports as "Start"
Node B with text "q0" → exports as "q0"
```

### Without Text Labels (Fallback)
Nodes without text automatically get indexed labels:
```
Node 0 without text → exports as "q0"
Node 1 without text → exports as "q1"
Node 2 without text → exports as "q2"
```

### Special State Notation
- **Start State**: Prefixed with → (e.g., "→A")
- **Accept State**: Suffixed with ★ (e.g., "A★")
- **Both**: Combines notation (e.g., "→A★")

## Directed vs Undirected Graphs

The export respects the "Directed Links" toggle:

### Directed Graphs
- Matrix: Only A→B connections are shown
- List: Only outgoing connections are listed
- Document title: "Directed Finite State Machine"

### Undirected Graphs
- Matrix: Both A→B and B→A are filled (symmetric matrix)
- List: Both directions are listed for each edge
- Document title: "Undirected Finite State Machine"

## LaTeX Output Format

### Adjacency Matrix Example
```latex
\documentclass[12pt]{article}
\usepackage{array}
\usepackage{amssymb}

\begin{document}

\title{Adjacency Matrix for Directed Finite State Machine}
\maketitle

\begin{center}
\begin{tabular}{c|ccc}
 & $\rightarrow q_0$ & $q_1$ & $q_2^\star$ \\
\hline
$\rightarrow q_0$ &  & $a$ &  \\
$q_1$ &  &  & $b$ \\
$q_2^\star$ &  &  &  \\
\end{tabular}
\end{center}

\vspace{1em}
\noindent\textbf{Legend:} $\rightarrow$ indicates start state, $^\star$ indicates accept state.

\end{document}
```

### Adjacency List Example
```latex
\documentclass[12pt]{article}
\usepackage{amssymb}

\begin{document}

\title{Adjacency List for Directed Finite State Machine}
\maketitle

\begin{itemize}
    \item $\rightarrow q_0$: [$q_1$ ($a$)]
    \item $q_1$: [$q_2$ ($b$)]
    \item $q_2^\star$: []
\end{itemize}

\vspace{1em}
\noindent\textbf{Legend:} $\rightarrow$ indicates start state, $^\star$ indicates accept state.

\end{document}
```

## Edge Cases Handled

### Multiple Transitions Between Nodes
When multiple transitions exist between the same two nodes, labels are concatenated:
```
A → B (label: "x")
A → B (label: "y")
Result: Matrix cell shows "x, y"
```

### Self-Loops
Self-loops are properly displayed:
- Matrix: Diagonal cell contains the transition label
- List: Node lists itself as a connection

### Empty Transition Labels
Transitions without labels are shown as empty in the matrix or without parenthetical label in the list.

### Special Characters
LaTeX special characters (&, %, $, #, _, {}, ~, ^, \) are properly escaped to prevent compilation errors.

### Empty Graphs
If the graph has no nodes, a message is displayed: "No nodes in the graph to export."

## Implementation Details

### Files Created/Modified
1. **New**: `src/export_as/adjacency.js` - Core adjacency generation logic
2. **Modified**: `src/main/keybinds.js` - Keybind handlers for M and L keys
3. **Modified**: `docs/index.html` - Updated help modal with new shortcuts

### Key Functions
- `generateNodeLabels()` - Smart node labeling with fallback
- `buildAdjacencyMatrix()` - Constructs matrix data structure
- `buildAdjacencyList()` - Constructs list data structure
- `generateAdjacencyMatrix()` - Outputs LaTeX for matrix
- `generateAdjacencyList()` - Outputs LaTeX for list
- `formatNodeLabel()` - Adds special state notation
- `escapeLaTeX()` - Escapes special LaTeX characters

### Integration Points
- Uses existing `output()` function to display results
- Respects the global `directed` variable for graph type
- Integrates with existing keybind system in `handleKeyDown()`
- Follows established patterns from existing export functions

## Tips for Use

1. **Label Your Nodes**: For clearer exports, add text labels to your nodes before exporting
2. **Check Graph Type**: Ensure the "Directed Links" toggle is set correctly before export
3. **Verify Output**: Always review the generated LaTeX before using it in your document
4. **Compile Test**: Test compile the LaTeX to ensure it works in your environment
5. **Multiple Exports**: You can export both matrix and list to compare representations

## Educational Applications

This feature is particularly useful for:
- **Computer Science Courses**: Teaching graph theory and automata
- **Homework Assignments**: Quickly generate formal representations
- **Research Papers**: Professional-quality matrices and lists
- **Textbook Creation**: Consistent formatting for educational materials
- **Study Materials**: Create reference sheets for exam preparation

## Troubleshooting

### LaTeX Won't Compile
- Ensure you have the required packages: `array`, `amssymb`
- Check for special characters in node labels
- Verify the LaTeX distribution supports the packages

### Incorrect Matrix/List
- Verify all connections are correct in the visual diagram
- Check the "Directed Links" toggle setting
- Ensure nodes are properly connected (not just visually overlapping)

### Missing Start State
- The start state is determined by the presence of a StartLink
- Use Shift+Drag from empty space to a node to create a start state

## Future Enhancements

Potential future improvements:
- Customizable output templates
- Additional export formats (GraphML, DOT, etc.)
- Weighted graph support
- Color-coded matrices for different transition types
- Export to CSV/JSON formats