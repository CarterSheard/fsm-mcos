// FSM Simulation Animator
// Visual animation and canvas rendering for simulation

// Animation state for highlighting
var animationState = {
    highlightedStates: [],    // Array of {index, color}
    highlightedLinks: [],     // Array of {link, color}
    currentChar: null,
    currentPosition: 0,
    totalLength: 0,
    resultDisplay: null       // 'accepted', 'rejected', 'stuck', null
};

// Colors for animation
var simColors = {
    currentState: '#FFA500',      // Orange/Gold for current state
    activeTransition: '#FFA500',  // Orange for active transition
    acceptedState: '#4CAF50',     // Green for accepted
    rejectedState: '#f44336',     // Red for rejected
    stuckState: '#f44336',        // Red for stuck
    nfaSecondary: '#FFD700',      // Lighter gold for secondary NFA paths
    pathTrace: '#90CAF9'          // Light blue for path trace
};

// Clear all animation highlights
function clearAnimationState() {
    animationState.highlightedStates = [];
    animationState.highlightedLinks = [];
    animationState.currentChar = null;
    animationState.currentPosition = 0;
    animationState.totalLength = 0;
    animationState.resultDisplay = null;
}

// Set highlighted states (for current simulation position)
function highlightStates(stateIndices, color) {
    animationState.highlightedStates = stateIndices.map(function(idx, i) {
        return { 
            index: idx, 
            color: color || simColors.currentState,
            // Use slightly different color for secondary NFA paths
            isPrimary: i === 0
        };
    });
}

// Set highlighted transitions (links being traversed)
function highlightTransitions(links, color) {
    animationState.highlightedLinks = links.map(function(link) {
        return { 
            link: link, 
            color: color || simColors.activeTransition 
        };
    });
}

// Update animation state from simulation state
function updateAnimationFromSimulation(simState, nodes) {
    if (!simState) {
        clearAnimationState();
        return;
    }
    
    // Update highlighted states
    highlightStates(simState.currentStates);
    
    // Update highlighted links (active transitions from last step)
    if (simState.activeLinks) {
        highlightTransitions(simState.activeLinks);
    } else {
        animationState.highlightedLinks = [];
    }
    
    // Update current character info
    animationState.currentChar = simState.currentPosition < simState.inputString.length 
        ? simState.inputString[simState.currentPosition] 
        : null;
    animationState.currentPosition = simState.currentPosition;
    animationState.totalLength = simState.inputString.length;
    
    // Update result display
    if (simState.isComplete) {
        animationState.resultDisplay = simState.result;
        
        // Change state colors based on result
        var resultColor = simState.result === 'accepted' ? simColors.acceptedState : simColors.rejectedState;
        animationState.highlightedStates = simState.currentStates.map(function(idx) {
            return { index: idx, color: resultColor, isPrimary: true };
        });
    } else {
        animationState.resultDisplay = null;
    }
}

// Check if a node should be highlighted and get its highlight info
function getNodeHighlight(nodeIndex) {
    for (var i = 0; i < animationState.highlightedStates.length; i++) {
        var hs = animationState.highlightedStates[i];
        if (hs.index === nodeIndex) {
            return hs;
        }
    }
    return null;
}

// Check if a link should be highlighted and get its highlight info
function getLinkHighlight(link) {
    for (var i = 0; i < animationState.highlightedLinks.length; i++) {
        var hl = animationState.highlightedLinks[i];
        if (hl.link === link) {
            return hl;
        }
    }
    return null;
}

// Draw simulation overlay on canvas (called after main drawing)
function drawSimulationOverlay(c) {
    if (!simulationActive || !currentSimulation) {
        return;
    }
    
    // Draw current character indicator near top of canvas
    if (animationState.currentChar !== null || animationState.totalLength > 0) {
        drawInputStringDisplay(c);
    }
}

