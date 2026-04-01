'use client'

import dynamic from 'next/dynamic'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { nowWib } from '@/lib/wib'

dayjs.extend(utc)

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface HeatmapRecord {
  date: string
  hour: number
  count: number
}

interface Props {
  records: HeatmapRecord[]
  days: number
}

// 8 buckets of 3 hours each, starting at midnight
const BUCKETS = 8
const BUCKET_SIZE = 3 // hours per bucket

function bucketLabel(b: number): string {
  const h = b * BUCKET_SIZE
  const format = (n: number) => {
    if (n === 0) return '12am'
    if (n < 12) return `${n}am`
    if (n === 12) return '12pm'
    return `${n - 12}pm`
  }
  return format(h)
}

export default function ActivityChart({ records, days }: Props) {
  // Build the ordered date list (oldest → newest) anchored to WIB "today"
  const todayWib = nowWib()
  const dateLabels: string[] = Array.from({ length: days }, (_, i) =>
    todayWib.subtract(days - 1 - i, 'day').format('YYYY-MM-DD'),
  )

  // Fast lookup: "YYYY-MM-DD:HH" → count (per-hour from API)
  const lookup = new Map<string, number>()
  for (const r of records) {
    lookup.set(`${r.date}:${r.hour}`, r.count)
  }

  // 8 series (3-hour buckets), bucket 0 at the top
  const series = Array.from({ length: BUCKETS }, (_, bucket) => ({
    name: bucketLabel(bucket),
    data: dateLabels.map((date) => {
      // Sum all hours that fall in this bucket
      let total = 0
      for (let h = bucket * BUCKET_SIZE; h < (bucket + 1) * BUCKET_SIZE; h++) {
        total += lookup.get(`${date}:${h}`) ?? 0
      }
      return { x: date, y: total }
    }),
  }))

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'heatmap',
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: false },
    },
    dataLabels: { enabled: false },
    plotOptions: {
      heatmap: {
        radius: 2,
        enableShades: false,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: '#ebedf0', name: '0' },
            { from: 1, to: 1, color: '#9be9a8', name: '1' },
            { from: 2, to: 3, color: '#40c463', name: '2–3' },
            { from: 4, to: 6, color: '#30a14e', name: '4–6' },
            { from: 7, to: 999, color: '#216e39', name: '7+' },
          ],
        },
      },
    },
    xaxis: {
      type: 'category',
      labels: {
        rotate: 0,
        style: { fontSize: '10px', colors: '#6b7280' },
        // Show a label only on Mondays to avoid crowding
        formatter: (val: string) => {
          // val is a WIB date string "YYYY-MM-DD" — parse as UTC to avoid local offset shifting the day
          const d = dayjs.utc(val)
          return d.day() === 1 ? d.format('MMM D') : ''
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      reversed: false,
      labels: { style: { fontSize: '11px', colors: '#6b7280' } },
    },
    legend: { show: false },
    grid: { padding: { top: 0, right: 8, bottom: 0, left: 0 } },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex }: { seriesIndex: number; dataPointIndex: number }) => {
        const bucket = seriesIndex
        const date = dateLabels[dataPointIndex] ?? ''
        const startH = bucket * BUCKET_SIZE
        const endH = startH + BUCKET_SIZE
        let count = 0
        for (let h = startH; h < endH; h++) {
          count += lookup.get(`${date}:${h}`) ?? 0
        }
        const endLabel = endH === 24 ? '12am' : bucketLabel(endH / BUCKET_SIZE)
        return `<div style="padding:6px 10px;font-size:12px"><b>${date}</b><br/>${bucketLabel(bucket)}–${endLabel}<br/>${count} issue${count !== 1 ? 's' : ''} resolved</div>`
      },
    },
  }

  return (
    <Chart
      type="heatmap"
      options={options}
      series={series}
      height={240}
      width="100%"
    />
  )
}
