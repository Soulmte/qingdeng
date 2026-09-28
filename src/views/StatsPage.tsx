import { useMemo, useState } from "react";
import { Card, Chip, Spinner } from "@heroui/react";
import {
  Bar,
  BarChart,
  BarXAxis,
  ChartTooltip,
  Grid,
  Legend,
  LegendItem,
  LegendLabel,
  LegendMarker,
  LegendValue,
  Line,
  LineChart,
  PieCenter,
  PieChart,
  PieSlice,
  XAxis,
  YAxis,
} from "@/components/charts";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useSessions } from "@/hooks/useSessions";
import { PHASE_LABELS } from "@/lib/presets";
import { buildDailySeries, buildTemplateBreakdown, summarizeSessions } from "@/lib/stats";
import { formatClock, formatRecordTime } from "@/lib/time";

const RANGE_OPTIONS = [
  { value: "7", label: "近 7 天" },
  { value: "14", label: "近 14 天" },
  { value: "30", label: "近 30 天" },
];

/** Y 轴数值要占一条左边距，其余边距沿用图表默认值 */
const CHART_MARGIN = { left: 52 };

function StatTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <Card.Root variant="secondary">
      <Card.Content className="flex flex-col gap-1">
        <span className="text-xs text-muted">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="clock-digits text-3xl font-semibold text-foreground">{value}</span>
          <span className="text-xs text-muted">{unit}</span>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

