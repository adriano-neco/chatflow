import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppConversations, useAppMessages, useAuth } from '@/hooks/use-app-data';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, MoreVertical, Send, Smile, Inbox, Phone, Video, MessageSquare,
  ArrowLeft, Mic, MicOff, FileText, Image, Music, Film, Camera, X,
  Play, Pause, Download, ChevronRight, Users, Archive, Star,
  CheckCircle2, Clock, MessageCircle, Edit3, RefreshCw,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { parseBlob } from 'music-metadata-browser';

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

/* ─── WhatsApp double-tick status ─────────────────────────── */
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

/* ─── Chat background (subtle WhatsApp pattern) ───────────── */
function ChatBg() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cg opacity='.03' fill='%23075E54'%3E%3Ccircle cx='10' cy='10' r='3'/%3E%3Ccircle cx='40' cy='10' r='3'/%3E%3Ccircle cx='70' cy='10' r='3'/%3E%3Ccircle cx='25' cy='25' r='3'/%3E%3Ccircle cx='55' cy='25' r='3'/%3E%3Ccircle cx='10' cy='40' r='3'/%3E%3Ccircle cx='40' cy='40' r='3'/%3E%3Ccircle cx='70' cy='40' r='3'/%3E%3Ccircle cx='25' cy='55' r='3'/%3E%3Ccircle cx='55' cy='55' r='3'/%3E%3Ccircle cx='10' cy='70' r='3'/%3E%3Ccircle cx='40' cy='70' r='3'/%3E%3Ccircle cx='70' cy='70' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    }} />
  );
}

/* ─── Avatar with random pastel color seeded by name ─────── */
const AVATAR_COLORS = [
  '#C8A2C8','#7EC8C8','#C8A87E','#A2C8A2','#C8A2A2',
  '#A2A2C8','#C8C8A2','#A2C8C8','#C8B2A2','#B2A2C8',
];
function getAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function ContactAvatar({ name, size = 48, className = '' }: { name: string; size?: number; className?: string }) {
  const bg = getAvatarColor(name);
  return (
    <div
      className={cn("rounded-full flex items-center justify-center text-white font-semibold shrink-0 select-none", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: bg }}
    >
      {getInitials(name)}
    </div>
  );
}

/* ─── Channel badge ───────────────────────────────────────── */
function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, [string, string]> = {
    email: ['#DBEAFE', '#1D4ED8'],
    whatsapp: ['#DCFCE7', '#15803D'],
    telegram: ['#E0F2FE', '#0369A1'],
    chat: ['#F3F4F6', '#4B5563'],
  };
  const [bg, color] = map[channel] ?? map.chat;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: bg, color }}>
      {channel === 'email' ? 'Email' : channel === 'whatsapp' ? 'WhatsApp' : channel === 'telegram' ? 'Telegram' : 'Chat'}
    </span>
  );
}

/* ─── Media message bubble content ───────────────────────── */
function ImageMsg({ file, url }: { file?: File; url?: string }) {
  const src = file ? URL.createObjectURL(file) : url;
  return (
    <div className="rounded-lg overflow-hidden max-w-[280px] cursor-pointer group relative" style={{ minWidth: 160 }}>
      <img src={src} alt="imagem" className="w-full object-cover max-h-[220px]" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <Download className="w-6 h-6 text-white drop-shadow" />
      </div>
    </div>
  );
}

