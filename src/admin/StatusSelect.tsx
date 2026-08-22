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
  onOpenChange?: (open: boolean) => void;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export default function StatusSelect({
  id,
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
  className = '',
  onOpenChange,
  scrollContainerRef,
}: Props) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CLOSE_DURATION = 110;

  const selectedOption = options.find((o) => o.value === value);
  const selectedColor = value ? STATUS_COLORS[value] : null;
  const activeClass = value ? statusClass(value) : '';

  const openMenu = useCallback(() => {
    const idx = options.findIndex((o) => o.value === value);
    setFocusedIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }, [options, value]);

  const closeMenu = useCallback(() => {
    if (!open || closing) return;
    setClosing(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      closeTimer.current = null;
    }, CLOSE_DURATION);
  }, [open, closing]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    onOpenChange?.(open || closing);
  }, [open, closing, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia('(max-width: 768px)');
    if (!mq.matches) return;

    const container = scrollContainerRef?.current ?? null;
    if (container) {
      const raf = requestAnimationFrame(() => {
        const target = listRef.current;
        if (!target) return;
        const containerRect = container.getBoundingClientRect();
        const menuRect = target.getBoundingClientRect();
        const menuCenterInContainer =
          menuRect.top - containerRect.top + container.scrollTop + menuRect.height / 2;
        const desiredScrollTop = menuCenterInContainer - container.clientHeight / 2;
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        const clampedScrollTop = Math.max(0, Math.min(desiredScrollTop, maxScrollTop));
        container.scrollTo({ top: clampedScrollTop, behavior: 'smooth' });
      });
      return () => cancelAnimationFrame(raf);
    } else {
      listRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [open, scrollContainerRef]);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setOpen(false);
      setClosing(false);
      buttonRef.current?.focus();
    },
    [onChange]
  );

  const handleToggle = () => {
    if (disabled) return;
    if (open) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
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
    if (!open || closing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const handleUserScroll = () => {
      closeMenu();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('wheel', handleUserScroll, { passive: true });
    document.addEventListener('touchmove', handleUserScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('wheel', handleUserScroll);
      document.removeEventListener('touchmove', handleUserScroll);
    };
  }, [open, closing, closeMenu]);

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

      {(open || closing) && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel || 'Status options'}
          className={`admin-status-select-menu ${closing ? 'admin-status-menu-closing' : 'admin-status-menu-open'}`}
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
