export function formatPrice(amount: number, currency: string): string {
  return `${currency} ${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}
