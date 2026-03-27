import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Lock, Plus, Trash2 } from "lucide-react";

const STORAGE_KEY = "speed-reading-tracker-v1";

function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function createSession(index) {
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

function createMonthData() {
  return Array.from({ length: 24 }, (_, i) => createSession(i));
}

function getClosestBand(wpm) {
  if (!wpm || Number.isNaN(Number(wpm))) return "";
  const bands = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  let closest = bands[0];
  for (const band of bands) {
    if (Math.abs(band - wpm) < Math.abs(closest - wpm)) closest = band;
  }
  return String(closest);
}

function calculateWpm(words, seconds) {
  const w = Number(words);
  const s = Number(seconds);
  if (!w || !s) return "";
  return Math.round((w * 60) / s);
}

export default function SpeedReadingTrackerApp() {
  const [data, setData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(getMonthKey());

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      setData(parsed);
      if (!parsed[getMonthKey()]) {
        parsed[getMonthKey()] = createMonthData();
        setData({ ...parsed });
      }
    } else {
      setData({ [getMonthKey()]: createMonthData() });
    }
  }, []);

  useEffect(() => {
    if (Object.keys(data).length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  const monthSessions = useMemo(() => {
    return data[currentMonth] || [];
  }, [data, currentMonth]);

  useEffect(() => {
    if (!data[currentMonth]) {
      setData((prev) => ({ ...prev, [currentMonth]: createMonthData() }));
    }
  }, [currentMonth]);

  const updateSession = (id, field, value) => {
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

  const lockSession = (id) => {
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
      [currentMonth]: (prev[currentMonth] || []).filter((s) => s.locked).map((s, i) => ({ ...s, sessionNo: i + 1 })),
    }));
  };

  const goMonth = (direction) => {
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
            <h1 className="text-3xl font-bold tracking-tight">Speed Reading Progress Tracker</h1>
            <p className="mt-1 text-sm text-slate-600">
              Add sessions month by month, calculate WPM automatically, and lock finished sessions so they cannot be changed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => goMonth(-1)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <div className="rounded-2xl border bg-white px-4 py-2 text-sm font-medium shadow-sm">
              {formatMonthLabel(currentMonth)}
            </div>
            <Button variant="outline" onClick={() => goMonth(1)}>
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
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
              <Button onClick={addSession}>
                <Plus className="mr-2 h-4 w-4" /> Add Extra Session
              </Button>
              <Button variant="outline" onClick={clearUnlocked}>
                <Trash2 className="mr-2 h-4 w-4" /> Remove Unlocked
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
