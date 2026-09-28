import { CircleCheck, CircleX, Clock, LoaderCircle, SearchX } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const STATUS = {
  queued: {
    icon: Clock,
    className: 'border-sky-600/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  processing: {
    icon: LoaderCircle,
    spin: true,
    className: 'border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  ready: {
    icon: CircleCheck,
    className: 'border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  failed: {
    icon: CircleX,
    className: 'border-destructive/25 bg-destructive/10 text-destructive',
  },
  not_found: {
    icon: SearchX,
    className: 'border-border bg-muted text-muted-foreground',
  },
}

export default function StatusBadge({ status, className }) {
  const { t } = useI18n()
  const s = STATUS[status] || STATUS.not_found
  const Icon = s.icon
  return (
    <Badge variant="outline" className={cn(s.className, className)}>
      <Icon className={cn(s.spin && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
      {STATUS[status] ? t(`status.${status}`) : status}
    </Badge>
  )
}
