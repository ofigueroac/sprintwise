'use client';

import {
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SubmitEvent,
} from 'react';

import { AGENT_STATUS, useAgentRun } from '@repo/agent-client';
import {
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Skeleton,
  Textarea,
} from '@repo/ui/components';

import { createRunToken } from './actions';
import styles from './chatForm.module.css';

const AGENTS_URL =
  process.env.NEXT_PUBLIC_AGENTS_URL ?? 'http://localhost:8787';
const IDEA_FIELD_ID = 'product-idea';

export function ChatForm() {
  const [idea, setIdea] = useState('');
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { status, messages, error, start } = useAgentRun();

  const trimmedIdea = idea.trim();
  const busy = pending || status === AGENT_STATUS.RUNNING;
  const assistantText = messages.at(-1)?.content ?? '';
  const banner = actionError ?? error?.message ?? null;

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || trimmedIdea.length === 0) {
      return;
    }

    setActionError(null);
    setPending(true);

    try {
      const result = await createRunToken(trimmedIdea);
      if (!result.token) {
        setActionError(result.error ?? 'Could not start the run');
        return;
      }

      await start({
        url: `${AGENTS_URL}/runs`,
        token: result.token,
        idea: trimmedIdea,
      });
    } finally {
      setPending(false);
    }
  }

  function onIdeaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends the idea Shift+Enter keeps a new line
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className={styles.stack}>
      <form className={styles.form} onSubmit={onSubmit}>
        <Field>
          <FieldLabel htmlFor={IDEA_FIELD_ID}>Product idea</FieldLabel>
          <Textarea
            id={IDEA_FIELD_ID}
            value={idea}
            disabled={busy}
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
          disabled={trimmedIdea.length === 0}
        >
          Ask the Analyst
        </Button>
      </form>

      {banner ? (
        <p className="text-destructive" role="alert">
          {banner}
        </p>
      ) : null}

      <ReplyLog busy={busy} text={assistantText} />
    </div>
  );
}

function ReplyLog({ busy, text }: { busy: boolean; text: string }) {
  let body: ReactNode = 'The reply will stream here.';

  if (text) {
    body = text;
  } else if (busy) {
    body = (
      <div className={styles.skeletonStack}>
        <Skeleton className={styles.skeletonLine} />
        <Skeleton className={styles.skeletonLine} />
        <Skeleton className={styles.skeletonLineShort} />
      </div>
    );
  }

  return (
    <div role="log" aria-live="polite" aria-busy={busy} className={styles.log}>
      {body}
    </div>
  );
}
