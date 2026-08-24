import { useId } from "react";

const SIGN_FONT = "'Arial Black', Arial, sans-serif";

function WoodGradient({ id }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#a06a3b" />
      <stop offset="55%" stopColor="#8a5a33" />
      <stop offset="100%" stopColor="#7c4a22" />
    </linearGradient>
  );
}

function MarkLogo({ woodId }) {
  return (
    <>
      {/* Palma */}
      <path
        d="M 32 22 C 20 16 10 12 4 18 C 12 20 22 21 32 22 Z"
        fill="#2e8b57"
      />
      <path
        d="M 32 22 C 24 10 15 4 9 4 C 17 10 26 15 32 22 Z"
        fill="#3ca96f"
      />
      <path d="M 32 22 C 28 8 27 2 32 0 C 37 2 36 8 32 22 Z" fill="#3ca96f" />
      <path
        d="M 32 22 C 40 10 49 4 55 4 C 47 10 38 15 32 22 Z"
        fill="#2e8b57"
      />
      <path
        d="M 32 22 C 44 16 54 12 60 18 C 52 20 42 21 32 22 Z"
        fill="#2e8b57"
      />
      <path
        d="M 29 22 L 35 22 L 33.2 44 L 30.8 44 Z"
        fill="#8a5a33"
        stroke="#5b3317"
        strokeWidth="0.8"
      />
      <circle cx="26.5" cy="25" r="2" fill="#6d4420" />
      <circle cx="37.5" cy="24" r="2" fill="#6d4420" />

      {/* Letrero */}
      <rect
        x="13"
        y="40"
        width="38"
        height="14"
        rx="4"
        fill={`url(#${woodId})`}
        stroke="#4a2a12"
        strokeWidth="1.2"
      />
      <text
        x="32.4"
        y="51"
        textAnchor="middle"
        fontFamily={SIGN_FONT}
        fontWeight="900"
        fontSize="6.5"
        letterSpacing="0.5"
        fill="#4a2a12"
        opacity="0.4"
      >
        LP
      </text>
      <text
        x="32"
        y="50.5"
        textAnchor="middle"
        fontFamily={SIGN_FONT}
        fontWeight="900"
        fontSize="6.5"
        letterSpacing="0.5"
        fill="#fdf6e3"
      >
        LP
      </text>

      {/* Mascota: perro salchicha */}
      <g className="lapl-dog">
        <ellipse cx="47" cy="49" rx="9.5" ry="8.5" fill="#2b2420" />
        <ellipse
          cx="43.5"
          cy="47"
          rx="3.6"
          ry="7"
          fill="#2b2420"
          transform="rotate(18 43.5 47)"
        />
        <ellipse cx="54.5" cy="51" rx="6" ry="4.5" fill="#b5793c" />
        <ellipse cx="56.5" cy="55" rx="1.8" ry="2.4" fill="#e07a7a" />
        <path
          d="M 52.5 52.5 Q 56 54.5 59 52.5"
          stroke="#1a1512"
          strokeWidth="1.1"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="59.5" cy="50" r="2" fill="#1a1512" />
        <circle cx="48.5" cy="46.5" r="2.2" fill="#fff" />
        <circle cx="49" cy="46.8" r="1.1" fill="#1a1512" />
        <circle cx="49.3" cy="46.2" r="0.4" fill="#fff" />
        <ellipse
          cx="47.8"
          cy="42.5"
          rx="3.4"
          ry="1.6"
          fill="#b5793c"
          transform="rotate(-10 47.8 42.5)"
        />
      </g>

      <ellipse cx="36" cy="60" rx="20" ry="3" fill="#000" opacity="0.25" />
    </>
  );
}

