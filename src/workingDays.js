import axios from "axios";
import fs from "fs";
import path from "path";
import { DateTime } from "luxon";

const COLOMBIA = "America/Bogota";
const HOLIDAYS_URL = "https://content.capta.co/Recruitment/WorkingDays.json";

export async function loadHolidays(): Promise<Set<string>> {
  try {
    // 1) Intentar traer desde API
    const res = await axios.get(HOLIDAYS_URL, { timeout: 5000 });
    const data = res.data;
    const normalized = Array.isArray(data)
      ? data.map((d: any) => {
          if (typeof d === "string") return d.slice(0, 10);
          if (d && (d.date || d.fecha)) return (d.date || d.fecha).slice(0, 10);

          // Buscar un campo con fecha en el objeto
          for (const val of Object.values(d)) {
            if (typeof val === "string" && /\d{4}-\d{2}-\d{2}/.test(val)) {
              return val.slice(0, 10);
            }
          }
          throw new Error("Formato de festivo no reconocido");
        })
      : [];
    return new Set(normalized);
  } catch (err) {
    // 2) Fallback a holidaysCache.json empaquetado
    const cachePath = path.resolve(__dirname, "holidaysCache.json");
    if (fs.existsSync(cachePath)) {
      const raw = fs.readFileSync(cachePath, "utf8");
      const arr = JSON.parse(raw);
      const normalized = arr.map((d: any) =>
        typeof d === "string"
          ? d.slice(0, 10)
          : (d.date || d.fecha || Object.values(d)[0]).slice(0, 10)
      );
      return new Set(normalized);
    }
    throw err;
  }
}

export function isWeekend(dt: DateTime): boolean {
  return dt.weekday === 6 || dt.weekday === 7;
}

export function isHoliday(dateSet: Set<string>, dt: DateTime): boolean {
  const iso = dt.toISODate();
  return iso ? dateSet.has(iso) : false;
}

export function isWithinWorkingHours(dt: DateTime): boolean {
  const minutes = dt.hour * 60 + dt.minute;
  return (
    (minutes >= 480 && minutes <= 720) || // 08:00–12:00
    (minutes >= 780 && minutes <= 1020) // 13:00–17:00
  );
}

export function adjustToPreviousWorkingTime(
  dateSet: Set<string>,
  dtIn: DateTime
): DateTime {
  let dt = dtIn.setZone(COLOMBIA);

  while (isWeekend(dt) || isHoliday(dateSet, dt)) {
    dt = dt.minus({ days: 1 }).set({
      hour: 17,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  }

  const minutes = dt.hour * 60 + dt.minute;
  if (minutes < 480) {
    dt = dt.minus({ days: 1 });
    while (isWeekend(dt) || isHoliday(dateSet, dt)) {
      dt = dt.minus({ days: 1 });
    }
    return dt.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
  }
  if (minutes > 1020) {
    return dt.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
  }
  if (minutes > 720 && minutes < 780) {
    return dt.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  }
  return dt.set({ second: 0, millisecond: 0 });
}

export function addBusinessDays(
  dateSet: Set<string>,
  dtIn: DateTime,
  n: number
): DateTime {
  let dt = dtIn;
  let remaining = n;
  while (remaining > 0) {
    dt = dt.plus({ days: 1 });
    while (isWeekend(dt) || isHoliday(dateSet, dt)) {
      dt = dt.plus({ days: 1 });
    }
    remaining -= 1;
  }
  return dt;
}

export function addBusinessHours(
  dateSet: Set<string>,
  dtIn: DateTime,
  hoursToAdd: number
): DateTime {
  let dt = dtIn;
  let minutesLeft = hoursToAdd * 60;

  while (minutesLeft > 0) {
    if (isWeekend(dt) || isHoliday(dateSet, dt)) {
      dt = dt.plus({ days: 1 }).set({
        hour: 8,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      while (isWeekend(dt) || isHoliday(dateSet, dt)) {
        dt = dt.plus({ days: 1 });
      }
      continue;
    }

    const minutes = dt.hour * 60 + dt.minute;

    if (minutes >= 480 && minutes <= 720) {
      const available = 720 - minutes;
      const consume = Math.min(available, minutesLeft);
      dt = dt.plus({ minutes: consume });
      minutesLeft -= consume;
      if (minutesLeft === 0) break;
      dt = dt.set({ hour: 13, minute: 0, second: 0, millisecond: 0 });
      continue;
    }

    if (minutes >= 780 && minutes <= 1020) {
      const available = 1020 - minutes;
      const consume = Math.min(available, minutesLeft);
      dt = dt.plus({ minutes: consume });
      minutesLeft -= consume;
      if (minutesLeft === 0) break;
      dt = dt.plus({ days: 1 }).set({
        hour: 8,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      while (isWeekend(dt) || isHoliday(dateSet, dt)) {
        dt = dt.plus({ days: 1 });
      }
      continue;
    }

    if (minutes > 720 && minutes < 780) {
      dt = dt.set({ hour: 13, minute: 0, second: 0, millisecond: 0 });
      continue;
    }

    if (minutes < 480) {
      dt = dt.set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
      continue;
    }

    if (minutes > 1020) {
      dt = dt.plus({ days: 1 }).set({
        hour: 8,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      while (isWeekend(dt) || isHoliday(dateSet, dt)) {
        dt = dt.plus({ days: 1 });
      }
      continue;
    }
  }

  return dt;
}