// Draw the input string with current position highlighted
function drawInputStringDisplay(c) {
    var inputString = currentSimulation ? currentSimulation.inputString : '';
    var position = animationState.currentPosition;
    
    c.save();
    c.font = '16px "Consolas", monospace';
    
    var x = 20;
    var y = 30;
    
    // Draw label
    c.fillStyle = '#666';
    c.fillText('Input: ', x, y);
    x += c.measureText('Input: ').width;
    
    // Draw the string with highlighting
    if (inputString.length === 0) {
        c.fillStyle = '#999';
        c.fillText('(empty string)', x, y);
    } else {
        for (var i = 0; i < inputString.length; i++) {
            var char = inputString[i];
            
            if (i === position && !animationState.resultDisplay) {
                // Current character - highlight with background
                var charWidth = c.measureText(char).width + 4;
                c.fillStyle = simColors.currentState;
                c.fillRect(x - 2, y - 14, charWidth, 20);
                c.fillStyle = 'white';
                c.fillText(char, x, y);
                x += charWidth;
            } else if (i < position) {
                // Already processed - gray
                c.fillStyle = '#999';
                c.fillText(char, x, y);
                x += c.measureText(char).width + 2;
            } else {
                // Not yet processed - black
                c.fillStyle = '#333';
                c.fillText(char, x, y);
                x += c.measureText(char).width + 2;
            }
        }
    }
    
    // Draw position indicator
    c.fillStyle = '#666';
    var posText = ' [' + position + '/' + inputString.length + ']';
    c.fillText(posText, x + 10, y);
    
    c.restore();
}

// Show result banner overlay
function drawResultBanner(c, canvasWidth, canvasHeight) {
    if (!animationState.resultDisplay) {
        return;
    }
    
    var text, bgColor;
    
    switch (animationState.resultDisplay) {
        case 'accepted':
            text = '✓ ACCEPTED';
            bgColor = simColors.acceptedState;
            break;
        case 'rejected':
            text = '✗ REJECTED';
            bgColor = simColors.rejectedState;
            break;
        case 'stuck':
            text = '✗ STUCK - No valid transition';
            bgColor = simColors.stuckState;
            break;
        default:
            return;
    }
    
    c.save();
    
    // Draw banner at bottom of canvas
    var bannerHeight = 50;
    var bannerY = canvasHeight - bannerHeight - 20;
    
    // Semi-transparent background
    c.fillStyle = bgColor;
    c.globalAlpha = 0.9;
    c.fillRect(0, bannerY, canvasWidth, bannerHeight);
    c.globalAlpha = 1.0;
    
    // Text
    c.fillStyle = 'white';
    c.font = 'bold 24px "Segoe UI", sans-serif';
    c.textAlign = 'center';
    c.fillText(text, canvasWidth / 2, bannerY + 33);
    
    c.restore();
}

// Modified node drawing with simulation highlights
function drawNodeWithSimulation(c, node, nodeIndex, isSelected) {
    var highlight = getNodeHighlight(nodeIndex);
    
    if (highlight) {
        // Save context for glow effect
        c.save();
        
        // Draw glow/shadow
        c.shadowColor = highlight.color;
        c.shadowBlur = 20;
        c.shadowOffsetX = 0;
        c.shadowOffsetY = 0;
        
        // Draw filled circle with highlight color (semi-transparent)
        c.beginPath();
        c.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
        c.fillStyle = highlight.color + '40'; // 25% opacity
        c.fill();
        
        // Draw the main circle
        c.strokeStyle = highlight.color;
        c.lineWidth = 3;
        c.stroke();
        
        c.restore();
        
        // Draw the text
        c.fillStyle = highlight.color;
        drawText(c, node.text, node.x, node.y, null, isSelected);
        
        // Draw accept state inner circle if needed
        if (node.isAcceptState) {
            c.beginPath();
            c.arc(node.x, node.y, nodeRadius - 6, 0, 2 * Math.PI, false);
            c.strokeStyle = highlight.color;
            c.lineWidth = 2;
            c.stroke();
        }
        
        return true; // Indicate we handled drawing
    }
    
    return false; // Let normal drawing handle it
}

// Modified link drawing with simulation highlights
function drawLinkWithSimulation(c, link, isSelected) {
    var highlight = getLinkHighlight(link);
    
    if (highlight) {
        c.save();
        
        // Draw with highlight color and glow
        c.strokeStyle = highlight.color;
        c.fillStyle = highlight.color;
        c.lineWidth = 3;
        c.shadowColor = highlight.color;
        c.shadowBlur = 10;
        
        // Call the link's draw method (it will use our modified context)
        link.draw(c);
        
        c.restore();
        
        return true; // Indicate we handled drawing
    }
    
    return false; // Let normal drawing handle it
}

// Pulse animation for self-loops
var pulsePhase = 0;
function updatePulseAnimation() {
    pulsePhase = (pulsePhase + 0.1) % (2 * Math.PI);
}

// Get pulse intensity (0-1) for animated effects
function getPulseIntensity() {
    return 0.5 + 0.5 * Math.sin(pulsePhase);
}