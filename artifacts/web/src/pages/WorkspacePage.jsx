import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import {
  ArrowLeft, FileText, FileJson2, File, Code2, Search, Download,
  Copy, Check, Loader2, Trash2, Plus, Save, Clock, X,
  FolderOpen, Eye, Edit3, Wand2, Image, Video, Music, Play, Pause,
  Volume2, Film, RefreshCw, Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PushToSocialModal from '@/components/PushToSocialModal.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

const FILE_ICONS = {
  markdown: { icon: FileText, color: 'text-sky-400' },
  json: { icon: FileJson2, color: 'text-amber-400' },
  javascript: { icon: Code2, color: 'text-yellow-400' },
  python: { icon: Code2, color: 'text-blue-400' },
  html: { icon: Code2, color: 'text-orange-400' },
  css: { icon: Code2, color: 'text-violet-400' },
  csv: { icon: FileText, color: 'text-emerald-400' },
  text: { icon: FileText, color: 'text-white/50' },
};

function getFileIcon(fileType) {
  const config = FILE_ICONS[fileType?.toLowerCase()] ?? FILE_ICONS.text;
  return config;
}

function formatBytes(content) {
  const bytes = new Blob([content]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

const MEDIA_TYPES = ['image', 'video', 'audio'];

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [workspaceTab, setWorkspaceTab] = useState('files'); // 'files' | 'media'
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [pushToSocial, setPushToSocial] = useState(null);
  const audioRefs = useRef({});

  const loadFiles = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ash/files', { headers: authHeaders() });
      if (res.ok) setFiles(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const loadMediaFiles = useCallback(async () => {
    if (!currentUser?.id) return;
    setMediaLoading(true);
    try {
      const res = await fetch('/api/media-gen/gallery', { headers: authHeaders() });
      if (res.ok) setMediaFiles(await res.json());
    } catch { /* ignore */ } finally {
      setMediaLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { loadFiles(); }, [loadFiles]);
  useEffect(() => { if (workspaceTab === 'media') loadMediaFiles(); }, [workspaceTab, loadMediaFiles]);

  const openFile = (file) => {
    setSelectedFile(file);
    setEditContent(file.content);
    setEditName(file.name);
    setEditing(false);
    setPreviewMode(false);
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ash/files/${selectedFile.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ content: editContent, name: editName }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
        setSelectedFile(updated);
        setEditing(false);
        toast.success('File saved');
      }
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const deleteFile = async (fileId) => {
    try {
      await fetch(`/api/ash/files/${fileId}`, { method: 'DELETE', headers: authHeaders() });
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (selectedFile?.id === fileId) setSelectedFile(null);
      setDeleteConfirm(null);
      toast.success('File deleted');
    } catch { toast.error('Delete failed'); }
  };

  const copyContent = () => {
    navigator.clipboard.writeText(editContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const downloadFile = () => {
    if (!selectedFile) return;
    const blob = new Blob([editContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Only show non-media files in the Files tab
  const filteredFiles = files.filter(f =>
    !MEDIA_TYPES.includes(f.fileType) &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.description ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = filteredFiles.reduce((acc, f) => {
    const type = f.fileType || 'text';
    if (!acc[type]) acc[type] = [];
    acc[type].push(f);
    return acc;
  }, {});

  return (
    <AuthLayout>
      <div className="h-screen flex flex-col overflow-hidden">

        {/* Top Bar */}
        <div className="h-11 flex items-center justify-between px-3 border-b border-white/8 bg-black/80 backdrop-blur-lg shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/builder')}
              className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Builder
            </button>
            <span className="text-white/20 text-sm">/</span>
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-white/80">ASH Workspace</span>
            </div>
            {selectedFile && (
              <>
                <span className="text-white/20 text-sm">/</span>
                <span className="text-xs text-white/50 font-mono">{selectedFile.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Tab toggle */}
            <div className="flex gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5">
              <button
                onClick={() => setWorkspaceTab('files')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  workspaceTab === 'files'
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-white/35 hover:text-white/55'
                }`}
              >
                <Code2 className="w-3 h-3" />
                Files
              </button>
              <button
                onClick={() => setWorkspaceTab('media')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  workspaceTab === 'media'
                    ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
                    : 'text-white/35 hover:text-white/55'
                }`}
              >
                <Image className="w-3 h-3" />
                Media
              </button>
            </div>
            <button
              onClick={() => navigate('/builder')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/12 hover:bg-primary/22 border border-primary/22 text-primary text-xs font-bold transition-all"
            >
              <Wand2 className="w-3.5 h-3.5" />
              ASH Builder
            </button>
          </div>
        </div>

        {/* ── Media Gallery Tab ── */}
        {workspaceTab === 'media' && (
          <div className="flex-1 overflow-auto bg-[#050507] p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest">Media Gallery</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadMediaFiles}
                  className="p-1.5 rounded-lg bg-white/4 hover:bg-white/8 border border-white/8 text-white/30 hover:text-white/55 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => navigate('/media')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/12 hover:bg-violet-500/22 border border-violet-500/22 text-violet-400 text-xs font-bold transition-all"
                >
                  <Wand2 className="w-3 h-3" />
                  Media Studio
                </button>
              </div>
            </div>

            {mediaLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-white/25" />
              </div>
            ) : mediaFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/8 border border-violet-500/15 flex items-center justify-center mb-3">
                  <Image className="w-7 h-7 text-violet-400/30" />
                </div>
                <p className="text-sm text-white/30 font-mono">No media yet</p>
                <p className="text-xs text-white/18 font-mono mt-1">Ask ASH to generate images, videos, or audio</p>
                <button
                  onClick={() => navigate('/media')}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/12 hover:bg-violet-500/22 border border-violet-500/22 text-violet-400 text-xs font-bold transition-all"
                >
                  Open Media Studio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {mediaFiles.map(mf => (
                  <div key={mf.id} className="group rounded-xl overflow-hidden border border-white/8 bg-black/40 hover:border-white/15 transition-all">
                    {mf.fileType === 'image' && (
                      <div className="aspect-square bg-black/60">
                        <img src={mf.content} alt={mf.description ?? mf.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    {mf.fileType === 'video' && (
                      <div className="aspect-square bg-black relative flex items-center justify-center">
                        <Film className="w-8 h-8 text-cyan-400/40" />
                        <p className="absolute bottom-1 right-1 text-[8px] font-mono text-cyan-400/60 bg-black/60 px-1 rounded">VIDEO</p>
                      </div>
                    )}
                    {mf.fileType === 'audio' && (
                      <div className="aspect-square bg-black/60 flex flex-col items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            const audio = audioRefs.current[mf.id];
                            if (!audio) return;
                            if (playingAudioId === mf.id) {
                              audio.pause();
                              setPlayingAudioId(null);
                            } else {
                              if (playingAudioId && audioRefs.current[playingAudioId]) {
                                audioRefs.current[playingAudioId].pause();
                              }
                              audio.play();
                              setPlayingAudioId(mf.id);
                            }
                          }}
                          className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center"
                        >
                          {playingAudioId === mf.id
                            ? <Pause className="w-4 h-4 text-emerald-400" />
                            : <Play className="w-4 h-4 text-emerald-400 ml-0.5" />}
                        </button>
                        <Volume2 className="w-4 h-4 text-emerald-400/30" />
                        <audio
                          ref={el => { if (el) audioRefs.current[mf.id] = el; }}
                          src={mf.content}
                          onEnded={() => setPlayingAudioId(null)}
                        />
                      </div>
                    )}
                    <div className="px-2 py-1.5">
                      <p className="text-[10px] font-mono text-white/40 truncate">{mf.name}</p>
                      <p className="text-[9px] text-white/20 font-mono">{formatTime(mf.createdAt)}</p>
                      {/* Per-asset actions */}
                      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            const isDataUri = mf.content?.startsWith('data:');
                            navigator.clipboard.writeText(isDataUri ? `${window.location.origin}/media` : (mf.content ?? ''));
                            toast.success('Link copied');
                          }}
                          title="Copy link"
                          className="p-1 rounded bg-white/5 hover:bg-white/12 text-white/30 hover:text-white/65 transition-colors"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                        {mf.content && !mf.content.startsWith('data:') && (
                          <a
                            href={mf.content}
                            download={mf.name}
                            title="Download"
                            className="p-1 rounded bg-white/5 hover:bg-white/12 text-white/30 hover:text-white/65 transition-colors"
                          >
                            <Download className="w-2.5 h-2.5" />
                          </a>
                        )}
                        <button
                          onClick={() => setPushToSocial({ mediaUrl: mf.content, defaultContent: mf.description || '' })}
                          title="Push to Social"
                          className="p-1 rounded bg-white/5 hover:bg-white/12 text-white/30 hover:text-violet-400 transition-colors"
                        >
                          <Share2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2-panel layout — only shown when Files tab is active */}
        {workspaceTab === 'files' && (
        <div className="flex flex-1 min-h-0">

          {/* Left — file tree */}
          <div className="w-[220px] shrink-0 flex flex-col border-r border-white/8 bg-[#060608]">
            <div className="px-2 py-2 border-b border-white/6 shrink-0">
              <div className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-lg px-2 py-1.5">
                <Search className="w-3 h-3 text-white/22 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter files…"
                  className="flex-1 bg-transparent text-[11px] text-white/55 placeholder:text-white/22 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-white/25" />
                </div>
              )}
              {!loading && filteredFiles.length === 0 && (
                <div className="px-3 py-6 text-center">
                  <File className="w-6 h-6 text-white/10 mx-auto mb-2" />
                  <p className="text-[10px] text-white/22 font-mono">No files yet</p>
                  <p className="text-[9px] text-white/15 font-mono mt-1">Ask ASH to generate files</p>
                </div>
              )}

              {Object.entries(grouped).map(([type, typeFiles]) => {
                const { icon: Icon, color } = getFileIcon(type);
                return (
                  <div key={type} className="px-2 pt-2 pb-1">
                    <p className="text-[8px] uppercase tracking-widest text-white/20 font-mono px-1 mb-1">{type}</p>
                    <div className="space-y-0.5">
                      {typeFiles.map(file => {
                        const isSelected = selectedFile?.id === file.id;
                        return (
                          <div
                            key={file.id}
                            className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                              isSelected ? 'bg-primary/10 border border-primary/22' : 'hover:bg-white/5 border border-transparent'
                            }`}
                            onClick={() => openFile(file)}
                          >
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-mono truncate ${isSelected ? 'text-white/80' : 'text-white/48'}`}>{file.name}</p>
                              <p className="text-[8px] text-white/18 font-mono">{formatBytes(file.content)}</p>
                            </div>
                            {deleteConfirm === file.id ? (
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={e => { e.stopPropagation(); deleteFile(file.id); }}
                                  className="text-[8px] text-rose-400 font-mono"
                                >del</button>
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}
                                  className="text-[8px] text-white/28 font-mono"
                                >no</button>
                              </div>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteConfirm(file.id); }}
                                className="shrink-0 opacity-0 group-hover:opacity-100 text-white/18 hover:text-rose-400/70 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center — editor */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#050507]">
            {!selectedFile ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                  <Code2 className="w-8 h-8 text-primary/40" />
                </div>
                <div>
                  <p className="text-white/40 font-mono text-sm">Select a file to view or edit</p>
                  <p className="text-white/18 font-mono text-xs mt-1">Or ask ASH in the Builder to generate files for you</p>
                </div>
                <button
                  onClick={() => navigate('/builder')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/12 hover:bg-primary/22 border border-primary/22 text-primary text-xs font-bold transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Open ASH Builder
                </button>
              </div>
            ) : (
              <>
                {/* Editor toolbar */}
                <div className="h-10 flex items-center justify-between px-3 border-b border-white/8 shrink-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {editing ? (
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="bg-transparent text-[12px] font-mono text-white/70 border-b border-primary/30 focus:outline-none focus:border-primary min-w-0 max-w-[200px]"
                      />
                    ) : (
                      <span className="text-[12px] font-mono text-white/60 truncate">{selectedFile.name}</span>
                    )}
                    <span className="text-[9px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                      {selectedFile.fileType}
                    </span>
                    <span className="text-[9px] text-white/18 font-mono hidden sm:block">
                      {formatBytes(editContent)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {editing ? (
                      <>
                        <button
                          onClick={saveFile}
                          disabled={saving}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/25 text-primary text-[10px] font-mono font-bold transition-all disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Save
                        </button>
                        <button
                          onClick={() => { setEditing(false); setEditContent(selectedFile.content); setEditName(selectedFile.name); }}
                          className="px-2 py-1 rounded-lg text-white/30 hover:text-white/55 text-[10px] font-mono transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/45 text-[10px] font-mono transition-all"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => setPreviewMode(p => !p)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-all ${
                        previewMode ? 'bg-primary/10 border-primary/22 text-primary' : 'bg-white/5 border-white/10 text-white/45 hover:text-white/65'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                    <button onClick={copyContent} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/4 hover:bg-white/8 border border-white/8 text-white/38 text-[10px] font-mono transition-all">
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button onClick={downloadFile} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/4 hover:bg-white/8 border border-white/8 text-white/38 text-[10px] font-mono transition-all">
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Editor content */}
                <div className="flex-1 overflow-auto">
                  {previewMode && selectedFile.fileType === 'markdown' ? (
                    <div className="p-6 prose prose-invert prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-mono text-xs text-white/60 leading-relaxed">{editContent}</pre>
                    </div>
                  ) : (
                    <textarea
                      value={editContent}
                      onChange={e => { setEditContent(e.target.value); if (!editing) setEditing(true); }}
                      className="w-full h-full bg-transparent text-[12px] font-mono text-white/65 focus:outline-none resize-none p-4 leading-relaxed"
                      spellCheck={false}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right — file info */}
          {selectedFile && (
            <div className="w-[180px] shrink-0 border-l border-white/8 bg-[#060608] flex flex-col">
              <div className="px-3 py-2.5 border-b border-white/8">
                <p className="text-[9px] uppercase tracking-widest text-white/25 font-mono font-bold">File Info</p>
              </div>
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                <div>
                  <p className="text-[8px] text-white/22 font-mono uppercase mb-1">Name</p>
                  <p className="text-[10px] text-white/55 font-mono break-all">{selectedFile.name}</p>
                </div>
                <div>
                  <p className="text-[8px] text-white/22 font-mono uppercase mb-1">Type</p>
                  <p className="text-[10px] text-white/55 font-mono">{selectedFile.fileType}</p>
                </div>
                <div>
                  <p className="text-[8px] text-white/22 font-mono uppercase mb-1">Size</p>
                  <p className="text-[10px] text-white/55 font-mono">{formatBytes(editContent)}</p>
                </div>
                <div>
                  <p className="text-[8px] text-white/22 font-mono uppercase mb-1">Created</p>
                  <p className="text-[10px] text-white/55 font-mono">{formatTime(selectedFile.createdAt)}</p>
                </div>
                {selectedFile.description && (
                  <div>
                    <p className="text-[8px] text-white/22 font-mono uppercase mb-1">Description</p>
                    <p className="text-[10px] text-white/42 font-mono leading-relaxed">{selectedFile.description}</p>
                  </div>
                )}
                {selectedFile.sessionId && (
                  <div>
                    <p className="text-[8px] text-white/22 font-mono uppercase mb-1">Session</p>
                    <p className="text-[9px] text-white/28 font-mono break-all">{selectedFile.sessionId.slice(0, 12)}…</p>
                  </div>
                )}
                <div className="pt-2 space-y-1.5">
                  <button
                    onClick={downloadFile}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/18 border border-primary/20 text-primary text-[10px] font-mono transition-all"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(selectedFile.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-500/8 hover:bg-rose-500/15 border border-rose-500/20 text-rose-400/70 text-[10px] font-mono transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
      {pushToSocial && (
        <PushToSocialModal
          mediaUrl={pushToSocial.mediaUrl}
          defaultContent={pushToSocial.defaultContent}
          onClose={() => setPushToSocial(null)}
        />
      )}
    </AuthLayout>
  );
}
