import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import toast, { Toaster } from 'react-hot-toast';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Plus, Brain, BarChart3, BookOpen, Bell, Calendar,
  Zap, X, ChevronRight, Clock, MapPin, Tag, Trash2,
  CheckCircle2, Circle, AlertCircle, RefreshCw, Send,
  BookMarked, GraduationCap, Users, Star, Search,
  Moon, Sun, Settings, ExternalLink, Download, Upload,
  ChevronDown, Loader2, Target, TrendingUp, Award
} from 'lucide-react';
import {
  getEvents, createEvent, deleteEvent,
  getAssignments, createAssignment, updateAssignmentStatus, deleteAssignment,
  getSubjects, createSubject,
  getAnalytics, sendChatMessage, autoSchedule,
  getFreeSlots, getGoogleAuthUrl, syncToGoogle, importFromGoogle,
  sendNotification
} from '../lib/api';

// ── Colour helpers ────────────────────────────────────────────────────────────
const EVENT_COLORS = {
  exam:     '#E11D48',
  study:    '#059669',
  personal: '#D97706',
  class:    '#4F46E5',
};
const PRIORITY_COLORS = { high: '#E11D48', medium: '#D97706', low: '#059669' };
const CHART_PALETTE = ['#4F46E5','#7C3AED','#059669','#D97706','#E11D48','#0EA5E9'];

