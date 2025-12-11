/*
 Finite State Machine Designer (http://madebyevan.com/fsm/)
 License: MIT License (see below)

 Copyright (c) 2010 Evan Wallace

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
*/

// Minimum Spanning Tree Algorithm for FSM Designer
// Uses Kruskal's algorithm with Union-Find data structure

// Union-Find (Disjoint Set) data structure
function UnionFind(size) {
    this.parent = [];
    this.rank = [];
    for (var i = 0; i < size; i++) {
        this.parent[i] = i;
        this.rank[i] = 0;
    }
}

UnionFind.prototype.find = function(x) {
    // Path compression
    if (this.parent[x] !== x) {
        this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
};

UnionFind.prototype.union = function(x, y) {
    // Union by rank
    var rootX = this.find(x);
    var rootY = this.find(y);
    
    if (rootX === rootY) return false;
    
    if (this.rank[rootX] < this.rank[rootY]) {
        this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
        this.parent[rootY] = rootX;
    } else {
        this.parent[rootY] = rootX;
        this.rank[rootX]++;
    }
    return true;
};

// Parse edge weight from text label
function parseEdgeWeight(text) {
    if (!text || text.trim() === '') {
        return { valid: false, error: 'Edge has no label (weight required)' };
    }
    
    var trimmed = text.trim();
    var weight = parseFloat(trimmed);
    
    if (isNaN(weight)) {
        return { valid: false, error: 'Edge label "' + trimmed + '" is not a valid number' };
    }
    
    return { valid: true, weight: weight };
}

// Check if graph is connected using Union-Find
function isGraphConnected(nodeCount, edges) {
    if (nodeCount === 0) return true;
    if (nodeCount === 1) return true;
    
    var uf = new UnionFind(nodeCount);
    
    for (var i = 0; i < edges.length; i++) {
        uf.union(edges[i].from, edges[i].to);
    }
    
    // Check if all nodes are in the same component
    var root = uf.find(0);
    for (var i = 1; i < nodeCount; i++) {
        if (uf.find(i) !== root) {
            return false;
        }
    }
    return true;
}

// Main MST computation function using Kruskal's algorithm
function computeMST(nodeArray, linkArray) {
    // Step 1: Extract and validate edges
    var edges = [];
    var selfLoopCount = 0;
    var selfLoopLinks = [];
    
    for (var i = 0; i < linkArray.length; i++) {
        var link = linkArray[i];
        
        // Skip StartLink (not an edge between nodes)
        if (link instanceof StartLink) {
            continue;
        }
        
        // Handle SelfLink (warn but don't include in MST)
        if (link instanceof SelfLink) {
            selfLoopCount++;
            selfLoopLinks.push(link);
            continue;
        }
        
        // Handle regular Link
        if (link instanceof Link) {
            var parseResult = parseEdgeWeight(link.text);
            if (!parseResult.valid) {
                return { success: false, error: parseResult.error };
            }
            
            var fromIndex = nodeArray.indexOf(link.nodeA);
            var toIndex = nodeArray.indexOf(link.nodeB);
            
            if (fromIndex < 0 || toIndex < 0) {
                return { success: false, error: 'Internal error: link references invalid node' };
            }
            
            edges.push({
                link: link,
                from: fromIndex,
                to: toIndex,
                weight: parseResult.weight
            });
        }
    }
    
    // Step 2: Check for self-loops warning
    var warnings = [];
    if (selfLoopCount > 0) {
        warnings.push(selfLoopCount + ' self-loop(s) will be removed (cannot be part of a spanning tree)');
    }
    
    // Step 3: Check if we have enough nodes
    if (nodeArray.length === 0) {
        return { success: false, error: 'No nodes in the graph' };
    }
    
    if (nodeArray.length === 1) {
        // Single node - MST is trivial (no edges needed)
        return {
            success: true,
            mstLinks: [],
            removedLinks: selfLoopLinks,
            warnings: warnings
        };
    }
    
    // Step 4: Check connectivity
    if (!isGraphConnected(nodeArray.length, edges)) {
        return { 
            success: false, 
            error: 'Graph is not connected. Cannot compute a Minimum Spanning Tree for a disconnected graph.' 
        };
    }
    
    // Step 5: Sort edges by weight (ascending)
    edges.sort(function(a, b) {
        return a.weight - b.weight;
    });
    
    // Step 6: Kruskal's algorithm - greedily add edges
    var uf = new UnionFind(nodeArray.length);
    var mstEdges = [];
    var nonMstEdges = [];
    
    for (var i = 0; i < edges.length; i++) {
        var edge = edges[i];
        if (uf.union(edge.from, edge.to)) {
            // Edge added to MST (doesn't create cycle)
            mstEdges.push(edge.link);
        } else {
            // Edge would create cycle - not in MST
            nonMstEdges.push(edge.link);
        }
    }
    
    // Combine non-MST edges and self-loops for removal
    var removedLinks = nonMstEdges.concat(selfLoopLinks);
    
    return { 
        success: true, 
        mstLinks: mstEdges,
        removedLinks: removedLinks,
        warnings: warnings
    };
}

// Calculate total weight of MST
function calculateMSTWeight(mstLinks) {
    var totalWeight = 0;
    for (var i = 0; i < mstLinks.length; i++) {
        var parseResult = parseEdgeWeight(mstLinks[i].text);
        if (parseResult.valid) {
            totalWeight += parseResult.weight;
        }
    }
    return totalWeight;
}

// Main UI handler function - called when user clicks button or presses Ctrl+T
function applyMST() {
    // Check for empty graph
    if (nodes.length === 0) {
        alert('Cannot compute MST: No nodes in the graph.');
        return;
    }
    
    // Check for directed mode
    if (directed) {
        alert('Warning: MST is typically computed on undirected graphs.\n\nThe algorithm will treat edges as undirected for this calculation.');
    }
    
    // Compute MST
    var result = computeMST(nodes, links);
    
    if (!result.success) {
        alert('Cannot compute MST:\n\n' + result.error);
        return;
    }
    
    // Build confirmation message
    var message = '';
    
    if (result.warnings.length > 0) {
        message += 'Warnings:\n';
        for (var i = 0; i < result.warnings.length; i++) {
            message += '• ' + result.warnings[i] + '\n';
        }
        message += '\n';
    }
    
    var totalWeight = calculateMSTWeight(result.mstLinks);
    
    message += 'MST computed successfully!\n\n';
    message += '• Edges in MST: ' + result.mstLinks.length + '\n';
    message += '• Edges to remove: ' + result.removedLinks.length + '\n';
    message += '• Total MST weight: ' + totalWeight + '\n\n';
    message += 'Do you want to apply the MST (remove non-MST edges)?';
    
    if (!confirm(message)) {
        return; // User cancelled
    }
    
    // Save state for undo
    saveState();
    
    // Remove non-MST edges
    var mstSet = [];
    for (var i = 0; i < result.mstLinks.length; i++) {
        mstSet.push(result.mstLinks[i]);
    }
    
    var newLinks = [];
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        
        // Keep StartLinks (not part of MST calculation)
        if (link instanceof StartLink) {
            newLinks.push(link);
            continue;
        }
        
        // Check if link is in MST
        var inMST = false;
        for (var j = 0; j < mstSet.length; j++) {
            if (link === mstSet[j]) {
                inMST = true;
                break;
            }
        }
        
        if (inMST) {
            newLinks.push(link);
        }
    }
    
    links = newLinks;
    selectedObject = null;
    draw();
    
    alert('MST applied! ' + result.removedLinks.length + ' edge(s) removed.\n\nYou can press Ctrl+Z to undo.');
}
function Link(a, b) {
	this.nodeA = a;
	this.nodeB = b;
	this.text = '';
	this.lineAngleAdjust = 0; // value to add to textAngle when link is straight line

	// make anchor point relative to the locations of nodeA and nodeB
	this.parallelPart = 0.5; // percentage from nodeA to nodeB
	this.perpendicularPart = 0; // pixels from line between nodeA and nodeB
}

