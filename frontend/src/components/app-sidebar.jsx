import { Link, useLocation } from "react-router-dom"
import { BookOpen, Building, Globe, ScanSearch, SquareTerminal } from "lucide-react"

import { BrandMark } from "@/components/brand-mark"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { getUsername } from "@/api/client.js"
import { BRAND_NAME } from "@/lib/brand"
import { useI18n } from "@/lib/i18n"
import { ORGINFO_URL, SWAGGER_URL } from "@/lib/links.js"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navSecondary = [
  { title: "Swagger UI", url: SWAGGER_URL, icon: SquareTerminal },
  { title: "orginfo.uz", url: ORGINFO_URL, icon: Globe },
]

export function AppSidebar({
  ...props
}) {
  const { pathname, hash } = useLocation()
  const { t } = useI18n()

  const navMain = [
    {
      title: t("nav.orgLookup"),
      url: "/",
      icon: ScanSearch,
    },
    {
      title: t("nav.organizations"),
      url: "/organizations",
      icon: Building,
    },
    {
      title: t("nav.apiDocs"),
      url: "/docs",
      icon: BookOpen,
      items: [
        { title: "GET /org/{tin}", url: "/docs#get-org" },
        { title: "GET /org/{tin}/status", url: "/docs#get-org-status" },
        { title: "GET /orgs", url: "/docs#get-orgs" },
        { title: "GET /auth/me", url: "/docs#get-auth-me" },
      ],
    },
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-auto min-h-14 gap-3">
              <Link to="/">
                <BrandMark className="size-12" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="font-medium text-balance">{BRAND_NAME}</span>
                  <span className="truncate text-xs text-muted-foreground">{t("app.tagline")}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} pathname={pathname} hash={hash} label={t("nav.workspace")} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser username={getUsername()} />
      </SidebarFooter>
    </Sidebar>
  );
}
