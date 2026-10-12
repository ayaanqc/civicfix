import { categorySvgBody } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { IssueCategory } from "@/lib/types";

interface CategoryIconProps {
  category: IssueCategory;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** Renders the same glyph set used by the Leaflet DivIcons. */
export function CategoryIcon({
  category,
  size = 16,
  strokeWidth = 2,
  className,
}: CategoryIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("shrink-0", className)}
      dangerouslySetInnerHTML={{ __html: categorySvgBody(category) }}
    />
  );
}
