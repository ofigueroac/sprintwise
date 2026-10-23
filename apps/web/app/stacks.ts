export type Stack = {
  name: string
  src: string
  onDark?: boolean
}

export const stacks: Stack[] = [
  { name: 'Next.js', src: '/next.svg' },
  { name: 'React', src: '/react.svg' },
  {
    name: 'TypeScript',
    src: 'https://www.typescriptlang.org/icons/icon-512x512.png',
  },
  { name: 'Tailwind', src: '/tailwind.svg' },
  { name: 'shadcn', src: 'https://ui.shadcn.com/apple-touch-icon.png' },
  { name: 'Vitest', src: '/vitest-light.svg', onDark: true },
  {
    name: 'Playwright',
    src: 'https://playwright.dev/img/playwright-logo.svg',
  },
  { name: 'pnpm', src: 'https://pnpm.io/img/pnpm-no-name-with-frame.svg' },
  { name: 'Neon', src: 'https://neon.com/favicon/favicon.svg' },
  { name: 'Drizzle', src: 'https://orm.drizzle.team/svg/drizzle.svg' },
  {
    name: 'Postgres',
    src: 'https://www.postgresql.org/media/img/about/press/elephant.png',
  },
  {
    name: 'Gemini',
    src: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
  },
  {
    name: 'LangGraph',
    src: 'https://docs.langchain.com/images/brand/langgraph-icon.png',
  },
  { name: 'Hono', src: 'https://hono.dev/images/logo.svg' },
  { name: 'Zod', src: 'https://zod.dev/logo/logo.png' },
  {
    name: 'Turborepo',
    src: 'https://turbo.build/images/product-icons/repo-dark-32x32.png',
  },
]