Link.prototype.getAnchorPoint = function() {
	var dx = this.nodeB.x - this.nodeA.x;
	var dy = this.nodeB.y - this.nodeA.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	return {
		'x': this.nodeA.x + dx * this.parallelPart - dy * this.perpendicularPart / scale,
		'y': this.nodeA.y + dy * this.parallelPart + dx * this.perpendicularPart / scale
	};
};

Link.prototype.setAnchorPoint = function(x, y) {
	var dx = this.nodeB.x - this.nodeA.x;
	var dy = this.nodeB.y - this.nodeA.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	this.parallelPart = (dx * (x - this.nodeA.x) + dy * (y - this.nodeA.y)) / (scale * scale);
	this.perpendicularPart = (dx * (y - this.nodeA.y) - dy * (x - this.nodeA.x)) / scale;
	// snap to a straight line
	if(this.parallelPart > 0 && this.parallelPart < 1 && Math.abs(this.perpendicularPart) < snapToPadding) {
		this.lineAngleAdjust = (this.perpendicularPart < 0) * Math.PI;
		this.perpendicularPart = 0;
	}
};

Link.prototype.getEndPointsAndCircle = function() {
	if(this.perpendicularPart == 0) {
		var midX = (this.nodeA.x + this.nodeB.x) / 2;
		var midY = (this.nodeA.y + this.nodeB.y) / 2;
		var start = this.nodeA.closestPointOnCircle(midX, midY);
		var end = this.nodeB.closestPointOnCircle(midX, midY);
		return {
			'hasCircle': false,
			'startX': start.x,
			'startY': start.y,
			'endX': end.x,
			'endY': end.y,
		};
	}
	var anchor = this.getAnchorPoint();
	var circle = circleFromThreePoints(this.nodeA.x, this.nodeA.y, this.nodeB.x, this.nodeB.y, anchor.x, anchor.y);
	var isReversed = (this.perpendicularPart > 0);
	var reverseScale = isReversed ? 1 : -1;
	var startAngle = Math.atan2(this.nodeA.y - circle.y, this.nodeA.x - circle.x) - reverseScale * nodeRadius / circle.radius;
	var endAngle = Math.atan2(this.nodeB.y - circle.y, this.nodeB.x - circle.x) + reverseScale * nodeRadius / circle.radius;
	var startX = circle.x + circle.radius * Math.cos(startAngle);
	var startY = circle.y + circle.radius * Math.sin(startAngle);
	var endX = circle.x + circle.radius * Math.cos(endAngle);
	var endY = circle.y + circle.radius * Math.sin(endAngle);
	return {
		'hasCircle': true,
		'startX': startX,
		'startY': startY,
		'endX': endX,
		'endY': endY,
		'startAngle': startAngle,
		'endAngle': endAngle,
		'circleX': circle.x,
		'circleY': circle.y,
		'circleRadius': circle.radius,
		'reverseScale': reverseScale,
		'isReversed': isReversed,
	};
};

Link.prototype.draw = function(c) {
	var stuff = this.getEndPointsAndCircle();
	// draw arc
	c.beginPath();
	if(stuff.hasCircle) {
		c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, stuff.isReversed);
	} else {
		c.moveTo(stuff.startX, stuff.startY);
		c.lineTo(stuff.endX, stuff.endY);
	}
	c.stroke();
	// draw the head of the arrow
	if(stuff.hasCircle) {
		drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle - stuff.reverseScale * (Math.PI / 2));
	} else {
		drawArrow(c, stuff.endX, stuff.endY, Math.atan2(stuff.endY - stuff.startY, stuff.endX - stuff.startX));
	}
	// draw the text
	if(stuff.hasCircle) {
		var startAngle = stuff.startAngle;
		var endAngle = stuff.endAngle;
		if(endAngle < startAngle) {
			endAngle += Math.PI * 2;
		}
		var textAngle = (startAngle + endAngle) / 2 + stuff.isReversed * Math.PI;
		var textX = stuff.circleX + stuff.circleRadius * Math.cos(textAngle);
		var textY = stuff.circleY + stuff.circleRadius * Math.sin(textAngle);
		drawText(c, this.text, textX, textY, textAngle, selectedObject == this);
	} else {
		var textX = (stuff.startX + stuff.endX) / 2;
		var textY = (stuff.startY + stuff.endY) / 2;
		var textAngle = Math.atan2(stuff.endX - stuff.startX, stuff.startY - stuff.endY);
		drawText(c, this.text, textX, textY, textAngle + this.lineAngleAdjust, selectedObject == this);
	}
};

