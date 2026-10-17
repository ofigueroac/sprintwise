'use client'

import { Button } from '@repo/ui/components'

import styles from './approvalCard.module.css'

export type ApprovalCardProps = {
  onApprove: () => void
  onReject: () => void
  pending?: boolean
}

export function ApprovalCard({
  onApprove,
  onReject,
  pending = false,
}: ApprovalCardProps) {
  return (
    <div
      className={styles.card}
      role="group"
      aria-label="Scope approval"
      aria-busy={pending || undefined}
    >
      <p className={styles.copy}>
        Move the stories you want into MVP, then approve. Only those stories are
        downloaded. Brainstorm and Icebox stay in the project.
      </p>
      <div className={styles.actions}>
        <Button type="button" onClick={onApprove} loading={pending}>
          Approve MVP
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onReject}
          loading={pending}
        >
          Reject
        </Button>
      </div>
    </div>
  )
}
