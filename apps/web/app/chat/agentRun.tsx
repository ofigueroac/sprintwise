'use client'

import {
  createContext,
  useContext,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
  type SubmitEvent,
} from 'react'

import {
  AGENT_STATUS,
  useAgentRun,
  type AgentMessage,
  type AgentToolCall,
} from '@repo/agent-client'
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
import { MessageError } from './messageError'
import { createResumeToken, loadAwaitingRun } from './resumeActions'
import { RunErrorCard } from './runErrorCard'
import styles from './chatForm.module.css'

const AGENTS_URL = process.env.NEXT_PUBLIC_AGENTS_URL ?? 'http://localhost:8787'
const IDEA_FIELD_ID = 'product-idea'

export type AgentRunContextValue = {
  idea: string
  setIdea: (value: string) => void
  pending: boolean
  projectId: string | null
  runId: string | null
  status: AGENT_STATUS
  messages: AgentMessage[]
  tools: AgentToolCall[]
  error: { message: string; code?: string } | null
  actionError: string | null
  busy: boolean
  awaitingApproval: boolean
  boardReady: boolean
  optimisticIdea: string | null
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
  onIdeaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onApprove: () => void
  onReject: () => void
  onRetry: () => void
}

const AgentRunContext = createContext<AgentRunContextValue | null>(null)

function useAgentRunContext() {
  const value = useContext(AgentRunContext)
  if (!value) {
    throw new Error('AgentRun slots need an AgentRun parent')
  }
  return value
}

function AgentRunRoot({ children }: { children: ReactNode }) {
  const [idea, setIdea] = useState('')
  const [pending, setPending] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [optimisticIdea, addOptimisticIdea] = useOptimistic<string | null>(null)
  const { status, messages, tools, error, runId, start, resume, restore } =
    useAgentRun()

  const trimmedIdea = idea.trim()
  const busy = pending || status === AGENT_STATUS.RUNNING
  const awaitingApproval = status === AGENT_STATUS.AWAITING_APPROVAL
  const boardReady = tools.some(
    (tool) => tool.name === RENDER_KANBAN_TOOL && tool.done
  )

  useEffect(() => {
    let cancelled = false

    void loadAwaitingRun().then((result) => {
      if (cancelled || !result.projectId || !result.runId || !result.idea) {
        return
      }

      setProjectId(result.projectId)
      setIdea(result.idea)
      restore({
        threadId: result.projectId,
        runId: result.runId,
        messages: result.messages ?? [],
      })
    })

    return () => {
      cancelled = true
    }
  }, [restore])

  async function startIdea() {
    if (busy || trimmedIdea.length === 0) {
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

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (awaitingApproval) {
      return
    }

    void startIdea()
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

  const value: AgentRunContextValue = {
    idea,
    setIdea,
    pending,
    projectId,
    runId,
    status,
    messages,
    tools,
    error,
    actionError,
    busy,
    awaitingApproval,
    boardReady,
    optimisticIdea,
    onSubmit,
    onIdeaKeyDown,
    onApprove: () => {
      void onDecision(true)
    },
    onReject: () => {
      void onDecision(false)
    },
    onRetry: () => {
      void startIdea()
    },
  }

  return (
    <AgentRunContext.Provider value={value}>
      {children}
    </AgentRunContext.Provider>
  )
}

function Composer() {
  const {
    idea,
    setIdea,
    busy,
    awaitingApproval,
    actionError,
    onSubmit,
    onIdeaKeyDown,
  } = useAgentRunContext()

  return (
    <>
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
          disabled={idea.trim().length === 0 || awaitingApproval}
        >
          Ask the Analyst
        </Button>
      </form>

      {actionError ? (
        <p className="text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}
    </>
  )
}

function Messages() {
  const { busy, messages, optimisticIdea, idea, awaitingApproval } =
    useAgentRunContext()
  const userText = optimisticIdea ?? (awaitingApproval ? idea : null)
  let body: ReactNode = 'The reply will stream here.'

  if (messages.length > 0 || userText) {
    body = (
      <>
        {userText ? (
          <MessageError resetKeys={[userText]}>
            <p className={styles.userBubble}>{userText}</p>
          </MessageError>
        ) : null}
        {messages.map((message) => (
          <MessageError key={message.id} resetKeys={[message.id]}>
            <p className={styles.assistantBubble}>{message.content}</p>
          </MessageError>
        ))}
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

function Transcript({ children }: { children: ReactNode }) {
  const { busy, boardReady } = useAgentRunContext()

  return (
    <ChatTranscript busy={busy} boardReady={boardReady}>
      {children}
    </ChatTranscript>
  )
}

function Approval() {
  const { awaitingApproval, projectId, runId, pending, onApprove, onReject } =
    useAgentRunContext()

  if (!awaitingApproval || !projectId || !runId) {
    return null
  }

  return (
    <ApprovalCard pending={pending} onApprove={onApprove} onReject={onReject} />
  )
}

function Board() {
  const { projectId, tools, status, busy } = useAgentRunContext()

  return (
    <ChatBoard
      projectId={projectId}
      tools={tools}
      status={status}
      disabled={busy}
    />
  )
}

function Retry() {
  const { error, status, pending, onRetry } = useAgentRunContext()

  if (!error || status !== AGENT_STATUS.ERROR) {
    return null
  }

  return (
    <RunErrorCard
      message={error.message}
      code={error.code}
      onRetry={onRetry}
      pending={pending}
    />
  )
}

export const AgentRun = Object.assign(AgentRunRoot, {
  Composer,
  Messages,
  Transcript,
  Approval,
  Board,
  Retry,
})
