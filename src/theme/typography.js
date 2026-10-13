/**
 * Escala tipográfica. Espejo de las variables --font-* / --text-* de tokens.css.
 * Tamaños en px; `mobile` aplica a 375px de ancho y `desktop` a 1440px
 * (en CSS se interpola con clamp()). Sin `mobile` = tamaño fijo.
 */

export const fonts = {
  title: "'Pirata One', 'Times New Roman', serif",
  oracle: "'Cormorant Garamond', Georgia, serif",
  ui: "'Manrope', system-ui, sans-serif",
}

export const typeScale = {
  title: {
    font: 'title',
    weight: 400,
    desktop: 96,
    mobile: 46,
    lineHeight: 0.95,
    tracking: '0.03em',
  },
  subtitle: { font: 'oracle', weight: 500, desktop: 42, mobile: 27, lineHeight: 1.3 },
  whisper: { font: 'oracle', weight: 400, style: 'italic', desktop: 22, mobile: 18 },
  input: { font: 'oracle', weight: 400, desktop: 22, mobile: 20 },
  button: { font: 'ui', weight: 600, desktop: 14, mobile: 13, uppercase: true, tracking: '0.14em' },
  chip: { font: 'ui', weight: 400, desktop: 14 },
  label: { font: 'ui', weight: 600, desktop: 11, uppercase: true, tracking: '0.2em' },
  hint: { font: 'ui', weight: 400, desktop: 12 },
}

/**
 * Ritmo de los subtítulos (voz de la calabaza), en ms.
 * `jitter` = variación aleatoria ± sobre `perWord`.
 * Las pausas se suman al tiempo de la palabra que termina en esa puntuación.
 */
export const subtitleTiming = {
  calm: {
    perWord: 260,
    jitter: 0,
    pause: { comma: 180, period: 420, ellipsis: 700 },
  },
  angry: {
    perWord: 150,
    jitter: 60,
    pause: { comma: 120, period: 360, ellipsis: 900 },
  },
}
