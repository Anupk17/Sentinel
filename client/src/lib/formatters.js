export const formatUSD = (value) => {
  if (value === null || value === undefined) return '$—';
  if (value >= 1_000_000_000) return `$${(value/1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000)     return `$${(value/1_000_000).toFixed(2)}M`;
  if (value >= 1_000)         return `$${(value/1_000).toFixed(1)}k`;
  return `$${value.toFixed(2)}`;
};

export const formatBTC = (qty) => {
  if (qty === null || qty === undefined) return '0.0000 BTC';
  if (qty >= 1) return `${qty.toFixed(3)} BTC`;
  return `${qty.toFixed(4)} BTC`;
};

export const formatPrice = (price) => {
  if (price === null || price === undefined) return '0.00';
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
