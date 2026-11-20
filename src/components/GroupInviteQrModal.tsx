import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { buildGroupInviteUrl } from '../lib/groups'

interface GroupInviteQrModalProps {
  groupName: string
  grade: number
  inviteCode: string
  scheduleNote?: string
  onClose: () => void
}

export default function GroupInviteQrModal({
  groupName,
  grade,
  inviteCode,
  scheduleNote,
  onClose,
}: GroupInviteQrModalProps) {
  const inviteUrl = buildGroupInviteUrl(inviteCode)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    QRCode.toDataURL(inviteUrl, {
      width: 260,
      margin: 2,
      color: { dark: '#1A1A2E', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url)
      })
      .catch(() => {
        if (active) setQrDataUrl('')
      })
    return () => {
      active = false
    }
  }, [inviteUrl])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard failures in restricted environments
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`QR Code for ${groupName}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
              Grade {grade}
            </span>
            <h2 className="mt-1 text-lg font-bold text-text">{groupName}</h2>
            {scheduleNote && (
              <p className="text-xs text-text-muted">{scheduleNote}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR modal"
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-text"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-border bg-white p-5">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`Invite QR code for ${groupName}`}
              className="h-56 w-56"
            />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-sm text-text-muted">
              Generating QR code...
            </div>
          )}
          <p className="mt-3 font-mono text-sm font-bold tracking-wider text-ink">
            {inviteCode}
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface-alt/50 p-2.5 text-xs text-text-muted break-all">
          {inviteUrl}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {copied ? 'Link Copied!' : 'Copy Invite Link'}
          </button>
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`math-mentor-grade${grade}-${inviteCode}.png`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:border-brand hover:text-brand"
            >
              Download PNG
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