Link.prototype.containsPoint = function(x, y) {
	var stuff = this.getEndPointsAndCircle();
	if(stuff.hasCircle) {
		var dx = x - stuff.circleX;
		var dy = y - stuff.circleY;
		var distance = Math.sqrt(dx*dx + dy*dy) - stuff.circleRadius;
		if(Math.abs(distance) < hitTargetPadding) {
			var angle = Math.atan2(dy, dx);
			var startAngle = stuff.startAngle;
			var endAngle = stuff.endAngle;
			if(stuff.isReversed) {
				var temp = startAngle;
				startAngle = endAngle;
				endAngle = temp;
			}
			if(endAngle < startAngle) {
				endAngle += Math.PI * 2;
			}
			if(angle < startAngle) {
				angle += Math.PI * 2;
			} else if(angle > endAngle) {
				angle -= Math.PI * 2;
			}
			return (angle > startAngle && angle < endAngle);
		}
	} else {
		var dx = stuff.endX - stuff.startX;
		var dy = stuff.endY - stuff.startY;
		var length = Math.sqrt(dx*dx + dy*dy);
		var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
		var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
		return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
	}
	return false;
};

function Node(x, y) {
	this.x = x;
	this.y = y;
	this.mouseOffsetX = 0;
	this.mouseOffsetY = 0;
	this.isAcceptState = false;
	this.text = '';
}

Node.prototype.setMouseStart = function(x, y) {
	this.mouseOffsetX = this.x - x;
	this.mouseOffsetY = this.y - y;
};

Node.prototype.setAnchorPoint = function(x, y) {
	this.x = x + this.mouseOffsetX;
	this.y = y + this.mouseOffsetY;
};

Node.prototype.draw = function(c) {
	// draw the circle
	c.beginPath();
	c.arc(this.x, this.y, nodeRadius, 0, 2 * Math.PI, false);
	c.stroke();

	// draw the text
	drawText(c, this.text, this.x, this.y, null, selectedObject == this);

	// draw a double circle for an accept state
	if(this.isAcceptState) {
		c.beginPath();
		c.arc(this.x, this.y, nodeRadius - 6, 0, 2 * Math.PI, false);
		c.stroke();
	}
};

Node.prototype.closestPointOnCircle = function(x, y) {
	var dx = x - this.x;
	var dy = y - this.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	return {
		'x': this.x + dx * nodeRadius / scale,
		'y': this.y + dy * nodeRadius / scale,
	};
};

Node.prototype.containsPoint = function(x, y) {
	return (x - this.x)*(x - this.x) + (y - this.y)*(y - this.y) < nodeRadius*nodeRadius;
};

function SelfLink(node, mouse) {
	this.node = node;
	this.anchorAngle = 0;
	this.mouseOffsetAngle = 0;
	this.text = '';

	if(mouse) {
		this.setAnchorPoint(mouse.x, mouse.y);
	}
}

SelfLink.prototype.setMouseStart = function(x, y) {
	this.mouseOffsetAngle = this.anchorAngle - Math.atan2(y - this.node.y, x - this.node.x);
};

SelfLink.prototype.setAnchorPoint = function(x, y) {
	this.anchorAngle = Math.atan2(y - this.node.y, x - this.node.x) + this.mouseOffsetAngle;
	// snap to 90 degrees
	var snap = Math.round(this.anchorAngle / (Math.PI / 2)) * (Math.PI / 2);
	if(Math.abs(this.anchorAngle - snap) < 0.1) this.anchorAngle = snap;
	// keep in the range -pi to pi so our containsPoint() function always works
	if(this.anchorAngle < -Math.PI) this.anchorAngle += 2 * Math.PI;
	if(this.anchorAngle > Math.PI) this.anchorAngle -= 2 * Math.PI;
};

SelfLink.prototype.getEndPointsAndCircle = function() {
	var circleX = this.node.x + 1.5 * nodeRadius * Math.cos(this.anchorAngle);
	var circleY = this.node.y + 1.5 * nodeRadius * Math.sin(this.anchorAngle);
	var circleRadius = 0.75 * nodeRadius;
	var startAngle = this.anchorAngle - Math.PI * 0.8;
	var endAngle = this.anchorAngle + Math.PI * 0.8;
	var startX = circleX + circleRadius * Math.cos(startAngle);
	var startY = circleY + circleRadius * Math.sin(startAngle);
	var endX = circleX + circleRadius * Math.cos(endAngle);
	var endY = circleY + circleRadius * Math.sin(endAngle);
	return {
		'hasCircle': true,
		'startX': startX,
		'startY': startY,
		'endX': endX,
		'endY': endY,
		'startAngle': startAngle,
		'endAngle': endAngle,
		'circleX': circleX,
		'circleY': circleY,
		'circleRadius': circleRadius
	};
};

SelfLink.prototype.draw = function(c) {
	var stuff = this.getEndPointsAndCircle();
	// draw arc
	c.beginPath();
	c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, false);
	c.stroke();
	// draw the text on the loop farthest from the node
	var textX = stuff.circleX + stuff.circleRadius * Math.cos(this.anchorAngle);
	var textY = stuff.circleY + stuff.circleRadius * Math.sin(this.anchorAngle);
	drawText(c, this.text, textX, textY, this.anchorAngle, selectedObject == this);
	// draw the head of the arrow
	drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle + Math.PI * 0.4);
};

SelfLink.prototype.containsPoint = function(x, y) {
	var stuff = this.getEndPointsAndCircle();
	var dx = x - stuff.circleX;
	var dy = y - stuff.circleY;
	var distance = Math.sqrt(dx*dx + dy*dy) - stuff.circleRadius;
	return (Math.abs(distance) < hitTargetPadding);
};

function StartLink(node, start) {
	this.node = node;
	this.deltaX = 0;
	this.deltaY = 0;
	this.text = '';

	if(start) {
		this.setAnchorPoint(start.x, start.y);
	}
}

StartLink.prototype.setAnchorPoint = function(x, y) {
	this.deltaX = x - this.node.x;
	this.deltaY = y - this.node.y;

	if(Math.abs(this.deltaX) < snapToPadding) {
		this.deltaX = 0;
	}

	if(Math.abs(this.deltaY) < snapToPadding) {
		this.deltaY = 0;
	}
};

StartLink.prototype.getEndPoints = function() {
	var startX = this.node.x + this.deltaX;
	var startY = this.node.y + this.deltaY;
	var end = this.node.closestPointOnCircle(startX, startY);
	return {
		'startX': startX,
		'startY': startY,
		'endX': end.x,
		'endY': end.y,
	};
};

