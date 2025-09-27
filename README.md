# Working Days API (Colombia) — README

API REST escrita **en TypeScript** para calcular fechas y horas hábiles en Colombia (zona `America/Bogota`) y devolver la fecha resultado en **UTC (ISO 8601 con sufijo `Z`)**.

> Reglas principales:
> - Días hábiles: lunes–viernes (se excluyen sábados y domingos).
> - Horario laboral: **08:00–12:00** y **13:00–17:00** (hora Colombia). Almuerzo 12:00–13:00 no laborable.
> - Si la fecha inicial está fuera del horario laboral o no es día laboral, se **aproxima hacia atrás** al instante laboral más cercano.
> - Se excluyen **festivos nacionales** usando el recurso `https://content.capta.co/Recruitment/WorkingDays.json`. Se incluye un `holidaysCache.json` como fallback.

---

## Contenido del repositorio

Estructura:

```
.
├─ package.json
├─ tsconfig.json
├─ README.md
├─ src/
│  ├─ index.ts          # servidor + endpoint
│  ├─ workingDays.ts    # lógica de negocio
│  ├─ types.ts
│  ├─ holidaysCache.json
│  └─ lambda.ts         # (opcional, para AWS Lambda)
└─ .gitignore
```

---

## Requisitos (prerrequisitos)

- Node.js **>= 18** (recomendado LTS)
- npm (v8+)
- git
- (Opcional) VS Code
- (Opcional para bonus) AWS CLI + AWS CDK v2, cuenta AWS con permisos para desplegar (CloudFormation, Lambda, API Gateway)

> Recomiendo usar `nvm` para controlar la versión de Node:
> ```bash
> nvm install 18
> nvm use 18
> ```

---

## Configuración local (instalación y ejecución)

1. **Clonar el repo**
```bash
git clone https://github.com/<TU-USUARIO>/working-days-api.git
cd working-days-api
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Obtener `holidaysCache.json` (backup de festivos)**
- Descargar el JSON oficial y guardarlo en `src/holidaysCache.json`:
  - Abrir en el navegador: `https://content.capta.co/Recruitment/WorkingDays.json`
  - Guardar su contenido en `src/holidaysCache.json`
- Alternativa (desde la terminal):
```bash
curl -o src/holidaysCache.json "https://content.capta.co/Recruitment/WorkingDays.json"
```
> Importante: commitear `src/holidaysCache.json` para garantizar determinismo en la evaluación.

4. **Scripts disponibles**
- Desarrollo (hot reload):
```bash
npm run dev
```
- Compilar TypeScript:
```bash
npm run build
```
- Ejecutar la build (producción):
```bash
npm start
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```
Por defecto el servidor escucha en `http://localhost:3000`. Endpoint principal:
```
GET /api/working-date
```

---

## Contrato de la API

### Query parameters (exactos)
- `days` — opcional, entero no negativo. Número de **días hábiles** a sumar.
- `hours` — opcional, entero no negativo. Número de **horas hábiles** a sumar.
- `date` — opcional, **ISO 8601 en UTC con sufijo Z**. Si se provee, se convierte a hora local Colombia y se usan las reglas de negocio; si no se provee, se usa la hora actual en Colombia.

**Reglas de aplicación**: si se envían ambos `days` y `hours`, aplicar `days` primero y luego `hours`. Si no se envía ninguno, la API devuelve error.

---

### Respuesta exitosa (200 OK) — **OBLIGATORIO** EXACTO
```json
{ "date": "2025-08-01T14:00:00Z" }
```
- Única clave: `date`.
- Valor: ISO 8601 UTC con sufijo `Z`. **Sin milisegundos** (se debe suprimir ms).

### Errores (ejemplo)
Código de error → JSON body:
```json
{ "error": "InvalidParameters", "message": "Detalle del error" }
```
Y en caso de fallo en carga de festivos:
```json
{ "error": "FetchError", "message": "No se pudieron cargar los días festivos." }
```

---

## Ejemplos de uso (curl)

> Nota: las fechas en el `date` deben ser UTC (`Z`). Colombia = UTC-5.

1. Sumar 1 hora desde viernes 5:00 p.m. (ejemplo):
```bash
curl "http://localhost:3000/api/working-date?hours=1&date=2025-08-01T22:00:00Z"
```

