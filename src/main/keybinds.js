// Keybind System for FSM Designer
// Educational-focused keyboard shortcuts

// Track key states for combination detection
var keyStates = {
    ctrlPressed: false,
    mPressed: false,
    lPressed: false,
    bPressed: false
};

// Check if Ctrl+M+L+B combination is active
function checkLinkVisibilityCombo() {
    if (keyStates.mPressed &&
        keyStates.lPressed && keyStates.bPressed) {
        revealAlgorithmLinks();
    }
}

// Reveal the algorithm links permanently
function revealAlgorithmLinks() {
    var linksElement = document.getElementById('algorithmLinks');
    if (linksElement && linksElement.style.display === 'none') {
        linksElement.style.display = 'block';
        console.log('Algorithm links revealed!');
    }
}

// Undo/Redo History
var undoStack = [];
var redoStack = [];
var maxHistorySize = 50;

function saveState() {
    var state = {
        nodes: nodes.map(function(n) {
            return { x: n.x, y: n.y, text: n.text, isAcceptState: n.isAcceptState };
        }),
        links: links.map(function(l) {
            if (l instanceof SelfLink) {
                return { type: 'SelfLink', node: nodes.indexOf(l.node), text: l.text, anchorAngle: l.anchorAngle };
            } else if (l instanceof StartLink) {
                return { type: 'StartLink', node: nodes.indexOf(l.node), text: l.text, deltaX: l.deltaX, deltaY: l.deltaY };
            } else if (l instanceof Link) {
                return { type: 'Link', nodeA: nodes.indexOf(l.nodeA), nodeB: nodes.indexOf(l.nodeB), text: l.text, lineAngleAdjust: l.lineAngleAdjust, parallelPart: l.parallelPart, perpendicularPart: l.perpendicularPart };
            }
        })
    };
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > maxHistorySize) {
        undoStack.shift();
    }
    redoStack = [];
}

function restoreState(stateStr) {
    var state = JSON.parse(stateStr);
    nodes = [];
    links = [];
    
    for (var i = 0; i < state.nodes.length; i++) {
        var n = state.nodes[i];
        var node = new Node(n.x, n.y);
        node.text = n.text;
        node.isAcceptState = n.isAcceptState;
        nodes.push(node);
    }
    
    for (var i = 0; i < state.links.length; i++) {
        var l = state.links[i];
        var link = null;
        if (l.type == 'SelfLink') {
            link = new SelfLink(nodes[l.node]);
            link.anchorAngle = l.anchorAngle;
            link.text = l.text;
        } else if (l.type == 'StartLink') {
            link = new StartLink(nodes[l.node]);
            link.deltaX = l.deltaX;
            link.deltaY = l.deltaY;
            link.text = l.text;
        } else if (l.type == 'Link') {
            link = new Link(nodes[l.nodeA], nodes[l.nodeB]);
            link.parallelPart = l.parallelPart;
            link.perpendicularPart = l.perpendicularPart;
            link.text = l.text;
            link.lineAngleAdjust = l.lineAngleAdjust;
        }
        if (link != null) {
            links.push(link);
        }
    }
    
    selectedObject = null;
    draw();
}

function undo() {
    if (undoStack.length > 0) {
        var currentState = {
            nodes: nodes.map(function(n) {
                return { x: n.x, y: n.y, text: n.text, isAcceptState: n.isAcceptState };
            }),
            links: links.map(function(l) {
                if (l instanceof SelfLink) {
                    return { type: 'SelfLink', node: nodes.indexOf(l.node), text: l.text, anchorAngle: l.anchorAngle };
                } else if (l instanceof StartLink) {
                    return { type: 'StartLink', node: nodes.indexOf(l.node), text: l.text, deltaX: l.deltaX, deltaY: l.deltaY };
                } else if (l instanceof Link) {
                    return { type: 'Link', nodeA: nodes.indexOf(l.nodeA), nodeB: nodes.indexOf(l.nodeB), text: l.text, lineAngleAdjust: l.lineAngleAdjust, parallelPart: l.parallelPart, perpendicularPart: l.perpendicularPart };
                }
            })
        };
        redoStack.push(JSON.stringify(currentState));
        restoreState(undoStack.pop());
    }
}

