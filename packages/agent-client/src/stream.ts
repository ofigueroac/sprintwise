import { AgUiEventSchema, type AgUiEvent } from '@repo/schemas'

// What the UI passes in so we can call the agent server
export type StreamAgentRunInput = {
  url: string
  token: string
  body: unknown
  signal?: AbortSignal
  onEvent: (event: AgUiEvent) => void
}

// Pull the JSON out of one SSE frame and turn it into a typed event
function parseSseBlock(block: string): AgUiEvent | null {
  // SSE data lives on lines that start with data
  const data = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n')

  // Skip keep-alives and empty frames
  if (!data) {
    return null
  }

  return AgUiEventSchema.parse(JSON.parse(data))
}

// POST JSON with the JWT then read the live event stream
export async function streamAgentRun({
  url,
  token,
  body,
  signal,
  onEvent,
}: StreamAgentRunInput) {
  // The real endpoint lives on the agent server we just call it from here
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Agent run failed (${response.status})`)
  }
  if (!response.body) {
    throw new Error('Agent run return no body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  // Leftover text waits here until a full frame arrives
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    // Frames are separated by a blank line
    const frames = buffer.split('\n\n')
    // The last piece may be incomplete so keep it for the next read
    buffer = done ? '' : (frames.pop() ?? '')

    for (const frame of frames) {
      const event = parseSseBlock(frame)
      if (event) {
        onEvent(event)
      }
    }
    if (done) {
      break
    }
  }
}
