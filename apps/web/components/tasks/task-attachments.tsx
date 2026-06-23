'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip, Upload, Trash2, Download, Loader2 } from 'lucide-react';
import {
  type Attachment,
  getAttachments,
  uploadAttachment,
  getDownloadUrl,
  deleteAttachment,
  formatBytes,
} from '@/lib/files';

interface Props {
  taskId: string;
  canUpload?: boolean;
}

const ICON_STYLE: React.CSSProperties = { color: 'var(--text-3)', flexShrink: 0 };
const MONO_XS: React.CSSProperties = { fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' as const };
const MONO_SM: React.CSSProperties = { fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)' };

export function TaskAttachments({ taskId, canUpload = true }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAttachments(taskId)
      .then(setAttachments)
      .catch(() => setAttachments([]));
  }, [taskId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (file.size > 20 * 1024 * 1024) { setError('File must be under 20 MB'); return; }
    setError(null);
    setUploading(true);
    try {
      const attachment = await uploadAttachment(taskId, file);
      setAttachments((prev) => [...prev, attachment]);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    setDownloadingId(attachment.id);
    try {
      const url = await getDownloadUrl(taskId, attachment.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      a.click();
    } catch {
      setError('Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      await deleteAttachment(taskId, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch {
      setError('Delete failed.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Paperclip size={12} style={{ color: '#7B6CF0' }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Attachments {attachments.length > 0 && `(${attachments.length})`}
          </span>
        </div>

        {canUpload && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', background: 'rgba(123,108,240,0.1)', border: '1px solid rgba(123,108,240,0.25)', borderRadius: 6, cursor: uploading ? 'not-allowed' : 'pointer', color: '#7B6CF0', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, opacity: uploading ? 0.6 : 1 }}
            >
              {uploading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={11} />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
          </>
        )}
      </div>

      {error && (
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#fb7185', marginBottom: 8 }}>{error}</p>
      )}

      {/* List */}
      {attachments.length === 0 ? (
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <p style={{ ...MONO_XS, letterSpacing: 0 }}>No attachments yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.map((a) => (
            <div
              key={a.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7 }}
            >
              <Paperclip size={12} style={ICON_STYLE} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...MONO_SM, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{a.filename}</p>
                <p style={{ ...MONO_XS, marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>
                  {formatBytes(a.fileSize)} · {a.uploadedBy?.fullName ?? 'Unknown'}
                </p>
              </div>

              <button
                onClick={() => handleDownload(a)}
                disabled={downloadingId === a.id}
                title="Download"
                style={{ height: 26, width: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', borderRadius: 5, flexShrink: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#7B6CF0'; (e.currentTarget as HTMLElement).style.background = 'rgba(123,108,240,0.1)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                {downloadingId === a.id
                  ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Download size={12} />}
              </button>

              <button
                onClick={() => handleDelete(a.id)}
                title="Delete"
                style={{ height: 26, width: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', borderRadius: 5, flexShrink: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fb7185'; (e.currentTarget as HTMLElement).style.background = 'rgba(251,113,133,0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