2. Sumar 1 día desde un domingo 6:00 p.m.:
```bash
curl "http://localhost:3000/api/working-date?days=1&date=2025-08-03T23:00:00Z"
```

3. Caso del enunciado con festivos:
```bash
curl "http://localhost:3000/api/working-date?days=5&hours=4&date=2025-04-10T15:00:00Z"
```

4. Prueba extrema ejemplo:
```bash
curl "http://localhost:3000/api/working-date?days=10&hours=15&date=2025-04-17T23:00:00Z"
```

## Consideraciones de TypeScript / configuración

`tsconfig.json` recomendado (ya incluido):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

Problemas comunes y soluciones:
- Si te pide tipos para `luxon`:
  ```bash
  npm i -D @types/luxon
  ```
- Si aparecen errores sobre módulos/ESM: usa `"module": "CommonJS"` + `"esModuleInterop": true` y no pongas `"type": "module"` en `package.json` (a menos que quieras usar ESM; en ese caso ajusta `tsconfig` a `module: "ESNext"` y agrega `"type": "module"` en `package.json`).

---

## Despliegue (rápido) — Render / Railway / Vercel

### Recomendación: Render o Railway (más directos para un Express)
**Render**
1. Crear cuenta en https://render.com
2. New → **Web Service** → Connect GitHub → seleccionar repo.
3. Build Command:
   ```bash
   npm ci && npm run build
   ```
4. Start Command:
   ```bash
   npm start
   ```
5. Set Node version (opcional) en `package.json`:
   ```json
   "engines": { "node": "18.x" }
   ```
6. Desplegar y obtener la URL pública (ej.: `https://working-days-api.onrender.com/api/working-date`).

**Railway**
- Similar: New Project → Deploy from GitHub → define build/start commands iguales.

### Vercel (si quieres serverless)
- Vercel prefiere funciones sin Express. Para usar tu Express puedes:
  - Convertir el servidor a handler serverless con `serverless-http` y exponer en `/api`.
  - O reescribir como una función que importe la lógica desde `workingDays.ts`.

---

## Bonus — Desplegar como AWS Lambda utilizando AWS CDK (guía resumida)

### 1) Adaptar el proyecto para Lambda
- Instalar wrapper:
```bash
npm install serverless-http
```

- Crear `src/lambda.ts` (handler):
```ts
import serverless from 'serverless-http';
import app from './index'; // exporta el express app desde index.ts en vez de app.listen
export const handler = serverless(app);
```

> Nota: modifica `src/index.ts` para exportar `app` (Express) sin hacer `listen()` cuando el entorno sea Lambda. Por ejemplo:
```ts
// if (require.main === module) app.listen(PORT);
export default app;
```

### 2) CDK stack (TypeScript) — ejemplo simplificado
Instalar dependencias:
```bash
npm install aws-cdk-lib constructs
npm i -D aws-cdk
npm install aws-lambda aws-lambda-nodejs esbuild
```

Archivo `lib/working-days-stack.ts`:
```ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export class WorkingDaysStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiLambda = new lambdaNodejs.NodejsFunction(this, 'WorkingDaysFunction', {
      entry: 'src/lambda.ts', // punto de entrada
      handler: 'handler',
      runtime: lambdaNodejs.Runtime.NODEJS_18_X,
      bundling: {
        minify: true,
      },
    });

    new apigw.LambdaRestApi(this, 'WorkingDaysApi', {
      handler: apiLambda,
      proxy: true,
    });
  }
}
```

### 3) Build & Deploy
```bash
npm run build        # compila TypeScript
cd cdk               # si tu app CDK está en subcarpeta
cdk bootstrap
cdk deploy
```

> Resultado: URL de API Gateway pública. Prueba con `curl` igual que antes.

---

## Seguridad y límites operativos

- **Rate limiting**: si el endpoint será público, añade un rate limiter (p. ej. `express-rate-limit`) para evitar abuso.
- **Caching**: cachea la lista de festivos en memoria con TTL o usa un almacenamiento (S3/Redis) para evitar depender de la URL externa en cada arranque.
- **Logs y monitoreo**: en producción añade logs estructurados y un plan de alertas.

---

## `.gitignore` recomendado
```
node_modules
dist
.env
.vscode
npm-debug.log
```
si