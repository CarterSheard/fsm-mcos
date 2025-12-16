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

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Node;
}

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
			// Find the fill (arrow) associated with this arc to determine direction
			// The fill's first point should be at the arrow tip (arc end)
			var nearestFill = null;
			var nearestFillDist = Infinity;
			
			for (var j = 0; j < this._fills.length; j++) {
				if (this._fills[j]._assigned) continue;
				var fillFirstPoint = this._transformCoord(this._fills[j].points[0].x, this._fills[j].points[0].y);
				
				// Check distance to arc end position
				var distToEnd = Math.sqrt(Math.pow(fillFirstPoint.x - endPos.x, 2) + Math.pow(fillFirstPoint.y - endPos.y, 2));
				var distToStart = Math.sqrt(Math.pow(fillFirstPoint.x - startPos.x, 2) + Math.pow(fillFirstPoint.y - startPos.y, 2));
				
				// The fill should be closer to one end of the arc
				if (distToEnd < 20 || distToStart < 20) {
					var minDist = Math.min(distToEnd, distToStart);
					if (minDist < nearestFillDist) {
						nearestFillDist = minDist;
						nearestFill = { fill: this._fills[j], atStart: distToStart < distToEnd };
					}
				}
			}
			
			// Determine correct node order based on where the arrow is
			var nodeA, nodeB;
			if (nearestFill && nearestFill.atStart) {
				// Arrow is at start of arc, so arc goes from end to start
				nodeA = arcEndNode.node;
				nodeB = arcStartNode.node;
			} else {
				// Arrow is at end of arc (normal case), or no fill found
				nodeA = arcStartNode.node;
				nodeB = arcEndNode.node;
			}
			
			// Create link from nodeA to nodeB
			var link = new Link(nodeA, nodeB);
			link.text = '';
			link.lineAngleAdjust = 0;
			
			// Calculate the arc midpoint (a point ON the arc at the middle angle)
			// This is different from the arc center!
			var midAngle = (arc.startAngle + arc.endAngle) / 2;
			var arcMidX = arc.centerX + arc.radius * Math.cos(midAngle);
			var arcMidY = arc.centerY + arc.radius * Math.sin(midAngle);
			var arcMidPos = this._transformCoord(arcMidX, arcMidY);
			
			// Calculate perpendicular distance from the line to the arc midpoint
			var dx = nodeB.x - nodeA.x;  // nodeB - nodeA
			var dy = nodeB.y - nodeA.y;
			var length = Math.sqrt(dx * dx + dy * dy);
			
			if (length > 0) {
				link.parallelPart = 0.5;
				// Perpendicular part uses the arc midpoint (which lies on the arc)
				// as the anchor point reference
				link.perpendicularPart = (dx * (arcMidPos.y - nodeA.y) - dy * (arcMidPos.x - nodeA.x)) / length;
			}
			
			result.links.push(link);
			arc._assigned = true;
			arc._linkIndex = result.links.length - 1;
			
			// Mark the fill as assigned
			if (nearestFill) {
				nearestFill.fill._assigned = true;
			}
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
		// If it's a curved link (has perpendicular part), calculate arc midpoint
		if (link.perpendicularPart !== 0) {
			var anchor = link.getAnchorPoint();
			var circle = circleFromThreePoints(link.nodeA.x, link.nodeA.y, link.nodeB.x, link.nodeB.y, anchor.x, anchor.y);
			var isReversed = (link.perpendicularPart > 0);
			var reverseScale = isReversed ? 1 : -1;
			var startAngle = Math.atan2(link.nodeA.y - circle.y, link.nodeA.x - circle.x) - reverseScale * nodeRadius / circle.radius;
			var endAngle = Math.atan2(link.nodeB.y - circle.y, link.nodeB.x - circle.x) + reverseScale * nodeRadius / circle.radius;
			
			if (isReversed) {
				var temp = startAngle;
				startAngle = endAngle;
				endAngle = temp;
			}
			
			if (endAngle < startAngle) {
				endAngle += Math.PI * 2;
			}
			
			var midAngle = (startAngle + endAngle) / 2;
			return {
				x: circle.x + circle.radius * Math.cos(midAngle),
				y: circle.y + circle.radius * Math.sin(midAngle)
			};
		} else {
			// Straight line midpoint
			return {
				x: (link.nodeA.x + link.nodeB.x) / 2,
				y: (link.nodeA.y + link.nodeB.y) / 2
			};
		}
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

