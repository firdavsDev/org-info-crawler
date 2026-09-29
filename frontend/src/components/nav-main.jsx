import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useI18n } from "@/lib/i18n"

export function NavMain({
  items,
  pathname,
  hash,
  label,
}) {
  const { t } = useI18n()
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url)
          return (
            <Collapsible
              key={`${item.url}-${isActive}`}
              asChild
              defaultOpen={isActive}>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isActive && !hash}>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90">
                        <ChevronRight />
                        <span className="sr-only">{t("nav.toggleSection", { title: item.title })}</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => subItem.label ? (
                          // A group label between sub-links, not a link itself
                          <li key={subItem.label} className="px-2 pt-2 pb-0.5 text-xs font-medium text-sidebar-foreground/70 first:pt-0.5">
                            {subItem.label}
                          </li>
                        ) : (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={`${pathname}${hash}` === subItem.url}>
                              <Link to={subItem.url}>
                                <span className="font-mono text-xs">{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
