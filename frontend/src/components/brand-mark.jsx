import { Building2 } from "lucide-react"

import { BRAND_LOGO, BRAND_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

export function BrandMark({ className }) {
  if (BRAND_LOGO) {
    return (
      <img
        src={BRAND_LOGO}
        alt=""
        aria-hidden="true"
        className={cn("aspect-square size-8 shrink-0 rounded-full bg-white object-cover ring-1 ring-black/5", className)}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      title={BRAND_NAME}
      className={cn("flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground", className)}>
      <Building2 className="size-4" />
    </div>
  )
}
