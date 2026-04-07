-- =============================================
-- 博客评论 + 划线评论 数据库 Schema
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================

-- 文章评论表
create table comments (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  user_name text not null,
  user_avatar text,
  user_github_id text,
  content text not null,
  created_at timestamptz default now()
);

-- 划线评论表
create table highlights (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  user_name text not null,
  user_avatar text,
  user_github_id text,
  selected_text text not null,
  comment text not null,
  start_offset int not null,
  end_offset int not null,
  container_path text not null,
  created_at timestamptz default now()
);

-- 索引：按文章查询
create index idx_comments_slug on comments(article_slug);
create index idx_highlights_slug on highlights(article_slug);

-- RLS 策略
alter table comments enable row level security;
alter table highlights enable row level security;

-- 任何人可读
create policy "Anyone can read comments" on comments for select using (true);
create policy "Anyone can read highlights" on highlights for select using (true);

-- 任何人可写（匿名访客通过 anon key 写入，用户信息存在行内）
create policy "Anyone can insert comments" on comments for insert with check (true);
create policy "Anyone can insert highlights" on highlights for insert with check (true);

-- =============================================
-- AI 聊天记录持久化 Schema
-- =============================================

-- AI 聊天会话表
create table chat_sessions (
  id text primary key,
  user_github_id text not null,
  title text not null default '新对话',
  preview text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AI 聊天消息表
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  contexts jsonb,
  created_at timestamptz default now()
);

create index idx_chat_sessions_user on chat_sessions(user_github_id);
create index idx_chat_messages_session on chat_messages(session_id);

-- RLS
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

create policy "Anyone can read chat_sessions" on chat_sessions for select using (true);
create policy "Anyone can insert chat_sessions" on chat_sessions for insert with check (true);
create policy "Anyone can update chat_sessions" on chat_sessions for update using (true);
create policy "Anyone can delete chat_sessions" on chat_sessions for delete using (true);

create policy "Anyone can read chat_messages" on chat_messages for select using (true);
create policy "Anyone can insert chat_messages" on chat_messages for insert with check (true);
create policy "Anyone can delete chat_messages" on chat_messages for delete using (true);

-- =============================================
-- Todo 待办事项持久化 Schema
-- =============================================

create table todos (
  id text primary key,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('backlog','todo','in_progress','done')),
  priority int not null default 3 check (priority between 1 and 4),
  category text not null default '工作',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_todos_status on todos(status);

alter table todos enable row level security;
create policy "Anyone can read todos" on todos for select using (true);
create policy "Anyone can insert todos" on todos for insert with check (true);
create policy "Anyone can update todos" on todos for update using (true);
create policy "Anyone can delete todos" on todos for delete using (true);
