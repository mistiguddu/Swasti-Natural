'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArchiveRestore, CheckCircle2, Database, Download, FileArchive, FileJson, HardDrive, History, Layers, RefreshCw, Save, ServerCog, Trash2, Upload,
} from 'lucide-react';
import { api, SESSION_KEY, VIEW_AS_KEY } from '../api.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import { Card, CardHeader, PageHeader } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Checkbox, FormInput } from '../components/ui/Form.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { DashboardCardSkeleton, TableSkeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../components/ui/EmptyState.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { dateTime, number } from '../lib/format.js';
import { t } from '../i18n/index.js';

/*
 * Super admin → Database: export (mongodump BSON or mongoexport Extended JSON), import with
 * preview, and server-side backups with restore. The API enforces "database.manage" and asks
 * for the password again before anything is changed or deleted.
 */

const FORMATS = [
  {
    key: 'bson',
    icon: FileArchive,
    title: 'MongoDB dump (BSON)',
    badge: 'Recommended',
    description: 'Exact copy in mongodump format. Restore with mongorestore or import here.',
    command: 'mongorestore --uri="<connection string>" --dir=dump',
  },
  {
    key: 'json',
    icon: FileJson,
    title: 'Extended JSON (mongoexport)',
    description: 'Readable canonical Extended JSON, one document per line. Use with mongoimport, Compass or import here.',
    command: 'mongoimport --uri="<connection string>" --collection=<name> --file=<name>.json',
  },
];

const MODES = [
  { key: 'merge', title: 'Merge (upsert)', description: 'Adds new documents and replaces documents with the same _id. Nothing else is deleted.' },
  { key: 'replace', title: 'Replace collection', description: 'Deletes every document in each selected collection, then loads the file. Use to restore a backup.' },
];

export function bytes(value) {
  const size = Number(value ?? 0);
  if (size < 1024) return `${number(size)} B`;
  const units = ['KB', 'MB', 'GB'];
  let amount = size / 1024;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) { amount /= 1024; unit += 1; }
  return `${amount.toFixed(amount < 10 ? 1 : 0)} ${units[unit]}`;
}

/** Wrong password on a confirm dialog (details are only sent outside production, so match the message too). */
const isPasswordError = (error) => error?.details?.some?.((item) => item.path === 'password') || /password is incorrect/i.test(error?.message ?? '');