export default function StatsPage() {
  const [range, setRange] = useState("14");
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const days = Number(range);
  const { sessions, loading, error } = useSessions(days);

  const daily = useMemo(() => buildDailySeries(sessions, days), [sessions, days]);
  const breakdown = useMemo(() => buildTemplateBreakdown(sessions), [sessions]);
  const summary = useMemo(() => summarizeSessions(sessions), [sessions]);
  const breakdownTotal = breakdown.reduce((sum, item) => sum + item.value, 0);
  const recent = sessions.slice(0, 12);

  const legendItems = breakdown.map((item) => ({
    label: item.label,
    value: item.value,
    maxValue: breakdownTotal,
    color: item.color ?? "var(--chart-1)",
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-2 sm:gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">专注统计</h1>
          <p className="text-sm text-muted">所有数据都只存在这台设备上，只统计专注阶段</p>
        </div>
        <SegmentedControl value={range} onChange={setRange} options={RANGE_OPTIONS} />
      </header>

      {error ? (
        <Card.Root variant="secondary">
          <Card.Content className="text-sm text-danger">读取记录失败：{error}</Card.Content>
        </Card.Root>
      ) : null}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile label="今日专注" value={summary.todayMinutes} unit="分钟" />
        <StatTile label={`近 ${days} 天累计`} value={summary.rangeMinutes} unit="分钟" />
        <StatTile label="完成专注" value={summary.completedRounds} unit="段" />
        <StatTile label="平均每段" value={summary.averageMinutes} unit="分钟" />
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-muted">
          <Spinner size="sm" />
          正在读取本地记录
        </div>
      ) : null}

      <Card.Root>
        <Card.Header className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">每日专注时长</span>
          <span className="text-xs text-muted">
            纵轴为分钟数，只统计专注阶段；没有记录的日子会保留为空档
          </span>
        </Card.Header>
        <Card.Content>
          {/* 手机上 3:1 的高度只剩不到 40px，柱子和 Y 轴标签会挤成一团，给个最小高度 */}
          <BarChart
            data={daily}
            xDataKey="label"
            aspectRatio="3 / 1"
            barGap={0.35}
            margin={CHART_MARGIN}
            className="min-h-[200px] md:min-h-0"
          >
            <Grid horizontal />
            <Bar dataKey="minutes" fill="var(--chart-1)" lineCap="round" />
            <YAxis numTicks={4} orientation="left" />
            <BarXAxis maxLabels={8} />
            <ChartTooltip />
          </BarChart>
        </Card.Content>
      </Card.Root>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card.Root>
          <Card.Header className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-foreground">每日完成段数</span>
            <span className="text-xs text-muted">纵轴为个数，完整跑完一轮专注才计入</span>
          </Card.Header>
          <Card.Content>
            <LineChart data={daily} xDataKey="date" aspectRatio="3 / 2" margin={CHART_MARGIN}>
              <Grid horizontal />
              <Line dataKey="rounds" stroke="var(--chart-2)" strokeWidth={2.5} showMarkers />
              <YAxis numTicks={4} orientation="left" />
              <XAxis />
              <ChartTooltip />
            </LineChart>
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-foreground">模板时长占比</span>
            <span className="text-xs text-muted">按专注分钟数统计，取前五名</span>
          </Card.Header>
          <Card.Content className="flex flex-row flex-wrap items-center justify-center gap-8">
            {breakdown.length === 0 ? (
              <p className="py-10 text-sm text-muted">这段时间还没有专注记录</p>
            ) : (
              <>
                <PieChart
                  data={breakdown}
                  size={230}
                  innerRadius={74}
                  padAngle={0.02}
                  cornerRadius={8}
                  hoveredIndex={hoveredSlice}
                  onHoverChange={setHoveredSlice}
                >
                  {breakdown.map((item, index) => (
                    <PieSlice key={item.label} index={index} hoverEffect="translate" />
                  ))}
                  <PieCenter defaultLabel="专注分钟" />
                </PieChart>

                <Legend
                  items={legendItems}
                  hoveredIndex={hoveredSlice}
                  onHoverChange={setHoveredSlice}
                  title={`合计 ${breakdownTotal} 分钟`}
                  className="min-w-[240px] flex-1"
                >
                  <LegendItem>
                    <LegendMarker />
                    <LegendLabel />
                    <LegendValue showPercentage formatValue={(value) => `${value} 分钟`} />
                  </LegendItem>
                </Legend>
              </>
            )}
          </Card.Content>
        </Card.Root>
      </div>

      <Card.Root>
        <Card.Header className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">最近记录</span>
          <span className="text-xs text-muted">只列出最近 12 条；更早的记录照样计入上面的统计</span>
        </Card.Header>
        <Card.Content>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">还没有计时记录，回到计时页开始第一段专注吧。</p>
          ) : (
            <div className="flex flex-col gap-2.5 md:hidden">
              {recent.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col gap-1.5 rounded-field border border-foreground/10 bg-surface p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="clock-digits text-xs text-muted">
                      {formatRecordTime(record.endedAt)}
                    </span>
                    <Chip size="sm" color={record.completed === 1 ? "success" : "default"}>
                      {record.completed === 1 ? "已完成" : "已中断"}
                    </Chip>
                  </div>
                  <span className="truncate text-sm text-foreground">
                    {record.task || "未关联任务"}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="truncate">{record.presetName}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{PHASE_LABELS[record.phase]}</span>
                    <span aria-hidden>·</span>
                    <span className="clock-digits shrink-0 text-foreground">
                      {formatClock(record.actualSeconds * 1000)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 宽屏用表格看列对齐，手机换成上面那种卡片，六个列挤不下 */}
          {recent.length > 0 ? (
            <div className="hidden md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-2 font-medium">结束时间</th>
                    <th className="pb-2 font-medium">任务</th>
                    <th className="pb-2 font-medium">模板</th>
                    <th className="pb-2 font-medium">阶段</th>
                    <th className="pb-2 font-medium">时长</th>
                    <th className="pb-2 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((record) => (
                    <tr key={record.id} className="border-t border-foreground/10">
                      <td className="clock-digits py-2 text-muted">
                        {formatRecordTime(record.endedAt)}
                      </td>
                      <td className="max-w-[220px] truncate py-2 text-foreground">
                        {record.task || "未关联任务"}
                      </td>
                      <td className="py-2 text-muted">{record.presetName}</td>
                      <td className="py-2 text-muted">{PHASE_LABELS[record.phase]}</td>
                      <td className="clock-digits py-2 text-foreground">
                        {formatClock(record.actualSeconds * 1000)}
                      </td>
                      <td className="py-2">
                        <Chip size="sm" color={record.completed === 1 ? "success" : "default"}>
                          {record.completed === 1 ? "已完成" : "已中断"}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card.Content>
      </Card.Root>

      {recent.length > 0 ? (
        <p className="text-xs text-muted">
          中断的记录需要持续 30 秒以上才会入库，避免误触影响统计。
        </p>
      ) : null}
    </div>
  );
}
