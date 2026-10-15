import { AIMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'

import { RENDER_KANBAN_TOOL } from '@repo/schemas'

const FAKE_REPLY = `## Target Audience
1. **The Culinary Explorer:** A home cook or food enthusiast who loves adding spice and heat to meals, looking for pairing inspiration, recipe ideas, and a way to track their favorite hot sauces.
2. **The Brand Loyalist & Collector:** A dedicated fan of the Tabasco brand who wants to discover limited editions, access exclusive merch, track their tasting journey, and learn about the heritage of Avery Island.

## Core Problem
Hot sauce lovers often stick to the same bottle out of habit because they lack inspiration for new food pairings, struggle to navigate different heat levels and flavor profiles across varieties, and have no central digital hub to engage with their favorite brand or track their tasting milestones. Existing solutions are generic recipe apps that don't cater specifically to heat-seekers or dedicated sauce collections.

## MVP Scope
- **In-Scope (v1):**
  1. **Sauce Catalog & Flavor Guide:** A searchable database of Tabasco varieties with official heat ratings (Scoville units), tasting notes, and suggested food pairings.
  2. **Personal Heat Tracker:** A profile feature allowing users to log tasted sauces, rate them, and track their personal heat tolerance journey.
  3. **Spice-Matched Recipe Feed:** A curated list of recipes filterable by heat level and specific Tabasco variety.
  4. **Pairing Quiz ("Find Your Match"):** An interactive quiz that recommends the ideal Tabasco sauce based on the user's current meal and preferred spice level.
- **Out-of-Scope:**
  - E-commerce checkout integration for buying merchandise or direct-to-consumer sauce ordering (handled via external web links for v1).
  - Social networking features (e.g., user-generated recipe uploads and community forums).

## Candidate User Stories
1. As a home cook, I want to search the Tabasco catalog by heat level and flavor profile so that I can choose the right sauce for my meal.
2. As a spice enthusiast, I want to log the sauces I have tried and rate them so that I can track my personal heat tolerance over time.
3. As a foodie, I want to take a quick pairing quiz based on what I am cooking so that I can get instant sauce recommendations.
4. As a brand fan, I want to browse recipes filtered by specific Tabasco varieties so that I can cook flavorful, spicy meals at home.`

const FAKE_STORIES = {
  stories: [
    {
      title: 'Search the catalog by heat and flavor',
      description:
        'As a home cook, I want to search the Tabasco catalog by heat level and flavor profile so that I can choose the right sauce for my meal.',
    },
    {
      title: 'Log and rate tasted sauces',
      description:
        'As a spice enthusiast, I want to log the sauces I have tried and rate them so that I can track my personal heat tolerance over time.',
    },
    {
      title: 'Pairing quiz for the current meal',
      description:
        'As a foodie, I want to take a quick pairing quiz based on what I am cooking so that I can get instant sauce recommendations.',
    },
    {
      title: 'Browse recipes by Tabasco variety',
      description:
        'As a brand fan, I want to browse recipes filtered by specific Tabasco varieties so that I can cook flavorful, spicy meals at home.',
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
