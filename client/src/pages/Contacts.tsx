import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppContacts } from '@/hooks/use-app-data';
import { Avatar, Button, Input, Modal } from '@/components/ui';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, Plus, Edit2, Trash2, MessageSquare,
  Phone, Mail, MapPin, Building2, Users,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getInitials, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const contactSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
});
type ContactForm = z.infer<typeof contactSchema>;

async function apiRequest(method: string, path: string, body?: any) {
  const token = localStorage.getItem('chatflow_token');
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-400 to-rose-500',
  'from-sky-400 to-blue-600',
  'from-pink-400 to-fuchsia-600',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-sky-500',
  'from-lime-400 to-green-600',
];

function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: any;
  onEdit: (c: any) => void;
  onDelete: (c: any) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
    >
      {/* Avatar / Photo */}
      <div className="shrink-0">
        {contact.avatarUrl ? (
          <img
            src={contact.avatarUrl}
            alt={contact.name}
            className="w-16 h-16 rounded-2xl object-cover border border-border shadow-sm"
          />
        ) : (
          <div className={cn(
            'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-sm text-white font-bold text-lg select-none',
            avatarGradient(contact.name),
          )}>
            {getInitials(contact.name)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">{contact.name}</h3>
            {contact.company && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <Building2 className="w-3 h-3 shrink-0" />
                {contact.company}
              </p>
            )}
          </div>
          {/* Conversation count badge */}
          <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            <MessageSquare className="w-3 h-3" />
            {contact.conversationsCount}
          </span>
        </div>

        <div className="mt-2 space-y-0.5">
          {contact.email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
              <Mail className="w-3 h-3 shrink-0 text-primary/70" />
              {contact.email}
            </p>
          )}
          {contact.phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3 h-3 shrink-0 text-primary/70" />
              {contact.phone}
            </p>
          )}
          {contact.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
              <MapPin className="w-3 h-3 shrink-0 text-primary/70" />
              {contact.location}
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/60">
            {format(new Date(contact.createdAt), "dd MMM yyyy", { locale: ptBR })}
          </span>
          {/* Action buttons — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(contact)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Editar"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(contact)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const { contacts, isLoading, refetch } = useAppContacts(searchTerm || undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const openNew = () => {
    setEditingContact(null);
    reset({ name: '', email: '', phone: '', company: '', location: '' });
    setIsModalOpen(true);
  };

  const openEdit = (contact: any) => {
    setEditingContact(contact);
    setValue('name', contact.name);
    setValue('email', contact.email || '');
    setValue('phone', contact.phone || '');
    setValue('company', contact.company || '');
    setValue('location', contact.location || '');
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ContactForm) => {
    try {
      if (editingContact) {
        await apiRequest('PUT', `/api/contacts/${editingContact.id}`, data);
      } else {
        await apiRequest('POST', '/api/contacts', data);
      }
      setIsModalOpen(false);
      reset();
      refetch();
    } catch {
      alert('Erro ao salvar contato. Tente novamente.');
    }
  };

  const handleDelete = async (contact: any) => {
    try {
      await apiRequest('DELETE', `/api/contacts/${contact.id}`);
      setDeleteConfirm(null);
      refetch();
    } catch {
      alert('Erro ao excluir contato.');
    }
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background">
        {/* Header bar */}
        <div className="flex-none px-6 py-5 border-b border-border bg-card/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {isLoading ? 'Carregando...' : `${filtered.length} contato${filtered.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Buscar contato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56 transition-all"
                />
              </div>
              <Button onClick={openNew} className="shrink-0 gap-2">
                <Plus className="w-4 h-4" />
                Novo Contato
              </Button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-16 h-16 rounded-2xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2.5 bg-muted rounded w-1/2" />
                    <div className="h-2.5 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-foreground">
                {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Nenhum contato ainda'}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {searchTerm ? 'Tente outro termo de busca.' : 'Comece adicionando seu primeiro contato.'}
              </p>
              {!searchTerm && (
                <Button onClick={openNew} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Criar primeiro contato
                </Button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filtered.map(contact => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onEdit={openEdit}
                    onDelete={setDeleteConfirm}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); reset(); }}
        title={editingContact ? 'Editar Contato' : 'Novo Contato'}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setIsModalOpen(false); reset(); }}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
              {editingContact ? 'Salvar Alterações' : 'Criar Contato'}
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input label="Nome completo *" placeholder="Ex: João Silva" {...register('name')} error={errors.name?.message} />
          <Input label="E-mail" type="email" placeholder="joao@empresa.com" {...register('email')} error={errors.email?.message} />
          <Input label="Telefone" placeholder="+55 11 99999-0000" {...register('phone')} />
          <Input label="Empresa" placeholder="Nome da empresa" {...register('company')} />
          <Input label="Localização" placeholder="São Paulo, SP" {...register('location')} />
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir Contato"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>Confirmar Exclusão</Button>
          </>
        }
      >
        <p className="text-muted-foreground">
          Tem certeza que deseja excluir <strong className="text-foreground">{deleteConfirm?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </AppLayout>
  );
}
