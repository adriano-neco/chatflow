import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button, Input, Avatar } from '@/components/ui';
import { useAuth } from '@/hooks/use-app-data';
import { apiFetch } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Building, Users, Inbox as InboxIcon, Tag, Link as LinkIcon,
  Settings as SettingsIcon, Smartphone, Plus, Trash2, RefreshCw,
  Wifi, WifiOff, Loader2, QrCode, CheckCircle2, AlertCircle,
  X, ChevronRight, Power, PowerOff, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { io as socketIO } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

/* ─────────────────────────────── Types ─────────────────────── */
interface WppInstance {
  id: number;
  name: string;
  sessionName: string;
  baseUrl: string;
  status: string;
  qrCode?: string | null;
  connectedPhone?: string | null;
  webhookUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ─────────────────────────────── Status helpers ─────────────── */
const STATUS_LABELS: Record<string, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando...',
  qr_pending: 'Aguardando QR',
  connected: 'Conectado',
  error: 'Erro',
};

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; icon: React.ReactNode }> = {
    connected:    { cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    qr_pending:   { cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: <QrCode className="w-3 h-3" /> },
    connecting:   { cls: 'bg-[#25D366]/15 text-[#1DAE55] border-[#25D366]/30', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    disconnected: { cls: 'bg-muted text-muted-foreground border-border', icon: <WifiOff className="w-3 h-3" /> },
    error:        { cls: 'bg-red-500/15 text-red-600 border-red-500/30', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const { cls, icon } = cfg[status] ?? cfg.disconnected;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', cls)}>
      {icon}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/* ─────────────────────────────── Create Instance Dialog ─────── */
function CreateInstanceDialog({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [form, setForm] = useState({ name: '', baseUrl: '', secretKey: '' });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.baseUrl || !form.secretKey) {
      toast.error('Preencha todos os campos');
      return;
    }
    const sessionName = form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setLoading(true);
    try {
      const res = await apiFetch('/api/instances', {
        method: 'POST',
        body: JSON.stringify({ ...form, sessionName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar instância');
      toast.success(`Instância "${data.name}" criada!`);
      onCreate();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Nova Instância WhatsApp</h3>
              <p className="text-sm text-muted-foreground">Conecte via WPP-Connect Server</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <Input label="Nome da Instância" placeholder="Atendimento Principal" value={form.name} onChange={set('name')} required />
          <Input
            label="URL do WPP-Connect Server"
            placeholder="http://seu-servidor:21465"
            value={form.baseUrl}
            onChange={set('baseUrl')}
            required
          />
          <Input
            label="Chave Secreta (Secret Key)"
            type="password"
            placeholder="sua-chave-secreta"
            value={form.secretKey}
            onChange={set('secretKey')}
            required
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" isLoading={loading}>
              Criar Instância
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────── QR Code Modal ─────────────── */
function QrModal({ instance, onClose, onConnected }: { instance: WppInstance; onClose: () => void; onConnected: () => void }) {
  const [qr, setQr] = useState<string | null>(instance.qrCode ?? null);
  const [status, setStatus] = useState(instance.status);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/instances/${instance.id}/qr`);
      const data = await res.json();
      setStatus(data.status);
      if (data.qrCode) setQr(data.qrCode);
      if (data.status === 'connected') {
        onConnected();
        onClose();
      }
    } catch {}
  }, [instance.id, onClose, onConnected]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [poll]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-bold">Escanear QR Code</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{instance.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          <StatusBadge status={status} />

          <div className="w-64 h-64 rounded-2xl border-2 border-border overflow-hidden flex items-center justify-center bg-white relative">
            {status === 'connected' ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-16 h-16 text-[#25D366]" />
                <p className="text-sm font-semibold text-[#25D366]">Conectado!</p>
              </div>
            ) : qr ? (
              <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR Code" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin text-[#25D366]" />
                <p className="text-xs text-center">Aguardando QR Code do servidor...</p>
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-medium">Abra o WhatsApp no seu celular</p>
            <p className="text-xs text-muted-foreground">Vá em <strong>Dispositivos Conectados</strong> e escaneie o código</p>
          </div>

          <Button variant="outline" size="sm" onClick={poll} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────── Instance Card ─────────────── */
function InstanceCard({
  instance,
  onRefresh,
}: {
  instance: WppInstance;
  onRefresh: () => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localStatus, setLocalStatus] = useState(instance.status);
  const [localQr, setLocalQr] = useState(instance.qrCode ?? null);

  useEffect(() => {
    setLocalStatus(instance.status);
    setLocalQr(instance.qrCode ?? null);
  }, [instance.status, instance.qrCode]);

  const connect = async () => {
    setConnecting(true);
    try {
      const res = await apiFetch(`/api/instances/${instance.id}/connect`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Falha ao conectar');
      setLocalStatus(data.status ?? 'qr_pending');
      if (data.qrCode) setLocalQr(data.qrCode);
      setShowQr(true);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await apiFetch(`/api/instances/${instance.id}/disconnect`, { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao desconectar');
      setLocalStatus('disconnected');
      setLocalQr(null);
      onRefresh();
      toast.success('Instância desconectada');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const deleteInstance = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/instances/${instance.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
      onRefresh();
      toast.success('Instância excluída');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isConnected = localStatus === 'connected';
  const isPending = localStatus === 'qr_pending';
  const isConnecting = localStatus === 'connecting' || connecting;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
            isConnected ? 'bg-[#25D366]/15' : isPending ? 'bg-amber-500/15' : 'bg-muted',
          )}>
            <Smartphone className={cn(
              'w-6 h-6',
              isConnected ? 'text-[#25D366]' : isPending ? 'text-amber-500' : 'text-muted-foreground',
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-semibold truncate">{instance.name}</h4>
              <StatusBadge status={localStatus} />
            </div>
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-mono">{instance.sessionName}</span> · {instance.baseUrl}
            </p>
            {isConnected && instance.connectedPhone && (
              <p className="text-xs text-[#25D366] font-medium mt-1 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                {instance.connectedPhone}
              </p>
            )}
          </div>
        </div>

        {/* QR code inline when pending */}
        <AnimatePresence>
          {isPending && localQr && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">Escaneie o QR Code com o WhatsApp</p>
                <div className="w-48 h-48 bg-white rounded-xl overflow-hidden border border-border p-1">
                  <img
                    src={localQr.startsWith('data:') ? localQr : `data:image/png;base64,${localQr}`}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          {!isConnected && !isPending && !isConnecting && (
            <Button size="sm" onClick={connect} isLoading={connecting} className="gap-1.5 bg-[#25D366] hover:bg-[#1DAE55] text-white border-0">
              <Power className="w-3.5 h-3.5" />
              Conectar
            </Button>
          )}

          {isPending && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowQr(true)} className="gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                Ver QR
              </Button>
              <Button size="sm" variant="outline" onClick={disconnect} isLoading={disconnecting} className="gap-1.5">
                <X className="w-3.5 h-3.5" />
                Cancelar
              </Button>
            </>
          )}

          {isConnected && (
            <Button size="sm" variant="outline" onClick={disconnect} isLoading={disconnecting} className="gap-1.5">
              <PowerOff className="w-3.5 h-3.5" />
              Desconectar
            </Button>
          )}

          {isConnecting && !isConnected && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Iniciando sessão...
            </div>
          )}

          <div className="flex-1" />

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-destructive font-medium">Confirmar?</span>
              <button onClick={deleteInstance} className="px-2 py-1 rounded bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors" disabled={deleting}>
                {deleting ? '...' : 'Sim'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/70">
                Não
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showQr && (
          <QrModal
            instance={{ ...instance, status: localStatus, qrCode: localQr }}
            onClose={() => setShowQr(false)}
            onConnected={() => { setLocalStatus('connected'); setLocalQr(null); onRefresh(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────────── Instances Section ─────────── */
function InstancesSection() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: instances = [], isLoading, refetch } = useQuery<WppInstance[]>({
    queryKey: ['instances'],
    queryFn: async () => {
      const res = await apiFetch('/api/instances');
      if (!res.ok) throw new Error('Falha ao carregar instâncias');
      return res.json();
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    const socket: Socket = socketIO({ path: '/api/socket.io', transports: ['websocket'] });
    socket.on('instance:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    });
    return () => { socket.disconnect(); };
  }, [queryClient]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-bold font-display mb-1">Instâncias WhatsApp</h3>
          <p className="text-muted-foreground text-sm">
            Gerencie suas conexões com WPP-Connect Server. Cada instância representa uma conta WhatsApp conectada.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Nova Instância
        </Button>
      </div>

      {/* Info card */}
      <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-2xl p-5 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-[#25D366]" />
        </div>
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold text-[#25D366]">Como funciona</p>
          <ol className="text-muted-foreground space-y-1 list-decimal list-inside text-xs">
            <li>Instale e execute o <strong>WPP-Connect Server</strong> na sua infra</li>
            <li>Cadastre a URL e a chave secreta do servidor aqui</li>
            <li>Clique em "Conectar" e escaneie o QR Code com o WhatsApp</li>
            <li>Mensagens recebidas aparecerão automaticamente em Conversas (ID = <code className="bg-muted px-1 rounded">número@c.us</code>)</li>
            <li>Mensagens enviadas pelo chat são encaminhadas automaticamente ao WhatsApp</li>
          </ol>
        </div>
      </div>

      {/* Instance list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando instâncias...
        </div>
      ) : instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed border-border rounded-2xl">
          <Smartphone className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="font-semibold">Nenhuma instância cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Conecte seu WhatsApp Business para começar a atender</p>
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar primeira instância
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {instances.map(inst => (
            <InstanceCard key={inst.id} instance={inst} onRefresh={refetch} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateInstanceDialog
            onClose={() => setShowCreate(false)}
            onCreate={refetch}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────── Settings nav ───────────────── */
const SETTINGS_SECTIONS = [
  { id: 'general',      label: 'Geral',            icon: Building },
  { id: 'profile',      label: 'Meu Perfil',        icon: User },
  { id: 'agents',       label: 'Agentes',           icon: Users },
  { id: 'inboxes',      label: 'Caixas de Entrada', icon: InboxIcon },
  { id: 'instances',    label: 'Instâncias WA',     icon: Smartphone },
  { id: 'labels',       label: 'Etiquetas',         icon: Tag },
  { id: 'integrations', label: 'Integrações',       icon: LinkIcon },
];

/* ─────────────────────────────── Main Settings ─────────────── */
export function Settings() {
  const [activeSection, setActiveSection] = useState('instances');
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
        <div className="w-64 border-r border-border bg-card/30 flex-col hidden md:flex">
          <div className="p-6">
            <h2 className="text-xl font-display font-bold">Configurações</h2>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {SETTINGS_SECTIONS.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  activeSection === sec.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <sec.icon className="w-4 h-4 shrink-0" />
                {sec.label}
                {sec.id === 'instances' && (
                  <span className="ml-auto text-[10px] font-bold bg-[#25D366]/20 text-[#25D366] px-1.5 rounded-full">WA</span>
                )}
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
                  <Button size="lg" onClick={handleSave} isLoading={isSaving}>Salvar Alterações</Button>
                </div>
              </div>
            )}

            {activeSection === 'instances' && <InstancesSection />}

            {activeSection !== 'profile' && activeSection !== 'instances' && (
              <div className="flex flex-col items-center justify-center h-64 text-center animate-in fade-in duration-500">
                <SettingsIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold">Em construção</h3>
                <p className="text-muted-foreground">
                  A seção "{SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label}" estará disponível em breve.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
