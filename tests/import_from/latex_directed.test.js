const { ImportFromLaTeX, importFromLaTeX } = require('../../src/import_from/latex');
const Node = require('../../src/elements/node');
const { circleFromThreePoints } = require('../../src/main/math');

// Mock dependencies
global.Node = Node;
global.nodeRadius = 30;
global.circleFromThreePoints = circleFromThreePoints;

global.Link = class Link { 
  constructor(a, b) { 
    this.nodeA = a; 
    this.nodeB = b;
    this.parallelPart = 0.5;
    this.perpendicularPart = 0;
  } 
  
  getAnchorPoint() {
    var dx = this.nodeB.x - this.nodeA.x;
    var dy = this.nodeB.y - this.nodeA.y;
    var scale = Math.sqrt(dx * dx + dy * dy);
    return {
        'x': this.nodeA.x + dx * this.parallelPart - dy * this.perpendicularPart / scale,
        'y': this.nodeA.y + dy * this.parallelPart + dx * this.perpendicularPart / scale
    };
  }
};
global.SelfLink = class SelfLink { constructor(node) { this.node = node; } };
global.StartLink = class StartLink { constructor(node) { this.node = node; } };

describe('LaTeX Import Directed Detection', () => {
  
  test('detects directed graph from user example', () => {
    const latex = `
\\begin{center}
\\begin{tikzpicture}[scale=0.2]
\\tikzstyle{every node}+=[inner sep=0pt]
\\draw [black] (22.9,-33.2) circle (3);
\\draw (22.9,-33.2) node {$S$};
\\draw [black] (22.9,-33.2) circle (2.4);
\\draw [black] (39.1,-33.2) circle (3);
\\draw (39.1,-33.2) node {$A$};
\\draw [black] (56.2,-32.6) circle (3);
\\draw (56.2,-32.6) node {$B$};
\\draw [black] (24.746,-35.55) arc (65.88389:-222.11611:2.25);
\\draw (24.89,-40.39) node [below] {$0$};
\\fill [black] (22.16,-36.09) -- (21.37,-36.62) -- (22.29,-37.03);
\\draw [black] (53.2,-32.71) -- (42.1,-33.09);
\\fill [black] (42.1,-33.09) -- (42.92,-33.57) -- (42.88,-32.57);
\\draw (47.62,-32.37) node [above] {$1$};
\\draw [black] (16.6,-17.5) -- (21.78,-30.42);
\\fill [black] (21.78,-30.42) -- (21.95,-29.49) -- (21.02,-29.86);
\\draw [black] (55.297,-35.445) arc (-27.51892:-148.46197:8.68);
\\fill [black] (55.3,-35.45) -- (54.48,-35.92) -- (55.37,-36.39);
\\draw (47.93,-40.64) node [below] {$0$};
\\draw [black] (40.777,-30.727) arc (136.93253:47.08657:9.62);
\\fill [black] (40.78,-30.73) -- (41.69,-30.48) -- (40.96,-29.8);
\\draw (47.44,-27.15) node [above] {$0$};
\\draw [black] (36.417,-34.531) arc (-69.23862:-110.76138:15.281);
\\fill [black] (36.42,-34.53) -- (35.49,-34.35) -- (35.85,-35.28);
\\draw (31,-36.02) node [below] {$1$};
\\draw [black] (25.721,-32.187) arc (105.42595:74.57405:19.847);
\\fill [black] (25.72,-32.19) -- (26.62,-32.46) -- (26.36,-31.49);
\\draw (31,-30.97) node [above] {$1$};
\\end{tikzpicture}
\\end{center}`;

    const result = importFromLaTeX(latex);
    expect(result.isDirected).toBe(true);
  });

  test('detects undirected graph from user example', () => {
    const latex = `
\\begin{center}
\\begin{tikzpicture}[scale=0.2]
\\tikzstyle{every node}+=[inner sep=0pt]
\\draw [black] (22.9,-33.2) circle (3);
\\draw (22.9,-33.2) node {$S$};
\\draw [black] (22.9,-33.2) circle (2.4);
\\draw [black] (39.1,-33.2) circle (3);
\\draw (39.1,-33.2) node {$A$};
\\draw [black] (56.2,-32.6) circle (3);
\\draw (56.2,-32.6) node {$B$};
\\draw [black] (24.746,-35.55) arc (65.88439:-222.11561:2.25);
\\draw (24.89,-40.39) node [below] {$0$};
\\draw [black] (53.2,-32.71) -- (42.1,-33.09);
\\draw (47.62,-32.37) node [above] {$1$};
\\draw [black] (16.6,-17.5) -- (21.78,-30.42);
\\draw [black] (55.297,-35.445) arc (-27.51836:-148.46253:8.68);
\\draw (47.93,-40.64) node [below] {$0$};
\\draw [black] (40.777,-30.727) arc (136.93325:47.08586:9.62);
\\draw (47.44,-27.15) node [above] {$0$};
\\draw [black] (36.417,-34.531) arc (-69.23687:-110.76313:15.28);
\\draw (31,-36.02) node [below] {$1$};
\\draw [black] (25.721,-32.187) arc (105.42747:74.57253:19.846);
\\draw (31,-30.97) node [above] {$1$};
\\end{tikzpicture}
\\end{center}`;

    const result = importFromLaTeX(latex);
    expect(result.isDirected).toBe(false);
  });

});