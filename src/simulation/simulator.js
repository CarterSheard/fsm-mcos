// FSM Simulation Engine
// Core logic for simulating finite state machines

// Global simulation state
var simulationActive = false;
var currentSimulation = null;

// Simulation state structure
function SimulationState(inputString, startNodeIndex, transitionTable) {
    this.inputString = inputString;
    this.currentPosition = 0;
    this.currentStates = [startNodeIndex]; // Array for NFA support
    this.paths = [{
        states: [startNodeIndex],
        transitions: [],
        status: 'active' // 'active', 'accepted', 'rejected'
    }];
    this.isPlaying = false;
    this.speed = 500; // ms between steps
    this.isComplete = false;
    this.result = null; // 'accepted', 'rejected', 'stuck'
    this.errorMessage = null;
    this.transitionTable = transitionTable;
}

// Parse transition label into array of symbols
function parseTransitionLabel(text) {
    if (!text || text.trim() === '') {
        return [];
    }
    
    // Split by comma, trim each symbol
    var symbols = text.split(',').map(function(s) {
        return s.trim();
    });
    
    // Filter out empty strings
    return symbols.filter(function(s) {
        return s.length > 0;
    });
}

// Build transition lookup table from links
function buildTransitionTable(nodes, links) {
    var table = {};
    
    // Initialize for each node
    for (var i = 0; i < nodes.length; i++) {
        table[i] = {};
    }
    
    // Process each link
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        
        if (link instanceof Link) {
            var fromIndex = nodes.indexOf(link.nodeA);
            var toIndex = nodes.indexOf(link.nodeB);
            var symbols = parseTransitionLabel(link.text);
            
            // Create transition for each symbol
            for (var j = 0; j < symbols.length; j++) {
                var symbol = symbols[j];
                if (!table[fromIndex][symbol]) {
                    table[fromIndex][symbol] = [];
                }
                // Store both target index and the link reference for highlighting
                table[fromIndex][symbol].push({
                    targetIndex: toIndex,
                    link: link
                });
            }
        } else if (link instanceof SelfLink) {
            var nodeIndex = nodes.indexOf(link.node);
            var symbols = parseTransitionLabel(link.text);
            
            for (var j = 0; j < symbols.length; j++) {
                var symbol = symbols[j];
                if (!table[nodeIndex][symbol]) {
                    table[nodeIndex][symbol] = [];
                }
                table[nodeIndex][symbol].push({
                    targetIndex: nodeIndex,
                    link: link
                });
            }
        }
    }
    
    return table;
}

// Find the start state node
function findStartState(nodes, links) {
    for (var i = 0; i < links.length; i++) {
        if (links[i] instanceof StartLink) {
            return nodes.indexOf(links[i].node);
        }
    }
    return -1;
}

