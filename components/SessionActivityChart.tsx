import React, { useState, useEffect, useMemo } from 'react';
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

type TimeFrame = '6H' | '24H' | '7D' | '1Y';

const SessionActivityChart: React.FC = () => {
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('7D');
    const [data, setData] = useState<any[]>([]);

    // Mock Data Generators
    const generateData = (frame: TimeFrame) => {
        const now = new Date();
        let points = 20;
        let formatLabel = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let interval = 1000 * 60 * 15; // 15 mins

        if (frame === '6H') {
            points = 24; // Every 15 mins for 6 hours
            interval = 1000 * 60 * 15;
        } else if (frame === '24H') {
            points = 24; // Hourly
            interval = 1000 * 60 * 60;
            formatLabel = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (frame === '7D') {
            points = 14; // Every 12 hours approx, or daily * 2
            interval = 1000 * 60 * 60 * 12;
            formatLabel = (d: Date) => d.toLocaleDateString([], { weekday: 'short' });
        } else if (frame === '1Y') {
            points = 12; // Monthly
            interval = 1000 * 60 * 60 * 24 * 30;
            formatLabel = (d: Date) => d.toLocaleDateString([], { month: 'short' });
        }

        const newData = [];
        let baseValue = 10;

        // Generate backwards so current time is last
        for (let i = points - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - i * interval);
            // Random walk smoothing
            const change = (Math.random() - 0.5) * 5;
            baseValue = Math.max(2, baseValue + change);

            newData.push({
                timestamp: time.toISOString(),
                label: formatLabel(time),
                value: Math.round(baseValue),
            });
        }
        return newData;
    };

    useEffect(() => {
        setData(generateData(timeFrame));
    }, [timeFrame]);

    const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-neutral-900/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
                    <p className="text-gray-400 text-xs mb-1">{payload[0].payload.label}</p>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00cc88] animate-pulse" />
                        <p className="text-[#00cc88] font-bold text-lg">
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
                    <h3 className="text-lg font-bold text-white">Session Market</h3>
                    <span className="text-xs font-mono text-[#00cc88] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00cc88] animate-pulse" />
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
                                    ? 'bg-[#00cc88]/10 text-[#00cc88] shadow-[0_0_10px_rgba(0,204,136,0.2)]'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
              `}
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
                                <stop offset="5%" stopColor="#00cc88" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#00cc88" stopOpacity={0} />
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
                        <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#00cc88', strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.5 }} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#00cc88"
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
