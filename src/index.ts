import express, { Request, Response } from 'express';
import { DateTime } from 'luxon';
import {
  loadHolidays,
  adjustToPreviousWorkingTime,
  addBusinessDays,
  addBusinessHours,
} from './workingDays';
import { ApiResponseError, ApiResponseSuccess } from './types';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = express();

let holidaysSet: Set<string> | null = null;

loadHolidays()
  .then((s) => {
    holidaysSet = s;
    console.log('[OK] Festivos cargados:', s.size);
  })
  .catch((err) => {
    console.error('[ERROR] No se pudieron cargar festivos:', err.message || err);
    holidaysSet = null;
  });

app.get('/api/calculate', (req: Request, res: Response) => {
  try {
    const { days, hours, date } = req.query;

    if (!days && !hours) {
      const err: ApiResponseError = {
        error: 'InvalidParameters',
        message: 'Debe proveer al menos days o hours',
      };
      return res.status(400).json(err);
    }

    const daysNum = days ? parseInt(String(days), 10) : 0;
    const hoursNum = hours ? parseInt(String(hours), 10) : 0;

    if (
      (days && (isNaN(daysNum) || daysNum < 0)) ||
      (hours && (isNaN(hoursNum) || hoursNum < 0))
    ) {
      const err: ApiResponseError = {
        error: 'InvalidParameters',
        message: 'days/hours deben ser enteros no negativos',
      };
      return res.status(400).json(err);
    }

    if (date && typeof date !== 'string') {
      const err: ApiResponseError = {
        error: 'InvalidParameters',
        message: 'date debe ser una cadena ISO UTC con Z',
      };
      return res.status(400).json(err);
    }

    if (!holidaysSet) {
      const err: ApiResponseError = {
        error: 'FetchError',
        message: 'No se pudieron cargar los días festivos.',
      };
      return res.status(503).json(err);
    }

    let start = date
      ? DateTime.fromISO(String(date), { zone: 'utc' }).setZone('America/Bogota')
      : DateTime.now().setZone('America/Bogota');

    start = adjustToPreviousWorkingTime(holidaysSet, start);

    if (daysNum > 0) start = addBusinessDays(holidaysSet, start, daysNum);
    if (hoursNum > 0) start = addBusinessHours(holidaysSet, start, hoursNum);

    const output = start.toUTC().toISO({ suppressMilliseconds: true });
    if (!output) {
      const err: ApiResponseError = {
        error: "InvalidParameters",
        message: "No se pudo convertir la fecha a ISO",
      };
      return res.status(400).json(err);
    }
const success: ApiResponseSuccess = { date: output };
    return res.status(200).json(success);
  } catch (err: any) {
    const error: ApiResponseError = {
      error: 'InvalidParameters',
      message: String(err?.message ?? err),
    };
    return res.status(400).json(error);
  }
});

app.listen(PORT, () =>
  console.log(`Listening on http://localhost:${PORT}`),
);
