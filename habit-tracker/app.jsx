const { useMemo, useState, useEffect } = React;

const LS_KEY = "habit-tracker-data-v1";

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekDates(base = new Date()) {
  const d = new Date(base);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(d);
    date.setDate(d.getDate() + i);
    return date;
  });
}

function getStreak(habitId, logs) {
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 3650; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatDate(d);
    const value = logs?.[habitId]?.[key] ?? 0;
    if (value > 0) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function getBadge(streak) {
  if (streak >= 100) return "🏆 100-day Legend";
  if (streak >= 30) return "🥇 30-day Champion";
  if (streak >= 7) return "🎯 7-day Starter";
  return "—";
}

function App() {
  const [habitName, setHabitName] = useState("");
  const [habitPoints, setHabitPoints] = useState(10);
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setHabits(parsed.habits || []);
      setLogs(parsed.logs || {});
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ habits, logs }));
  }, [habits, logs]);

  const weekDates = useMemo(() => getWeekDates(), []);

  const totalScore = useMemo(() => {
    return habits.reduce((sum, habit) => {
      const hLogs = logs[habit.id] || {};
      const points = Object.values(hLogs).reduce(
        (inner, intensity) => inner + Number(intensity || 0) * habit.points,
        0
      );
      return sum + points;
    }, 0);
  }, [habits, logs]);

  function addHabit(e) {
    e.preventDefault();
    const clean = habitName.trim();
    if (!clean) return;

    const item = {
      id: crypto.randomUUID(),
      name: clean,
      points: Number(habitPoints) || 1,
    };
    setHabits((prev) => [item, ...prev]);
    setHabitName("");
    setHabitPoints(10);
  }

  function setIntensity(habitId, dateKey, value) {
    const intensity = Math.max(0, Math.min(5, Number(value) || 0));
    setLogs((prev) => ({
      ...prev,
      [habitId]: {
        ...(prev[habitId] || {}),
        [dateKey]: intensity,
      },
    }));
  }

  function removeHabit(habitId) {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setLogs((prev) => {
      const next = { ...prev };
      delete next[habitId];
      return next;
    });
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Habit Tracker</h1>
        <p className="text-slate-600 mt-1">
          Add habits, track intensity (1–5), build streaks, earn points.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-4 mb-6">
        <article className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm uppercase text-slate-500">Total Habits</h2>
          <p className="text-3xl font-semibold">{habits.length}</p>
        </article>
        <article className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm uppercase text-slate-500">Total Score</h2>
          <p className="text-3xl font-semibold text-indigo-600">{totalScore}</p>
        </article>
        <article className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm uppercase text-slate-500">This Week</h2>
          <p className="text-3xl font-semibold">{weekDates.length} days</p>
        </article>
      </section>

      <section className="bg-white rounded-xl shadow p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Add Daily Habit</h2>
        <form className="grid md:grid-cols-3 gap-3" onSubmit={addHabit}>
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Habit name (e.g. Workout)"
            value={habitName}
            onChange={(e) => setHabitName(e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2"
            type="number"
            min="1"
            max="100"
            value={habitPoints}
            onChange={(e) => setHabitPoints(e.target.value)}
          />
          <button
            className="bg-indigo-600 text-white rounded-lg px-3 py-2 hover:bg-indigo-700"
            type="submit"
          >
            Add Habit
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {habits.length === 0 && (
          <div className="bg-white rounded-xl shadow p-6 text-slate-600">
            No habits yet. Add your first habit above.
          </div>
        )}

        {habits.map((habit) => {
          const streak = getStreak(habit.id, logs);
          const badge = getBadge(streak);

          return (
            <article key={habit.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-lg font-semibold">{habit.name}</h3>
                  <p className="text-sm text-slate-600">
                    {habit.points} pts/intensity • Streak: {streak} days • Badge: {badge}
                  </p>
                </div>
                <button
                  className="text-sm text-red-600 hover:text-red-700"
                  onClick={() => removeHabit(habit.id)}
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {weekDates.map((d) => {
                  const key = formatDate(d);
                  const intensity = logs?.[habit.id]?.[key] ?? 0;
                  const done = intensity > 0;

                  return (
                    <div
                      key={key}
                      className={`rounded-lg border p-3 ${
                        done ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      }`}
                    >
                      <p className="text-xs text-slate-500 mb-1">
                        {d.toLocaleDateString(undefined, { weekday: "short" })}
                      </p>
                      <p className="text-sm font-medium mb-2">{key}</p>
                      <label className="text-xs text-slate-600">Intensity</label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="1"
                        value={intensity}
                        onChange={(e) => setIntensity(habit.id, key, e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm mt-1">
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
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
