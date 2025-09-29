"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const express_1 = __importDefault(require("express"));
const luxon_1 = require("luxon");
const serverless_http_1 = __importDefault(require("serverless-http"));
const workingDays_1 = require("./workingDays");
const app = (0, express_1.default)();
// 🧠 Promesa compartida para evitar errores en cold start
let holidaysSet = null;
let holidaysPromise = null;
function ensureHolidays() {
    if (holidaysSet)
        return Promise.resolve(holidaysSet);
    if (!holidaysPromise) {
        holidaysPromise = (0, workingDays_1.loadHolidays)()
            .then((s) => {
            holidaysSet = s;
            console.log('[OK] Festivos cargados:', s.size);
            return s;
        })
            .catch((err) => {
            console.error('[ERROR] No se pudieron cargar festivos:', err?.message ?? err);
            holidaysSet = null;
            throw err;
        });
    }
    return holidaysPromise;
}
app.get('/api/calculate', async (req, res) => {
    try {
        const { days, hours, date } = req.query;
        if (!days && !hours) {
            return res.status(400).json({
                error: 'InvalidParameters',
                message: 'Debe proveer al menos days o hours',
            });
        }
        const daysNum = days ? parseInt(String(days), 10) : 0;
        const hoursNum = hours ? parseInt(String(hours), 10) : 0;
        if ((days && (isNaN(daysNum) || daysNum < 0)) || (hours && (isNaN(hoursNum) || hoursNum < 0))) {
            return res.status(400).json({
                error: 'InvalidParameters',
                message: 'days/hours deben ser enteros no negativos',
            });
        }
        if (date && typeof date !== 'string') {
            return res.status(400).json({
                error: 'InvalidParameters',
                message: 'date debe ser una cadena ISO UTC con Z',
            });
        }
        // 🧠 Esperar a que los festivos estén listos
        let holidays;
        try {
            holidays = await ensureHolidays();
        }
        catch {
            return res.status(503).json({
                error: 'FetchError',
                message: 'No se pudieron cargar los días festivos.',
            });
        }
        const COLOMBIA = 'America/Bogota';
        let start = date
            ? luxon_1.DateTime.fromISO(String(date), { zone: 'utc' }).setZone(COLOMBIA)
            : luxon_1.DateTime.now().setZone(COLOMBIA);
        start = (0, workingDays_1.adjustToPreviousWorkingTime)(holidays, start);
        if (daysNum > 0)
            start = (0, workingDays_1.addBusinessDays)(holidays, start, daysNum);
        if (hoursNum > 0)
            start = (0, workingDays_1.addBusinessHours)(holidays, start, hoursNum);
        const output = start.toUTC().toISO({ suppressMilliseconds: true });
        if (!output) {
            return res.status(400).json({
                error: 'InvalidParameters',
                message: 'No se pudo convertir la fecha a ISO',
            });
        }
        return res.status(200).json({ date: output });
    }
    catch (err) {
        console.error(err);
        return res.status(400).json({
            error: 'InvalidParameters',
            message: String(err?.message ?? err),
        });
    }
});
// Solo levantar server en local
if (process.env.NODE_ENV !== 'lambda' && require.main === module) {
    const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
    app.listen(PORT, () => {
        console.log(`Listening on http://localhost:${PORT}`);
    });
}
// 👇 Handler para Lambda
exports.handler = (0, serverless_http_1.default)(app);
exports.default = app;