StartLink.prototype.draw = function(c) {
	var stuff = this.getEndPoints();

	// draw the line
	c.beginPath();
	c.moveTo(stuff.startX, stuff.startY);
	c.lineTo(stuff.endX, stuff.endY);
	c.stroke();

	// draw the text at the end without the arrow
	var textAngle = Math.atan2(stuff.startY - stuff.endY, stuff.startX - stuff.endX);
	drawText(c, this.text, stuff.startX, stuff.startY, textAngle, selectedObject == this);

	// draw the head of the arrow
	drawArrow(c, stuff.endX, stuff.endY, Math.atan2(-this.deltaY, -this.deltaX));
};

StartLink.prototype.containsPoint = function(x, y) {
	var stuff = this.getEndPoints();
	var dx = stuff.endX - stuff.startX;
	var dy = stuff.endY - stuff.startY;
	var length = Math.sqrt(dx*dx + dy*dy);
	var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
	var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
	return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
};

function TemporaryLink(from, to) {
	this.from = from;
	this.to = to;
}

TemporaryLink.prototype.draw = function(c) {
	// draw the line
	c.beginPath();
	c.moveTo(this.to.x, this.to.y);
	c.lineTo(this.from.x, this.from.y);
	c.stroke();

	// draw the head of the arrow
	drawArrow(c, this.to.x, this.to.y, Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x));
};

// Adjacency Matrix and List Export for FSM Designer
// Generates LaTeX representations of graph adjacency

// Generate node labels with fallback to indices
function generateNodeLabels() {
	var labels = [];
	var usedLabels = new Set();
	
	// First pass: use existing text labels
	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		if (node.text && node.text.trim() !== '') {
			labels.push(node.text.trim());
			usedLabels.add(node.text.trim());
		} else {
			labels.push(null); // Mark for fallback
		}
	}
	
	// Second pass: fill in fallbacks with indices
	var counter = 0;
	for (var i = 0; i < labels.length; i++) {
		if (labels[i] === null) {
			var fallbackLabel;
			do {
				fallbackLabel = 'q' + counter;
				counter++;
			} while (usedLabels.has(fallbackLabel));
			
			labels[i] = fallbackLabel;
			usedLabels.add(fallbackLabel);
		}
	}
	
	return labels;
}

