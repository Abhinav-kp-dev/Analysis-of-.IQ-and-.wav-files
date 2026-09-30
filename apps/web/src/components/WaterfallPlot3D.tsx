"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, Mountain, Palette, Maximize2, RotateCcw } from "lucide-react";
import type { Data, Layout as PlotlyLayout, Config as PlotlyConfig } from "plotly.js-dist-min";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground animate-pulse">
      Loading 3D visualization engine...
    </div>
  ),
});

export type PlotViewMode = "2d" | "3d";
export type ColorScheme = "Viridis" | "Jet" | "Plasma" | "Inferno" | "Electric" | "Turbo";

interface WaterfallPlot3DProps {
  times: number[];
  frequencies: number[];
  powerDb: number[][]; // [n_times][n_freqs] or [n_freqs][n_times]
  title?: string;
  defaultViewMode?: PlotViewMode;
  className?: string;
  height?: number;
}

export function WaterfallPlot3D({
  times,
  frequencies,
  powerDb,
  title = "RF Spectrogram & Waterfall Surface",
  defaultViewMode = "2d",
  className = "",
  height = 480,
}: WaterfallPlot3DProps) {
  const [viewMode, setViewMode] = React.useState<PlotViewMode>(defaultViewMode);
  const [colorScale, setColorScale] = React.useState<ColorScheme>("Viridis");
  const [showContours, setShowContours] = React.useState(true);

  // Time in milliseconds for readable display
  const timeMs = React.useMemo(() => {
    return times.map((t) => Number((t * 1000).toFixed(2)));
  }, [times]);

  // Frequency in kHz
  const freqKhz = React.useMemo(() => {
    return frequencies.map((f) => Number((f / 1000).toFixed(2)));
  }, [frequencies]);

  // Format power values: Ensure 2D matrix matching dimensions
  const formattedZ = React.useMemo(() => {
    if (!powerDb || powerDb.length === 0) return [];
    // If matrix is [n_freqs][n_times], transpose if necessary for Plotly surface (y=freq, x=time)
    if (powerDb.length === frequencies.length && powerDb[0]?.length === times.length) {
      return powerDb;
    }
    // Already in correct orientation or transpose
    return powerDb;
  }, [powerDb, frequencies.length, times.length]);

  const plotData: Data[] = React.useMemo(() => {
    if (viewMode === "2d") {
      return [
        {
          type: "heatmap",
          x: timeMs,
          y: freqKhz,
          z: formattedZ,
          colorscale: colorScale,
          colorbar: {
            title: {
              text: "Power (dB)",
              font: { color: "#94a3b8", family: "var(--font-mono), monospace", size: 11 },
            },
            tickfont: { color: "#94a3b8", family: "var(--font-mono), monospace", size: 10 },
            len: 0.9,
            thickness: 14,
            outlinewidth: 0,
          },
          hovertemplate:
            "<b>Time:</b> %{x:.2f} ms<br><b>Freq:</b> %{y:.2f} kHz<br><b>Power:</b> %{z:.1f} dB<extra></extra>",
        } as unknown as Data,
      ];
    } else {
      // 3D Surface Waterfall
      return [
        {
          type: "surface",
          x: timeMs,
          y: freqKhz,
          z: formattedZ,
          colorscale: colorScale,
          contours: {
            z: {
              show: showContours,
              usecolormap: true,
              highlightcolor: "#00E5FF",
              project: { z: false },
            },
          },
          lighting: {
            ambient: 0.8,
            diffuse: 0.9,
            specular: 0.3,
            roughness: 0.5,
          },
          colorbar: {
            title: {
              text: "Power (dB)",
              font: { color: "#94a3b8", family: "var(--font-mono), monospace", size: 11 },
            },
            tickfont: { color: "#94a3b8", family: "var(--font-mono), monospace", size: 10 },
            len: 0.85,
            thickness: 14,
            outlinewidth: 0,
          },
          hovertemplate:
            "<b>Time:</b> %{x:.2f} ms<br><b>Freq:</b> %{y:.2f} kHz<br><b>Power:</b> %{z:.1f} dB<extra></extra>",
        } as unknown as Data,
      ];
    }
  }, [viewMode, timeMs, freqKhz, formattedZ, colorScale, showContours]);

  const layout: Record<string, unknown> = React.useMemo(() => {
    const textColor = "#e2e8f0";
    const textMuted = "#94a3b8";
    const gridColor = "hsl(217 18% 18%)";
    const bg = "transparent";

    if (viewMode === "2d") {
      return {
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: {
          color: textMuted,
          family: "var(--font-inter), system-ui, sans-serif",
          size: 11,
        },
        margin: { l: 65, r: 25, t: 20, b: 50 },
        height,
        autosize: true,
        xaxis: {
          title: { text: "Time (ms)", font: { color: textMuted, size: 12 } },
          gridcolor: gridColor,
          zerolinecolor: gridColor,
          tickfont: { color: textMuted, size: 10 },
        },
        yaxis: {
          title: { text: "Frequency (kHz)", font: { color: textMuted, size: 12 } },
          gridcolor: gridColor,
          zerolinecolor: gridColor,
          tickfont: { color: textMuted, size: 10 },
          autorange: "reversed",
        },
      };
    } else {
      return {
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: {
          color: textMuted,
          family: "var(--font-inter), system-ui, sans-serif",
          size: 11,
        },
        margin: { l: 10, r: 10, t: 10, b: 10 },
        height,
        autosize: true,
        scene: {
          xaxis: {
            title: { text: "Time (ms)", font: { color: textMuted, size: 10 } },
            gridcolor: gridColor,
            zerolinecolor: gridColor,
            tickfont: { color: textMuted, size: 9 },
            backgroundcolor: "rgba(10, 15, 29, 0.4)",
            showbackground: true,
          },
          yaxis: {
            title: { text: "Freq (kHz)", font: { color: textMuted, size: 10 } },
            gridcolor: gridColor,
            zerolinecolor: gridColor,
            tickfont: { color: textMuted, size: 9 },
            backgroundcolor: "rgba(10, 15, 29, 0.4)",
            showbackground: true,
          },
          zaxis: {
            title: { text: "Power (dB)", font: { color: textMuted, size: 10 } },
            gridcolor: gridColor,
            zerolinecolor: gridColor,
            tickfont: { color: textMuted, size: 9 },
            backgroundcolor: "rgba(10, 15, 29, 0.4)",
            showbackground: true,
          },
          camera: {
            eye: { x: 1.5, y: -1.7, z: 1.2 },
          },
          aspectratio: { x: 1.4, y: 1.2, z: 0.7 },
        },
      };
    }
  }, [viewMode, height]);

  const config: Record<string, unknown> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
    toImageButtonOptions: {
      format: "png",
      filename: `signalscope-${viewMode}-waterfall`,
      scale: 2,
    },
  };

  return (
    <Card className={`border bg-card/70 backdrop-blur-sm shadow-sm ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            {viewMode === "2d" ? <Layers className="h-4 w-4" /> : <Mountain className="h-4 w-4" />}
          </div>
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
              {title}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {viewMode === "2d"
                ? "2D spectrogram with relative frequency vs time power density"
                : "Interactive 3D elevation mesh (drag to rotate, scroll to zoom, right-click to pan)"}
            </p>
          </div>
        </div>

        {/* View mode & palette controls */}
        <div className="flex items-center gap-2">
          {/* 2D / 3D Switch */}
          <div className="flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5">
            <button
              onClick={() => setViewMode("2d")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === "2d"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              2D
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === "3d"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mountain className="h-3.5 w-3.5" />
              3D Surface
            </button>
          </div>

          {/* Color scale dropdown */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={colorScale}
              onChange={(e) => setColorScale(e.target.value as ColorScheme)}
              className="h-7 rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Viridis">Viridis</option>
              <option value="Plasma">Plasma</option>
              <option value="Inferno">Inferno</option>
              <option value="Jet">Jet</option>
              <option value="Electric">Electric</option>
              <option value="Turbo">Turbo</option>
            </select>
          </div>

          {viewMode === "3d" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowContours((prev) => !prev)}
              title="Toggle surface contours"
            >
              Contours: {showContours ? "ON" : "OFF"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3">
        <div style={{ height }}>
          <Plot
            data={plotData}
            layout={layout as PlotlyLayout}
            config={config as PlotlyConfig}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
