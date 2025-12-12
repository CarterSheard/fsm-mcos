// Import LaTeX (TikZ) and convert to FSM objects
// This parser supports the format exported by this tool's ExportAsLaTeX function

function ImportFromLaTeX() {
	this._scale = 10; // inverse of export scale (0.1)
	
	// Parsed elements
	this._circles = [];      // {x, y, radius}
	this._texts = [];        // {x, y, text, position}
	this._lines = [];        // {points: [{x,y}...]}
	this._arcs = [];         // {startX, startY, startAngle, endAngle, radius, centerX, centerY}
	this._fills = [];        // {points: [{x,y}...]}
}

// Main entry point - parse LaTeX string
ImportFromLaTeX.prototype.parse = function(latexString) {
	// Reset parsed elements
	this._circles = [];
	this._texts = [];
	this._lines = [];
	this._arcs = [];
	this._fills = [];
	
	// Extract content between \begin{tikzpicture} and \end{tikzpicture}
	// Also accept just \begin{tikzpicture} without the \begin{center} wrapper
	var tikzMatch = latexString.match(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/);
	if (!tikzMatch) {
		throw new Error('No tikzpicture environment found. Please paste valid TikZ LaTeX code.');
	}
	
	var tikzContent = tikzMatch[0];
	
	// Split into lines and parse each command
	var lines = tikzContent.split('\n');
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim();
		if (line.startsWith('\\draw')) {
			this._parseDrawCommand(line);
		} else if (line.startsWith('\\fill')) {
			this._parseFillCommand(line);
		}
	}
	
	return this;
};

// Parse a \draw command
ImportFromLaTeX.prototype._parseDrawCommand = function(line) {
	// Check for circle
	var circleMatch = line.match(/\\draw\s*\[.*?\]\s*\(([^,]+),([^)]+)\)\s*circle\s*\(([^)]+)\)/);
	if (circleMatch) {
		this._circles.push({
			x: parseFloat(circleMatch[1]),
			y: parseFloat(circleMatch[2]),
			radius: parseFloat(circleMatch[3])
		});
		return;
	}
	
	// Check for text node
	var nodeMatch = line.match(/\\draw\s*\(([^,]+),([^)]+)\)\s*node\s*(\[(.*?)\])?\s*\{\$(.+?)\$\}/);
	if (nodeMatch) {
		this._texts.push({
			x: parseFloat(nodeMatch[1]),
			y: parseFloat(nodeMatch[2]),
			position: nodeMatch[4] || '',
			text: this._cleanText(nodeMatch[5])
		});
		return;
	}
	
	// Check for arc
	var arcMatch = line.match(/\\draw\s*\[.*?\]\s*\(([^,]+),([^)]+)\)\s*arc\s*\(([^:]+):([^:]+):([^)]+)\)/);
	if (arcMatch) {
		var startX = parseFloat(arcMatch[1]);
		var startY = parseFloat(arcMatch[2]);
		var startAngle = parseFloat(arcMatch[3]) * Math.PI / 180; // Convert to radians
		var endAngle = parseFloat(arcMatch[4]) * Math.PI / 180;
		var radius = parseFloat(arcMatch[5]);
		
		// Calculate center from start point and angle
		var centerX = startX - radius * Math.cos(startAngle);
		var centerY = startY - radius * Math.sin(startAngle);
		
		this._arcs.push({
			startX: startX,
			startY: startY,
			startAngle: startAngle,
			endAngle: endAngle,
			radius: radius,
			centerX: centerX,
			centerY: centerY
		});
		return;
	}
	
	// Check for line/path (points connected by --)
	var lineMatch = line.match(/\\draw\s*\[.*?\]\s*((?:\([^)]+\)\s*(?:--\s*)?)+);/);
	if (lineMatch) {
		var pointsStr = lineMatch[1];
		var pointMatches = pointsStr.match(/\(([^,]+),([^)]+)\)/g);
		if (pointMatches && pointMatches.length >= 2) {
			var points = [];
			for (var i = 0; i < pointMatches.length; i++) {
				var m = pointMatches[i].match(/\(([^,]+),([^)]+)\)/);
				if (m) {
					points.push({
						x: parseFloat(m[1]),
						y: parseFloat(m[2])
					});
				}
			}
			if (points.length >= 2) {
				this._lines.push({ points: points });
			}
		}
	}
};

