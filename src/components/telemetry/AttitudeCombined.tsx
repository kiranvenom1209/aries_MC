import { Navigation } from 'lucide-react';

type AttitudeCombinedLayout = 'default' | 'wide';

interface AttitudeCombinedProps {
  layout?: AttitudeCombinedLayout;
}

const headingToCardinal = (heading: number) => {
  const normalized = ((heading % 360) + 360) % 360;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(normalized / 45) % directions.length];
};

const MetricCard = ({
  label,
  value,
  detail,
  valueClassName = 'text-white',
}: {
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
}) => (
  <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 shadow-[inset_0_0_18px_rgba(255,255,255,0.03)]">
    <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-white/35">{label}</div>
    <div className={`mt-1 text-sm font-mono font-bold leading-none tabular-nums md:text-[0.95rem] ${valueClassName}`}>{value}</div>
    <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.14em] text-white/35">{detail}</div>
  </div>
);

import { useTelemetryState } from '../../context/TelemetryContext';

const AttitudeCombined: React.FC<AttitudeCombinedProps> = ({ layout = 'default' }) => {
  const { state } = useTelemetryState();
  const { pitch, roll, heading, tilt } = state.orientation;

  const horizonTransform = `translateY(${pitch * 1.5}px) rotate(${roll}deg)`;
  const tiltPercentage = Math.min(Math.max((tilt / 45) * 100, 0), 100);
  const isDanger = tilt > 30;
  const isWarning = tilt > 20 && tilt <= 30;
  const barColor = isDanger ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-primary-color';
  const tiltTextColor = isDanger ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-white';
  const tiltGradient = isDanger ? 'from-red-500 to-red-400' : isWarning ? 'from-orange-500 to-amber-400' : 'from-primary-color to-amber-300';
  const tiltStateLabel = isDanger ? 'Critical' : isWarning ? 'Watch' : 'Stable';
  const attitudeState = isDanger ? 'Critical tilt' : isWarning ? 'Caution band' : 'Stable platform';
  const headingCardinal = headingToCardinal(heading);
  const isWide = layout === 'wide';

  const renderWideFlightDisplay = () => (
    <div className={`relative flex h-full min-h-[220px] items-center justify-center overflow-hidden ${isWide ? 'rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(254,156,61,0.08),transparent_72%)]' : ''}`}>
      <div className={`relative aspect-square w-full ${isWide ? 'max-w-[250px]' : 'max-w-[280px]'} flex items-center justify-center overflow-visible`}>
        <div
          className="absolute inset-2 md:inset-0 rounded-full border-2 border-white/5 transition-transform duration-100 ease-linear z-10"
          style={{ transform: `rotate(${-heading}deg)`, willChange: 'transform' }}
        >
          {[...Array(36)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-0 w-1 origin-bottom"
              style={{ transform: `translateX(-50%) rotate(${i * 10}deg)`, transformOrigin: '50% 100%', height: '50%' }}
            >
              <div className={`mx-auto w-0.5 ${i % 9 === 0 ? 'h-3 bg-primary-color' : 'h-1.5 bg-white/20'}`}></div>
              {i % 9 === 0 && (
                <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[9px] font-mono font-bold text-white drop-shadow-md md:text-[10px]" style={{ transform: `rotate(${-i * 10}deg)` }}>
                  {i === 0 ? <span className="text-red-500">N</span> : i === 9 ? 'E' : i === 18 ? 'S' : 'W'}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="absolute left-1/2 top-1 -translate-x-1/2 z-20 flex flex-col items-center drop-shadow-[0_0_8px_rgba(254,156,61,0.8)]">
          <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-primary-color"></div>
        </div>

        <div className="absolute inset-8 rounded-full border-4 border-white/10 bg-sky-900/40 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] overflow-hidden z-0">
          <div
            className="absolute inset-[-100%] flex flex-col transition-transform duration-100 ease-linear"
            style={{ transform: horizonTransform, willChange: 'transform' }}
          >
            <div className="relative flex-1 border-b border-primary-color/70 bg-sky-500/30 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:12px_12px]">
              <div className="absolute bottom-4 left-1/2 flex w-20 -translate-x-1/2 items-center justify-between border-b-[1.5px] border-white/50"><span className="-ml-5 text-[7px] font-mono text-white/70">10</span><span className="-mr-5 text-[7px] font-mono text-white/70">10</span></div>
              <div className="absolute bottom-8 left-1/2 w-12 -translate-x-1/2 border-b border-white/30"></div>
              <div className="absolute bottom-12 left-1/2 flex w-20 -translate-x-1/2 items-center justify-between border-b-[1.5px] border-white/50"><span className="-ml-5 text-[7px] font-mono text-white/70">20</span><span className="-mr-5 text-[7px] font-mono text-white/70">20</span></div>
              <div className="absolute bottom-16 left-1/2 w-12 -translate-x-1/2 border-b border-white/30"></div>
              <div className="absolute bottom-20 left-1/2 flex w-20 -translate-x-1/2 items-center justify-between border-b-[1.5px] border-white/50"><span className="-ml-5 text-[7px] font-mono text-white/70">30</span><span className="-mr-5 text-[7px] font-mono text-white/70">30</span></div>
              <div className="absolute bottom-24 left-1/2 w-12 -translate-x-1/2 border-b border-white/30"></div>
            </div>
            <div className="relative flex-1 bg-amber-800/40 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:12px_12px]">
              <div className="absolute left-1/2 top-4 flex w-20 -translate-x-1/2 items-center justify-between border-t-[1.5px] border-white/50"><span className="-ml-5 text-[7px] font-mono text-white/70">10</span><span className="-mr-5 text-[7px] font-mono text-white/70">10</span></div>
              <div className="absolute left-1/2 top-8 w-12 -translate-x-1/2 border-t border-white/30"></div>
              <div className="absolute left-1/2 top-12 flex w-20 -translate-x-1/2 items-center justify-between border-t-[1.5px] border-white/50"><span className="-ml-5 text-[7px] font-mono text-white/70">20</span><span className="-mr-5 text-[7px] font-mono text-white/70">20</span></div>
              <div className="absolute left-1/2 top-16 w-12 -translate-x-1/2 border-t border-white/30"></div>
              <div className="absolute left-1/2 top-20 flex w-20 -translate-x-1/2 items-center justify-between border-t-[1.5px] border-white/50"><span className="-ml-5 text-[7px] font-mono text-white/70">30</span><span className="-mr-5 text-[7px] font-mono text-white/70">30</span></div>
              <div className="absolute left-1/2 top-24 w-12 -translate-x-1/2 border-t border-white/30"></div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="relative h-[2px] w-28 bg-primary-color shadow-[0_0_8px_rgba(254,156,61,0.9)] md:w-32">
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary-color bg-black"></div>
          </div>
          <div className="absolute left-1/2 top-1/4 h-4 w-[2px] -translate-x-1/2 -translate-y-full bg-primary-color/50"></div>
        </div>

        <div className={`absolute top-1/2 z-20 h-36 w-3 -translate-y-1/2 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-[0_0_15px_rgba(0,0,0,0.8)] ${isWide ? 'right-3' : 'right-[-24px]'}`}>
          <div className={`absolute bottom-0 w-full transition-all duration-300 ease-out ${barColor} shadow-[0_0_10px_currentColor]`} style={{ height: `${tiltPercentage}%` }}></div>
          <div className="absolute bottom-[44%] h-[1px] w-full bg-orange-500"></div>
          <div className="absolute bottom-[66%] h-[1px] w-full bg-red-500"></div>
        </div>

        <div className="absolute left-3 top-3 flex flex-col rounded-lg border border-white/10 bg-black/70 px-2 py-1 backdrop-blur-md">
          <span className="text-[8px] font-mono tracking-widest text-white/50">HDG</span>
          <span className="text-sm font-mono text-white drop-shadow-[0_0_5px_currentColor]">{heading.toFixed(1)}°</span>
        </div>
        <div className="absolute right-3 top-3 flex flex-col items-end rounded-lg border border-white/10 bg-black/70 px-2 py-1 backdrop-blur-md">
          <span className="text-[8px] font-mono tracking-widest text-white/50">INC</span>
          <span className={`text-sm font-mono drop-shadow-[0_0_5px_currentColor] ${tiltTextColor}`}>{tilt.toFixed(1)}°</span>
        </div>
        <div className="absolute bottom-3 left-3 flex flex-col rounded-lg border border-white/10 bg-black/70 px-2 py-1 backdrop-blur-md">
          <span className="text-[8px] font-mono tracking-widest text-white/50">PTCH</span>
          <span className="text-sm font-mono text-white drop-shadow-[0_0_5px_currentColor]">{pitch.toFixed(1)}°</span>
        </div>
        <div className="absolute bottom-3 right-3 flex flex-col items-end rounded-lg border border-white/10 bg-black/70 px-2 py-1 backdrop-blur-md">
          <span className="text-[8px] font-mono tracking-widest text-white/50">ROLL</span>
          <span className="text-sm font-mono text-white drop-shadow-[0_0_5px_currentColor]">{roll.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );

  const renderDefaultFlightDisplay = () => (
    <div className="flex-1 relative flex items-center justify-center bg-black px-8 py-8 md:px-12 overflow-hidden">
      <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center overflow-visible">
        <div
          className="absolute inset-2 md:inset-0 rounded-full border-2 border-white/5 transition-transform duration-100 ease-linear z-10"
          style={{ transform: `rotate(${-heading}deg)`, willChange: 'transform' }}
        >
          {[...Array(36)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-3 left-1/2 top-0 origin-bottom"
              style={{ transform: `translateX(-50%) rotate(${i * 10}deg)`, transformOrigin: '50% 100%', height: '50%' }}
            >
              <div className={`w-0.5 mx-auto ${i % 9 === 0 ? 'h-3 bg-primary-color' : 'h-1.5 bg-white/20'}`}></div>
              {i % 9 === 0 && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] md:text-[10px] font-mono font-bold text-white drop-shadow-md" style={{ transform: `rotate(${-i * 10}deg)` }}>
                  {i === 0 ? <span className="text-red-500">N</span> : i === 9 ? 'E' : i === 18 ? 'S' : 'W'}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center drop-shadow-[0_0_8px_rgba(254,156,61,0.8)]">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-primary-color"></div>
        </div>

        <div className="absolute inset-8 rounded-full border-4 border-white/10 overflow-hidden bg-sky-900/40 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] z-0">
          <div
            className="absolute inset-[-100%] transition-transform duration-100 ease-linear flex flex-col"
            style={{ transform: horizonTransform, willChange: 'transform' }}
          >
            <div className="flex-1 bg-sky-500/30 border-b border-primary-color/70 relative bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:12px_12px]">
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 border-b-[1.5px] border-white/50 flex justify-between items-center"><span className="text-[7px] font-mono -ml-5 text-white/70">10</span><span className="text-[7px] font-mono -mr-5 text-white/70">10</span></div>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-12 border-b border-white/30"></div>
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-20 border-b-[1.5px] border-white/50 flex justify-between items-center"><span className="text-[7px] font-mono -ml-5 text-white/70">20</span><span className="text-[7px] font-mono -mr-5 text-white/70">20</span></div>
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-12 border-b border-white/30"></div>
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-20 border-b-[1.5px] border-white/50 flex justify-between items-center"><span className="text-[7px] font-mono -ml-5 text-white/70">30</span><span className="text-[7px] font-mono -mr-5 text-white/70">30</span></div>
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-12 border-b border-white/30"></div>
            </div>
            <div className="flex-1 bg-amber-800/40 relative bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:12px_12px]">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 border-t-[1.5px] border-white/50 flex justify-between items-center"><span className="text-[7px] font-mono -ml-5 text-white/70">10</span><span className="text-[7px] font-mono -mr-5 text-white/70">10</span></div>
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-12 border-t border-white/30"></div>
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-20 border-t-[1.5px] border-white/50 flex justify-between items-center"><span className="text-[7px] font-mono -ml-5 text-white/70">20</span><span className="text-[7px] font-mono -mr-5 text-white/70">20</span></div>
              <div className="absolute top-16 left-1/2 -translate-x-1/2 w-12 border-t border-white/30"></div>
              <div className="absolute top-20 left-1/2 -translate-x-1/2 w-20 border-t-[1.5px] border-white/50 flex justify-between items-center"><span className="text-[7px] font-mono -ml-5 text-white/70">30</span><span className="text-[7px] font-mono -mr-5 text-white/70">30</span></div>
              <div className="absolute top-24 left-1/2 -translate-x-1/2 w-12 border-t border-white/30"></div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-32 h-[2px] bg-primary-color relative shadow-[0_0_8px_rgba(254,156,61,0.9)]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-primary-color bg-black"></div>
          </div>
          <div className="absolute left-1/2 top-1/4 -translate-x-1/2 transform -translate-y-full w-[2px] h-4 bg-primary-color/50"></div>
        </div>

        <div className="absolute right-[-24px] top-1/2 -translate-y-1/2 w-3 h-40 bg-white/5 rounded-full border border-white/10 overflow-hidden backdrop-blur-sm z-20 shadow-[0_0_15px_rgba(0,0,0,0.8)]">
          <div className={`absolute bottom-0 w-full transition-all duration-300 ease-out ${barColor} shadow-[0_0_10px_currentColor]`} style={{ height: `${tiltPercentage}%` }}></div>
          <div className="absolute bottom-[44%] w-full h-[1px] bg-orange-500"></div>
          <div className="absolute bottom-[66%] w-full h-[1px] bg-red-500"></div>
        </div>

        <div className="absolute -top-4 -left-6 flex flex-col bg-black/60 p-1.5 rounded border border-white/10 backdrop-blur-md">
          <span className="text-[8px] font-mono text-white/50 tracking-widest">HDG</span>
          <span className="text-sm font-mono text-white drop-shadow-[0_0_5px_currentColor]">{heading.toFixed(1)}°</span>
        </div>
        <div className="absolute -top-4 -right-1 flex flex-col items-end bg-black/60 p-1.5 rounded border border-white/10 backdrop-blur-md">
          <span className="text-[8px] font-mono text-white/50 tracking-widest">INC</span>
          <span className={`text-sm font-mono ${isDanger ? 'text-red-500 animate-pulse' : isWarning ? 'text-orange-500' : 'text-white'} drop-shadow-[0_0_5px_currentColor]`}>{tilt.toFixed(1)}°</span>
        </div>
        <div className="absolute -bottom-4 -left-6 flex flex-col bg-black/60 p-1.5 rounded border border-white/10 backdrop-blur-md">
          <span className="text-[8px] font-mono text-white/50 tracking-widest">PTCH</span>
          <span className="text-sm font-mono text-white drop-shadow-[0_0_5px_currentColor]">{pitch.toFixed(1)}°</span>
        </div>
        <div className="absolute -bottom-4 -right-1 flex flex-col items-end bg-black/60 p-1.5 rounded border border-white/10 backdrop-blur-md">
          <span className="text-[8px] font-mono text-white/50 tracking-widest">ROLL</span>
          <span className="text-sm font-mono text-white drop-shadow-[0_0_5px_currentColor]">{roll.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full relative glow-border">
      <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Navigation size={14} className="text-primary-color" />
          <span className="text-[10px] uppercase text-primary-color font-bold tracking-[0.15em] drop-shadow-[0_0_5px_rgba(254,156,61,0.5)]">
            Primary Rover Telemetry
          </span>
        </div>
        <button className="px-2 py-1 text-[9px] uppercase tracking-widest text-white/70 hover:text-primary-color transition-colors bg-white/5 rounded border border-white/10">
          Sync IMU
        </button>
      </div>

      {isWide ? (
        <div className="flex-1 min-h-0 bg-black/90 p-3">
          <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]">
            {renderWideFlightDisplay()}

            <div className="grid min-h-0 grid-cols-2 gap-3 auto-rows-fr">
              <MetricCard label="Heading" value={`${heading.toFixed(1)}°`} detail={headingCardinal} valueClassName="text-white" />
              <MetricCard label="Tilt" value={`${tilt.toFixed(1)}°`} detail={tiltStateLabel} valueClassName={tiltTextColor} />
              <MetricCard label="Pitch" value={`${pitch.toFixed(1)}°`} detail={pitch >= 0 ? 'Nose up' : 'Nose down'} />
              <MetricCard label="Roll" value={`${roll.toFixed(1)}°`} detail={roll >= 0 ? 'Starboard lean' : 'Port lean'} />

              <div className="col-span-2 rounded-xl border border-white/10 bg-black/40 px-3 py-3 shadow-[inset_0_0_18px_rgba(255,255,255,0.03)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-white/35">Vehicle attitude state</div>
                    <div className="mt-1 text-[10px] font-mono leading-tight text-white md:text-xs">{headingCardinal} bearing · {attitudeState}</div>
                  </div>
                  <div className={`rounded-md border px-2 py-1 text-[9px] font-mono uppercase tracking-widest ${isDanger ? 'border-red-500/40 bg-red-900/20 text-red-400' : isWarning ? 'border-orange-500/40 bg-orange-900/20 text-orange-300' : 'border-green-500/35 bg-green-900/15 text-green-400'}`}>
                    {isDanger ? 'critical' : isWarning ? 'watch' : 'nominal'}
                  </div>
                </div>

                <div className="mt-3 relative h-2 rounded-full border border-white/10 bg-black/60">
                  <div className={`h-full rounded-full bg-gradient-to-r ${tiltGradient} transition-[width] duration-300`} style={{ width: `${tiltPercentage}%` }}></div>
                  <div className="absolute inset-y-0 left-[44%] w-px bg-orange-400/80"></div>
                  <div className="absolute inset-y-0 left-[66%] w-px bg-red-400/80"></div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[8px] font-mono uppercase tracking-[0.12em] text-white/30">
                  <span>0° stable</span>
                  <span>20° caution</span>
                  <span>30° critical</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        renderDefaultFlightDisplay()
      )}
    </div>
  );
};

export default AttitudeCombined;

