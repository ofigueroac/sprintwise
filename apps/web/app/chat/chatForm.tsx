'use client'

import {
  useOptimistic,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
  type SubmitEvent,
} from 'react'

import { AGENT_STATUS, useAgentRun } from '@repo/agent-client'
import { RENDER_KANBAN_TOOL } from '@repo/schemas'
import {
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Skeleton,
  Textarea,
} from '@repo/ui/components'

import { createRunToken } from './actions'
import { ApprovalCard } from './approvalCard'
import { ChatBoard } from './chatBoard'
import { ChatTranscript } from './chatTranscript'
import { createResumeToken } from './resumeActions'
import styles from './chatForm.module.css'

const AGENTS_URL = process.env.NEXT_PUBLIC_AGENTS_URL ?? 'http://localhost:8787'
const IDEA_FIELD_ID = 'product-idea'

export function ChatForm() {
  const [idea, setIdea] = useState('')
  const [pending, setPending] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [optimisticIdea, addOptimisticIdea] = useOptimistic<string | null>(null)
  const { status, messages, tools, error, runId, start, resume } = useAgentRun()

  const trimmedIdea = idea.trim()
  const busy = pending || status === AGENT_STATUS.RUNNING
  const awaitingApproval = status === AGENT_STATUS.AWAITING_APPROVAL
  const boardReady = tools.some(
    (tool) => tool.name === RENDER_KANBAN_TOOL && tool.done
  )
  const assistantText = messages.at(-1)?.content ?? ''
  const banner = actionError ?? error?.message ?? null

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || awaitingApproval || trimmedIdea.length === 0) {
      return
    }

    setActionError(null)
    setPending(true)
    startTransition(() => {
      addOptimisticIdea(trimmedIdea)
    })

    try {
      const result = await createRunToken(trimmedIdea)
      if (!result.token) {
        setActionError(result.error ?? 'Could not start the run')
        return
      }

      setProjectId(result.projectId ?? null)

      await start({
        url: `${AGENTS_URL}/runs`,
        token: result.token,
        idea: trimmedIdea,
      })
    } finally {
      setPending(false)
    }
  }

  function onIdeaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends the idea Shift+Enter keeps a new line
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return
    }

    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  async function onDecision(approved: boolean) {
    // Mint a fresh 60s JWT then POST resume on the same run
    if (pending || !projectId || !runId) {
      return
    }

    setActionError(null)
    setPending(true)

    try {
      const result = await createResumeToken(projectId, runId)
      if (!result.token) {
        setActionError(result.error ?? 'Could not resume the run')
        return
      }

      await resume({
        url: `${AGENTS_URL}/runs/${result.runId}/resume`,
        token: result.token,
        approved,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.layout}>
      <div className={styles.chat}>
        <form className={styles.form} onSubmit={onSubmit}>
          <Field>
            <FieldLabel htmlFor={IDEA_FIELD_ID}>Product idea</FieldLabel>
            <Textarea
              id={IDEA_FIELD_ID}
              value={idea}
              disabled={busy || awaitingApproval}
              onChange={(event) => setIdea(event.target.value)}
              onKeyDown={onIdeaKeyDown}
              placeholder="Type your product idea here"
              required
            />
            <FieldDescription>
              Press Enter to ask the Analyst. Shift+Enter adds a new line.
            </FieldDescription>
          </Field>
          <Button
            type="submit"
            size="lg"
            loading={busy}
            disabled={trimmedIdea.length === 0 || awaitingApproval}
          >
            Ask the Analyst
          </Button>
        </form>

        {banner ? (
          <p className="text-destructive" role="alert">
            {banner}
          </p>
        ) : null}

        <ChatTranscript busy={busy} boardReady={boardReady}>
          <ReplyLog
            busy={busy}
            text={assistantText}
            userText={optimisticIdea}
          />
        </ChatTranscript>
      </div>

      <div className={styles.board}>
        {awaitingApproval && projectId && runId ? (
          <ApprovalCard
            pending={pending}
            onApprove={() => {
              void onDecision(true)
            }}
            onReject={() => {
              void onDecision(false)
            }}
          />
        ) : null}

        <ChatBoard
          projectId={projectId}
          tools={tools}
          status={status}
          disabled={busy}
        />
      </div>
    </div>
  )
}

function ReplyLog({
  busy,
  text,
  userText,
}: {
  busy: boolean
  text: string
  userText: string | null
}) {
  let body: ReactNode = 'The reply will stream here.'

  if (text || userText) {
    body = (
      <>
        {userText ? <p className={styles.userBubble}>{userText}</p> : null}
        {text ? <p className={styles.assistantBubble}>{text}</p> : null}
      </>
    )
  } else if (busy) {
    body = (
      <div className={styles.skeletonStack}>
        <Skeleton className={styles.skeletonLine} />
        <Skeleton className={styles.skeletonLine} />
        <Skeleton className={styles.skeletonLineShort} />
      </div>
    )
  }

  return (
    <div role="log" aria-live="polite" aria-busy={busy} className={styles.log}>
      {body}
    </div>
  )
}
