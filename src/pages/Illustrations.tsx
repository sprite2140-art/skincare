// 问卷用的自绘示意图（简单线条图），不使用任何量表的原图。
// 头皮屑多少：4 级，用肩部线条上的碎屑多少表示；掉发量：6 级，用一小把头发的根数表示。

/** 固定种子的伪随机数，保证每次渲染位置相同 */
function seeded(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const FLAKES = [4, 12, 26, 48];

export function DandruffIllo({ level }: { level: 1 | 2 | 3 | 4 }) {
  const rand = seeded(level * 97);
  const n = FLAKES[level - 1];
  const size = level === 4 ? 2.2 : level === 3 ? 1.8 : 1.4;
  return (
    <svg viewBox="0 0 80 48" className="illo" aria-hidden="true">
      {/* 衣领和肩线 */}
      <path d="M4 40 Q20 22 40 20 Q60 22 76 40" className="illo-line" />
      <path d="M32 21 L40 30 L48 21" className="illo-line" />
      {Array.from({ length: n }, (_, i) => {
        const x = 10 + rand() * 60;
        const t = (x - 40) / 36;
        const y = 21 + 18 * t * t + rand() * 6 + 1;
        const w = size * (0.7 + rand() * 0.8);
        return <ellipse key={i} cx={x} cy={y} rx={w} ry={w * 0.6} className="illo-dot" />;
      })}
    </svg>
  );
}

const STRANDS = [3, 7, 13, 22, 34, 50];

export function HairLossIllo({ level }: { level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const rand = seeded(level * 131);
  const n = STRANDS[level - 1];
  return (
    <svg viewBox="0 0 80 48" className="illo" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const x1 = 14 + rand() * 10;
        const y1 = 10 + rand() * 28;
        const x2 = 58 + rand() * 12;
        const y2 = 10 + rand() * 28;
        const cx = 30 + rand() * 20;
        const cy = rand() * 48;
        return <path key={i} d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} className="illo-strand" />;
      })}
    </svg>
  );
}
