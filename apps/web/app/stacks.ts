export type Stack = {
  name: string
  src: string
  onDark?: boolean
}

export const stacks: Stack[] = [
  { name: 'Next.js', src: '/next.svg' },
  { name: 'React', src: '/react.svg' },
  { name: 'TypeScript', src: '/typescript.png' },
  { name: 'Tailwind', src: '/tailwind.svg' },
  { name: 'shadcn', src: '/shadcn.png' },
  { name: 'Vitest', src: '/vitest-light.svg', onDark: true },
  { name: 'Playwright', src: '/playwright.svg' },
  { name: 'pnpm', src: '/pnpm.svg' },
  { name: 'Neon', src: '/neon.svg' },
  { name: 'Drizzle', src: '/drizzle.svg' },
  { name: 'Postgres', src: '/postgres.png' },
  { name: 'Gemini', src: '/gemini.svg' },
  { name: 'LangGraph', src: '/langgraph.png' },
  { name: 'Hono', src: '/hono.svg' },
  { name: 'Zod', src: '/zod.png' },
  { name: 'Turborepo', src: '/turborepo.png' },
]
