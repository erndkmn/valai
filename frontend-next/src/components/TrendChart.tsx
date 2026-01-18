'use client';

import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { TrendData } from '@/lib/api';

Chart.register(...registerables);

interface TrendChartProps {
  trendData: TrendData | null;
  isEmpty: boolean;
}

export default function TrendChart({ trendData, isEmpty }: TrendChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const redHighlight = '#ff5052';
    const redHighlightLight = 'rgba(255, 80, 82, 0.1)';
    const successColor = '#10B981';
    const successColorLight = 'rgba(16, 185, 129, 0.1)';
    const textSecondary = '#B8B8B8';
    const borderColor = '#1e2d3d';
    const mutedColor = '#666666';

    if (isEmpty || !trendData || trendData.dates.length === 0) {
      // Empty state chart
      chartInstanceRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['', '', '', '', ''],
          datasets: [
            {
              label: 'Stability Score (0-100)',
              data: [],
              borderColor: mutedColor,
              borderDash: [5, 5],
              tension: 0.4,
              yAxisID: 'y',
              borderWidth: 1
            },
            {
              label: 'HS Rate (%)',
              data: [],
              borderColor: mutedColor,
              borderDash: [5, 5],
              tension: 0.4,
              yAxisID: 'y1',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: mutedColor }
            },
            tooltip: { enabled: false }
          },
          scales: {
            x: {
              ticks: { color: mutedColor },
              grid: { color: borderColor },
              border: { color: borderColor }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              min: 0,
              max: 100,
              title: {
                display: true,
                text: 'Stability Score (0-100)',
                color: mutedColor
              },
              ticks: { color: mutedColor },
              grid: { color: borderColor },
              border: { color: borderColor }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'HS Rate (%)',
                color: mutedColor
              },
              ticks: { color: mutedColor },
              grid: { drawOnChartArea: false },
              border: { color: borderColor }
            }
          }
        }
      });
    } else {
      // Normal chart with data
      const labels = trendData.dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString();
      });

      chartInstanceRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Stability Score (0-100)',
              data: trendData.stability_scores,
              borderColor: redHighlight,
              backgroundColor: redHighlightLight,
              tension: 0.4,
              yAxisID: 'y',
              borderWidth: 2
            },
            {
              label: 'HS Rate (%)',
              data: trendData.hs_rates,
              borderColor: successColor,
              backgroundColor: successColorLight,
              tension: 0.4,
              yAxisID: 'y1',
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: textSecondary }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: '#15202e',
              borderColor: borderColor,
              borderWidth: 1,
              titleColor: '#FFFFFF',
              bodyColor: textSecondary,
              padding: 12
            }
          },
          scales: {
            x: {
              ticks: { color: textSecondary },
              grid: { color: borderColor },
              border: { color: borderColor }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              min: 0,
              max: 100,
              title: {
                display: true,
                text: 'Stability Score (0-100)',
                color: redHighlight
              },
              ticks: { color: textSecondary },
              grid: { color: borderColor },
              border: { color: borderColor }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'HS Rate (%)',
                color: successColor
              },
              ticks: { color: textSecondary },
              grid: { drawOnChartArea: false },
              border: { color: borderColor }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [trendData, isEmpty]);

  return (
    <div className="h-[300px] mt-6">
      <canvas ref={chartRef} />
    </div>
  );
}
