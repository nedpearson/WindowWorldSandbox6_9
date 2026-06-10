import type { ReactNode } from 'react';

export interface VisualOption {
  value: string;
  label: string;
  helper?: string;
  icon: ReactNode;
  badge?: 'default' | 'included' | 'adds-price' | 'needs-review';
  disabled?: boolean;
}

export interface VisualOptionPickerProps {
  options: VisualOption[];
  value: string | null;
  onChange: (value: string) => void;
  title: string;
  /** 'inline' = compact chip grid rendered directly; 'bottomSheet' = full modal */
  mode?: 'inline' | 'bottomSheet';
  error?: boolean;
  /** Override columns for inline mode. Default auto-fill minmax(65px, 1fr) for inline, minmax(140px, 1fr) for bottomSheet */
  columns?: string;
  /** Placeholder text when nothing selected (bottomSheet mode) */
  placeholder?: string;
  /** Show change action label */
  changeLabel?: string;
}
