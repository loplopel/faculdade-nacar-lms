-- =====================================================
-- FACULDADE NACAR LMS
-- Estrutura inicial do banco Supabase/PostgreSQL
-- =====================================================

create extension if not exists "uuid-ossp";

-- =========================
-- LOJAS
-- =========================
create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  code text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- =========================
-- PERFIS DE USUÁRIO
-- =========================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'gestor', 'instrutor', 'funcionario')),
  store_id uuid references stores(id),
  position text,
  region text,
  seller_name text,
  phone text,
  whatsapp text,
  situation text default 'active',
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =========================
-- CATEGORIAS DE CURSOS
-- =========================
create table if not exists course_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- =========================
-- CURSOS
-- =========================
create table if not exists courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  description text,
  category_id uuid references course_categories(id),
  cover_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_required boolean default false,
  minimum_score numeric default 80,
  certificate_enabled boolean default true,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =========================
-- AULAS
-- =========================
create table if not exists lessons (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  content_type text not null check (content_type in ('video', 'text', 'pdf', 'image', 'mixed')),
  content_url text,
  text_content text,
  duration_minutes integer default 0,
  order_index integer not null default 1,
  is_required boolean default true,
  created_at timestamp with time zone default now()
);

-- =========================
-- MATERIAIS COMPLEMENTARES
-- =========================
create table if not exists materials (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  title text not null,
  file_type text not null check (file_type in ('pdf', 'video', 'image', 'text', 'link')),
  file_url text,
  description text,
  created_at timestamp with time zone default now()
);

-- =========================
-- MATRÍCULAS / CURSOS LIBERADOS
-- =========================
create table if not exists enrollments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'failed')),
  progress numeric default 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(user_id, course_id)
);

-- =========================
-- PROGRESSO DAS AULAS
-- =========================
create table if not exists lesson_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  is_completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(user_id, lesson_id)
);

-- =========================
-- PROVAS
-- =========================
create table if not exists exams (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  minimum_score numeric default 80,
  max_attempts integer default 3,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- =========================
-- PERGUNTAS
-- =========================
create table if not exists questions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'multiple_choice' check (question_type in ('multiple_choice', 'true_false', 'text')),
  points numeric default 1,
  order_index integer not null default 1,
  created_at timestamp with time zone default now()
);

-- =========================
-- ALTERNATIVAS
-- =========================
create table if not exists question_options (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid not null references questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean default false,
  order_index integer not null default 1,
  created_at timestamp with time zone default now()
);

-- =========================
-- TENTATIVAS DE PROVA
-- =========================
create table if not exists exam_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  score numeric default 0,
  status text not null default 'started' check (status in ('started', 'passed', 'failed')),
  started_at timestamp with time zone default now(),
  finished_at timestamp with time zone
);

-- =========================
-- RESPOSTAS DAS PROVAS
-- =========================
create table if not exists exam_answers (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references exam_attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option_id uuid references question_options(id),
  text_answer text,
  is_correct boolean,
  created_at timestamp with time zone default now()
);

-- =========================
-- CERTIFICADOS
-- =========================
create table if not exists certificates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  certificate_url text,
  issued_at timestamp with time zone default now(),
  unique(user_id, course_id)
);

-- =========================
-- SEED INICIAL
-- =========================
insert into stores (name, code) values
('Nacar Mega Store', '22'),
('Nacar Motorcycle', '27'),
('Nacar Campinas', '34'),
('Nacar Taubaté', '36'),
('Web Racing', '14'),
('Planet Bike', '19'),
('Super Bike', '18'),
('Toleman', '20'),
('Motosport', '16'),
('Nova Centro', '11'),
('Nova Suzuki', '10'),
('Nova MotoStore', '9')
on conflict (name) do nothing;

insert into course_categories (name, description) values
('Atendimento', 'Treinamentos de atendimento, relacionamento e experiência do cliente.'),
('Vendas', 'Técnicas comerciais, abordagem, negociação e conversão.'),
('Produtos', 'Conhecimento técnico sobre produtos, marcas e categorias.'),
('Garantia', 'Processos de garantia, análise, documentação e acompanhamento.'),
('Operacional', 'Rotinas internas, loja, estoque, processos e padrões.'),
('Cultura Nacar', 'Valores, postura, padrão de loja e cultura do Grupo Nacar.'),
('Gestão', 'Treinamentos para gestores, supervisores e liderança.'),
('Marketing', 'Conteúdos de marketing, campanhas, redes e comunicação.')
on conflict (name) do nothing;