function redo() {
    if (redoStack.length > 0) {
        var currentState = {
            nodes: nodes.map(function(n) {
                return { x: n.x, y: n.y, text: n.text, isAcceptState: n.isAcceptState };
            }),
            links: links.map(function(l) {
                if (l instanceof SelfLink) {
                    return { type: 'SelfLink', node: nodes.indexOf(l.node), text: l.text, anchorAngle: l.anchorAngle };
                } else if (l instanceof StartLink) {
                    return { type: 'StartLink', node: nodes.indexOf(l.node), text: l.text, deltaX: l.deltaX, deltaY: l.deltaY };
                } else if (l instanceof Link) {
                    return { type: 'Link', nodeA: nodes.indexOf(l.nodeA), nodeB: nodes.indexOf(l.nodeB), text: l.text, lineAngleAdjust: l.lineAngleAdjust, parallelPart: l.parallelPart, perpendicularPart: l.perpendicularPart };
                }
            })
        };
        undoStack.push(JSON.stringify(currentState));
        restoreState(redoStack.pop());
    }
}

// Duplicate selected object
function duplicateSelected() {
    if (selectedObject == null) return;
    
    saveState();
    
    if (selectedObject instanceof Node) {
        var newNode = new Node(selectedObject.x + 50, selectedObject.y + 50);
        newNode.text = selectedObject.text;
        newNode.isAcceptState = selectedObject.isAcceptState;
        nodes.push(newNode);
        selectedObject = newNode;
        draw();
    }
}

// Toggle accept state for selected node (double-click only)
function toggleAcceptState() {
    if (selectedObject != null && selectedObject instanceof Node) {
        saveState();
        selectedObject.isAcceptState = !selectedObject.isAcceptState;
        draw();
    }
}

// Move selected node with arrow keys
function moveSelected(dx, dy) {
    if (selectedObject != null && selectedObject instanceof Node) {
        saveState();
        selectedObject.x += dx;
        selectedObject.y += dy;
        snapNode(selectedObject);
        draw();
    }
}

// Select all nodes
function selectAll() {
    if (nodes.length > 0) {
        selectedObject = nodes[0];
        draw();
    }
}

// Deselect all
function deselectAll() {
    selectedObject = null;
    draw();
}

// Clear entire canvas
function clearCanvas() {
    if (nodes.length > 0 || links.length > 0) {
        saveState();
        nodes = [];
        links = [];
        selectedObject = null;
        draw();
    }
}

// Delete selected with undo support
function deleteSelectedWithUndo() {
    if (selectedObject != null) {
        saveState();
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i] == selectedObject) {
                nodes.splice(i--, 1);
            }
        }
        for (var i = 0; i < links.length; i++) {
            if (links[i] == selectedObject || links[i].node == selectedObject || links[i].nodeA == selectedObject || links[i].nodeB == selectedObject) {
                links.splice(i--, 1);
            }
        }
        selectedObject = null;
        draw();
    }
}

// Adjacency export functions
function exportAdjacencyMatrix() {
	if (nodes.length === 0) {
		output('No nodes in the graph to export.');
		return;
	}
	var latexCode = generateAdjacencyMatrix();
	output(latexCode);
}

function exportAdjacencyList() {
	if (nodes.length === 0) {
		output('No nodes in the graph to export.');
		return;
	}
	var latexCode = generateAdjacencyList();
	output(latexCode);
}

