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