// Escape LaTeX special characters
function escapeLaTeX(text) {
	if (!text) return '';
	return text
		.replace(/\\/g, '\\textbackslash{}')
		.replace(/&/g, '\\&')
		.replace(/%/g, '\\%')
		.replace(/\$/g, '\\$')
		.replace(/#/g, '\\#')
		.replace(/_/g, '\\_')
		.replace(/{/g, '\\{')
		.replace(/}/g, '\\}')
		.replace(/~/g, '\\textasciitilde{}')
		.replace(/\^/g, '\\textasciicircum{}');
}

// Generate adjacency matrix data structure with edge counts
function buildAdjacencyMatrix(labels) {
	var n = nodes.length;
	var matrix = [];
	
	// Initialize matrix with zeros
	for (var i = 0; i < n; i++) {
		matrix[i] = [];
		for (var j = 0; j < n; j++) {
			matrix[i][j] = 0;
		}
	}
	
	// Populate matrix from links - count edges
	for (var i = 0; i < links.length; i++) {
		var link = links[i];
		
		if (link instanceof Link) {
			var nodeAIndex = nodes.indexOf(link.nodeA);
			var nodeBIndex = nodes.indexOf(link.nodeB);
			
			if (nodeAIndex >= 0 && nodeBIndex >= 0) {
				// For directed: A->B means row A, column B
				matrix[nodeAIndex][nodeBIndex]++;
				
				// For undirected graphs, add reverse direction
				if (!directed) {
					matrix[nodeBIndex][nodeAIndex]++;
				}
			}
		} else if (link instanceof SelfLink) {
			var nodeIndex = nodes.indexOf(link.node);
			
			if (nodeIndex >= 0) {
				matrix[nodeIndex][nodeIndex]++;
			}
		}
		// StartLink is ignored - it's not an edge between nodes
	}
	
	return matrix;
}

// Generate adjacency list data structure
function buildAdjacencyList(labels) {
	var adjacency = {};
	
	// Initialize adjacency list for all nodes
	for (var i = 0; i < labels.length; i++) {
		adjacency[labels[i]] = [];
	}
	
	// Populate adjacency list from links
	for (var i = 0; i < links.length; i++) {
		var link = links[i];
		
		if (link instanceof Link) {
			var nodeAIndex = nodes.indexOf(link.nodeA);
			var nodeBIndex = nodes.indexOf(link.nodeB);
			
			if (nodeAIndex >= 0 && nodeBIndex >= 0) {
				adjacency[labels[nodeAIndex]].push({
					node: labels[nodeBIndex]
				});
				
				// For undirected graphs, add reverse direction
				if (!directed) {
					adjacency[labels[nodeBIndex]].push({
						node: labels[nodeAIndex]
					});
				}
			}
		} else if (link instanceof SelfLink) {
			var nodeIndex = nodes.indexOf(link.node);
			
			if (nodeIndex >= 0) {
				adjacency[labels[nodeIndex]].push({
					node: labels[nodeIndex]
				});
			}
		}
	}
	
	return adjacency;
}

// Generate LaTeX for adjacency matrix (just the tabular, no document wrapper)
function generateAdjacencyMatrix() {
	if (nodes.length === 0) {
		return '% No nodes in the graph to export.';
	}
	
	var labels = generateNodeLabels();
	var matrix = buildAdjacencyMatrix(labels);
	var n = nodes.length;
	
	var latex = '\\begin{center}\n';
	latex += '\\begin{tabular}{c|' + 'c'.repeat(n) + '}\n';
	
	// Header row
	latex += '  ';
	for (var j = 0; j < n; j++) {
		latex += ' & $' + escapeLaTeX(labels[j]) + '$';
	}
	latex += ' \\\\\n';
	latex += '\\hline\n';
	
	// Data rows
	for (var i = 0; i < n; i++) {
		latex += '$' + escapeLaTeX(labels[i]) + '$';
		for (var j = 0; j < n; j++) {
			latex += ' & $' + matrix[i][j] + '$';
		}
		latex += ' \\\\\n';
	}
	
	latex += '\\end{tabular}\n';
	latex += '\\end{center}\n';
	
	return latex;
}

// Generate LaTeX for adjacency list (just the itemize, no document wrapper)
function generateAdjacencyList() {
	if (nodes.length === 0) {
		return '% No nodes in the graph to export.';
	}
	
	var labels = generateNodeLabels();
	var adjacency = buildAdjacencyList(labels);
	
	var latex = '\\begin{itemize}\n';
	
	// Generate list entries
	for (var i = 0; i < labels.length; i++) {
		var label = labels[i];
		var connections = adjacency[label];
		
		latex += '    \\item $' + escapeLaTeX(label) + '$: [';
		
		if (connections.length === 0) {
			latex += ']';
		} else {
			var parts = [];
			for (var j = 0; j < connections.length; j++) {
				var conn = connections[j];
				parts.push('$' + escapeLaTeX(conn.node) + '$');
			}
			latex += parts.join(', ') + ']';
		}
		
		latex += '\n';
	}
	
	latex += '\\end{itemize}\n';
	
	return latex;
}
// draw using this instead of a canvas and call toLaTeX() afterward
function ExportAsLaTeX() {
	this._points = [];
	this._texData = '';
	this._scale = 0.1; // to convert pixels to document space (TikZ breaks if the numbers get too big, above 500?)

	this.toLaTeX = function() {
		return '\\documentclass[12pt]{article}\n' +
			'\\usepackage{tikz}\n' +
			'\n' +
			'\\begin{document}\n' +
			'\n' +
			'\\begin{center}\n' +
			'\\begin{tikzpicture}[scale=0.2]\n' +
			'\\tikzstyle{every node}+=[inner sep=0pt]\n' +
			this._texData +
			'\\end{tikzpicture}\n' +
			'\\end{center}\n' +
			'\n' +
			'\\end{document}\n';
	};

	this.beginPath = function() {
		this._points = [];
	};
	this.arc = function(x, y, radius, startAngle, endAngle, isReversed) {
		x *= this._scale;
		y *= this._scale;
		radius *= this._scale;
		if(endAngle - startAngle == Math.PI * 2) {
			this._texData += '\\draw [' + this.strokeStyle + '] (' + fixed(x, 3) + ',' + fixed(-y, 3) + ') circle (' + fixed(radius, 3) + ');\n';
		} else {
			if(isReversed) {
				var temp = startAngle;
				startAngle = endAngle;
				endAngle = temp;
			}
			if(endAngle < startAngle) {
				endAngle += Math.PI * 2;
			}
			// TikZ needs the angles to be in between -2pi and 2pi or it breaks
			if(Math.min(startAngle, endAngle) < -2*Math.PI) {
				startAngle += 2*Math.PI;
				endAngle += 2*Math.PI;
			} else if(Math.max(startAngle, endAngle) > 2*Math.PI) {
				startAngle -= 2*Math.PI;
				endAngle -= 2*Math.PI;
			}
			startAngle = -startAngle;
			endAngle = -endAngle;
			this._texData += '\\draw [' + this.strokeStyle + '] (' + fixed(x + radius * Math.cos(startAngle), 3) + ',' + fixed(-y + radius * Math.sin(startAngle), 3) + ') arc (' + fixed(startAngle * 180 / Math.PI, 5) + ':' + fixed(endAngle * 180 / Math.PI, 5) + ':' + fixed(radius, 3) + ');\n';
		}
	};
	this.moveTo = this.lineTo = function(x, y) {
		x *= this._scale;
		y *= this._scale;
		this._points.push({ 'x': x, 'y': y });
	};
	this.stroke = function() {
		if(this._points.length == 0) return;
		this._texData += '\\draw [' + this.strokeStyle + ']';
		for(var i = 0; i < this._points.length; i++) {
			var p = this._points[i];
			this._texData += (i > 0 ? ' --' : '') + ' (' + fixed(p.x, 2) + ',' + fixed(-p.y, 2) + ')';
		}
		this._texData += ';\n';
	};
	this.fill = function() {
		if(this._points.length == 0) return;
		if (directed){
		this._texData += '\\fill [' + this.strokeStyle + ']';
		for(var i = 0; i < this._points.length; i++) {
			var p = this._points[i];
			this._texData += (i > 0 ? ' --' : '') + ' (' + fixed(p.x, 2) + ',' + fixed(-p.y, 2) + ')';
		}

		this._texData += ';\n';
		}
	};
	this.measureText = function(text) {
		var c = canvas.getContext('2d');
		c.font = '20px "Times New Romain", serif';
		return c.measureText(text);
	};
	this.advancedFillText = function(text, originalText, x, y, angleOrNull) {
		if(text.replace(' ', '').length > 0) {
			var nodeParams = '';
			// x and y start off as the center of the text, but will be moved to one side of the box when angleOrNull != null
			if(angleOrNull != null) {
				var width = this.measureText(text).width;
				var dx = Math.cos(angleOrNull);
				var dy = Math.sin(angleOrNull);
				if(Math.abs(dx) > Math.abs(dy)) {
					if(dx > 0) nodeParams = '[right] ', x -= width / 2;
					else nodeParams = '[left] ', x += width / 2;
				} else {
					if(dy > 0) nodeParams = '[below] ', y -= 10;
					else nodeParams = '[above] ', y += 10;
				}
			}
			x *= this._scale;
			y *= this._scale;
			this._texData += '\\draw (' + fixed(x, 2) + ',' + fixed(-y, 2) + ') node ' + nodeParams + '{$' + originalText.replace(/ /g, '\\mbox{ }') + '$};\n';
		}
	};

	this.translate = this.save = this.restore = this.clearRect = function(){};
}

// draw using this instead of a canvas and call toSVG() afterward
function ExportAsSVG() {
	this.fillStyle = 'black';
	this.strokeStyle = 'black';
	this.lineWidth = 1;
	this.font = '12px Arial, sans-serif';
	this._points = [];
	this._svgData = '';
	this._transX = 0;
	this._transY = 0;

	this.toSVG = function() {
		return '<?xml version="1.0" standalone="no"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n\n<svg width="800" height="600" version="1.1" xmlns="http://www.w3.org/2000/svg">\n' + this._svgData + '</svg>\n';
	};

	this.beginPath = function() {
		this._points = [];
	};
	this.arc = function(x, y, radius, startAngle, endAngle, isReversed) {
		x += this._transX;
		y += this._transY;
		var style = 'stroke="' + this.strokeStyle + '" stroke-width="' + this.lineWidth + '" fill="none"';

		if(endAngle - startAngle == Math.PI * 2) {
			this._svgData += '\t<ellipse ' + style + ' cx="' + fixed(x, 3) + '" cy="' + fixed(y, 3) + '" rx="' + fixed(radius, 3) + '" ry="' + fixed(radius, 3) + '"/>\n';
		} else {
			if(isReversed) {
				var temp = startAngle;
				startAngle = endAngle;
				endAngle = temp;
			}

			if(endAngle < startAngle) {
				endAngle += Math.PI * 2;
			}

			var startX = x + radius * Math.cos(startAngle);
			var startY = y + radius * Math.sin(startAngle);
			var endX = x + radius * Math.cos(endAngle);
			var endY = y + radius * Math.sin(endAngle);
			var useGreaterThan180 = (Math.abs(endAngle - startAngle) > Math.PI);
			var goInPositiveDirection = 1;

			this._svgData += '\t<path ' + style + ' d="';
			this._svgData += 'M ' + fixed(startX, 3) + ',' + fixed(startY, 3) + ' '; // startPoint(startX, startY)
			this._svgData += 'A ' + fixed(radius, 3) + ',' + fixed(radius, 3) + ' '; // radii(radius, radius)
			this._svgData += '0 '; // value of 0 means perfect circle, others mean ellipse
			this._svgData += +useGreaterThan180 + ' ';
			this._svgData += +goInPositiveDirection + ' ';
			this._svgData += fixed(endX, 3) + ',' + fixed(endY, 3); // endPoint(endX, endY)
			this._svgData += '"/>\n';
		}
	};
	this.moveTo = this.lineTo = function(x, y) {
		x += this._transX;
		y += this._transY;
		this._points.push({ 'x': x, 'y': y });
	};
	this.stroke = function() {
		if(this._points.length == 0) return;
		this._svgData += '\t<polygon stroke="' + this.strokeStyle + '" stroke-width="' + this.lineWidth + '" points="';
		for(var i = 0; i < this._points.length; i++) {
			this._svgData += (i > 0 ? ' ' : '') + fixed(this._points[i].x, 3) + ',' + fixed(this._points[i].y, 3);
		}
		this._svgData += '"/>\n';
	};
	this.fill = function() {
		if(this._points.length == 0) return;
		this._svgData += '\t<polygon fill="' + this.fillStyle + '" stroke-width="' + this.lineWidth + '" points="';
		for(var i = 0; i < this._points.length; i++) {
			this._svgData += (i > 0 ? ' ' : '') + fixed(this._points[i].x, 3) + ',' + fixed(this._points[i].y, 3);
		}
		this._svgData += '"/>\n';
	};
	this.measureText = function(text) {
		var c = canvas.getContext('2d');
		c.font = '20px "Times New Romain", serif';
		return c.measureText(text);
	};
	this.fillText = function(text, x, y) {
		x += this._transX;
		y += this._transY;
		if(text.replace(' ', '').length > 0) {
			this._svgData += '\t<text x="' + fixed(x, 3) + '" y="' + fixed(y, 3) + '" font-family="Times New Roman" font-size="20">' + textToXML(text) + '</text>\n';
		}
	};
	this.translate = function(x, y) {
		this._transX = x;
		this._transY = y;
	};

	this.save = this.restore = this.clearRect = function(){};
}

var greekLetterNames = [ 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega' ];

function convertLatexShortcuts(text) {
	// html greek characters
	for(var i = 0; i < greekLetterNames.length; i++) {
		var name = greekLetterNames[i];
		text = text.replace(new RegExp('\\\\' + name, 'g'), String.fromCharCode(913 + i + (i > 16)));
		text = text.replace(new RegExp('\\\\' + name.toLowerCase(), 'g'), String.fromCharCode(945 + i + (i > 16)));
	}

	// subscripts
	for(var i = 0; i < 10; i++) {
		text = text.replace(new RegExp('_' + i, 'g'), String.fromCharCode(8320 + i));
	}

	return text;
}

function textToXML(text) {
	text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	var result = '';
	for(var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);
		if(c >= 0x20 && c <= 0x7E) {
			result += text[i];
		} else {
			result += '&#' + c + ';';
		}
	}
	return result;
}

function drawArrow(c, x, y, angle) {
	var dx = Math.cos(angle);
	var dy = Math.sin(angle);
	c.beginPath();
	c.moveTo(x, y);
	if (directed){
	c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
	c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
	}
	c.fill();
}

function canvasHasFocus() {
	return (document.activeElement || document.body) == document.body;
}

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
	text = convertLatexShortcuts(originalText);
	c.font = '20px "Times New Roman", serif';
	var width = c.measureText(text).width;

	// center the text
	x -= width / 2;

	// position the text intelligently if given an angle
	if(angleOrNull != null) {
		var cos = Math.cos(angleOrNull);
		var sin = Math.sin(angleOrNull);
		var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
		var cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
		var slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
		x += cornerPointX - sin * slide;
		y += cornerPointY + cos * slide;
	}

	// draw text and caret (round the coordinates so the caret falls on a pixel)
	if('advancedFillText' in c) {
		c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
	} else {
		x = Math.round(x);
		y = Math.round(y);
		c.fillText(text, x, y + 6);
		if(isSelected && caretVisible && canvasHasFocus() && document.hasFocus()) {
			x += width;
			c.beginPath();
			c.moveTo(x, y - 10);
			c.lineTo(x, y + 10);
			c.stroke();
		}
	}
}