function getEventColor(type, priority) {
  if (type === 'exam')     return '#E11D48';
  if (type === 'study')    return '#059669';
  if (type === 'personal') return '#D97706';
  return priority === 'high' ? '#7C3AED' : '#4F46E5';
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const fmt = (iso) => iso ? iso.slice(0, 16).replace('T', ' ') : '—';
const daysUntil = (iso) => {
  const diff = new Date(iso) - new Date();
  return Math.ceil(diff / 86400000);
};

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════
function StatCard({ label, value, icon, gradient, sub }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 text-white ${gradient} shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold font-display leading-none">{value}</p>
          <p className="text-xs mt-1 opacity-80 font-medium">{label}</p>
          {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD EVENT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function AddEventModal({ onClose, onSave, subjects }) {
  const [form, setForm] = useState({
    title: '', event_type: 'class', start_datetime: '', end_datetime: '',
    location: '', subject: '', priority: 'medium', recurrence: '', description: ''
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.start_datetime || !form.end_datetime) {
      toast.error('Fill title, start and end time'); return;
    }
    if (new Date(form.start_datetime) >= new Date(form.end_datetime)) {
      toast.error('End time must be after start time'); return;
    }
    setSaving(true);
    try {
      const result = await onSave(form);
      if (result?.conflicts?.length > 0) {
        toast(`⚠️ Conflict detected — event still saved`, { icon: '⚠️', style: { background: '#FEF3C7' } });
      } else {
        toast.success('Event added!');
      }
      onClose();
    } catch { toast.error('Failed to save event'); }
    finally { setSaving(false); }
  };

  const TYPE_OPTIONS = [
    { value: 'class',    label: '📚 Class',    color: 'bg-indigo-100 text-indigo-700' },
    { value: 'exam',     label: '📝 Exam',     color: 'bg-rose-100 text-rose-700' },
    { value: 'study',    label: '📖 Study',    color: 'bg-emerald-100 text-emerald-700' },
    { value: 'personal', label: '👤 Personal', color: 'bg-amber-100 text-amber-700' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 modal-backdrop">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl modal-content overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Calendar size={18} />
            <h2 className="font-bold text-base">Add New Event</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Event Title *</label>
            <input
              className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
              placeholder="e.g. Physics Lecture"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          {/* Type selector */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Event Type</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => set('event_type', t.value)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.event_type === t.value
                      ? `${t.color} border-current scale-105 shadow-sm`
                      : 'border-slate-100 text-slate-500 hover:border-slate-200'
                  }`}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {/* Date/time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Start *</label>
              <input type="datetime-local"
                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
                value={form.start_datetime}
                onChange={e => set('start_datetime', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">End *</label>
              <input type="datetime-local"
                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
                value={form.end_datetime}
                onChange={e => set('end_datetime', e.target.value)} />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Priority</label>
            <div className="flex gap-2">
              {[['high','🔴 High','bg-rose-100 text-rose-700'],['medium','🟡 Medium','bg-amber-100 text-amber-700'],['low','🟢 Low','bg-emerald-100 text-emerald-700']].map(([v,l,c]) => (
                <button key={v} onClick={() => set('priority', v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.priority === v ? `${c} border-current` : 'border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}>{l}</button>
              ))}
            </div>
          </div>

          {/* Subject + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Subject</label>
              <select className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
                value={form.subject} onChange={e => set('subject', e.target.value)}>
                <option value="">— Select —</option>
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Location</label>
              <input className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
                placeholder="Room / Online"
                value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Repeat</label>
            <select className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
              value={form.recurrence} onChange={e => set('recurrence', e.target.value)}>
              <option value="">One-time (no repeat)</option>
              <option value="FREQ=WEEKLY;COUNT=16">Weekly · Full Semester (16 weeks)</option>
              <option value="FREQ=WEEKLY;COUNT=8">Weekly · 8 Weeks</option>
              <option value="FREQ=DAILY;COUNT=5">Daily · Mon–Fri this week</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Notes</label>
            <textarea rows={2}
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-indigo-400 transition-colors"
              placeholder="Optional notes..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border-2 border-slate-100 rounded-xl py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {saving ? 'Saving…' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD ASSIGNMENT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function AddAssignmentModal({ onClose, onSave, subjects }) {
  const [form, setForm] = useState({
    title: '', subject: '', deadline: '', description: '',
    priority: 'medium', estimated_hours: 2
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.subject || !form.deadline) {
      toast.error('Fill title, subject and deadline'); return;
    }
    setSaving(true);
    try {
      await onSave(form);
      toast.success('Assignment added!');
      onClose();
    } catch { toast.error('Failed to add assignment'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 modal-backdrop">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl modal-content overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <BookOpen size={18} />
            <h2 className="font-bold text-base">Add Assignment</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Title *</label>
            <input className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
              placeholder="e.g. Data Structures Assignment 3"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Subject *</label>
              <select className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400"
                value={form.subject} onChange={e => set('subject', e.target.value)}>
                <option value="">— Select —</option>
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Deadline *</label>
              <input type="datetime-local"
                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400"
                value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Priority</label>
              <div className="flex gap-1.5">
                {[['high','🔴'],['medium','🟡'],['low','🟢']].map(([v,e]) => (
                  <button key={v} onClick={() => set('priority', v)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                      form.priority === v ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-100 text-slate-400'
                    }`}>{e}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Est. Hours</label>
              <input type="number" min="0.5" max="100" step="0.5"
                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400"
                value={form.estimated_hours} onChange={e => set('estimated_hours', parseFloat(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Description</label>
            <textarea rows={2} className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-violet-400"
              placeholder="Requirements, notes..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border-2 border-slate-100 rounded-xl py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {saving ? 'Saving…' : 'Add Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD SUBJECT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const SUBJECT_COLORS = ['#4F46E5','#7C3AED','#059669','#D97706','#E11D48','#0EA5E9','#EC4899','#14B8A6'];

function AddSubjectModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', code: '', teacher: '', credits: 3, color: '#4F46E5' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Subject name required'); return; }
    setSaving(true);
    try { await onSave(form); toast.success('Subject added!'); onClose(); }
    catch { toast.error('Failed to add subject'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 modal-backdrop">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl modal-content overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <GraduationCap size={18} />
            <h2 className="font-bold text-base">Add Subject</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Subject Name *</label>
            <input className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
              placeholder="e.g. Data Structures"
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Code</label>
              <input className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                placeholder="CS301"
                value={form.code} onChange={e => set('code', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Credits</label>
              <input type="number" min="1" max="6"
                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                value={form.credits} onChange={e => set('credits', parseInt(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Teacher</label>
            <input className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
              placeholder="Prof. Name"
              value={form.teacher} onChange={e => set('teacher', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {SUBJECT_COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  style={{ background: c }}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border-2 border-slate-100 rounded-xl py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {saving ? 'Saving…' : 'Add Subject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-SCHEDULE MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function AutoScheduleModal({ onClose, subjects, onDone }) {
  const [form, setForm] = useState({ subject: '', total_hours: 4, deadline: '', preferred_slot: 'morning' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.subject || !form.deadline) { toast.error('Fill subject and deadline'); return; }
    setLoading(true);
    try {
      const result = await autoSchedule(form);
      toast.success(`✅ ${result.sessions_created?.length ?? 0} study sessions auto-scheduled!`);
      onDone();
      onClose();
    } catch { toast.error('Auto-schedule failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 modal-backdrop">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl modal-content overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Zap size={18} />
            <h2 className="font-bold text-base">Auto-Schedule Study</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">AI will automatically find free slots and schedule study sessions before your deadline.</p>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Subject *</label>
            <select className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              value={form.subject} onChange={e => set('subject', e.target.value)}>
              <option value="">— Choose Subject —</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Total Hours</label>
              <input type="number" min="1" max="20"
                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                value={form.total_hours} onChange={e => set('total_hours', parseFloat(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Deadline *</label>
              <input type="datetime-local"
                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Preferred Time</label>
            <div className="grid grid-cols-3 gap-2">
              {[['morning','🌅 Morning'],['afternoon','☀️ Afternoon'],['evening','🌙 Evening']].map(([v,l]) => (
                <button key={v} onClick={() => set('preferred_slot', v)}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.preferred_slot === v ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border-2 border-slate-100 rounded-xl py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            {loading ? 'Scheduling…' : 'Auto-Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS PANEL (slide-over)
// ═══════════════════════════════════════════════════════════════════════════════
function NotificationsPanel({ onClose, deadlines }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('both');
  const [sending, setSending] = useState(false);

  const urgent = deadlines.filter(d => daysUntil(d.deadline) <= 3);
  const upcoming = deadlines.filter(d => daysUntil(d.deadline) > 3 && daysUntil(d.deadline) <= 7);

  const handleSend = async () => {
    if (!email.includes('@')) { toast.error('Enter a valid email'); return; }
    setSending(true);
    try {
  await sendNotification({ email, type, days_ahead: 2 });
  toast.success(`📧 Notification sent to ${email}`);
  if (phone && phone.includes('+')) {
    await sendWhatsAppNotification({ phone, type });
    toast.success(`📱 WhatsApp sent to ${phone}`);
  }
} catch { toast.error('Notification failed — check backend email config'); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl flex flex-col z-40 border-l border-slate-100 animate-slide-right">
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Bell size={18} />
          <span className="font-bold">Reminders & Alerts</span>
          {urgent.length > 0 && (
            <span className="bg-white text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">{urgent.length}</span>
          )}
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Urgent deadlines */}
        {urgent.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <AlertCircle size={12} /> Urgent (≤3 days)
            </h3>
            <div className="space-y-2">
              {urgent.map(d => (
                <div key={d.id} className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-rose-800">{d.title}</p>
                  <p className="text-xs text-rose-600 mt-0.5">{d.subject} · Due {fmt(d.deadline)}</p>
                  <p className="text-xs font-bold text-rose-700 mt-1">
                    {daysUntil(d.deadline) <= 0 ? '🚨 OVERDUE' : `⏰ ${daysUntil(d.deadline)} day(s) left`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">This Week</h3>
            <div className="space-y-2">
              {upcoming.map(d => (
                <div key={d.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-amber-800">{d.title}</p>
                  <p className="text-xs text-amber-600 mt-0.5">{d.subject} · Due {fmt(d.deadline)}</p>
                  <p className="text-xs text-amber-700 mt-1">📅 {daysUntil(d.deadline)} days left</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {urgent.length === 0 && upcoming.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No upcoming deadlines this week 🎉</p>
          </div>
        )}

        {/* Email reminder sender */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <Send size={14} /> Send Email Reminder
          </h3>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-400"
          />
          <input
  type="tel"
  placeholder="+91 your phone number"
  value={phone}
  onChange={e => setPhone(e.target.value)}
  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-400"
/>
          <div className="flex gap-2">
            {[['both','📧 Both'],['deadline','📌 Deadlines'],['daily','📅 Daily']].map(([v,l]) => (
              <button key={v} onClick={() => setType(v)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                  type === v ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-400'
                }`}>{l}</button>
            ))}
          </div>
          <button onClick={handleSend} disabled={sending}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Sending…' : 'Send Reminder'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FREE SLOT FINDER
// ═══════════════════════════════════════════════════════════════════════════════
function FreeSlotFinder({ onClose }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState(60);
  const [slots, setSlots] = useState(null);
  const [loading, setLoading] = useState(false);

  const find = async () => {
    setLoading(true);
    try {
      const result = await getFreeSlots(date, duration);
      setSlots(result.slots);
    } catch { toast.error('Could not fetch free slots'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 modal-backdrop">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl modal-content overflow-hidden">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Clock size={18} />
            <h2 className="font-bold text-base">Find Free Slots</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Date</label>
            <input type="date"
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Slot Duration</label>
            <div className="flex gap-2">
              {[[30,'30 min'],[60,'1 hr'],[90,'1.5 hr'],[120,'2 hr']].map(([v,l]) => (
                <button key={v} onClick={() => setDuration(v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    duration === v ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-100 text-slate-400'
                  }`}>{l}</button>
              ))}
            </div>
          </div>

          <button onClick={find} disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? 'Searching…' : 'Find Slots'}
          </button>

          {slots !== null && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {slots.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">No free slots found for this day</p>
              ) : slots.map((s, i) => (
                <div key={i} className="flex items-center gap-3 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5">
                  <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-sky-800">{s.start?.slice(11, 16)} – {s.end?.slice(11, 16)}</p>
                    <p className="text-xs text-sky-600">{duration} min available</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE CALENDAR MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function GoogleCalendarModal({ onClose, onRefresh }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState(null);

  const getAuthUrl = async () => {
    try {
      const res = await getGoogleAuthUrl();
      setAuthUrl(res.auth_url);
    } catch { toast.error('Could not get Google auth URL'); }
  };

  const sync = async (direction) => {
    if (!email.includes('@')) { toast.error('Enter a valid email'); return; }
    setLoading(true);
    try {
      if (direction === 'export') {
        const r = await syncToGoogle(email);
        toast.success(`✅ ${r.synced} events synced to Google Calendar!`);
      } else {
        const r = await importFromGoogle(email);
        toast.success(`✅ ${r.imported} events imported from Google!`);
        onRefresh();
      }
    } catch { toast.error('Sync failed — check Google Calendar setup in backend'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 modal-backdrop">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl modal-content overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <RefreshCw size={18} />
            <h2 className="font-bold text-base">Google Calendar Sync</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              ℹ️ Requires Google OAuth credentials in backend <code className="font-mono">.env</code> file. See README for setup.
            </p>
          </div>

          {!authUrl ? (
            <button onClick={getAuthUrl}
              className="w-full flex items-center justify-center gap-2 border-2 border-green-300 rounded-xl py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50">
              <ExternalLink size={14} /> Connect Google Account
            </button>
          ) : (
            <a href={authUrl} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-green-50 border-2 border-green-300 rounded-xl py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100">
              <ExternalLink size={14} /> Open Google Auth
            </a>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Your Google Email</label>
            <input type="email" placeholder="you@gmail.com"
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="flex gap-3">
            <button onClick={() => sync('export')} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl py-2.5 text-xs font-bold hover:opacity-90 disabled:opacity-60">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Export
            </button>
            <button onClick={() => sync('import')} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 border-2 border-green-400 text-green-700 rounded-xl py-2.5 text-xs font-bold hover:bg-green-50 disabled:opacity-60">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI CHAT PANEL
// ═══════════════════════════════════════════════════════════════════════════════
const QUICK_PROMPTS = [
  "What are my deadlines this week?",
  "Find a free 2-hour slot tomorrow",
  "Schedule Physics every Monday 9-10 AM for 16 weeks",
  "How many pending assignments do I have?",
  "Add a Math exam next Friday at 10 AM",
];

function ChatPanel({ onClose, onRefresh }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Smart Timetable AI 🎓\n\nI can help you:\n• Schedule classes, exams & study sessions\n• Find free time slots\n• Check upcoming deadlines\n• Detect and resolve conflicts\n\nTry a quick prompt below, or just ask me anything!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const result = await sendChatMessage(msg, history);
      setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
      // Refresh data if AI likely modified schedule
      if (/schedule|add|create|delete|remov/i.test(msg)) onRefresh();
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Backend not reachable. Make sure the FastAPI server is running on port 8000.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col z-40 border-l border-slate-100 animate-slide-right">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Brain size={16} />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">AI Assistant</p>
            <p className="text-xs text-indigo-200">Powered by LangChain</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                <Brain size={13} className="text-white" />
              </div>
            )}
            <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
              m.role === 'user'
                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm'
                : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
              <Brain size={13} className="text-white" />
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 rounded-bl-sm">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 border-t border-slate-100 bg-white overflow-x-auto">
        <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => send(p)}
              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-3 py-1.5 whitespace-nowrap hover:bg-indigo-100 transition-colors font-medium flex-shrink-0">
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            rows={1}
            className="flex-1 border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none transition-colors leading-relaxed"
            placeholder="Ask anything about your schedule…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ analytics }) {
  if (!analytics) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <Loader2 size={24} className="animate-spin mr-2" /> Loading analytics…
    </div>
  );

  const maxEvents = Math.max(...(analytics.events_by_type?.map(e => e.count) || [1]));
  const totalAssignments = analytics.assignments_by_status?.reduce((a, b) => a + b.count, 0) || 1;
  const completed = analytics.assignments_by_status?.find(a => a.status === 'completed')?.count || 0;
  const completionRate = Math.round((completed / totalAssignments) * 100);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
          <p className="text-2xl font-bold text-indigo-600">{analytics.summary?.total_events ?? 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Events</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
          <p className="text-2xl font-bold text-violet-600">{completionRate}%</p>
          <p className="text-xs text-slate-500 mt-0.5">Completed</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{analytics.summary?.total_subjects ?? 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">Subjects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Events by type — pie chart */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
            <Calendar size={14} className="text-indigo-500" /> Events by Type
          </h3>
          {analytics.events_by_type?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={analytics.events_by_type} dataKey="count" nameKey="event_type"
                  cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3}>
                  {analytics.events_by_type.map((e, i) => (
                    <Cell key={e.event_type} fill={EVENT_COLORS[e.event_type] || CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-xs text-slate-400 py-8">No events yet</p>}
        </div>

        {/* Assignment status — bar chart */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
            <BookOpen size={14} className="text-violet-500" /> Assignment Status
          </h3>
          {analytics.assignments_by_status?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={analytics.assignments_by_status} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="status" tick={{ fontSize: 10 }}
                  tickFormatter={v => v === 'in_progress' ? 'In Progress' : v.charAt(0).toUpperCase() + v.slice(1)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6,6,0,0]}>
                  {analytics.assignments_by_status.map((a, i) => (
                    <Cell key={a.status} fill={a.status === 'completed' ? '#059669' : a.status === 'in_progress' ? '#4F46E5' : '#D97706'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-xs text-slate-400 py-8">No assignments yet</p>}
        </div>
      </div>

      {/* Events by type — horizontal bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-sky-500" /> Schedule Breakdown
        </h3>
        <div className="space-y-3">
          {(analytics.events_by_type || []).map((e, i) => (
            <div key={e.event_type} className="flex items-center gap-3">
              <span className="text-xs w-20 text-slate-500 capitalize font-medium">{e.event_type}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                <div className="h-2.5 rounded-full transition-all duration-700"
                  style={{
                    width: `${(e.count / maxEvents) * 100}%`,
                    background: EVENT_COLORS[e.event_type] || CHART_PALETTE[i]
                  }} />
              </div>
              <span className="text-xs font-bold text-slate-600 w-6 text-right">{e.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Completion progress */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold">Assignment Progress</p>
            <p className="text-xs text-indigo-200 mt-0.5">{completed} of {totalAssignments} completed</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Award size={20} />
          </div>
        </div>
        <div className="bg-white/20 rounded-full h-3">
          <div className="bg-white rounded-full h-3 transition-all duration-700"
            style={{ width: `${completionRate}%` }} />
        </div>
        <p className="text-xs text-indigo-200 mt-2">{completionRate}% done — keep it up! 🚀</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SubjectsTab({ subjects, onAdd, onRefresh }) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <GraduationCap size={16} className="text-emerald-500" /> My Subjects
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{subjects.length}</span>
        </h2>
        <button onClick={onAdd}
          className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs px-3 py-2 rounded-xl font-semibold hover:opacity-90">
          <Plus size={13} /> Add Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
          <GraduationCap size={36} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">No subjects yet</p>
          <p className="text-xs text-slate-300 mt-1">Add your subjects to get started</p>
          <button onClick={onAdd}
            className="mt-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-emerald-100">
            + Add First Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subjects.map(s => (
            <div key={s.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                style={{ background: s.color || '#4F46E5' }}>
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{s.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {s.code && <span className="font-mono mr-2">{s.code}</span>}
                  {s.teacher && <span>{s.teacher}</span>}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold" style={{ color: s.color || '#4F46E5' }}>{s.credits}</p>
                <p className="text-xs text-slate-400">credits</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AssignmentsTab({ assignments, subjects, onAdd, onUpdateStatus, onDelete }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = assignments.filter(a => {
    const matchStatus = filter === 'all' || a.status === filter;
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.subject?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const STATUS_CYCLE = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
  const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', completed: 'Done' };
  const STATUS_COLORS = {
    pending:     'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed:   'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <BookOpen size={16} className="text-violet-500" /> Assignments
          <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {assignments.filter(a => a.status !== 'completed').length} pending
          </span>
        </h2>
        <button onClick={onAdd}
          className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs px-3 py-2 rounded-xl font-semibold hover:opacity-90">
          <Plus size={13} /> Add Assignment
        </button>
      </div>

      {/* Filters + search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[['all','All'],['pending','Pending'],['in_progress','In Progress'],['completed','Done']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === v ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>{l}</button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search…"
            className="border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-violet-400 w-36"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
          <BookOpen size={36} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">No assignments found</p>
          <button onClick={onAdd}
            className="mt-4 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-violet-100">
            + Add Assignment
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const days = daysUntil(a.deadline);
            const isOverdue = days < 0 && a.status !== 'completed';
            return (
              <div key={a.id}
                className={`bg-white rounded-2xl p-4 border flex gap-3 shadow-sm hover:shadow-md transition-all ${
                  a.status === 'completed' ? 'opacity-60 border-slate-100' : isOverdue ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'
                }`}>
                {/* Priority dot */}
                <div className="flex-shrink-0 pt-0.5">
                  <div className="w-3 h-3 rounded-full mt-1" style={{ background: PRIORITY_COLORS[a.priority] || '#D97706' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold leading-tight ${a.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {a.title}
                    </p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Tag size={10} /> {a.subject}
                    </span>
                    <span className={`text-xs flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-600' : days <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                      <Clock size={10} />
                      {isOverdue ? `Overdue by ${Math.abs(days)}d` : `Due in ${days}d · ${a.deadline?.slice(0,10)}`}
                    </span>
                    {a.estimated_hours && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Target size={10} /> {a.estimated_hours}h
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => onUpdateStatus(a.id, STATUS_CYCLE[a.status])}
                    className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50" title="Cycle status">
                    {a.status === 'completed' ? <CheckCircle2 size={16} className="text-emerald-500" /> :
                     a.status === 'in_progress' ? <Circle size={16} className="text-blue-500" /> :
                     <Circle size={16} />}
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${a.title}"?`)) onDelete(a.id); }}
                    className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'calendar',    label: 'Calendar',    icon: Calendar },
  { id: 'assignments', label: 'Assignments', icon: BookOpen },
  { id: 'subjects',    label: 'Subjects',    icon: GraduationCap },
  { id: 'analytics',   label: 'Analytics',  icon: BarChart3 },
];

export default function Home() {
  const [events, setEvents]           = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects]       = useState([]);
  const [analytics, setAnalytics]     = useState(null);
  const [deadlines, setDeadlines]     = useState([]);
  const [activeTab, setActiveTab]     = useState('calendar');
  const [loading, setLoading]         = useState(true);

  // Modals
  const [modal, setModal] = useState(null); // 'event' | 'assignment' | 'subject' | 'autoschedule' | 'freeSlot' | 'google'

  // Panels
  const [showChat, setShowChat]           = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const calendarRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [evRes, asRes, subRes, anRes] = await Promise.all([
        getEvents(), getAssignments(), getSubjects(), getAnalytics()
      ]);
      setEvents(evRes.events.map(e => ({
        id: String(e.id),
        title: e.title,
        start: e.start_datetime,
        end: e.end_datetime,
        backgroundColor: getEventColor(e.event_type, e.priority),
        borderColor: getEventColor(e.event_type, e.priority),
        extendedProps: e,
      })));
      setAssignments(asRes.assignments);
      setSubjects(subRes.subjects);
      setAnalytics(anRes);
      // Collect upcoming deadlines (next 7 days)
      const soon = asRes.assignments.filter(a =>
        a.status !== 'completed' && daysUntil(a.deadline) <= 7
      );
      setDeadlines(soon);
    } catch {
      toast.error('Backend not connected — start FastAPI on port 8000');
    } finally { setLoading(false); }
  }, []);
const router = useRouter();

useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/login');
  }
}, []);
  useEffect(() => { loadData(); }, [loadData]);

  // Periodic refresh every 60s
  useEffect(() => {
    const id = setInterval(loadData, 60000);
    return () => clearInterval(id);
  }, [loadData]);

  const handleSaveEvent = async (formData) => {
    const pad = (dt) => dt.length === 16 ? dt + ':00' : dt;
    const result = await createEvent({ ...formData, start_datetime: pad(formData.start_datetime), end_datetime: pad(formData.end_datetime) });
    await loadData();
    return result;
  };

  const handleEventClick = (info) => {
    const e = info.event;
    if (confirm(`Delete "${e.title}"?\n${fmt(e.extendedProps.start_datetime)}`)) {
      deleteEvent(Number(e.id)).then(() => { toast.success('Event deleted'); loadData(); });
    }
  };

  const urgentCount = deadlines.filter(d => daysUntil(d.deadline) <= 3).length;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '12px', fontSize: '13px' } }} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-lg">📅</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Smart Timetable
            </h1>
            <p className="text-xs text-slate-400">AI Academic Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick actions */}
          <button onClick={() => setModal('freeSlot')}
            className="hidden sm:flex items-center gap-1 text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1.5 rounded-xl font-semibold hover:bg-sky-100 transition-colors">
            <Clock size={12} /> Free Slots
          </button>
          <button onClick={() => setModal('autoschedule')}
            className="hidden sm:flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-xl font-semibold hover:bg-amber-100 transition-colors">
            <Zap size={12} /> Auto-Schedule
          </button>
          <button onClick={() => setModal('google')}
            className="hidden sm:flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-xl font-semibold hover:bg-green-100 transition-colors">
            <RefreshCw size={12} /> Google Sync
          </button>

          {/* Notifications bell */}
          <button onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
            <Bell size={16} className="text-slate-600" />
            {urgentCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {urgentCount}
              </span>
            )}
          </button>

          <button onClick={() => setModal('event')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs px-3 py-2 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm">
            <Plus size={13} /> Add Event
          </button>
          <button onClick={() => setShowChat(!showChat)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs px-3 py-2 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm">
            <Brain size={13} /> AI Chat
          </button>
        </div>
      </header>

      {/* ── Stats Bar ───────────────────────────────────────────────────────── */}
      {analytics && !loading && (
        <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border-b border-slate-100">
          <StatCard label="Total Events" value={analytics.summary?.total_events ?? 0}
            icon={<Calendar size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-indigo-500 to-indigo-700" />
          <StatCard label="Pending Tasks" value={assignments.filter(a => a.status !== 'completed').length}
            icon={<Clock size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-amber-400 to-orange-500"
            sub={urgentCount > 0 ? `${urgentCount} urgent` : undefined} />
          <StatCard label="Subjects" value={analytics.summary?.total_subjects ?? 0}
            icon={<GraduationCap size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
          <StatCard label="Deadlines Soon" value={deadlines.length}
            icon={<Bell size={18} className="text-white" />}
            gradient="bg-gradient-to-br from-violet-500 to-purple-700"
            sub="next 7 days" />
        </div>
      )}

      {/* Mobile quick actions */}
      <div className="sm:hidden flex gap-2 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto">
        {[
          ['freeSlot', <Clock size={11} />, 'Find Slots', 'bg-sky-50 text-sky-700 border-sky-200'],
          ['autoschedule', <Zap size={11} />, 'Auto-Schedule', 'bg-amber-50 text-amber-700 border-amber-200'],
          ['google', <RefreshCw size={11} />, 'Google Sync', 'bg-green-50 text-green-700 border-green-200'],
          ['assignment', <BookOpen size={11} />, 'Add Task', 'bg-violet-50 text-violet-700 border-violet-200'],
        ].map(([m, icon, label, cls]) => (
          <button key={m} onClick={() => setModal(m)}
            className={`flex items-center gap-1 border text-xs px-2.5 py-1.5 rounded-xl font-semibold whitespace-nowrap flex-shrink-0 ${cls}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 flex gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="p-4 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3 text-indigo-400" />
            <span>Loading your schedule…</span>
          </div>
        ) : (
          <>
            {/* CALENDAR TAB */}
            {activeTab === 'calendar' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-slide-up">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                  events={events}
                  eventClick={handleEventClick}
                  dateClick={() => setModal('event')}
                  editable selectable
                  height="auto"
                  slotMinTime="07:00:00"
                  slotMaxTime="23:00:00"
                  allDaySlot={false}
                  nowIndicator
                  eventDisplay="block"
                  eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                />
              </div>
            )}

            {/* ASSIGNMENTS TAB */}
            {activeTab === 'assignments' && (
              <AssignmentsTab
                assignments={assignments}
                subjects={subjects}
                onAdd={() => setModal('assignment')}
                onUpdateStatus={async (id, status) => {
                  await updateAssignmentStatus(id, status);
                  await loadData();
                }}
                onDelete={async (id) => {
                  await deleteAssignment(id);
                  toast.success('Assignment deleted');
                  await loadData();
                }}
              />
            )}

            {/* SUBJECTS TAB */}
            {activeTab === 'subjects' && (
              <SubjectsTab
                subjects={subjects}
                onAdd={() => setModal('subject')}
                onRefresh={loadData}
              />
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} />}
          </>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modal === 'event' && (
        <AddEventModal
          onClose={() => setModal(null)}
          onSave={handleSaveEvent}
          subjects={subjects}
        />
      )}
      {modal === 'assignment' && (
        <AddAssignmentModal
          onClose={() => setModal(null)}
          onSave={async (data) => { await createAssignment(data); await loadData(); }}
          subjects={subjects}
        />
      )}
      {modal === 'subject' && (
        <AddSubjectModal
          onClose={() => setModal(null)}
          onSave={async (data) => { await createSubject(data); await loadData(); }}
        />
      )}
      {modal === 'autoschedule' && (
        <AutoScheduleModal
          onClose={() => setModal(null)}
          subjects={subjects}
          onDone={loadData}
        />
      )}
      {modal === 'freeSlot' && (
        <FreeSlotFinder onClose={() => setModal(null)} />
      )}
      {modal === 'google' && (
        <GoogleCalendarModal onClose={() => setModal(null)} onRefresh={loadData} />
      )}

      {/* ── Panels ──────────────────────────────────────────────────────────── */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30 modal-backdrop" onClick={() => setShowNotifications(false)} />
          <NotificationsPanel onClose={() => setShowNotifications(false)} deadlines={deadlines} />
        </>
      )}
      {showChat && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30 modal-backdrop" onClick={() => setShowChat(false)} />
          <ChatPanel onClose={() => setShowChat(false)} onRefresh={loadData} />
        </>
      )}
    </div>
  );
}