function VideoMsg({ file, url, name }: { file?: File; url?: string; name?: string }) {
  const src = file ? URL.createObjectURL(file) : url;
  return (
    <div className="rounded-lg overflow-hidden max-w-[280px] bg-black cursor-pointer group relative" style={{ minWidth: 200 }}>
      <video src={src} className="w-full max-h-[200px] object-cover opacity-90" muted />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
          <Play className="w-6 h-6 text-white ml-1" fill="white" />
        </div>
      </div>
      {name && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-2 py-1 text-white text-[11px] truncate">{name}</div>}
    </div>
  );
}

function AudioMsgPlayer({ file, url, isOut }: { file?: File; url?: string; isOut: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const src = file ? URL.createObjectURL(file) : url;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  return (
    <div className={cn("flex items-center gap-3 p-2 rounded-xl", isOut ? "bg-[#c8f0a8]" : "bg-[#f0f2f5]")} style={{ minWidth: 220, maxWidth: 280 }}>
      <audio ref={audioRef} src={src}
        onTimeUpdate={() => setProgress(audioRef.current ? audioRef.current.currentTime / (audioRef.current.duration || 1) : 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isOut ? "bg-[#075E54]" : "bg-[#075E54]")}>
        {playing ? <Pause className="w-4 h-4 text-white" fill="white" /> : <Play className="w-4 h-4 text-white ml-0.5" fill="white" />}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="relative h-1.5 bg-black/10 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const p = (e.clientX - rect.left) / rect.width;
            if (audioRef.current) { audioRef.current.currentTime = p * audioRef.current.duration; setProgress(p); }
          }}>
          <div className="h-full rounded-full bg-[#075E54]" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-[11px] text-gray-500">{formatDuration(duration * progress)} / {formatDuration(duration)}</span>
      </div>
      <Mic className="w-4 h-4 text-gray-400 shrink-0" />
    </div>
  );
}

function MusicMsgPlayer({ file, url, meta, isOut }: {
  file?: File;
  url?: string;
  meta?: { title?: string; artist?: string; album?: string; year?: string; track?: string; coverUrl?: string };
  isOut: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const srcRef = useRef<string | undefined>(file ? URL.createObjectURL(file) : url);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  };

  /* Clean up filename for display: strip timestamp suffix */
  const cleanName = (f?: File) => {
    if (!f) return 'Áudio';
    return f.name.replace(/_\d{10,}/, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim() || 'Áudio';
  };

  const title  = meta?.title  || cleanName(file);
  const artist = meta?.artist;
  const album  = meta?.album;
  const year   = meta?.year;
  const track  = meta?.track;
  const cover  = meta?.coverUrl;

  const hasTags = !!(meta?.title || meta?.artist || meta?.album);

  /* gradient accent */
  const accentA = isOut ? '#128C7E' : '#1a3a4a';
  const accentB = isOut ? '#075E54' : '#0d2233';

  return (
    <div style={{ minWidth: 272, maxWidth: 320, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.35)' }}>

      {/* ── Cover / info header ── */}
      <div style={{ background: `linear-gradient(135deg, ${accentA}, ${accentB})`, padding: '12px 12px 10px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>

          {/* Album art */}
          <div style={{
            width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
            background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,.4)',
          }}>
            {cover
              ? <img src={cover} alt="capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Music style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.55)' }} />}
          </div>

          {/* Tags */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1.3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
              {title}
            </p>
            {artist && (
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, lineHeight: 1.3,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>
                {artist}
              </p>
            )}
            {album && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, lineHeight: 1.3,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {album}{year ? ` · ${year}` : ''}
              </p>
            )}
            {!hasTags && (
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 }}>
                Sem tags ID3
              </p>
            )}
            {track && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1 }}>{track}</p>
            )}
          </div>

          {/* Badge */}
          <span style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 9,
            fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em',
            alignSelf: 'flex-start', flexShrink: 0 }}>
            MP3
          </span>
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{
        background: isOut ? 'rgba(0,92,75,0.85)' : 'rgba(32,44,51,0.95)',
        padding: '10px 12px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <audio
          ref={audioRef}
          src={srcRef.current}
          onTimeUpdate={() => {
            const a = audioRef.current;
            if (!a) return;
            setCurrentTime(a.currentTime);
            setProgress(a.currentTime / (a.duration || 1));
          }}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
        />

        {/* Play/Pause */}
        <button
          onClick={toggle}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: '#00A884', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,.4)',
          }}
        >
          {playing
            ? <Pause style={{ width: 16, height: 16, color: '#fff', fill: '#fff' }} />
            : <Play  style={{ width: 16, height: 16, color: '#fff', fill: '#fff', marginLeft: 2 }} />}
        </button>

        {/* Scrubber */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              position: 'relative', height: 3, borderRadius: 2,
              background: 'rgba(255,255,255,0.18)', cursor: 'pointer', marginBottom: 5,
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              if (audioRef.current) { audioRef.current.currentTime = p * audioRef.current.duration; setProgress(p); }
            }}
          >
            <div style={{ height: '100%', borderRadius: 2, background: '#00A884', width: `${progress * 100}%` }} />
            <div style={{
              position: 'absolute', top: '50%', left: `${progress * 100}%`,
              transform: 'translate(-50%,-50%)',
              width: 10, height: 10, borderRadius: '50%', background: '#00A884',
              boxShadow: '0 0 0 2px rgba(0,168,132,.3)',
            }} />
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