// Parse a \fill command (arrow heads)
ImportFromLaTeX.prototype._parseFillCommand = function(line) {
	var fillMatch = line.match(/\\fill\s*\[.*?\]\s*((?:\([^)]+\)\s*(?:--\s*)?)+);/);
	if (fillMatch) {
		var pointsStr = fillMatch[1];
		var pointMatches = pointsStr.match(/\(([^,]+),([^)]+)\)/g);
		if (pointMatches) {
			var points = [];
			for (var i = 0; i < pointMatches.length; i++) {
				var m = pointMatches[i].match(/\(([^,]+),([^)]+)\)/);
				if (m) {
					points.push({
						x: parseFloat(m[1]),
						y: parseFloat(m[2])
					});
				}
			}
			if (points.length >= 3) {
				this._fills.push({ points: points });
			}
		}
	}
};

// Clean text from LaTeX formatting
ImportFromLaTeX.prototype._cleanText = function(text) {
	// Replace \mbox{ } with regular spaces
	text = text.replace(/\\mbox\{\s*\}/g, ' ');
	// Remove any remaining LaTeX commands
	text = text.replace(/\\/g, '\\'); // Keep backslashes for greek letters
	return text;
};

// Transform coordinate from LaTeX to canvas space
ImportFromLaTeX.prototype._transformCoord = function(x, y) {
	return {
		x: x * this._scale,
		y: -y * this._scale  // Un-negate the y coordinate
	};
};

