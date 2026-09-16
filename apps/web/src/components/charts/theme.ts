import { useEffect, useState } from 'react';
import { useSettings } from '@/stores/settings';

/**
 * Chart colors (validated with the dataviz palette validator in both modes).
 * SVG presentation attributes cannot read CSS variables reliably, so we pass hex.
 */
export interface ChartColors {
  series1: string;
  series2: string;
  sequential: string[];
  text: string;
  textMuted: string;
  grid: string;
  surface: string;
}

const LIGHT: ChartColors = {
  series1: '#2a78d6',
  series2: '#eb6834',
  sequential: ['#b7d3f6', '#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'],
  text: '#1a1a24',
  textMuted: '#6b6f80',
  grid: '#e6e7ec',
  surface: '#ffffff',
};

const DARK: ChartColors = {
  series1: '#3987e5',
  series2: '#d95926',
  sequential: ['#184f95', '#1c5cab', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'],
  text: '#ececf2',
  textMuted: '#a5a8b8',
  grid: '#33343f',
  surface: '#19191f',
};

function isDarkNow(theme: 'system' | 'light' | 'dark'): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useChartColors(): ChartColors {
  const theme = useSettings((s) => s.theme);
  const [dark, setDark] = useState(() => isDarkNow(theme));
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDark(isDarkNow(theme));
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [theme]);
  return dark ? DARK : LIGHT;
}
