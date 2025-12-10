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