var caretTimer;
var caretVisible = true;

function resetCaret() {
	clearInterval(caretTimer);
	caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
	caretVisible = true;
}

var canvas;
var nodeRadius = 30;
var nodes = [];
var links = [];

var cursorVisible = true;
var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels
var selectedObject = null; // either a Link or a Node
var currentLink = null; // a Link
var movingObject = false;
var originalClick;

function drawUsing(c) {
	c.clearRect(0, 0, canvas.width, canvas.height);
	c.save();
	c.translate(0.5, 0.5);

	for(var i = 0; i < nodes.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = (nodes[i] == selectedObject) ? 'blue' : 'black';
		nodes[i].draw(c);
	}
	for(var i = 0; i < links.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = (links[i] == selectedObject) ? 'blue' : 'black';
		links[i].draw(c);
	}
	if(currentLink != null) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = 'black';
		currentLink.draw(c);
	}

	c.restore();
}
var directed=true;
function toggleDirected(){
	directed=!directed;
	draw();
	if (latex){ //if latex selected, update latex code
		saveAsLaTeX();
	}
	if (svg){ //if svg selected, update svg code
		saveAsSVG();
	}
	// Save the directed state
	saveBackup();
}
function draw() {
	drawUsing(canvas.getContext('2d'));
	saveBackup();
}

