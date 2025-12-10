# Keybind System Implementation Guide

## Integration with Existing Codebase

### 1. Current Event Handler Analysis

The existing system in [`src/main/fsm.js`](src/main/fsm.js:280-340) has:
- Basic key detection in `document.onkeydown` and `document.onkeypress`
- Simple modifier key handling (Shift)
- Text input for selected objects
- Delete functionality

### 2. Proposed Integration Approach

#### Step 1: Create Keybind Manager
Create new file: `src/main/keybind_manager.js`

```javascript
// src/main/keybind_manager.js
class KeybindManager {
    constructor() {
        this.currentMode = 'select';
        this.keybinds = new Map();
        this.globalKeybinds = new Map();
        this.modeKeybinds = new Map();
        this.contextKeybinds = new Map();
        this.initializeKeybinds();
    }
    
    initializeKeybinds() {
        // Global keybinds (work in any mode)
        this.globalKeybinds.set('ctrl+z', { action: 'undo', handler: () => this.undo() });
        this.globalKeybinds.set('ctrl+y', { action: 'redo', handler: () => this.redo() });
        this.globalKeybinds.set('ctrl+a', { action: 'selectAll', handler: () => this.selectAll() });
        this.globalKeybinds.set('escape', { action: 'deselect', handler: () => this.deselectAll() });
        this.globalKeybinds.set('f1', { action: 'help', handler: () => this.showHelp() });
        
        // Mode-specific keybinds
        this.modeKeybinds.set('select', new Map([
            ['s', { action: 'staySelect', handler: () => {} }],
            ['n', { action: 'nodeMode', handler: () => this.setMode('node') }],
            ['l', { action: 'linkMode', handler: () => this.setMode('link') }],
            ['delete', { action: 'delete', handler: () => this.deleteSelected() }],
            ['ctrl+d', { action: 'duplicate', handler: () => this.duplicateSelected() }],
            ['enter', { action: 'editText', handler: () => this.enterTextEditMode() }],
            ['f2', { action: 'editText', handler: () => this.enterTextEditMode() }],
            ['a', { action: 'toggleAccept', handler: () => this.toggleAcceptState() }],
            ['shift+arrowup', { action: 'moveUp', handler: () => this.moveSelected(0, -10) }],
            ['shift+arrowdown', { action: 'moveDown', handler: () => this.moveSelected(0, 10) }],
            ['shift+arrowleft', { action: 'moveLeft', handler: () => this.moveSelected(-10, 0) }],
            ['shift+arrowright', { action: 'moveRight', handler: () => this.moveSelected(10, 0) }]
        ]));
        
        this.modeKeybinds.set('node', new Map([
            ['s', { action: 'selectMode', handler: () => this.setMode('select') }],
            ['escape', { action: 'selectMode', handler: () => this.setMode('select') }]
        ]));
        
        this.modeKeybinds.set('link', new Map([
            ['s', { action: 'selectMode', handler: () => this.setMode('select') }],
            ['escape', { action: 'selectMode', handler: () => this.setMode('select') }]
        ]));
        
        this.modeKeybinds.set('textEdit', new Map([
            ['enter', { action: 'finishEdit', handler: () => this.finishTextEdit() }],
            ['escape', { action: 'cancelEdit', handler: () => this.cancelTextEdit() }]
        ]));
    }
    
    handleKeyEvent(event) {
        const key = this.getKeyString(event);
        
        // Check global keybinds first
        if (this.globalKeybinds.has(key)) {
            event.preventDefault();
            const keybind = this.globalKeybinds.get(key);
            keybind.handler();
            return true;
        }
        
        // Check mode-specific keybinds
        const modeKeybinds = this.modeKeybinds.get(this.currentMode);
        if (modeKeybinds && modeKeybinds.has(key)) {
            event.preventDefault();
            const keybind = modeKeybinds.get(key);
            keybind.handler();
            return true;
        }
        
        return false;
    }
    
    getKeyString(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('ctrl');
        if (event.shiftKey) parts.push('shift');
        if (event.altKey) parts.push('alt');
        
        let key = event.key.toLowerCase();
        if (key === ' ') key = 'space';
        if (key.startsWith('arrow')) key = key.replace('arrow', 'arrow');
        
        parts.push(key);
        return parts.join('+');
    }
    
    setMode(mode) {
        if (this.currentMode !== mode) {
            this.currentMode = mode;
            this.updateModeIndicator();
            this.updateCursor();
        }
    }
    
    // Action implementations
    undo() {
        // Implementation for undo functionality
        console.log('Undo action');
    }
    
    redo() {
        // Implementation for redo functionality
        console.log('Redo action');
    }
    
    deleteSelected() {
        if (selectedObject !== null) {
            // Use existing delete logic from fsm.js
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i] == selectedObject) {
                    nodes.splice(i--, 1);
                }
            }
            for (var i = 0; i < links.length; i++) {
                if (links[i] == selectedObject || links[i].node == selectedObject || 
                    links[i].nodeA == selectedObject || links[i].nodeB == selectedObject) {
                    links.splice(i--, 1);
                }
            }
            selectedObject = null;
            draw();
        }
    }
    
    // ... other action implementations
}
```

