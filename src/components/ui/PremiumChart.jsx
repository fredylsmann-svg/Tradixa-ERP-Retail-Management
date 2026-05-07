import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';

const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
        <p className="text-xs font-bold text-slate-400 uppercase mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <p className="text-sm font-bold text-slate-800">
              {valuePrefix}{entry.value.toLocaleString('id-ID')}{valueSuffix} {entry.name && entry.name !== 'value' ? entry.name : ''}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const PremiumBarChart = ({ 
  data, 
  dataKey, 
  color = "#3b82f6", 
  height = 250, 
  valuePrefix = '', 
  valueSuffix = '',
  layout = 'horizontal',
  barSize = 40
}) => {
  const gradientId = `gradient-${dataKey}`;
  const isVertical = layout === 'vertical';
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart 
        data={data} 
        layout={layout}
        margin={{ 
          top: 10, 
          right: 30, 
          left: isVertical ? 60 : -20, 
          bottom: isVertical ? 10 : 20 
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2={isVertical ? "1" : "0"} y2={isVertical ? "0" : "1"}>
            <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="100%" stopColor={color} stopOpacity={0.2}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={isVertical} horizontal={!isVertical} stroke="#f1f5f9" />
        <XAxis 
          type={isVertical ? "number" : "category"}
          dataKey={isVertical ? undefined : "name"} 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          dy={isVertical ? 0 : 10}
        />
        <YAxis 
          type={isVertical ? "category" : "number"}
          dataKey={isVertical ? "name" : undefined}
          axisLine={false}
          tickLine={false}
          tick={{ fill: isVertical ? '#475569' : '#94a3b8', fontSize: 10, fontWeight: isVertical ? 600 : 400 }}
          width={isVertical ? 180 : 60}
          tickFormatter={(v) => !isVertical ? (v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v) : v}
        />
        <Tooltip 
          cursor={{ fill: '#f8fafc' }}
          content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />}
        />
        <Bar 
          dataKey={dataKey} 
          fill={`url(#${gradientId})`} 
          radius={isVertical ? [0, 6, 6, 0] : [6, 6, 0, 0]} 
          barSize={barSize}
          stroke={color}
          strokeWidth={1}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const PremiumAreaChart = ({ data, dataKey, color = "#3b82f6", height = 250, valuePrefix = '', valueSuffix = '' }) => {
  const gradientId = `area-gradient-${dataKey}`;
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
        />
        <Tooltip 
          content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />}
        />
        <Area 
          type="monotone" 
          dataKey={dataKey} 
          stroke={color} 
          strokeWidth={3} 
          fillOpacity={1} 
          fill={`url(#${gradientId})`} 
          dot={{ r: 4, fill: '#fff', stroke: color, strokeWidth: 2 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
