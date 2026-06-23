'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  department: string;
  dueDate: string;
  projectId: string;
  project?: { id: string; name: string };
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

const STATUS_COLORS: Record<string, string> = {
  todo: '#6b7280',
  in_progress: '#3b82f6',
  review: '#8b5cf6',
  revision: '#f97316',
  approved: '#10b981',
  done: '#6b7280',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarTask[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/tasks', { params: { limit: 200 } });
      setTasks(((data.data?.items ?? []) as CalendarTask[]).filter((t) => t.dueDate));
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const tasksByDate = tasks.reduce<Record<string, CalendarTask[]>>((acc, t) => {
    const d = t.dueDate.split('T')[0];
    (acc[d] ??= []).push(t);
    return acc;
  }, {});

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = tasksByDate[dateStr] ?? [];
    setSelectedDate(dateStr);
    setSelected(dayTasks);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            Calendar
          </h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
            Task deadlines overview
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={prevMonth}
            style={{ height: 32, width: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}
          >
            <ChevronLeft size={14} />
          </motion.button>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 120, textAlign: 'center' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={nextMonth}
            style={{ height: 32, width: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}
          >
            <ChevronRight size={14} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}
          >
            Today
          </motion.button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Calendar grid */}
        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ padding: '10px 8px', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textAlign: 'center', letterSpacing: '0.1em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)' }}>
              Loading…
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {cells.map((day, idx) => {
                const isLastCol = (idx + 1) % 7 === 0;
                const cellBorder = isLastCol ? undefined : '1px solid var(--border)';
                if (!day) return <div key={`empty-${idx}`} style={{ borderRight: cellBorder, borderBottom: '1px solid var(--border)', minHeight: 80 }} />;

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayTasks = tasksByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <motion.div
                    key={day}
                    whileHover={{ background: 'var(--hover-bg)' }}
                    onClick={() => handleDayClick(day)}
                    style={{
                      borderRight: cellBorder,
                      borderBottom: '1px solid var(--border)',
                      minHeight: 80,
                      padding: '6px 8px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-soft)' : 'transparent',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      color: isToday ? '#fff' : 'var(--text-2)',
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: isToday ? '#4E5ABF' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 4,
                    }}>
                      {day}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          title={`${t.title} — ${t.status}`}
                          style={{
                            height: 4,
                            borderRadius: 2,
                            background: PRIORITY_COLORS[t.priority] ?? '#6b7280',
                            width: '100%',
                          }}
                        />
                      ))}
                      {dayTasks.length > 3 && (
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'var(--text-3)' }}>
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day detail panel */}
        <div style={{ width: 256, flexShrink: 0 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden', minHeight: 200 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                  : 'Select a day'}
              </p>
            </div>
            <div style={{ padding: 12 }}>
              {selected.length === 0 ? (
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)', textAlign: 'center', paddingTop: 20 }}>
                  {selectedDate ? 'No tasks due' : 'Click a day to view tasks'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)' }}
                    >
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text)', lineHeight: 1.4 }}>
                        {t.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                        <span style={{ height: 6, width: 6, borderRadius: '50%', background: PRIORITY_COLORS[t.priority] ?? '#6b7280', flexShrink: 0 }} />
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'var(--text-3)' }}>{t.priority}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: STATUS_COLORS[t.status] ?? 'var(--text-3)', marginLeft: 2 }}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                      {t.project && (
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'var(--text-3)', marginTop: 3 }}>
                          {t.project.name}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{ marginTop: 16, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)' }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>
              Priority
            </p>
            {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ height: 8, width: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-2)', textTransform: 'capitalize' }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
