"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// src/index.ts
const express_1 = __importDefault(require("express"));
const luxon_1 = require("luxon");
const serverless_http_1 = __importDefault(require("serverless-http")); // 👈 Importamos serverless-http
const workingDays_1 = require("./workingDays");
const app = (0, express_1.default)();
let holidaysSet = null;
// Cargar festivos al arranque (también se intentará en Lambda en cold start)
(0, workingDays_1.loadHolidays)()
    .then((s) => {
    holidaysSet = s;
    console.log('[OK] Festivos cargados:', s.size);
})
    .catch((err) => {
    console.error('[ERROR] No se pudieron cargar festivos:', err?.message ?? err);
    holidaysSet = null;
});
app.get('/api/calculate', (req, res) => {
    try {
        const { days, hours, date } = req.query;
        if (!days && !hours) {
            const err = {
                error: 'InvalidParameters',
                message: 'Debe proveer al menos days o hours',
            };
            return res.status(400).json(err);
        }
        const daysNum = days ? parseInt(String(days), 10) : 0;
        const hoursNum = hours ? parseInt(String(hours), 10) : 0;
        if ((days && (isNaN(daysNum) || daysNum < 0)) ||
            (hours && (isNaN(hoursNum) || hoursNum < 0))) {
            const err = {
                error: 'InvalidParameters',
                message: 'days/hours deben ser enteros no negativos',
            };
            return res.status(400).json(err);
        }
        if (date && typeof date !== 'string') {
            const err = {
                error: 'InvalidParameters',
                message: 'date debe ser una cadena ISO UTC con Z',
            };
            return res.status(400).json(err);
        }
        if (!holidaysSet) {
            const err = {
                error: 'FetchError',
                message: 'No se pudieron cargar los días festivos.',
            };
            return res.status(503).json(err);
        }
        const COLOMBIA = 'America/Bogota';
        let start = date
            ? luxon_1.DateTime.fromISO(String(date), { zone: 'utc' }).setZone(COLOMBIA)
            : luxon_1.DateTime.now().setZone(COLOMBIA);
        start = (0, workingDays_1.adjustToPreviousWorkingTime)(holidaysSet, start);
        if (daysNum > 0)
            start = (0, workingDays_1.addBusinessDays)(holidaysSet, start, daysNum);
        if (hoursNum > 0)
            start = (0, workingDays_1.addBusinessHours)(holidaysSet, start, hoursNum);
        const output = start.toUTC().toISO({ suppressMilliseconds: true });
        if (!output) {
            const err = {
                error: 'InvalidParameters',
                message: 'No se pudo convertir la fecha a ISO',
            };
            return res.status(400).json(err);
        }
        const success = { date: output };
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(success);
    }
    catch (err) {
        console.error(err);
        const error = {
            error: 'InvalidParameters',
            message: String(err?.message ?? err),
        };
        return res.status(400).json(error);
    }
});
// Solo levantar servidor en local (desarrollo)
if (process.env.NODE_ENV !== 'lambda' && require.main === module) {
    const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
    app.listen(PORT, () => {
        console.log(`Listening on http://localhost:${PORT}`);
    });
}
// 👇 Exportamos el handler para Lambda
exports.handler = (0, serverless_http_1.default)(app);
exports.default = app;
