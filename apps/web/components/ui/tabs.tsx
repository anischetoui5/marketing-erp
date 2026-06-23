'use client';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '11px 18px',
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isActive ? 'var(--text)' : 'var(--text-3)',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid #4E5ABF' : '2px solid transparent',
              marginBottom: '-1px',
              cursor: 'pointer',
              transition: 'color 0.15s ease, border-color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
            onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                padding: '1px 6px',
                borderRadius: 10,
                fontSize: 9,
                background: isActive ? '#4E5ABF' : 'var(--surface-2)',
                color: isActive ? '#fff' : 'var(--text-3)',
                fontFamily: "'DM Mono', monospace",
              }}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
