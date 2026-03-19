'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DeliveryDay } from '@butcher/shared';
import { ChevronLeft, ChevronRight, ShoppingCart, Clock, CalendarDays } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, '0')}${suffix}`;
}

function toDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function DeliveryCalendar({ days }: { days: DeliveryDay[] }) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<DeliveryDay | null>(null);

  const dayMap = new Map<string, DeliveryDay>();
  for (const d of days) dayMap.set(toDateKey(d.date), d);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelected(null);
  };

  const upcomingDays = days
    .filter((d) => d.date >= Date.now())
    .sort((a, b) => a.date - b.date)
    .slice(0, 6);

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-8">
      {/* Calendar */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-brand text-white">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-bold text-lg">{MONTH_NAMES[month]} {year}</h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 bg-brand/5">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-brand/60 py-3">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 divide-x divide-y border-t">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="h-16 bg-gray-50/50" />;

            const key = `${year}-${month}-${day}`;
            const deliveryDay = dayMap.get(key);
            const isToday = key === today;
            const isPast = new Date(year, month, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const isFull = deliveryDay ? (deliveryDay.maxOrders - deliveryDay.orderCount) <= 0 : false;
            const isSelected = selected?.id === deliveryDay?.id;
            const isAvailable = !!deliveryDay && !isFull && !isPast;

            return (
              <button
                key={key}
                disabled={!isAvailable}
                onClick={() => setSelected(deliveryDay!)}
                className={`
                  h-16 flex flex-col items-center justify-center gap-1 transition-all relative
                  ${isSelected ? 'bg-brand text-white' : ''}
                  ${isAvailable && !isSelected ? 'hover:bg-brand/10 cursor-pointer' : ''}
                  ${isPast && !deliveryDay ? 'text-gray-200' : ''}
                  ${!deliveryDay || (isFull && !isPast) ? 'cursor-default' : ''}
                `}
              >
                <span className={`
                  text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full
                  ${isToday && !isSelected ? 'border-2 border-brand text-brand' : ''}
                  ${isSelected ? 'bg-white text-brand' : ''}
                  ${!isSelected && !isToday && deliveryDay && !isFull && !isPast ? 'text-brand' : ''}
                  ${isFull && !isPast ? 'text-gray-400' : ''}
                  ${isPast && !deliveryDay ? 'text-gray-300' : ''}
                `}>{day}</span>
                {deliveryDay && !isPast && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    isSelected ? 'bg-white/20 text-white' :
                    isFull ? 'bg-gray-100 text-gray-400' :
                    'bg-brand/15 text-brand'
                  }`}>
                    {isFull ? 'Full' : 'Open'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-6 py-3 border-t bg-gray-50 flex items-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-brand/15 inline-block" />Available</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-brand inline-block" />Selected</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />Full / unavailable</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="space-y-4">
        {/* Selected day detail */}
        {selected ? (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-brand px-5 py-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-0.5">Selected Delivery</p>
              <p className="font-black text-lg leading-tight">
                {new Date(selected.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="p-5 space-y-3">
              {(selected as any).deliveryWindowStart && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-brand" />
                  Deliveries from {formatTime((selected as any).deliveryWindowStart)}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ShoppingCart className="h-4 w-4 text-brand" />
                {selected.maxOrders - selected.orderCount} spots remaining
              </div>
              {selected.notes && (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">{selected.notes}</p>
              )}
              <button
                onClick={() => router.push(`/shop?deliveryDay=${selected.id}`)}
                className="w-full bg-brand text-white py-3 rounded-xl font-bold text-sm hover:bg-brand/90 transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Order for this day
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-brand/5 border-2 border-dashed border-brand/20 rounded-2xl p-6 text-center text-brand/60">
            <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Click a highlighted date<br />to select your delivery day</p>
          </div>
        )}

        {/* Upcoming list */}
        {upcomingDays.length > 0 && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-sm text-brand">Upcoming Delivery Days</h3>
            </div>
            <div className="divide-y">
              {upcomingDays.map((d) => {
                const spotsLeft = d.maxOrders - d.orderCount;
                const isFull = spotsLeft <= 0;
                return (
                  <button
                    key={d.id}
                    disabled={isFull}
                    onClick={() => {
                      const date = new Date(d.date);
                      setYear(date.getFullYear());
                      setMonth(date.getMonth());
                      setSelected(isFull ? null : d);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand">
                        {new Date(d.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className={`text-xs mt-0.5 ${isFull ? 'text-gray-400' : 'text-green-600'}`}>
                        {isFull ? 'Fully booked' : `${spotsLeft} spots left`}
                      </p>
                    </div>
                    {!isFull && <ChevronRight className="h-4 w-4 text-brand/40" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {upcomingDays.length === 0 && !selected && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-amber-800">No delivery days scheduled yet</p>
            <p className="text-xs text-amber-600 mt-1">Check back soon — new dates are added regularly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