function selectObject(x, y) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i].containsPoint(x, y)) {
			return nodes[i];
		}
	}
	for(var i = 0; i < links.length; i++) {
		if(links[i].containsPoint(x, y)) {
			return links[i];
		}
	}
	return null;
}

function snapNode(node) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i] == node) continue;

		if(Math.abs(node.x - nodes[i].x) < snapToPadding) {
			node.x = nodes[i].x;
		}

		if(Math.abs(node.y - nodes[i].y) < snapToPadding) {
			node.y = nodes[i].y;
		}
	}
}

window.onload = function() {
	canvas = document.getElementById('canvas');
	restoreBackup();
	draw();
	
	// Initialize keybind system
	if (typeof initKeybinds === 'function') {
		initKeybinds();
	}

	canvas.onmousedown = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		selectedObject = selectObject(mouse.x, mouse.y);
		movingObject = false;
		originalClick = mouse;

		if(selectedObject != null) {
			if(shift && selectedObject instanceof Node) {
				currentLink = new SelfLink(selectedObject, mouse);
			} else {
				movingObject = true;
				deltaMouseX = deltaMouseY = 0;
				if(selectedObject.setMouseStart) {
					selectedObject.setMouseStart(mouse.x, mouse.y);
				}
			}
			resetCaret();
		} else if(shift) {
			currentLink = new TemporaryLink(mouse, mouse);
		}

		draw();

		if(canvasHasFocus()) {
			// disable drag-and-drop only if the canvas is already focused
			return false;
		} else {
			// otherwise, let the browser switch the focus away from wherever it was
			resetCaret();
			return true;
		}
	};

	canvas.ondblclick = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		selectedObject = selectObject(mouse.x, mouse.y);

		if(selectedObject == null) {
			selectedObject = new Node(mouse.x, mouse.y);
			nodes.push(selectedObject);
			resetCaret();
			draw();
		} else if(selectedObject instanceof Node) {
			selectedObject.isAcceptState = !selectedObject.isAcceptState;
			draw();
		}
	};

	canvas.onmousemove = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);

		if(currentLink != null) {
			var targetNode = selectObject(mouse.x, mouse.y);
			if(!(targetNode instanceof Node)) {
				targetNode = null;
			}

			if(selectedObject == null) {
				if(targetNode != null) {
					currentLink = new StartLink(targetNode, originalClick);
				} else {
					currentLink = new TemporaryLink(originalClick, mouse);
				}
			} else {
				if(targetNode == selectedObject) {
					currentLink = new SelfLink(selectedObject, mouse);
				} else if(targetNode != null) {
					currentLink = new Link(selectedObject, targetNode);
				} else {
					currentLink = new TemporaryLink(selectedObject.closestPointOnCircle(mouse.x, mouse.y), mouse);
				}
			}
			draw();
		}

		if(movingObject) {
			selectedObject.setAnchorPoint(mouse.x, mouse.y);
			if(selectedObject instanceof Node) {
				snapNode(selectedObject);
			}
			draw();
		}
	};

	canvas.onmouseup = function(e) {
		movingObject = false;

		if(currentLink != null) {
			if(!(currentLink instanceof TemporaryLink)) {
				selectedObject = currentLink;
				links.push(currentLink);
				resetCaret();
			}
			currentLink = null;
			draw();
		}
	};
}

var shift = false;

// Legacy keyboard handlers - replaced by keybinds.js but kept as fallback
document.onkeydown = function(e) {
	var key = crossBrowserKey(e);

	if(key == 16) {
		shift = true;
	} else if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(key == 8) { // backspace key
		if(selectedObject != null && 'text' in selectedObject) {
			selectedObject.text = selectedObject.text.substr(0, selectedObject.text.length - 1);
			resetCaret();
			draw();
		}

		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	} else if(key == 46) { // delete key
		if(selectedObject != null) {
			for(var i = 0; i < nodes.length; i++) {
				if(nodes[i] == selectedObject) {
					nodes.splice(i--, 1);
				}
			}
			for(var i = 0; i < links.length; i++) {
				if(links[i] == selectedObject || links[i].node == selectedObject || links[i].nodeA == selectedObject || links[i].nodeB == selectedObject) {
					links.splice(i--, 1);
				}
			}
			selectedObject = null;
			draw();
		}
	}
};

document.onkeyup = function(e) {
	var key = crossBrowserKey(e);

	if(key == 16) {
		shift = false;
	}
};

document.onkeypress = function(e) {
	// don't read keystrokes when other things have focus
	var key = crossBrowserKey(e);
	if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObject != null && 'text' in selectedObject) {
		selectedObject.text += String.fromCharCode(key);
		resetCaret();
		draw();

		// don't let keys do their actions (like space scrolls down the page)
		return false;
	} else if(key == 8) {
		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	}
};

function crossBrowserKey(e) {
	e = e || window.event;
	return e.which || e.keyCode;
}

function crossBrowserElementPos(e) {
	e = e || window.event;
	var obj = e.target || e.srcElement;
	var x = 0, y = 0;
	while(obj.offsetParent) {
		x += obj.offsetLeft;
		y += obj.offsetTop;
		obj = obj.offsetParent;
	}
	return { 'x': x, 'y': y };
}

function crossBrowserMousePos(e) {
	e = e || window.event;
	return {
		'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
		'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
	};
}

function crossBrowserRelativeMousePos(e) {
	var element = crossBrowserElementPos(e);
	var mouse = crossBrowserMousePos(e);
	return {
		'x': mouse.x - element.x,
		'y': mouse.y - element.y
	};
}

function output(text) {
	var container = document.getElementById('outputContainer');
	container.style.display = 'block';
	var copyButton = document.getElementById('copyButton');
	copyButton.textContent = 'Copy';
	
	var textarea = document.getElementById('output');
	var latexContainer = document.getElementById('latexOutputContainer');
	
	// Check if we're in LaTeX mode and need split display
	if (latex && latexContainer) {
		// Hide the regular textarea, show the LaTeX container
		textarea.style.display = 'none';
		latexContainer.style.display = 'block';
		
		// Split the LaTeX content into preamble, center, and end
		var centerStart = text.indexOf('\\begin{center}');
		var centerEnd = text.indexOf('\\end{center}');
		
		if (centerStart !== -1 && centerEnd !== -1) {
			var preamble = text.substring(0, centerStart);
			var centerContent = text.substring(centerStart, centerEnd + '\\end{center}'.length);
			var endContent = text.substring(centerEnd + '\\end{center}'.length);
			
			document.getElementById('latexPreamble').textContent = preamble;
			document.getElementById('latexCenter').textContent = centerContent;
			document.getElementById('latexEnd').textContent = endContent;
		} else {
			// Fallback if we can't find the markers
			document.getElementById('latexPreamble').textContent = '';
			document.getElementById('latexCenter').textContent = text;
			document.getElementById('latexEnd').textContent = '';
		}
	} else {
		// Use regular textarea for non-LaTeX output
		textarea.style.display = 'block';
		if (latexContainer) {
			latexContainer.style.display = 'none';
		}
		textarea.value = text;
	}
}

