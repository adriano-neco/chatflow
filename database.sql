--
-- PostgreSQL database dump
--

\restrict MSf77bKcN25GcEkTB7D0Yo4TXtZNuwyAlhwGDxmmLC6j2NmLZcNobMukbMTNnb7

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    location text,
    avatar_url text,
    conversations_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_id_seq OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    channel text DEFAULT 'chat'::text NOT NULL,
    priority text DEFAULT 'none'::text,
    subject text,
    unread_count integer DEFAULT 0 NOT NULL,
    contact_id integer NOT NULL,
    assignee_id integer,
    labels text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq OWNER TO postgres;

--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'incoming'::text NOT NULL,
    sender_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    delivery_status text DEFAULT 'sent'::text NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'agent'::text NOT NULL,
    avatar_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, name, email, phone, company, location, avatar_url, conversations_count, created_at) FROM stdin;
1	João Santos	joao@empresa.com	+55 11 99999-0001	Tech Ltda	São Paulo, SP	\N	1	2026-03-14 16:42:08.99113
2	Maria Oliveira	maria@gmail.com	+55 21 99999-0002	Design Studio	Rio de Janeiro, RJ	\N	1	2026-03-14 16:42:08.99113
3	Pedro Alves	pedro@startup.com.br	+55 31 99999-0003	Startup XYZ	Belo Horizonte, MG	\N	1	2026-03-14 16:42:08.99113
4	Fernanda Lima	fernanda@corp.com	+55 41 99999-0004	Corp Brasil	Curitiba, PR	\N	1	2026-03-14 16:42:08.99113
5	Ricardo Costa	ricardo@negocio.com.br	+55 51 99999-0005	Negócios & Cia	Porto Alegre, RS	\N	1	2026-03-14 16:42:08.99113
6	Beatriz Souza	beatriz@freelancer.com	+55 61 99999-0006	\N	Brasília, DF	\N	1	2026-03-14 16:42:08.99113
7	Lucas Ferreira	lucas@tech.io	+55 71 99999-0007	TechIO	Salvador, BA	\N	1	2026-03-14 16:42:08.99113
8	Amanda Torres	amanda@mkt.com	+55 81 99999-0008	Marketing Pro	Recife, PE	\N	1	2026-03-14 16:42:08.99113
9	Diego Martins	diego@construcoes.com	+55 92 99999-0009	Construções DM	Manaus, AM	\N	1	2026-03-14 16:42:08.99113
10	Camila Rocha	camila@saude.com.br	+55 48 99999-0010	Clínica Saúde	Florianópolis, SC	\N	1	2026-03-14 16:42:08.99113
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, status, channel, priority, subject, unread_count, contact_id, assignee_id, labels, created_at, updated_at) FROM stdin;
1	open	chat	none	Problema com login no sistema	2	1	1	{suporte,urgente}	2026-03-14 16:42:08.996758	2026-03-14 16:42:08.996758
2	open	email	none	Solicitação de orçamento	0	2	2	{vendas}	2026-03-14 16:42:08.996758	2026-03-14 16:42:08.996758
3	resolved	whatsapp	none	Integração com API	0	3	1	{suporte}	2026-03-14 16:42:08.996758	2026-03-14 16:42:08.996758
4	pending	chat	none	Dúvida sobre faturamento	1	4	\N	{}	2026-03-14 16:42:08.996758	2026-03-14 16:42:08.996758
5	open	telegram	none	Renovação de contrato	3	5	2	{prioritário}	2026-03-14 16:42:08.996758	2026-03-14 16:42:08.996758
6	snoozed	email	none	Feedback sobre o produto	0	6	1	{feedback}	2026-03-14 16:42:08.996758	2026-03-14 16:42:08.996758
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, content, message_type, sender_id, created_at, delivery_status) FROM stdin;
1	1	Olá! Estou tendo problemas para fazer login no sistema. Aparece um erro 401.	incoming	\N	2026-03-14 16:42:09.004098	sent
2	1	Bom dia, João! Vou verificar o que está acontecendo com a sua conta agora mesmo.	outgoing	1	2026-03-14 16:42:09.004098	sent
3	1	Encontrei o problema. Sua senha foi bloqueada por muitas tentativas. Vou resetar agora.	outgoing	1	2026-03-14 16:42:09.004098	sent
4	1	Perfeito! Consegui logar depois do reset. Muito obrigado pela ajuda!	incoming	\N	2026-03-14 16:42:09.004098	sent
5	1	Ótimo! Fico feliz em ter ajudado. Qualquer outra dúvida, pode chamar!	outgoing	1	2026-03-14 16:42:09.004098	sent
6	1	Na verdade, tenho mais uma dúvida. Como faço para adicionar novos usuários?	incoming	\N	2026-03-14 16:42:09.004098	sent
7	1	Não tem problema! Vou te enviar o passo a passo agora.	incoming	\N	2026-03-14 16:42:09.004098	sent
8	2	Boa tarde! Gostaria de um orçamento para o plano Enterprise.	incoming	\N	2026-03-14 16:42:09.004098	sent
9	2	Olá, Maria! Claro, posso te ajudar com isso. Qual o tamanho da sua equipe?	outgoing	2	2026-03-14 16:42:09.004098	sent
10	2	Somos em 15 pessoas no time de design.	incoming	\N	2026-03-14 16:42:09.004098	sent
11	2	Perfeito! Vou preparar uma proposta personalizada para vocês e envio ainda hoje.	outgoing	2	2026-03-14 16:42:09.004098	sent
12	3	Olá! Preciso de ajuda para integrar a API do sistema no meu projeto.	incoming	\N	2026-03-14 16:42:09.004098	sent
13	3	Oi Pedro! Pode me passar mais detalhes de qual endpoint você está tentando usar?	outgoing	1	2026-03-14 16:42:09.004098	sent
14	3	Estou tentando usar o endpoint /api/v1/messages mas não estou conseguindo autenticar.	incoming	\N	2026-03-14 16:42:09.004098	sent
15	3	Você precisa passar o token Bearer no header Authorization. Vou te enviar um exemplo de código.	outgoing	1	2026-03-14 16:42:09.004098	sent
16	3	Funcionou perfeitamente! Muito obrigado pela ajuda rápida!	incoming	\N	2026-03-14 16:42:09.004098	sent
17	4	Boa tarde. Gostaria de entender melhor como funciona a cobrança mensal.	incoming	\N	2026-03-14 16:42:09.004098	sent
18	5	Olá! Meu contrato com vocês vence no próximo mês. Como faço para renovar?	incoming	\N	2026-03-14 16:42:09.004098	sent
19	5	Oi, Ricardo! Que bom que está pensando na renovação! Vou verificar as condições especiais para clientes fiéis.	outgoing	2	2026-03-14 16:42:09.004098	sent
20	5	Temos uma promoção especial de 20% de desconto para renovações anuais.	outgoing	2	2026-03-14 16:42:09.004098	sent
21	5	Isso é ótimo! E tenho mais usuários para adicionar também.	incoming	\N	2026-03-14 16:42:09.004098	sent
22	5	Perfeito! Podemos incluir mais slots no mesmo contrato.	outgoing	2	2026-03-14 16:42:09.004098	sent
23	5	Quantos usuários adicionais você precisa?	outgoing	2	2026-03-14 16:42:09.004098	sent
24	5	Mais 5 usuários. Pode ser?	incoming	\N	2026-03-14 16:42:09.004098	sent
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, token, expires_at, created_at) FROM stdin;
1	1	ce711db8b0185d4ae7497b7f0ce947e3104886cfafb31bd11d9180d915e40f17	2026-03-21 16:42:14.212	2026-03-14 16:42:14.213364
2	1	44fd493969b30553c8c44e996194a163499d64ffda56222bcb7cd5388d3a6a5c	2026-03-21 16:45:31.953	2026-03-14 16:45:31.953845
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, role, avatar_url, created_at) FROM stdin;
1	Admin Silva	admin@chatflow.com	$argon2id$v=19$m=65536,t=3,p=4$TxxyCeBFrZWkr2xbw2R/Iw$k6cGzrPGaBdzr35w6DaoGrOLhFg8QDmbMReSyHssaMA	admin	\N	2026-03-14 16:42:08.952748
2	Carlos Mendes	carlos@chatflow.com	$argon2id$v=19$m=65536,t=3,p=4$m4BPnuNDc8g7CPKVs5Rtkg$OFkBETrCIXbDQblp6c1MW77sPLAXTmbToLIu8mOSK4E	agent	\N	2026-03-14 16:42:08.982981
3	Ana Paula	ana@chatflow.com	$argon2id$v=19$m=65536,t=3,p=4$m4BPnuNDc8g7CPKVs5Rtkg$OFkBETrCIXbDQblp6c1MW77sPLAXTmbToLIu8mOSK4E	agent	\N	2026-03-14 16:42:08.986626
\.


--
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contacts_id_seq', 10, true);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conversations_id_seq', 6, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 24, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_unique UNIQUE (token);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_assignee_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_assignee_id_users_id_fk FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict MSf77bKcN25GcEkTB7D0Yo4TXtZNuwyAlhwGDxmmLC6j2NmLZcNobMukbMTNnb7

