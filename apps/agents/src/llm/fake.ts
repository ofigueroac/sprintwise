import { AIMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'

import { RENDER_KANBAN_TOOL } from '@repo/schemas'

const FAKE_REPLY = `## Target Audience
- **Field Recordists & Foley Artists:** Audio professionals, hobbyists, and acoustic ecologists capturing environmental sound, wildlife, transit noises, or urban ambiances directly on location using mobile devices or dedicated field gear.
- **Music Producers & Beatmakers:** Artists seeking rare, geographically distinct textures, found sounds, and acoustic spaces to sample and manipulate within their musical productions.

## Core Problem
Field recordings and acoustic samples are currently marooned across fragmented audio platforms like Freesound, generic cloud drives, or private hard drives. These existing platforms strip sounds of their physical, geographical, and environmental context. Creators looking for particular regional ambiances (e.g., a specific train station's reverb or a coastal canyon's wind patterns) have no intuitive, map-driven way to discover, share, or collaboratively build upon audio tied to real-world locations.

## Proposed stories
- As a field recordist, I want to upload an audio recording tagged with its exact GPS coordinates so that others can experience the authentic acoustic environment of that specific location.
- As a music producer, I want to explore an interactive map populated with audio pins so that I can discover geographically unique sound samples from around the world.
- As a sound designer, I want to layer my own audio onto an existing location pin so that I can co-create evolving soundscapes with other artists.
- As a mobile recordist, I want to capture audio directly within the mobile interface using my device microphone so that I can document spontaneous acoustic moments without external hardware.
- As a sample seeker, I want to filter the map by sound category (e.g., weather, mechanical, nature, acoustic space) so that I can find suitable source material for my compositions quickly.
- As a creator, I want to specify usage rights and Creative Commons licenses for my uploaded recordings so that collaborators know how they can legally incorporate my sounds into their work.`

const FAKE_STORIES = {
  cards: [
    {
      title: 'Upload a GPS-tagged recording',
      description:
        'As a field recordist, I want to upload an audio recording tagged with its exact GPS coordinates so that others can experience the authentic acoustic environment of that specific location.',
    },
    {
      title: 'Explore audio pins on a map',
      description:
        'As a music producer, I want to explore an interactive map populated with audio pins so that I can discover geographically unique sound samples from around the world.',
    },
    {
      title: 'Layer audio on a location pin',
      description:
        'As a sound designer, I want to layer my own audio onto an existing location pin so that I can co-create evolving soundscapes with other artists.',
    },
    {
      title: 'Capture audio in the mobile app',
      description:
        'As a mobile recordist, I want to capture audio directly within the mobile interface using my device microphone so that I can document spontaneous acoustic moments without external hardware.',
    },
    {
      title: 'Filter the map by sound category',
      description:
        'As a sample seeker, I want to filter the map by sound category (e.g., weather, mechanical, nature, acoustic space) so that I can find suitable source material for my compositions quickly.',
    },
    {
      title: 'Set usage rights on a recording',
      description:
        'As a creator, I want to specify usage rights and Creative Commons licenses for my uploaded recordings so that collaborators know how they can legally incorporate my sounds into their work.',
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