#### Step 2: Modify Main Event Handler

Update [`src/main/fsm.js`](src/main/fsm.js:280-340):

```javascript
// Replace existing keydown handler
var keybindManager;

document.onkeydown = function(e) {
    // Let keybind manager handle the event
    if (keybindManager && keybindManager.handleKeyEvent(e)) {
        return false;
    }
    
    // Fallback to existing behavior for text input
    var key = crossBrowserKey(e);
    
    if(key == 16) { // Shift key
        shift = true;
        return true;
    } else if(!canvasHasFocus()) {
        return true;
    } else if(key == 8) { // Backspace - only for text editing
        if(selectedObject != null && 'text' in selectedObject && keybindManager.currentMode === 'textEdit') {
            selectedObject.text = selectedObject.text.substr(0, selectedObject.text.length - 1);
            resetCaret();
            draw();
        }
        return false;
    }
};

// Initialize keybind manager when window loads
window.onload = function() {
    canvas = document.getElementById('canvas');
    keybindManager = new KeybindManager();
    restoreBackup();
    draw();
    
    // ... rest of existing initialization
};
```

#### Step 3: Add Mode System

Create new file: `src/main/mode_manager.js`

```javascript
// src/main/mode_manager.js
class ModeManager {
    constructor(keybindManager) {
        this.keybindManager = keybindManager;
        this.modes = {
            select: new SelectMode(),
            node: new NodeMode(),
            link: new LinkMode(),
            textEdit: new TextEditMode()
        };
        this.currentMode = null;
        this.setMode('select');
    }
    
    setMode(modeName) {
        if (this.currentMode) {
            this.currentMode.exit();
        }
        
        this.currentMode = this.modes[modeName];
        if (this.currentMode) {
            this.currentMode.enter();
            this.keybindManager.setMode(modeName);
        }
    }
    
    getCurrentMode() {
        return this.currentMode;
    }
}

// Base mode class
class Mode {
    enter() {
        // Called when mode is entered
    }
    
    exit() {
        // Called when mode is exited
    }
    
    handleMouseDown(event) {
        // Handle mouse down in this mode
    }
    
    handleMouseMove(event) {
        // Handle mouse move in this mode
    }
    
    handleMouseUp(event) {
        // Handle mouse up in this mode
    }
}

// Select mode implementation
class SelectMode extends Mode {
    enter() {
        canvas.style.cursor = 'default';
    }
    
    handleMouseDown(event) {
        var mouse = crossBrowserRelativeMousePos(event);
        selectedObject = selectObject(mouse.x, mouse.y);
        movingObject = false;
        originalClick = mouse;

        if(selectedObject != null) {
            movingObject = true;
            if(selectedObject.setMouseStart) {
                selectedObject.setMouseStart(mouse.x, mouse.y);
            }
            resetCaret();
        }
        
        draw();
        return false;
    }
    
    handleMouseMove(event) {
        var mouse = crossBrowserRelativeMousePos(event);
        
        if(movingObject && selectedObject) {
            selectedObject.setAnchorPoint(mouse.x, mouse.y);
            if(selectedObject instanceof Node) {
                snapNode(selectedObject);
            }
            draw();
        }
    }
    
    handleMouseUp(event) {
        movingObject = false;
    }
}

// Node creation mode
class NodeMode extends Mode {
    enter() {
        canvas.style.cursor = 'crosshair';
    }
    
    handleMouseDown(event) {
        var mouse = crossBrowserRelativeMousePos(event);
        selectedObject = new Node(mouse.x, mouse.y);
        nodes.push(selectedObject);
        resetCaret();
        draw();
        
        // Switch back to select mode after creating node
        modeManager.setMode('select');
        return false;
    }
}

// Link creation mode
class LinkMode extends Mode {
    enter() {
        canvas.style.cursor = 'crosshair';
        this.linkStart = null;
    }
    
    handleMouseDown(event) {
        var mouse = crossBrowserRelativeMousePos(event);
        var targetNode = selectObject(mouse.x, mouse.y);
        
        if(targetNode instanceof Node) {
            if(this.linkStart === null) {
                this.linkStart = targetNode;
                selectedObject = targetNode;
            } else {
                // Create link between nodes
                var link = new Link(this.linkStart, targetNode);
                links.push(link);
                selectedObject = link;
                this.linkStart = null;
                modeManager.setMode('select');
            }
            draw();
        }
        return false;
    }
}

// Text editing mode
class TextEditMode extends Mode {
    constructor() {
        super();
        this.originalText = '';
    }
    
    enter() {
        canvas.style.cursor = 'text';
        if(selectedObject && 'text' in selectedObject) {
            this.originalText = selectedObject.text;
        }
    }
    
    exit() {
        // Save text changes when exiting
        if(selectedObject && 'text' in selectedObject) {
            // Text is already updated in real-time
        }
    }
}
```

