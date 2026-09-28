import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'

import { login } from '../api/client.js'
import { BrandMark } from '@/components/brand-mark'
import { LanguageToggle } from '@/components/language-toggle'
import { ModeToggle } from '@/components/mode-toggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { BRAND_NAME } from '@/lib/brand'
import { useI18n } from '@/lib/i18n'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useI18n()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(false)
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <LanguageToggle />
        <ModeToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center font-medium">
          <BrandMark className="size-28" />
          <span className="text-lg text-balance">{BRAND_NAME}</span>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t('login.title')}</CardTitle>
            <CardDescription>{t('login.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="username">{t('login.username')}</FieldLabel>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    aria-invalid={error || undefined}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">{t('login.password')}</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={error || undefined}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                        aria-pressed={showPassword}
                        title={showPassword ? t('login.hidePassword') : t('login.showPassword')}>
                        {showPassword ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                {error && (
                  <Alert variant="destructive" role="alert">
                    <CircleAlert />
                    <AlertDescription>{t('login.error')}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <Button type="submit" disabled={loading}>
                    {loading && <Spinner />}
                    {loading ? t('login.submitting') : t('login.submit')}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <p className="px-6 text-center text-xs text-muted-foreground">{t('login.hint')}</p>
      </div>
    </div>
  )
}
