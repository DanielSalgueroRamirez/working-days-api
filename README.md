# 📅 Working Days API

API serverless en **AWS Lambda + API Gateway** que calcula fechas hábiles en Colombia, teniendo en cuenta:

- Horario laboral (Lunes–Viernes, 08:00–12:00 y 13:00–17:00, hora Bogotá).
- Fines de semana.
- Festivos colombianos (archivo `holidaysCache.json` incluido).

Construido en **Node.js 18, TypeScript, AWS CDK**.

---

## 🚀 Arquitectura

- **AWS Lambda** → Ejecuta la lógica de negocio.
- **API Gateway** → Expone la API REST.
- **CDK** → Infraestructura como código.
- **Luxon** → Manejo de fechas y zonas horarias.
- **Axios** → Descarga de festivos externos (con fallback local en `holidaysCache.json`).

---

## 📂 Estructura del proyecto

```
working-days-api
├─ src
│  ├─ index.ts
│  ├─ workingDays.ts
│  ├─ holidaysCache.json
├─ infra
│  └─ infra-stack.ts
├─ test
│  └─ workingDays.test.ts
├─ README.md
└─ tsconfig.json

```

---

## ⚙️ Instalación local

1. Clonar repositorio:

```bash
git clone <repo-url>
cd WORKING-DAYS-API
```

2. Instalar dependencias:

```bash
npm install
```

3. Ejecutar en local (con ts-node):

```bash
npx ts-node src/index.ts
```

---

## ☁️ Despliegue en AWS

Este proyecto usa **AWS CDK**. Asegúrate de tener configuradas tus credenciales (`aws configure`).

1. **Bootstrap (una sola vez por cuenta/región):**

```bash
cdk bootstrap
```

2. **Desplegar la infraestructura:**

```bash
cdk deploy
```

Al terminar, verás en consola la **URL del API Gateway**, algo como:

```
Outputs:
WorkingDaysApiUrl = https://xxxxxx.execute-api.us-east-1.amazonaws.com/prod/
```

---

## 🔗 Uso de la API

---
## 🌐 URL de la API desplegada

La API está disponible públicamente en: https://zly8gom93k.execute-api.us-east-1.amazonaws.com/prod/api/calculate

### Endpoint principal
```
GET /api/calculate
```

### Parámetros
- `days` → Días hábiles a sumar (int).
- `hours` → Horas hábiles a sumar (int).
- `date` → (opcional) Fecha inicial en formato ISO UTC.  
  Si no se envía, se toma la hora actual en Bogotá.

### Ejemplo
```
GET https://zly8gom93k.execute-api.us-east-1.amazonaws.com/prod/api/calculate?days=1&hours=4&date=2025-08-05T20:00:00Z
```

### Respuesta
```json
  {
    "date": "2025-08-05T20:00:00Z"
  }
```

> 📌 En este caso, el 7 de agosto es festivo → se salta al 8 de agosto.

---

## 🧪 Pruebas locales

Este proyecto incluye **Jest**.

Ejecutar pruebas:

```bash
npm test
```

Ejemplo de test en `test/workingDays.test.ts`:

```ts
import { DateTime } from "luxon";
import { loadHolidays, addBusinessDays, addBusinessHours } from "../src/workingDays";

test("calcula fecha correcta para 1 día y 4 horas desde 2025-08-05T20:00:00Z", async () => {
  const holidays = await loadHolidays();
  const start = DateTime.fromISO("2025-08-05T20:00:00Z");
  let result = addBusinessDays(holidays, start, 1);
  result = addBusinessHours(holidays, result, 4);

  expect(result.toISO()).toBe("2025-08-08T15:00:00.000Z");
});
```

---

## 📌 Notas

- Si falla la descarga de festivos externos, el sistema usa el `holidaysCache.json` embebido en el bundle.
- El Lambda copia este archivo en cada despliegue (ver `infra-stack.ts`).
- Horario laboral configurable en `workingDays.ts`.

---

## 🛠 Tecnologías

- AWS Lambda
- AWS API Gateway
- AWS CDK
- Node.js 18
- TypeScript
- Luxon
- Axios
- Jest

---

## 👨‍💻 Autor
Daniel Eduardo Salguero Ramirez.
Desarrollado para la prueba técnica **Working Days API** 🚀
