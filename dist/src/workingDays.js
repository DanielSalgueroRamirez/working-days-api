"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadHolidays = loadHolidays;
exports.isWeekend = isWeekend;
exports.isHoliday = isHoliday;
exports.isWithinWorkingHours = isWithinWorkingHours;
exports.adjustToPreviousWorkingTime = adjustToPreviousWorkingTime;
exports.addBusinessDays = addBusinessDays;
exports.addBusinessHours = addBusinessHours;
exports.calculateWorkingDate = calculateWorkingDate;
// src/workingDays.ts
const axios_1 = __importDefault(require("axios"));
const luxon_1 = require("luxon");
const holidaysCache_json_1 = __importDefault(require("./holidaysCache.json"));
const HOLIDAYS_URL = "https://content.capta.co/Recruitment/WorkingDays.json";
const COLOMBIA = "America/Bogota";
async function loadHolidays() {
    try {
        const res = await axios_1.default.get(HOLIDAYS_URL, { timeout: 1500 });
        const data = res.data;
        const normalized = Array.isArray(data)
            ? data.map((d) => {
                if (typeof d === "string")
                    return d.slice(0, 10);
                if (d && (d.date || d.fecha))
                    return (d.date || d.fecha).slice(0, 10);
                for (const val of Object.values(d)) {
                    if (typeof val === "string" && /\d{4}-\d{2}-\d{2}/.test(val)) {
                        return val.slice(0, 10);
                    }
                }
                throw new Error("Formato de festivo no reconocido");
            })
            : [];
        return new Set(normalized);
    }
    catch (err) {
        console.error("[ERROR] No se pudieron cargar festivos:", err.message);
        console.log("⚠️ Usando fallback holidaysCache.json");
        const normalized = holidaysCache_json_1.default.map((d) => typeof d === "string"
            ? d.slice(0, 10)
            : (d.date || d.fecha || Object.values(d)[0]).slice(0, 10));
        return new Set(normalized);
    }
}
function isWeekend(dt) {
    return dt.weekday === 6 || dt.weekday === 7;
}
function isHoliday(dateSet, dt) {
    const iso = dt.toISODate();
    return iso ? dateSet.has(iso) : false;
}
function isWithinWorkingHours(dt) {
    const minutes = dt.hour * 60 + dt.minute;
    return ((minutes >= 480 && minutes <= 720) || // 08:00 - 12:00
        (minutes >= 780 && minutes <= 1020) // 13:00 - 17:00
    );
}
function adjustToPreviousWorkingTime(dateSet, dtIn) {
    let dt = dtIn.setZone(COLOMBIA);
    while (isWeekend(dt) || isHoliday(dateSet, dt)) {
        dt = dt.minus({ days: 1 }).set({ hour: 17, minute: 0 });
    }
    const minutes = dt.hour * 60 + dt.minute;
    if (minutes < 480) {
        dt = dt.minus({ days: 1 });
        while (isWeekend(dt) || isHoliday(dateSet, dt)) {
            dt = dt.minus({ days: 1 });
        }
        return dt.set({ hour: 17, minute: 0 });
    }
    if (minutes > 1020) {
        return dt.set({ hour: 17, minute: 0 });
    }
    if (minutes > 720 && minutes < 780) {
        return dt.set({ hour: 12, minute: 0 });
    }
    return dt;
}
function addBusinessDays(dateSet, dtIn, n) {
    let dt = dtIn;
    let remaining = n;
    while (remaining > 0) {
        dt = dt.plus({ days: 1 });
        while (isWeekend(dt) || isHoliday(dateSet, dt)) {
            dt = dt.plus({ days: 1 });
        }
        remaining--;
    }
    return dt;
}
function addBusinessHours(dateSet, dtIn, hoursToAdd) {
    let dt = dtIn;
    let minutesLeft = hoursToAdd * 60;
    while (minutesLeft > 0) {
        if (isWeekend(dt) || isHoliday(dateSet, dt)) {
            dt = dt.plus({ days: 1 }).set({ hour: 8, minute: 0 });
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
            if (minutesLeft === 0)
                break;
            dt = dt.set({ hour: 13, minute: 0 });
            continue;
        }
        if (minutes >= 780 && minutes <= 1020) {
            const available = 1020 - minutes;
            const consume = Math.min(available, minutesLeft);
            dt = dt.plus({ minutes: consume });
            minutesLeft -= consume;
            if (minutesLeft === 0)
                break;
            dt = dt.plus({ days: 1 }).set({ hour: 8, minute: 0 });
            while (isWeekend(dt) || isHoliday(dateSet, dt)) {
                dt = dt.plus({ days: 1 });
            }
            continue;
        }
        if (minutes > 720 && minutes < 780) {
            dt = dt.set({ hour: 13, minute: 0 });
            continue;
        }
        if (minutes < 480) {
            dt = dt.set({ hour: 8, minute: 0 });
            continue;
        }
        if (minutes > 1020) {
            dt = dt.plus({ days: 1 }).set({ hour: 8, minute: 0 });
            while (isWeekend(dt) || isHoliday(dateSet, dt)) {
                dt = dt.plus({ days: 1 });
            }
            continue;
        }
    }
    return dt;
}
/**
 * Versión resumida que combina días + horas
 */
function calculateWorkingDate(days, hours, holidays) {
    let current = luxon_1.DateTime.now().set({ second: 0, millisecond: 0 });
    current = addBusinessDays(holidays, current, days);
    current = addBusinessHours(holidays, current, hours);
    return current;
}
