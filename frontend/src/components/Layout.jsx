import { useEffect } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'

import { AppSidebar } from '@/components/app-sidebar'
import { LanguageToggle } from '@/components/language-toggle'
import { ModeToggle } from '@/components/mode-toggle'
import { RecentOrgsProvider } from '@/components/RecentOrgsProvider.jsx'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Kbd } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const TOGGLE_SHORTCUT = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘B' : 'Ctrl B'

function readSidebarCookie() {
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return match ? match[1] === 'true' : true
}

function CloseMobileSidebarOnNavigate() {
  const { setOpenMobile } = useSidebar()
  const location = useLocation()
  useEffect(() => {
    setOpenMobile(false)
  }, [location, setOpenMobile])
  return null
}

// Pages whose breadcrumb is just their own title.
const SECTION_TITLES = [
  ['/docs', 'nav.apiDocs'],
  ['/organizations', 'nav.organizations'],
]

function PageBreadcrumb() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const { t } = useI18n()
  const tin = searchParams.get('tin')

  const section = SECTION_TITLES.find(([prefix]) => pathname.startsWith(prefix))
  if (section) {
    return (
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{t(section[1])}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    )
  }

  return (
    <BreadcrumbList>
      <BreadcrumbItem>
        {tin ? (
          <BreadcrumbLink asChild>
            <Link to="/">{t('nav.orgLookup')}</Link>
          </BreadcrumbLink>
        ) : (
          <BreadcrumbPage>{t('nav.orgLookup')}</BreadcrumbPage>
        )}
      </BreadcrumbItem>
      {tin && (
        <>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono tabular-nums">{tin}</BreadcrumbPage>
          </BreadcrumbItem>
        </>
      )}
    </BreadcrumbList>
  )
}

export default function Layout() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  // The organizations table needs room for its columns; other pages keep a readable width.
  const wide = pathname.startsWith('/organizations')

  return (
    <RecentOrgsProvider>
      <SidebarProvider defaultOpen={readSidebarCookie()}>
        <CloseMobileSidebarOnNavigate />
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2 px-4 md:px-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger className="-ml-1" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t('nav.toggleSidebar')} <Kbd>{TOGGLE_SHORTCUT}</Kbd>
                </TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb className="min-w-0">
                <PageBreadcrumb />
              </Breadcrumb>
            </div>
            <div className="ml-auto flex items-center gap-1 px-4 md:px-6">
              <LanguageToggle />
              <ModeToggle />
            </div>
          </header>
          <main className="flex flex-1 flex-col px-4 pb-10 md:px-6">
            <div className={cn('mx-auto w-full', wide ? 'max-w-[96rem]' : 'max-w-5xl')}>
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RecentOrgsProvider>
  )
}
