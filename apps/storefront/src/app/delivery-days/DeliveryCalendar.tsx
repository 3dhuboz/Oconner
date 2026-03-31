'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DeliveryDay } from '@butcher/shared';
import { ChevronLeft, ChevronRight, ShoppingCart, Clock, CalendarDays, Truck } from 'lucide-react';

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

  const goToToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelected(null);
  };

  const upcomingDays = days
    .filter((d) => d.date >= Date.now())
    .sort((a, b) => a.date - b.date)
    .slice(0, 6);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="text-sm font-medium text-brand border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-brand/5 transition-colors"
            >
              Today
            </button>
            <div className="flex items-center">
              <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            {MONTH_NAMES[month]} {year}
          </h2>
          <div className="w-20" /> {/* Spacer for balance */}
        </div>

        {/* ── Day-of-week headers ── */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider py-2.5">
              {d}
            </div>
          ))}
        </div>

        {/* ── Calendar cells ── */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) {
              return (
                <div
                  key={`empty-${i}`}
                  className="min-h-[88px] sm:min-h-[100px] border-b border-r border-gray-100 bg-gray-50/40"
                />
              );
            }

            const key = `${year}-${month}-${day}`;
            const deliveryDay = dayMap.get(key);
            const isToday = key === today;
            const isPast = new Date(year, month, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const isFull = deliveryDay ? (deliveryDay.maxOrders - deliveryDay.orderCount) <= 0 : false;
            const isSelected = selected?.id === deliveryDay?.id;
            const isAvailable = !!deliveryDay && !isFull && !isPast;
            const spotsLeft = deliveryDay ? deliveryDay.maxOrders - deliveryDay.orderCount : 0;

            return (
              <button
                key={key}
                disabled={!isAvailable}
                onClick={() => setSelected(deliveryDay!)}
                className={`
                  min-h-[88px] sm:min-h-[100px] p-1.5 sm:p-2 flex flex-col items-start
                  border-b border-r border-gray-100 text-left transition-colors
                  ${isSelected ? 'bg-brand/5' : ''}
                  ${isAvailable && !isSelected ? 'hover:bg-brand/[0.03] cursor-pointer' : ''}
                  ${isPast && !deliveryDay ? 'bg-white' : 'bg-white'}
                  ${!isAvailable ? 'cursor-default' : ''}
                `}
              >
                {/* Date number */}
                <span
                  className={`
                    text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full mb-1
                    ${isToday ? 'bg-brand text-white font-bold' : ''}
                    ${!isToday && isSelected ? 'bg-brand/15 text-brand font-bold' : ''}
                    ${!isToday && !isSelected && !isPast ? 'text-gray-700' : ''}
                    ${isPast && !isToday ? 'text-gray-300' : ''}
                  `}
                >
                  {day}
                </span>

                {/* Delivery event chip */}
                {deliveryDay && !isPast && (
                  <div
                    className={`
                      w-full rounded-md px-1.5 py-1 text-[10px] sm:text-[11px] font-semibold leading-tight mt-auto
                      ${isSelected
                        ? 'bg-brand text-white'
                        : isFull
                          ? 'bg-gray-100 text-gray-400 line-through'
                          : 'bg-brand/10 text-brand hover:bg-brand/20'
                      }
                    `}
                  >
                    <div className="flex items-center gap-1">
                      <Truck className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {isFull ? 'Fully booked' : `Delivery`}
                      </span>
                    </div>
                    {!isFull && (
                      <div className="text-[9px] sm:text-[10px] opacity-75 mt-0.5 font-normal">
                        {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="space-y-4">
        {/* Selected day detail */}
        {selected ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-brand px-5 py-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 mb-1">Selected Delivery</p>
              <p className="font-bold text-lg leading-tight">
                {new Date(selected.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="p-5 space-y-3">
              {(selected as DeliveryDay & { deliveryWindowStart?: string }).deliveryWindowStart && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-brand" />
                  </div>
                  Deliveries from {formatTime((selected as DeliveryDay & { deliveryWindowStart?: string }).deliveryWindowStart!)}
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="h-4 w-4 text-brand" />
                </div>
                {selected.maxOrders - selected.orderCount} spots remaining
              </div>
              {selected.notes && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">{selected.notes}</p>
              )}
              <button
                onClick={() => router.push(`/shop?deliveryDay=${selected.id}`)}
                className="w-full bg-brand text-white py-3 rounded-xl font-bold text-sm hover:bg-brand-mid transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                Order for this day
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-400">Click a delivery date<br />to see details & order</p>
          </div>
        )}

        {/* Upcoming list */}
        {upcomingDays.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-800">Upcoming Delivery Days</h3>
            </div>
            <div className="divide-y divide-gray-100">
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
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isFull ? 'bg-gray-300' : 'bg-brand'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(d.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className={`text-xs mt-0.5 ${isFull ? 'text-gray-400' : 'text-brand'}`}>
                          {isFull ? 'Fully booked' : `${spotsLeft} spots left`}
                        </p>
                      </div>
                    </div>
                    {!isFull && <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand transition-colors" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {upcomingDays.length === 0 && !selected && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold text-amber-800">No delivery days scheduled yet</p>
            <p className="text-xs text-amber-600 mt-1">Check back soon — new dates are added regularly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