#### Step 4: Update HTML for Mode Indicators

Modify [`docs/index.html`](docs/index.html:210-225):

```html
<!-- Add mode indicator after canvas -->
<canvas id="canvas" width="800" height="600">
    <span class="error">Your browser does not support<br>the HTML5 <canvas> element</span>
</canvas>

<div id="modeIndicator" style="margin: 10px auto; text-align: center; font-weight: bold;">
    Mode: <span id="currentMode">Select</span> | 
    Press <kbd>F1</kbd> for help
</div>

<div id="helpModal" style="display: none; position: fixed; top: 50px; left: 50px; 
     background: white; border: 2px solid black; padding: 20px; z-index: 1000;">
    <h3>Keyboard Shortcuts</h3>
    <table id="helpTable">
        <!-- Help content will be populated by JavaScript -->
    </table>
    <button onclick="closeHelp()">Close</button>
</div>
```

#### Step 5: Add Help System

Create new file: `src/main/help_system.js`

```javascript
// src/main/help_system.js
class HelpSystem {
    constructor() {
        this.helpContent = {
            'Core Operations': [
                { key: 'N', description: 'Enter node creation mode' },
                { key: 'L', description: 'Enter link creation mode' },
                { key: 'S', description: 'Enter selection mode' },
                { key: 'Delete', description: 'Delete selected object' },
                { key: 'Ctrl+Z', description: 'Undo last action' },
                { key: 'Ctrl+Y', description: 'Redo last undone action' }
            ],
            'Object Manipulation': [
                { key: 'Ctrl+D', description: 'Duplicate selected object' },
                { key: 'Shift+Arrow Keys', description: 'Move selected node' },
                { key: 'A', description: 'Toggle accept state (selected node)' },
                { key: 'Enter/F2', description: 'Edit text of selected object' }
            ],
            'Navigation': [
                { key: 'W/A/S/D or Arrow Keys', description: 'Pan canvas' },
                { key: '+/-', description: 'Zoom in/out' },
                { key: 'F', description: 'Fit all objects to view' },
                { key: 'Home', description: 'Reset view' }
            ],
            'Export': [
                { key: 'Ctrl+P', description: 'Export as PNG' },
                { key: 'Ctrl+S', description: 'Export as SVG' },
                { key: 'Ctrl+L', description: 'Export as LaTeX' }
            ]
        };
    }
    
    showHelp() {
        const modal = document.getElementById('helpModal');
        const table = document.getElementById('helpTable');
        
        // Clear existing content
        table.innerHTML = '';
        
        // Populate help content
        for (const [category, shortcuts] of Object.entries(this.helpContent)) {
            const row = table.insertRow();
            const categoryCell = row.insertCell(0);
            categoryCell.colSpan = 2;
            categoryCell.innerHTML = `<strong>${category}</strong>`;
            categoryCell.style.paddingTop = '10px';
            
            shortcuts.forEach(shortcut => {
                const shortcutRow = table.insertRow();
                const keyCell = shortcutRow.insertCell(0);
                const descCell = shortcutRow.insertCell(1);
                
                keyCell.innerHTML = `<kbd>${shortcut.key}</kbd>`;
                keyCell.style.paddingRight = '15px';
                keyCell.style.fontFamily = 'monospace';
                
                descCell.textContent = shortcut.description;
            });
        }
        
        modal.style.display = 'block';
    }
    
    hideHelp() {
        document.getElementById('helpModal').style.display = 'none';
    }
}

// Global functions for help
function showHelp() {
    if (window.helpSystem) {
        window.helpSystem.showHelp();
    }
}

function closeHelp() {
    if (window.helpSystem) {
        window.helpSystem.hideHelp();
    }
}
```

