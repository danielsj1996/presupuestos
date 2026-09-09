# PostgreSQL local

La base de datos del proyecto usa PostgreSQL 16 mediante Docker Compose.

## Requisito

Tener instalado Docker Desktop y que esté iniciado.

## Iniciar

Desde la carpeta del proyecto:

```powershell
docker compose up -d
```

La base queda disponible en `localhost:55432` con estos datos de desarrollo:

- Base: `obra_clara`
- Usuario: `obra_clara_app`
- Contraseña: `obra_clara_dev`
- Puerto externo: `55432` (`5432` dentro del contenedor)

El esquema se crea automáticamente desde `database/init/001_schema.sql` la primera vez que se crea el volumen.

## Detener

```powershell
docker compose down
```

Para borrar también los datos locales y recrear la base desde cero:

```powershell
docker compose down -v
```

## Modelo inicial

- `clients`: titulares o clientes.
- `architects`: profesionales y matrícula.
- `projects`: obra vinculada a cliente y arquitecto.
- `budgets`: presupuesto de materiales o semanal, siempre en ARS.
- `budget_items`: partidas y cálculo de cada línea.

El frontend actual todavía guarda datos en `localStorage`. El siguiente paso será crear una API para leer y escribir estas tablas; las credenciales de PostgreSQL no deben exponerse en el navegador.