function saveAsPNG() {
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(canvas.getContext('2d'));
	selectedObject = oldSelectedObject;
	var pngData = canvas.toDataURL('image/png');
	document.location.href = pngData;
}
var svg=false;
var latex=false;
function saveAsSVG() {
	latex=false;
	svg=true;
	var exporter = new ExportAsSVG();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var svgData = exporter.toSVG();
	output(svgData);
	// Chrome isn't ready for this yet, the 'Save As' menu item is disabled
	// document.location.href = 'data:image/svg+xml;base64,' + btoa(svgData);
}
function saveAsLaTeX() {
	svg=false;
	latex=true;
	var exporter = new ExportAsLaTeX();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var texData = exporter.toLaTeX();
	output(texData);
}

function copyOutput() {
	var textarea = document.getElementById('output');
	var copyButton = document.getElementById('copyButton');
	var latexCenterElement = document.getElementById('latexCenter');
	
	// Determine what content to copy
	var textToCopy;
	
	// If in LaTeX mode, copy only the center content
	if (latex && latexCenterElement) {
		textToCopy = latexCenterElement.textContent;
	} else {
		textToCopy = textarea.value;
	}

	navigator.clipboard.writeText(textToCopy).then(function() {
		// Success feedback
		copyButton.textContent = 'Copied!';
		
		// Add green flash animation for LaTeX mode (only on center element)
		if (latex && latexCenterElement) {
			latexCenterElement.classList.add('copy-flash');
			setTimeout(function() {
				latexCenterElement.classList.remove('copy-flash');
			}, 800);
		}
		
		setTimeout(function() {
			copyButton.textContent = 'Copy';
		}, 2000); // Revert after 2 seconds
	}, function(err) {
		copyButton.textContent = 'Failed to copy';
		console.error('Could not copy text: ', err);
		setTimeout(function() {
			copyButton.textContent = 'Copy';
		}, 2000);
	});
}

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
function det(a, b, c, d, e, f, g, h, i) {
	return a*e*i + b*f*g + c*d*h - a*f*h - b*d*i - c*e*g;
}

function circleFromThreePoints(x1, y1, x2, y2, x3, y3) {
	var a = det(x1, y1, 1, x2, y2, 1, x3, y3, 1);
	var bx = -det(x1*x1 + y1*y1, y1, 1, x2*x2 + y2*y2, y2, 1, x3*x3 + y3*y3, y3, 1);
	var by = det(x1*x1 + y1*y1, x1, 1, x2*x2 + y2*y2, x2, 1, x3*x3 + y3*y3, x3, 1);
	var c = -det(x1*x1 + y1*y1, x1, y1, x2*x2 + y2*y2, x2, y2, x3*x3 + y3*y3, x3, y3);
	return {
		'x': -bx / (2*a),
		'y': -by / (2*a),
		'radius': Math.sqrt(bx*bx + by*by - 4*a*c) / (2*Math.abs(a))
	};
}

function fixed(number, digits) {
	return number.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
}

function restoreBackup() {
	if(!localStorage || !JSON) {
		return;
	}

	try {
		var backup = JSON.parse(localStorage['fsm']);
		
		// Restore directed state
		if(backup.hasOwnProperty('directed')) {
			directed = backup.directed;
		}
		
		for(var i = 0; i < backup.nodes.length; i++) {
			var backupNode = backup.nodes[i];
			var node = new Node(backupNode.x, backupNode.y);
			node.isAcceptState = backupNode.isAcceptState;
			node.text = backupNode.text;
			nodes.push(node);
		}
		for(var i = 0; i < backup.links.length; i++) {
			var backupLink = backup.links[i];
			var link = null;
			if(backupLink.type == 'SelfLink') {
				link = new SelfLink(nodes[backupLink.node]);
				link.anchorAngle = backupLink.anchorAngle;
				link.text = backupLink.text;
			} else if(backupLink.type == 'StartLink') {
				link = new StartLink(nodes[backupLink.node]);
				link.deltaX = backupLink.deltaX;
				link.deltaY = backupLink.deltaY;
				link.text = backupLink.text;
			} else if(backupLink.type == 'Link') {
				link = new Link(nodes[backupLink.nodeA], nodes[backupLink.nodeB]);
				link.parallelPart = backupLink.parallelPart;
				link.perpendicularPart = backupLink.perpendicularPart;
				link.text = backupLink.text;
				link.lineAngleAdjust = backupLink.lineAngleAdjust;
			}
			if(link != null) {
				links.push(link);
			}
		}
	} catch(e) {
		localStorage['fsm'] = '';
	}
}

function saveBackup() {
	if(!localStorage || !JSON) {
		return;
	}

	var backup = {
		'nodes': [],
		'links': [],
		'directed': directed,
	};
	for(var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var backupNode = {
			'x': node.x,
			'y': node.y,
			'text': node.text,
			'isAcceptState': node.isAcceptState,
		};
		backup.nodes.push(backupNode);
	}
	for(var i = 0; i < links.length; i++) {
		var link = links[i];
		var backupLink = null;
		if(link instanceof SelfLink) {
			backupLink = {
				'type': 'SelfLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'anchorAngle': link.anchorAngle,
			};
		} else if(link instanceof StartLink) {
			backupLink = {
				'type': 'StartLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'deltaX': link.deltaX,
				'deltaY': link.deltaY,
			};
		} else if(link instanceof Link) {
			backupLink = {
				'type': 'Link',
				'nodeA': nodes.indexOf(link.nodeA),
				'nodeB': nodes.indexOf(link.nodeB),
				'text': link.text,
				'lineAngleAdjust': link.lineAngleAdjust,
				'parallelPart': link.parallelPart,
				'perpendicularPart': link.perpendicularPart,
			};
		}
		if(backupLink != null) {
			backup.links.push(backupLink);
		}
	}

	localStorage['fsm'] = JSON.stringify(backup);
}
