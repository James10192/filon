export type MailPulseConnectionStatus = 'not_linked' | 'pending' | 'linked'
export type RecoveryChannel = 'email' | 'whatsapp'
export type RecoveryMode = 'manual' | 'semi_auto' | 'automatic'

export type MailPulseSettings = {
  mailpulsePromptOnWon?: boolean
  mailpulseConnectionStatus?: MailPulseConnectionStatus
  mailpulseAccountId?: string
  mailpulseWorkspaceId?: string
  recoveryReminderDelayDays?: number
  recoveryFallbackFollowupEnabled?: boolean
  recoveryPreferredChannels?: RecoveryChannel[]
  recoveryMode?: RecoveryMode
}

export const DEFAULT_RECOVERY_CHANNELS: RecoveryChannel[] = [
  'email',
  'whatsapp',
]

