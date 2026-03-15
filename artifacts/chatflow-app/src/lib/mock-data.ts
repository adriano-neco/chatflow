// Fallback mock data in case the API is not connected yet
export const MOCK_USERS = [
  { id: 1, name: "Ana Silva", email: "ana@chatflow.com", role: "admin", createdAt: "2024-01-01T10:00:00Z" },
  { id: 2, name: "Carlos Mendes", email: "carlos@chatflow.com", role: "agent", createdAt: "2024-01-15T10:00:00Z" },
];

export const MOCK_CONTACTS = [
  { id: 1, name: "João Pedro", email: "joao@exemplo.com", phone: "+55 11 99999-1111", company: "TechCorp", location: "São Paulo, SP", conversationsCount: 3, createdAt: "2024-02-01T14:30:00Z" },
  { id: 2, name: "Maria Clara", email: "maria@empresa.com", phone: "+55 21 98888-2222", company: "Inovadora SA", location: "Rio de Janeiro, RJ", conversationsCount: 1, createdAt: "2024-02-05T09:15:00Z" },
  { id: 3, name: "Roberto Alves", email: "roberto@startup.io", phone: "+55 31 97777-3333", company: "Startup.io", location: "Belo Horizonte, MG", conversationsCount: 0, createdAt: "2024-02-10T16:45:00Z" },
  { id: 4, name: "Fernanda Costa", email: "fernanda@loja.com.br", phone: "+55 41 96666-4444", company: "Loja Virtual", location: "Curitiba, PR", conversationsCount: 5, createdAt: "2024-02-12T11:20:00Z" },
  { id: 5, name: "Lucas Santos", email: "lucas@dev.com", phone: "+55 51 95555-5555", company: "DevWorks", location: "Porto Alegre, RS", conversationsCount: 2, createdAt: "2024-02-14T08:00:00Z" },
];

export const MOCK_CONVERSATIONS = [
  {
    id: 101,
    status: "open",
    channel: "whatsapp",
    priority: "high",
    subject: "Problema com pagamento",
    unreadCount: 2,
    contact: MOCK_CONTACTS[0],
    assignee: MOCK_USERS[0],
    labels: ["suporte", "financeiro"],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 60000 * 5).toISOString(),
    lastMessage: {
      id: 1001,
      conversationId: 101,
      content: "Não estou conseguindo finalizar a compra.",
      messageType: "incoming",
      createdAt: new Date(Date.now() - 60000 * 5).toISOString(),
    }
  },
  {
    id: 102,
    status: "pending",
    channel: "email",
    priority: "medium",
    subject: "Dúvida sobre integração",
    unreadCount: 0,
    contact: MOCK_CONTACTS[1],
    assignee: MOCK_USERS[1],
    labels: ["dúvida", "api"],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    lastMessage: {
      id: 1002,
      conversationId: 102,
      content: "Nossa equipe técnica vai analisar e retornar em breve.",
      messageType: "outgoing",
      sender: MOCK_USERS[1],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    }
  },
  {
    id: 103,
    status: "resolved",
    channel: "chat",
    priority: "low",
    subject: "Troca de senha",
    unreadCount: 0,
    contact: MOCK_CONTACTS[3],
    assignee: MOCK_USERS[0],
    labels: ["acesso"],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    lastMessage: {
      id: 1003,
      conversationId: 103,
      content: "Obrigada, consegui redefinir minha senha!",
      messageType: "incoming",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    }
  }
];

export const MOCK_MESSAGES = {
  101: [
    { id: 1, conversationId: 101, content: "Olá, boa tarde.", messageType: "incoming", createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 2, conversationId: 101, content: "Boa tarde, João! Como podemos ajudar?", messageType: "outgoing", sender: MOCK_USERS[0], createdAt: new Date(Date.now() - 3600000 * 1.9).toISOString() },
    { id: 3, conversationId: 101, content: "Não estou conseguindo finalizar a compra.", messageType: "incoming", createdAt: new Date(Date.now() - 60000 * 5).toISOString() },
  ],
  102: [
    { id: 4, conversationId: 102, content: "Vocês têm documentação da API em Ruby?", messageType: "incoming", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 5, conversationId: 102, content: "Nossa equipe técnica vai analisar e retornar em breve.", messageType: "outgoing", sender: MOCK_USERS[1], createdAt: new Date(Date.now() - 3600000).toISOString() },
  ],
  103: [
    { id: 6, conversationId: 103, content: "Esqueci minha senha.", messageType: "incoming", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 7, conversationId: 103, content: "Enviamos um link de recuperação para seu email.", messageType: "outgoing", sender: MOCK_USERS[0], createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString() },
    { id: 8, conversationId: 103, content: "Obrigada, consegui redefinir minha senha!", messageType: "incoming", createdAt: new Date(Date.now() - 86400000).toISOString() },
  ]
};
