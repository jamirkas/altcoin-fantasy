'use client';

// ─── MechArt v2 — Neon clumsy mech robots ───
// 5 unique silhouettes, asymmetric idle animations, glitch effects, more detail

interface TokenDef {
  id: string;
  symbol: string;
  name: string;
  color: string;
  glowColor: string;
}

interface MechPart {
  token: TokenDef;
  slot: string;
}

const MechArt = ({ parts }: { parts: MechPart[] }) => {
  const getPart = (slot: string) => parts.find(p => p.slot === slot)?.token || parts[0].token;
  const armor = getPart('armor');
  const head = getPart('head');
  const weapon = getPart('weapon');
  const secondary = getPart('secondary');
  const legs = getPart('legs');
  const wings = getPart('wings');

  return (
    <div className="relative" style={{ width: 280, height: 400 }}>
      {/* ─── BACKGROUND GLOW ─── */}
      <div className="absolute" style={{
        top: 50, left: 30, width: 220, height: 280,
        background: `radial-gradient(ellipse, ${armor.glowColor}10 0%, transparent 70%)`,
        filter: 'blur(20px)',
        animation: 'bgGlowPulse 3s ease-in-out infinite',
      }} />

      {/* ─── BOOSTERS (wings) — asymmetric flicker ─── */}
      <BoosterUnit token={wings} side="left" delay={0} />
      <BoosterUnit token={wings} side="right" delay={0.4} />

      {/* ─── LEFT ARM (weapon) — slightly drooping ─── */}
      <div className="absolute" style={{
        left: 8, top: 138, width: 48, height: 130,
        transform: 'rotate(3deg)', // clumsy droop
        animation: 'armSwingLeft 5s ease-in-out infinite',
      }}>
        <MechArm token={weapon} side="left" />
      </div>

      {/* ─── RIGHT ARM (secondary) — slightly raised ─── */}
      <div className="absolute" style={{
        right: 8, top: 135, width: 48, height: 130,
        transform: 'rotate(-2deg)',
        animation: 'armSwingRight 5.5s ease-in-out infinite',
      }}>
        <MechArm token={secondary} side="right" />
      </div>

      {/* ─── TORSO (armor) ─── */}
      <div className="absolute" style={{
        left: 66, top: 135, width: 148, height: 165,
        animation: 'torsoWobble 4s ease-in-out infinite',
      }}>
        <MechTorso armor={armor} />
      </div>

      {/* ─── HEAD — bobbing with slight tilt ─── */}
      <div className="absolute" style={{
        left: 78, top: 48, width: 124, height: 95,
        animation: 'headWobble 3.5s ease-in-out infinite',
      }}>
        <MechHead token={head} armorStyle={armor.id} />
      </div>

      {/* ─── LEGS — asymmetric stance ─── */}
      <div className="absolute" style={{ bottom: 5, left: 62, width: 156, height: 105 }}>
        {/* Left leg — planted firm */}
        <div className="absolute" style={{ left: 12, bottom: 0, width: 50, height: 95 }}>
          <MechLeg token={legs} side="left" />
        </div>
        {/* Right leg — slightly bent, tilted */}
        <div className="absolute" style={{
          right: 12, bottom: 0, width: 50, height: 95,
          transform: 'rotate(4deg)',
          animation: 'legShift 6s ease-in-out infinite',
        }}>
          <MechLeg token={legs} side="right" />
        </div>
      </div>

      {/* ─── SPARK EFFECTS — random glitch sparks ─── */}
      <div className="absolute" style={{
        top: 100, left: 40, width: 6, height: 1,
        background: `linear-gradient(90deg, transparent, ${armor.glowColor}aa, transparent)`,
        animation: 'sparkFlicker 2.5s ease-in-out 0.7s infinite',
      }} />
      <div className="absolute" style={{
        top: 220, right: 20, width: 8, height: 1,
        background: `linear-gradient(90deg, transparent, ${weapon.glowColor}aa, transparent)`,
        animation: 'sparkFlicker 3s ease-in-out 1.2s infinite',
      }} />
      <div className="absolute" style={{
        bottom: 60, left: 120, width: 5, height: 1,
        background: `linear-gradient(90deg, transparent, ${legs.glowColor}aa, transparent)`,
        animation: 'sparkFlicker 2.8s ease-in-out 1.8s infinite',
      }} />

      {/* ─── GROUND SHADOW ─── */}
      <div className="absolute" style={{
        bottom: 0, left: 30, width: 220, height: 8,
        background: `radial-gradient(ellipse, ${armor.glowColor}20 0%, transparent 70%)`,
        borderRadius: '50%',
        filter: 'blur(4px)',
        animation: 'shadowPulse 3s ease-in-out infinite',
      }} />
    </div>
  );
};

