import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  SVGRenderer,
]);
import {
  Box,
  LinearProgress,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import type { BiActivityPoint } from "../../types/bi";

export type BiBarDatum = {
  label: string;
  value: number;
};

type MetricBarsProps = {
  data: BiBarDatum[];
  suffix?: string;
  scaleMax?: number;
  emptyLabel?: string;
};

export function MetricBars({
  data,
  suffix = "",
  scaleMax,
  emptyLabel = "Aucune donnee disponible.",
}: MetricBarsProps) {
  if (!data.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  const maxValue =
    scaleMax ??
    Math.max(
      1,
      ...data.map((item) => item.value),
    );

  return (
    <Stack spacing={1.75}>
      {data.map((item) => {
        const visualValue =
          maxValue > 0
            ? Math.min(
                100,
                Math.max(
                  0,
                  (item.value / maxValue) * 100,
                ),
              )
            : 0;

        return (
          <Box key={item.label}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {item.label}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                {`${item.value}${suffix}`}
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={visualValue}
              aria-label={`${item.label}: ${item.value}${suffix}`}
              sx={{
                mt: 0.75,
                height: 9,
                borderRadius: 999,
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

export function DistributionHistogram({
  data,
  ariaLabel,
  emptyLabel = "Aucune donnee disponible.",
}: {
  data: BiBarDatum[];
  ariaLabel: string;
  emptyLabel?: string;
}) {
  const theme = useTheme();
  const chartRef = useRef<HTMLDivElement | null>(null);
  const total = data.reduce(
    (sum, item) => sum + Math.max(0, item.value),
    0,
  );

  useEffect(() => {
    if (!total || !chartRef.current) {
      return;
    }

    const chart = echarts.init(
      chartRef.current,
      undefined,
      { renderer: "svg" },
    );

    chart.setOption({
      animationDuration: 650,
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [];
          const first = items[0] as
            | {
                name?: string;
                value?: number | string;
              }
            | undefined;

          if (!first) {
            return "";
          }

          const count = Number(first.value ?? 0);
          const percentage =
            total > 0
              ? ((count / total) * 100).toFixed(1)
              : "0.0";

          return `${first.name ?? ""}<br/>${count} observation(s) (${percentage} %)`;
        },
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        textStyle: {
          color: theme.palette.text.primary,
        },
      },
      grid: {
        left: 42,
        right: 18,
        top: 22,
        bottom: 46,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: data.map((item) => item.label),
        axisTick: {
          alignWithLabel: true,
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider,
          },
        },
        axisLabel: {
          color: theme.palette.text.secondary,
          interval: 0,
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        minInterval: 1,
        name: "Observations",
        nameTextStyle: {
          color: theme.palette.text.secondary,
        },
        axisLabel: {
          color: theme.palette.text.secondary,
        },
        splitLine: {
          lineStyle: {
            color: theme.palette.divider,
            opacity: 0.55,
          },
        },
      },
      series: [
        {
          name: "Distribution",
          type: "bar",
          data: data.map((item) => item.value),
          barMaxWidth: 52,
          itemStyle: {
            color: theme.palette.primary.main,
            borderRadius: [7, 7, 0, 0],
          },
          label: {
            show: true,
            position: "top",
            color: theme.palette.text.primary,
            fontWeight: 700,
            formatter: "{c}",
          },
          emphasis: {
            focus: "series",
          },
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [
    data,
    theme.palette.background.paper,
    theme.palette.divider,
    theme.palette.primary.main,
    theme.palette.text.primary,
    theme.palette.text.secondary,
    total,
  ]);

  if (!total) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          borderRadius: 2,
          bgcolor: "action.hover",
          p: 0.5,
        }}
      >
        <div
          ref={chartRef}
          role="img"
          aria-label={ariaLabel}
          style={{
            width: "100%",
            height: 280,
            minHeight: 250,
          }}
        />
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textAlign: "right" }}
      >
        {`${total} observation(s) au total`}
      </Typography>
    </Stack>
  );
}
export function CompletionByTrainingChart({
  data,
  emptyLabel = "Aucune formation dans ce perimetre.",
}: {
  data: BiBarDatum[];
  emptyLabel?: string;
}) {
  const theme = useTheme();
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!data.length || !chartRef.current) {
      return;
    }

    const chart = echarts.init(
      chartRef.current,
      undefined,
      { renderer: "svg" },
    );

    chart.setOption({
      animationDuration: 650,
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [];
          const first = items[0] as
            | {
                name?: string;
                value?: number | string;
              }
            | undefined;

          if (!first) {
            return "";
          }

          return `${first.name ?? ""}<br/>Taux de completion : ${
            first.value ?? 0
          } %`;
        },
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        textStyle: {
          color: theme.palette.text.primary,
        },
      },
      grid: {
        left: 12,
        right: 58,
        top: 12,
        bottom: 22,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: {
          color: theme.palette.text.secondary,
          formatter: "{value} %",
        },
        splitLine: {
          lineStyle: {
            color: theme.palette.divider,
            opacity: 0.5,
          },
        },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: data.map((item) => item.label),
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: theme.palette.text.secondary,
          width: 190,
          overflow: "truncate",
          ellipsis: "...",
        },
      },
      series: [
        {
          name: "Completion",
          type: "bar",
          data: data.map((item) => item.value),
          barMaxWidth: 22,
          showBackground: true,
          backgroundStyle: {
            color: theme.palette.action.hover,
            borderRadius: 8,
          },
          itemStyle: {
            color: theme.palette.primary.main,
            borderRadius: [0, 7, 7, 0],
          },
          label: {
            show: true,
            position: "right",
            color: theme.palette.text.primary,
            fontWeight: 700,
            formatter: "{c} %",
          },
          emphasis: {
            focus: "series",
          },
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [
    data,
    theme.palette.action.hover,
    theme.palette.background.paper,
    theme.palette.divider,
    theme.palette.primary.main,
    theme.palette.text.primary,
    theme.palette.text.secondary,
  ]);

  if (!data.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  const chartHeight = Math.max(
    260,
    Math.min(430, 92 + data.length * 42),
  );

  return (
    <Stack spacing={1}>
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          borderRadius: 2,
          bgcolor: "action.hover",
          p: 0.5,
        }}
      >
        <div
          ref={chartRef}
          role="img"
          aria-label="Taux de completion par formation"
          style={{
            width: "100%",
            height: chartHeight,
            minHeight: 260,
          }}
        />
      </Box>

      <Box
        component="ul"
        aria-label="Valeurs detaillees de completion par formation"
        sx={{
          position: "absolute",
          width: 1,
          height: 1,
          p: 0,
          m: -1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {data.map((item) => (
          <li key={item.label}>
            {`${item.label} : ${item.value} %`}
          </li>
        ))}
      </Box>
    </Stack>
  );
}
export function RiskDonut({
  data,
  totalLearners,
  totalEnrollments,
  emptyLabel = "Aucune donnee de risque disponible.",
}: {
  data: BiBarDatum[];
  totalLearners: number;
  totalEnrollments: number;
  emptyLabel?: string;
}) {
  const theme = useTheme();
  const chartRef = useRef<HTMLDivElement | null>(null);

  const totalAnalyses = data.reduce(
    (sum, item) => sum + Math.max(0, item.value),
    0,
  );

  const insufficientAnalyses =
    data.find(
      (item) => item.label === "Donnees insuffisantes",
    )?.value ?? 0;

  const classifiedAnalyses = Math.max(
    0,
    totalAnalyses - insufficientAnalyses,
  );

  useEffect(() => {
    if (!totalAnalyses || !chartRef.current) {
      return;
    }

    const chart = echarts.init(
      chartRef.current,
      undefined,
      { renderer: "svg" },
    );

    const colorByLabel: Record<string, string> = {
      "Risque faible": theme.palette.success.main,
      "Risque moyen": theme.palette.warning.main,
      "Risque eleve": theme.palette.error.main,
      "Donnees insuffisantes": theme.palette.grey[500],
    };

    chart.setOption({
      animationDuration: 650,
      tooltip: {
        trigger: "item",
        formatter:
          "{b}<br/>{c} analyse(s) ({d} %)",
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        textStyle: {
          color: theme.palette.text.primary,
        },
      },
      legend: {
        bottom: 0,
        left: "center",
        type: "scroll",
        textStyle: {
          color: theme.palette.text.secondary,
        },
      },
      series: [
        {
          name: "Analyses de risque",
          type: "pie",
          radius: ["50%", "72%"],
          center: ["50%", "43%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 7,
            borderColor: theme.palette.background.paper,
            borderWidth: 3,
          },
          label: {
            show: false,
          },
          emphasis: {
            scale: true,
            scaleSize: 7,
          },
          data: data.map((item) => ({
            name: item.label,
            value: item.value,
            itemStyle: {
              color:
                colorByLabel[item.label] ??
                theme.palette.primary.main,
            },
          })),
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [
    data,
    theme.palette.background.paper,
    theme.palette.divider,
    theme.palette.error.main,
    theme.palette.grey,
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.text.primary,
    theme.palette.text.secondary,
    theme.palette.warning.main,
    totalAnalyses,
  ]);

  if (!totalAnalyses) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  const summaryItems = [
    {
      label: "Apprenants distincts",
      value: totalLearners,
    },
    {
      label: "Inscriptions",
      value: totalEnrollments,
    },
    {
      label: "Analyses classees",
      value: classifiedAnalyses,
    },
    {
      label: "Donnees insuffisantes",
      value: insufficientAnalyses,
    },
  ];

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          minWidth: 0,
          borderRadius: 2,
          bgcolor: "action.hover",
        }}
      >
        <div
          ref={chartRef}
          role="img"
          aria-label="Diagramme des analyses de risque par apprenant et formation"
          style={{
            width: "100%",
            height: 290,
            minHeight: 260,
          }}
        />

        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: "43%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <Typography
            variant="h4"
            component="div"
            sx={{
              fontWeight: 900,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {totalAnalyses}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
          >
            analyses
          </Typography>
        </Box>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ lineHeight: 1.55 }}
      >
        Une analyse correspond a un couple apprenant-formation.
        Un meme apprenant inscrit a plusieurs formations peut donc
        apparaitre dans plusieurs analyses.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1,
        }}
      >
        {summaryItems.map((item) => (
          <Box
            key={item.label}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              px: 1.5,
              py: 1.25,
              bgcolor: "background.paper",
              minWidth: 0,
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {item.value}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function ActivityTrend({
  points,
}: {
  points: BiActivityPoint[];
}) {
  const theme = useTheme();
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!points.length || !chartRef.current) {
      return;
    }

    const chart = echarts.init(
      chartRef.current,
      undefined,
      { renderer: "svg" },
    );

    chart.setOption({
      animationDuration: 650,
      color: [
        theme.palette.primary.main,
        theme.palette.warning.main,
      ],
      tooltip: {
        trigger: "axis",
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        textStyle: {
          color: theme.palette.text.primary,
        },
        axisPointer: {
          type: "line",
        },
      },
      legend: {
        top: 0,
        textStyle: {
          color: theme.palette.text.secondary,
        },
        data: [
          "Evenements d'apprentissage",
          "Apprenants actifs",
        ],
      },
      grid: {
        left: 48,
        right: 48,
        top: 48,
        bottom: 34,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: points.map((item) => formatShortDate(item.date)),
        axisLine: {
          lineStyle: {
            color: theme.palette.divider,
          },
        },
        axisLabel: {
          color: theme.palette.text.secondary,
          hideOverlap: true,
        },
      },
      yAxis: [
        {
          type: "value",
          name: "Evenements",
          minInterval: 1,
          axisLabel: {
            color: theme.palette.text.secondary,
          },
          nameTextStyle: {
            color: theme.palette.text.secondary,
          },
          splitLine: {
            lineStyle: {
              color: theme.palette.divider,
              opacity: 0.55,
            },
          },
        },
        {
          type: "value",
          name: "Apprenants",
          minInterval: 1,
          axisLabel: {
            color: theme.palette.text.secondary,
          },
          nameTextStyle: {
            color: theme.palette.text.secondary,
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [
        {
          name: "Evenements d'apprentissage",
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          showSymbol: points.length <= 14,
          symbolSize: 7,
          data: points.map((item) => item.totalEvents),
          lineStyle: {
            width: 3,
          },
          areaStyle: {
            opacity: 0.08,
          },
          emphasis: {
            focus: "series",
          },
        },
        {
          name: "Apprenants actifs",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          showSymbol: points.length <= 14,
          symbolSize: 7,
          data: points.map((item) => item.activeLearners),
          lineStyle: {
            width: 3,
            type: "dashed",
          },
          emphasis: {
            focus: "series",
          },
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [
    points,
    theme.palette.background.paper,
    theme.palette.divider,
    theme.palette.primary.main,
    theme.palette.text.primary,
    theme.palette.text.secondary,
    theme.palette.warning.main,
  ]);

  if (!points.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucune activite disponible pour cette periode.
      </Typography>
    );
  }

  const hiddenTableSx = {
    position: "absolute",
    width: 1,
    height: 1,
    p: 0,
    m: -1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
  } as const;

  return (
    <Stack spacing={1}>
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          borderRadius: 2,
          bgcolor: "action.hover",
          p: 0.5,
        }}
      >
        <div
          ref={chartRef}
          role="img"
          aria-label="Tendance interactive des evenements d'apprentissage et des apprenants actifs"
          style={{
            width: "100%",
            height: 240,
            minHeight: 220,
          }}
        />
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textAlign: "right" }}
      >
        {`${formatShortDate(points[0].date)} - ${formatShortDate(
          points[points.length - 1].date,
        )}`}
      </Typography>

      <Box
        component="table"
        sx={hiddenTableSx}
        aria-label="Valeurs detaillees de la tendance d'activite"
      >
        <thead>
          <tr>
            <th>Date</th>
            <th>Evenements</th>
            <th>Apprenants actifs</th>
          </tr>
        </thead>
        <tbody>
          {points.map((item) => (
            <tr key={item.date}>
              <td>{item.date}</td>
              <td>{item.totalEvents}</td>
              <td>{item.activeLearners}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Stack>
  );
}