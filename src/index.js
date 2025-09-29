"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const luxon_1 = require("luxon");
const workingDays_1 = require("./workingDays");
const app = (0, express_1.default)();
// Cargar festivos en arranque (cold start de Lambda también ejecuta esto)
let holidaysSet = null;
(0, workingDays_1.loadHolidays)()
    .then((s) => {
    holidaysSet = s;
    console.log('[OK] Festivos cargados:', s.size);
})
    .catch((err) => {
    console.error('[ERROR] No se pudieron cargar festivos:', String(err?.message ?? err));
    holidaysSet = null;
});
app.get('/api/working-date', (req, res) => {
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
        if ((days && (isNaN(daysNum) || daysNum < 0)) || (hours && (isNaN(hoursNum) || hoursNum < 0))) {
            const err = {
                error: 'InvalidParameters',
                message: 'Los parámetros days/hours deben ser enteros no negativos',
            };
            return res.status(400).json(err);
        }
        if (date && typeof date !== 'string') {
            const err = {
                error: 'InvalidParameters',
                message: 'El parámetro date debe ser una cadena ISO 8601 UTC con Z',
            };
            return res.status(400).json(err);
        }
        if (!holidaysSet) {
            const err = {
                error: 'FetchError',
                message: 'No se pudieron cargar los días festivos. Intente más tarde.',
            };
            return res.status(503).json(err);
        }
        // Punto de inicio en zona Colombia
        let start = date
            ? luxon_1.DateTime.fromISO(String(date), { zone: 'utc' }).setZone('America/Bogota')
            : luxon_1.DateTime.now().setZone('America/Bogota');
        // Ajustamos hacia atrás si hace falta
        start = (0, workingDays_1.adjustToPreviousWorkingTime)(holidaysSet, start);
        // Primero días, luego horas
        if (daysNum > 0)
            start = (0, workingDays_1.addBusinessDays)(holidaysSet, start, daysNum);
        if (hoursNum > 0)
            start = (0, workingDays_1.addBusinessHours)(holidaysSet, start, hoursNum);
        // Convertir a UTC y formatear sin ms
        const output = start.toUTC().toISO({ suppressMilliseconds: true });
        if (!output) {
            const err = { error: 'InvalidParameters', message: 'No se pudo formatear la fecha resultado' };
            return res.status(500).json(err);
        }
        const success = { date: output };
        return res.status(200).json(success);
    }
    catch (err) {
        const error = {
            error: 'InvalidParameters',
            message: String(err?.message ?? err),
        };
        return res.status(400).json(error);
    }
});
// Solo arrancar servidor si ejecutamos node dist/index.js (local dev)
if (require.main === module) {
    const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
    app.listen(PORT, () => {
        console.log(`Listening on http://localhost:${PORT}`);
    });
}
exports.default = app;
