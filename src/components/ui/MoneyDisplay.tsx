interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  showSign?: boolean; // Para mostrar + o - implícito
  className?: string;
}

export function MoneyDisplay({
  amount,
  currency = "ARS",
  showSign = false,
  className = "",
}: MoneyDisplayProps) {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  let prefix = "";
  if (showSign) {
    prefix = isNegative ? "- " : "+ ";
  } else if (isNegative) {
    prefix = "- ";
  }

  const textColor = showSign
    ? isNegative
      ? "text-red-600"
      : "text-emerald-600"
    : "";

  return (
    <span className={`font-medium tabular-nums ${textColor} ${className}`}>
      {prefix}{formatted}
    </span>
  );
}
