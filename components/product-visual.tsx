import { Box } from "lucide-react";

export function ProductVisual({ tone, size = "medium" }: { tone: string; size?: "small" | "medium" | "large" }) {
  return (
    <span className={`product-visual tone-${tone} product-visual-${size}`} aria-hidden="true">
      <span className="product-shape"><Box strokeWidth={1.55} /></span>
    </span>
  );
}
