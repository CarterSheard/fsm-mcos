const { det, circleFromThreePoints, fixed } = require('../../src/main/math');

describe('Math Utilities', () => {
  describe('det()', () => {
    test('calculates the determinant of a 3x3 matrix', () => {
      // Identity matrix: det should be 1
      expect(det(1, 0, 0, 0, 1, 0, 0, 0, 1)).toBe(1);
      
      // Zero matrix: det should be 0
      expect(det(0, 0, 0, 0, 0, 0, 0, 0, 0)).toBe(0);
      
      // Known matrix
      // | 1 2 3 |
      // | 4 5 6 |
      // | 7 8 9 |
      // det = 1(45-48) - 2(36-42) + 3(32-35) = -3 + 12 - 9 = 0
      expect(det(1, 2, 3, 4, 5, 6, 7, 8, 9)).toBe(0);
      
      // Another example
      // | 2 -3 1 |
      // | 2 0 -1 |
      // | 1 4 5 |
      // det = 2(0 - -4) - (-3)(10 - -1) + 1(8 - 0)
      //     = 2(4) + 3(11) + 8 = 8 + 33 + 8 = 49
      expect(det(2, -3, 1, 2, 0, -1, 1, 4, 5)).toBe(49);
    });
  });

  describe('circleFromThreePoints()', () => {
    test('calculates circle from three points', () => {
      // Points on a unit circle: (1,0), (0,1), (-1,0)
      const result = circleFromThreePoints(1, 0, 0, 1, -1, 0);
      
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
      expect(result.radius).toBeCloseTo(1);
    });

    test('calculates circle shifted from origin', () => {
      // Circle centered at (2,2) with radius 2
      // Points: (4,2), (2,4), (0,2)
      const result = circleFromThreePoints(4, 2, 2, 4, 0, 2);
      
      expect(result.x).toBeCloseTo(2);
      expect(result.y).toBeCloseTo(2);
      expect(result.radius).toBeCloseTo(2);
    });
  });
  
  describe('fixed()', () => {
    test('formats numbers correctly', () => {
        expect(fixed(1.23456, 2)).toBe('1.23');
        expect(fixed(1.2, 2)).toBe('1.2'); // Should not add trailing zeros
        expect(fixed(1.000, 2)).toBe('1');  // Should remove decimal point if integer
        expect(fixed(5, 2)).toBe('5');
    });
  });
});