/* ─── Sub-components ─── */

function BoosterUnit({ token, side, delay }: { token: TokenDef; side: 'left' | 'right'; delay: number }) {
  const { color, glowColor } = token;
  const isLeft = side === 'left';

  return (
    <div className="absolute animate-pulse" style={{
      [isLeft ? 'left' : 'right']: 2,
      top: 62,
      width: 34, height: 52,
      background: `linear-gradient(180deg, ${color}1a 0%, ${color}06 100%)`,
      border: `2px solid ${color}45`,
      borderRadius: isLeft ? '3px 14px 14px 3px' : '14px 3px 3px 14px',
      boxShadow: `0 0 25px ${glowColor}45, 0 0 50px ${glowColor}12, inset 0 0 14px ${color}12`,
      animation: `boosterFlicker 1.8s ease-in-out ${delay}s infinite`,
    }}>
      {/* Exhaust nozzle */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-7 rounded-full"
        style={{ background: `linear-gradient(0deg, ${glowColor}cc, ${color}44)`, boxShadow: `0 0 30px ${glowColor}80` }}
      />
      {/* Flame */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2 h-10 origin-top animate-pulse"
        style={{
          background: `linear-gradient(0deg, ${glowColor}88, ${glowColor}44, transparent)`,
          boxShadow: `0 0 20px ${glowColor}70, 0 0 40px ${glowColor}30`,
          borderRadius: '1px 1px 50% 50%',
        }}
      />
      {/* Inner flame */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-1 h-6 origin-top"
        style={{
          background: `linear-gradient(0deg, #fff, ${glowColor}, transparent)`,
          borderRadius: '50%',
          filter: 'blur(1px)',
          animation: `flameInner ${1 + delay}s ease-in-out infinite`,
        }}
      />
      {/* Vent lines */}
      <div style={{ position: 'absolute', top: 8, left: 4, right: 4, height: 1, background: color + '25' }} />
      <div style={{ position: 'absolute', top: 14, left: 4, right: 4, height: 1, background: color + '18' }} />
      <div style={{ position: 'absolute', top: 20, left: 4, right: 4, height: 1, background: color + '12' }} />
    </div>
  );
}

function MechArm({ token, side }: { token: TokenDef; side: 'left' | 'right' }) {
  const { color, glowColor } = token;
  const isLeft = side === 'left';
  const rotDir = isLeft ? '5deg' : '-4deg';

  return (
    <>
      {/* Shoulder — heavier, mechanical */}
      <div style={{
        width: 30, height: 30, margin: '0 auto',
        borderRadius: '40% 40% 30% 30%',
        border: `2px solid ${color}55`,
        background: `radial-gradient(circle at 50% 40%, ${color}30, ${color}08)`,
        boxShadow: `0 0 18px ${glowColor}40, inset 0 2px 6px rgba(255,255,255,0.05)`,
      }}>
        {/* Shoulder bolt */}
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${glowColor}80` }} />
        {/* Rivet */}
        <div style={{ position: 'absolute', bottom: 3, left: 4, width: 4, height: 4, borderRadius: '50%', background: color + '40' }} />
        <div style={{ position: 'absolute', bottom: 3, right: 4, width: 4, height: 4, borderRadius: '50%', background: color + '40' }} />
      </div>
      {/* Upper arm — hydraulic piston look */}
      <div style={{
        width: 12, height: 30, margin: '0 auto',
        background: `linear-gradient(180deg, ${color}28, ${color}10, ${color}28)`,
        border: `1px solid ${color}40`,
        borderRadius: '1px',
        boxShadow: `0 0 10px ${glowColor}22`,
      }}>
        {/* Piston ring */}
        <div style={{ position: 'absolute', top: 12, left: -2, right: -2, height: 2, background: color + '50', borderRadius: '1px' }} />
      </div>
      {/* Elbow — bulky joint */}
      <div style={{
        width: 20, height: 16, margin: '0 auto',
        borderRadius: '5px',
        border: `2px solid ${color}60`,
        background: color + '20',
        boxShadow: `0 0 14px ${glowColor}45`,
        transform: `rotate(${rotDir})`,
      }}>
        <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: '50%', background: glowColor, boxShadow: `0 0 6px ${glowColor}` }} />
      </div>
      {/* Forearm */}
      <div style={{
        width: 11, height: 28, margin: '0 auto',
        background: `linear-gradient(180deg, ${color}22, ${color}08)`,
        border: `1px solid ${color}42`,
        borderRadius: '1px',
        boxShadow: `0 0 9px ${glowColor}20`,
      }} />
      {/* Wrist joint */}
      <div style={{
        width: 16, height: 10, margin: '0 auto',
        borderRadius: '3px',
        border: `1.5px solid ${color}55`,
        background: color + '15',
        boxShadow: `0 0 10px ${glowColor}35`,
      }} />
      {/* Hand/weapon */}
      <MechWeapon token={token} />
    </>
  );
}

function MechLeg({ token, side }: { token: TokenDef; side: 'left' | 'right' }) {
  const { color, glowColor } = token;

  return (
    <>
      {/* Hip joint */}
      <div style={{
        width: 36, height: 24, margin: '0 auto',
        borderRadius: '16px 16px 3px 3px',
        background: `linear-gradient(180deg, ${color}28, ${color}08)`,
        border: `1.5px solid ${color}40`,
        boxShadow: `0 0 12px ${glowColor}20`,
      }}>
        <div style={{ position: 'absolute', bottom: 4, left: 6, right: 6, height: 1, background: color + '30' }} />
      </div>
      {/* Thigh — thick piston */}
      <div style={{
        width: 16, height: 28, margin: '0 auto',
        background: `linear-gradient(180deg, ${color}22, ${color}08, ${color}18)`,
        border: `1px solid ${color}38`,
        borderRadius: '2px',
        boxShadow: `0 0 9px ${glowColor}18`,
      }}>
        <div style={{ position: 'absolute', top: 10, left: -2, right: -2, height: 2, background: color + '45', borderRadius: '1px' }} />
        <div style={{ position: 'absolute', bottom: 6, left: -2, right: -2, height: 2, background: color + '35', borderRadius: '1px' }} />
      </div>
      {/* Knee — chunky */}
      <div style={{
        width: 22, height: 14, margin: '0 auto',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}30, ${color}06)`,
        border: `1.5px solid ${color}55`,
        boxShadow: `0 0 16px ${glowColor}40`,
      }} />
      {/* Shin */}
      <div style={{
        width: 12, height: 24, margin: '0 auto',
        background: `linear-gradient(180deg, ${color}18, ${color}06)`,
        border: `1px solid ${color}35`,
        borderRadius: '2px',
        boxShadow: `0 0 7px ${glowColor}16`,
      }} />
      {/* Foot — heavy, stompy */}
      <div style={{
        width: 42, height: 16, margin: '0 auto',
        borderRadius: '8px 8px 3px 3px',
        background: `linear-gradient(180deg, ${color}35, ${color}18)`,
        border: `1.5px solid ${color}55`,
        boxShadow: `0 6px 16px ${glowColor}35, 0 0 12px ${glowColor}20`,
      }}>
        {/* Tread lines */}
        <div style={{ position: 'absolute', bottom: 2, left: 4, right: 4, height: 2, background: color + '30', borderRadius: '1px' }} />
      </div>
    </>
  );
}

/* ─── Torso variants ─── */

function MechTorso({ armor }: { armor: TokenDef }) {
  const { id, color, glowColor } = armor;

  const sharedStyle: React.CSSProperties = {
    width: '100%', height: '100%',
    background: `linear-gradient(180deg, ${color}14 0%, ${color}06 50%, ${color}03 100%)`,
    border: `1.5px solid ${color}45`,
    boxShadow: `0 0 35px ${glowColor}25, 0 0 70px ${glowColor}10, inset 0 0 25px ${color}05`,
  };

  switch (id) {
    case 'btc':
      return (
        <div style={sharedStyle}>
          {/* Heavy block plates */}
          <div className="absolute top-3 left-3 w-10 h-16 border" style={{ borderColor: color + '30', background: color + '0c' }} />
          <div className="absolute top-3 right-3 w-10 h-16 border" style={{ borderColor: color + '30', background: color + '0c' }} />
          <div className="absolute top-6 left-2 right-2 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}35, transparent)` }} />
          {/* Diagonal armor straps */}
          <div className="absolute top-[52px] left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${color}15, ${color}30, ${color}15)` }} />
          <div className="absolute top-[58px] left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${color}15, ${color}30, ${color}15)` }} />
          {/* Core reactor */}
          <div className="absolute top-[70px] left-1/2 -translate-x-1/2 w-14 h-14 animate-pulse"
            style={{
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glowColor}88, ${color}22, transparent 70%)`,
              boxShadow: `0 0 40px ${glowColor}80, 0 0 80px ${glowColor}25`,
            }}
          >
            <div className="absolute inset-2 rounded-full" style={{ border: `1px solid ${color}40`, background: 'transparent' }} />
            <div className="absolute inset-4 rounded-full" style={{ border: `1px solid ${color}25`, background: 'transparent' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full"
              style={{ background: `radial-gradient(circle, #fff, ${glowColor})`, boxShadow: `0 0 25px ${glowColor}` }}
            />
          </div>
          {/* Belt */}
          <div className="absolute bottom-10 left-2 right-2 h-3" style={{ background: color + '25', borderTop: `1px solid ${color}25`, borderBottom: `1px solid ${color}25` }} />
          {/* Cable detail */}
          <div className="absolute bottom-3 left-8 w-3 h-6" style={{ border: `1px solid ${color}20`, borderRadius: '2px', background: color + '08' }} />
          <div className="absolute bottom-3 right-8 w-3 h-6" style={{ border: `1px solid ${color}20`, borderRadius: '2px', background: color + '08' }} />
        </div>
      );

    case 'eth':
      return (
        <div style={{
          ...sharedStyle,
          clipPath: 'polygon(8% 0%, 92% 0%, 100% 10%, 100% 90%, 92% 100%, 8% 100%, 0% 90%, 0% 10%)',
        }}>
          {/* Faceted crystals */}
          <div className="absolute top-5 left-5" style={{
            width: 12, height: 12, transform: 'rotate(45deg)',
            background: `linear-gradient(135deg, ${color}35, ${color}04)`,
            border: `1px solid ${color}45`,
            boxShadow: `0 0 15px ${glowColor}30`,
          }} />
          <div className="absolute top-4 right-6" style={{
            width: 10, height: 16, transform: 'rotate(20deg)',
            background: `linear-gradient(0deg, ${color}10, ${color}20)`,
            border: `1px solid ${color}30`,
            clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
          }} />
          {/* Crystal grid */}
          <div className="absolute top-[45px] left-6 right-6 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}15, ${color}30, ${color}15, transparent)` }} />
          <div className="absolute top-[75px] left-6 right-6 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}12, transparent)` }} />
          {/* Diamond core */}
          <div className="absolute top-[55px] left-1/2 -translate-x-1/2 animate-pulse" style={{
            width: 20, height: 20, transform: 'rotate(45deg)',
            background: `linear-gradient(135deg, ${glowColor}dd, ${color}55)`,
            boxShadow: `0 0 50px ${glowColor}90, 0 0 100px ${glowColor}35`,
            border: `1px solid ${glowColor}30`,
          }} />
          {/* Floating particles */}
          <div className="absolute top-[40px] left-10 w-1 h-1 rounded-full" style={{ background: glowColor, boxShadow: `0 0 8px ${glowColor}80`, animation: 'particleFloat 2s ease-in-out infinite' }} />
          <div className="absolute top-[90px] right-12 w-1.5 h-1.5 rounded-full" style={{ background: glowColor, boxShadow: `0 0 10px ${glowColor}70`, animation: 'particleFloat 2.5s ease-in-out 0.5s infinite' }} />
        </div>
      );

    case 'sol':
      return (
        <div style={{
          ...sharedStyle,
          borderRadius: '25% 75% 35% 65% / 60% 30% 70% 40%',
        }}>
          {/* Speed lines */}
          <div className="absolute top-4 left-4 w-12 h-0.5" style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }} />
          <div className="absolute top-6 left-3 w-16 h-0.5" style={{ background: `linear-gradient(90deg, ${color}25, transparent)` }} />
          <div className="absolute bottom-16 right-4 w-14 h-0.5" style={{ background: `linear-gradient(270deg, ${color}35, transparent)` }} />
          <div className="absolute bottom-14 right-3 w-18 h-0.5" style={{ background: `linear-gradient(270deg, ${color}20, transparent)` }} />
          {/* Lightning bolt */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2" style={{
            width: 3, height: 50,
            background: `linear-gradient(180deg, ${glowColor}cc, ${color}33)`,
            boxShadow: `0 0 25px ${glowColor}80`,
            clipPath: 'polygon(50% 0%, 100% 28%, 55% 28%, 75% 100%, 25% 60%, 65% 60%, 15% 0%)',
          }} />
          {/* Speed core */}
          <div className="absolute top-[65px] left-1/2 -translate-x-1/2 w-12 h-12 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${glowColor}aa, transparent 70%)`,
              boxShadow: `0 0 50px ${glowColor}90, 0 0 100px ${glowColor}40`,
            }}
          >
            <div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${color}30`, borderTopColor: glowColor + '80', animation: 'coreSpin 2s linear infinite' }} />
            <div className="absolute inset-2 rounded-full" style={{ border: `1px solid ${color}20`, borderBottomColor: glowColor + '60', animation: 'coreSpin 3s linear infinite reverse' }} />
          </div>
        </div>
      );

    case 'link':
      return (
        <div style={{
          ...sharedStyle,
          borderRadius: '10px',
          background: `linear-gradient(180deg, ${color}10 0%, ${color}04 50%, ${color}02 100%)`,
        }}>
          {/* Chain links — horizontal */}
          {[0, 1, 2, 3, 4].map(i => (
            <div key={`h${i}`} className="absolute" style={{
              top: `${14 + i * 28}px`, left: 8, right: 8, height: 14,
              border: `1.5px solid ${color}22`,
              borderRadius: '50%',
              background: color + '04',
              boxShadow: `0 0 8px ${glowColor}12`,
            }} />
          ))}
          {/* Chain nodes — vertical connectors */}
          {[0, 1, 2, 3].map(i => (
            <div key={`v${i}`} className="absolute" style={{
              top: `${28 + i * 28}px`, left: '50%', transform: 'translateX(-50%)',
              width: 16, height: 8,
              border: `1px solid ${color}28`,
              borderRadius: '50%',
              background: color + '06',
              boxShadow: `0 0 10px ${glowColor}18`,
            }} />
          ))}
          {/* Oracle core */}
          <div className="absolute top-[68px] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${glowColor}66, ${color}22, transparent 70%)`,
              boxShadow: `0 0 50px ${glowColor}70, 0 0 100px ${glowColor}25`,
            }}
          >
            <div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${color}40`, borderStyle: 'dashed', animation: 'coreSpin 4s linear infinite' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full"
              style={{ background: `radial-gradient(circle, #fff, ${glowColor}80)`, boxShadow: `0 0 20px ${glowColor}` }}
            />
            {/* Data dots orbiting */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <div key={`dot${i}`} className="absolute top-1/2 left-1/2" style={{
                width: 3, height: 3, borderRadius: '50%',
                background: glowColor,
                transform: `rotate(${deg}deg) translateY(-28px)`,
                boxShadow: `0 0 4px ${glowColor}`,
                animation: `orbitFloat ${2 + i * 0.3}s linear infinite`,
              }} />
            ))}
          </div>
        </div>
      );

    case 'avax':
      return (
        <div style={{
          ...sharedStyle,
          clipPath: 'polygon(50% 0%, 92% 18%, 100% 50%, 82% 78%, 100% 100%, 50% 96%, 0% 100%, 18% 78%, 0% 50%, 8% 18%)',
        }}>
          {/* Outer spikes */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2" style={{
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: `16px solid ${color}55`,
            filter: `drop-shadow(0 0 10px ${glowColor}70)`,
          }} />
          <div className="absolute top-2 -left-2" style={{
            width: 0, height: 0,
            borderTop: '10px solid transparent',
            borderBottom: '10px solid transparent',
            borderRight: `16px solid ${color}40`,
            filter: `drop-shadow(0 0 8px ${glowColor}50)`,
          }} />
          <div className="absolute top-2 -right-2" style={{
            width: 0, height: 0,
            borderTop: '10px solid transparent',
            borderBottom: '10px solid transparent',
            borderLeft: `16px solid ${color}40`,
            filter: `drop-shadow(0 0 8px ${glowColor}50)`,
          }} />
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2" style={{
            width: 0, height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: `14px solid ${color}45`,
            filter: `drop-shadow(0 0 8px ${glowColor}45)`,
          }} />
          {/* Jagged scars */}
          <div className="absolute top-[25px] left-8 w-10 h-0.5" style={{ background: color + '25', transform: 'rotate(-12deg)' }} />
          <div className="absolute top-[30px] left-6 w-14 h-0.5" style={{ background: color + '18', transform: 'rotate(-8deg)' }} />
          <div className="absolute bottom-[50px] right-6 w-12 h-0.5" style={{ background: color + '22', transform: 'rotate(10deg)' }} />
          {/* Berserker core */}
          <div className="absolute top-[55px] left-1/2 -translate-x-1/2 animate-pulse" style={{
            width: 50, height: 45,
            clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
            background: `linear-gradient(180deg, ${glowColor}cc, ${color}55)`,
            boxShadow: `0 0 60px ${glowColor}b0, 0 0 120px ${glowColor}40`,
          }}>
            {/* Inner fire */}
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-8 h-20 rounded-full animate-pulse"
              style={{
                background: `radial-gradient(ellipse, ${glowColor}66, transparent 70%)`,
                boxShadow: `0 0 30px ${glowColor}60`,
              }}
            />
          </div>
          {/* Glowing cracks */}
          <div className="absolute top-[40px] left-1/2 -translate-x-1/2 w-1 h-10"
            style={{ background: `linear-gradient(0deg, transparent, ${glowColor}60, transparent)`, boxShadow: `0 0 8px ${glowColor}40` }}
          />
        </div>
      );

    default:
      return <div style={sharedStyle} />;
  }
}

