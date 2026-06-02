import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ParagraphWordCounterModal } from "@/components/ParagraphWordCounterModal";
import { ChevronLeft, ChevronRight, Lock, Plus, Trash2 } from "lucide-react";

const STORAGE_KEY = "speed-reading-tracker-v1";

type SessionField = "date" | "seconds" | "words" | "notes";

type Session = {
  id: string;
  sessionNo: number;
  date: string;
  seconds: string;
  words: string;
  wpm: string;
  speedBand: string;
  notes: string;
  locked: boolean;
};

type MonthData = Session[];
type TrackerData = Record<string, MonthData>;

function getMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function createSession(index: number): Session {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sessionNo: index + 1,
    date: "",
    seconds: "",
    words: "1000",
    wpm: "",
    speedBand: "",
    notes: "",
    locked: false,
  };
}

function createMonthData(): MonthData {
  return Array.from({ length: 24 }, (_, i) => createSession(i));
}

function getClosestBand(wpm: number): string {
  if (!wpm || Number.isNaN(Number(wpm))) return "";
  const bands = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  let closest = bands[0];
  for (const band of bands) {
    if (Math.abs(band - wpm) < Math.abs(closest - wpm)) closest = band;
  }
  return String(closest);
}

function calculateWpm(words: string, seconds: string): number | "" {
  const w = Number(words);
  const s = Number(seconds);
  if (!w || !s) return "";
  return Math.round((w * 60) / s);
}

function isTrackerData(value: unknown): value is TrackerData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((monthData) => Array.isArray(monthData));
}

function createInitialData(): TrackerData {
  const monthKey = getMonthKey();

  if (typeof window === "undefined") {
    return { [monthKey]: createMonthData() };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { [monthKey]: createMonthData() };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isTrackerData(parsed)) {
      return { [monthKey]: createMonthData() };
    }

    return parsed[monthKey] ? { ...parsed } : { ...parsed, [monthKey]: createMonthData() };
  } catch {
    return { [monthKey]: createMonthData() };
  }
}

