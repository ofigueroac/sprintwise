import type { Story } from '@repo/schemas'

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function mvpStories(stories: Story[]) {
  return stories.filter((story) => story.status === 'mvp')
}

export function milestoneCsv(stories: Story[]) {
  const header = ['title', 'description']
  const rows = mvpStories(stories).map((story) =>
    [story.title, story.description].map(csvCell).join(',')
  )

  return [header.join(','), ...rows].join('\n')
}

export function milestoneMarkdown(stories: Story[]) {
  const lines = mvpStories(stories).map((story) => {
    const detail = story.description ? `\n  ${story.description}` : ''
    return `- **${story.title}**${detail}`
  })

  return ['# MVP', ...lines].join('\n\n')
}

function downloadText(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadMilestonePack(stories: Story[]) {
  const mvp = mvpStories(stories)
  downloadText('sprintwise-mvp.csv', milestoneCsv(mvp), 'text/csv')
  downloadText('sprintwise-mvp.md', milestoneMarkdown(mvp), 'text/markdown')
}
