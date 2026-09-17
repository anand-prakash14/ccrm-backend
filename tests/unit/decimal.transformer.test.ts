// 3. Internal
import { decimalTransformer } from '@/entities/transformers/decimal.transformer';

describe('decimalTransformer', () => {
  describe('to (application -> DB)', () => {
    it('passes a number through unchanged', () => {
      expect(decimalTransformer.to(1234.5678)).toBe(1234.5678);
    });

    it('passes null through unchanged', () => {
      expect(decimalTransformer.to(null)).toBeNull();
    });

    it('passes undefined through unchanged', () => {
      expect(decimalTransformer.to(undefined)).toBeUndefined();
    });
  });

  describe('from (DB -> application)', () => {
    it('converts a numeric string to a number', () => {
      expect(decimalTransformer.from('1234.5678')).toBe(1234.5678);
    });

    it('converts null to null', () => {
      expect(decimalTransformer.from(null)).toBeNull();
    });

    it('converts undefined to null', () => {
      expect(decimalTransformer.from(undefined)).toBeNull();
    });

    it('preserves realistic DECIMAL(19,4) money values (e.g. a sale price)', () => {
      expect(decimalTransformer.from('4523000.5025')).toBe(4523000.5025);
    });
  });
});