function DocumentMsg({ file, name, size }: { file?: File; name: string; size: number }) {
  const ext = name.split('.').pop()?.toUpperCase() || 'DOC';
  const extColors: Record<string, string> = { PDF: '#FF5252', DOCX: '#2196F3', DOC: '#2196F3', XLSX: '#4CAF50', XLS: '#4CAF50', PPTX: '#FF9800', PPT: '#FF9800', TXT: '#607D8B' };
  const color = extColors[ext] || '#9C27B0';
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-black/5" style={{ minWidth: 220, maxWidth: 300 }}>
      <div className="w-10 h-12 rounded-lg flex flex-col items-center justify-center shadow-sm shrink-0" style={{ background: color }}>
        <FileText className="w-5 h-5 text-white" />
        <span className="text-white text-[9px] font-bold mt-0.5">{ext}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-gray-800 font-medium truncate">{name}</p>
        <p className="text-[11px] text-gray-400">{formatBytes(size)}</p>
      </div>
      <a href={file ? URL.createObjectURL(file) : '#'} download={name}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
        <Download className="w-4 h-4 text-gray-500" />
      </a>
    </div>
  );
}

/* ─── Attachment grid popup ──────────────────────────────── */
const ATTACH_ITEMS = [
  { id: 'document', icon: FileText,  label: 'Documento', bg: '#29A71A', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv' },
  { id: 'camera',   icon: Camera,    label: 'Câmera',    bg: '#EB3352', accept: 'image/*;capture=camera' },
  { id: 'gallery',  icon: Image,     label: 'Imagem',    bg: '#9C27B0', accept: 'image/*,image/gif' },
  { id: 'video',    icon: Film,      label: 'Vídeo',     bg: '#E67E22', accept: 'video/*' },
  { id: 'audio',    icon: Mic,       label: 'Áudio',     bg: '#1A9CB0', accept: 'audio/*' },
  { id: 'music',    icon: Music,     label: 'Música',    bg: '#F59E0B', accept: 'audio/mpeg,audio/mp3,.mp3' },
];

function AttachmentGrid({ onFile, onClose }: { onFile: (type: string, file: File) => void; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentType, setCurrentType] = useState<string>('');

  const pick = (item: typeof ATTACH_ITEMS[0]) => {
    setCurrentType(item.id);
    if (inputRef.current) {
      inputRef.current.accept = item.accept;
      inputRef.current.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onFile(currentType, f);
    e.target.value = '';
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute bottom-[72px] left-3 z-50 w-[280px] rounded-2xl shadow-2xl overflow-hidden border border-black/5"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
    >
      <div className="px-4 pt-4 pb-2">
        <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">Enviar arquivo</p>
      </div>
      <div className="grid grid-cols-3 gap-3 p-3">
        {ATTACH_ITEMS.map(item => (
          <button key={item.id} onClick={() => pick(item)}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-md"
              style={{ background: item.bg }}>
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] text-gray-600 font-medium">{item.label}</span>
          </button>
        ))}
      </div>
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
    </motion.div>
  );
}

/* ─── Audio recorder ─────────────────────────────────────── */
function AudioRecorder({ onDone, onCancel }: { onDone: (blob: Blob, duration: number) => void; onCancel: () => void }) {
  const [secs, setSecs] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(30).fill(4));
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);
  const startRef = useRef<number>(Date.now());
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
          const b = Array.from({ length: 30 }, (_, i) => {
            const v = data[Math.floor(i * data.length / 30)] / 255;
            return Math.max(4, Math.round(v * 36));
          });
          setBars(b);
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
      className="flex items-center gap-3 bg-[#f0f2f5] px-3 py-2 rounded-full flex-1">
      <button onClick={onCancel} className="p-1.5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-end gap-[2px] h-8 flex-1 justify-center">
        {bars.map((h, i) => (
          <div key={i} className="w-[3px] rounded-full bg-[#075E54] transition-all duration-75"
            style={{ height: h, opacity: 0.4 + (h / 40) * 0.6 }} />
        ))}
      </div>
      <span className="text-[13px] font-mono text-red-500 font-semibold tabular-nums shrink-0">{formatDuration(secs)}</span>
      <button onClick={stop}
        className="w-10 h-10 rounded-full bg-[#075E54] flex items-center justify-center shrink-0 shadow-md">
        <Send className="w-4 h-4 text-white" />
      </button>
    </motion.div>
  );
}

