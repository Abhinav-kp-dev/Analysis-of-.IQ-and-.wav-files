"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createSDRWebSocket } from "@/lib/stream";
import { streamApi } from "@/lib/api";
import { SDRFrame, SDRStreamControls } from "@/lib/types";
import { WaterfallPlot3D } from "@/components/WaterfallPlot3D";
import {
  Radio,
  Play,
  Pause,
  Sliders,
  Activity,
  Zap,
  ArrowUpRight,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Layers,
  Sparkles,
} from "lucide-react";

const MODULATION_BAUD_RANGES: Record<string, { min: number; max: number; step: number; default: number }> = {
  BPSK: { min: 1000, max: 100000, step: 1000, default: 25000 },
  QPSK: { min: 1000, max: 200000, step: 1000, default: 50000 },
  "8PSK": { min: 1000, max: 300000, step: 1000, default: 75000 },
  "16QAM": { min: 1000, max: 400000, step: 1000, default: 100000 },
  "64QAM": { min: 1000, max: 500000, step: 1000, default: 125000 },
  "2FSK": { min: 1000, max: 50000, step: 500, default: 20000 },
  "4FSK": { min: 1000, max: 100000, step: 500, default: 40000 },
};

interface LiveSDRSimulatorProps {
  variant?: "full" | "compact";
  className?: string;
}

