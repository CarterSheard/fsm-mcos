const Node = require('../../src/elements/node');

// Mock global variables expected by Node class
global.nodeRadius = 30;
global.selectedObject = null;
global.drawText = jest.fn();

describe('Node Element', () => {
  let node;

  beforeEach(() => {
    node = new Node(100, 100);
  });

  test('initializes with correct values', () => {
    expect(node.x).toBe(100);
    expect(node.y).toBe(100);
    expect(node.mouseOffsetX).toBe(0);
    expect(node.mouseOffsetY).toBe(0);
    expect(node.isAcceptState).toBe(false);
    expect(node.text).toBe('');
  });

  describe('containsPoint()', () => {
    test('returns true for point inside node', () => {
      expect(node.containsPoint(100, 100)).toBe(true); // Center
      expect(node.containsPoint(110, 110)).toBe(true); // Inside
    });

    test('returns false for point outside node', () => {
      expect(node.containsPoint(200, 200)).toBe(false);
      expect(node.containsPoint(131, 100)).toBe(false); // Just outside radius (30)
    });
  });

  describe('closestPointOnCircle()', () => {
    test('returns point on circumference for point outside', () => {
      // Point at (200, 100) - directly to the right
      // Expected: (130, 100)
      const point = node.closestPointOnCircle(200, 100);
      expect(point.x).toBeCloseTo(130);
      expect(point.y).toBeCloseTo(100);
    });

    test('returns point on circumference for point inside', () => {
      // Point at (101, 100) - slightly right
      // Expected: (130, 100) - projected to circumference
      const point = node.closestPointOnCircle(101, 100);
      expect(point.x).toBeCloseTo(130);
      expect(point.y).toBeCloseTo(100);
    });
  });

  describe('Mouse Interaction', () => {
    test('setMouseStart calculates offset correctly', () => {
      // Mouse at (90, 90), Node at (100, 100)
      // Offset should be (10, 10)
      node.setMouseStart(90, 90);
      expect(node.mouseOffsetX).toBe(10);
      expect(node.mouseOffsetY).toBe(10);
    });

    test('setAnchorPoint moves node respecting offset', () => {
      node.setMouseStart(90, 90); // Offset is (10, 10)
      
      // Move mouse to (150, 150)
      // Node should move to (160, 160)
      node.setAnchorPoint(150, 150);
      expect(node.x).toBe(160);
      expect(node.y).toBe(160);
    });
  });
});