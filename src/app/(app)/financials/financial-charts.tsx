"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ACCENT = "#00a8c6";
const TEXT_DIM = "#8b949e";
const BORDER = "#2d333b";
const PANEL_2 = "#1c2330";

// Category accent palette from CLAUDE.md §8 — keeps the chart consistent
// with the dark UniFi look the rest of the app uses.
const CATEGORY_COLORS: Record<string, string> = {
  SERVER: "#3fb950",
  SWITCH: "#3b82f6",
  GATEWAY: "#c678dd",
  FIREWALL: "#c678dd",
  UPS: "#d9a441",
  PDU: "#7c8794",
  KVM: "#e0823d",
  ACCESS_POINT: "#00a8c6",
  NUC: "#3fb950",
  SBC: "#3fb950",
  SHELF: "#7c8794",
  DRAWER: "#7c8794",
  BLANK_PANEL: "#7c8794",
  OTHER: "#7c8794",
};

function fmtMoney(v: number): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// Recharts default tooltip is bright-white. Override with a dark version
// that matches the panel tokens.
function DarkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { label: string } }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: PANEL_2,
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        padding: "6px 10px",
        color: "white",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ color: ACCENT, fontWeight: 700 }}>
        {fmtMoney(payload[0].value)}
      </div>
    </div>
  );
}

export function CategoryBarChart({
  data,
}: {
  data: { category: string; amount: number }[];
}) {
  const rows = data.map((d) => ({
    label: d.category.replace(/_/g, " "),
    raw: d.category,
    amount: d.amount,
  }));
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: TEXT_DIM, fontSize: 10 }}
            axisLine={{ stroke: BORDER }}
            tickLine={{ stroke: BORDER }}
          />
          <YAxis
            tick={{ fill: TEXT_DIM, fontSize: 10 }}
            axisLine={{ stroke: BORDER }}
            tickLine={{ stroke: BORDER }}
            tickFormatter={(v) => fmtMoney(v)}
            width={64}
          />
          <Tooltip content={<DarkTooltip />} cursor={{ fill: "transparent" }} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.raw} fill={CATEGORY_COLORS[r.raw] ?? ACCENT} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourceBarChart({
  data,
}: {
  data: { source: string; amount: number }[];
}) {
  const rows = data.slice(0, 10).map((d) => ({
    label: d.source,
    amount: d.amount,
  }));
  return (
    <div style={{ width: "100%", height: Math.max(200, rows.length * 28 + 24) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis
            type="number"
            tick={{ fill: TEXT_DIM, fontSize: 10 }}
            axisLine={{ stroke: BORDER }}
            tickLine={{ stroke: BORDER }}
            tickFormatter={(v) => fmtMoney(v)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: TEXT_DIM, fontSize: 11 }}
            axisLine={{ stroke: BORDER }}
            tickLine={{ stroke: BORDER }}
            width={120}
          />
          <Tooltip content={<DarkTooltip />} cursor={{ fill: "transparent" }} />
          <Bar dataKey="amount" fill={ACCENT} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpentVsRecoveredChart({
  spent,
  recovered,
}: {
  spent: number;
  recovered: number;
}) {
  const rows = [
    { label: "Spent", amount: spent, fill: "#c678dd" },
    { label: "Recovered", amount: recovered, fill: "#3fb950" },
    { label: "Net outlay", amount: spent - recovered, fill: ACCENT },
  ];
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: TEXT_DIM, fontSize: 11 }}
            axisLine={{ stroke: BORDER }}
            tickLine={{ stroke: BORDER }}
          />
          <YAxis
            tick={{ fill: TEXT_DIM, fontSize: 10 }}
            axisLine={{ stroke: BORDER }}
            tickLine={{ stroke: BORDER }}
            tickFormatter={(v) => fmtMoney(v)}
            width={64}
          />
          <Tooltip content={<DarkTooltip />} cursor={{ fill: "transparent" }} />
          <Legend
            verticalAlign="top"
            height={20}
            wrapperStyle={{ fontSize: 11, color: TEXT_DIM }}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.label} fill={r.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