/* ─── Head ─── */

function MechHead({ token, armorStyle }: { token: TokenDef; armorStyle: string }) {
  const { color, glowColor, symbol } = token;

  return (
    <div className="relative">
      {/* Neck with joint rings */}
      <div style={{
        width: 10, height: 16, margin: '0 auto',
        background: `linear-gradient(180deg, ${color}22, ${color}06)`,
        border: `1px solid ${color}30`,
        borderRadius: '2px',
        boxShadow: `0 0 6px ${glowColor}15`,
      }}>
        <div style={{ position: 'absolute', top: 2, left: -3, right: -3, height: 2, background: color + '35', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: 7, left: -3, right: -3, height: 2, background: color + '28', borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 2, left: -3, right: -3, height: 2, background: color + '35', borderRadius: 1 }} />
      </div>

      {/* Head unit */}
      <div style={{
        width: 58, height: 55, margin: '0 auto',
        borderRadius: '10px 10px 5px 5px',
        background: `linear-gradient(180deg, ${color}16 0%, ${color}07 60%, ${color}03 100%)`,
        border: `1.5px solid ${color}48`,
        boxShadow: `0 0 30px ${glowColor}38, 0 0 60px ${glowColor}10, inset 0 -12px 18px ${color}05`,
      }}>
        {/* Antenna array */}
        <div style={{
          position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
          width: 2, height: 18,
          background: `linear-gradient(0deg, ${color}, transparent)`,
          boxShadow: `0 0 10px ${glowColor}50`,
        }}>
          <div style={{
            position: 'absolute', top: -4, left: -3,
            width: 8, height: 8, borderRadius: '50%',
            background: glowColor,
            boxShadow: `0 0 15px ${glowColor}, 0 0 30px ${glowColor}50`,
            animation: 'antennaBlink 1.2s ease-in-out infinite',
          }} />
        </div>
        {/* Side antennas */}
        <div style={{
          position: 'absolute', top: -8, left: 8,
          width: 1.5, height: 10,
          background: `linear-gradient(0deg, ${color}, transparent)`,
          transform: 'rotate(-20deg)',
          boxShadow: `0 0 6px ${glowColor}30`,
        }}>
          <div style={{
            position: 'absolute', top: -2, left: -2,
            width: 5, height: 5, borderRadius: '50%',
            background: glowColor + '80',
            boxShadow: `0 0 8px ${glowColor}40`,
            animation: 'antennaBlink 1.8s ease-in-out 0.4s infinite',
          }} />
        </div>
        <div style={{
          position: 'absolute', top: -8, right: 8,
          width: 1.5, height: 10,
          background: `linear-gradient(0deg, ${color}, transparent)`,
          transform: 'rotate(20deg)',
          boxShadow: `0 0 6px ${glowColor}30`,
        }}>
          <div style={{
            position: 'absolute', top: -2, left: -2,
            width: 5, height: 5, borderRadius: '50%',
            background: glowColor + '80',
            boxShadow: `0 0 8px ${glowColor}40`,
            animation: 'antennaBlink 1.8s ease-in-out 0.7s infinite',
          }} />
        </div>

        {/* HUD Visor */}
        <div style={{
          position: 'absolute', top: 12, left: 7, right: 7, height: 13,
          borderRadius: '4px',
          background: `linear-gradient(180deg, ${glowColor}cc, ${color}66, ${glowColor}88)`,
          boxShadow: `0 0 30px ${glowColor}90, 0 0 60px ${glowColor}30, inset 0 2px 8px rgba(255,255,255,0.3)`,
          overflow: 'hidden',
        }}>
          {/* Scan line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: glowColor + '40',
            animation: 'scanLine 0.8s linear infinite',
          }} />
          {/* Eye dots */}
          <div style={{ position: 'absolute', top: 3, left: 8, width: 3, height: 3, borderRadius: '50%', background: '#fff', boxShadow: `0 0 6px ${glowColor}` }} />
          <div style={{ position: 'absolute', top: 3, right: 8, width: 3, height: 3, borderRadius: '50%', background: '#fff', boxShadow: `0 0 6px ${glowColor}` }} />
        </div>

        {/* Mouth grille */}
        <div style={{
          position: 'absolute', bottom: 9, left: 10, right: 10, height: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 6, height: 3 + i * 1.5,
              background: i === 2 ? glowColor + '60' : color + '30',
              borderRadius: '1px',
              boxShadow: `0 0 ${i === 2 ? 6 : 3}px ${glowColor}25`,
            }} />
          ))}
        </div>

        {/* Cheek panels */}
        <div style={{ position: 'absolute', top: 8, left: -4, width: 4, height: 20, background: color + '12', border: `1px solid ${color}22`, borderRadius: '2px' }} />
        <div style={{ position: 'absolute', top: 8, right: -4, width: 4, height: 20, background: color + '12', border: `1px solid ${color}22`, borderRadius: '2px' }} />
      </div>

      {/* Token badge */}
      <div style={{
        position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
        padding: '2px 8px',
        borderRadius: '4px',
        background: `linear-gradient(90deg, ${color}08, ${color}18, ${color}08)`,
        border: `1px solid ${color}35`,
        color: glowColor,
        fontSize: '9px',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        letterSpacing: '0.15em',
        boxShadow: `0 0 12px ${glowColor}30`,
        animation: 'badgeGlow 2s ease-in-out infinite',
      }}>
        ◆ {symbol}
      </div>
    </div>
  );
}

