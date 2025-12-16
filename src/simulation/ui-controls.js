// FSM Simulation UI Controls
// UI panel, controls, and user interaction

// Play/pause interval reference
var simulationInterval = null;

// Initialize simulation UI panel
function initSimulationUI() {
    var panel = document.getElementById('simulationPanel');
    if (panel) {
        // Set up event listeners
        var startBtn = document.getElementById('simStart');
        var stepBtn = document.getElementById('simStep');
        var playPauseBtn = document.getElementById('simPlayPause');
        var resetBtn = document.getElementById('simReset');
        var speedSlider = document.getElementById('simSpeed');
        var inputField = document.getElementById('simInput');
        
        if (startBtn) startBtn.onclick = handleStartSimulation;
        if (stepBtn) stepBtn.onclick = handleStepSimulation;
        if (playPauseBtn) playPauseBtn.onclick = handlePlayPause;
        if (resetBtn) resetBtn.onclick = handleResetSimulation;
        if (speedSlider) {
            speedSlider.oninput = function() {
                updateSimulationSpeed(this.value);
            };
        }
        
        // Allow Enter key in input field to start simulation
        if (inputField) {
            inputField.onkeypress = function(e) {
                if (e.key === 'Enter') {
                    handleStartSimulation();
                }
            };
        }
    }
}

// Show simulation panel
function showSimulationPanel() {
    var panel = document.getElementById('simulationPanel');
    if (panel) {
        panel.style.display = 'block';
        // Focus the input field
        var inputField = document.getElementById('simInput');
        if (inputField) {
            inputField.focus();
        }
    }
}

// Hide simulation panel
function hideSimulationPanel() {
    var panel = document.getElementById('simulationPanel');
    if (panel) {
        panel.style.display = 'none';
    }
}

// Enter simulation mode
function enterSimulationMode() {
    showSimulationPanel();
    simulationActive = true;
    updateControlStates(false, false); // Not started yet
    updateStatusDisplay();
}

// Exit simulation mode
function exitSimulationMode() {
    hideSimulationPanel();
    handleResetSimulation();
    simulationActive = false;
    currentSimulation = null;
    clearAnimationState();
    draw();
}

// Toggle simulation mode
function toggleSimulationMode() {
    if (simulationActive) {
        exitSimulationMode();
    } else {
        enterSimulationMode();
    }
}

// Handle start button click
function handleStartSimulation() {
    var inputField = document.getElementById('simInput');
    var inputString = inputField ? inputField.value : '';
    
    // Initialize simulation
    var result = initializeSimulation(inputString, nodes, links);
    
    if (!result.success) {
        showSimulationError(result.errors.join('\n'));
        return;
    }
    
    // Show warnings if any
    if (result.warnings && result.warnings.length > 0) {
        console.log('Simulation warnings:', result.warnings);
    }
    
    currentSimulation = result.simulation;
    
    // Set initial speed from slider
    var speedSlider = document.getElementById('simSpeed');
    if (speedSlider) {
        updateSimulationSpeed(speedSlider.value);
    }
    
    // Update animation state for initial position
    updateAnimationFromSimulation(currentSimulation, nodes);
    
    // Enable control buttons
    updateControlStates(true, false);
    
    // Update display
    updateStatusDisplay();
    draw();
    
    // Check if already complete (empty string case)
    if (currentSimulation.isComplete) {
        showFinalResult();
    }
}

// Handle step button click
function handleStepSimulation() {
    if (!currentSimulation || currentSimulation.isComplete) {
        return;
    }
    
    // Execute one step
    stepSimulation(currentSimulation, nodes);
    
    // Update animation
    updateAnimationFromSimulation(currentSimulation, nodes);
    
    // Update display
    updateStatusDisplay();
    draw();
    
    // Check if complete
    if (currentSimulation.isComplete) {
        showFinalResult();
        stopAutoPlay();
    }
}

// Handle play/pause toggle
function handlePlayPause() {
    if (!currentSimulation) {
        return;
    }
    
    if (currentSimulation.isPlaying) {
        stopAutoPlay();
    } else {
        startAutoPlay();
    }
}

// Start auto-play mode
function startAutoPlay() {
    if (!currentSimulation || currentSimulation.isComplete) {
        return;
    }
    
    currentSimulation.isPlaying = true;
    updatePlayPauseButton(true);
    
    // Determine interval and steps per tick
    // If speed is very fast (< 20ms), run multiple steps per 20ms tick
    var intervalMs = currentSimulation.speed;
    var stepsPerTick = 1;
    
    if (intervalMs < 20) {
        stepsPerTick = Math.ceil(20 / intervalMs);
        intervalMs = 20;
    }
    
    // Start interval
    simulationInterval = setInterval(function() {
        // Execute batched steps
        for (var i = 0; i < stepsPerTick; i++) {
            if (currentSimulation.isComplete) {
                break;
            }
            
            // Execute one step without drawing yet
            stepSimulation(currentSimulation, nodes);
            
            // Update animation state
            updateAnimationFromSimulation(currentSimulation, nodes);
        }
        
        // Update display and draw once per tick
        updateStatusDisplay();
        draw();
        
        if (currentSimulation.isComplete) {
            showFinalResult();
            stopAutoPlay();
        }
    }, intervalMs);
}

// Stop auto-play mode
function stopAutoPlay() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    
    if (currentSimulation) {
        currentSimulation.isPlaying = false;
    }
    
    updatePlayPauseButton(false);
}

