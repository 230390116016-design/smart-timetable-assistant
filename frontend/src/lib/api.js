// lib/api.js - Axios API client for FastAPI backend

import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Events ──────────────────────────────────────────────────────────────────
export const getEvents = (params = {}) =>
  api.get('/api/events', { params }).then(r => r.data);

export const createEvent = (data) =>
  api.post('/api/events', data).then(r => r.data);

export const updateEvent = (id, data) =>
  api.put(`/api/events/${id}`, data).then(r => r.data);

export const deleteEvent = (id) =>
  api.delete(`/api/events/${id}`).then(r => r.data);

export const checkConflicts = (start, end, excludeId) =>
  api.get('/api/events/conflicts/check', { params: { start, end, exclude_id: excludeId } }).then(r => r.data);

export const getFreeSlots = (date, duration = 60) =>
  api.get('/api/events/free-slots', { params: { date, duration } }).then(r => r.data);

// ─── Assignments ─────────────────────────────────────────────────────────────
export const getAssignments = (params = {}) =>
  api.get('/api/assignments', { params }).then(r => r.data);

export const createAssignment = (data) =>
  api.post('/api/assignments', data).then(r => r.data);

export const updateAssignmentStatus = (id, status) =>
  api.put(`/api/assignments/${id}/status`, null, { params: { status } }).then(r => r.data);

export const deleteAssignment = (id) =>
  api.delete(`/api/assignments/${id}`).then(r => r.data);

export const getUpcomingDeadlines = (days = 7) =>
  api.get('/api/assignments/deadlines', { params: { days } }).then(r => r.data);

// ─── Subjects ────────────────────────────────────────────────────────────────
export const getSubjects = () =>
  api.get('/api/subjects').then(r => r.data);

export const createSubject = (data) =>
  api.post('/api/subjects', data).then(r => r.data);

// ─── AI Chat ─────────────────────────────────────────────────────────────────
export const sendChatMessage = (message, history = []) =>
  api.post('/api/chat', { message, history }).then(r => r.data);

// ─── Analytics ───────────────────────────────────────────────────────────────
export const getAnalytics = () =>
  api.get('/api/analytics').then(r => r.data);

// ─── Auto Schedule ───────────────────────────────────────────────────────────
export const autoSchedule = (data) =>
  api.post('/api/auto-schedule', data).then(r => r.data);

// ─── Notifications ───────────────────────────────────────────────────────────
export const sendNotification = (data) =>
  api.post('/api/notifications/send', data).then(r => r.data);

// ─── Google Calendar ─────────────────────────────────────────────────────────
export const getGoogleAuthUrl = () =>
  api.get('/api/google/auth-url').then(r => r.data);

export const syncToGoogle = (userEmail) =>
  api.post('/api/google/sync', null, { params: { user_email: userEmail } }).then(r => r.data);

export const importFromGoogle = (userEmail) =>
  api.get('/api/google/import', { params: { user_email: userEmail } }).then(r => r.data);

export default api;
