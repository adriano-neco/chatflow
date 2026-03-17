import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppConversations, useAppMessages, useAuth } from '@/hooks/use-app-data';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, MoreVertical, Send, Smile, Inbox, Phone, Video, MessageSquare,
  ArrowLeft, Mic, FileText, Image, Music, Film, Camera, X,
  Play, Pause, Download, ChevronRight, Reply, Forward,
  Copy, ArrowRightCircle, Check,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
// @ts-ignore – no types for jsmediatags
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

/* ─── helpers ─────────────────────────────────────────────── */
function formatConvTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'ontem';
  return format(d, 'dd/MM/yy');
}
function formatMsgDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'HOJE';
  if (isYesterday(d)) return 'ONTEM';
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
}
function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

/* ─── Types ─────────────────────────────────────────────── */
type MsgAttachment = {
  id?: number;
  type: string;
  url: string;
  name: string;
  size: number;
  mimeType?: string | null;
  metadata?: Record<string, any> | null;
};
type MsgReaction = {
  id?: number;
  messageId?: number;
  userId?: number;
  emoji: string;
};
type ReplyRef = {
  id: number;
  content: string;
  messageType: string;
  hasAttachment: boolean;
  attachmentType?: string;
};
type ChatMessage = {
  id: number;
  conversationId: number;
  content: string;
  messageType: string;
  deliveryStatus: string;
  isForwarded: boolean;
  replyTo?: ReplyRef | null;
  sender: any;
  attachments: MsgAttachment[];
  reactions: MsgReaction[];
  createdAt: string;
  _localFile?: File;
  _localMeta?: any;
};

/* ─── Read ID3 tags (returns base64 cover art) ───────────── */
async function readId3Tags(file: File): Promise<Record<string, string | undefined>> {
  return new Promise((resolve) => {
    try {
      jsmediatags.read(file, {
        onSuccess(tag: any) {
          const t = tag.tags ?? {};
          let coverUrl: string | undefined;
          if (t.picture) {
            const pic = t.picture;
            const bytes: number[] = pic.data;
            const u8 = new Uint8Array(bytes);
            let binary = '';
            const chunk = 8192;
            for (let i = 0; i < u8.length; i += chunk) {
              binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk) as unknown as number[]);
            }
            const b64 = btoa(binary);
            coverUrl = `data:${pic.format || 'image/jpeg'};base64,${b64}`;
          }
          resolve({
            title:  t.title  || undefined,
            artist: t.artist || undefined,
            album:  t.album  || undefined,
            year:   t.year   ? String(t.year) : undefined,
            track:  t.track  ? `Faixa ${t.track}` : undefined,
            coverUrl,
          });
        },
        onError() {
          resolve({});
        },
      });
    } catch {
      resolve({});
    }
  });
}

/* ─── WhatsApp ticks ─────────────────────────────────────── */
function MessageStatusIcon({ status }: { status: string }) {
  if (status === 'read') return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
      <path d="M12.5 1L5.5 8.5L2.5 5.5" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.5 1L9.5 8.5L8 7" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (status === 'delivered') return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
      <path d="M12.5 1L5.5 8.5L2.5 5.5" stroke="#8696A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.5 1L9.5 8.5L8 7" stroke="#8696A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M10 1L4.5 8L2 5.5" stroke="#8696A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─── Chat background ─────────────────────────────────────── */
function ChatBg() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cg opacity='.025' fill='%2300A884'%3E%3Ccircle cx='10' cy='10' r='3'/%3E%3Ccircle cx='40' cy='10' r='3'/%3E%3Ccircle cx='70' cy='10' r='3'/%3E%3Ccircle cx='25' cy='25' r='3'/%3E%3Ccircle cx='55' cy='25' r='3'/%3E%3Ccircle cx='10' cy='40' r='3'/%3E%3Ccircle cx='40' cy='40' r='3'/%3E%3Ccircle cx='70' cy='40' r='3'/%3E%3Ccircle cx='25' cy='55' r='3'/%3E%3Ccircle cx='55' cy='55' r='3'/%3E%3Ccircle cx='10' cy='70' r='3'/%3E%3Ccircle cx='40' cy='70' r='3'/%3E%3Ccircle cx='70' cy='70' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    }} />
  );
}

/* ─── Avatar ─────────────────────────────────────────────── */
const AVATAR_COLORS = ['#C8A2C8','#7EC8C8','#C8A87E','#A2C8A2','#C8A2A2','#A2A2C8','#C8C8A2','#A2C8C8','#C8B2A2','#B2A2C8'];
function getAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function ContactAvatar({ name, size = 48, className = '' }: { name: string; size?: number; className?: string }) {
  const bg = getAvatarColor(name);
  return (
    <div className={cn("rounded-full flex items-center justify-center text-white font-semibold shrink-0 select-none", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: bg }}>
      {getInitials(name)}
    </div>
  );
}

/* ─── Channel badge ─────────────────────────────────────── */
function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, [string, string]> = {
    email: ['#1D4ED8', '#DBEAFE'], whatsapp: ['#15803D', '#DCFCE7'],
    telegram: ['#0369A1', '#E0F2FE'], chat: ['#4B5563', '#F3F4F6'],
  };
  const [color, bg] = map[channel] ?? map.chat;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: bg, color }}>
      {channel === 'email' ? 'Email' : channel === 'whatsapp' ? 'WA' : channel === 'telegram' ? 'TG' : 'Chat'}
    </span>
  );
}

/* ─── Image Message ─────────────────────────────────────── */
function ImageMsg({ src, name, onLightbox }: { src: string; name?: string; onLightbox?: (src: string) => void }) {
  return (
    <div className="rounded-lg overflow-hidden cursor-pointer group relative" style={{ maxWidth: 280, minWidth: 120 }}
      onClick={() => onLightbox?.(src)}>
      <img src={src} alt={name || 'imagem'} className="w-full object-cover max-h-[240px]" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <Download className="w-6 h-6 text-white drop-shadow" />
      </div>
    </div>
  );
}

