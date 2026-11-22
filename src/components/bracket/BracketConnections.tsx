import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { Match } from '../../types/tournament';

export function BracketConnections({ board, matches, highlightedMatchId }: {
  board: RefObject<HTMLDivElement | null>;
  matches: Match[];
  highlightedMatchId: string | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const root = board.current;
    const surface = canvas.current;
    if (!root || !surface) return;
    const cards = new Map(Array.from(root.querySelectorAll<HTMLElement>('[data-bracket-match]'))
      .map(card => [card.dataset.bracketMatch, card]));
    const draw = () => {
      const bounds = root.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const ratio = window.devicePixelRatio || 1;
      surface.width = Math.ceil(bounds.width * ratio);
      surface.height = Math.ceil(bounds.height * ratio);
      const ctx = surface.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      const colors = getComputedStyle(root);
      const winnerColor = colors.getPropertyValue("--cobalto-texto").trim();
      const loserColor = colors.getPropertyValue("--cobre").trim();
      for (const match of matches) {
        const source = cards.get(match.id)?.getBoundingClientRect();
        if (!source) continue;
        for (const [id, dropped] of [[match.nextMatchWinnerId, false], [match.nextMatchLoserId, true]] as const) {
          const target = id ? cards.get(id)?.getBoundingClientRect() : undefined;
          if (!target) continue;
          const right = target.left >= source.right;
          const x1 = (right ? source.right : source.left) - bounds.left;
          const x2 = (right ? target.left : target.right) - bounds.left;
          const y1 = source.top + source.height / 2 - bounds.top;
          const y2 = target.top + target.height / 2 - bounds.top;
          const direction = right ? 1 : -1;
          const turn = x1 + direction * 14;
          const approach = x2 - direction * 7;
          ctx.lineWidth = match.id === highlightedMatchId || id === highlightedMatchId ? 4 : 2;
          ctx.strokeStyle = dropped ? loserColor : winnerColor;
          ctx.setLineDash(dropped ? [5, 5] : []);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(turn, y1);
          ctx.lineTo(turn, y2);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(approach, y2 - 4);
          ctx.lineTo(x2, y2);
          ctx.lineTo(approach, y2 + 4);
          ctx.stroke();
        }
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(root);
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [board, matches, highlightedMatchId]);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