// Reconstruct FSM from parsed elements
ImportFromLaTeX.prototype.reconstructFSM = function() {
	var result = {
		nodes: [],
		links: []
	};
	
	var nodeRadius = 30; // Default node radius
	var expectedRadius = nodeRadius * 0.1; // 3.0 in LaTeX units
	var acceptRadius = (nodeRadius - 6) * 0.1; // 2.4 in LaTeX units
	var selfLoopRadius = 0.75 * nodeRadius * 0.1; // 2.25 in LaTeX units
	
	// Step 1: Identify nodes from circles
	var nodePositions = []; // Track node positions for later matching
	
	for (var i = 0; i < this._circles.length; i++) {
		var circle = this._circles[i];
		
		// Check if this is a node circle (radius ~= 3.0)
		if (Math.abs(circle.radius - expectedRadius) < 0.5) {
			var pos = this._transformCoord(circle.x, circle.y);
			
			// Check if we already have a node at this position
			var existingNode = this._findNodeAtPosition(nodePositions, pos.x, pos.y);
			if (!existingNode) {
				var node = new Node(pos.x, pos.y);
				node.isAcceptState = false;
				node.text = '';
				result.nodes.push(node);
				nodePositions.push({ node: node, x: pos.x, y: pos.y });
			}
		}
		// Check if this is an accept state inner circle (radius ~= 2.4)
		else if (Math.abs(circle.radius - acceptRadius) < 0.5) {
			var pos = this._transformCoord(circle.x, circle.y);
			var existingNode = this._findNodeAtPosition(nodePositions, pos.x, pos.y);
			if (existingNode) {
				existingNode.node.isAcceptState = true;
			}
		}
	}
	
	// Step 2: Assign text labels to nodes
	for (var i = 0; i < this._texts.length; i++) {
		var text = this._texts[i];
		var pos = this._transformCoord(text.x, text.y);
		
		// Find nearest node
		var nearestNode = this._findNearestNode(nodePositions, pos.x, pos.y, nodeRadius * 1.5);
		if (nearestNode && !text.position) {
			// Text without position modifier is likely a node label
			nearestNode.node.text = text.text;
			text._assigned = true;
		}
	}
	
	// Step 3: Identify self-loops from arcs
	for (var i = 0; i < this._arcs.length; i++) {
		var arc = this._arcs[i];
		
		// Self-loops have small radius (~2.25)
		if (Math.abs(arc.radius - selfLoopRadius) < 0.5) {
			var centerPos = this._transformCoord(arc.centerX, arc.centerY);
			
			// Find the node this self-loop belongs to
			// Self-loop center is at node.x + 1.5 * nodeRadius * cos(anchorAngle)
			for (var j = 0; j < nodePositions.length; j++) {
				var np = nodePositions[j];
				var dx = centerPos.x - np.x;
				var dy = centerPos.y - np.y;
				var dist = Math.sqrt(dx * dx + dy * dy);
				
				// Distance should be ~1.5 * nodeRadius = 45
				if (Math.abs(dist - 1.5 * nodeRadius) < 20) {
					var selfLink = new SelfLink(np.node, null);
					// Calculate anchor angle from center position relative to node
					selfLink.anchorAngle = Math.atan2(dy, dx);
					selfLink.text = '';
					result.links.push(selfLink);
					arc._assigned = true;
					arc._linkIndex = result.links.length - 1;
					break;
				}
			}
		}
	}
	
	// Step 4: Identify regular links from lines
	for (var i = 0; i < this._lines.length; i++) {
		var line = this._lines[i];
		if (line.points.length === 2) {
			var start = this._transformCoord(line.points[0].x, line.points[0].y);
			var end = this._transformCoord(line.points[1].x, line.points[1].y);
			
			// Find nodes at start and end
			var startNode = this._findNearestNode(nodePositions, start.x, start.y, nodeRadius + 10);
			var endNode = this._findNearestNode(nodePositions, end.x, end.y, nodeRadius + 10);
			
			if (startNode && endNode && startNode !== endNode) {
				// Regular link between two nodes
				var link = new Link(startNode.node, endNode.node);
				link.text = '';
				link.lineAngleAdjust = 0;
				link.parallelPart = 0.5;
				link.perpendicularPart = 0;
				result.links.push(link);
				line._assigned = true;
				line._linkIndex = result.links.length - 1;
			} else if (endNode && !startNode) {
				// Start link - line pointing to a node from outside
				var startLink = new StartLink(endNode.node, null);
				startLink.deltaX = start.x - endNode.x;
				startLink.deltaY = start.y - endNode.y;
				startLink.text = '';
				result.links.push(startLink);
				line._assigned = true;
				line._linkIndex = result.links.length - 1;
			} else if (startNode && !endNode) {
				// Could also be a start link with reversed points
				var startLink = new StartLink(startNode.node, null);
				startLink.deltaX = end.x - startNode.x;
				startLink.deltaY = end.y - startNode.y;
				startLink.text = '';
				result.links.push(startLink);
				line._assigned = true;
				line._linkIndex = result.links.length - 1;
			}
		}
	}
	
	// Step 5: Identify curved links from remaining arcs
	for (var i = 0; i < this._arcs.length; i++) {
		var arc = this._arcs[i];
		if (arc._assigned) continue;
		
		// Calculate end point of arc
		var endX = arc.centerX + arc.radius * Math.cos(arc.endAngle);
		var endY = arc.centerY + arc.radius * Math.sin(arc.endAngle);
		
		var startPos = this._transformCoord(arc.startX, arc.startY);
		var endPos = this._transformCoord(endX, endY);
		
		var arcStartNode = this._findNearestNode(nodePositions, startPos.x, startPos.y, nodeRadius + 15);
		var arcEndNode = this._findNearestNode(nodePositions, endPos.x, endPos.y, nodeRadius + 15);
		
		if (arcStartNode && arcEndNode && arcStartNode !== arcEndNode) {
			// Create link from arcStartNode to arcEndNode
			// The LaTeX arc's start point is near nodeA, end point is near nodeB
			var link = new Link(arcStartNode.node, arcEndNode.node);
			link.text = '';
			link.lineAngleAdjust = 0;
			
			// Calculate the arc midpoint (a point ON the arc at the middle angle)
			// This is different from the arc center!
			var midAngle = (arc.startAngle + arc.endAngle) / 2;
			var arcMidX = arc.centerX + arc.radius * Math.cos(midAngle);
			var arcMidY = arc.centerY + arc.radius * Math.sin(midAngle);
			var arcMidPos = this._transformCoord(arcMidX, arcMidY);
			
			// Calculate perpendicular distance from the line to the arc midpoint
			var dx = arcEndNode.x - arcStartNode.x;  // nodeB - nodeA
			var dy = arcEndNode.y - arcStartNode.y;
			var length = Math.sqrt(dx * dx + dy * dy);
			
			if (length > 0) {
				link.parallelPart = 0.5;
				// Perpendicular part uses the arc midpoint (which lies on the arc)
				// as the anchor point reference
				link.perpendicularPart = (dx * (arcMidPos.y - arcStartNode.y) - dy * (arcMidPos.x - arcStartNode.x)) / length;
			}
			
			result.links.push(link);
			arc._assigned = true;
			arc._linkIndex = result.links.length - 1;
		}
	}
	
	// Step 6: Assign text labels to links
	for (var i = 0; i < this._texts.length; i++) {
		var text = this._texts[i];
		if (text._assigned) continue;
		
		var pos = this._transformCoord(text.x, text.y);
		
		// Find nearest link
		var nearestLink = null;
		var nearestDist = Infinity;
		
		for (var j = 0; j < result.links.length; j++) {
			var link = result.links[j];
			var linkMid = this._getLinkMidpoint(link, nodeRadius);
			if (linkMid) {
				var dist = Math.sqrt(Math.pow(pos.x - linkMid.x, 2) + Math.pow(pos.y - linkMid.y, 2));
				if (dist < nearestDist && dist < 80) {
					nearestDist = dist;
					nearestLink = link;
				}
			}
		}
		
		if (nearestLink) {
			nearestLink.text = text.text;
			text._assigned = true;
		}
	}
	
	return result;
};

