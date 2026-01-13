/**
 * Performance visualization charts for assessment display
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card } from '@/components/ui/card';

interface PerformanceChartsProps {
  dateRangeStart: Date;
  dateRangeEnd: Date;
  technicalPr: string;
  overallPr: string;
  curtailmentMwh: string;
  totalEnergyMwh?: string;
}

export function PerformanceCharts({
  dateRangeStart,
  dateRangeEnd,
  technicalPr,
  overallPr,
  curtailmentMwh,
  totalEnergyMwh = '2999',
}: PerformanceChartsProps) {
  // Generate sample daily data for the date range
  const dailyData = useMemo(() => {
    const days: any[] = [];
    const start = new Date(dateRangeStart);
    const end = new Date(dateRangeEnd);
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const techPr = Number(technicalPr);
    const overPr = Number(overallPr);
    const curtailment = Number(curtailmentMwh);
    const totalEnergy = Number(totalEnergyMwh);
    
    for (let i = 0; i <= dayCount; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      // Generate realistic daily patterns
      const dayVariation = 0.9 + Math.random() * 0.2; // ±10% variation
      const dailyEnergy = (totalEnergy / dayCount) * dayVariation;
      const dailyCurtailment = (curtailment / dayCount) * (0.8 + Math.random() * 0.4);
      
      days.push({
        date: date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }),
        technicalPR: Math.round(techPr * dayVariation * 10) / 10,
        overallPR: Math.round(overPr * dayVariation * 10) / 10,
        generation: Math.round(dailyEnergy * 10) / 10,
        curtailment: Math.round(dailyCurtailment * 10) / 10,
        potential: Math.round((dailyEnergy + dailyCurtailment) * 10) / 10,
      });
    }
    
    return days;
  }, [dateRangeStart, dateRangeEnd, technicalPr, overallPr, curtailmentMwh, totalEnergyMwh]);

  // Hourly generation profile (sample data for one day)
  const hourlyData = useMemo(() => {
    const hours: any[] = [];
    for (let i = 0; i < 24; i++) {
      // Solar generation curve (bell-shaped)
      const solarFactor = i >= 6 && i <= 18
        ? Math.sin(((i - 6) / 12) * Math.PI)
        : 0;
      
      const generation = Math.round(100 * solarFactor * (0.9 + Math.random() * 0.2) * 10) / 10;
      const curtailed = i >= 10 && i <= 14 ? Math.round(generation * 0.1 * 10) / 10 : 0;
      
      hours.push({
        hour: `${i.toString().padStart(2, '0')}:00`,
        generation: generation - curtailed,
        curtailment: curtailed,
        potential: generation,
      });
    }
    return hours;
  }, []);

  return (
    <div className="space-y-6">
      {/* Daily Generation Profile */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Generation Profile</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              label={{ value: 'Energy (MWh)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="potential"
              stackId="1"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted))"
              name="Potential"
            />
            <Area
              type="monotone"
              dataKey="generation"
              stackId="2"
              stroke="hsl(217 91% 60%)"
              fill="hsl(217 91% 60%)"
              name="Actual Generation"
            />
            <Area
              type="monotone"
              dataKey="curtailment"
              stackId="2"
              stroke="hsl(var(--destructive))"
              fill="hsl(var(--destructive))"
              name="Curtailment"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Performance Ratio Trend */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Ratio Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              domain={[0, 100]}
              label={{ value: 'PR (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="technicalPR"
              stroke="hsl(142 76% 36%)"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Technical PR"
            />
            <Line
              type="monotone"
              dataKey="overallPR"
              stroke="hsl(217 91% 60%)"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Overall PR"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Hourly Generation Pattern */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Typical Daily Generation Pattern</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="hour" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              label={{ value: 'Power (MW)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Bar 
              dataKey="generation" 
              stackId="a" 
              fill="hsl(217 91% 60%)" 
              name="Generation"
            />
            <Bar 
              dataKey="curtailment" 
              stackId="a" 
              fill="hsl(var(--destructive))" 
              name="Curtailment"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
