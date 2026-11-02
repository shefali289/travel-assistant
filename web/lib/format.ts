export function formatPrice(amount: number, currency: string): string {
  return `${currency} ${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

export function formatBreakfast(included: boolean): string {
  return included ? "Breakfast included" : "Breakfast not included";
}
