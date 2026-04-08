import { useState, useRef, useLayoutEffect, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

/** @param {string | undefined} s YYYY-MM-DD */
export function parseYmdToLocalDate(s) {
  if (!s || typeof s !== 'string') return undefined;
  const parts = s.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** @param {Date | undefined} d */
export function toYmdString(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildDisabledMatchers(minDate, maxDate) {
  const matchers = [];
  const minD = parseYmdToLocalDate(minDate);
  const maxD = parseYmdToLocalDate(maxDate);
  if (minD) matchers.push({ before: minD });
  if (maxD) matchers.push({ after: maxD });
  return matchers;
}

/**
 * Styled date field for outing forms — replaces native `<input type="date">`.
 * Value/onChange use `YYYY-MM-DD` strings for API compatibility.
 */
export default function OutingDatePicker({
  id: idProp,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  placeholder = 'Select date',
}) {
  const genId = useId();
  const fieldId = idProp ?? genId;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  const selected = parseYmdToLocalDate(value);
  const disabledMatchers = buildDisabledMatchers(minDate, maxDate);
  const defaultMonth = selected ?? parseYmdToLocalDate(minDate) ?? new Date();
  const display = selected ? format(selected, 'MM/dd/yyyy') : '';

  const updatePosition = useCallback(() => {
    if (!open || !anchorRef.current) {
      setMenuStyle(null);
      return;
    }
    const r = anchorRef.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 16);
    let left = r.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - 8 - width);
    }
    const estHeight = 360;
    let top = r.bottom + 6;
    if (top + estHeight > window.innerHeight - 8) {
      top = Math.max(8, r.top - estHeight - 6);
    }
    setMenuStyle({
      position: 'fixed',
      left,
      top,
      width,
      zIndex: 260,
    });
  }, [open]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, open, value]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (anchorRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSelect = (d) => {
    onChange(d ? toYmdString(d) : '');
    setOpen(false);
  };

  const calendar =
    open &&
    menuStyle &&
    createPortal(
      <div
        ref={popoverRef}
        className="outing-date-popover rounded-2xl border border-gray-200/95 bg-white p-3 shadow-2xl ring-1 ring-black/[0.06]"
        style={menuStyle}
      >
        <DayPicker
          key={`${value ?? ''}-${minDate ?? ''}-${maxDate ?? ''}`}
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={defaultMonth}
          disabled={disabledMatchers.length ? disabledMatchers : undefined}
          showOutsideDays
        />
      </div>,
      document.body,
    );

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        id={fieldId}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="form-input flex w-full cursor-pointer items-center justify-between gap-2 text-left"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={display ? 'text-gray-900' : 'text-gray-400'}>
          {display || placeholder}
        </span>
        <CalendarDays className="h-5 w-5 shrink-0 text-scout-blue/70" strokeWidth={2} aria-hidden />
      </button>
      {calendar}
    </div>
  );
}