/* ─── Video Message ─────────────────────────────────────── */
function VideoMsg({ src, name, meta }: { src: string; name?: string; meta?: { duration?: number; width?: number; height?: number } }) {
  const [playing, setPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(meta?.duration || 0);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(meta?.width ? { w: meta.width, h: meta.height! } : null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play().catch(() => {}); setPlaying(true); }
  };

  return (
    <div className="rounded-lg overflow-hidden bg-black cursor-pointer group relative" style={{ maxWidth: 280, minWidth: 180 }}>
      <video
        ref={videoRef}
        src={src}
        className="w-full max-h-[220px] object-cover"
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (!v) return;
          setVideoDuration(v.duration);
          setDims({ w: v.videoWidth, h: v.videoHeight });
        }}
        onEnded={() => setPlaying(false)}
        controls={playing}
        preload="metadata"
      />
      {!playing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors" onClick={toggle}>
          <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center shadow-lg">
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          </div>
          {(videoDuration > 0 || dims) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-3 py-2 flex items-center justify-between">
              {videoDuration > 0 && <span className="text-white text-[11px]">{formatDuration(videoDuration)}</span>}
              {dims && <span className="text-white/70 text-[10px]">{dims.w}×{dims.h}</span>}
            </div>
          )}
        </div>
      )}
      {name && !playing && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 px-2 py-1.5 text-white text-[11px] truncate">{name}</div>
      )}
    </div>
  );
}

/* ─── Audio Player ────────────────────────────────────────── */
function AudioMsgPlayer({ src, isOut }: { src: string; isOut: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ minWidth: 220, maxWidth: 280, background: isOut ? 'rgba(0,168,132,0.2)' : 'rgba(255,255,255,0.07)' }}>
      <audio ref={audioRef} src={src}
        onTimeUpdate={() => setProgress((audioRef.current?.currentTime || 0) / (audioRef.current?.duration || 1))}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow"
        style={{ background: '#00A884' }}>
        {playing ? <Pause className="w-4 h-4 text-white" fill="white" /> : <Play className="w-4 h-4 text-white ml-0.5" fill="white" />}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="relative h-1.5 rounded-full overflow-hidden cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.15)' }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const p = (e.clientX - r.left) / r.width;
            if (audioRef.current) { audioRef.current.currentTime = p * audioRef.current.duration; setProgress(p); }
          }}>
          <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: '#00A884' }} />
        </div>
        <div className="flex justify-between">
          <span className="text-[11px]" style={{ color: 'var(--chat-text-secondary)' }}>{formatDuration((audioRef.current?.currentTime || 0))}</span>
          <span className="text-[11px]" style={{ color: 'var(--chat-text-secondary)' }}>{formatDuration(duration)}</span>
        </div>
      </div>
      <Mic className="w-4 h-4 shrink-0" style={{ color: 'var(--chat-text-secondary)' }} />
    </div>
  );
}

