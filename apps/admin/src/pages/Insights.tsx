import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, formatCurrency } from '@butcher/shared';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock,
  Eye,
  Globe2,
  MousePointerClick,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  type LucideIcon,
  Users,
} from 'lucide-react';

interface TrafficWindow {
  visitors: number;
  pageviews: number;
  itemViews: number;
  events: number;
}

interface SeriesPoint {
  date: string;
  visitors: number;
  pageviews: number;
  itemViews: number;
}

interface InsightsStats {
  generatedAt: number;
  tracker: { lastEventAt: number | null };
  traffic: {
    today: TrafficWindow;
    week: TrafficWindow;
    month: TrafficWindow;
    dailySeries: SeriesPoint[];
    hourlyToday: { hour: number; events: number; visitors: number }[];
  };
  orders: {
    todayCount: number;
    todayRevenueCents: number;
    weekCount: number;
    weekRevenueCents: number;
    monthCount: number;
    monthRevenueCents: number;
  };
  conversion: {
    todayOrderRate: number;
    weekOrderRate: number;
    monthOrderRate: number;
    weekRevenuePerVisitorCents: number;
    monthRevenuePerVisitorCents: number;
  };
  topPages: { path: string; views: number; visitors: number }[];
  topItems: { itemId: string; name: string; views: number; visitors: number }[];
  acquisition: {
    referrers: { referrer: string; views: number; visitors: number }[];
    countries: { country: string; events: number; visitors: number }[];
  };
  technology: {
    devices: { label: string; events: number; visitors: number }[];
    browsers: { label: string; events: number; visitors: number }[];
    os: { label: string; events: number; visitors: number }[];
  };
  recentSessions: {
    id: string;
    firstSeen: number;
    lastSeen: number;
    pageviews: number;
    itemViews: number;
    paths: string[];
    referrer: string;
    country: string;
    device: string;
    browser: string;
    os: string;
  }[];
}

const nf = new Intl.NumberFormat('en-AU');

