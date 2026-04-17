import type { CSSProperties } from 'react';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const fallbackEntryAccent = '#5f7d72';

function normalizeHexColor(value?: string) {
  if (!value) {
    return fallbackEntryAccent;
  }

  const normalized = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(normalized)) {
    return `#${normalized
      .slice(1)
      .split('')
      .map((part) => `${part}${part}`)
      .join('')}`;
  }

  return fallbackEntryAccent;
}

function hexToRgb(value: string): RgbColor {
  const hex = normalizeHexColor(value).slice(1);

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function toRgba({ r, g, b }: RgbColor, alpha: number) {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

export function resolveEntryTheme(themeColor?: string): ThemeStyle {
  const accent = normalizeHexColor(themeColor);
  const rgb = hexToRgb(accent);

  return {
    '--theme-accent': accent,
    '--theme-accent-strong': toRgba(rgb, 0.92),
    '--theme-accent-soft': toRgba(rgb, 0.12),
    '--theme-accent-border': toRgba(rgb, 0.28),
    '--theme-accent-glow': toRgba(rgb, 0.2),
    '--theme-accent-ink': toRgba(rgb, 0.82),
  };
}

export function resolveSceneTheme(scene: {
  palette: {
    base: string;
    glow: string;
    haze: string;
  };
}): ThemeStyle {
  return {
    '--scene-base': scene.palette.base,
    '--scene-glow': scene.palette.glow,
    '--scene-haze': scene.palette.haze,
  };
}
