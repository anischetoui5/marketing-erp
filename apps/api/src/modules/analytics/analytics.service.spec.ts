import { calcKpis } from './analytics.service';

describe('calcKpis', () => {
  it('calculates all KPIs with valid data', () => {
    const result = calcKpis(10000, 500, 250, 25, 1000);
    expect(result.ctr).toBeCloseTo(5);      // 500/10000 * 100
    expect(result.cpc).toBeCloseTo(0.5);    // 250/500
    expect(result.cpa).toBeCloseTo(10);     // 250/25
    expect(result.roas).toBeCloseTo(4);     // 1000/250
    expect(result.cpm).toBeCloseTo(25);     // 250/10000 * 1000
  });

  it('returns null ctr when impressions is zero', () => {
    const result = calcKpis(0, 0, 100, 5, 200);
    expect(result.ctr).toBeNull();
    expect(result.cpm).toBeNull();
  });

  it('returns null cpc when clicks is zero', () => {
    const result = calcKpis(1000, 0, 100, 5, 200);
    expect(result.cpc).toBeNull();
  });

  it('returns null cpa when conversions is zero', () => {
    const result = calcKpis(1000, 50, 100, 0, 0);
    expect(result.cpa).toBeNull();
  });

  it('returns null roas when spend is zero', () => {
    const result = calcKpis(1000, 50, 0, 5, 200);
    expect(result.roas).toBeNull();
  });

  it('handles all zeros without throwing', () => {
    expect(() => calcKpis(0, 0, 0, 0, 0)).not.toThrow();
    const result = calcKpis(0, 0, 0, 0, 0);
    expect(result.ctr).toBeNull();
    expect(result.cpc).toBeNull();
    expect(result.cpa).toBeNull();
    expect(result.roas).toBeNull();
    expect(result.cpm).toBeNull();
  });

  it('handles high-volume numbers correctly', () => {
    const result = calcKpis(10_000_000, 500_000, 50_000, 5000, 250_000);
    expect(result.ctr).toBeCloseTo(5);
    expect(result.roas).toBeCloseTo(5);
  });
});
