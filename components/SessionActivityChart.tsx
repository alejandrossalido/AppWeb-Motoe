import React, { useState, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    TooltipProps,
} from 'recharts';
import { supabase } from '../services/supabase';

type TimeFrame = '6H' | '24H' | '7D' | '1Y';

const SessionActivityChart: React.FC = () => {
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('7D');
    const [data, setData] = useState<any[]>([]);
    const [trendColor, setTrendColor] = useState('#00cc88'); // Default Green

    const fetchData = async () => {
        const now = new Date();
        const startTime = new Date();

        // Timeframe Logic
        if (timeFrame === '6H') startTime.setHours(now.getHours() - 6);
        else if (timeFrame === '24H') startTime.setHours(now.getHours() - 24);
        else if (timeFrame === '7D') startTime.setDate(now.getDate() - 7);
        else if (timeFrame === '1Y') startTime.setFullYear(now.getFullYear() - 1);

        // HARD CONSTRAINT: Start from Feb 16, 2026 (Launch Date)
        const launchDate = new Date('2026-02-16T00:00:00');
        const effectiveStart = startTime < launchDate ? launchDate : startTime;

        const { data: sessions, error } = await supabase
            .from('work_sessions')
            .select('created_at, duration_minutes')
            .gte('created_at', effectiveStart.toISOString())
            .order('created_at', { ascending: true });

        if (error || !sessions) {
            console.error('Error fetching sessions:', error);
            setData([]); // Empty state on error
            return;
        }

        // Process Data
        const processedData = processSessions(sessions, timeFrame, effectiveStart, now);
        setData(processedData);

        // Determine Trend Color
        if (processedData.length > 1) {
            const first = processedData[0].value;
            const last = processedData[processedData.length - 1].value;
            setTrendColor(last >= first ? '#00cc88' : '#ef4444');
        } else {
            setTrendColor('#00cc88'); // Default to green if not enough data
        }
    };

    const processSessions = (sessions: any[], frame: TimeFrame, start: Date, end: Date) => {
        // Create buckets
        const buckets: { [key: string]: number } = {};
        let intervalMs = 0;
        let formatKey = (d: Date) => '';

        if (frame === '6H') {
            intervalMs = 1000 * 60 * 15; // 15 mins
            formatKey = (d) => {
                const s = new Date(Math.floor(d.getTime() / intervalMs) * intervalMs);
                return s.toISOString(); // Use ISO as key for sorting
            };
        } else if (frame === '24H') {
            intervalMs = 1000 * 60 * 60; // 1 Hour
            formatKey = (d) => {
                d.setMinutes(0, 0, 0);
                return d.toISOString();
            };
        } else if (frame === '7D') {
            intervalMs = 1000 * 60 * 60 * 24; // 1 Day
            formatKey = (d) => {
                d.setHours(0, 0, 0, 0);
                return d.toISOString();
            };
        } else if (frame === '1Y') {
            intervalMs = 1000 * 60 * 60 * 24 * 30; // ~1 Month
            formatKey = (d) => {
                d.setDate(1); d.setHours(0, 0, 0, 0);
                return d.toISOString();
            };
        }

        // Initialize Buckets (Fill with 0s)
        // Ensure we handle empty range if start > end (e.g. fresh launch)
        if (start <= end) {
            for (let t = start.getTime(); t <= end.getTime(); t += intervalMs) {
                buckets[formatKey(new Date(t))] = 0;
            }
        }


        // Fill Data
        sessions.forEach(s => {
            const key = formatKey(new Date(s.created_at));
            if (buckets[key] !== undefined) {
                buckets[key] += 1; // Count sessions
            }
        });

        // Convert to Array
        return Object.entries(buckets).sort().map(([iso, count]) => {
            const date = new Date(iso);
            let label = '';
            if (frame === '6H' || frame === '24H') label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            else if (frame === '7D') label = date.toLocaleDateString([], { weekday: 'short' });
            else label = date.toLocaleDateString([], { month: 'short' });

            return {
                timestamp: iso,
                label,
                value: count
            };
        });
    };

    useEffect(() => {
        fetchData();
        // Poll for updates every minute to keep "LIVE" feel
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [timeFrame]);

    const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-neutral-900/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
                    <p className="text-gray-400 text-xs mb-1">{payload[0].payload.label}</p>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full animate-pulse`} style={{ backgroundColor: trendColor }} />
                        <p className={`font-bold text-lg`} style={{ color: trendColor }}>
                            {payload[0].value} <span className="text-xs font-normal text-gray-500">sessions</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header & Controls */}
            <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-baseline gap-3">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">TEAM MOMENTUM</h3>
                    <span className="text-xs font-mono flex items-center gap-1" style={{ color: trendColor }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: trendColor }} />
                        LIVE
                    </span>
                </div>

                <div className="flex bg-neutral-900/50 rounded-lg p-1 border border-white/5">
                    {(['6H', '24H', '7D', '1Y'] as TimeFrame[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeFrame(tf)}
                            className={`
                px-3 py-1 text-[10px] font-bold rounded-md transition-all
                ${timeFrame === tf
                                    ? `bg-[${trendColor}]/10 shadow-[0_0_10px_rgba(0,0,0,0.2)]`
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
              `}
                            style={timeFrame === tf ? { color: trendColor, backgroundColor: `${trendColor}1A` } : {}}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={trendColor} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }}
                            dy={10}
                            minTickGap={30}
                        />
                        <YAxis hide domain={['dataMin', 'dataMax + 1']} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: trendColor, strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.5 }} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={trendColor}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorGradient)"
                            animationDuration={800}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SessionActivityChart;
