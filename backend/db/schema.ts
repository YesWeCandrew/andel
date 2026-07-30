import { sqliteTable, text, integer} from 'drizzle-orm/sqlite-core'

export const todo = sqliteTable('todo',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        title: text('title').notNull(),
        emoji: text('emoji'),
        notes: text('notes'),
        frequency_days: integer('frequency_days'),
        last_completed_on: integer('last_completed_on', { mode: 'timestamp' }),
        created_on: integer('created_on', { mode: 'timestamp' }).notNull()
    }
)

export const todo_log = sqliteTable('todo_log',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        todo_id: integer('todo_id').references(() => todo.id),
        completed_on: integer('completed_on', { mode: 'timestamp' }).notNull()
    }
);