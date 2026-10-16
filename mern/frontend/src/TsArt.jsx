// Hero illustratsiya — 2D, qo'lda qalamda chizilgan uslub.
// Elementlar: ochiq kitob, qalam, daftar, sirkul + cho'tka izlari va doodlelar.
// "rough" filtri chiziqlarga qalam tebranishini beradi.
export default function TsArt() {
  return (
    <svg viewBox="0 0 640 520" className="ts-svg hero-art" role="img" aria-label="Qalamda chizilgan kitob, qalam, daftar va sirkul">
      <defs>
        <filter id="pencil" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
        </filter>
        <filter id="pencilSm" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
        </filter>
      </defs>

      {/* sariq cho'tka izi (past) */}
      <g filter="url(#pencil)">
        <path d="M70 452 Q200 438 330 446 Q460 454 570 442 L572 452 Q450 466 320 458 Q190 450 72 462Z" fill="#F5B301" opacity=".85" />
        <path d="M90 468 Q230 460 360 466 Q460 470 548 462 L549 469 Q440 478 300 473 Q180 468 92 474Z" fill="#F5B301" opacity=".6" />
        {/* qizil cho'tka izi (chap-past) */}
        <path d="M60 496 Q120 488 190 492 Q150 500 100 502Z" fill="#E85A5A" opacity=".8" />
      </g>

      {/* ===== OCHIQ KITOB (markaz) ===== */}
      <g filter="url(#pencil)" strokeLinecap="round" strokeLinejoin="round">
        {/* qizil marker dog'i */}
        <path d="M175 210 Q260 185 350 200 Q440 214 470 250 Q478 300 440 340 Q350 368 260 355 Q185 342 168 290Q160 245 175 210Z" fill="#F0564F" opacity=".55" stroke="none" />
        {/* sahifalar konturi */}
        <path d="M150 230 Q230 205 320 225 L320 375 Q230 355 150 380Z" fill="#FBF7EA" stroke="#2B4ED8" strokeWidth="7" />
        <path d="M490 230 Q410 205 320 225 L320 375 Q410 355 490 380Z" fill="#FBF7EA" stroke="#2B4ED8" strokeWidth="7" />
        {/* ikkinchi eskiz chiziq (qalam izi) */}
        <path d="M156 238 Q234 214 314 232 M484 238 Q406 214 326 232" fill="none" stroke="#2B4ED8" strokeWidth="2.5" opacity=".5" />
        {/* matn chiziqlari */}
        <g stroke="#7A8CC9" strokeWidth="4" opacity=".8" fill="none">
          <path d="M180 260 Q230 250 290 260 M180 282 Q230 272 290 282 M180 304 Q230 294 290 304 M180 326 Q230 316 290 326" />
          <path d="M350 260 Q410 250 460 260 M350 282 Q410 272 460 282 M350 304 Q410 294 460 304" />
        </g>
        {/* kitobdagi belgilar: + kvadrat strelka */}
        <g stroke="#2B4ED8" strokeWidth="5" fill="none">
          <rect x="352" y="318" width="30" height="26" rx="4" />
          <path d="M367 322 L367 340 M358 331 L376 331" />
          <rect x="392" y="320" width="26" height="22" rx="3" />
          <path d="M428 326 L452 326 L444 318 M444 334 L452 326" />
        </g>
        {/* SAT bookmark */}
        <path d="M250 218 L282 218 L282 268 L266 256 L250 268Z" fill="#F5B301" stroke="#0E1D3D" strokeWidth="2" />
        <text x="266" y="242" textAnchor="middle" fontSize="13" fontWeight="900" fill="#0E1D3D" stroke="none" fontFamily="Inter,sans-serif">SAT</text>
      </g>

      {/* ===== QALAM (sariq, diagonal) ===== */}
      <g filter="url(#pencil)" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-24 140 130)">
        <rect x="60" y="112" width="170" height="34" rx="6" fill="#F5B301" stroke="#D99300" strokeWidth="5" />
        <path d="M66 122 L224 122" stroke="#D99300" strokeWidth="2.5" opacity=".7" fill="none" />
        <path d="M66 136 L224 136" stroke="#D99300" strokeWidth="2.5" opacity=".5" fill="none" />
        {/* yog'och uch */}
        <polygon points="230,112 268,129 230,146" fill="#F7E3BC" stroke="#D99300" strokeWidth="5" />
        {/* grafit */}
        <polygon points="256,124 270,129 256,135" fill="#33333A" stroke="none" />
        {/* o'chirg'ich */}
        <rect x="36" y="112" width="26" height="34" rx="6" fill="#F0564F" stroke="#C23E3E" strokeWidth="5" />
        <rect x="58" y="112" width="8" height="34" fill="#B9C0CE" stroke="#7A839E" strokeWidth="3" />
      </g>

      {/* ===== DAFTAR (o'ng) ===== */}
      <g filter="url(#pencil)" strokeLinecap="round" strokeLinejoin="round">
        <rect x="486" y="180" width="118" height="190" rx="10" fill="#FFFDF4" stroke="#2B4ED8" strokeWidth="7" />
        {/* spiral */}
        <g stroke="#2B4ED8" strokeWidth="4" fill="none">
          <line x1="486" y1="205" x2="470" y2="205" /><line x1="486" y1="235" x2="470" y2="235" />
          <line x1="486" y1="265" x2="470" y2="265" /><line x1="486" y1="295" x2="470" y2="295" />
          <line x1="486" y1="325" x2="470" y2="325" /><line x1="486" y1="352" x2="470" y2="352" />
        </g>
        {/* chiziqlar */}
        <g stroke="#9AA8D8" strokeWidth="3.5" opacity=".85" fill="none">
          <path d="M502 222 L588 218 M502 244 L588 240 M502 266 L588 262 M502 288 L566 284 M502 310 L566 306" />
        </g>
        <text x="545" y="345" textAnchor="middle" fontFamily="Caveat, cursive" fontSize="28" fontWeight="700" fill="#2B4ED8" stroke="none">IELTS</text>
        <path d="M512 130 c-4 -7 -14 -4 -12 4 l12 10 12 -10 c2 -8 -8 -11 -12 -4Z" fill="none" stroke="#E85A5A" strokeWidth="3.5" />
      </g>

      {/* ===== SIRKUL (chap) ===== */}
      <g filter="url(#pencil)" strokeLinecap="round" strokeLinejoin="round">
        {/* chizilgan aylana izi */}
        <circle cx="120" cy="330" r="52" fill="none" stroke="#E85A5A" strokeWidth="3" opacity=".45" />
        <circle cx="120" cy="330" r="52" fill="none" stroke="#E85A5A" strokeWidth="1.6" opacity=".4" transform="translate(2 2)" />
        {/* oyoqlar */}
        <path d="M120 218 L88 330" stroke="#E85A5A" strokeWidth="9" />
        <path d="M120 218 L88 330" stroke="#fff" strokeWidth="2.5" opacity=".5" />
        <path d="M122 218 L162 326" stroke="#E85A5A" strokeWidth="9" />
        {/* igna uchi */}
        <path d="M88 330 L82 348" stroke="#5B657F" strokeWidth="7" />
        {/* qalam uchi */}
        <path d="M162 326 L170 344" stroke="#F5B301" strokeWidth="8" />
        <path d="M170 344 L174 352" stroke="#33333A" strokeWidth="5" />
        {/* sharnir */}
        <circle cx="121" cy="214" r="14" fill="#F0564F" stroke="#C23E3E" strokeWidth="5" />
        <circle cx="121" cy="214" r="4" fill="#fff" stroke="none" opacity=".8" />
        <path d="M121 200 L121 188" stroke="#C23E3E" strokeWidth="7" />
      </g>

      {/* ===== DOODLELAR ===== */}
      {/* krestik-nolik */}
      <g filter="url(#pencilSm)" stroke="#6C7BF0" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M500 60 L560 62 M530 32 L528 92" />
        <circle cx="556" cy="40" r="8" />
        <circle cx="504" cy="86" r="8" />
        <path d="M548 78 L566 96 M566 78 L548 96" />
      </g>
      {/* ko'k chiziqlar */}
      <g filter="url(#pencilSm)" stroke="#2B4ED8" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M52 84 L86 60 M64 90 L98 66 M76 96 L104 76" />
      </g>
      {/* samolyot */}
      <g filter="url(#pencilSm)">
        <polygon points="300,60 340,72 302,84 312,72" fill="#fff" stroke="#5B657F" strokeWidth="3" strokeLinejoin="round" />
      </g>
      <path d="M340 72 Q370 80 400 68" stroke="#9AA3B8" strokeWidth="2.5" strokeDasharray="6 6" fill="none" />
      {/* yulduz */}
      <g filter="url(#pencilSm)">
        <path d="M60 150 l5 12 13 1 -10 8 3 13 -11 -7 -11 7 3 -13 -10 -8 13 -1Z" fill="none" stroke="#F5B301" strokeWidth="4" strokeLinejoin="round" />
      </g>
      {/* yozuvlar (qalam shrifti — filtrsiz, o'zi qo'lyozma) */}
      <text x="560" y="50" fontFamily="Caveat, cursive" fontSize="26" fill="#8B7CF0">a²+b²=c²</text>
      <text x="52" y="440" fontFamily="Caveat, cursive" fontSize="30" fill="#6C7BF0">ABC</text>
      <text x="120" y="470" fontFamily="Caveat, cursive" fontSize="24" fill="#6C7BF0">x+y=?</text>
      <g fontFamily="Caveat, cursive" fontWeight="700" textAnchor="middle">
        <text x="560" y="400" fontSize="26" fill="#0E1D3D">Big</text>
        <text x="560" y="426" fontSize="26" fill="#0E1D3D">Dreams</text>
      </g>
      {/* kichik kapsula */}
      <g filter="url(#pencilSm)" transform="rotate(24 540 470)">
        <rect x="528" y="460" width="26" height="40" rx="13" fill="none" stroke="#8B7CF0" strokeWidth="5" />
        <line x1="528" y1="480" x2="554" y2="480" stroke="#8B7CF0" strokeWidth="4" />
      </g>
    </svg>
  );
}