function FullLogo({ woodId }) {
  return (
    <>
      <ellipse cx="222" cy="175" rx="195" ry="6" fill="#000" opacity="0.25" />

      {/* Palma */}
      <path d="M 184 150 Q 222 178 260 150 Z" fill="#1e6b42" />
      <path
        d="M 208 152 C 212 118 216 82 218 50 L 228 50 C 226 82 222 118 220 152 Z"
        fill="#8a5a33"
        stroke="#5b3317"
        strokeWidth="1.5"
      />
      <path
        d="M 223 52 C 176 34 122 27 62 45 C 116 53 174 55 223 52 Z"
        fill="#2e8b57"
      />
      <path
        d="M 223 52 Q 148 39 62 45"
        stroke="#1e6b42"
        strokeWidth="1.5"
        opacity="0.55"
        fill="none"
      />
      <path
        d="M 223 52 C 190 20 144 10 100 15 C 146 28 192 36 223 52 Z"
        fill="#3ca96f"
      />
      <path
        d="M 223 52 Q 164 24 100 15"
        stroke="#246b42"
        strokeWidth="1.2"
        opacity="0.5"
        fill="none"
      />
      <path
        d="M 223 52 C 200 14 168 4 136 7 C 172 23 202 35 223 52 Z"
        fill="#2e8b57"
      />
      <path
        d="M 223 52 Q 182 20 136 7"
        stroke="#1e6b42"
        strokeWidth="1.2"
        opacity="0.5"
        fill="none"
      />
      <path
        d="M 223 52 C 217 18 213 5 223 1 C 233 5 229 18 223 52 Z"
        fill="#3ca96f"
      />
      <path
        d="M 223 52 L 223 2"
        stroke="#1e6b42"
        strokeWidth="1.2"
        opacity="0.5"
        fill="none"
      />
      <path
        d="M 223 52 C 246 14 278 4 310 7 C 274 23 244 35 223 52 Z"
        fill="#2e8b57"
      />
      <path
        d="M 223 52 Q 264 20 310 7"
        stroke="#1e6b42"
        strokeWidth="1.2"
        opacity="0.5"
        fill="none"
      />
      <path
        d="M 223 52 C 256 20 302 10 346 15 C 300 28 254 36 223 52 Z"
        fill="#3ca96f"
      />
      <path
        d="M 223 52 Q 282 24 346 15"
        stroke="#246b42"
        strokeWidth="1.2"
        opacity="0.5"
        fill="none"
      />
      <path
        d="M 223 52 C 270 34 324 27 384 45 C 330 53 272 55 223 52 Z"
        fill="#2e8b57"
      />
      <path
        d="M 223 52 Q 298 39 384 45"
        stroke="#1e6b42"
        strokeWidth="1.5"
        opacity="0.55"
        fill="none"
      />
      <circle cx="206" cy="58" r="5.5" fill="#6d4420" />
      <circle cx="241" cy="56" r="5.5" fill="#6d4420" />

      {/* Letrero */}
      <rect
        x="86"
        y="62"
        width="268"
        height="66"
        rx="14"
        fill={`url(#${woodId})`}
        stroke="#4a2a12"
        strokeWidth="3"
      />
      <path
        d="M 96 108 H 348 M 96 118 H 348"
        stroke="#6d4420"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <rect
        x="95"
        y="70"
        width="250"
        height="50"
        rx="9"
        fill="none"
        stroke="#a06a3b"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <circle cx="99" cy="74" r="2.5" fill="#4a2a12" />
      <circle cx="345" cy="74" r="2.5" fill="#4a2a12" />
      <circle cx="99" cy="116" r="2.5" fill="#4a2a12" />
      <circle cx="345" cy="116" r="2.5" fill="#4a2a12" />
      <text
        x="221"
        y="98.5"
        textAnchor="middle"
        fontFamily={SIGN_FONT}
        fontWeight="900"
        fontSize="33"
        letterSpacing="2"
        fill="#3a2210"
        opacity="0.45"
      >
        LA PALMERA
      </text>
      <text
        x="220"
        y="97"
        textAnchor="middle"
        fontFamily={SIGN_FONT}
        fontWeight="900"
        fontSize="33"
        letterSpacing="2"
        fill="#fdf6e3"
      >
        LA PALMERA
      </text>

      {/* Mascota: perro salchicha */}
      <g className="lapl-dog">
        <path
          d="M 6 44 Q -2 34 0 24"
          stroke="#2b2420"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="32" cy="58" rx="11" ry="8" fill="#241d18" />
        <ellipse cx="31" cy="64" rx="5" ry="3.2" fill="#a06b2f" />
        <ellipse
          cx="56"
          cy="22"
          rx="4.5"
          ry="10"
          fill="#241d18"
          transform="rotate(22 56 22)"
        />
        <ellipse cx="46" cy="42" rx="24" ry="26" fill="#2b2420" />
        <ellipse cx="44" cy="58" rx="12" ry="8.5" fill="#2b2420" />
        <ellipse cx="43" cy="64.5" rx="5.5" ry="3.4" fill="#b5793c" />
        <ellipse cx="57" cy="35" rx="12.5" ry="16" fill="#b5793c" />
        <rect x="58" y="48" width="7" height="14" rx="3.5" fill="#2b2420" />
        <ellipse cx="61.5" cy="63" rx="5" ry="3.4" fill="#b5793c" />
        <rect x="67" y="48" width="7" height="14" rx="3.5" fill="#2b2420" />
        <ellipse cx="70.5" cy="63" rx="5" ry="3.4" fill="#b5793c" />
        <ellipse cx="66" cy="17" rx="13.5" ry="12" fill="#2b2420" />
        <ellipse cx="77" cy="20" rx="8.5" ry="6.5" fill="#b5793c" />
        <ellipse cx="80.5" cy="27" rx="2.6" ry="3.4" fill="#e07a7a" />
        <path
          d="M 76 22.5 Q 80.5 26.5 84 23"
          stroke="#1a1512"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="84.5" cy="18.5" r="2.8" fill="#1a1512" />
        <circle cx="67.5" cy="14" r="3" fill="#fff" />
        <circle cx="68.3" cy="14.5" r="1.6" fill="#1a1512" />
        <circle cx="68.9" cy="13.7" r="0.55" fill="#fff" />
        <ellipse
          cx="67"
          cy="8.6"
          rx="4"
          ry="2"
          fill="#b5793c"
          transform="rotate(-12 67 8.6)"
        />
        <ellipse
          cx="60"
          cy="24"
          rx="5"
          ry="12"
          fill="#2b2420"
          transform="rotate(24 60 24)"
        />
      </g>
      <ellipse cx="46" cy="70" rx="44" ry="5" fill="#000" opacity="0.25" />
    </>
  );
}

/**
 * Logo de La Palmera (SVG reutilizable).
 *
 * variant:
 *  - "full": letrero de madera con texto + palmera + mascota (Splash, Login)
 *  - "mark": marca compacta palmera + letrero "LP" + mascota (favicon, navbar)
 */
function LaPalmeraLogo({ variant = "full", className = "", style }) {
  const woodId = useId();

  const common = {
    role: "img",
    "aria-label": "La Palmera",
    className,
    style,
  };

  if (variant === "mark") {
    return (
      <svg {...common} viewBox="0 0 64 64">
        <title>La Palmera</title>
        <defs>
          <WoodGradient id={woodId} />
        </defs>
        <MarkLogo woodId={woodId} />
      </svg>
    );
  }

  return (
    <svg {...common} viewBox="0 0 440 180">
      <title>La Palmera</title>
      <defs>
        <WoodGradient id={woodId} />
      </defs>
      <FullLogo woodId={woodId} />
    </svg>
  );
}

export default LaPalmeraLogo;