/* ─── Music Player with ID3 tags ─────────────────────────── */
function MusicMsgPlayer({ src, meta, isOut }: {
  src: string;
  meta?: Record<string, any>;
  isOut: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  };

  const title  = meta?.title  || 'Áudio';
  const artist = meta?.artist;
  const album  = meta?.album;
  const year   = meta?.year;
  const track  = meta?.track;
  const cover  = meta?.coverUrl;
  const hasTags = !!(meta?.title || meta?.artist || meta?.album);

  const accentA = isOut ? '#128C7E' : '#1a3a4a';
  const accentB = isOut ? '#075E54' : '#0d2233';

  return (
    <div style={{ minWidth: 272, maxWidth: 320, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.5)' }}>
      <div style={{ background: `linear-gradient(135deg, ${accentA}, ${accentB})`, padding: '12px 12px 10px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.4)' }}>
            {cover ? <img src={cover} alt="capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   : <Music style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.5)' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{title}</p>
            {artist && <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>{artist}</p>}
            {album && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album}{year ? ` · ${year}` : ''}</p>}
            {!hasTags && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>Sem tags ID3</p>}
            {track && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1 }}>{track}</p>}
          </div>
          <span style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em', alignSelf: 'flex-start', flexShrink: 0 }}>MP3</span>
        </div>
      </div>
      <div style={{ background: isOut ? 'rgba(0,92,75,0.9)' : 'rgba(32,44,51,0.97)', padding: '10px 12px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <audio ref={audioRef} src={src}
          onTimeUpdate={() => { const a = audioRef.current; if (!a) return; setCurrentTime(a.currentTime); setProgress(a.currentTime / (a.duration || 1)); }}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }} />
        <button onClick={toggle} style={{ width: 38, height: 38, borderRadius: '50%', background: '#00A884', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,.4)' }}>
          {playing ? <Pause style={{ width: 16, height: 16, color: '#fff', fill: '#fff' }} /> : <Play style={{ width: 16, height: 16, color: '#fff', fill: '#fff', marginLeft: 2 }} />}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ position: 'relative', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.18)', cursor: 'pointer', marginBottom: 5 }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
              if (audioRef.current) { audioRef.current.currentTime = p * audioRef.current.duration; setProgress(p); }
            }}>
            <div style={{ height: '100%', borderRadius: 2, background: '#00A884', width: `${progress * 100}%` }} />
            <div style={{ position: 'absolute', top: '50%', left: `${progress * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: '#00A884', boxShadow: '0 0 0 2px rgba(0,168,132,.3)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{formatDuration(currentTime)}</span>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Document Message ───────────────────────────────────── */
function DocumentMsg({ src, name, size }: { src: string; name: string; size: number }) {
  const ext = name.split('.').pop()?.toUpperCase() || 'DOC';
  const extColors: Record<string, string> = { PDF: '#FF5252', DOCX: '#2196F3', DOC: '#2196F3', XLSX: '#4CAF50', XLS: '#4CAF50', PPTX: '#FF9800', PPT: '#FF9800', TXT: '#607D8B', CSV: '#4CAF50' };
  const color = extColors[ext] || '#9C27B0';
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ minWidth: 220, maxWidth: 300, background: 'rgba(255,255,255,0.07)' }}>
      <div className="w-10 h-12 rounded-lg flex flex-col items-center justify-center shadow-sm shrink-0" style={{ background: color }}>
        <FileText className="w-5 h-5 text-white" />
        <span className="text-white text-[9px] font-bold mt-0.5">{ext}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--chat-text-primary)' }}>{name}</p>
        <p className="text-[11px]" style={{ color: 'var(--chat-text-secondary)' }}>{formatBytes(size)}</p>
      </div>
      <a href={src} download={name} target="_blank" rel="noreferrer"
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
        <Download className="w-4 h-4" style={{ color: 'var(--chat-text-secondary)' }} />
      </a>
    </div>
  );
}

/* ─── Attachment grid popup ─────────────────────────────── */
const ATTACH_ITEMS = [
  { id: 'document', icon: FileText, label: 'Documento', bg: '#29A71A', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv' },
  { id: 'camera',   icon: Camera,   label: 'Câmera',    bg: '#EB3352', accept: 'image/*;capture=camera' },
  { id: 'gallery',  icon: Image,    label: 'Imagem',    bg: '#9C27B0', accept: 'image/*,image/gif' },
  { id: 'video',    icon: Film,     label: 'Vídeo',     bg: '#E67E22', accept: 'video/*' },
  { id: 'audio',    icon: Mic,      label: 'Áudio',     bg: '#1A9CB0', accept: 'audio/*' },
  { id: 'music',    icon: Music,    label: 'Música',    bg: '#F59E0B', accept: 'audio/mpeg,audio/mp3,.mp3' },
];

function AttachmentGrid({ onFile, onClose }: { onFile: (type: string, file: File) => void; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentType, setCurrentType] = useState('');

  const pick = (item: typeof ATTACH_ITEMS[0]) => {
    setCurrentType(item.id);
    if (inputRef.current) { inputRef.current.accept = item.accept; inputRef.current.click(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onFile(currentType, f);
    e.target.value = '';
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute bottom-[72px] left-3 z-50 w-[280px] rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: 'var(--chat-surface2)', border: '1px solid var(--chat-active)' }}>
      <div className="px-4 pt-4 pb-2">
        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--chat-text-secondary)' }}>Enviar arquivo</p>
      </div>
      <div className="grid grid-cols-3 gap-3 p-3">
        {ATTACH_ITEMS.map(item => (
          <button key={item.id} onClick={() => pick(item)}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-white/5 active:scale-95 transition-all">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-md" style={{ background: item.bg }}>
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] font-medium" style={{ color: 'var(--chat-icon)' }}>{item.label}</span>
          </button>
        ))}
      </div>
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
    </motion.div>
  );
}

/* ─── Audio Recorder ────────────────────────────────────── */
function AudioRecorder({ onDone, onCancel }: { onDone: (blob: Blob, duration: number) => void; onCancel: () => void }) {
  const [secs, setSecs] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(30).fill(4));
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);
  const startRef = useRef(Date.now());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    let stream: MediaStream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ac = new AudioContext();
        const src = ac.createMediaStreamSource(stream);
        const analyser = ac.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        analyserRef.current = analyser;
        const mr = new MediaRecorder(stream);
        mrRef.current = mr;
        mr.ondataavailable = e => chunksRef.current.push(e.data);
        mr.start(100);
        startRef.current = Date.now();
        timerRef.current = window.setInterval(() => setSecs(Math.floor((Date.now() - startRef.current) / 1000)), 200);
        const animBars = () => {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          setBars(Array.from({ length: 30 }, (_, i) => Math.max(4, Math.round((data[Math.floor(i * data.length / 30)] / 255) * 36))));
          animRef.current = requestAnimationFrame(animBars);
        };
        animBars();
      } catch { onCancel(); }
    })();
    return () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animRef.current);
      mrRef.current?.stop();
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const stop = () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    const mr = mrRef.current;
    if (!mr) return;
    const duration = (Date.now() - startRef.current) / 1000;
    mr.onstop = () => onDone(new Blob(chunksRef.current, { type: 'audio/webm' }), duration);
    mr.stop();
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
      className="flex items-center gap-3 px-3 py-2 rounded-full flex-1" style={{ background: 'var(--chat-active)' }}>
      <button onClick={onCancel} className="p-1.5 rounded-full transition-colors" style={{ background: 'rgba(235,51,82,0.15)', color: '#EB3352' }}>
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-end gap-[2px] h-8 flex-1 justify-center">
        {bars.map((h, i) => (
          <div key={i} className="w-[3px] rounded-full transition-all duration-75" style={{ height: h, background: '#00A884', opacity: 0.4 + (h / 40) * 0.6 }} />
        ))}
      </div>
      <span className="text-[13px] font-mono font-semibold tabular-nums shrink-0" style={{ color: '#EB3352' }}>{formatDuration(secs)}</span>
      <button onClick={stop} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md" style={{ background: '#00A884' }}>
        <Send className="w-4 h-4 text-white" />
      </button>
    </motion.div>
  );
}

/* ─── Emoji Reaction Quick-Bar ────────────────────────────── */
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅'];

function EmojiQuickBar({ onReact }: { onReact: (emoji: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 6 }} transition={{ duration: 0.12 }}
      className="flex items-center gap-0.5 px-2 py-1.5 rounded-full shadow-xl z-50"
      style={{ background: 'var(--chat-surface2)', border: '1px solid var(--chat-active)' }}>
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => onReact(e)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:scale-125 active:scale-110 transition-transform text-xl">
          {e}
        </button>
      ))}
    </motion.div>
  );
}

/* ─── Context Menu ────────────────────────────────────────── */
type ContextMenuPos = { x: number; y: number; msg: ChatMessage };

function MessageContextMenu({ pos, onClose, onReply, onReact, onForward, onCopy }: {
  pos: ContextMenuPos;
  onClose: () => void;
  onReply: () => void;
  onReact: () => void;
  onForward: () => void;
  onCopy: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { icon: Reply, label: 'Responder', action: onReply },
    { icon: Smile, label: 'Reagir', action: onReact },
    { icon: Forward, label: 'Encaminhar', action: onForward },
    { icon: Copy, label: 'Copiar texto', action: onCopy },
  ];

  return (
    <div className="fixed z-[100]" style={{ top: pos.y, left: pos.x }}>
      <motion.div ref={menuRef} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.1 }}
        className="rounded-xl shadow-2xl overflow-hidden py-1 w-44"
        style={{ background: 'var(--chat-surface2)', border: '1px solid var(--chat-active)' }}>
        {items.map((item, i) => (
          <button key={i} onClick={() => { item.action(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/5"
            style={{ color: 'var(--chat-text-primary)' }}>
            <item.icon className="w-4 h-4 shrink-0" style={{ color: 'var(--chat-text-secondary)' }} />
            {item.label}
          </button>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Reactions Display ───────────────────────────────────── */
function ReactionsBar({ reactions, currentUserId, onReact }: {
  reactions: MsgReaction[];
  currentUserId?: number;
  onReact: (emoji: string) => void;
}) {
  if (!reactions || reactions.length === 0) return null;
  const grouped: Record<string, { count: number; byMe: boolean }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, byMe: false };
    grouped[r.emoji].count++;
    if (r.userId === currentUserId) grouped[r.emoji].byMe = true;
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, { count, byMe }]) => (
        <button key={emoji} onClick={() => onReact(emoji)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium transition-all hover:scale-105"
          style={{ background: byMe ? 'rgba(0,168,132,0.25)' : 'rgba(255,255,255,0.1)', border: `1px solid ${byMe ? '#00A884' : 'rgba(255,255,255,0.15)'}` }}>
          <span>{emoji}</span>
          {count > 1 && <span style={{ color: 'var(--chat-text-primary)' }}>{count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ─── Forward Modal ───────────────────────────────────────── */
function ForwardModal({ conversations, onClose, onForward }: {
  conversations: any[];
  onClose: () => void;
  onForward: (ids: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c =>
    c.contact.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: number) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2 }}
        className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ background: 'var(--chat-surface2)', border: '1px solid var(--chat-active)', maxHeight: '80vh' }}>

        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--chat-active)' }}>
          <div className="flex items-center gap-2">
            <Forward className="w-5 h-5" style={{ color: '#00A884' }} />
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--chat-text-primary)' }}>Encaminhar para</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" style={{ color: 'var(--chat-text-secondary)' }} />
          </button>
        </div>

        <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--chat-active)' }}>
          <div className="flex items-center gap-2 px-3 h-9 rounded-lg" style={{ background: 'var(--chat-wallpaper)' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--chat-text-secondary)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar conversa..." className="flex-1 bg-transparent text-[13px] focus:outline-none"
              style={{ color: 'var(--chat-text-primary)' }} />
          </div>
        </div>

        <div className="overflow-y-auto flex-1" style={{ maxHeight: 360 }}>
          {filtered.map(conv => (
            <button key={conv.id} onClick={() => toggle(conv.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
              style={{ borderBottom: '1px solid rgba(42,57,66,0.5)' }}>
              <div className="relative">
                <ContactAvatar name={conv.contact.name} size={40} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[14px] font-medium truncate" style={{ color: 'var(--chat-text-primary)' }}>{conv.contact.name}</p>
                <p className="text-[12px] truncate" style={{ color: 'var(--chat-text-secondary)' }}>{conv.lastMessage?.content || conv.subject || 'Nova conversa'}</p>
              </div>
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                selected.has(conv.id) ? "border-[#00A884] bg-[#00A884]" : "border-[#8696A0]")}>
                {selected.has(conv.id) && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-[13px]" style={{ color: 'var(--chat-text-secondary)' }}>Nenhuma conversa encontrada</p>
            </div>
          )}
        </div>

        <div className="px-4 py-4 flex items-center justify-between shrink-0" style={{ borderTop: '1px solid var(--chat-active)' }}>
          <span className="text-[13px]" style={{ color: 'var(--chat-text-secondary)' }}>
            {selected.size > 0 ? `${selected.size} selecionada${selected.size > 1 ? 's' : ''}` : 'Selecione conversas'}
          </span>
          <button
            onClick={() => { if (selected.size > 0) { onForward(Array.from(selected)); onClose(); } }}
            disabled={selected.size === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-semibold transition-all"
            style={{ background: selected.size > 0 ? '#00A884' : 'var(--chat-active)', color: selected.size > 0 ? '#fff' : 'var(--chat-text-secondary)' }}>
            <ArrowRightCircle className="w-4 h-4" />
            Encaminhar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Image Lightbox ──────────────────────────────────────── */
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}>
      <button className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 transition-colors" onClick={onClose}>
        <X className="w-5 h-5 text-white" />
      </button>
      <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        src={src} alt="full view" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()} />
      <a href={src} download className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium bg-white/10 hover:bg-white/20 text-white transition-colors" onClick={e => e.stopPropagation()}>
        <Download className="w-4 h-4" />
        Download
      </a>
    </div>
  );
}

/* ─── Reply Quote Bar (above input) ──────────────────────── */
function ReplyBar({ replyTo, onCancel }: { replyTo: ChatMessage; onCancel: () => void }) {
  const isOut = replyTo.messageType === 'outgoing';
  const att = replyTo.attachments?.[0];
  const preview = att
    ? att.type === 'image' ? '🖼 Imagem'
    : att.type === 'video' ? '🎬 Vídeo'
    : att.type === 'audio' ? '🎤 Áudio'
    : att.type === 'music' ? `🎵 ${att.metadata?.title || att.name}`
    : `📄 ${att.name}`
    : replyTo.content;

  return (
    <div className="flex items-center gap-2 px-3 pt-2 pb-1 shrink-0" style={{ borderTop: '1px solid var(--chat-active)' }}>
      <div className="flex-1 flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--chat-wallpaper)', borderLeft: '3px solid #00A884' }}>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold mb-0.5" style={{ color: '#00A884' }}>
            {isOut ? 'Você' : 'Contato'}
          </p>
          <p className="text-[12px] truncate" style={{ color: 'var(--chat-text-secondary)' }}>{preview}</p>
        </div>
      </div>
      <button onClick={onCancel} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
        <X className="w-3.5 h-3.5" style={{ color: 'var(--chat-text-secondary)' }} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                             */
/* ═══════════════════════════════════════════════════════════ */
export function Conversations() {
  const [matchConv, paramsConv] = useRoute('/conversations/:id');
  const [, navigate] = useLocation();
  const selectedId = matchConv && paramsConv?.id ? parseInt(paramsConv.id) : null;
  const { user } = useAuth();

  /* state */
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'all' | 'unread' | 'groups'>('all');

  /* new features state */
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuPos | null>(null);
  const [reactionTarget, setReactionTarget] = useState<ChatMessage | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<{ msg: ChatMessage; rect: DOMRect } | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { conversations, isLoading } = useAppConversations(
    activeFilter === 'all' ? undefined : activeFilter
  );
  const { messages, refetch: refetchMessages } = useAppMessages(selectedId || 0);
  const selectedConv = conversations.find(c => c.id === selectedId);

  useEffect(() => { setLocalMessages(messages as ChatMessage[]); }, [messages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [localMessages]);
  useEffect(() => { setReplyTo(null); setMessageText(''); }, [selectedId]);

  /* Socket.io: listen for real-time reactions */
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message:reaction') {
          setLocalMessages(prev => prev.map(m =>
            m.id === data.messageId ? { ...m, reactions: data.reactions } : m
          ));
        }
      } catch {}
    };
    return () => {};
  }, []);

  const filteredConvs = useMemo(() => {
    let list = conversations;
    if (search) list = list.filter(c => c.contact.name.toLowerCase().includes(search.toLowerCase()));
    if (activeFilter !== 'all') list = list.filter(c => c.status === activeFilter);
    if (sidebarTab === 'unread') list = list.filter(c => c.unreadCount > 0);
    return list;
  }, [conversations, search, activeFilter, sidebarTab]);

  /* Send text message */
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !selectedId || isSending) return;

    const optimistic: ChatMessage = {
      id: Date.now(), conversationId: selectedId, content: text,
      messageType: 'outgoing', deliveryStatus: 'sent', isForwarded: false,
      sender: null, attachments: [], reactions: [], createdAt: new Date().toISOString(),
      replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, messageType: replyTo.messageType, hasAttachment: replyTo.attachments.length > 0, attachmentType: replyTo.attachments[0]?.type } : null,
    };
    setLocalMessages(prev => [...prev, optimistic]);
    setMessageText('');
    const capturedReplyTo = replyTo;
    setReplyTo(null);
    setIsSending(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const resp = await apiFetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: text,
          messageType: 'outgoing',
          replyToId: capturedReplyTo?.id,
        }),
      });
      if (resp.ok) {
        const saved = await resp.json();
        setLocalMessages(prev => prev.map(m => m.id === optimistic.id ? { ...saved, reactions: saved.reactions || [], attachments: saved.attachments || [] } : m));
        setTimeout(() => setLocalMessages(prev => prev.map(m => m.id === saved.id ? { ...m, deliveryStatus: 'delivered' } : m)), 1500);
      }
    } catch {}
    finally { setIsSending(false); }
  }, [messageText, selectedId, isSending, replyTo]);

  /* Send file attachment (multipart upload) */
  const handleAttachFile = useCallback(async (type: string, file: File) => {
    if (!selectedId) return;

    let meta: Record<string, any> | undefined;
    if (type === 'music') meta = await readId3Tags(file);

    const mediaType = type === 'document' ? 'document'
      : type === 'gallery' || type === 'camera' ? 'image'
      : type === 'video' ? 'video'
      : type === 'audio' ? 'audio'
      : 'music';

    const label = type === 'document' ? `📄 ${file.name}`
      : type === 'gallery' || type === 'camera' ? `🖼 ${file.name}`
      : type === 'video' ? `🎬 ${file.name}`
      : type === 'audio' ? `🎤 Mensagem de voz`
      : `🎵 ${meta?.title || file.name}`;

    const tempId = Date.now();
    const localUrl = URL.createObjectURL(file);
    const optimistic: ChatMessage = {
      id: tempId, conversationId: selectedId, content: label,
      messageType: 'outgoing', deliveryStatus: 'sent', isForwarded: false,
      sender: null, createdAt: new Date().toISOString(),
      replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, messageType: replyTo.messageType, hasAttachment: replyTo.attachments.length > 0, attachmentType: replyTo.attachments[0]?.type } : null,
      attachments: [{ type: mediaType, url: localUrl, name: file.name, size: file.size, mimeType: file.type, metadata: meta }],
      reactions: [],
      _localFile: file, _localMeta: meta,
    };
    setLocalMessages(prev => [...prev, optimistic]);
    setReplyTo(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('content', label);
      fd.append('messageType', 'outgoing');
      fd.append('attachmentType', mediaType);
      if (meta) fd.append('metadata', JSON.stringify(meta));
      if (replyTo) fd.append('replyToId', String(replyTo.id));

      const resp = await apiFetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST', formData: fd,
      });
      if (resp.ok) {
        const saved = await resp.json();
        setLocalMessages(prev => prev.map(m => m.id === tempId
          ? { ...saved, reactions: saved.reactions || [], attachments: saved.attachments || [] }
          : m
        ));
        setTimeout(() => setLocalMessages(prev => prev.map(m => m.id === saved.id ? { ...m, deliveryStatus: 'delivered' } : m)), 1500);
      }
    } catch {
      setTimeout(() => setLocalMessages(prev => prev.map(m => m.id === tempId ? { ...m, deliveryStatus: 'delivered' } : m)), 1500);
    }
  }, [selectedId, replyTo]);

  /* Send recorded audio */
  const handleAudioRecorded = useCallback(async (blob: Blob, duration: number) => {
    setIsRecording(false);
    if (!selectedId) return;
    const file = new File([blob], `audio_${Date.now()}.webm`, { type: blob.type });
    await handleAttachFile('audio', file);
  }, [selectedId, handleAttachFile]);

  /* React to message */
  const handleReact = useCallback(async (msg: ChatMessage, emoji: string) => {
    if (!selectedId) return;
    const optimisticReactions = [...(msg.reactions || [])];
    const myUserId = user?.id;
    const existingIdx = optimisticReactions.findIndex(r => r.userId === myUserId && r.emoji === emoji);
    if (existingIdx >= 0) optimisticReactions.splice(existingIdx, 1);
    else optimisticReactions.push({ emoji, userId: myUserId });

    setLocalMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: optimisticReactions } : m));

    try {
      const resp = await apiFetch(`/api/conversations/${selectedId}/messages/${msg.id}/react`, {
        method: 'POST', body: JSON.stringify({ emoji }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setLocalMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: data.reactions } : m));
      }
    } catch {}
  }, [selectedId, user?.id]);

  /* Forward message */
  const handleForward = useCallback(async (msg: ChatMessage, targetIds: number[]) => {
    if (!selectedId) return;
    try {
      await apiFetch(`/api/conversations/${selectedId}/messages/forward`, {
        method: 'POST', body: JSON.stringify({ messageId: msg.id, conversationIds: targetIds }),
      });
    } catch {}
  }, [selectedId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); }
  };
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setContextMenu({ x, y, msg });
    setEmojiPickerTarget(null);
  };

  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: ChatMessage[] }[] = [];
    let lastDate = '';
    for (const msg of localMessages) {
      const d = format(new Date(msg.createdAt), 'yyyy-MM-dd');
      if (d !== lastDate) { groups.push({ date: msg.createdAt, msgs: [msg] }); lastDate = d; }
      else groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
  }, [localMessages]);

  const statusColors: Record<string, string> = { open: '#22C55E', pending: '#F59E0B', resolved: '#94A3B8', snoozed: '#3B82F6' };
  const statusLabels: Record<string, string> = { open: 'Aberta', pending: 'Pendente', resolved: 'Resolvida', snoozed: 'Silenciada' };

  /* Helper: render attachment content */
  const renderAttachment = (msg: ChatMessage, isOut: boolean) => {
    const att = msg.attachments?.[0];
    if (!att) return null;

    const src = att.url.startsWith('/api/') ? att.url : att.url;

    if (att.type === 'image') return <ImageMsg src={src} name={att.name} onLightbox={setLightbox} />;
    if (att.type === 'video') return <VideoMsg src={src} name={att.name} meta={att.metadata as any} />;
    if (att.type === 'audio') return <AudioMsgPlayer src={src} isOut={isOut} />;
    if (att.type === 'music') return <MusicMsgPlayer src={src} meta={att.metadata as any} isOut={isOut} />;
    if (att.type === 'document') return <DocumentMsg src={src} name={att.name} size={att.size} />;
    return null;
  };

  return (
    <AppLayout>
      <div className="flex h-full w-full overflow-hidden select-none"
        style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: 'var(--chat-bg)' }}
        onClick={() => { setContextMenu(null); setEmojiPickerTarget(null); }}>

        {/* Context menu */}
        <AnimatePresence>
          {contextMenu && (
            <MessageContextMenu
              pos={contextMenu}
              onClose={() => setContextMenu(null)}
              onReply={() => { setReplyTo(contextMenu.msg); setContextMenu(null); setTimeout(() => textareaRef.current?.focus(), 50); }}
              onReact={() => { setReactionTarget(contextMenu.msg); setContextMenu(null); }}
              onForward={() => { setForwardMessage(contextMenu.msg); setShowForwardModal(true); setContextMenu(null); }}
              onCopy={() => { navigator.clipboard.writeText(contextMenu.msg.content).catch(() => {}); setContextMenu(null); }}
            />
          )}
        </AnimatePresence>

        {/* Reaction picker modal */}
        <AnimatePresence>
          {reactionTarget && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setReactionTarget(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }} className="p-4 rounded-2xl shadow-2xl"
                style={{ background: 'var(--chat-surface2)', border: '1px solid var(--chat-active)' }}
                onClick={e => e.stopPropagation()}>
                <p className="text-[12px] font-medium mb-3 text-center" style={{ color: 'var(--chat-text-secondary)' }}>Reagir</p>
                <div className="grid grid-cols-4 gap-2">
                  {[...QUICK_EMOJIS, '🎉', '💯', '👏', '😍', '😡', '😱', '🤔', '💔'].map(e => (
                    <button key={e} onClick={() => { handleReact(reactionTarget, e); setReactionTarget(null); }}
                      className="w-12 h-12 flex items-center justify-center rounded-xl hover:scale-125 transition-transform text-2xl hover:bg-white/10">
                      {e}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Forward modal */}
        <AnimatePresence>
          {showForwardModal && forwardMessage && (
            <ForwardModal
              conversations={conversations}
              onClose={() => { setShowForwardModal(false); setForwardMessage(null); }}
              onForward={(ids) => handleForward(forwardMessage, ids)}
            />
          )}
        </AnimatePresence>

        {/* Image lightbox */}
        <AnimatePresence>
          {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
        </AnimatePresence>

        {/* ══ LEFT SIDEBAR ═══════════════════════════════════════ */}
        <div className={cn(
          "flex flex-col shrink-0 transition-all duration-200",
          "border-r border-[var(--chat-active)]",
          selectedId ? "hidden md:flex w-[360px]" : "flex w-full md:w-[360px]"
        )} style={{ background: 'var(--chat-bg)' }}>

          {/* Page title */}
          <div className="flex items-center justify-between px-4 shrink-0" style={{ height: 60, background: 'var(--chat-surface)', borderBottom: '1px solid var(--chat-border)' }}>
            <h1 className="text-[16px] font-semibold" style={{ color: 'var(--chat-text-primary)' }}>Conversas</h1>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-full hover:bg-[var(--chat-active)] transition-colors" style={{ color: 'var(--chat-icon)' }} title="Menu">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 shrink-0" style={{ background: 'var(--chat-bg)' }}>
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg" style={{ background: 'var(--chat-surface)' }}>
              <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--chat-text-secondary)' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar conversas" className="flex-1 bg-transparent text-[13px] focus:outline-none"
                style={{ color: 'var(--chat-text-primary)' }} />
              {search && <button onClick={() => setSearch('')}><X className="w-4 h-4" style={{ color: 'var(--chat-text-secondary)' }} /></button>}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex shrink-0" style={{ background: 'var(--chat-bg)', borderBottom: '1px solid var(--chat-active)' }}>
            {[{ id: 'all', label: 'Todas' }, { id: 'unread', label: 'Não lidas' }, { id: 'groups', label: 'Grupos' }].map(tab => (
              <button key={tab.id} onClick={() => setSidebarTab(tab.id as any)}
                className="flex-1 py-2.5 text-[13px] font-medium transition-colors relative"
                style={{ color: sidebarTab === tab.id ? '#00A884' : 'var(--chat-text-secondary)' }}>
                {tab.label}
                {sidebarTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t" style={{ background: '#00A884' }} />}
              </button>
            ))}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar shrink-0" style={{ background: 'var(--chat-bg)' }}>
            {[{ id: 'all', label: 'Todas' }, { id: 'open', label: 'Abertas' }, { id: 'pending', label: 'Pendentes' }, { id: 'resolved', label: 'Resolvidas' }].map(f => (
              <button key={f.id} onClick={() => setActiveFilter(f.id)}
                className="px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap transition-all shrink-0"
                style={activeFilter === f.id
                  ? { background: 'rgba(0,168,132,0.15)', color: '#00A884', border: '1px solid #00A884' }
                  : { background: 'var(--chat-surface)', color: 'var(--chat-text-secondary)', border: '1px solid transparent' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto" style={{ background: 'var(--chat-bg)' }}>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--chat-active)]">
                  <div className="w-12 h-12 rounded-full shrink-0 animate-pulse" style={{ background: 'var(--chat-surface)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded animate-pulse" style={{ background: 'var(--chat-surface)', width: '60%' }} />
                    <div className="h-2.5 rounded animate-pulse" style={{ background: 'var(--chat-surface)', width: '40%' }} />
                  </div>
                </div>
              ))
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Inbox className="w-12 h-12" style={{ color: 'var(--chat-active)' }} />
                <p className="text-[13px]" style={{ color: 'var(--chat-text-secondary)' }}>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const isActive = conv.id === selectedId;
                return (
                  <button key={conv.id} onClick={() => navigate(`/conversations/${conv.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors relative border-b"
                    style={{ background: isActive ? 'var(--chat-active)' : 'transparent', borderColor: 'var(--chat-border)' }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--chat-hover)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r" style={{ background: '#00A884' }} />}
                    <div className="relative shrink-0">
                      <ContactAvatar name={conv.contact.name} size={48} />
                      {conv.status === 'open' && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                          style={{ background: '#25D366', borderColor: isActive ? 'var(--chat-active)' : 'var(--chat-bg)' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span className="text-[15px] font-medium truncate" style={{ color: 'var(--chat-text-primary)' }}>{conv.contact.name}</span>
                        <span className="text-[11px] ml-2 shrink-0" style={{ color: conv.unreadCount > 0 ? '#00A884' : 'var(--chat-text-secondary)' }}>
                          {formatConvTime(conv.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] truncate flex-1" style={{ color: 'var(--chat-text-secondary)' }}>
                          {conv.lastMessage?.content || conv.subject || 'Nova conversa'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="text-[11px] font-bold text-white min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shrink-0"
                            style={{ background: '#00A884' }}>
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColors[conv.status] || '#94A3B8' }} />
                        <ChannelBadge channel={conv.channel} />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ══ CHAT AREA ══════════════════════════════════════════ */}
        <div className={cn("flex-1 flex flex-col min-w-0 relative", !selectedId ? "hidden md:flex" : "flex")}
          style={{ background: 'var(--chat-wallpaper)' }}>

          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-2.5 shrink-0 z-10 shadow-md"
                style={{ background: 'var(--chat-surface)', borderBottom: '1px solid var(--chat-active)' }}>
                <button onClick={() => navigate('/conversations')}
                  className="md:hidden p-1.5 rounded-full hover:bg-[var(--chat-active)] transition-colors mr-1"
                  style={{ color: 'var(--chat-icon)' }}>
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <ContactAvatar name={selectedConv.contact.name} size={40} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-semibold truncate" style={{ color: 'var(--chat-text-primary)' }}>{selectedConv.contact.name}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[selectedConv.status] }} />
                    <span className="text-[12px]" style={{ color: 'var(--chat-text-secondary)' }}>{statusLabels[selectedConv.status] || selectedConv.status}</span>
                    <span style={{ color: 'var(--chat-active)' }}>·</span>
                    <ChannelBadge channel={selectedConv.channel} />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[Video, Phone, Search, MoreVertical].map((Icon, i) => (
                    <button key={i} className="p-2 rounded-full hover:bg-[var(--chat-active)] transition-colors" style={{ color: 'var(--chat-icon)' }}>
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto relative px-4 py-4" style={{ background: 'var(--chat-wallpaper)' }}>
                <ChatBg />
                <div className="relative z-10 space-y-[2px]">
                  {groupedMessages.map((group, gi) => (
                    <React.Fragment key={gi}>
                      <div className="flex justify-center my-5">
                        <span className="px-3 py-1 rounded-lg text-[12px] font-medium shadow"
                          style={{ background: 'var(--chat-hover)', color: 'var(--chat-text-secondary)' }}>
                          {formatMsgDate(group.date)}
                        </span>
                      </div>

                      {group.msgs.map((msg, mi) => {
                        const isOut = msg.messageType === 'outgoing';
                        const prev = mi > 0 ? group.msgs[mi - 1] : null;
                        const next = mi < group.msgs.length - 1 ? group.msgs[mi + 1] : null;
                        const showTail = !prev || prev.messageType !== msg.messageType;
                        const lastInGroup = !next || next.messageType !== msg.messageType;
                        const hasAtt = msg.attachments && msg.attachments.length > 0;
                        const timeStr = format(new Date(msg.createdAt), 'HH:mm');

                        return (
                          <motion.div key={msg.id}
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.15 }}
                            className={cn("flex w-full group", isOut ? "justify-end pr-2" : "justify-start pl-2")}
                            style={{ marginBottom: lastInGroup ? 8 : 2 }}
                            onMouseEnter={() => setHoveredMsg(msg.id)}
                            onMouseLeave={() => setHoveredMsg(null)}>

                            <div className="relative" style={{ maxWidth: 'min(68%, 520px)' }}>
                              {/* WhatsApp tail */}
                              {showTail && isOut && (
                                <svg viewBox="0 0 8 13" width="8" height="13"
                                  style={{ position: 'absolute', top: 0, right: -8, display: 'block' }}>
                                  <path opacity="0.13" fill="#000" d="M5.188 0H6c0 2.394-.384 5.729-2.547 7.339C1.985 8.63.549 9.229 0 10.306v2.695c.275-.751.775-1.256 1.555-1.459C2.547 11.32 5.15 9.547 5.79 7.26 6.44 4.973 5.188 0 5.188 0z" />
                                  <path style={{fill:'var(--chat-bubble-out)'}} d="M5.188 0c0 2.394-.384 5.729-2.547 7.339C1.985 8.63.549 9.229 0 10.306V2L5.188 0z" />
                                </svg>
                              )}
                              {showTail && !isOut && (
                                <svg viewBox="0 0 8 13" width="8" height="13"
                                  style={{ position: 'absolute', top: 0, left: -8, display: 'block' }}>
                                  <path opacity="0.13" fill="#000" d="M2.812 0H2C2 2.394 2.384 5.729 4.547 7.339c1.468 1.291 2.904 1.89 3.453 2.967v2.695c-.275-.751-.775-1.256-1.555-1.459C5.453 11.32 2.85 9.547 2.21 7.26 1.56 4.973 2.812 0 2.812 0z" />
                                  <path style={{fill:'var(--chat-bubble-in)'}} d="M2.812 0c0 2.394.384 5.729 2.547 7.339 1.468 1.291 2.904 1.89 3.453 2.967V2L2.812 0z" />
                                </svg>
                              )}

                              {/* Bubble */}
                              <div
                                onContextMenu={e => handleContextMenu(e, msg)}
                                style={{
                                  background: isOut ? 'var(--chat-bubble-out)' : 'var(--chat-bubble-in)',
                                  borderRadius: showTail ? (isOut ? '12px 0 12px 12px' : '0 12px 12px 12px') : '12px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,.4)',
                                  overflow: 'hidden',
                                  cursor: 'context-menu',
                                }}>

                                {/* Forwarded indicator */}
                                {msg.isForwarded && (
                                  <div className="flex items-center gap-1.5 px-3 pt-2 pb-0.5" style={{ color: 'var(--chat-text-secondary)' }}>
                                    <Forward className="w-3 h-3" />
                                    <span className="text-[11px] italic">Encaminhada</span>
                                  </div>
                                )}

                                {/* Reply quote */}
                                {msg.replyTo && (
                                  <div className="mx-2 mt-2 rounded-lg overflow-hidden" style={{ borderLeft: '3px solid #00A884', background: 'rgba(0,0,0,0.15)' }}>
                                    <div className="px-3 py-2">
                                      <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#00A884' }}>
                                        {msg.replyTo.messageType === 'outgoing' ? 'Você' : selectedConv.contact.name}
                                      </p>
                                      <p className="text-[12px] line-clamp-2" style={{ color: 'var(--chat-text-secondary)' }}>
                                        {msg.replyTo.hasAttachment
                                          ? msg.replyTo.attachmentType === 'image' ? '🖼 Imagem'
                                          : msg.replyTo.attachmentType === 'video' ? '🎬 Vídeo'
                                          : msg.replyTo.attachmentType === 'audio' ? '🎤 Áudio'
                                          : msg.replyTo.attachmentType === 'music' ? '🎵 Música'
                                          : '📄 Arquivo'
                                          : msg.replyTo.content}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Attachment content */}
                                {hasAtt && (
                                  <div>
                                    {renderAttachment(msg, isOut)}
                                  </div>
                                )}

                                {/* Text content */}
                                {(msg.content && (hasAtt ? !msg.content.startsWith('📄') && !msg.content.startsWith('🖼') && !msg.content.startsWith('🎬') && !msg.content.startsWith('🎤') && !msg.content.startsWith('🎵') : true)) && (
                                  <div className={cn("px-3", hasAtt ? "pb-1 pt-1" : "pt-2 pb-1")}>
                                    <p className="text-[14.5px] leading-[1.4] whitespace-pre-wrap break-words" style={{ color: 'var(--chat-text-primary)' }}>
                                      {msg.content}
                                    </p>
                                  </div>
                                )}

                                {/* Metadata row: time + status */}
                                <div className={cn("flex items-center justify-end gap-1 px-2 pb-1.5",
                                  hasAtt ? "pt-0.5 pr-2" : "pt-0")}>
                                  <span className="text-[11px]" style={{ color: isOut ? 'var(--chat-time-out)' : 'var(--chat-text-secondary)' }}>{timeStr}</span>
                                  {isOut && <MessageStatusIcon status={msg.deliveryStatus} />}
                                </div>
                              </div>

                              {/* Reactions below bubble */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className={cn("mt-0.5", isOut ? "flex justify-end" : "flex justify-start")}>
                                  <ReactionsBar
                                    reactions={msg.reactions}
                                    currentUserId={user?.id}
                                    onReact={(emoji) => handleReact(msg, emoji)}
                                  />
                                </div>
                              )}

                              {/* Hover actions — above the bubble, no layout shift */}
                              {hoveredMsg === msg.id && (
                                <div className={cn(
                                  "absolute bottom-full mb-1 flex items-center gap-0.5 px-1 py-0.5 rounded-full",
                                  isOut ? "right-0" : "left-0"
                                )}
                                  style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
                                  <button onClick={() => setReactionTarget(msg)}
                                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                                    style={{ color: 'rgba(255,255,255,0.85)' }}>
                                    <Smile className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => { setReplyTo(msg); setTimeout(() => textareaRef.current?.focus(), 50); }}
                                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                                    style={{ color: 'rgba(255,255,255,0.85)' }}>
                                    <Reply className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={(e) => handleContextMenu(e, msg)}
                                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                                    style={{ color: 'rgba(255,255,255,0.85)' }}>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                          </motion.div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input area */}
              <div className="shrink-0 relative" style={{ background: 'var(--chat-surface)' }}>
                <AnimatePresence>
                  {showAttach && (
                    <AttachmentGrid onFile={handleAttachFile} onClose={() => setShowAttach(false)} />
                  )}
                </AnimatePresence>

                {/* Reply bar */}
                {replyTo && <ReplyBar replyTo={replyTo} onCancel={() => setReplyTo(null)} />}

                <div className="flex items-end gap-2 px-3 py-2">
                  {isRecording ? (
                    <AudioRecorder onDone={handleAudioRecorded} onCancel={() => setIsRecording(false)} />
                  ) : (
                    <>
                      {/* Emoji button */}
                      <button className="p-2.5 rounded-full transition-colors shrink-0" style={{ color: 'var(--chat-text-secondary)' }}
                        onClick={() => setShowAttach(false)}>
                        <Smile className="w-6 h-6" />
                      </button>

                      {/* Attach */}
                      <button onClick={() => setShowAttach(v => !v)}
                        className="p-2.5 rounded-full transition-colors shrink-0"
                        style={{ color: showAttach ? '#00A884' : 'var(--chat-text-secondary)' }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {/* Text area */}
                      <div className="flex-1 flex items-end rounded-lg px-4 py-2" style={{ background: 'var(--chat-input)', minHeight: 42 }}
                        onClick={() => setShowAttach(false)}>
                        <textarea
                          ref={textareaRef}
                          value={messageText}
                          onChange={handleTextareaChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Digite uma mensagem"
                          className="w-full text-[15px] resize-none focus:outline-none bg-transparent leading-relaxed placeholder:text-[#8696A0]"
                          style={{ color: 'var(--chat-text-primary)', maxHeight: 120, minHeight: 24 }}
                          rows={1}
                        />
                      </div>

                      {/* Send / Mic */}
                      <button
                        onClick={messageText.trim() ? handleSendMessage : () => setIsRecording(true)}
                        className="w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 shadow-md"
                        style={{ background: '#00A884' }}>
                        <AnimatePresence mode="wait" initial={false}>
                          {messageText.trim() ? (
                            <motion.span key="send" initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.5 }}>
                              <Send className="w-5 h-5 text-white ml-0.5" />
                            </motion.span>
                          ) : (
                            <motion.span key="mic" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
                              <Mic className="w-5 h-5 text-white" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-6" style={{ background: 'var(--chat-wallpaper)' }}>
              <div className="text-center">
                <div className="w-36 h-36 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'radial-gradient(circle, rgba(0,168,132,0.15), transparent)' }}>
                  <MessageSquare className="w-18 h-18" style={{ color: '#00A884', width: 72, height: 72 }} strokeWidth={1.2} />
                </div>
                <h2 className="text-[28px] font-light mb-3" style={{ color: 'var(--chat-text-primary)' }}>ChatFlow</h2>
                <p className="text-[14px] max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--chat-text-secondary)' }}>
                  Selecione uma conversa ao lado para começar a atender seus clientes.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[12px]" style={{ color: '#3B4B54' }}>
                <div className="w-6 h-px" style={{ background: '#3B4B54' }} />
                Mensagens criptografadas com Argon2id
                <div className="w-6 h-px" style={{ background: '#3B4B54' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
