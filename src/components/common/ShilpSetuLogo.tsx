import React, { useId } from 'react';

interface ShilpSetuLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  withText?: boolean;
  withTagline?: boolean;
  className?: string;
  isDark?: boolean;
}

export const ShilpSetuLogo: React.FC<ShilpSetuLogoProps> = ({
  size = 'md',
  withText = false,
  withTagline = false,
  className = '',
  isDark = false,
}) => {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const leftHandGradId = `ssLeftHandGrad_${id}`;
  const rightHandGradId = `ssRightHandGrad_${id}`;
  const goldGradId = `ssGoldGrad_${id}`;
  const goldSoftId = `ssGoldSoft_${id}`;
  const hill1Id = `ssHill1_${id}`;
  const hill2Id = `ssHill2_${id}`;

  const sizeMap = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-56 h-56 md:w-64 md:h-64',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official ShilpSetu Circular Emblem (Hands, Bird, Spiral & Paisley) */}
      <div
        className={`${sizeMap[size]} shrink-0 relative flex items-center justify-center`}
      >
        <svg
          viewBox="0 0 300 320"
          className="w-full h-full drop-shadow-sm select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* DEFINITIONS & GRADIENTS */}
          <defs>
            {/* Terracotta Left Hand Gradient */}
            <linearGradient id={leftHandGradId} x1="60" y1="50" x2="150" y2="280" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#DE9B85" />
              <stop offset="45%" stopColor="#C87A64" />
              <stop offset="80%" stopColor="#A85742" />
              <stop offset="100%" stopColor="#8A402D" />
            </linearGradient>

            {/* Sage Green Right Hand Gradient */}
            <linearGradient id={rightHandGradId} x1="240" y1="50" x2="150" y2="280" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9FB38F" />
              <stop offset="45%" stopColor="#7E966D" />
              <stop offset="80%" stopColor="#5D754C" />
              <stop offset="100%" stopColor="#435934" />
            </linearGradient>

            {/* Gold Metallic Gradients */}
            <linearGradient id={goldGradId} x1="100" y1="40" x2="200" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5D899" />
              <stop offset="35%" stopColor="#D4A759" />
              <stop offset="70%" stopColor="#BA863A" />
              <stop offset="100%" stopColor="#9C6B26" />
            </linearGradient>

            <linearGradient id={goldSoftId} x1="120" y1="80" x2="180" y2="220" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ECD5A6" />
              <stop offset="100%" stopColor="#C99B52" />
            </linearGradient>

            {/* Terraced Fields Green Gradients */}
            <linearGradient id={hill1Id} x1="70" y1="200" x2="150" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#889E78" />
              <stop offset="100%" stopColor="#546B46" />
            </linearGradient>
            <linearGradient id={hill2Id} x1="150" y1="200" x2="230" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#748C65" />
              <stop offset="100%" stopColor="#455B37" />
            </linearGradient>
          </defs>

          {/* 1. TOP GOLDEN BIRD (Facing Left) */}
          <g id={`top-bird-${id}`}>
            {/* Bird Body & Head */}
            <path
              d="M 148 42 C 142 38, 134 35, 126 38 C 120 41, 122 47, 126 49 C 132 52, 142 54, 150 54 C 158 54, 168 49, 172 41 C 166 40, 158 42, 153 43 C 148 44, 144 43, 148 42 Z"
              fill={`url(#${goldGradId})`}
            />
            {/* Tail Feathers fanning up-right */}
            <path
              d="M 152 42 C 158 35, 166 28, 175 25 C 172 31, 168 37, 162 43 Z"
              fill={`url(#${goldGradId})`}
            />
            {/* Wing Feather Line */}
            <path
              d="M 136 44 Q 146 41, 154 48"
              stroke="#FFF2D6"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Bird Eye */}
            <circle cx="131" cy="41" r="1.5" fill="#5A3E1B" />
            {/* Bird Beak */}
            <path d="M 124 40 L 118 42 L 124 44 Z" fill="#BA863A" />
          </g>

          {/* 2. THIRD EYE / BINDU APEX (Under Bird) */}
          <g id={`third-eye-${id}`}>
            <path
              d="M 142 62 Q 150 56, 158 62 Q 150 68, 142 62 Z"
              fill="none"
              stroke="#B38337"
              strokeWidth="1.4"
            />
            <circle cx="150" cy="62" r="2.2" fill="#B38337" />
          </g>

          {/* 3. UPPER SACRED KNOT (Interlocking Endless Knot) */}
          <g id={`top-endless-knot-${id}`} transform="translate(141, 74) scale(0.65)">
            <rect
              x="5"
              y="5"
              width="18"
              height="18"
              rx="4"
              transform="rotate(45 14 14)"
              fill="none"
              stroke="#D4A759"
              strokeWidth="2.5"
            />
            <rect
              x="8"
              y="8"
              width="12"
              height="12"
              rx="2"
              transform="rotate(45 14 14)"
              fill="none"
              stroke="#D4A759"
              strokeWidth="2"
            />
            <circle cx="14" cy="5" r="2" fill="#D4A759" />
            <circle cx="14" cy="23" r="2" fill="#D4A759" />
            <circle cx="5" cy="14" r="2" fill="#D4A759" />
            <circle cx="23" cy="14" r="2" fill="#D4A759" />
          </g>

          {/* 4. LEFT ARTISAN HAND (Terracotta with Folk Artisans & Crosshatch) */}
          <g id={`left-hand-${id}`}>
            {/* Hand Outer Silhouette Curve */}
            <path
              d="M 142 64 C 115 67, 85 82, 64 108 C 42 135, 36 172, 45 208 C 54 242, 79 270, 115 284 C 95 264, 82 238, 79 208 C 76 176, 88 144, 110 120 C 122 106, 137 96, 149 92 C 145 83, 143 73, 142 64 Z"
              fill={`url(#${leftHandGradId})`}
            />
            {/* Top Wrist / Thumb Contour */}
            <path
              d="M 142 64 C 128 66, 106 76, 92 90 C 85 97, 78 107, 74 118"
              stroke="#FBE5DC"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Folk Artisan 1 Seated at Craft Table */}
            <g transform="translate(68, 122) scale(0.65)" opacity="0.95">
              {/* Seated Figure 1 */}
              <circle cx="24" cy="8" r="4.5" fill="#FFEFEA" />
              <path d="M 22 13 L 14 26 L 28 26 Z" fill="#FFEFEA" />
              <path d="M 20 18 L 32 23" stroke="#FFEFEA" strokeWidth="2.5" strokeLinecap="round" />
              {/* Craft Workbench / Loom Table */}
              <rect x="28" y="22" width="22" height="3" fill="#FFEFEA" />
              <line x1="31" y1="25" x2="31" y2="34" stroke="#FFEFEA" strokeWidth="2" />
              <line x1="47" y1="25" x2="47" y2="34" stroke="#FFEFEA" strokeWidth="2" />
              {/* Terracotta Pot on table */}
              <ellipse cx="39" cy="18" rx="4" ry="4.5" fill="#FFEFEA" />
              {/* Seated Figure 2 (Facing Worker) */}
              <circle cx="56" cy="10" r="4.5" fill="#FFEFEA" />
              <path d="M 54 15 L 48 26 L 62 26 Z" fill="#FFEFEA" />
              <path d="M 52 19 L 44 23" stroke="#FFEFEA" strokeWidth="2.5" strokeLinecap="round" />
            </g>

            {/* Folk Art Detail: Artisan shaping vase */}
            <g transform="translate(54, 158) scale(0.6)" opacity="0.9">
              <circle cx="18" cy="10" r="4" fill="#FFEFEA" />
              <path d="M 18 14 L 10 26 L 24 26 Z" fill="#FFEFEA" />
              <path d="M 18 19 L 28 22" stroke="#FFEFEA" strokeWidth="2" strokeLinecap="round" />
              <ellipse cx="32" cy="22" rx="5" ry="6" fill="#FFEFEA" />
            </g>

            {/* Traditional Geometric Border on Lower Hand */}
            <g opacity="0.75">
              <path
                d="M 44 196 Q 52 216, 68 238"
                stroke="#FFEFEA"
                strokeWidth="1.2"
                strokeDasharray="2 3"
              />
              <path
                d="M 49 204 Q 57 224, 73 244"
                stroke="#FFEFEA"
                strokeWidth="1.2"
                strokeDasharray="2 3"
              />
              {/* Triangles along lower edge */}
              <polygon points="46,212 50,208 52,216" fill="#FFEFEA" />
              <polygon points="52,222 56,218 58,226" fill="#FFEFEA" />
              <polygon points="60,232 64,228 66,236" fill="#FFEFEA" />
              <polygon points="70,242 74,238 76,246" fill="#FFEFEA" />
            </g>
          </g>

          {/* 5. RIGHT ARTISAN HAND (Sage Green with Paisley & Flora) */}
          <g id={`right-hand-${id}`}>
            {/* Hand Outer Silhouette Curve */}
            <path
              d="M 158 64 C 185 67, 215 82, 236 108 C 258 135, 264 172, 255 208 C 246 242, 221 270, 185 284 C 205 264, 218 238, 221 208 C 224 176, 212 144, 190 120 C 178 106, 163 96, 151 92 C 155 83, 157 73, 158 64 Z"
              fill={`url(#${rightHandGradId})`}
            />
            {/* Top Wrist / Thumb Contour */}
            <path
              d="M 158 64 C 172 66, 194 76, 208 90 C 215 97, 222 107, 226 118"
              stroke="#E8F4E4"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Paisley Motif 1 (Top Kalka / Mango Motif) */}
            <g transform="translate(196, 102) scale(0.68)" opacity="0.9">
              <path
                d="M 28 8 C 16 10, 8 20, 10 32 C 12 42, 24 50, 36 46 C 46 42, 50 30, 46 20 C 42 12, 34 2, 28 8 Z"
                fill="none"
                stroke="#E8F4E4"
                strokeWidth="2"
              />
              <path
                d="M 26 14 C 18 16, 14 24, 16 32 C 18 38, 26 42, 34 38 C 40 34, 42 26, 38 20 C 34 14, 30 8, 26 14 Z"
                fill="none"
                stroke="#E8F4E4"
                strokeWidth="1.2"
              />
              <circle cx="27" cy="26" r="3.5" fill="#E8F4E4" />
              {/* Petal flourishes */}
              <circle cx="16" cy="18" r="1.5" fill="#E8F4E4" />
              <circle cx="12" cy="26" r="1.5" fill="#E8F4E4" />
              <circle cx="14" cy="34" r="1.5" fill="#E8F4E4" />
              <circle cx="20" cy="42" r="1.5" fill="#E8F4E4" />
            </g>

            {/* Paisley Motif 2 (Middle Large Kalka) */}
            <g transform="translate(208, 148) scale(0.72)" opacity="0.9">
              <path
                d="M 24 4 C 12 8, 4 20, 8 34 C 12 46, 26 52, 38 46 C 48 40, 50 26, 44 14 C 38 4, 28 0, 24 4 Z"
                fill="none"
                stroke="#E8F4E4"
                strokeWidth="2"
              />
              <circle cx="26" cy="26" r="4" fill="#E8F4E4" />
              <path d="M 24 12 Q 32 18, 28 32" stroke="#E8F4E4" strokeWidth="1.5" />
            </g>

            {/* Paisley & Vine Motif 3 (Lower Floral Scroll) */}
            <g transform="translate(204, 202) scale(0.65)" opacity="0.85">
              <path
                d="M 12 28 C 24 16, 40 22, 44 38 C 48 50, 36 60, 22 56 C 12 52, 6 40, 12 28 Z"
                fill="none"
                stroke="#E8F4E4"
                strokeWidth="2"
              />
              <circle cx="28" cy="40" r="3" fill="#E8F4E4" />
              <circle cx="36" cy="30" r="2" fill="#E8F4E4" />
              <circle cx="18" cy="46" r="2" fill="#E8F4E4" />
            </g>
          </g>

          {/* 6. INNER CELESTIAL ORBITAL RINGS & SPIRAL SUN */}
          <g id={`orbital-center-system-${id}`}>
            {/* Outer Major Ellipse (Tilted Right) */}
            <ellipse
              cx="150"
              cy="160"
              rx="68"
              ry="38"
              transform="rotate(-28 150 160)"
              fill="none"
              stroke="#D4A759"
              strokeWidth="1.4"
              opacity="0.8"
            />

            {/* Second Orbital Ellipse (Tilted Left) */}
            <ellipse
              cx="150"
              cy="160"
              rx="62"
              ry="34"
              transform="rotate(32 150 160)"
              fill="none"
              stroke="#D4A759"
              strokeWidth="1.4"
              opacity="0.8"
            />

            {/* Third Orbital Ellipse (Counter-tilt) */}
            <ellipse
              cx="150"
              cy="160"
              rx="56"
              ry="28"
              transform="rotate(-6 150 160)"
              fill="none"
              stroke="#C99B52"
              strokeWidth="1.2"
              opacity="0.85"
            />

            {/* Fourth Fine Circular Orbit */}
            <circle
              cx="150"
              cy="160"
              r="44"
              fill="none"
              stroke="#D4A759"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.7"
            />

            {/* Planetary Gold Spheres on Orbits */}
            <circle cx="112" cy="132" r="3" fill={`url(#${goldGradId})`} />
            <circle cx="188" cy="188" r="3" fill={`url(#${goldGradId})`} />
            <circle cx="108" cy="180" r="2.5" fill={`url(#${goldGradId})`} />
            <circle cx="194" cy="140" r="2.5" fill={`url(#${goldGradId})`} />
            <circle cx="150" cy="104" r="2" fill={`url(#${goldGradId})`} />

            {/* Left Auspicious Knot Node on Orbit */}
            <g transform="translate(80, 140) scale(0.55)">
              <rect
                x="4"
                y="4"
                width="14"
                height="14"
                rx="3"
                transform="rotate(45 11 11)"
                fill="none"
                stroke="#D4A759"
                strokeWidth="2.4"
              />
              <circle cx="11" cy="11" r="2" fill="#D4A759" />
              <circle cx="11" cy="3" r="1.5" fill="#D4A759" />
              <circle cx="11" cy="19" r="1.5" fill="#D4A759" />
              <circle cx="3" cy="11" r="1.5" fill="#D4A759" />
              <circle cx="19" cy="11" r="1.5" fill="#D4A759" />
            </g>

            {/* Right Auspicious Knot Node on Orbit */}
            <g transform="translate(204, 150) scale(0.55)">
              <rect
                x="4"
                y="4"
                width="14"
                height="14"
                rx="3"
                transform="rotate(45 11 11)"
                fill="none"
                stroke="#D4A759"
                strokeWidth="2.4"
              />
              <circle cx="11" cy="11" r="2" fill="#D4A759" />
              <circle cx="11" cy="3" r="1.5" fill="#D4A759" />
              <circle cx="11" cy="19" r="1.5" fill="#D4A759" />
              <circle cx="3" cy="11" r="1.5" fill="#D4A759" />
              <circle cx="19" cy="11" r="1.5" fill="#D4A759" />
            </g>

            {/* CENTRAL GOLDEN SPIRAL SUN & POTTER'S WHEEL VORTEX */}
            <g id={`center-sun-spiral-${id}`} transform="translate(150, 160)">
              {/* Outer Golden Spiral Swirl */}
              <path
                d="M 0 -2 C 6 -2, 10 2, 10 8 C 10 16, 2 22, -6 22 C -18 22, -26 12, -26 -2 C -26 -18, -12 -30, 6 -30 C 26 -30, 38 -14, 38 8 C 38 32, 18 46, -8 46"
                fill="none"
                stroke={`url(#${goldGradId})`}
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              {/* Inner Tight Golden Spiral */}
              <path
                d="M 0 0 C 3 0, 5 2, 5 5 C 5 9, 1 12, -3 12 C -8 12, -12 7, -12 1 C -12 -7, -5 -13, 3 -13 C 12 -13, 18 -5, 18 4 C 18 15, 8 22, -2 22"
                fill="none"
                stroke="#C68D3E"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              {/* Center Core Bindu Point */}
              <circle cx="0" cy="0" r="3.5" fill="#BA863A" />
            </g>
          </g>

          {/* 7. BOTTOM TERRACED WEAVING HILLS / HANDLOOM PATTERNS */}
          <g id={`bottom-woven-fields-${id}`}>
            {/* Left Terraced Hill */}
            <path
              d="M 64 200 C 78 190, 114 190, 146 210 C 146 244, 118 266, 82 250 C 68 234, 62 216, 64 200 Z"
              fill={`url(#${hill1Id})`}
            />
            {/* Left Hill Concentric Weave Thread Lines */}
            <path d="M 72 208 Q 106 198, 138 214" stroke="#F1F8ED" strokeWidth="1.5" fill="none" />
            <path d="M 76 216 Q 106 208, 134 222" stroke="#F1F8ED" strokeWidth="1.5" fill="none" />
            <path d="M 80 224 Q 106 218, 128 230" stroke="#F1F8ED" strokeWidth="1.4" fill="none" />
            <path d="M 86 232 Q 106 228, 122 238" stroke="#F1F8ED" strokeWidth="1.4" fill="none" />
            <path d="M 94 240 Q 106 238, 116 244" stroke="#F1F8ED" strokeWidth="1.2" fill="none" />

            {/* Right Terraced Hill */}
            <path
              d="M 144 210 C 176 190, 216 190, 236 200 C 238 216, 232 234, 218 250 C 182 266, 154 244, 144 210 Z"
              fill={`url(#${hill2Id})`}
            />
            {/* Right Hill Concentric Weave Thread Lines */}
            <path d="M 152 214 Q 184 198, 228 208" stroke="#F1F8ED" strokeWidth="1.5" fill="none" />
            <path d="M 156 222 Q 184 208, 224 216" stroke="#F1F8ED" strokeWidth="1.5" fill="none" />
            <path d="M 162 230 Q 184 218, 220 224" stroke="#F1F8ED" strokeWidth="1.4" fill="none" />
            <path d="M 168 238 Q 184 228, 214 232" stroke="#F1F8ED" strokeWidth="1.4" fill="none" />
            <path d="M 174 244 Q 184 238, 206 240" stroke="#F1F8ED" strokeWidth="1.2" fill="none" />

            {/* Center Woven Intersection Ridge */}
            <path
              d="M 138 212 L 145 208 L 152 212"
              stroke="#FFF2D6"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* 8. BOTTOM PAISLEY & LEAF WREATH CRESCENT (Interlocking Base) */}
          <g id={`bottom-wreath-base-${id}`}>
            <path
              d="M 82 250 C 104 274, 126 284, 150 286 C 174 284, 196 274, 218 250 C 200 278, 176 294, 150 294 C 124 294, 100 278, 82 250 Z"
              fill="#435934"
            />
            {/* Base Ganesha / Floral Medallion Motif at bottom center */}
            <g transform="translate(150, 276) scale(0.55)">
              <ellipse cx="0" cy="0" rx="14" ry="12" fill="none" stroke="#D4A759" strokeWidth="2" />
              <path d="M 0 -8 L 0 6 M -6 -2 Q 0 4, 6 -2" stroke="#D4A759" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="0" cy="-4" r="2" fill="#D4A759" />
            </g>
            {/* Left Leaf Scrolls */}
            <path
              d="M 108 266 Q 124 280, 140 282"
              stroke="#E8F4E4"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right Leaf Scrolls */}
            <path
              d="M 192 266 Q 176 280, 160 282"
              stroke="#E8F4E4"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </svg>
      </div>

      {/* Optional Typography Brand Block */}
      {withText && (
        <div className="flex flex-col text-left leading-none">
          <span className="font-serif font-black text-lg tracking-tight leading-none text-[#B5451B]">
            SHILPSETU
          </span>
          {withTagline ? (
            <span
              className={`font-serif italic text-[11px] opacity-75 truncate mt-0.5 ${
                isDark ? 'text-[#F4ECDE]' : 'text-[#1A1815]'
              }`}
            >
              CONNECTING INDIA'S ARTISANS
            </span>
          ) : (
            <span
              className={`font-serif italic text-[11px] opacity-75 truncate mt-0.5 ${
                isDark ? 'text-[#F4ECDE]' : 'text-[#1A1815]'
              }`}
            >
              Har Haath Ki Kahani
            </span>
          )}
        </div>
      )}
    </div>
  );
};