// Handle reset button click
function handleResetSimulation() {
    stopAutoPlay();
    currentSimulation = null;
    clearAnimationState();
    updateControlStates(false, false);
    updateStatusDisplay();
    hideResultDisplay();
    draw();
}

// Update simulation speed from slider
function updateSimulationSpeed(value) {
    // Logarithmic scale: 0 -> 2000ms (slow), 100 -> 5ms (fast)
    // Formula: speed = A * exp(B * value)
    // A = 2000
    // B = ln(5/2000) / 100 = ln(0.0025) / 100
    var minSpeed = 5;
    var maxSpeed = 2000;
    var sliderMax = 100;
    
    var speed = maxSpeed * Math.exp((Math.log(minSpeed / maxSpeed) / sliderMax) * value);
    
    // Update label
    var label = document.getElementById('simSpeedLabel');
    if (label) {
        if (speed >= 100) {
            label.textContent = (speed / 1000).toFixed(1) + 's';
        } else {
            label.textContent = Math.round(speed) + 'ms';
        }
    }
    
    // Update simulation state
    if (currentSimulation) {
        currentSimulation.speed = speed;
        
        // If playing, restart interval with new speed
        if (currentSimulation.isPlaying) {
            stopAutoPlay();
            startAutoPlay();
        }
    }
}

// Update button states based on simulation state
function updateControlStates(started, playing) {
    var stepBtn = document.getElementById('simStep');
    var playPauseBtn = document.getElementById('simPlayPause');
    var resetBtn = document.getElementById('simReset');
    var startBtn = document.getElementById('simStart');
    var inputField = document.getElementById('simInput');
    
    if (started) {
        if (stepBtn) stepBtn.disabled = false;
        if (playPauseBtn) playPauseBtn.disabled = false;
        if (resetBtn) resetBtn.disabled = false;
        if (startBtn) startBtn.disabled = true;
        if (inputField) inputField.disabled = true;
    } else {
        if (stepBtn) stepBtn.disabled = true;
        if (playPauseBtn) playPauseBtn.disabled = true;
        if (resetBtn) resetBtn.disabled = true;
        if (startBtn) startBtn.disabled = false;
        if (inputField) inputField.disabled = false;
    }
}

// Update play/pause button text
function updatePlayPauseButton(isPlaying) {
    var btn = document.getElementById('simPlayPause');
    if (btn) {
        btn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
    }
}

// Update status display with current simulation info
function updateStatusDisplay() {
    var charDisplay = document.getElementById('simCurrentChar');
    var stateDisplay = document.getElementById('simCurrentState');
    var progressDisplay = document.getElementById('simProgress');
    var pathsDisplay = document.getElementById('simPaths');
    
    if (!currentSimulation) {
        if (charDisplay) charDisplay.textContent = 'Current: -';
        if (stateDisplay) stateDisplay.textContent = 'State: -';
        if (progressDisplay) progressDisplay.textContent = 'Position: 0/0';
        if (pathsDisplay) pathsDisplay.textContent = '';
        return;
    }
    
    var info = getSimulationInfo(currentSimulation, nodes);
    
    if (charDisplay) {
        if (info.currentChar !== null) {
            charDisplay.textContent = "Current: '" + info.currentChar + "'";
        } else {
            charDisplay.textContent = 'Current: (end)';
        }
    }
    
    if (stateDisplay) {
        var stateNames = info.currentStateNames.join(', ');
        stateDisplay.textContent = 'State: ' + (stateNames || '-');
    }
    
    if (progressDisplay) {
        progressDisplay.textContent = 'Position: ' + info.position + '/' + info.totalLength;
    }
    
    if (pathsDisplay) {
        if (info.activePaths > 1) {
            pathsDisplay.textContent = 'Exploring ' + info.activePaths + ' paths (NFA)';
            pathsDisplay.style.display = 'inline';
        } else {
            pathsDisplay.style.display = 'none';
        }
    }
}

// Show final result
function showFinalResult() {
    var resultDiv = document.getElementById('simResult');
    if (!resultDiv || !currentSimulation) {
        return;
    }
    
    var result = getFinalResult(currentSimulation);
    
    resultDiv.style.display = 'block';
    resultDiv.className = 'sim-result';
    
    switch (result.result) {
        case 'accepted':
            resultDiv.textContent = '✓ ACCEPTED';
            resultDiv.classList.add('accepted');
            break;
        case 'rejected':
            resultDiv.textContent = '✗ REJECTED';
            resultDiv.classList.add('rejected');
            break;
        case 'stuck':
            resultDiv.textContent = '✗ STUCK';
            resultDiv.classList.add('rejected');
            if (result.errorMessage) {
                resultDiv.textContent += ' - ' + result.errorMessage;
            }
            break;
    }
    
    // Disable step and play buttons
    var stepBtn = document.getElementById('simStep');
    var playPauseBtn = document.getElementById('simPlayPause');
    if (stepBtn) stepBtn.disabled = true;
    if (playPauseBtn) playPauseBtn.disabled = true;
}

// Hide result display
function hideResultDisplay() {
    var resultDiv = document.getElementById('simResult');
    if (resultDiv) {
        resultDiv.style.display = 'none';
        resultDiv.className = 'sim-result';
        resultDiv.textContent = '';
    }
}

// Show error message
function showSimulationError(message) {
    var resultDiv = document.getElementById('simResult');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'sim-result sim-error';
        resultDiv.textContent = '⚠ ' + message;
    }
}

// Initialize when document loads
if (typeof window !== 'undefined') {
    var oldOnload = window.onload;
    window.onload = function() {
        if (oldOnload) oldOnload();
        initSimulationUI();
    };
}