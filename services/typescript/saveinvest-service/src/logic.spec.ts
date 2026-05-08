import { InvestmentCalculator } from './calculator';

describe('SaveInvest Service - Logic Validation', () => {
  const calculator = new InvestmentCalculator();

  it('Interest Calculation - Should calculate compound interest correctly', () => {
    const principal = 100000; // 100k
    const rate = 12; // 12% per annum
    const tenor = 365; // 1 year

    const expectedReturn = 112000;
    const actualReturn = calculator.calculateMaturityValue(
      principal,
      rate,
      tenor,
    );

    expect(actualReturn).toBeCloseTo(expectedReturn, 0);
  });

  it('Minimum Investment - Should reject investments below threshold', () => {
    const minAmount = 5000;
    const userAmount = 1000;

    const isValid = calculator.validateMinAmount(userAmount, minAmount);
    expect(isValid).toBe(false);
  });

  it('Tenor Validation - Should reject negative or zero tenor', () => {
    expect(() => calculator.validateTenor(0)).toThrow(
      'Tenor must be greater than zero',
    );
    expect(() => calculator.validateTenor(-10)).toThrow(
      'Tenor must be greater than zero',
    );
  });
});