// Helper: Find node at a specific position
ImportFromLaTeX.prototype._findNodeAtPosition = function(nodePositions, x, y) {
	for (var i = 0; i < nodePositions.length; i++) {
		var np = nodePositions[i];
		if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) {
			return np;
		}
	}
	return null;
};

// Helper: Find nearest node within a threshold
ImportFromLaTeX.prototype._findNearestNode = function(nodePositions, x, y, threshold) {
	var nearest = null;
	var minDist = threshold;
	
	for (var i = 0; i < nodePositions.length; i++) {
		var np = nodePositions[i];
		var dist = Math.sqrt(Math.pow(np.x - x, 2) + Math.pow(np.y - y, 2));
		if (dist < minDist) {
			minDist = dist;
			nearest = np;
		}
	}
	
	return nearest;
};

// Helper: Get midpoint of a link for label assignment
ImportFromLaTeX.prototype._getLinkMidpoint = function(link, nodeRadius) {
	if (link instanceof SelfLink) {
		var circleX = link.node.x + 1.5 * nodeRadius * Math.cos(link.anchorAngle);
		var circleY = link.node.y + 1.5 * nodeRadius * Math.sin(link.anchorAngle);
		return {
			x: circleX + 0.75 * nodeRadius * Math.cos(link.anchorAngle),
			y: circleY + 0.75 * nodeRadius * Math.sin(link.anchorAngle)
		};
	} else if (link instanceof StartLink) {
		return {
			x: link.node.x + link.deltaX,
			y: link.node.y + link.deltaY
		};
	} else if (link instanceof Link) {
		return {
			x: (link.nodeA.x + link.nodeB.x) / 2,
			y: (link.nodeA.y + link.nodeB.y) / 2
		};
	}
	return null;
};

// Main import function - called from UI
function importFromLaTeX(latexString) {
	var importer = new ImportFromLaTeX();
	importer.parse(latexString);
	return importer.reconstructFSM();
}

// UI functions for LaTeX import modal
function showImportModal() {
	document.getElementById('importModal').style.display = 'block';
	document.getElementById('importModalOverlay').style.display = 'block';
	document.getElementById('latexInput').value = '';
	document.getElementById('importError').style.display = 'none';
	document.getElementById('latexInput').focus();
}

function hideImportModal() {
	document.getElementById('importModal').style.display = 'none';
	document.getElementById('importModalOverlay').style.display = 'none';
}

function importLaTeX() {
	var latexCode = document.getElementById('latexInput').value.trim();
	
	if (!latexCode) {
		document.getElementById('importError').textContent = 'Please paste some LaTeX code.';
		document.getElementById('importError').style.display = 'block';
		return;
	}
	
	try {
		var result = importFromLaTeX(latexCode);
		
		if (result.nodes.length === 0) {
			throw new Error('No nodes found in the LaTeX code. Make sure it contains valid TikZ circles.');
		}
		
		// Clear existing canvas
		nodes = [];
		links = [];
		selectedObject = null;
		
		// Populate with imported data
		nodes = result.nodes;
		links = result.links;
		
		// Redraw and save
		draw();
		saveBackup();
		
		hideImportModal();
	} catch (e) {
		document.getElementById('importError').textContent = 'Error: ' + e.message;
		document.getElementById('importError').style.display = 'block';
	}
}

// Clear canvas function
function clearCanvas() {
	if (confirm('Are you sure you want to delete all nodes and links?')) {
		nodes = [];
		links = [];
		selectedObject = null;
		draw();
		saveBackup();
		
		// Hide output container if visible
		var outputContainer = document.getElementById('outputContainer');
		if (outputContainer) {
			outputContainer.style.display = 'none';
		}
	}
}