/* ─── Weapon hands ─── */

function MechWeapon({ token }: { token: TokenDef }) {
  const { id, color, glowColor } = token;

  switch (id) {
    case 'btc':
      return (
        <div style={{
          width: 34, height: 24, margin: '0 auto',
          borderRadius: '4px',
          background: `linear-gradient(135deg, ${color}30, ${color}10)`,
          border: `2.5px solid ${color}55`,
          boxShadow: `0 0 25px ${glowColor}50, inset 0 2px 4px rgba(255,255,255,0.05)`,
        }}>
          <div style={{ position: 'absolute', top: 4, left: 5, width: 24, height: 2, background: color + '45' }} />
          <div style={{ position: 'absolute', top: 8, left: 2, width: 30, height: 4, background: color + '22', borderRadius: '2px' }} />
          <div style={{ position: 'absolute', bottom: 5, left: 7, width: 20, height: 3, background: color + '35', borderRadius: '1px' }} />
          <div style={{ position: 'absolute', top: 14, left: 10, width: 14, height: 1, background: glowColor + '40' }} />
        </div>
      );

    case 'eth':
      return (
        <div style={{
          width: 28, height: 32, margin: '0 auto',
          clipPath: 'polygon(50% 0%, 100% 45%, 75% 65%, 100% 100%, 50% 85%, 0% 100%, 25% 65%, 0% 45%)',
          background: `linear-gradient(135deg, ${color}45, ${color}10)`,
          border: `1.5px solid ${color}60`,
          boxShadow: `0 0 30px ${glowColor}55, 0 0 60px ${glowColor}20`,
        }} />
      );

    case 'sol':
      return (
        <div style={{
          width: 24, height: 34, margin: '0 auto',
          clipPath: 'polygon(60% 0%, 100% 18%, 78% 50%, 100% 82%, 60% 100%, 40% 100%, 0% 82%, 22% 50%, 0% 18%, 40% 0%)',
          background: `linear-gradient(135deg, ${color}45, ${color}12)`,
          border: `1.5px solid ${color}55`,
          boxShadow: `0 0 28px ${glowColor}60, 0 0 55px ${glowColor}25`,
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 2, height: 18,
            background: glowColor + 'aa',
            boxShadow: `0 0 12px ${glowColor}`,
            animation: 'lightningPulse 1.5s ease-in-out infinite',
          }} />
        </div>
      );

    case 'link':
      return (
        <div style={{
          width: 30, height: 30, margin: '0 auto',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}25, ${color}05)`,
          border: `2px solid ${color}55`,
          boxShadow: `0 0 25px ${glowColor}45`,
        }}>
          <div style={{ position: 'absolute', top: 4, left: 4, width: 22, height: 22, borderRadius: '50%', border: `1px solid ${color}30`, background: 'transparent' }} />
          <div style={{ position: 'absolute', top: 8, left: 8, width: 14, height: 14, borderRadius: '50%', background: color + '40', boxShadow: `0 0 15px ${glowColor}55` }} />
          <div style={{ position: 'absolute', top: 12, left: 12, width: 6, height: 6, borderRadius: '50%', background: glowColor, boxShadow: `0 0 8px ${glowColor}` }} />
          {/* Chain links */}
          <div style={{ position: 'absolute', left: -12, top: 12, width: 12, height: 6, borderRadius: '50%', border: `1px solid ${color}30`, background: color + '08', boxShadow: `0 0 5px ${glowColor}15` }} />
          <div style={{ position: 'absolute', right: -12, top: 12, width: 12, height: 6, borderRadius: '50%', border: `1px solid ${color}30`, background: color + '08', boxShadow: `0 0 5px ${glowColor}15` }} />
        </div>
      );

    case 'avax':
      return (
        <div style={{
          width: 32, height: 32, margin: '0 auto',
          clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
          background: `linear-gradient(135deg, ${color}45, ${color}14)`,
          border: `2px solid ${color}60`,
          boxShadow: `0 0 35px ${glowColor}65, 0 0 70px ${glowColor}30`,
        }}>
          <div style={{ position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: glowColor, boxShadow: `0 0 12px ${glowColor}` }} />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2" style={{
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: `10px solid ${glowColor}90`,
            filter: `drop-shadow(0 0 8px ${glowColor}60)`,
          }} />
        </div>
      );

    default:
      return (
        <div style={{
          width: 28, height: 28, margin: '0 auto',
          borderRadius: '4px',
          background: `linear-gradient(135deg, ${color}30, ${color}08)`,
          border: `1.5px solid ${color}55`,
          boxShadow: `0 0 22px ${glowColor}45`,
        }} />
      );
  }
}

export default MechArt;