/* ─── Read ID3 tags via music-metadata-browser ───────────── */
async function readId3Tags(file: File): Promise<{ title?: string; artist?: string; album?: string; year?: string; track?: string; coverUrl?: string }> {
  try {
    const meta = await parseBlob(file, { skipCovers: false, duration: false });
    const c = meta.common;
    let coverUrl: string | undefined;
    if (c.picture && c.picture.length > 0) {
      const pic = c.picture[0];
      const blob = new Blob([pic.data], { type: pic.format || 'image/jpeg' });
      coverUrl = URL.createObjectURL(blob);
    }
    return {
      title:  c.title  || undefined,
      artist: c.artist || undefined,
      album:  c.album  || undefined,
      year:   c.year   ? String(c.year) : undefined,
      track:  c.track?.no ? `Faixa ${c.track.no}` : undefined,
      coverUrl,
    };
  } catch (e) {
    console.warn('[readId3Tags] parse error:', e);
    return {};
  }
}

/* ─── Message type ───────────────────────────────────────── */
type AttachMedia = { type: 'image' | 'video' | 'audio' | 'music' | 'document'; file: File; meta?: any };
type ChatMessage = {
  id: number; conversationId: number; content: string;
  messageType: string; deliveryStatus: string; sender: any;
  createdAt: string; attach?: AttachMedia;
};

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { conversations, isLoading } = useAppConversations(
    activeFilter === 'all' ? undefined : activeFilter
  );
  const { messages } = useAppMessages(selectedId || 0);
  const selectedConv = conversations.find(c => c.id === selectedId);

  useEffect(() => { setLocalMessages(messages as ChatMessage[]); }, [messages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [localMessages]);

  const filteredConvs = useMemo(() => {
    let list = conversations;
    if (search) list = list.filter(c => c.contact.name.toLowerCase().includes(search.toLowerCase()));
    if (activeFilter !== 'all') list = list.filter(c => c.status === activeFilter);
    if (sidebarTab === 'unread') list = list.filter(c => c.unreadCount > 0);
    return list;
  }, [conversations, search, activeFilter, sidebarTab]);

  /* send text */
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !selectedId || isSending) return;
    const optimistic: ChatMessage = {
      id: Date.now(), conversationId: selectedId, content: text,
      messageType: 'outgoing', deliveryStatus: 'sent', sender: null,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, optimistic]);
    setMessageText('');
    setIsSending(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      const resp = await apiFetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST', body: JSON.stringify({ content: text, messageType: 'outgoing' }),
      });
      if (resp.ok) {
        const saved = await resp.json();
        setLocalMessages(prev => prev.map(m => m.id === optimistic.id ? { ...saved } : m));
        setTimeout(() => setLocalMessages(prev => prev.map(m => m.id === saved.id ? { ...m, deliveryStatus: 'delivered' } : m)), 1500);
      }
    } catch { } finally { setIsSending(false); }
  }, [messageText, selectedId, isSending]);

  /* send attachment */
  const handleAttachFile = useCallback(async (type: string, file: File) => {
    if (!selectedId) return;
    let meta: any = undefined;
    if (type === 'music') meta = await readId3Tags(file);

    const mediaType: AttachMedia['type'] =
      type === 'document' ? 'document'
      : type === 'gallery' || type === 'camera' ? 'image'
      : type === 'video' ? 'video'
      : type === 'audio' ? 'audio'
      : 'music';

    const label =
      type === 'document' ? `📄 ${file.name}`
      : type === 'gallery' || type === 'camera' ? `🖼 ${file.name}`
      : type === 'video' ? `🎬 ${file.name}`
      : type === 'audio' ? `🎤 Mensagem de voz`
      : `🎵 ${meta?.title || file.name}`;

    const optimistic: ChatMessage = {
      id: Date.now(), conversationId: selectedId, content: label,
      messageType: 'outgoing', deliveryStatus: 'sent', sender: null,
      createdAt: new Date().toISOString(), attach: { type: mediaType, file, meta },
    };
    setLocalMessages(prev => [...prev, optimistic]);
    setTimeout(() => setLocalMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, deliveryStatus: 'delivered' } : m)), 1500);
  }, [selectedId]);

  /* send recorded audio */
  const handleAudioRecorded = useCallback((blob: Blob, duration: number) => {
    setIsRecording(false);
    if (!selectedId) return;
    const file = new File([blob], `audio_${Date.now()}.webm`, { type: blob.type });
    const optimistic: ChatMessage = {
      id: Date.now(), conversationId: selectedId, content: `🎤 Áudio (${formatDuration(duration)})`,
      messageType: 'outgoing', deliveryStatus: 'sent', sender: null,
      createdAt: new Date().toISOString(), attach: { type: 'audio', file },
    };
    setLocalMessages(prev => [...prev, optimistic]);
    setTimeout(() => setLocalMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, deliveryStatus: 'delivered' } : m)), 1500);
  }, [selectedId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); }
  };
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
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

  /* ── render ──────────────────────────────────────────────── */
  return (
    <AppLayout>
      <div className="flex h-full w-full overflow-hidden select-none" style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: '#111B21' }}>

        {/* ══════════════════════════════════════════════════════
            LEFT SIDEBAR – WhatsApp Web style
        ═══════════════════════════════════════════════════════ */}
        <div className={cn(
          "flex flex-col shrink-0 transition-all duration-200 border-r",
          "border-[#2A3942]",
          selectedId ? "hidden md:flex w-[360px]" : "flex w-full md:w-[360px]"
        )} style={{ background: '#111B21' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ background: '#202C33', borderBottom: '1px solid #2A3942' }}>
            <div className="flex items-center gap-3">
              <ContactAvatar name={user?.name || 'U'} size={40} />
              <div>
                <p className="text-[#E9EDEF] text-[14px] font-semibold leading-tight">{user?.name || 'ChatFlow'}</p>
                <p className="text-[#8696A0] text-[11px]">{user?.role === 'admin' ? 'Administrador' : 'Agente'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-full hover:bg-[#2A3942] transition-colors text-[#AEBAC1]" title="Novo chat">
                <Edit3 className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-[#2A3942] transition-colors text-[#AEBAC1]" title="Menu">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2 shrink-0" style={{ background: '#111B21' }}>
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg" style={{ background: '#202C33' }}>
              <Search className="w-4 h-4 shrink-0" style={{ color: '#8696A0' }} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar ou começar uma nova conversa"
                className="flex-1 bg-transparent text-[13px] focus:outline-none placeholder:text-[#8696A0]"
                style={{ color: '#E9EDEF' }}
              />
              {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-[#8696A0]" /></button>}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex shrink-0 border-b" style={{ background: '#111B21', borderColor: '#2A3942' }}>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'unread', label: 'Não lidas' },
              { id: 'groups', label: 'Grupos' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setSidebarTab(tab.id as any)}
                className={cn("flex-1 py-2.5 text-[13px] font-medium transition-colors relative")}
                style={{ color: sidebarTab === tab.id ? '#00A884' : '#8696A0' }}>
                {tab.label}
                {sidebarTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t" style={{ background: '#00A884' }} />
                )}
              </button>
            ))}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar shrink-0" style={{ background: '#111B21' }}>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'open', label: 'Abertas' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'resolved', label: 'Resolvidas' },
            ].map(f => (
              <button key={f.id} onClick={() => setActiveFilter(f.id)}
                className="px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap transition-all shrink-0"
                style={activeFilter === f.id
                  ? { background: '#00A88422', color: '#00A884', border: '1px solid #00A884' }
                  : { background: '#202C33', color: '#8696A0', border: '1px solid transparent' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#111B21' }}>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#2A3942]">
                  <div className="w-12 h-12 rounded-full shrink-0 animate-pulse" style={{ background: '#202C33' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded animate-pulse" style={{ background: '#202C33', width: '60%' }} />
                    <div className="h-2.5 rounded animate-pulse" style={{ background: '#202C33', width: '40%' }} />
                  </div>
                </div>
              ))
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Inbox className="w-12 h-12" style={{ color: '#2A3942' }} />
                <p className="text-[13px]" style={{ color: '#8696A0' }}>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const isActive = conv.id === selectedId;
                return (
                  <button key={conv.id} onClick={() => navigate(`/conversations/${conv.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors relative border-b"
                    style={{
                      background: isActive ? '#2A3942' : 'transparent',
                      borderColor: '#2A3942',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#182229'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Active indicator */}
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-r" style={{ background: '#00A884' }} />}

                    <div className="relative shrink-0">
                      <ContactAvatar name={conv.contact.name} size={48} />
                      {conv.status === 'open' && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                          style={{ background: '#25D366', borderColor: isActive ? '#2A3942' : '#111B21' }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span className="text-[15px] font-medium truncate" style={{ color: '#E9EDEF' }}>{conv.contact.name}</span>
                        <span className="text-[11px] ml-2 shrink-0" style={{ color: conv.unreadCount > 0 ? '#00A884' : '#8696A0' }}>
                          {formatConvTime(conv.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] truncate flex-1" style={{ color: '#8696A0' }}>
                          {conv.lastMessage?.content || conv.subject || 'Nova conversa'}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {conv.unreadCount > 0 && (
                            <span className="text-[11px] font-bold text-white min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1"
                              style={{ background: '#00A884' }}>
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
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

        {/* ══════════════════════════════════════════════════════
            RIGHT – CHAT AREA
        ═══════════════════════════════════════════════════════ */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 relative",
          !selectedId ? "hidden md:flex" : "flex"
        )} style={{ background: '#0B141A' }}>

          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-2.5 shrink-0 z-10 shadow-md"
                style={{ background: '#202C33', borderBottom: '1px solid #2A3942' }}>
                <button onClick={() => navigate('/conversations')}
                  className="md:hidden p-1.5 rounded-full hover:bg-[#2A3942] transition-colors text-[#AEBAC1] mr-1">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <ContactAvatar name={selectedConv.contact.name} size={40} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-semibold truncate" style={{ color: '#E9EDEF' }}>{selectedConv.contact.name}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[selectedConv.status] }} />
                    <span className="text-[12px]" style={{ color: '#8696A0' }}>{statusLabels[selectedConv.status] || selectedConv.status}</span>
                    <span style={{ color: '#2A3942' }}>·</span>
                    <ChannelBadge channel={selectedConv.channel} />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[Video, Phone, Search, MoreVertical].map((Icon, i) => (
                    <button key={i} className="p-2 rounded-full hover:bg-[#2A3942] transition-colors" style={{ color: '#AEBAC1' }}>
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto relative px-4 py-4" style={{ background: '#0B141A' }}>
                <ChatBg />
                <div className="relative z-10 space-y-[2px]">
                  {groupedMessages.map((group, gi) => (
                    <React.Fragment key={gi}>
                      <div className="flex justify-center my-5">
                        <span className="px-3 py-1 rounded-lg text-[12px] font-medium" style={{ background: '#182229', color: '#8696A0' }}>
                          {formatMsgDate(group.date)}
                        </span>
                      </div>
                      {group.msgs.map((msg, mi) => {
                        const isOut = msg.messageType === 'outgoing';
                        const prev = mi > 0 ? group.msgs[mi - 1] : null;
                        const next = mi < group.msgs.length - 1 ? group.msgs[mi + 1] : null;
                        const showTail = !prev || prev.messageType !== msg.messageType;
                        const lastInGroup = !next || next.messageType !== msg.messageType;

                        return (
                          <motion.div key={msg.id}
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.15 }}
                            className={cn("flex w-full", isOut ? "justify-end pr-2" : "justify-start pl-2")}
                            style={{ marginBottom: lastInGroup ? 8 : 2 }}>

                            {/* Outer wrapper holds tail + bubble together */}
                            <div className="relative" style={{ maxWidth: 'min(65%, 520px)' }}>

                              {/* ── WhatsApp exact tail paths ── */}
                              {showTail && isOut && (
                                <svg
                                  viewBox="0 0 8 13" width="8" height="13"
                                  style={{ position: 'absolute', top: 0, right: -8, display: 'block' }}>
                                  {/* shadow layer */}
                                  <path
                                    opacity="0.13"
                                    fill="#000"
                                    d="M5.188 0H6c0 2.394-.384 5.729-2.547 7.339C1.985 8.63.549 9.229 0 10.306v2.695c.275-.751.775-1.256 1.555-1.459C2.547 11.32 5.15 9.547 5.79 7.26 6.44 4.973 5.188 0 5.188 0z"
                                  />
                                  {/* fill layer */}
                                  <path
                                    fill="#005C4B"
                                    d="M5.188 0c0 2.394-.384 5.729-2.547 7.339C1.985 8.63.549 9.229 0 10.306V2L5.188 0z"
                                  />
                                </svg>
                              )}
                              {showTail && !isOut && (
                                <svg
                                  viewBox="0 0 8 13" width="8" height="13"
                                  style={{ position: 'absolute', top: 0, left: -8, display: 'block' }}>
                                  {/* shadow layer */}
                                  <path
                                    opacity="0.13"
                                    fill="#000"
                                    d="M2.812 0H2C2 2.394 2.384 5.729 4.547 7.339c1.468 1.291 2.904 1.89 3.453 2.967v2.695c-.275-.751-.775-1.256-1.555-1.459C5.453 11.32 2.85 9.547 2.21 7.26 1.56 4.973 2.812 0 2.812 0z"
                                  />
                                  {/* fill layer */}
                                  <path
                                    fill="#202C33"
                                    d="M2.812 0c0 2.394.384 5.729 2.547 7.339 1.468 1.291 2.904 1.89 3.453 2.967V2L2.812 0z"
                                  />
                                </svg>
                              )}

                              {/* ── Bubble ── */}
                              <div
                                style={{
                                  background: isOut ? '#005C4B' : '#202C33',
                                  borderRadius: showTail
                                    ? isOut  ? '7.5px 0 7.5px 7.5px'
                                             : '0 7.5px 7.5px 7.5px'
                                    : '7.5px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,.35)',
                                  overflow: 'hidden',
                                  position: 'relative',
                                }}
                              >

                                {/* Attachment content */}
                                {msg.attach && (
                                  <div>
                                    {msg.attach.type === 'image'    && <ImageMsg file={msg.attach.file} />}
                                    {msg.attach.type === 'video'    && <VideoMsg file={msg.attach.file} name={msg.attach.file.name} />}
                                    {msg.attach.type === 'audio'    && <AudioMsgPlayer file={msg.attach.file} isOut={isOut} />}
                                    {msg.attach.type === 'music'    && <MusicMsgPlayer file={msg.attach.file} meta={msg.attach.meta} isOut={isOut} />}
                                    {msg.attach.type === 'document' && <DocumentMsg file={msg.attach.file} name={msg.attach.file.name} size={msg.attach.file.size} />}
                                    {/* Time overlay for attachments */}
                                    <div className="flex items-center justify-end gap-1 px-2 pb-1.5 pt-0.5">
                                      <span className="text-[11px]" style={{ color: isOut ? '#7AE2C7' : '#8696A0' }}>
                                        {format(new Date(msg.createdAt), 'HH:mm')}
                                      </span>
                                      {isOut && <MessageStatusIcon status={msg.deliveryStatus || 'sent'} />}
                                    </div>
                                  </div>
                                )}

                                {/* Plain text bubble */}
                                {!msg.attach && (
                                  <div className="px-[9px] pt-[6px] pb-[4px]">
                                    {/* Text + inline float spacer trick (WhatsApp style) */}
                                    <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words select-text"
                                      style={{ color: '#E9EDEF' }}>
                                      {msg.content}
                                      {/* Invisible spacer so time never overlaps text */}
                                      <span aria-hidden style={{ display: 'inline-block', width: isOut ? 72 : 44, height: 1 }} />
                                    </p>
                                    {/* Time + status absolutely anchored to bottom-right */}
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: 5,
                                        right: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        pointerEvents: 'none',
                                      }}>
                                      <span className="text-[11px]" style={{ color: isOut ? '#7AE2C7' : '#8696A0', lineHeight: 1 }}>
                                        {format(new Date(msg.createdAt), 'HH:mm')}
                                      </span>
                                      {isOut && <MessageStatusIcon status={msg.deliveryStatus || 'sent'} />}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input bar */}
              <div className="shrink-0 relative" style={{ background: '#202C33' }}>
                <AnimatePresence>
                  {showAttach && (
                    <AttachmentGrid
                      onFile={handleAttachFile}
                      onClose={() => setShowAttach(false)}
                    />
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2 px-3 py-2">
                  {isRecording ? (
                    <AudioRecorder
                      onDone={handleAudioRecorded}
                      onCancel={() => setIsRecording(false)}
                    />
                  ) : (
                    <>
                      {/* Emoji */}
                      <button className="p-2.5 rounded-full transition-colors shrink-0" style={{ color: '#8696A0' }}
                        onClick={() => setShowAttach(false)}>
                        <Smile className="w-6 h-6" />
                      </button>

                      {/* Attach */}
                      <button
                        onClick={() => setShowAttach(v => !v)}
                        className="p-2.5 rounded-full transition-colors shrink-0"
                        style={{ color: showAttach ? '#00A884' : '#8696A0' }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {/* Text area */}
                      <div className="flex-1 flex items-end rounded-lg px-4 py-2" style={{ background: '#2A3942', minHeight: 42 }}
                        onClick={() => setShowAttach(false)}>
                        <textarea
                          ref={textareaRef}
                          value={messageText}
                          onChange={handleTextareaChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Digite uma mensagem"
                          className="w-full text-[15px] resize-none focus:outline-none bg-transparent leading-relaxed placeholder:text-[#8696A0]"
                          style={{ color: '#E9EDEF', maxHeight: 120, minHeight: 24 }}
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
            <div className="flex-1 flex flex-col items-center justify-center gap-6" style={{ background: '#0B141A' }}>
              <div className="text-center">
                <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'radial-gradient(circle, #00A88422, #0B141A)' }}>
                  <MessageSquare className="w-16 h-16" style={{ color: '#00A884' }} strokeWidth={1.2} />
                </div>
                <h2 className="text-[28px] font-light mb-3" style={{ color: '#E9EDEF' }}>ChatFlow</h2>
                <p className="text-[14px] max-w-xs mx-auto leading-relaxed" style={{ color: '#8696A0' }}>
                  Selecione uma conversa ao lado para começar a atender seus clientes.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[12px]" style={{ color: '#3B4B54' }}>
                <div className="w-5 h-[1px]" style={{ background: '#3B4B54' }} />
                Criptografado com Argon2id
                <div className="w-5 h-[1px]" style={{ background: '#3B4B54' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
