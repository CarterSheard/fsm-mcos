const { ImportFromLaTeX } = require('../../src/import_from/latex');
const Node = require('../../src/elements/node');

// Mock dependencies
global.Node = Node;
// Mock Link/SelfLink/StartLink constructors since they aren't exported yet
global.Link = class Link { constructor(a, b) { this.nodeA = a; this.nodeB = b; } };
global.SelfLink = class SelfLink { constructor(node) { this.node = node; } };
global.StartLink = class StartLink { constructor(node) { this.node = node; } };

describe('LaTeX Import', () => {
  let importer;

  beforeEach(() => {
    importer = new ImportFromLaTeX();
  });

  describe('Parsing Logic', () => {
    test('parses \\draw circle command (Node)', () => {
      const line = '\\draw [black] (30,-30) circle (3);';
      importer._parseDrawCommand(line);
      
      expect(importer._circles.length).toBe(1);
      expect(importer._circles[0]).toEqual({
        x: 30,
        y: -30,
        radius: 3
      });
    });

    test('parses \\draw node text command', () => {
      const line = '\\draw (30,-30) node {$q_0$};';
      importer._parseDrawCommand(line);
      
      expect(importer._texts.length).toBe(1);
      expect(importer._texts[0].text).toBe('q_0');
      expect(importer._texts[0].x).toBe(30);
      expect(importer._texts[0].y).toBe(-30);
    });

    test('parses \\draw arc command', () => {
      const line = '\\draw [black] (32.68,-28.68) arc (144:-144:2.25);';
      importer._parseDrawCommand(line);
      
      expect(importer._arcs.length).toBe(1);
      expect(importer._arcs[0].radius).toBe(2.25);
      // 144 degrees is approx 2.51 rad
      expect(importer._arcs[0].startAngle).toBeCloseTo(2.51, 1);
    });

    test('cleans LaTeX text', () => {
      expect(importer._cleanText('\\mbox{ }')).toBe(' ');
      expect(importer._cleanText('q_0')).toBe('q_0');
      // Should keep backslashes for greek letters
      expect(importer._cleanText('\\beta')).toBe('\\beta');
    });
  });

  describe('Integration', () => {
    test('reconstructs simple FSM with one node', () => {
      const latex = `
        \\begin{tikzpicture}[scale=0.2]
        \\draw [black] (30,-30) circle (3);
        \\draw (30,-30) node {$A$};
        \\end{tikzpicture}
      `;
      
      importer.parse(latex);
      const result = importer.reconstructFSM();
      
      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].text).toBe('A');
      // Check coordinate transformation (scale=10, y is flipped)
      // Input (30, -30) -> Output (300, 300)
      expect(result.nodes[0].x).toBe(300);
      expect(result.nodes[0].y).toBe(300);
    });

    test('reconstructs accept state', () => {
      const latex = `
        \\begin{tikzpicture}[scale=0.2]
        \\draw [black] (30,-30) circle (3);
        \\draw [black] (30,-30) circle (2.4);
        \\end{tikzpicture}
      `;
      
      importer.parse(latex);
      const result = importer.reconstructFSM();
      
      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].isAcceptState).toBe(true);
    });
  });
});