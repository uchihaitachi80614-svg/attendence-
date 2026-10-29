import { useStore } from '../lib/store';
import type { ClassOccurrence } from '../types';

interface AttendanceBtnGroupProps {
  occurrence: ClassOccurrence;
  compact?: boolean;
}

export default function AttendanceBtnGroup({ occurrence, compact }: AttendanceBtnGroupProps) {
  const { markAttendance, getAttendanceStatus } = useStore();
  const status = getAttendanceStatus(occurrence.id);

  const buttons = [
    { key: 'present', label: compact ? 'P' : 'Present', cls: 'present' },
    { key: 'absent', label: compact ? 'A' : 'Absent', cls: 'absent' },
    { key: 'cancelled', label: compact ? 'C' : 'Cancelled', cls: 'cancelled' },
  ] as const;

  return (
    <div className="att-btn-group">
      {buttons.map(b => (
        <button
          key={b.key}
          className={`att-btn ${b.cls} ${status === b.key ? 'active' : ''}`}
          onClick={() => markAttendance(occurrence.id, status === b.key ? 'not_marked' : b.key)}
          title={b.label}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
