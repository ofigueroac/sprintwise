'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@repo/ui/components'

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
    <AlertDialog
      open
      onOpenChange={(open) => {
        // Stay open until Approve or Reject finishes the run
        if (!open) {
          return
        }
      }}
    >
      <AlertDialogContent aria-busy={pending || undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve this scope</AlertDialogTitle>
          <AlertDialogDescription>
            Approve this Kanban to finish the run, or reject it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onApprove} disabled={pending}>
            Approve
          </AlertDialogAction>
          <Button
            type="button"
            variant="destructive"
            onClick={onReject}
            disabled={pending}
          >
            Reject
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
