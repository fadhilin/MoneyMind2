import React from 'react';
import type { ApiMonthlySummary, ApiBudgetDistribution, ApiBreakdownItem, Budget as BudgetType } from '../types/finance';

interface ReportSectionProps {
  summary?: ApiMonthlySummary;
  budgetDist?: ApiBudgetDistribution[];
  breakdown?: ApiBreakdownItem[];
  periodLabel?: string;
  budgets?: BudgetType[];
  reportPeriod?: string;
}

const ReportSection: React.FC<ReportSectionProps> = ({ summary, budgetDist = [], periodLabel = '', budgets = [], reportPeriod = '' }) => {
  const totalIncome = summary?.realIncome ?? 0;
  const totalExpense = summary?.adjustedExpense ?? 0;
  const totalBalance = summary?.totalBalance ?? 0;

  // For the donut chart
  // Safe colors if budgets don't have them
  const colors = ['#815cf0', '#34d399', '#f59e0b', '#fb7185', '#38bdf8', '#a78bfa'];

  // Map common tailwind colors to hex for SVG strokes
  const tailwindToHex: Record<string, string> = {
    'rose-500': '#f43f5e',
    'emerald-500': '#10b981',
    'blue-500': '#3b82f6',
    'amber-500': '#f59e0b',
    'purple-500': '#a855f7',
    'orange-500': '#f97316',
    'cyan-500': '#06b6d4',
    'pink-500': '#ec4899',
    'indigo-500': '#6366f1',
    'teal-500': '#14b8a6',
    'primary': '#815cf0' // custom theme purple
  };

  // Helper to map category to its actual budget color
  const getColorForCategory = (categoryName: string, fallbackIndex: number) => {
    if (categoryName === 'Lainnya') return '#94a3b8'; // slate-400
    const customColor = budgets.find(b => b.category === categoryName)?.color;
    if (customColor) {
      const baseColor = customColor.replace('text-', '').replace('bg-', '');
      return tailwindToHex[baseColor] || colors[fallbackIndex % colors.length];
    }
    return colors[fallbackIndex % colors.length];
  };

  // Pre-calculate segments to avoid React reassignment warnings during render
  const budgetSpentSum = budgetDist.reduce((sum, b) => sum + b.spent, 0);
  const otherSpent = Math.max(0, totalExpense - budgetSpentSum);

  const pieces = budgetDist.filter(b => b.spent > 0).map(b => {
    return {
      ...b,
      spentRatio: totalExpense > 0 ? (b.spent / totalExpense) * 100 : 0
    };
  });

  if (otherSpent > 0) {
    pieces.push({
      category: 'Lainnya',
      spent: otherSpent,
      limit: 0,
      percent: 0,
      spentRatio: (otherSpent / totalExpense) * 100
    });
  }

  const segments = pieces.reduce((acc, b) => {
    const tempOffset = acc.length > 0 ? -(acc[acc.length - 1].dashOffset - acc[acc.length - 1].spentRatio) : 0;
    
    acc.push({
      ...b,
      dashArray: `${b.spentRatio}, 100`,
      dashOffset: -tempOffset
    });
    return acc;
  }, [] as (typeof pieces[0] & { dashArray: string, dashOffset: number })[]);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="glass p-5 md:p-6 rounded-2xl relative overflow-hidden group border border-slate-100 dark:border-white/5">
          <div className="absolute -right-4 -top-4 size-20 md:size-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
          <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-wider">Pemasukan</p>
          <div className="flex items-baseline gap-2 mt-1 md:mt-2">
            <h3 className="text-lg md:text-2xl font-black text-black dark:text-white">Rp {totalIncome.toLocaleString('id-ID')}</h3>
          </div>
          <div className="mt-3 md:mt-4 w-full bg-slate-100 dark:bg-white/5 h-1 md:h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-full" style={{ width: totalIncome > 0 ? '100%' : '0%' }}></div>
          </div>
        </div>
        
        <div className="glass p-5 md:p-6 rounded-2xl relative overflow-hidden group border border-slate-100 dark:border-white/5">
          <div className="absolute -right-4 -top-4 size-20 md:size-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500"></div>
          <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-wider">Pengeluaran</p>
          <div className="flex items-baseline gap-2 mt-1 md:mt-2">
            <h3 className="text-lg md:text-2xl font-black text-black dark:text-white">Rp {totalExpense.toLocaleString('id-ID')}</h3>
          </div>
          <div className="mt-3 md:mt-4 w-full bg-slate-100 dark:bg-white/5 h-1 md:h-1.5 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${totalIncome > 0 ? Math.min((totalExpense/totalIncome)*100, 100) : 0}%` }}></div>
          </div>
        </div>
        
        <div className="glass p-5 md:p-6 rounded-2xl relative overflow-hidden group border border-primary/20 bg-primary/5">
          <div className="absolute -right-4 -top-4 size-20 md:size-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500"></div>
          <p className="text-primary/70 text-[10px] md:text-sm font-bold uppercase tracking-wider">Selisih (Net)</p>
          <div className="flex items-baseline gap-2 mt-1 md:mt-2">
            <h3 className={`text-lg md:text-2xl font-black ${totalBalance >= 0 ? 'text-primary' : 'text-rose-500'}`}>
              {totalBalance >= 0 ? '+' : '-'}Rp {Math.abs(totalBalance).toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="mt-3 md:mt-4 w-full bg-primary/10 h-1 md:h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${totalIncome > 0 ? Math.max(0, Math.min((totalBalance/totalIncome)*100, 100)) : 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 glass p-6 md:p-8 rounded-2xl md:rounded-3xl flex flex-col justify-between border border-slate-100 dark:border-white/5">
          <div>
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h4 className="font-bold text-base md:text-lg text-black dark:text-white">Distribusi Budget</h4>
              <span className="material-symbols-outlined text-slate-500 text-sm md:text-base">pie_chart</span>
            </div>
            <div className="flex justify-center py-4 md:py-6">
              <div className="relative size-40 md:size-48">
                <svg className="size-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path className="text-slate-100 dark:text-white/5 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="4"></path>
                  
                  {/* Dynamic Segments */}
                  {segments.map((b, i) => (
                    <path 
                      key={`${b.category}-${i}`}
                      stroke={getColorForCategory(b.category, i)}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none" 
                      strokeDasharray={b.dashArray} 
                      strokeDashoffset={b.dashOffset} 
                      strokeLinecap="round" 
                      strokeWidth="4"
                      className="transition-all duration-1000"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Budget</p>
                  <p className="text-sm md:text-base font-black text-black dark:text-white leading-none">
                    {totalExpense >= 1000000 
                      ? `${(totalExpense / 1000000).toFixed(1)}jt` 
                      : totalExpense >= 1000 
                        ? `${(totalExpense / 1000).toLocaleString('id-ID')}rb`
                        : totalExpense.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-y-2.5 mt-6 md:mt-8">
             {pieces.map((b, i) => {
               const spentRatio = totalExpense > 0 ? Math.round((b.spent / totalExpense) * 100) : 0;
               const customColor = budgets.find(bg => bg.category === b.category)?.color;
               
               return (
                 <div key={b.category} className="flex items-center gap-2">
                   {b.category === 'Lainnya' ? (
                     <span className="size-2.5 md:size-3 rounded-full bg-slate-400 shrink-0"></span>
                   ) : customColor ? (
                     <span className={`size-2.5 md:size-3 rounded-full bg-${customColor.replace('text-', '').replace('bg-', '')} shrink-0`}></span>
                   ) : (
                     <span className="size-2.5 md:size-3 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }}></span>
                   )}
                   <span className="text-[10px] md:text-xs text-slate-500 font-medium truncate w-full" title={`${b.category} (${spentRatio}%)`}>
                     {b.category} ({spentRatio}%)
                   </span>
                 </div>
               );
             })}
            {pieces.length === 0 && (
              <span className="text-[10px] text-slate-400 col-span-2 text-center mt-4">Belum ada transaksi di periode ini.</span>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 glass p-6 md:p-8 rounded-2xl md:rounded-3xl flex flex-col border border-slate-100 dark:border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-2">
            <div>
              <h4 className="font-bold text-base md:text-lg text-black dark:text-white">Tren Pengeluaran</h4>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium">Berdasarkan periode {reportPeriod === 'daily' ? 'Hari Ini' : reportPeriod === 'weekly' ? '7 Hari' : '30 Hari'}</p>
            </div>
            <div className="flex items-center gap-1.5 text-primary text-[10px] md:text-sm font-black uppercase tracking-wider">
              <span className="material-symbols-outlined text-xs md:text-sm">calendar_month</span>
              <span>{periodLabel}</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-[300px] relative pt-10">
            {summary?.dailyExpenses && summary.dailyExpenses.length > 0 ? (
              <div className="relative w-full h-full group/chart">
                {(() => {
                  let data = [...summary.dailyExpenses];
                  
                  // If no data, show a flat line or better empty state
                  if (data.length === 0) return null;

                  const maxAmt = Math.max(...data.map(d => d.amount), 1000);
                  // Round maxAmt up to the nearest logical step for Y-axis (e.g. nearest 1jt or 100rb)
                  const step = maxAmt > 1000000 ? 500000 : 100000;
                  const yMax = Math.ceil(maxAmt / step) * step;

                  const chartW = 600;
                  const chartH = 250;
                  const paddingL = 60;
                  const paddingR = 40;
                  const paddingB = 30;
                  const paddingT = 65;
                  
                  const innerW = chartW - paddingL - paddingR;
                  const innerH = chartH - paddingT - paddingB;

                  const getX = (i: number) => paddingL + (i / (data.length - 1)) * innerW;
                  const getY = (amt: number) => paddingT + innerH - (amt / (yMax || 1)) * innerH;
                  
                  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.amount), amount: d.amount, date: d.date }));
                  
                  // Generate path
                  let lineD = `M ${points[0].x} ${points[0].y}`;
                  for (let i = 0; i < points.length - 1; i++) {
                    const p0 = points[i];
                    const p1 = points[i + 1];
                    const cp1x = p0.x + (p1.x - p0.x) / 2;
                    const cp1y = p0.y;
                    const cp2x = p0.x + (p1.x - p0.x) / 2;
                    const cp2y = p1.y;
                    lineD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
                  }
                  
                  const areaD = `${lineD} L ${points[points.length-1].x} ${paddingT + innerH} L ${points[0].x} ${paddingT + innerH} Z`;

                  // Grid Lines
                  const gridCount = 4;
                  const grids = Array.from({ length: gridCount + 1 }).map((_, i) => {
                    const y = paddingT + (i / gridCount) * innerH;
                    const val = yMax - (i / gridCount) * yMax;
                    return { y, val };
                  });

                  return (
                    <div className="relative w-full h-full">
                      <svg className="w-full h-48 sm:h-64" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="xMidYMid meet">
                        <defs>
                          <linearGradient id="premiumGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#815cf0', stopOpacity: 0.3 }} />
                            <stop offset="100%" style={{ stopColor: '#815cf0', stopOpacity: 0 }} />
                          </linearGradient>
                          <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                              <feMergeNode in="coloredBlur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Grid Lines & Y Labels */}
                        {grids.map((grid, i) => (
                          <React.Fragment key={i}>
                            <line 
                              x1={paddingL} y1={grid.y} x2={chartW - paddingR} y2={grid.y} 
                              stroke="currentColor" className="text-slate-200 dark:text-white/5" 
                              strokeWidth="0.5" 
                            />
                            <text 
                              x={paddingL - 10} y={grid.y} 
                              className="text-[8px] font-bold fill-slate-400 text-right" 
                              textAnchor="end" alignmentBaseline="middle"
                            >
                              {grid.val >= 1000000 
                                ? `Rp ${(grid.val / 1000000).toFixed(1)}jt` 
                                : `Rp ${(grid.val / 1000).toLocaleString('id-ID')}rb`}
                            </text>
                          </React.Fragment>
                        ))}

                        {/* X Axis Labels (selective) */}
                        {points.map((p, i) => {
                          if (!p.date || p.date === '') return null;
                          
                          // Format label based on period
                          let label = p.date;
                          if (reportPeriod === 'weekly') {
                            const d = new Date(p.date);
                            label = d.toLocaleDateString('id-ID', { weekday: 'short' });
                          } else if (reportPeriod === 'monthly') {
                            label = p.date.split('-')[2]; // Just the day number
                          } else if (reportPeriod === 'daily') {
                            // Already hourly from service (e.g. "14:00")
                            label = p.date;
                          }

                          // Show only specific labels if too many points
                          const skip = data.length > 20 ? i % 5 !== 0 : data.length > 10 ? i % 2 !== 0 : false;
                          if (skip && i !== points.length - 1 && i !== 0) return null;
                          
                          return (
                            <text 
                              key={i} x={p.x} y={chartH - 5} 
                              className="text-[8px] font-bold fill-slate-400" 
                              textAnchor="middle"
                            >
                              {label}
                            </text>
                          );
                        })}

                        {/* Chart Path */}
                        <path d={areaD} fill="url(#premiumGradient)" />
                        <path d={lineD} fill="none" stroke="#815cf0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Data Points */}
                        {points.map((p, i) => {
                          // Hide points with empty or null date (simulated background points for single-day curve)
                          if (!p.date || p.date === '') return null;

                          return (
                            <g key={`${p.date}-${i}`} className="cursor-pointer group/point">
                              <circle 
                                cx={p.x} cy={p.y} r="3.5" 
                                fill="#815cf0" stroke="#fff" strokeWidth="2" 
                                filter="url(#glow)"
                                className="transition-all duration-300 group-hover/point:r-5 group-hover/point:stroke-primary"
                              />
                              {/* Hover area */}
                              <circle 
                                cx={p.x} cy={p.y} r="15" 
                                fill="transparent" 
                                className="peer"
                              />
                              {/* Improved SVG Tooltip with dynamic positioning */}
                              <foreignObject 
                                x={p.x > chartW - 80 ? p.x - 110 : p.x < 80 ? p.x + 10 : p.x - 50} 
                                y={p.y - 55} 
                                width="100" 
                                height="50" 
                                className="hidden group-hover/point:block pointer-events-none"
                              >
                                <div className="bg-black/90 backdrop-blur-xl rounded-xl p-2 border border-white/20 text-center shadow-2xl">
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                                    {new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                  </p>
                                  <p className="text-[11px] text-white font-black whitespace-nowrap">Rp{p.amount.toLocaleString('id-ID')}</p>
                                </div>
                              </foreignObject>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            ) : (
             <svg className="absolute inset-x-0 bottom-0 h-48 w-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                <defs>
                 <linearGradient id="chartGradientEmpty" x1="0%" x2="0%" y1="0%" y2="100%">
                   <stop offset="0%" style={{ stopColor: 'rgba(148, 163, 184, 0.2)', stopOpacity: 1 }}></stop>
                   <stop offset="100%" style={{ stopColor: 'rgba(148, 163, 184, 0)', stopOpacity: 1 }}></stop>
                 </linearGradient>
                </defs>
                <path d="M0 100 L0 80 L400 80 L400 100 Z" fill="url(#chartGradientEmpty)"></path>
                <path d="M0 80 L400 80" fill="none" stroke="rgba(148,163,184,0.3)" strokeLinecap="round" strokeDasharray="5,5" strokeWidth="3"></path>
              </svg>
            )}
            <div className="flex justify-between items-end px-2 text-[10px] text-slate-500 font-bold border-t border-white/5 pt-4 z-10">
              <span>Awal Periode</span>
              <span className="text-center">{summary?.dailyExpenses?.length ? `${summary.dailyExpenses.length} Titik Data` : 'Belum Ada Transaksi'}</span>
              <span>Akhir Periode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportSection;
