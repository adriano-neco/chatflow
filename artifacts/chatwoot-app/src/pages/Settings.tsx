import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button, Input, Avatar } from '@/components/ui';
import { useAuth } from '@/hooks/use-app-data';
import { User, Building, Users, Inbox as InboxIcon, Tag, Link as LinkIcon, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const SETTINGS_SECTIONS = [
  { id: 'general', label: 'Geral', icon: Building },
  { id: 'profile', label: 'Meu Perfil', icon: User },
  { id: 'agents', label: 'Agentes', icon: Users },
  { id: 'inboxes', label: 'Caixas de Entrada', icon: InboxIcon },
  { id: 'labels', label: 'Etiquetas', icon: Tag },
  { id: 'integrations', label: 'Integrações', icon: LinkIcon },
];

export function Settings() {
  const [activeSection, setActiveSection] = useState('profile');
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 800);
  };

  return (
    <AppLayout>
      <div className="flex h-full bg-background">
        {/* Inner Sidebar */}
        <div className="w-64 border-r border-border bg-card/30 flex flex-col hidden md:flex">
          <div className="p-6">
            <h2 className="text-xl font-display font-bold">Configurações</h2>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {SETTINGS_SECTIONS.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  activeSection === sec.id 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <sec.icon className="w-4 h-4 shrink-0" />
                {sec.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-3xl mx-auto">
            {activeSection === 'profile' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h3 className="text-2xl font-bold font-display mb-1">Meu Perfil</h3>
                  <p className="text-muted-foreground">Gerencie suas informações pessoais e credenciais.</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
                    <Avatar initials="AS" src={user?.avatarUrl} className="w-24 h-24 text-3xl" />
                    <div>
                      <Button variant="outline" className="mb-2">Alterar foto</Button>
                      <p className="text-xs text-muted-foreground">JPG, GIF ou PNG. Tamanho máximo 2MB.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Input label="Nome Completo" defaultValue={user?.name} />
                      <Input label="E-mail" type="email" defaultValue={user?.email} />
                    </div>
                    
                    <div className="pt-4">
                      <h4 className="font-semibold mb-4">Alterar Senha</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input label="Senha Atual" type="password" />
                        <Input label="Nova Senha" type="password" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="lg" onClick={handleSave} isLoading={isSaving}>
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            )}

            {activeSection !== 'profile' && (
              <div className="flex flex-col items-center justify-center h-64 text-center animate-in fade-in duration-500">
                <SettingsIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold">Em construção</h3>
                <p className="text-muted-foreground">A seção "{SETTINGS_SECTIONS.find(s=>s.id === activeSection)?.label}" estará disponível em breve.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