export default function SpeedReadingTrackerApp() {
  const [data, setData] = useState<TrackerData>(() => createInitialData());
  const [currentMonth, setCurrentMonth] = useState(getMonthKey());

  useEffect(() => {
    if (Object.keys(data).length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  const monthSessions = useMemo(() => {
    return data[currentMonth] || [];
  }, [data, currentMonth]);

  useEffect(() => {
    if (data[currentMonth]) return;
    setData((prev) => ({ ...prev, [currentMonth]: createMonthData() }));
  }, [currentMonth, data]);

  const updateSession = (id: string, field: SessionField, value: string) => {
    setData((prev) => {
      const sessions = (prev[currentMonth] || []).map((session) => {
        if (session.id !== id || session.locked) return session;
        const updated = { ...session, [field]: value };
        const computedWpm = calculateWpm(updated.words, updated.seconds);
        updated.wpm = computedWpm ? String(computedWpm) : "";
        updated.speedBand = computedWpm ? getClosestBand(computedWpm) : "";
        return updated;
      });
      return { ...prev, [currentMonth]: sessions };
    });
  };

  const lockSession = (id: string) => {
    setData((prev) => ({
      ...prev,
      [currentMonth]: (prev[currentMonth] || []).map((session) =>
        session.id === id ? { ...session, locked: true } : session
      ),
    }));
  };

  const addSession = () => {
    setData((prev) => {
      const existing = prev[currentMonth] || [];
      return {
        ...prev,
        [currentMonth]: [...existing, createSession(existing.length)],
      };
    });
  };

  const clearUnlocked = () => {
    setData((prev) => ({
      ...prev,
      [currentMonth]: (prev[currentMonth] || [])
        .filter((s) => s.locked)
        .map((s, i) => ({ ...s, sessionNo: i + 1 })),
    }));
  };

  const goMonth = (direction: number) => {
    const [year, month] = currentMonth.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + direction, 1);
    setCurrentMonth(getMonthKey(nextDate));
  };

  const stats = useMemo(() => {
    const valid = monthSessions.filter((s) => s.wpm);
    const locked = monthSessions.filter((s) => s.locked).length;
    const average = valid.length
      ? Math.round(valid.reduce((sum, s) => sum + Number(s.wpm || 0), 0) / valid.length)
      : 0;
    const best = valid.length ? Math.max(...valid.map((s) => Number(s.wpm))) : 0;
    return { total: monthSessions.length, completed: valid.length, locked, average, best };
  }, [monthSessions]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Speed Reading Progress Tracker</h1>
            <p className="mt-1 text-sm text-slate-600">
              Add sessions month by month, calculate WPM automatically, and lock finished sessions so they cannot be changed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            <div className="flex-1 rounded-2xl border bg-white px-4 py-2 text-center text-sm font-medium shadow-sm sm:flex-none">
              {formatMonthLabel(currentMonth)}
            </div>
            <Button variant="outline" size="sm" onClick={() => goMonth(1)}>
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sessions</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.total}</CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Completed</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.completed}</CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Locked</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.locked}</CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Average WPM</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.average || "-"}</CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Best WPM</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.best || "-"}</CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Monthly Session Sheet</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                Formula used: WPM = (Words × 60) ÷ Seconds. For a 1000-word exercise, WPM = 60000 ÷ Seconds.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ParagraphWordCounterModal />
              <Button onClick={addSession}>
                <Plus className="mr-2 h-4 w-4" /> Add Extra Session
              </Button>
              <Button variant="outline" onClick={clearUnlocked}>
                <Trash2 className="mr-2 h-4 w-4" /> Remove Unlocked
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-100 text-left">
                    <th className="p-3">Session</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Words</th>
                    <th className="p-3">Seconds</th>
                    <th className="p-3">WPM</th>
                    <th className="p-3">Closest Speed Box</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthSessions.map((session, index) => (
                    <tr key={session.id} className="border-b align-top">
                      <td className="p-3 font-medium">{index + 1}</td>
                      <td className="p-3">
                        <Input
                          type="date"
                          value={session.date}
                          disabled={session.locked}
                          onChange={(e) => updateSession(session.id, "date", e.target.value)}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="1"
                          value={session.words}
                          disabled={session.locked}
                          onChange={(e) => updateSession(session.id, "words", e.target.value)}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="1"
                          value={session.seconds}
                          disabled={session.locked}
                          onChange={(e) => updateSession(session.id, "seconds", e.target.value)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="rounded-xl border bg-slate-50 px-3 py-2 font-semibold">
                          {session.wpm || "-"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="rounded-xl border bg-slate-50 px-3 py-2 font-semibold">
                          {session.speedBand ? `${session.speedBand} WPM` : "-"}
                        </div>
                      </td>
                      <td className="p-3">
                        <Textarea
                          value={session.notes}
                          disabled={session.locked}
                          placeholder="Focus, distractions, understanding, etc."
                          onChange={(e) => updateSession(session.id, "notes", e.target.value)}
                        />
                      </td>
                      <td className="p-3">
                        {session.locked ? (
                          <div className="inline-flex items-center rounded-full border px-3 py-2 font-medium">
                            <Lock className="mr-2 h-4 w-4" /> Locked
                          </div>
                        ) : (
                          <Button
                            disabled={!session.seconds || !session.words}
                            onClick={() => lockSession(session.id)}
                          >
                            <Lock className="mr-2 h-4 w-4" /> Lock Result
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="flex flex-col gap-4 md:hidden">
              {monthSessions.map((session, index) => (
                <div key={session.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Session {index + 1}</span>
                    {session.locked && (
                      <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium text-slate-600">
                        <Lock className="mr-1 h-3 w-3" /> Locked
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Date</label>
                      <Input
                        type="date"
                        value={session.date}
                        disabled={session.locked}
                        onChange={(e) => updateSession(session.id, "date", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Words</label>
                      <Input
                        type="number"
                        min="1"
                        value={session.words}
                        disabled={session.locked}
                        onChange={(e) => updateSession(session.id, "words", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Seconds</label>
                      <Input
                        type="number"
                        min="1"
                        value={session.seconds}
                        disabled={session.locked}
                        onChange={(e) => updateSession(session.id, "seconds", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">WPM</label>
                      <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm font-semibold">
                        {session.wpm || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500">Closest Speed Box</label>
                    <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm font-semibold">
                      {session.speedBand ? `${session.speedBand} WPM` : "-"}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500">Notes</label>
                    <Textarea
                      value={session.notes}
                      disabled={session.locked}
                      placeholder="Focus, distractions, understanding, etc."
                      onChange={(e) => updateSession(session.id, "notes", e.target.value)}
                    />
                  </div>
                  {!session.locked && (
                    <div className="mt-3">
                      <Button
                        className="w-full"
                        disabled={!session.seconds || !session.words}
                        onClick={() => lockSession(session.id)}
                      >
                        <Lock className="mr-2 h-4 w-4" /> Lock Result
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
