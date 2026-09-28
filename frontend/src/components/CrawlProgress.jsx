import { Check, CircleX, SearchX } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const STAGE_LABEL_KEYS = {
  queued: 'crawl.stageQueued',
  processing: 'crawl.stageProcessing',
}

/**
 * Crawl pipeline: queued → processing → ready | failed | not_found.
 * `stage` is the live poll state ('queued' | 'processing' | 'done'); `outcome` is the result status.
 */
export default function CrawlProgress({ stage, outcome, progress, isPolling }) {
  const { t } = useI18n()
  const done = stage === 'done'
  const failed = done && outcome === 'failed'
  const notFound = done && outcome === 'not_found'

  const steps = [
    { key: 'queued', label: t('status.queued'), state: stage === 'queued' ? 'current' : 'complete' },
    {
      key: 'processing',
      label: t('status.processing'),
      state: stage === 'queued' ? 'upcoming' : stage === 'processing' ? 'current' : 'complete',
    },
    {
      key: 'final',
      label: done
        ? ['ready', 'failed', 'not_found'].includes(outcome) ? t(`status.${outcome}`) : t('crawl.finished')
        : t('status.ready'),
      state: done ? (failed ? 'failed' : notFound ? 'muted' : 'complete') : 'upcoming',
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex items-center gap-2 text-xs" aria-label={t('crawl.progress')}>
        {steps.map((step, i) => (
          <li key={step.key} className="flex min-w-0 items-center gap-2">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'h-px w-4 shrink-0 bg-border sm:w-8',
                  step.state !== 'upcoming' && 'bg-foreground/30'
                )}
              />
            )}
            <StepIcon state={step.state} />
            <span
              aria-current={step.state === 'current' ? 'step' : undefined}
              className={cn(
                'truncate font-medium',
                step.state === 'upcoming' && 'text-muted-foreground',
                step.state === 'failed' && 'text-destructive',
                step.state === 'muted' && 'text-muted-foreground'
              )}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className={cn('text-muted-foreground', failed && 'text-destructive')} aria-live="polite">
          {isPolling
            ? t(STAGE_LABEL_KEYS[stage] || 'crawl.processing')
            : failed
              ? t('crawl.stopped')
              : outcome === 'ready'
                ? t('crawl.complete')
                : t('crawl.finished')}
        </span>
        {!failed && <span className="font-mono text-xs font-medium tabular-nums">{Math.round(progress)}%</span>}
      </div>
      {!failed && <Progress
        value={progress}
        aria-label={t('crawl.progress')}
        className={cn(
          'h-1.5 bg-muted *:data-[slot=progress-indicator]:transition-[transform,background-color] *:data-[slot=progress-indicator]:duration-200',
          done && outcome === 'ready' && '*:data-[slot=progress-indicator]:bg-emerald-600 dark:*:data-[slot=progress-indicator]:bg-emerald-400',
          notFound && '*:data-[slot=progress-indicator]:bg-muted-foreground'
        )}
      />}
    </div>
  )
}

function StepIcon({ state }) {
  const { t } = useI18n()
  const base = 'flex size-5 shrink-0 items-center justify-center rounded-full border'
  if (state === 'current') {
    return (
      <span className={cn(base, 'border-foreground/20 bg-background')}>
        <Spinner className="size-3 motion-reduce:animate-none" aria-label={t('crawl.inProgress')} />
      </span>
    )
  }
  if (state === 'complete') {
    return (
      <span className={cn(base, 'border-transparent bg-foreground text-background')}>
        <Check className="size-3" strokeWidth={3} aria-hidden="true" />
      </span>
    )
  }
  if (state === 'failed') {
    return (
      <span className={cn(base, 'border-transparent bg-destructive text-white')}>
        <CircleX className="size-3" strokeWidth={2.5} aria-hidden="true" />
      </span>
    )
  }
  if (state === 'muted') {
    return (
      <span className={cn(base, 'border-transparent bg-muted text-muted-foreground')}>
        <SearchX className="size-3" strokeWidth={2.5} aria-hidden="true" />
      </span>
    )
  }
  return <span className={cn(base, 'border-dashed border-border')} aria-hidden="true" />
}