export function LiveSDRSimulator({ variant = "full", className = "" }: LiveSDRSimulatorProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [isConnected, setIsConnected] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [currentFrame, setCurrentFrame] = React.useState<SDRFrame | null>(null);
  const [fpsCount, setFpsCount] = React.useState<number>(0);
  const [isSnapshotting, setIsSnapshotting] = React.useState(false);

  const [controls, setControls] = React.useState<SDRStreamControls>({
    modulation: "QPSK",
    snr_db: 20,
    baud_rate: 50000,
    cfo_hz: 0,
    sample_rate_hz: 1000000,
    fps: variant === "compact" ? 10 : 15,
  });

  // Rolling waterfall buffer for 3D waterfall display
  const waterfallBufferRef = React.useRef<{ times: number[]; powers: number[][] }>({
    times: [],
    powers: [],
  });

  const wsRef = React.useRef<ReturnType<typeof createSDRWebSocket> | null>(null);
  const frameCounterRef = React.useRef<number>(0);
  const lastFpsCalcTimeRef = React.useRef<number>(Date.now());
  const lastFrameRenderRef = React.useRef<number>(0);

  React.useEffect(() => {
    const ws = createSDRWebSocket(
      (frame) => {
        frameCounterRef.current += 1;
        const now = Date.now();

        // Throttle React renders to 12-15 FPS to keep UI snappy
        if (now - lastFrameRenderRef.current >= (variant === "compact" ? 90 : 65)) {
          lastFrameRenderRef.current = now;
          setCurrentFrame(frame);

          // Update rolling waterfall buffer if slice is present
          if (frame.waterfall_slice && frame.waterfall_slice.length > 0) {
            const buf = waterfallBufferRef.current;
            const t = (now % 60000) / 1000;
            buf.times.push(t);
            buf.powers.push(frame.waterfall_slice);
            if (buf.times.length > 25) {
              buf.times.shift();
              buf.powers.shift();
            }
          }
        }

        if (now - lastFpsCalcTimeRef.current >= 1000) {
          setFpsCount(frameCounterRef.current);
          frameCounterRef.current = 0;
          lastFpsCalcTimeRef.current = now;
        }
      },
      (err) => {
        console.warn("WebSocket error:", err);
        setIsConnected(false);
      },
      () => {
        setIsConnected(true);
      },
      () => {
        setIsConnected(false);
      }
    );

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [variant]);

  const handleControlChange = (field: keyof SDRStreamControls, value: unknown) => {
    const updated = { ...controls, [field]: value };
    setControls(updated);
    if (wsRef.current) {
      wsRef.current.updateConfig(updated);
    }
  };

  const handleModulationChange = (newMod: string) => {
    const range = MODULATION_BAUD_RANGES[newMod] || { min: 1000, max: 200000, step: 1000, default: 50000 };
    const updated = { ...controls, modulation: newMod, baud_rate: range.default };
    setControls(updated);
    if (wsRef.current) {
      wsRef.current.updateConfig(updated);
    }
  };

  const togglePause = () => {
    if (!wsRef.current) return;
    if (isPaused) {
      wsRef.current.resume();
      setIsPaused(false);
    } else {
      wsRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleSnapshot = async () => {
    try {
      setIsSnapshotting(true);
      const res = await streamApi.snapshot({
        name: `Live SDR Capture (${controls.modulation})`,
        modulation: controls.modulation,
        snr_db: controls.snr_db,
        baud_rate: controls.baud_rate,
        cfo_hz: controls.cfo_hz,
        sample_rate_hz: controls.sample_rate_hz,
        duration_symbols: 4000,
      });

      addToast({
        title: "Signal Captured",
        description: res.message,
        variant: "default",
      });

      // Navigate to project
      router.push(`/projects/${res.project_id}`);
    } catch (e: unknown) {
      const err = e as Error;
      addToast({
        title: "Snapshot Failed",
        description: err.message || "Failed to capture signal snapshot",
        variant: "destructive",
      });
    } finally {
      setIsSnapshotting(false);
    }
  };

  const constellationData = currentFrame?.constellation || [];
  const waveformData = currentFrame?.waveform || [];
  const psdData = currentFrame?.psd || [];

  // Frequencies for waterfall (matching 80 points across bandwidth)
  const waterfallFreqs = React.useMemo(() => {
    const fs = controls.sample_rate_hz || 1000000;
    const n = 80;
    const freqs: number[] = [];
    for (let i = 0; i < n; i++) {
      freqs.push(-fs / 2 + (i * fs) / n);
    }
    return freqs;
  }, [controls.sample_rate_hz]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-5 sm:p-6 border border-border/80 shadow-elevation-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-medium">
                <Radio className="h-3.5 w-3.5 animate-pulse text-primary" />
                REAL-TIME SDR SIMULATOR & DSP PIPELINE
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border border-border bg-card/60">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
                  }`}
                />
                {isConnected ? "LIVE STREAM" : "CONNECTING..."}
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Live RF Signal Oscilloscope & Constellation
            </h2>
            <p className="text-xs text-muted-foreground">
              Physical carrier simulation, AWGN channel impairments, symbol recovery, and real-time DSP parameter inference.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg border bg-background/80 font-mono text-xs font-medium text-foreground">
              <span className="text-primary font-bold">{fpsCount}</span> FPS
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={togglePause}
              className="gap-1.5 border-border hover:bg-muted text-xs font-mono"
            >
              {isPaused ? <Play className="h-3.5 w-3.5 text-emerald-400" /> : <Pause className="h-3.5 w-3.5 text-warning" />}
              {isPaused ? "Resume" : "Pause"}
            </Button>

            <Button
              size="sm"
              onClick={handleSnapshot}
              disabled={isSnapshotting}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-sm"
            >
              <Camera className="h-3.5 w-3.5" />
              {isSnapshotting ? "Saving..." : "Snapshot to Project"}
            </Button>

            {variant === "compact" && (
              <Button asChild variant="secondary" size="sm" className="gap-1 text-xs">
                <Link href="/live">
                  Full Studio <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Real-time Metric Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Detected Modulation</span>
              {currentFrame?.classification_correct ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
              )}
            </div>
            <div className="text-xl font-bold font-display text-primary flex items-baseline gap-2">
              {currentFrame?.detected_modulation ?? controls.modulation}
              <span className="text-xs font-mono font-normal text-muted-foreground">
                ({Math.round((currentFrame?.confidence ?? 0.9) * 100)}%)
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Ground truth: <span className="text-foreground">{controls.modulation}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Estimated SNR
            </div>
            <div className="text-xl font-bold font-display text-secondary flex items-baseline gap-1">
              {currentFrame?.estimated_snr ?? controls.snr_db} <span className="text-xs font-mono font-normal">dB</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Configured: <span className="text-foreground">{controls.snr_db} dB</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Estimated Symbol Rate
            </div>
            <div className="text-xl font-bold font-display text-foreground flex items-baseline gap-1">
              {Math.round(currentFrame?.estimated_baud ?? controls.baud_rate).toLocaleString()}{" "}
              <span className="text-xs font-mono font-normal text-muted-foreground">Bd</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Target: <span className="text-foreground">{controls.baud_rate.toLocaleString()} Bd</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Telemetry Stream
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              #{currentFrame?.frame_idx ?? 0}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              CFO: <span className="text-foreground">{controls.cfo_hz} Hz</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Panel 1: Live Recovered Constellation */}
        <Card className="border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Recovered I/Q Constellation
            </CardTitle>
            <span className="text-[10px] font-mono text-muted-foreground">
              {constellationData.length} sampled points
            </span>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 18% 18%)" />
                  <XAxis
                    type="number"
                    dataKey="i"
                    domain={[-1.8, 1.8]}
                    stroke="#64748b"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="q"
                    domain={[-1.8, 1.8]}
                    stroke="#64748b"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222 47% 11%)",
                      borderColor: "hsl(217 18% 22%)",
                      fontSize: "11px",
                      borderRadius: "6px",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <Scatter
                    name="Symbols"
                    data={constellationData}
                    fill="#00E5FF"
                    opacity={0.75}
                    isAnimationActive={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Panel 2: Live Oscilloscope Waveform */}
        <Card className="border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-secondary" />
              Live Oscilloscope (Real & Imaginary I/Q)
            </CardTitle>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-0.5 bg-cyan-400 inline-block" /> Real (I)
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2 h-0.5 bg-purple-400 inline-block" /> Imag (Q)
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waveformData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 18% 18%)" />
                  <XAxis dataKey="x" stroke="#64748b" tick={false} />
                  <YAxis
                    domain={[-1.6, 1.6]}
                    stroke="#64748b"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="i"
                    stroke="#00E5FF"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="q"
                    stroke="#c084fc"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Panel 3: Live Power Spectral Density (PSD) */}
        <Card className={`border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden ${variant === "compact" ? "lg:col-span-2" : ""}`}>
          <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-warning" />
              Live Spectrum & Power Spectral Density
            </CardTitle>
            <span className="text-[10px] font-mono text-muted-foreground">
              Welch FFT Spectrum (dB/Hz)
            </span>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={psdData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <defs>
                    <linearGradient id="psdGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 18% 18%)" />
                  <XAxis
                    dataKey="freq"
                    stroke="#64748b"
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    domain={[-80, 0]}
                    stroke="#64748b"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222 47% 11%)",
                      borderColor: "hsl(217 18% 22%)",
                      fontSize: "11px",
                      borderRadius: "6px",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="psd"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#psdGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Panel 4: Live 3D Waterfall Surface (Only in full variant) */}
        {variant === "full" && (
          <div className="lg:col-span-1">
            <WaterfallPlot3D
              times={waterfallBufferRef.current.times.length ? waterfallBufferRef.current.times : [0, 0.05, 0.1, 0.15]}
              frequencies={waterfallFreqs}
              powerDb={
                waterfallBufferRef.current.powers.length
                  ? waterfallBufferRef.current.powers
                  : [
                      new Array(80).fill(-50),
                      new Array(80).fill(-45),
                      new Array(80).fill(-40),
                      new Array(80).fill(-35),
                    ]
              }
              title="Live 3D Waterfall Surface"
              defaultViewMode="3d"
              height={280}
            />
          </div>
        )}
      </div>

      {/* Control Deck */}
      <Card className="border bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="py-3 px-5 border-b border-border/60">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            SDR Transmitter & Channel Impairment Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Modulation selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground font-medium flex justify-between">
                <span>Modulation Scheme</span>
                <span className="text-primary font-bold">{controls.modulation}</span>
              </label>
              <select
                value={controls.modulation}
                onChange={(e) => handleModulationChange(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.keys(MODULATION_BAUD_RANGES).map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>

            {/* SNR Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground font-medium">
                <span>Channel SNR</span>
                <span className="text-cyan-400 font-bold">{controls.snr_db} dB</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={controls.snr_db}
                onChange={(e) => handleControlChange("snr_db", Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-muted cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0 dB (Noisy)</span>
                <span>40 dB (Clean)</span>
              </div>
            </div>

            {/* Symbol Rate Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground font-medium">
                <span>Symbol Rate</span>
                <span className="text-purple-400 font-bold">{controls.baud_rate.toLocaleString()} Bd</span>
              </div>
              <input
                type="range"
                min={MODULATION_BAUD_RANGES[controls.modulation]?.min || 1000}
                max={MODULATION_BAUD_RANGES[controls.modulation]?.max || 200000}
                step={MODULATION_BAUD_RANGES[controls.modulation]?.step || 1000}
                value={controls.baud_rate}
                onChange={(e) => handleControlChange("baud_rate", Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-muted cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>1 kBd</span>
                <span>{(MODULATION_BAUD_RANGES[controls.modulation]?.max || 200000) / 1000} kBd</span>
              </div>
            </div>

            {/* Carrier Offset (CFO) Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground font-medium">
                <span>Carrier Offset (CFO)</span>
                <span className="text-warning font-bold">{controls.cfo_hz} Hz</span>
              </div>
              <input
                type="range"
                min="-2000"
                max="2000"
                step="50"
                value={controls.cfo_hz}
                onChange={(e) => handleControlChange("cfo_hz", Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-muted cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>-2 kHz</span>
                <span>+2 kHz</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
