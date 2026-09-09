# Obra Clara API

API inicial para conectar el frontend con PostgreSQL.

## Ejecutar

```powershell
Copy-Item .env.example .env
npm install
npm start
```

La API queda disponible en `http://localhost:3000`.

El mismo servidor entrega el frontend organizado en `../frontend`, por lo que la aplicación web se abre en:

`http://localhost:3000`

## Rutas principales

- `GET /api/health`
- `GET|POST /api/clients`
- `PATCH|DELETE /api/clients/:id`
- `GET|POST /api/architects`
- `PATCH|DELETE /api/architects/:id`
- `GET /api/clients/:id/budgets`
- `POST /api/budgets`

El endpoint de presupuestos crea o reutiliza la obra y guarda el presupuesto y todas sus partidas dentro de una transacción PostgreSQL.

## Prueba completa local

Desde la raíz del proyecto:

```powershell
docker compose up -d
cd backend
npm start
```

Después abrir `http://localhost:3000` en el navegador. La comprobación de la API está disponible en `http://localhost:3000/api/health`.
