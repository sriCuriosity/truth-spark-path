const EMOTIONS = [
  "Joy","Trust","Anticipation","Surprise","Curiosity","Hope","Calm","Pride",
  "Sadness","Fear","Anger","Disgust","Frustration","Loneliness","Anxiety","Exhaustion",
];

export function EmotionWheel({ selected, onSelect, size = 240 }: { selected: string | null; onSelect: (e: string) => void; size?: number }) {
  const r = size / 2;
  const inner = r * 0.35;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
        {EMOTIONS.map((label, i) => {
          const a0 = (i / 16) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((i + 1) / 16) * Math.PI * 2 - Math.PI / 2;
          const x0 = r + Math.cos(a0) * r, y0 = r + Math.sin(a0) * r;
          const x1 = r + Math.cos(a1) * r, y1 = r + Math.sin(a1) * r;
          const xi0 = r + Math.cos(a0) * inner, yi0 = r + Math.sin(a0) * inner;
          const xi1 = r + Math.cos(a1) * inner, yi1 = r + Math.sin(a1) * inner;
          const isSelected = selected === label;
          const hue = (i / 16) * 360;
          return (
            <g key={label}>
              <path
                d={`M ${xi0} ${yi0} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} L ${xi1} ${yi1} Z`}
                fill={isSelected ? `oklch(0.65 0.20 285)` : `oklch(0.40 0.05 ${hue} / 0.45)`}
                stroke="var(--background)" strokeWidth="2"
                onClick={() => onSelect(label)}
                style={{ cursor: "pointer", transition: "fill 0.2s" }}
              />
              {(() => {
                const am = (a0 + a1) / 2;
                const tr = (r + inner) / 2;
                const tx = r + Math.cos(am) * tr;
                const ty = r + Math.sin(am) * tr;
                return (
                  <text x={tx} y={ty} fontSize="9" textAnchor="middle" dominantBaseline="middle" fill="white" style={{ pointerEvents: "none", fontFamily: "Inter, sans-serif" }}>
                    {label}
                  </text>
                );
              })()}
            </g>
          );
        })}
        <circle cx={r} cy={r} r={inner} fill="var(--surface)" stroke="var(--border)" />
        {selected && (
          <text x={r} y={r} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="var(--primary)" fontWeight="600">
            {selected}
          </text>
        )}
      </svg>
    </div>
  );
}
