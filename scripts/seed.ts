import pg from 'pg';
import argon2 from 'argon2';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('🌱 Seeding mock data...');

  // Check if already seeded
  const existing = await pool.query('SELECT COUNT(*) as count FROM contacts');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('✅ Contacts already exist — skipping seed.');
    await pool.end();
    return;
  }

  // Get existing user IDs
  const usersRes = await pool.query('SELECT id, role FROM users ORDER BY id');
  const adminUser = usersRes.rows.find((u: any) => u.role === 'admin');
  const agentUser = usersRes.rows.find((u: any) => u.role === 'agent') ?? adminUser;

  if (!adminUser) {
    console.error('❌ No users found. Run the app first to create default users.');
    await pool.end();
    return;
  }

  /* ─── Contacts ─────────────────────────────────────────────── */
  const contactsData = [
    { name: 'Ana Paula Ribeiro',    email: 'ana.ribeiro@techbrasil.com.br', phone: '+55 11 98765-4321', company: 'Tech Brasil',     location: 'São Paulo, SP',  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ana' },
    { name: 'Carlos Eduardo Silva', email: 'carlos@startupflow.io',          phone: '+55 21 99234-5678', company: 'StartupFlow',     location: 'Rio de Janeiro, RJ', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos' },
    { name: 'Mariana Costa',        email: 'mariana.costa@logistica.com',    phone: '+55 31 97654-3210', company: 'LogísticaPro',    location: 'Belo Horizonte, MG', avatar_url: null },
    { name: 'Rafael Mendonça',      email: 'rafael@vendasmax.com.br',        phone: '+55 41 98888-1111', company: 'VendasMax',       location: 'Curitiba, PR',   avatar_url: null },
    { name: 'Fernanda Oliveira',    email: 'f.oliveira@digitalhouse.com',    phone: '+55 11 97777-2222', company: 'Digital House',   location: 'São Paulo, SP',  avatar_url: null },
    { name: 'Lucas Pereira',        email: 'lucas@inovatech.dev',            phone: '+55 48 96666-3333', company: 'InovaTech',       location: 'Florianópolis, SC', avatar_url: null },
    { name: 'Beatriz Santos',       email: 'beatriz.s@financeflex.com',      phone: '+55 85 95555-4444', company: 'FinanceFlex',     location: 'Fortaleza, CE',  avatar_url: null },
    { name: 'Thiago Rocha',         email: 'thiago.r@construmax.eng.br',     phone: '+55 61 94444-5555', company: 'Construmax',      location: 'Brasília, DF',   avatar_url: null },
    { name: 'Juliana Alves',        email: 'juliana@healthtech.med.br',      phone: '+55 81 93333-6666', company: 'HealthTech',      location: 'Recife, PE',     avatar_url: null },
    { name: 'Pedro Monteiro',       email: 'pedro.m@agroverde.agr.br',       phone: '+55 62 92222-7777', company: 'AgroVerde',       location: 'Goiânia, GO',    avatar_url: null },
    { name: 'Camila Ferreira',      email: 'camila.f@ecommercebr.shop',      phone: '+55 11 91111-8888', company: 'E-Commerce BR',   location: 'São Paulo, SP',  avatar_url: null },
    { name: 'Diego Martins',        email: 'diego@cloudsolutions.net',       phone: '+55 51 90000-9999', company: 'Cloud Solutions', location: 'Porto Alegre, RS', avatar_url: null },
  ];

  const contactIds: number[] = [];
  for (const c of contactsData) {
    const res = await pool.query(
      `INSERT INTO contacts (name, email, phone, company, location, avatar_url, conversations_count)
       VALUES ($1,$2,$3,$4,$5,$6,0) RETURNING id`,
      [c.name, c.email, c.phone, c.company, c.location, c.avatar_url],
    );
    contactIds.push(res.rows[0].id);
  }
  console.log(`  ✓ ${contactIds.length} contacts created`);

  /* ─── Conversations ─────────────────────────────────────────── */
  const convData = [
    { contactIdx: 0, status: 'open',     subject: 'Dúvida sobre plano Enterprise',    channel: 'whatsapp', priority: 'high',   labels: ['vip', 'suporte'],   unread: 3, assigneeId: agentUser!.id },
    { contactIdx: 1, status: 'open',     subject: 'Solicitação de integração API',     channel: 'chat',     priority: 'medium', labels: ['técnico'],          unread: 1, assigneeId: adminUser.id },
    { contactIdx: 2, status: 'resolved', subject: 'Problema no rastreamento de pedido',channel: 'whatsapp', priority: 'low',    labels: ['resolvido'],        unread: 0, assigneeId: agentUser!.id },
    { contactIdx: 3, status: 'open',     subject: 'Cotação para licença corporativa',  channel: 'chat',     priority: 'high',   labels: ['vendas', 'vip'],    unread: 2, assigneeId: adminUser.id },
    { contactIdx: 4, status: 'pending',  subject: 'Configuração de nova conta',        channel: 'whatsapp', priority: 'medium', labels: ['onboarding'],       unread: 0, assigneeId: agentUser!.id },
    { contactIdx: 5, status: 'open',     subject: 'Bug no painel de relatórios',       channel: 'chat',     priority: 'high',   labels: ['bug', 'técnico'],   unread: 5, assigneeId: adminUser.id },
    { contactIdx: 6, status: 'open',     subject: 'Solicitação de reembolso',          channel: 'whatsapp', priority: 'medium', labels: ['financeiro'],       unread: 1, assigneeId: agentUser!.id },
    { contactIdx: 7, status: 'resolved', subject: 'Aprovação de orçamento',            channel: 'chat',     priority: 'none',   labels: ['financeiro'],       unread: 0, assigneeId: adminUser.id },
  ];

  const convIds: number[] = [];
  for (const cv of convData) {
    const cId = contactIds[cv.contactIdx];
    const res = await pool.query(
      `INSERT INTO conversations (contact_id, assignee_id, status, channel, priority, subject, labels, unread_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [cId, cv.assigneeId, cv.status, cv.channel, cv.priority, cv.subject, cv.labels, cv.unread],
    );
    convIds.push(res.rows[0].id);
    // Update contact conversations_count
    await pool.query('UPDATE contacts SET conversations_count = conversations_count + 1 WHERE id = $1', [cId]);
  }
  console.log(`  ✓ ${convIds.length} conversations created`);

  /* ─── Messages ──────────────────────────────────────────────── */
  const msgSets: Array<{ convIdx: number; msgs: Array<{ content: string; type: string; mins: number }> }> = [
    {
      convIdx: 0,
      msgs: [
        { content: 'Oi! Preciso de informações sobre o plano Enterprise. Vocês têm suporte 24h?', type: 'incoming', mins: 45 },
        { content: 'Olá, Ana! Sim, nosso plano Enterprise inclui suporte 24/7 com SLA de 2 horas. Posso agendar uma demonstração?', type: 'outgoing', mins: 42 },
        { content: 'Seria ótimo! Tenho interesse em saber sobre as integrações com sistemas legados também.', type: 'incoming', mins: 40 },
        { content: 'Claro! Temos integrações nativas com SAP, Salesforce e mais de 200 ferramentas via Zapier.', type: 'outgoing', mins: 38 },
        { content: 'Que incrível! E o preço por usuário é o mesmo independente da quantidade?', type: 'incoming', mins: 5 },
      ],
    },
    {
      convIdx: 1,
      msgs: [
        { content: 'Preciso integrar minha aplicação com a API de vocês. Tem documentação disponível?', type: 'incoming', mins: 120 },
        { content: 'Oi, Carlos! Sim, nossa documentação está em docs.chatflow.io. Qual linguagem você usa?', type: 'outgoing', mins: 115 },
        { content: 'Usamos Node.js e Python. Tem SDK para essas duas?', type: 'incoming', mins: 110 },
        { content: 'Perfeito! Temos SDKs oficiais para Node.js e Python. Vou te mandar os links agora.', type: 'outgoing', mins: 108 },
        { content: 'Recebido! Vou testar hoje mesmo. Muito obrigado!', type: 'incoming', mins: 30 },
      ],
    },
    {
      convIdx: 3,
      msgs: [
        { content: 'Bom dia! Precisamos de uma cotação para 50 usuários no plano Business.', type: 'incoming', mins: 200 },
        { content: 'Bom dia, Rafael! Vou preparar uma proposta personalizada. Qual o prazo de decisão?', type: 'outgoing', mins: 195 },
        { content: 'Precisamos fechar até o final do mês para aproveitar o orçamento anual.', type: 'incoming', mins: 190 },
        { content: 'Entendido! Enviarei a proposta amanhã com desconto especial para contrato anual.', type: 'outgoing', mins: 188 },
        { content: 'Ótimo! Aguardo a proposta. Inclua também o suporte premium se possível.', type: 'incoming', mins: 10 },
        { content: 'Com certeza! Já estou incluindo o pacote de suporte premium na proposta.', type: 'incoming', mins: 2 },
      ],
    },
    {
      convIdx: 5,
      msgs: [
        { content: 'Olá! Estou tendo problemas para acessar o painel de relatórios. Dá erro 500.', type: 'incoming', mins: 60 },
        { content: 'Oi, Lucas! Recebi seu report. Pode me enviar o horário exato em que ocorre o erro?', type: 'outgoing', mins: 55 },
        { content: 'Acontece toda vez que tento exportar para PDF. Por volta das 14h de ontem começou.', type: 'incoming', mins: 50 },
        { content: 'Identificamos o problema — estava relacionado ao servidor de PDF. Já corrigimos. Pode testar?', type: 'outgoing', mins: 20 },
        { content: 'Funcionou! Muito obrigado pela rapidez. Vocês são demais! 🚀', type: 'incoming', mins: 10 },
      ],
    },
  ];

  let msgCount = 0;
  for (const ms of msgSets) {
    const convId = convIds[ms.convIdx];
    for (const msg of ms.msgs) {
      const createdAt = new Date(Date.now() - msg.mins * 60 * 1000);
      const senderId = msg.type === 'outgoing' ? adminUser.id : null;
      await pool.query(
        `INSERT INTO messages (conversation_id, content, message_type, delivery_status, sender_id, created_at)
         VALUES ($1,$2,$3,'delivered',$4,$5)`,
        [convId, msg.content, msg.type, senderId, createdAt],
      );
      msgCount++;
    }
    // Update conversation updated_at
    await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [convId]);
  }
  console.log(`  ✓ ${msgCount} messages created`);

  console.log('🎉 Seed completed successfully!');
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Seed failed:', e.message);
  process.exit(1);
});