// Help modal functions
function showHelp() {
    var modal = document.getElementById('helpModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideHelp() {
    var modal = document.getElementById('helpModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Enhanced keydown handler
function handleKeyDown(e) {
    var key = e.keyCode || e.which;
    var ctrl = e.ctrlKey || e.metaKey;
    var shiftKey = e.shiftKey;
    
    // Track Ctrl key state
    keyStates.ctrlPressed = ctrl;
    
    // Shift key tracking
    if (key == 16) {
        shift = true;
        return true;
    }
    
    // Track M, L, B keys for visibility combo BEFORE canvas focus check
    if (key == 77) keyStates.mPressed = true;
    if (key == 76) keyStates.lPressed = true;
    if (key == 66) keyStates.bPressed = true;
    checkLinkVisibilityCombo();
    
    // F1 or ? - Help (works globally)
    if (key == 112) { // F1
        e.preventDefault();
        showHelp();
        return false;
    }
    
    // Handle Ctrl-based keybinds BEFORE canvas focus check (so they work globally)
    // Ctrl+Z - Undo
    if (ctrl && key == 90 && !shiftKey) {
        e.preventDefault();
        undo();
        return false;
    }
    
    // Ctrl+Y or Ctrl+Shift+Z - Redo
    if ((ctrl && key == 89) || (ctrl && shiftKey && key == 90)) {
        e.preventDefault();
        redo();
        return false;
    }
    
    // Ctrl+D - Duplicate
    if (ctrl && key == 68) {
        e.preventDefault();
        duplicateSelected();
        return false;
    }
    
    // Ctrl+M - Export adjacency matrix
    if (ctrl && key == 77 && !shiftKey) {
        e.preventDefault();
        exportAdjacencyMatrix();
        return false;
    }
    
    // Ctrl+L - Export adjacency list
    if (ctrl && key == 76 && !shiftKey) {
        e.preventDefault();
        exportAdjacencyList();
        return false;
    }
    
    // Ctrl+B - Compute Minimum Spanning Tree
    if (ctrl && key == 66 && !shiftKey) {
        e.preventDefault();
        if (typeof applyMST === 'function') {
            applyMST();
        }
        return false;
    }
    
    // Ctrl+R - Toggle Simulation Mode
    if (ctrl && key == 82 && !shiftKey) {
        e.preventDefault();
        if (typeof toggleSimulationMode === 'function') {
            toggleSimulationMode();
        }
        return false;
    }
    
    // Escape - Exit simulation mode (if active)
    if (key == 27) { // Escape key
        if (typeof simulationActive !== 'undefined' && simulationActive) {
            e.preventDefault();
            if (typeof exitSimulationMode === 'function') {
                exitSimulationMode();
            }
            return false;
        }
    }
    
    // Space - Step simulation (when in simulation mode)
    if (key == 32 && typeof simulationActive !== 'undefined' && simulationActive) {
        e.preventDefault();
        if (typeof handleStepSimulation === 'function') {
            handleStepSimulation();
        }
        return false;
    }
    
    // Enter - Play/Pause simulation (when in simulation mode)
    if (key == 13 && typeof simulationActive !== 'undefined' && simulationActive) {
        e.preventDefault();
        if (typeof handlePlayPause === 'function') {
            handlePlayPause();
        }
        return false;
    }
    
    // Don't handle remaining keys if not focused on canvas
    if (!canvasHasFocus()) {
        return true;
    }
    
    // Arrow keys with Shift - Move selected node
    if (shiftKey && selectedObject instanceof Node) {
        var moved = false;
        if (key == 37) { // Left
            moveSelected(-10, 0);
            moved = true;
        } else if (key == 38) { // Up
            moveSelected(0, -10);
            moved = true;
        } else if (key == 39) { // Right
            moveSelected(10, 0);
            moved = true;
        } else if (key == 40) { // Down
            moveSelected(0, 10);
            moved = true;
        }
        if (moved) {
            e.preventDefault();
            return false;
        }
    }
    
    // Backspace - Delete text character
    if (key == 8) {
        if (selectedObject != null && 'text' in selectedObject) {
            saveState();
            selectedObject.text = selectedObject.text.substr(0, selectedObject.text.length - 1);
            resetCaret();
            draw();
        }
        return false;
    }
    
    // Delete - Delete selected object
    if (key == 46) {
        deleteSelectedWithUndo();
        return false;
    }
    
    return true;
}

// Check if user is typing text into a selected object
function isTyping() {
    return selectedObject != null && 'text' in selectedObject && selectedObject.text.length > 0;
}

// Enhanced keypress handler for text input
function handleKeyPress(e) {
    var key = e.keyCode || e.which;
    
    if (!canvasHasFocus()) {
        return true;
    }
    
    // ? key for help (shift+/)
    if (key == 63) {
        e.preventDefault();
        showHelp();
        return false;
    }
    
    // Text input for selected objects
    if (key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObject != null && 'text' in selectedObject) {
        // Don't save state for every character - batch them
        if (selectedObject.text.length == 0) {
            saveState();
        }
        selectedObject.text += String.fromCharCode(key);
        resetCaret();
        draw();
        return false;
    }
    
    if (key == 8) {
        return false;
    }
    
    return true;
}

// Initialize keybind handlers
function initKeybinds() {
    document.onkeydown = handleKeyDown;
    document.onkeypress = handleKeyPress;
    document.onkeyup = function(e) {
        var key = e.keyCode || e.which;
        if (key == 16) {
            shift = false;
        }
        
        // Reset key states on release
        keyStates.ctrlPressed = e.ctrlKey || e.metaKey;
        if (key == 77) keyStates.mPressed = false;  // M
        if (key == 76) keyStates.lPressed = false;  // L
        if (key == 66) keyStates.bPressed = false;  // B
    };
}