import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'habit-tracker-data-v2';

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekDates(baseDate = new Date()) {
  const start = new Date(baseDate);
  const day = start.getDay();
  const diffToMonday = (day + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getCurrentStreak(habitId, logsByHabit) {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 3650; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatDate(d);
    const intensity = logsByHabit?.[habitId]?.[key] ?? 0;

    if (intensity > 0) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function getBadgeForStreak(streak) {
  if (streak >= 100) return '🏆 100-day Legend';
  if (streak >= 30) return '🥇 30-day Champion';
  if (streak >= 7) return '🎯 7-day Starter';
  return 'No badge yet';
}

export default function App() {
  const [habitName, setHabitName] = useState('');
  const [habitPoints, setHabitPoints] = useState(10);
  const [habits, setHabits] = useState([]);
  const [logsByHabit, setLogsByHabit] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setHabits(parsed.habits || []);
      setLogsByHabit(parsed.logsByHabit || {});
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        habits,
        logsByHabit,
      })
    );
  }, [habits, logsByHabit]);

  const weekDates = useMemo(() => getWeekDates(new Date()), []);

  const totalScore = useMemo(() => {
    return habits.reduce((score, habit) => {
      const logs = logsByHabit[habit.id] || {};
      const habitScore = Object.values(logs).reduce(
        (sum, intensity) => sum + Number(intensity || 0) * habit.points,
        0
      );
      return score + habitScore;
    }, 0);
  }, [habits, logsByHabit]);

  const addHabit = (event) => {
    event.preventDefault();
    const cleanName = habitName.trim();
    if (!cleanName) return;

    const newHabit = {
      id: crypto.randomUUID(),
      name: cleanName,
      points: Math.max(1, Number(habitPoints) || 1),
    };

    setHabits((prev) => [newHabit, ...prev]);
    setHabitName('');
    setHabitPoints(10);
  };

  const updateIntensity = (habitId, dateKey, value) => {
    const intensity = Math.max(0, Math.min(5, Number(value) || 0));

    setLogsByHabit((prev) => ({
      ...prev,
      [habitId]: {
        ...(prev[habitId] || {}),
        [dateKey]: intensity,
      },
    }));
  };

  const removeHabit = (habitId) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setLogsByHabit((prev) => {
      const copy = { ...prev };
      delete copy[habitId];
      return copy;
    });
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Habit Tracker</h1>
          <p className="mt-1 text-slate-600">
            Daily habits, weekly tracking, streaks, badges, and gamified points.
          </p>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="text-xs uppercase tracking-wide text-slate-500">Habits</h2>
            <p className="text-3xl font-semibold">{habits.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="text-xs uppercase tracking-wide text-slate-500">Total Score</h2>
            <p className="text-3xl font-semibold text-indigo-600">{totalScore}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="text-xs uppercase tracking-wide text-slate-500">Week View</h2>
            <p className="text-3xl font-semibold">{weekDates.length} days</p>
          </div>
        </section>

        <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">Add Daily Habit</h2>
          <form onSubmit={addHabit} className="grid gap-3 md:grid-cols-3">
            <input
              type="text"
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Habit name (e.g. Workout)"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
            />
            <input
              type="number"
              min="1"
              max="100"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={habitPoints}
              onChange={(e) => setHabitPoints(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white hover:bg-indigo-700"
            >
              Add Habit
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {habits.length === 0 ? (
            <div className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">
              No habits yet. Add your first one above.
            </div>
          ) : null}

          {habits.map((habit) => {
            const streak = getCurrentStreak(habit.id, logsByHabit);
            const badge = getBadgeForStreak(streak);

            return (
              <article key={habit.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{habit.name}</h3>
                    <p className="text-sm text-slate-600">
                      {habit.points} pts/intensity • Streak: {streak} day{streak === 1 ? '' : 's'}
                      {' • '}Badge: {badge}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                    onClick={() => removeHabit(habit.id)}
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-2 md:grid-cols-7">
                  {weekDates.map((date) => {
                    const dateKey = formatDate(date);
                    const intensity = logsByHabit?.[habit.id]?.[dateKey] ?? 0;
                    const completed = intensity > 0;

                    return (
                      <div
                        key={dateKey}
                        className={`rounded-lg border p-3 ${
                          completed
                            ? 'border-green-200 bg-green-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <p className="mb-1 text-xs text-slate-500">
                          {date.toLocaleDateString(undefined, { weekday: 'short' })}
                        </p>
                        <p className="mb-2 text-sm font-medium">{dateKey}</p>
                        <label className="text-xs text-slate-600">Intensity (0–5)</label>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="1"
                          value={intensity}
                          onChange={(e) => updateIntensity(habit.id, dateKey, e.target.value)}
                          className="w-full"
                        />
                        <p className="mt-1 text-sm">
                          {intensity === 0 ? "Didn’t do" : `Level ${intensity}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
