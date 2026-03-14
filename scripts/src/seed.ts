import { db, usersTable, contactsTable, conversationsTable, messagesTable } from "@workspace/db";
import argon2 from "argon2";

async function seed() {
  console.log("Seeding database...");

  const adminHash = await argon2.hash("admin123", { type: argon2.argon2id });
  const agentHash = await argon2.hash("agent123", { type: argon2.argon2id });

  const [admin] = await db.insert(usersTable).values({
    name: "Admin Silva",
    email: "admin@chatflow.com",
    passwordHash: adminHash,
    role: "admin",
  }).returning().onConflictDoNothing();

  const [agent1] = await db.insert(usersTable).values({
    name: "Carlos Mendes",
    email: "carlos@chatflow.com",
    passwordHash: agentHash,
    role: "agent",
  }).returning().onConflictDoNothing();

  const [agent2] = await db.insert(usersTable).values({
    name: "Ana Paula",
    email: "ana@chatflow.com",
    passwordHash: agentHash,
    role: "agent",
  }).returning().onConflictDoNothing();

  console.log("Users seeded:", { admin: admin?.id, agent1: agent1?.id, agent2: agent2?.id });

  const contacts = await db.insert(contactsTable).values([
    { name: "João Santos", email: "joao@empresa.com", phone: "+55 11 99999-0001", company: "Tech Ltda", location: "São Paulo, SP", conversationsCount: 0 },
    { name: "Maria Oliveira", email: "maria@gmail.com", phone: "+55 21 99999-0002", company: "Design Studio", location: "Rio de Janeiro, RJ", conversationsCount: 0 },
    { name: "Pedro Alves", email: "pedro@startup.com.br", phone: "+55 31 99999-0003", company: "Startup XYZ", location: "Belo Horizonte, MG", conversationsCount: 0 },
    { name: "Fernanda Lima", email: "fernanda@corp.com", phone: "+55 41 99999-0004", company: "Corp Brasil", location: "Curitiba, PR", conversationsCount: 0 },
    { name: "Ricardo Costa", email: "ricardo@negocio.com.br", phone: "+55 51 99999-0005", company: "Negócios & Cia", location: "Porto Alegre, RS", conversationsCount: 0 },
    { name: "Beatriz Souza", email: "beatriz@freelancer.com", phone: "+55 61 99999-0006", company: null, location: "Brasília, DF", conversationsCount: 0 },
    { name: "Lucas Ferreira", email: "lucas@tech.io", phone: "+55 71 99999-0007", company: "TechIO", location: "Salvador, BA", conversationsCount: 0 },
    { name: "Amanda Torres", email: "amanda@mkt.com", phone: "+55 81 99999-0008", company: "Marketing Pro", location: "Recife, PE", conversationsCount: 0 },
    { name: "Diego Martins", email: "diego@construcoes.com", phone: "+55 92 99999-0009", company: "Construções DM", location: "Manaus, AM", conversationsCount: 0 },
    { name: "Camila Rocha", email: "camila@saude.com.br", phone: "+55 48 99999-0010", company: "Clínica Saúde", location: "Florianópolis, SC", conversationsCount: 0 },
  ]).returning().onConflictDoNothing();

  console.log("Contacts seeded:", contacts.length);

  if (!contacts.length) {
    console.log("Contacts already exist, skipping conversations seed");
    return;
  }

  const adminId = admin?.id ?? 1;
  const agent1Id = agent1?.id ?? 2;

  const conversations = await db.insert(conversationsTable).values([
    {
      contactId: contacts[0].id, channel: "chat", status: "open",
      assigneeId: adminId, unreadCount: 2, labels: ["suporte", "urgente"],
      subject: "Problema com login no sistema",
    },
    {
      contactId: contacts[1].id, channel: "email", status: "open",
      assigneeId: agent1Id, unreadCount: 0, labels: ["vendas"],
      subject: "Solicitação de orçamento",
    },
    {
      contactId: contacts[2].id, channel: "whatsapp", status: "resolved",
      assigneeId: adminId, unreadCount: 0, labels: ["suporte"],
      subject: "Integração com API",
    },
    {
      contactId: contacts[3].id, channel: "chat", status: "pending",
      assigneeId: null, unreadCount: 1, labels: [],
      subject: "Dúvida sobre faturamento",
    },
    {
      contactId: contacts[4].id, channel: "telegram", status: "open",
      assigneeId: agent1Id, unreadCount: 3, labels: ["prioritário"],
      subject: "Renovação de contrato",
    },
    {
      contactId: contacts[5].id, channel: "email", status: "snoozed",
      assigneeId: adminId, unreadCount: 0, labels: ["feedback"],
      subject: "Feedback sobre o produto",
    },
  ]).returning().onConflictDoNothing();

  console.log("Conversations seeded:", conversations.length);

  await db.insert(messagesTable).values([
    { conversationId: conversations[0].id, content: "Olá! Estou tendo problemas para fazer login no sistema. Aparece um erro 401.", messageType: "incoming", deliveryStatus: "read", senderId: null },
    { conversationId: conversations[0].id, content: "Bom dia, João! Vou verificar o que está acontecendo com a sua conta agora mesmo.", messageType: "outgoing", deliveryStatus: "read", senderId: adminId },
    { conversationId: conversations[0].id, content: "Encontrei o problema. Sua senha foi bloqueada por muitas tentativas. Vou resetar agora.", messageType: "outgoing", deliveryStatus: "read", senderId: adminId },
    { conversationId: conversations[0].id, content: "Perfeito! Consegui logar depois do reset. Muito obrigado pela ajuda!", messageType: "incoming", deliveryStatus: "read", senderId: null },
    { conversationId: conversations[0].id, content: "Ótimo! Fico feliz em ter ajudado. Qualquer outra dúvida, pode chamar!", messageType: "outgoing", deliveryStatus: "delivered", senderId: adminId },
    { conversationId: conversations[0].id, content: "Na verdade, tenho mais uma dúvida. Como faço para adicionar novos usuários?", messageType: "incoming", deliveryStatus: "read", senderId: null },
    { conversationId: conversations[0].id, content: "Não tem problema! Vou te enviar o passo a passo agora.", messageType: "outgoing", deliveryStatus: "sent", senderId: adminId },

    { conversationId: conversations[1].id, content: "Boa tarde! Gostaria de um orçamento para o plano Enterprise.", messageType: "incoming", deliveryStatus: "read", senderId: null },
    { conversationId: conversations[1].id, content: "Olá, Maria! Claro, posso te ajudar com isso. Qual o tamanho da sua equipe?", messageType: "outgoing", deliveryStatus: "read", senderId: agent1Id },
    { conversationId: conversations[1].id, content: "Somos em 15 pessoas no time de design.", messageType: "incoming", deliveryStatus: "read", senderId: null },
    { conversationId: conversations[1].id, content: "Perfeito! Vou preparar uma proposta personalizada para vocês e envio ainda hoje.", messageType: "outgoing", deliveryStatus: "delivered", senderId: agent1Id },

    { conversationId: conversations[2].id, content: "Olá! Preciso de ajuda para integrar a API do sistema no meu projeto.", messageType: "incoming", deliveryStatus: "read", senderId: null },
    { conversationId: conversations[2].id, content: "Oi Pedro! Pode me passar mais detalhes de qual endpoint você está tentando usar?", messageType: "outgoing", deliveryStatus: "read", senderId: adminId },
    { conversationId: conversations[2].id, content: "Estou tentando usar o endpoint /api/v1/messages mas não estou conseguindo autenticar.", messageType: "incoming", deliveryStatus: "read", senderId: null },
    { conversationId: conversations[2].id, content: "Você precisa passar o token Bearer no header Authorization. Vou te enviar um exemplo de código.", messageType: "outgoing", deliveryStatus: "read", senderId: adminId },
    { conversationId: conversations[2].id, content: "Funcionou perfeitamente! Muito obrigado pela ajuda rápida!", messageType: "incoming", deliveryStatus: "read", senderId: null },

    { conversationId: conversations[3].id, content: "Boa tarde. Gostaria de entender melhor como funciona a cobrança mensal.", messageType: "incoming", deliveryStatus: "read", senderId: null },

    { conversationId: conversations[4].id, content: "Olá! Meu contrato com vocês vence no próximo mês. Como faço para renovar?", messageType: "incoming", deliveryStatus: "read", senderId: null },
    { conversationId: conversations[4].id, content: "Oi, Ricardo! Que bom que está pensando na renovação! Vou verificar as condições especiais para clientes fiéis.", messageType: "outgoing", deliveryStatus: "read", senderId: agent1Id },
    { conversationId: conversations[4].id, content: "Temos uma promoção especial de 20% de desconto para renovações anuais.", messageType: "outgoing", deliveryStatus: "read", senderId: agent1Id },
    { conversationId: conversations[4].id, content: "Isso é ótimo! E tenho mais usuários para adicionar também.", messageType: "incoming", deliveryStatus: "read", senderId: null },
    { conversationId: conversations[4].id, content: "Perfeito! Podemos incluir mais slots no mesmo contrato.", messageType: "outgoing", deliveryStatus: "delivered", senderId: agent1Id },
    { conversationId: conversations[4].id, content: "Quantos usuários adicionais você precisa?", messageType: "outgoing", deliveryStatus: "sent", senderId: agent1Id },
    { conversationId: conversations[4].id, content: "Mais 5 usuários. Pode ser?", messageType: "incoming", deliveryStatus: "read", senderId: null },
  ]);

  console.log("Messages seeded!");
  console.log("\n=== SEED COMPLETE ===");
  console.log("Login with: admin@chatflow.com / admin123");
  console.log("Or: carlos@chatflow.com / agent123");
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
