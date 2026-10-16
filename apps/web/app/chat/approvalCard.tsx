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
        Approve this Kanban to finish the run, or reject it.
      </p>
      <div className={styles.actions}>
        <Button type="button" onClick={onApprove} loading={pending}>
          Approve
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
