'use client'

import { AgentRun } from './agentRun'
import styles from './chatForm.module.css'

export function ChatForm() {
  return (
    <AgentRun>
      <div className={styles.layout}>
        <div className={styles.chat}>
          <AgentRun.Composer />
          <AgentRun.Retry />
          <AgentRun.Transcript>
            <AgentRun.Messages />
          </AgentRun.Transcript>
        </div>
        <div className={styles.board}>
          <AgentRun.Approval />
          <AgentRun.Board />
        </div>
      </div>
    </AgentRun>
  )
}
