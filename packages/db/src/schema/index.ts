import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

export const storyStatus = pgEnum('story_status', [
  'todo',
  'in_progress',
  'done',
]);

export const storyPriority = pgEnum('story_priority', [
  'low',
  'medium',
  'high',
]);

export const runStatus = pgEnum('run_status', [
  'running',
  'awaiting_approval',
  'completed',
  'failed',
]);

export const messageRole = pgEnum('message_role', ['user', 'assistant']);

export const users = pgTable('users', {
  id: uuid().defaultRandom().primaryKey(),
  githubId: text().notNull().unique(),
  login: text().notNull(),
  name: text(),
  email: text(),
  avatarUrl: text(),
  createdAt: timestamps.createdAt,
});

export const projects = pgTable(
  'projects',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    idea: text().notNull(),
    ...timestamps,
  },
  (table) => [index('projects_user_id_idx').on(table.userId)]
);

export const runs = pgTable(
  'runs',
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    status: runStatus().notNull().default('running'),
    ...timestamps,
  },
  (table) => [index('runs_project_id_idx').on(table.projectId)]
);

export const messages = pgTable(
  'messages',
  {
    id: uuid().defaultRandom().primaryKey(),
    runId: uuid()
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    role: messageRole().notNull(),
    content: text().notNull(),
    createdAt: timestamps.createdAt,
  },
  (table) => [index('messages_run_id_idx').on(table.runId)]
);

export const stories = pgTable(
  'stories',
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    description: text().notNull().default(''),
    acceptanceCriteria: jsonb().$type<string[]>().notNull().default([]),
    status: storyStatus().notNull().default('todo'),
    priority: storyPriority().notNull().default('medium'),
    position: integer().notNull().default(0),
    ...timestamps,
  },
  (table) => [index('stories_project_id_idx').on(table.projectId)]
);

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  runs: many(runs),
  stories: many(stories),
}));

export const runsRelations = relations(runs, ({ one, many }) => ({
  project: one(projects, {
    fields: [runs.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  run: one(runs, { fields: [messages.runId], references: [runs.id] }),
}));

export const storiesRelations = relations(stories, ({ one }) => ({
  project: one(projects, {
    fields: [stories.projectId],
    references: [projects.id],
  }),
}));
