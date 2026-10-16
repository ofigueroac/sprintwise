import { AIMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'

import { RENDER_KANBAN_TOOL } from '@repo/schemas'

const FAKE_REPLY = `## Target Audience
- **Busy Working Parents:** Households with young children needing ad-hoc, trusted local help for childcare, pet walking, or light chores on short notice.
- **Independent Local Service Providers:** Reliable individuals (students, retirees, gig workers) looking to fill schedule gaps with local, flexible casual gigs without platform fees eating their margins.

## Core Problem
Homeowners and parents struggle to find reliable, vetted help for ad-hoc neighborhood tasks (babysitting, lawn mowing, minor repairs) without paying excessive agency fees or wading through spammy classifieds. Existing platforms either specialize in only one category or cater to large corporate jobs, making small, casual local gigs inefficient to book and coordinate.

## Riskiest Assumptions
- **Trust Assumption:** Users will trust strangers from a platform inside their homes for personal services like nannying or pet care without rigorous, enterprise-grade background checks.
- **Frequency Assumption:** The demand for casual services is frequent enough to keep providers engaged, rather than users just finding one provider and taking them off-platform immediately.
- **Supply Density Assumption:** We can acquire enough multi-talented local providers in a tight geographic radius to fulfill requests within 24–48 hours.
- **Economics Assumption:** A transaction or subscription model can sustain operations while remaining cheaper than existing local word-of-mouth networks.

## Proposed v1
- **In scope:** A lightweight web or mobile interface allowing users to post a single job request across multiple categories (Handyman, Pet Walker, Nanny, Lawn Care) to a curated local pool of providers, with basic in-app messaging and manual matching.
- **Later:** Automated algorithmic dispatch, background check integrations, and in-app escrow payment processing.`

const FAKE_STORIES = {
  columns: ['To Test', 'Building', 'Validated'],
  cards: [
    {
      title: 'Interview five working parents',
      description:
        'Ask whether they would book a stranger from a local pool for childcare or pet care on short notice.',
      milestone_category: 'Validation',
      status: 'To Test',
    },
    {
      title: 'Recruit providers in one neighborhood',
      description:
        'See if students, retirees, and gig workers will join a curated pool for casual local jobs.',
      milestone_category: 'Marketing',
      status: 'To Test',
    },
    {
      title: 'Manually match ten job requests',
      description:
        'Post real requests across handyman, pet walking, nannying, and lawn care and record whether someone accepts within 48 hours.',
      milestone_category: 'Execution',
      status: 'Building',
    },
    {
      title: 'Check repeat bookings after the first match',
      description:
        'Ask households who already found help whether they would book again on the platform instead of going off-platform.',
      milestone_category: 'Operations',
      status: 'Validated',
    },
  ],
}

export function createFakeAnalystModel() {
  return {
    bindTools() {
      return this
    },
    async stream() {
      return (async function* () {
        yield new AIMessage({
          content: FAKE_REPLY,
          tool_calls: [
            {
              id: 'fake-kanban',
              name: RENDER_KANBAN_TOOL,
              args: FAKE_STORIES,
              type: 'tool_call',
            },
          ],
        })
      })()
    },
  } as unknown as BaseChatModel
}