if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		ImportFromLaTeX: ImportFromLaTeX,
		importFromLaTeX: importFromLaTeX
	};
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

	// Draw simulation overlay (input string display) first
	if (simulationActive && currentSimulation && typeof drawSimulationOverlay === 'function') {
		drawSimulationOverlay(c);
	}

	for(var i = 0; i < nodes.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = (nodes[i] == selectedObject) ? 'blue' : 'black';
		
		// Check for simulation highlight
		var simHighlighted = false;
		if (simulationActive && currentSimulation && typeof drawNodeWithSimulation === 'function') {
			simHighlighted = drawNodeWithSimulation(c, nodes[i], i, nodes[i] == selectedObject);
		}
		
		if (!simHighlighted) {
			nodes[i].draw(c);
		}
	}
	for(var i = 0; i < links.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = (links[i] == selectedObject) ? 'blue' : 'black';
		
		// Check for simulation highlight
		var simHighlighted = false;
		if (simulationActive && currentSimulation && typeof drawLinkWithSimulation === 'function') {
			simHighlighted = drawLinkWithSimulation(c, links[i], links[i] == selectedObject);
		}
		
		if (!simHighlighted) {
			links[i].draw(c);
		}
	}
	if(currentLink != null) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = 'black';
		currentLink.draw(c);
	}

	// Draw result banner if simulation is complete
	if (simulationActive && currentSimulation && typeof drawResultBanner === 'function') {
		drawResultBanner(c, canvas.width, canvas.height);
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

if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		det: det,
		circleFromThreePoints: circleFromThreePoints,
		fixed: fixed
	};
}

function loadDFA() {
	var dfaLatex = `\\begin{center}
\\begin{tikzpicture}[scale=0.2]
\\tikzstyle{every node}+=[inner sep=0pt]
\\draw [black] (22.9,-33.2) circle (3);
\\draw (22.9,-33.2) node {$S$};
\\draw [black] (22.9,-33.2) circle (2.4);
\\draw [black] (39.1,-33.2) circle (3);
\\draw (39.1,-33.2) node {$A$};
\\draw [black] (56.2,-32.6) circle (3);
\\draw (56.2,-32.6) node {$B$};
\\draw [black] (24.746,-35.55) arc (65.88562:-222.11438:2.25);
\\draw (24.89,-40.39) node [below] {$0$};
\\fill [black] (22.16,-36.09) -- (21.37,-36.62) -- (22.29,-37.03);
\\draw [black] (53.2,-32.71) -- (42.1,-33.09);
\\fill [black] (42.1,-33.09) -- (42.92,-33.57) -- (42.88,-32.57);
\\draw (47.62,-32.37) node [above] {$1$};
\\draw [black] (55.297,-35.445) arc (-27.51778:-148.46311:8.68);
\\fill [black] (55.3,-35.45) -- (54.48,-35.92) -- (55.37,-36.39);
\\draw (47.93,-40.64) node [below] {$0$};
\\draw [black] (40.776,-30.727) arc (136.93615:47.08296:9.619);
\\fill [black] (40.78,-30.73) -- (41.69,-30.48) -- (40.96,-29.8);
\\draw (47.44,-27.15) node [above] {$0$};
\\draw [black] (36.417,-34.531) arc (-69.23342:-110.76658:15.278);
\\fill [black] (36.42,-34.53) -- (35.49,-34.35) -- (35.85,-35.28);
\\draw (31,-36.02) node [below] {$1$};
\\draw [black] (25.721,-32.187) arc (105.43088:74.56912:19.842);
\\fill [black] (25.72,-32.19) -- (26.62,-32.46) -- (26.36,-31.49);
\\draw (31,-30.97) node [above] {$1$};
\\draw [black] (16.6,-17.5) -- (21.78,-30.42);
\\fill [black] (21.78,-30.42) -- (21.95,-29.49) -- (21.02,-29.86);
\\end{tikzpicture}
\\end{center}`;

	try {
		var result = importFromLaTeX(dfaLatex);
		
		// Clear existing canvas
		nodes = [];
		links = [];
		selectedObject = null;
		
		// Populate with imported data
		nodes = result.nodes;
		links = result.links;
		
		// Ensure directed is on
		directed = true;
		var checkbox = document.getElementById('directedLinksCheckbox');
		if (checkbox) checkbox.checked = true;

		// Redraw and save
		draw();
		saveBackup();
	} catch (e) {
		alert('Error loading DFA preset: ' + e.message);
	}
}