/** Authenticated file download (the JSON api helper can't read binary responses or their errors). */
async function download(path, fallbackName) {
  const headers = {};
  const token = sessionStorage.getItem(SESSION_KEY);
  const viewAs = sessionStorage.getItem(VIEW_AS_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (token && viewAs) headers['X-View-As'] = viewAs;
  const response = await fetch(`/api/v1${path}`, { headers, cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? t('Download failed ({status}).').replace('{status}', response.status));
  }
  const name = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return name;
}

function CollectionPicker({ collections, selected, onChange, extra }) {
  const all = collections.length > 0 && collections.every((item) => selected.has(item.name));
  const some = collections.some((item) => selected.has(item.name));
  const toggle = (name, value) => {
    const next = new Set(selected);
    if (value) next.add(name); else next.delete(name);
    onChange(next);
  };
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <label className="flex cursor-pointer items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <Checkbox checked={all} indeterminate={some} onChange={(value) => onChange(value ? new Set(collections.map((item) => item.name)) : new Set())} label={t('Select all')} />
        <span className="flex-1">{t('Collection')}</span>
        {extra?.header}
      </label>
      <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
        {collections.map((item) => (
          <li key={item.name}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
              <Checkbox checked={selected.has(item.name)} onChange={(value) => toggle(item.name, value)} label={item.name} />
              <span className="flex-1 truncate font-mono text-[13px] text-slate-800">{item.name}</span>
              {extra?.row(item)}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OptionCard({ active, onClick, icon: Icon, title, badge, description, tone = 'teal' }) {
  const ring = active ? (tone === 'rose' ? 'ring-2 ring-rose-500 bg-rose-50/40' : 'ring-2 ring-teal-500 bg-teal-50/40') : 'ring-1 ring-slate-200 hover:ring-slate-300';
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`flex w-full items-start gap-3 rounded-xl p-4 text-left transition ${ring}`}>
      {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-teal-600 ring-1 ring-slate-200"><Icon size={17} /></span>}
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
          {t(title)}
          {badge && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-teal-700 uppercase">{t(badge)}</span>}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">{t(description)}</span>
      </span>
    </button>
  );
}

function SensitiveNote() {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ring-1 ring-amber-100">
      <AlertTriangle size={15} className="mt-px shrink-0" />
      {t('Backups contain customer details, orders and password hashes. Store them somewhere private and never share them.')}
    </p>
  );
}

/* ───────────────────────────── Export ───────────────────────────── */

function ExportCard({ collections, onSaved }) {
  const toast = useToast();
  const [format, setFormat] = useState('bson');
  const [selected, setSelected] = useState(() => new Set(collections.map((item) => item.name)));
  const [busy, setBusy] = useState(null);
  const chosen = collections.filter((item) => selected.has(item.name)).map((item) => item.name);
  const everything = chosen.length === collections.length;
  const current = FORMATS.find((item) => item.key === format);

  const runDownload = async () => {
    setBusy('download');
    try {
      const params = new URLSearchParams({ format });
      if (!everything) params.set('collections', chosen.join(','));
      const name = await download(`/database/export?${params}`, `swasti-export-${format}.zip`);
      toast.success(t('Downloaded {name}').replace('{name}', name));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  };

  const saveOnServer = async () => {
    setBusy('save');
    try {
      const backup = await api.post('/database/backups', { format, collections: everything ? [] : chosen }, { timeout: 0 });
      toast.success(t('Backup saved on the server: {name}').replace('{name}', backup.name));
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader icon={Download} title="Export database" description="Download a backup in a real MongoDB format." />
      <div className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {FORMATS.map((item) => <OptionCard key={item.key} active={format === item.key} onClick={() => setFormat(item.key)} icon={item.icon} title={item.title} badge={item.badge} description={item.description} />)}
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 font-mono text-[12px] break-all text-slate-100">
          <span className="text-slate-400"># {t('Restore with MongoDB tools after unzipping')}</span>
          <br />
          {current.command}
        </div>
        <CollectionPicker
          collections={collections}
          selected={selected}
          onChange={setSelected}
          extra={{ header: <span>{t('Documents')}</span>, row: (item) => <span className="text-xs text-slate-500 tabular-nums">{number(item.documents)}</span> }}
        />
        <SensitiveNote />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" icon={Save} busy={busy === 'save'} busyLabel="Saving…" disabled={!chosen.length || Boolean(busy)} onClick={saveOnServer}>Save backup on server</Button>
          <Button icon={Download} busy={busy === 'download'} busyLabel="Preparing…" disabled={!chosen.length || Boolean(busy)} onClick={runDownload}>
            {everything ? t('Download full backup') : t('Download {n} collection(s)').replace('{n}', chosen.length)}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ───────────────────────────── Import ───────────────────────────── */

function ResultSummary({ result, onClose }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
        <CheckCircle2 size={18} className="mt-px shrink-0" />
        <div>
          <p className="font-semibold">{t('Import complete')}</p>
          {result.safetyBackup && <p className="mt-0.5 text-xs">{t('A backup of the previous data was saved as {name}.').replace('{name}', result.safetyBackup)}</p>}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr><th className="px-4 py-2">{t('Collection')}</th><th className="px-4 py-2 text-right">{t('In file')}</th><th className="px-4 py-2 text-right">{t('Added')}</th><th className="px-4 py-2 text-right">{t('Updated')}</th><th className="px-4 py-2 text-right">{t('Removed')}</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.collections.map((item) => (
              <tr key={item.name}>
                <td className="px-4 py-2 font-mono text-[13px]">{item.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{number(item.documents)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{number(item.inserted)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{number(item.updated)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{number(item.removed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.warnings?.length > 0 && (
        <ul className="list-disc space-y-1 rounded-xl bg-amber-50 py-3 pr-4 pl-8 text-xs text-amber-800">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      )}
      <div className="flex justify-end"><Button onClick={onClose}>{t('Done')}</Button></div>
    </div>
  );
}

function ImportCard({ onImported }) {
  const toast = useToast();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [mode, setMode] = useState('merge');
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setFile(null); setPreview(null); setSelected(new Set()); setMode('merge'); setResult(null); setProgress(null);
    if (input.current) input.current.value = '';
  };

  const choose = async (chosen) => {
    if (!chosen) return;
    if (!/\.(zip|bson|json)$/i.test(chosen.name)) { toast.error(t('Choose a .zip, .bson or .json file.')); return; }
    setFile(chosen); setPreview(null); setResult(null); setProgress(0);
    const form = new FormData();
    form.append('file', chosen);
    try {
      const data = await api.post('/database/import/preview', form, { timeout: 0, onUploadProgress: (event) => event.total && setProgress(Math.round((event.loaded / event.total) * 100)) });
      setPreview(data);
      setSelected(new Set(data.collections.map((item) => item.name)));
    } catch (error) {
      toast.error(error.message);
      reset();
    } finally {
      setProgress(null);
    }
  };

  const runImport = async () => {
    setBusy(true); setPasswordError('');
    try {
      const data = await api.post('/database/import', { uploadId: preview.uploadId, mode, collections: [...selected], password }, { timeout: 0 });
      setConfirming(false); setPassword('');
      setResult(data);
      toast.success(t('Database import finished'));
      onImported();
    } catch (error) {
      if (isPasswordError(error)) setPasswordError(error.message);
      else { toast.error(error.message); setConfirming(false); }
    } finally {
      setBusy(false);
    }
  };

  const chosenCollections = preview?.collections.filter((item) => selected.has(item.name)) ?? [];
  const willDelete = mode === 'replace' ? chosenCollections.reduce((sum, item) => sum + (item.exists ? item.currentDocuments : 0), 0) : 0;
  const touchesUsers = selected.has('users');

  return (
    <Card>
      <CardHeader icon={Upload} title="Import database" description="Load a mongodump (.bson) or mongoexport (.json) backup, as a .zip or a single file." actions={preview && !result && <Button variant="ghost" size="sm" onClick={reset}>{t('Choose another file')}</Button>} />
      <div className="space-y-5 p-5">
        {result ? <ResultSummary result={result} onClose={reset} /> : !preview ? (
          <div
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files?.[0]); }}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${dragging ? 'border-teal-500 bg-teal-50/60' : 'border-slate-200'}`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100"><Upload size={22} /></span>
            {progress !== null ? (
              <div className="w-full max-w-xs">
                <p className="text-sm font-semibold text-slate-700">{progress < 100 ? t('Uploading {name}… {p}%').replace('{name}', file?.name ?? '').replace('{p}', progress) : t('Checking the file…')}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700">{t('Drop a backup file here, or')}</p>
                <Button variant="soft" icon={FileArchive} onClick={() => input.current?.click()}>Choose file</Button>
                <p className="text-xs text-slate-400">{t('.zip from this page, mongodump or mongoexport · .bson · .json (lines or array) · up to 250 MB')}</p>
              </>
            )}
            <input ref={input} type="file" accept=".zip,.bson,.json,application/zip,application/json" className="sr-only" onChange={(event) => choose(event.target.files?.[0])} />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="flex min-w-0 max-w-full items-start gap-2 font-semibold break-all text-slate-800"><FileArchive size={16} className="mt-0.5 shrink-0 text-teal-600" />{preview.fileName}</span>
              <span className="text-slate-500">{bytes(preview.size)}</span>
              <span className="text-slate-500">{preview.format === 'bson' ? t('BSON (mongodump)') : preview.format === 'json' ? t('Extended JSON (mongoexport)') : t('BSON + JSON')}</span>
              {preview.database && <span className="text-slate-500">{t('From database')} <span className="font-mono">{preview.database}</span></span>}
            </div>
            {preview.database && preview.database !== preview.currentDatabase && (
              <p className="flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-xs text-sky-800 ring-1 ring-sky-100">
                <Database size={15} className="mt-px shrink-0" />
                {t('This backup came from "{from}". It will be loaded into the current database "{to}".').replace('{from}', preview.database).replace('{to}', preview.currentDatabase)}
              </p>
            )}
            <CollectionPicker
              collections={preview.collections}
              selected={selected}
              onChange={setSelected}
              extra={{
                header: <><span className="w-14 text-right sm:w-24">{t('In file')}</span><span className="w-14 text-right sm:w-24">{t('Now')}</span></>,
                row: (item) => (
                  <>
                    {!item.exists && <StatusBadge tone="sky" label="New" />}
                    <span className="w-14 shrink-0 text-right text-xs sm:w-24 text-slate-700 tabular-nums">{number(item.documents)}</span>
                    <span className="w-14 shrink-0 text-right text-xs sm:w-24 text-slate-500 tabular-nums">{item.exists ? number(item.currentDocuments) : '—'}</span>
                  </>
                ),
              }}
            />
            <div className="grid gap-3 md:grid-cols-2">
              {MODES.map((item) => <OptionCard key={item.key} active={mode === item.key} onClick={() => setMode(item.key)} title={item.title} description={item.description} tone={item.key === 'replace' ? 'rose' : 'teal'} />)}
            </div>
            <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
              <ServerCog size={15} className="mt-px shrink-0" />
              {t('Before importing, the current data of the selected collections is saved as a backup on the server. If anything fails — or no active super administrator would remain — every change is rolled back automatically.')}
            </p>
            <div className="flex justify-end">
              <Button variant={mode === 'replace' ? 'danger' : 'primary'} icon={ArchiveRestore} disabled={!selected.size} onClick={() => { setPassword(''); setPasswordError(''); setConfirming(true); }}>
                {t('Import {n} collection(s)').replace('{n}', selected.size)}
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title="Confirm import"
        description="Enter your password to change the database."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
            <Button variant={mode === 'replace' ? 'danger' : 'primary'} icon={ArchiveRestore} busy={busy} busyLabel="Importing…" disabled={!password} onClick={runImport}>Import now</Button>
          </>
        )}
      >
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (password && !busy) runImport(); }}>
          <ul className="space-y-1.5 text-sm text-slate-600">
            <li>• {t('{n} collection(s): {names}').replace('{n}', chosenCollections.length).replace('{names}', chosenCollections.map((item) => item.name).join(', '))}</li>
            <li>• {mode === 'replace' ? t('Replace: {n} current document(s) will be deleted first.').replace('{n}', number(willDelete)) : t('Merge: matching _id documents are overwritten; nothing is deleted.')}</li>
          </ul>
          {touchesUsers && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ring-1 ring-amber-100">
              <AlertTriangle size={15} className="mt-px shrink-0" />
              {t('This changes user accounts. If your own account is replaced, you may be signed out and need to sign in with the password from the backup.')}
            </p>
          )}
          <FormInput label="Your password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} error={passwordError} required data-autofocus />
        </form>
      </Modal>
    </Card>
  );
}

/* ───────────────────────────── Server backups ───────────────────────────── */

function BackupsCard({ backups, onChanged }) {
  const toast = useToast();
  const [action, setAction] = useState(null); // { type: 'restore'|'delete', backup }
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const open = (type, backup) => { setAction({ type, backup }); setPassword(''); setPasswordError(''); };

  const run = async () => {
    setBusy(true); setPasswordError('');
    try {
      const name = encodeURIComponent(action.backup.name);
      if (action.type === 'delete') {
        await api.delete(`/database/backups/${name}`, { data: { password } });
        toast.success(t('Backup deleted'));
      } else {
        const result = await api.post(`/database/backups/${name}/restore`, { mode: 'replace', password }, { timeout: 0 });
        toast.success(t('Restored {n} collection(s) from the backup').replace('{n}', result.collections.length));
      }
      setAction(null);
      onChanged();
    } catch (error) {
      if (isPasswordError(error)) setPasswordError(error.message);
      else { toast.error(error.message); setAction(null); }
    } finally {
      setBusy(false);
    }
  };

  const get = async (backup) => {
    setDownloading(backup.name);
    try {
      await download(`/database/backups/${encodeURIComponent(backup.name)}`, backup.name);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card>
      <CardHeader icon={History} title="Backups on the server" description="Saved manually, or automatically before every import and restore (the newest 20 automatic ones are kept)." />
      {backups.length === 0 ? (
        <EmptyState icon={HardDrive} title="No backups yet" message="Use “Save backup on server” above to keep a copy on the server." />
      ) : (
        <>
        <ul className="divide-y divide-slate-100 sm:hidden">
          {backups.map((backup) => (
            <li key={backup.name} className="space-y-2 px-4 py-3.5">
              <p className="font-mono text-[12px] break-all text-slate-800">{backup.name}</p>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>{backup.format === 'bson' ? 'BSON' : 'Extended JSON'}</span>
                <span>{bytes(backup.size)}</span>
                <span>{dateTime(backup.createdAt)}</span>
                {backup.automatic && <span className="text-amber-700">{t('Automatic, before an import or restore')}</span>}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="secondary" icon={Download} busy={downloading === backup.name} busyLabel="…" onClick={() => get(backup)}>Download</Button>
                <Button size="sm" variant="soft" icon={ArchiveRestore} onClick={() => open('restore', backup)}>Restore</Button>
                <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => open('delete', backup)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-100 text-left text-xs text-slate-500">
              <tr><th className="px-5 py-2.5">{t('File')}</th><th className="px-3 py-2.5">{t('Format')}</th><th className="px-3 py-2.5 text-right">{t('Size')}</th><th className="px-3 py-2.5">{t('Created')}</th><th className="px-5 py-2.5 text-right">{t('Actions')}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backups.map((backup) => (
                <tr key={backup.name} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <p className="max-w-[320px] truncate font-mono text-[12.5px] text-slate-800" title={backup.name}>{backup.name}</p>
                    {backup.automatic && <span className="text-[11px] text-slate-400">{t('Automatic, before an import or restore')}</span>}
                  </td>
                  <td className="px-3 py-3 text-xs">{backup.format === 'bson' ? 'BSON' : 'Extended JSON'}</td>
                  <td className="px-3 py-3 text-right text-xs tabular-nums">{bytes(backup.size)}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{dateTime(backup.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" icon={Download} busy={downloading === backup.name} busyLabel="…" onClick={() => get(backup)}>Download</Button>
                      <Button size="sm" variant="soft" icon={ArchiveRestore} onClick={() => open('restore', backup)}>Restore</Button>
                      <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => open('delete', backup)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <Modal
        open={Boolean(action)}
        onClose={() => !busy && setAction(null)}
        title={action?.type === 'delete' ? 'Delete backup?' : 'Restore this backup?'}
        description={action?.backup.name}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setAction(null)} disabled={busy}>Cancel</Button>
            <Button variant="danger" icon={action?.type === 'delete' ? Trash2 : ArchiveRestore} busy={busy} busyLabel={action?.type === 'delete' ? 'Deleting…' : 'Restoring…'} disabled={!password} onClick={run}>
              {action?.type === 'delete' ? 'Delete' : 'Restore now'}
            </Button>
          </>
        )}
      >
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (password && !busy) run(); }}>
          <p className="text-sm text-slate-600">
            {action?.type === 'delete'
              ? t('The backup file will be removed from the server permanently.')
              : t('Every collection in this backup will be replaced with the backup’s data. A backup of the current data is saved first, and everything is rolled back if the restore fails.')}
          </p>
          <FormInput label="Your password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} error={passwordError} required data-autofocus />
        </form>
      </Modal>
    </Card>
  );
}

/* ───────────────────────────── Page ───────────────────────────── */

export default function DatabasePage() {
  const { data, loading, error, reload } = useApi(() => api.get('/database'), []);
  const exportKey = useMemo(() => data?.collections.map((item) => item.name).join(',') ?? '', [data]);

  if (loading && !data) {
    return (<><PageHeader title="Database" /><div className="space-y-6"><DashboardCardSkeleton count={4} /><Card><TableSkeleton rows={8} columns={['w-4', 'w-48', 'w-16']} /></Card></div></>);
  }
  if (error && !data) return (<><PageHeader title="Database" /><Card><ErrorState error={error} onRetry={reload} /></Card></>);

  return (
    <>
      <PageHeader
        title="Database"
        description="Back up, export and import the store database in MongoDB formats. Super administrators only."
        actions={<Button variant="secondary" icon={RefreshCw} onClick={reload}>Refresh</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Database" value={<span className="block truncate text-xl sm:text-2xl" title={data.database}>{data.database}</span>} icon={Database} />
        <StatCard title="Collections" value={number(data.totals.collections)} icon={Layers} accent="sky" />
        <StatCard title="Documents" value={number(data.totals.documents)} icon={FileJson} accent="violet" />
        <StatCard title="Data size" value={data.stats ? bytes(data.stats.dataSize) : '—'} icon={HardDrive} accent="amber" footnote={data.stats ? `${t('Storage')} ${bytes(data.stats.storageSize)} · ${t('Indexes')} ${bytes(data.stats.indexSize)}` : undefined} />
      </div>
      <div className="mt-6 grid gap-6 2xl:grid-cols-2">
        <ExportCard key={exportKey} collections={data.collections} onSaved={reload} />
        <ImportCard onImported={reload} />
      </div>
      <div className="mt-6">
        <BackupsCard backups={data.backups} onChanged={reload} />
      </div>
    </>
  );
}
