| info                     | column_name  | data_type                | is_nullable | column_default            |
| ------------------------ | ------------ | ------------------------ | ----------- | ------------------------- |
| chat_messages structure: | id           | uuid                     | NO          | gen_random_uuid()         |
| chat_messages structure: | chat_id      | character varying        | NO          | null                      |
| chat_messages structure: | sender_id    | uuid                     | NO          | null                      |
| chat_messages structure: | message      | text                     | NO          | null                      |
| chat_messages structure: | chat_type    | character varying        | NO          | 'dm'::character varying   |
| chat_messages structure: | message_type | character varying        | YES         | 'text'::character varying |
| chat_messages structure: | timestamp    | timestamp with time zone | YES         | now()                     |
| chat_messages structure: | read_at      | timestamp with time zone | YES         | null                      |
| chat_messages structure: | delivered_at | timestamp with time zone | YES         | null                      |
| chat_messages structure: | sent_at      | timestamp with time zone | YES         | now()                     |
| chat_messages structure: | edited_at    | timestamp with time zone | YES         | null                      |
| chat_messages structure: | created_at   | timestamp with time zone | YES         | now()                     |
| chat_messages structure: | updated_at   | timestamp with time zone | YES         | now()                     |

Announcements
| info                     | column_name | data_type                | is_nullable | column_default              |
| ------------------------ | ----------- | ------------------------ | ----------- | --------------------------- |
| announcements structure: | id          | uuid                     | NO          | uuid_generate_v4()          |
| announcements structure: | title       | character varying        | NO          | null                        |
| announcements structure: | content     | text                     | NO          | null                        |
| announcements structure: | author_id   | uuid                     | NO          | null                        |
| announcements structure: | priority    | character varying        | YES         | 'normal'::character varying |
| announcements structure: | created_at  | timestamp with time zone | YES         | now()                       |
| announcements structure: | updated_at  | timestamp with time zone | YES         | now()                       |

group_chats
| info         | column_name | data_type                | is_nullable | column_default     |
| ------------ | ----------- | ------------------------ | ----------- | ------------------ |
| group_chats: | id          | uuid                     | NO          | uuid_generate_v4() |
| group_chats: | name        | character varying        | NO          | null               |
| group_chats: | description | text                     | YES         | null               |
| group_chats: | created_by  | uuid                     | NO          | null               |
| group_chats: | is_private  | boolean                  | YES         | false              |
| group_chats: | avatar      | text                     | YES         | null               |
| group_chats: | created_at  | timestamp with time zone | YES         | now()              |
| group_chats: | updated_at  | timestamp with time zone | YES         | now()              |

group_chat_members
| info                | column_name | data_type                | is_nullable | column_default              |
| ------------------- | ----------- | ------------------------ | ----------- | --------------------------- |
| group_chat_members: | id          | uuid                     | NO          | uuid_generate_v4()          |
| group_chat_members: | group_id    | uuid                     | NO          | null                        |
| group_chat_members: | employee_id | uuid                     | NO          | null                        |
| group_chat_members: | role        | character varying        | YES         | 'member'::character varying |
| group_chat_members: | joined_at   | timestamp with time zone | YES         | now()                       |