### 3. Integration Steps

#### Phase 1: Basic Integration
1. Add keybind manager to existing codebase
2. Implement basic mode switching (Select, Node, Link)
3. Add help modal with keybind reference
4. Test core functionality

#### Phase 2: Enhanced Features
1. Implement undo/redo system
2. Add keyboard navigation for nodes
3. Implement text editing mode
4. Add visual mode indicators

#### Phase 3: Advanced Features
1. Add pan and zoom controls
2. Implement multi-select functionality
3. Add export shortcuts
4. Implement tutorial system

### 4. Testing Strategy

#### Unit Tests
```javascript
// Test keybind registration
describe('KeybindManager', () => {
    it('should register global keybinds', () => {
        const manager = new KeybindManager();
        expect(manager.globalKeybinds.has('ctrl+z')).toBe(true);
    });
    
    it('should handle mode switching', () => {
        const manager = new KeybindManager();
        manager.setMode('node');
        expect(manager.currentMode).toBe('node');
    });
});
```

#### Integration Tests
```javascript
// Test mode switching with mouse events
describe('Mode Integration', () => {
    it('should create node in node mode', () => {
        modeManager.setMode('node');
        // Simulate mouse click
        expect(nodes.length).toBe(1);
    });
});
```

### 5. Performance Considerations

#### Event Handling Optimization
- Use passive event listeners where possible
- Implement event debouncing for rapid key presses
- Cache DOM queries to minimize reflows

#### Memory Management
- Limit undo history stack size
- Use object pooling for frequently created objects
- Clean up event listeners on mode switches

#### Rendering Optimization
- Only redraw when state changes
- Implement dirty rectangle rendering
- Use requestAnimationFrame for smooth animations

### 6. Browser Compatibility

#### Key Event Handling
- Normalize key codes across browsers
- Handle special keys consistently
- Provide fallbacks for unsupported features

#### Feature Detection
```javascript
// Check for required features
if (!window.KeyboardEvent) {
    // Fallback to older event model
}

if (!navigator.clipboard) {
    // Fallback clipboard implementation
}
```

This implementation guide provides a comprehensive approach to integrating the keybind system while maintaining compatibility with the existing codebase architecture.