function formatInt(value: number): string {
  return nf.format(value);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatTime(ts: number | null): string {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'No events yet';
  const ageMs = Date.now() - ts;
  const minutes = Math.max(1, Math.round(ageMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function trackerHealth(lastEventAt: number | null) {
  if (!lastEventAt) {
    return {
      label: 'No events yet',
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: AlertCircle,
    };
  }
  const ageMs = Date.now() - lastEventAt;
  if (ageMs < 6 * 60 * 60 * 1000) {
    return {
      label: 'Live',
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: Activity,
    };
  }
  if (ageMs < 48 * 60 * 60 * 1000) {
    return {
      label: 'Quiet',
      className: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Clock,
    };
  }
  return {
    label: 'Check tracker',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertCircle,
  };
}

export default function InsightsPage() {
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    api.get<InsightsStats>('/api/insights')
      .then((data) => {
        setStats(data);
        setError('');
      })
      .catch((err) => setError(err?.message ?? 'Could not load insights'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60000);
    return () => window.clearInterval(id);
  }, []);

  const health = useMemo(() => trackerHealth(stats?.tracker.lastEventAt ?? null), [stats?.tracker.lastEventAt]);
  const HealthIcon = health.icon;

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 overflow-hidden sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <BarChart3 className="h-6 w-6 shrink-0 text-brand sm:h-7 sm:w-7" />
          <div>
            <h1 className="text-xl font-bold text-brand sm:text-2xl">Insights</h1>
            <p className="text-xs text-gray-500 sm:text-sm">Updated {stats ? formatTime(stats.generatedAt) : '-'}</p>
          </div>
        </div>
        <div className={`inline-flex w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold sm:w-fit ${health.className}`}>
          <HealthIcon className="h-4 w-4 shrink-0" />
          <span>{health.label}</span>
          <span className="font-normal opacity-80">{timeAgo(stats?.tracker.lastEventAt ?? null)}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={Users}
              label="Today"
              value={formatInt(stats.traffic.today.visitors)}
              detail={`${formatInt(stats.traffic.today.pageviews)} views - ${stats.orders.todayCount} paid orders`}
              accent="text-blue-600 bg-blue-50"
            />
            <MetricCard
              icon={Eye}
              label="Last 7 Days"
              value={formatInt(stats.traffic.week.visitors)}
              detail={`${formatPct(stats.conversion.weekOrderRate)} order rate - ${formatCurrency(stats.orders.weekRevenueCents)}`}
              accent="text-brand bg-brand/10"
            />
            <MetricCard
              icon={TrendingUp}
              label="Last 30 Days"
              value={formatCurrency(stats.orders.monthRevenueCents)}
              detail={`${formatInt(stats.traffic.month.visitors)} visitors - ${formatCurrency(stats.conversion.monthRevenuePerVisitorCents)} per visitor`}
              accent="text-emerald-600 bg-emerald-50"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
            <Panel title="Traffic Trend" icon={Activity}>
              <DailyBars points={stats.traffic.dailySeries} />
            </Panel>
            <Panel title="Conversion" icon={MousePointerClick}>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <ConversionRow label="Today" orders={stats.orders.todayCount} rate={stats.conversion.todayOrderRate} revenue={stats.orders.todayRevenueCents} />
                <ConversionRow label="7 days" orders={stats.orders.weekCount} rate={stats.conversion.weekOrderRate} revenue={stats.orders.weekRevenueCents} />
                <ConversionRow label="30 days" orders={stats.orders.monthCount} rate={stats.conversion.monthOrderRate} revenue={stats.orders.monthRevenueCents} />
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Top Pages" icon={Eye}>
              <RankedRows
                rows={stats.topPages.map((row) => ({
                  label: row.path,
                  value: `${formatInt(row.views)} views`,
                  sub: `${formatInt(row.visitors)} visitors`,
                  score: row.views,
                }))}
                empty="No page views recorded yet."
              />
            </Panel>
            <Panel title="Product Interest" icon={ShoppingBag}>
              <RankedRows
                rows={stats.topItems.map((row) => ({
                  label: row.name,
                  value: `${formatInt(row.views)} opens`,
                  sub: `${formatInt(row.visitors)} visitors`,
                  score: row.views,
                }))}
                empty="No product opens recorded yet."
              />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Sources" icon={Globe2}>
              <RankedRows
                rows={stats.acquisition.referrers.map((row) => ({
                  label: row.referrer,
                  value: `${formatInt(row.views)} events`,
                  sub: `${formatInt(row.visitors)} visitors`,
                  score: row.views,
                }))}
                empty="No source data yet."
              />
            </Panel>
            <Panel title="Devices" icon={Smartphone}>
              <RankedRows
                rows={stats.technology.devices.map((row) => ({
                  label: row.label,
                  value: `${formatInt(row.events)} events`,
                  sub: `${formatInt(row.visitors)} visitors`,
                  score: row.events,
                }))}
                empty="No device data yet."
              />
            </Panel>
            <Panel title="Countries" icon={Globe2}>
              <RankedRows
                rows={stats.acquisition.countries.map((row) => ({
                  label: row.country,
                  value: `${formatInt(row.events)} events`,
                  sub: `${formatInt(row.visitors)} visitors`,
                  score: row.events,
                }))}
                empty="No country data yet."
              />
            </Panel>
          </div>

          <Panel title="Recent Visitor Sessions" icon={Clock}>
            <div className="md:hidden">
              <RecentSessionCards sessions={stats.recentSessions} />
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3">Last seen</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Device</th>
                    <th className="px-4 py-3">Pages</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recentSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No sessions recorded yet.</td>
                    </tr>
                  ) : stats.recentSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-brand">{session.id}</td>
                      <td className="px-4 py-3 text-gray-600">{timeAgo(session.lastSeen)}</td>
                      <td className="px-4 py-3 text-gray-600">{session.pageviews} pages, {session.itemViews} products</td>
                      <td className="px-4 py-3 text-gray-600">{session.referrer}</td>
                      <td className="px-4 py-3 text-gray-600">{session.device} / {session.browser}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{session.paths.join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className={`shrink-0 rounded-lg p-2 ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="break-words text-2xl font-bold text-gray-900 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-5 sm:py-4">
        <Icon className="h-4 w-4 shrink-0 text-brand" />
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function DailyBars({ points }: { points: SeriesPoint[] }) {
  const max = Math.max(1, ...points.map((point) => point.pageviews + point.itemViews));

  return (
    <div className="min-w-0">
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex h-52 min-w-[520px] items-end gap-2 sm:h-56 sm:min-w-0">
          {points.map((point) => {
            const total = point.pageviews + point.itemViews;
            const height = Math.max(6, Math.round((total / max) * 100));
            return (
              <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end rounded bg-gray-50 px-1 sm:h-48">
                  <div
                    className="w-full rounded-t bg-brand transition-all"
                    style={{ height: `${height}%` }}
                    title={`${point.date}: ${total} events`}
                  />
                </div>
                <span className="w-full truncate text-center text-[10px] text-gray-500">
                  {new Date(`${point.date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand" /> Page and product events</span>
      </div>
    </div>
  );
}

function ConversionRow({ label, orders, rate, revenue }: { label: string; orders: number; rate: number; revenue: number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-sm font-bold text-brand">{formatPct(rate)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
        <span>{orders} paid orders</span>
        <span>{formatCurrency(revenue)}</span>
      </div>
    </div>
  );
}

function RankedRows({
  rows,
  empty,
}: {
  rows: { label: string; value: string; sub: string; score: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.score));

  if (rows.length === 0) return <p className="py-8 text-center text-sm text-gray-400">{empty}</p>;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`}>
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800">{row.label}</p>
              <p className="text-xs text-gray-500">{row.sub}</p>
            </div>
            <span className="shrink-0 text-right text-sm font-semibold text-gray-700">{row.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-gray-100">
            <div className="h-full rounded bg-brand" style={{ width: `${Math.max(4, Math.round((row.score / max) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentSessionCards({ sessions }: { sessions: InsightsStats['recentSessions'] }) {
  if (sessions.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No sessions recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div key={session.id} className="rounded-lg border bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-xs font-semibold text-brand">{session.id}</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{timeAgo(session.lastSeen)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-600">
              {session.pageviews + session.itemViews} events
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-gray-400">Activity</dt>
              <dd className="font-medium text-gray-700">{session.pageviews} pages, {session.itemViews} products</dd>
            </div>
            <div>
              <dt className="text-gray-400">Source</dt>
              <dd className="truncate font-medium text-gray-700">{session.referrer}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Device</dt>
              <dd className="font-medium text-gray-700">{session.device}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Browser</dt>
              <dd className="font-medium text-gray-700">{session.browser}</dd>
            </div>
          </dl>
          <p className="mt-3 line-clamp-2 break-words text-xs text-gray-500">{session.paths.join(', ') || '-'}</p>
        </div>
      ))}
    </div>
  );
}