// Validate FSM is ready for simulation
function validateFSM(nodes, links) {
    var errors = [];
    var warnings = [];
    
    // Check for at least one node
    if (nodes.length === 0) {
        errors.push('No states in FSM. Add at least one state.');
    }
    
    // Check for start state
    var startLinks = links.filter(function(l) {
        return l instanceof StartLink;
    });
    
    if (startLinks.length === 0) {
        errors.push('No start state defined. Add a start arrow (→) to a state by shift-dragging from empty space to a node.');
    } else if (startLinks.length > 1) {
        errors.push('Multiple start states detected. Only one start state allowed.');
    }
    
    // Check for at least one transition (optional warning)
    var regularLinks = links.filter(function(l) {
        return l instanceof Link || l instanceof SelfLink;
    });
    
    if (regularLinks.length === 0 && nodes.length > 0) {
        warnings.push('No transitions defined. FSM will only accept empty string if start state is accepting.');
    }
    
    // Check for accept states
    var hasAcceptState = nodes.some(function(n) {
        return n.isAcceptState;
    });
    
    if (!hasAcceptState && nodes.length > 0) {
        warnings.push('No accept states defined. All strings will be rejected.');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

// Get alphabet (all symbols used in transitions)
function getAlphabet(links) {
    var alphabet = {};
    
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        if (link instanceof Link || link instanceof SelfLink) {
            var symbols = parseTransitionLabel(link.text);
            for (var j = 0; j < symbols.length; j++) {
                alphabet[symbols[j]] = true;
            }
        }
    }
    
    return Object.keys(alphabet).sort();
}

// Validate input string against alphabet
function validateInputString(inputString, links) {
    var alphabet = getAlphabet(links);
    var invalidChars = [];
    
    for (var i = 0; i < inputString.length; i++) {
        var char = inputString[i];
        if (alphabet.indexOf(char) === -1) {
            if (invalidChars.indexOf(char) === -1) {
                invalidChars.push(char);
            }
        }
    }
    
    return {
        valid: invalidChars.length === 0,
        invalidChars: invalidChars,
        alphabet: alphabet
    };
}

// Initialize simulation state
function initializeSimulation(inputString, nodes, links) {
    // Validate FSM first
    var validation = validateFSM(nodes, links);
    if (!validation.valid) {
        return {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings
        };
    }
    
    // Find start state
    var startIndex = findStartState(nodes, links);
    if (startIndex === -1) {
        return {
            success: false,
            errors: ['Could not find start state.'],
            warnings: []
        };
    }
    
    // Build transition table
    var transitionTable = buildTransitionTable(nodes, links);
    
    // Create simulation state
    var simState = new SimulationState(inputString, startIndex, transitionTable);
    
    // Handle empty string case
    if (inputString.length === 0) {
        simState.isComplete = true;
        if (nodes[startIndex].isAcceptState) {
            simState.result = 'accepted';
            simState.paths[0].status = 'accepted';
        } else {
            simState.result = 'rejected';
            simState.paths[0].status = 'rejected';
        }
    }
    
    return {
        success: true,
        simulation: simState,
        warnings: validation.warnings
    };
}

// Execute single step of simulation (handles NFA with multiple paths)
function stepSimulation(simState, nodes) {
    if (simState.isComplete) {
        return simState;
    }
    
    var currentChar = simState.inputString[simState.currentPosition];
    var newPaths = [];
    var activeLinksThisStep = [];
    var newCurrentStates = [];
    
    // Process each active path
    for (var p = 0; p < simState.paths.length; p++) {
        var path = simState.paths[p];
        
        if (path.status !== 'active') {
            newPaths.push(path);
            continue;
        }
        
        var currentState = path.states[path.states.length - 1];
        var transitions = simState.transitionTable[currentState][currentChar];
        
        if (!transitions || transitions.length === 0) {
            // No transition available - path is stuck/rejected
            path.status = 'rejected';
            path.errorMessage = "No transition for '" + currentChar + "' from state " + (nodes[currentState].text || ('q' + currentState));
            newPaths.push(path);
        } else {
            // Create new paths for each possible transition (NFA support)
            for (var t = 0; t < transitions.length; t++) {
                var transition = transitions[t];
                var targetIndex = transition.targetIndex;
                
                // Track which links are being used this step
                if (activeLinksThisStep.indexOf(transition.link) === -1) {
                    activeLinksThisStep.push(transition.link);
                }
                
                // Create new or extend path
                var newPath;
                if (t === 0 && transitions.length === 1) {
                    // Single transition - extend existing path
                    path.states.push(targetIndex);
                    path.transitions.push(transition.link);
                    newPath = path;
                } else {
                    // Multiple transitions (NFA) - create new path
                    newPath = {
                        states: path.states.slice(0, -1).concat([currentState, targetIndex]),
                        transitions: path.transitions.slice().concat([transition.link]),
                        status: 'active'
                    };
                }
                newPaths.push(newPath);
                
                if (newCurrentStates.indexOf(targetIndex) === -1) {
                    newCurrentStates.push(targetIndex);
                }
            }
        }
    }
    
    simState.paths = newPaths;
    simState.currentStates = newCurrentStates;
    simState.activeLinks = activeLinksThisStep;
    simState.currentPosition++;
    
    // Check if simulation is complete
    if (simState.currentPosition >= simState.inputString.length) {
        simState.isComplete = true;
        
        // Determine final result
        var anyAccepted = false;
        var allRejected = true;
        
        for (var p = 0; p < simState.paths.length; p++) {
            var path = simState.paths[p];
            if (path.status === 'active') {
                var finalState = path.states[path.states.length - 1];
                if (nodes[finalState].isAcceptState) {
                    path.status = 'accepted';
                    anyAccepted = true;
                } else {
                    path.status = 'rejected';
                }
                allRejected = allRejected && (path.status === 'rejected');
            }
        }
        
        simState.result = anyAccepted ? 'accepted' : 'rejected';
    }
    
    // Check if all paths are stuck (rejected before end of string)
    var allPathsRejected = simState.paths.every(function(p) {
        return p.status === 'rejected';
    });
    
    if (allPathsRejected && !simState.isComplete) {
        simState.isComplete = true;
        simState.result = 'stuck';
        // Find the error message from the last rejected path
        for (var p = simState.paths.length - 1; p >= 0; p--) {
            if (simState.paths[p].errorMessage) {
                simState.errorMessage = simState.paths[p].errorMessage;
                break;
            }
        }
    }
    
    return simState;
}

// Check if simulation is complete
function isSimulationComplete(simState) {
    return simState.isComplete;
}

// Get final result
function getFinalResult(simState) {
    return {
        result: simState.result,
        paths: simState.paths,
        errorMessage: simState.errorMessage
    };
}

// Get current simulation info for display
function getSimulationInfo(simState, nodes) {
    var info = {
        currentChar: simState.currentPosition < simState.inputString.length 
            ? simState.inputString[simState.currentPosition] 
            : null,
        position: simState.currentPosition,
        totalLength: simState.inputString.length,
        currentStateNames: [],
        activePaths: 0,
        isComplete: simState.isComplete,
        result: simState.result
    };
    
    // Get names of current states
    for (var i = 0; i < simState.currentStates.length; i++) {
        var stateIndex = simState.currentStates[i];
        var stateName = nodes[stateIndex].text || ('q' + stateIndex);
        info.currentStateNames.push(stateName);
    }
    
    // Count active paths
    for (var p = 0; p < simState.paths.length; p++) {
        if (simState.paths[p].status === 'active') {
            info.activePaths++;
        }
    }
    
    return info;
}

// Reset simulation to initial state
function resetSimulation() {
    currentSimulation = null;
    simulationActive = false;
}