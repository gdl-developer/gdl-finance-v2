export class InvestmentCalculator {
  calculateMaturityValue(
    principal: number,
    rate: number,
    tenor: number,
  ): number {
    // Simple interest calculation: P + (P * R * T / 365)
    return principal + principal * (rate / 100) * (tenor / 365);
  }

  validateMinAmount(amount: number, min: number): boolean {
    return amount >= min;
  }

  validateTenor(tenor: number): void {
    if (tenor <= 0) {
      throw new Error('Tenor must be greater than zero');
    }
  }
}
