import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { STATUS_COLORS, statusClass } from './statusConfig';

interface StatusOption {
  value: string;
  label: string;
}

interface Props {
  id: string;
  options: StatusOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

const CLOSE_DURATION = 280;

export default function StatusSelect({
  id,
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedOption = options.find((o) => o.value === value);
  const selectedColor = value ? STATUS_COLORS[value] : null;
  const activeClass = value ? statusClass(value) : '';

  const openMenu = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setClosing(false);
    setMenuMounted(true);
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setClosing(true);
    setOpen(false);
    closeTimerRef.current = setTimeout(() => {
      setMenuMounted(false);
      setClosing(false);
    }, CLOSE_DURATION);
  }, []);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      closeMenu();
      buttonRef.current?.focus();
    },
    [onChange, closeMenu]
  );

  const handleToggle = () => {
    if (disabled) return;
    if (open || closing) {
      closeMenu();
    } else {
      const idx = options.findIndex((o) => o.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
      openMenu();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = options.findIndex((o) => o.value === value);
        setFocusedIndex(idx >= 0 ? idx : 0);
        openMenu();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeMenu();
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleSelect(options[focusedIndex].value);
        break;
      case 'Tab':
        closeMenu();
        break;
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, closeMenu]);

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector<HTMLLIElement>(`[data-index="${focusedIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, focusedIndex]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const menuClass = closing
    ? 'admin-status-select-menu admin-status-menu-closing'
    : 'admin-status-select-menu admin-status-menu-open';

  return (
    <div
      ref={containerRef}
      className={`admin-status-select-wrapper ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`admin-filter-select admin-status-select-trigger ${activeClass}`}
        onClick={handleToggle}
      >
        <span className="admin-status-select-value">
          {selectedColor && (
            <span
              className="admin-status-select-dot"
              style={{ background: selectedColor.accent }}
            />
          )}
          {selectedOption?.label || 'All Statuses'}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={`admin-status-select-chevron ${open ? 'open' : ''}`}
        />
      </button>

      {menuMounted && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel || 'Status options'}
          className={menuClass}
        >
          {options.map((opt, i) => {
            const color = opt.value ? STATUS_COLORS[opt.value] : null;
            const isSelected = opt.value === value;
            const isFocused = i === focusedIndex;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                data-index={i}
                className={`admin-status-select-option ${isFocused ? 'focused' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setFocusedIndex(i)}
              >
                <span
                  className="admin-status-select-dot"
                  style={color ? { background: color.accent } : { background: 'rgba(201, 162, 39, 0.5)' }}
                />
                <span
                  className="admin-status-select-label"
                  style={color ? { color: color.accent } : {}}
                >
                  {opt.label}
                </span>
                {isSelected && (
                  <Check size={13} strokeWidth={1.5} className="admin-status-select-check" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
