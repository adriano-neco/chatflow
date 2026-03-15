import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppContacts } from '@/hooks/use-app-data';
import { Avatar, Button, Input, Modal, Badge } from '@/components/ui';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Plus, Edit2, Trash2, MessageSquare, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getInitials } from '@/lib/utils';

const contactSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
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
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

export function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const { contacts, isLoading, refetch } = useAppContacts(searchTerm || undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema)
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
    setActionMenu(null);
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
    } catch (e) {
      alert('Erro ao salvar contato. Tente novamente.');
    }
  };

  const handleDelete = async (contact: any) => {
    try {
      await apiRequest('DELETE', `/api/contacts/${contact.id}`);
      setDeleteConfirm(null);
      setActionMenu(null);
      refetch();
    } catch (e) {
      alert('Erro ao excluir contato.');
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="flex h-full bg-background">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-none p-6 border-b border-border bg-card/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
                <p className="text-muted-foreground mt-0.5 text-sm">Gerencie todos os seus clientes em um só lugar.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Buscar contato..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-56 transition-all"
                  />
                </div>
                <Button onClick={openNew} className="shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Contato
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3.5 font-medium">Nome</th>
                    <th className="px-6 py-3.5 font-medium hidden md:table-cell">E-mail / Telefone</th>
                    <th className="px-6 py-3.5 font-medium hidden lg:table-cell">Empresa</th>
                    <th className="px-6 py-3.5 font-medium hidden xl:table-cell">Localização</th>
                    <th className="px-6 py-3.5 font-medium text-center">Conversas</th>
                    <th className="px-6 py-3.5 font-medium hidden sm:table-cell">Criado em</th>
                    <th className="px-6 py-3.5 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
                  ) : filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-14 text-muted-foreground">
                        <div className="flex flex-col items-center">
                          <Search className="w-10 h-10 mb-3 opacity-20" />
                          <p>Nenhum contato encontrado{searchTerm ? ` para "${searchTerm}"` : ''}.</p>
                          {!searchTerm && <Button onClick={openNew} variant="outline" className="mt-4">Criar primeiro contato</Button>}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map(contact => (
                      <tr 
                        key={contact.id} 
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => setSelectedContact(selectedContact?.id === contact.id ? null : contact)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar initials={getInitials(contact.name)} src={contact.avatarUrl} className="w-9 h-9" />
                            <div>
                              <div className="font-semibold text-foreground">{contact.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="space-y-0.5">
                            {contact.email && (
                              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                <Mail className="w-3 h-3" />{contact.email}
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                <Phone className="w-3 h-3" />{contact.phone}
                              </div>
                            )}
                            {!contact.email && !contact.phone && <span className="text-muted-foreground">-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          {contact.company ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <Building2 className="w-3 h-3" />{contact.company}
                            </div>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-6 py-4 hidden xl:table-cell">
                          {contact.location ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <MapPin className="w-3 h-3" />{contact.location}
                            </div>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="font-mono text-xs">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {contact.conversationsCount}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell text-muted-foreground text-xs">
                          {format(new Date(contact.createdAt), "dd MMM yyyy", { locale: ptBR })}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEdit(contact)}
                              className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(contact)}
                              className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filteredContacts.length > 0 && (
                <div className="px-6 py-3 bg-muted/30 border-t border-border text-sm text-muted-foreground">
                  {filteredContacts.length} contato{filteredContacts.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel - selected contact details */}
        {selectedContact && (
          <div className="w-72 border-l border-border bg-card/30 flex flex-col overflow-y-auto shrink-0">
            <div className="p-6">
              <div className="flex flex-col items-center text-center mb-6 pb-6 border-b border-border">
                <Avatar initials={getInitials(selectedContact.name)} src={selectedContact.avatarUrl} className="w-20 h-20 text-2xl mb-3 shadow-md" />
                <h3 className="font-bold text-lg">{selectedContact.name}</h3>
                {selectedContact.email && <p className="text-sm text-muted-foreground">{selectedContact.email}</p>}
                {selectedContact.company && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Building2 className="w-3 h-3" />{selectedContact.company}</p>}
              </div>

              <div className="space-y-5">
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Informações de Contato</h4>
                  <div className="space-y-2 text-sm">
                    {selectedContact.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span className="truncate">{selectedContact.email}</span>
                      </div>
                    )}
                    {selectedContact.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4 shrink-0" />
                        <span>{selectedContact.phone}</span>
                      </div>
                    )}
                    {selectedContact.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>{selectedContact.location}</span>
                      </div>
                    )}
                    {!selectedContact.email && !selectedContact.phone && !selectedContact.location && (
                      <p className="text-muted-foreground text-xs">Sem informações de contato.</p>
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estatísticas</h4>
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{selectedContact.conversationsCount}</div>
                    <div className="text-xs text-muted-foreground mt-1">conversas no total</div>
                  </div>
                </section>

                <div className="pt-2 space-y-2">
                  <Button onClick={() => openEdit(selectedContact)} variant="outline" className="w-full">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar Contato
                  </Button>
                  <Button onClick={() => setDeleteConfirm(selectedContact)} variant="danger" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Contato
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
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
          <Input
            label="Nome completo *"
            placeholder="Ex: João Silva"
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="joao@empresa.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Telefone"
            placeholder="+55 11 99999-0000"
            {...register('phone')}
          />
          <Input
            label="Empresa"
            placeholder="Nome da empresa"
            {...register('company')}
          />
          <Input
            label="Localização"
            placeholder="São Paulo, SP"
            {...register('location')}
          />
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
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