function loadMSTExample() {
	var mstLatex = `\\begin{center}
\\begin{tikzpicture}[scale=0.2]
\\tikzstyle{every node}+=[inner sep=0pt]
\\draw [black] (19.9,-14.1) circle (3);
\\draw (19.9,-14.1) node {$A$};
\\draw [black] (36.3,-4.4) circle (3);
\\draw (36.3,-4.4) node {$B$};
\\draw [black] (61.2,-8.4) circle (3);
\\draw (61.2,-8.4) node {$C$};
\\draw [black] (9.4,-29.3) circle (3);
\\draw (9.4,-29.3) node {$D$};
\\draw [black] (21,-45.8) circle (3);
\\draw (21,-45.8) node {$E$};
\\draw [black] (60.2,-45.1) circle (3);
\\draw (60.2,-45.1) node {$F$};
\\draw [black] (67.7,-28.2) circle (3);
\\draw (67.7,-28.2) node {$G$};
\\draw [black] (59.566,-10.916) arc (-33.79569:-60.33727:106.92);
\\draw (44.56,-30.21) node [below] {$2$};
\\draw [black] (65.31,-26.39) -- (38.69,-6.21);
\\draw (53,-15.8) node [above] {$3$};
\\draw [black] (58.458,-9.617) arc (-67.28974:-96.99425:70.08);
\\draw (41.31,-14.99) node [below] {$4$};
\\draw [black] (65.312,-30.016) arc (-53.79331:-84.90648:82.324);
\\draw (46.65,-41.15) node [below] {$6$};
\\draw [black] (61.42,-42.36) -- (66.48,-30.94);
\\draw (64.68,-37.64) node [right] {$7$};
\\draw [black] (24,-45.75) -- (57.2,-45.15);
\\draw (40.61,-45.97) node [below] {$8$};
\\draw [black] (66.76,-25.35) -- (62.14,-11.25);
\\draw (65.22,-17.61) node [right] {$9$};
\\draw [black] (11.11,-26.83) -- (18.19,-16.57);
\\draw (15.25,-23.06) node [right] {$2$};
\\draw [black] (20,-17.1) -- (20.9,-42.8);
\\draw (19.9,-29.96) node [left] {$1$};
\\draw [black] (11.13,-31.75) -- (19.27,-43.35);
\\draw (14.61,-38.92) node [left] {$3$};
\\draw [black] (22.48,-12.57) -- (33.72,-5.93);
\\draw (29.1,-9.75) node [below] {$4$};
\\draw [black] (39.26,-4.88) -- (58.24,-7.92);
\\draw (48.34,-6.99) node [below] {$6$};
\\end{tikzpicture}
\\end{center}`;

	try {
		var result = importFromLaTeX(mstLatex);
		
		// Clear existing canvas
		nodes = [];
		links = [];
		selectedObject = null;
		
		// Populate with imported data
		nodes = result.nodes;
		links = result.links;
		
		// Ensure directed is off for MST example usually, but let's keep it consistent or as needed.
		// The example looks like an undirected graph (lines instead of arrows in tikz, though importFromLaTeX handles arrows).
		// The TikZ code uses \draw without ->, so it's undirected.
		directed = false;
		var checkbox = document.getElementById('directedLinksCheckbox');
		if (checkbox) checkbox.checked = false;

		// Redraw and save
		draw();
		saveBackup();
	} catch (e) {
		alert('Error loading MST preset: ' + e.message);
	}
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