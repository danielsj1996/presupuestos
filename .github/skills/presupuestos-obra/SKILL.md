---
name: presupuestos-obra
description: Genera y revisa presupuestos de materiales y gastos semanales para obras, con cantidades, precios unitarios, subtotales, impuestos, contingencia y resumen por partida.
---

# Presupuestos de obra

Usa esta skill cuando el usuario necesite estimar, ordenar, revisar o comparar costes de una obra. Puede tratarse de una compra de materiales, de los gastos de una semana concreta o de ambos.

## Objetivos

- Convertir una descripción informal de la obra en un presupuesto trazable.
- Separar materiales, mano de obra, maquinaria, transporte, permisos y otros gastos.
- Mostrar cantidades, unidades, precios unitarios, subtotales y supuestos.
- Evitar inventar precios o cantidades: pedir los datos que falten o marcarlos como estimados.
- Entregar un resumen útil para aprobar compras y controlar el gasto real.

## Flujo de trabajo

1. Identifica el alcance:
   - **Materiales**: compras necesarias para ejecutar una partida o fase.
   - **Gastos semanales**: costes incurridos o previstos durante una semana.
   - **Mixto**: materiales más personal, maquinaria, transporte u otros costes.
2. Confirma, si están disponibles, la moneda, el país o región, si los precios incluyen impuestos, las fechas, el nombre de la obra y la fase o partida.
3. Extrae cada concepto como una línea con descripción, categoría, cantidad, unidad, precio unitario y fuente o estado del precio.
4. Si falta información esencial, formula preguntas concretas. Si el usuario pide una estimación inmediata, usa una hipótesis explícita y marca la línea como `estimada`.
5. Calcula cada subtotal, los ajustes y el total. Conserva el detalle suficiente para poder auditar el resultado.
6. Presenta primero un resumen ejecutivo y después el desglose. Cierra con supuestos, datos pendientes y próximos controles.

## Datos mínimos

Para cada línea intenta obtener:

- Descripción del concepto.
- Categoría: `material`, `mano de obra`, `maquinaria`, `transporte`, `herramienta`, `permiso`, `servicio` u `otro`.
- Cantidad y unidad: `ud`, `m`, `m²`, `m³`, `kg`, `h`, `día`, `semana`, etc.
- Precio unitario y moneda.
- Fecha o periodo del gasto.
- Estado del precio: `cotizado`, `factura`, `estimado` o `pendiente`.
- Proveedor, factura o referencia, cuando exista.

Para un presupuesto semanal añade la semana o rango de fechas y, cuando sea posible, el estado `previsto`, `pagado` o `pendiente`.

## Cálculos

Calcula cada línea así:

`Subtotal = Cantidad × Precio unitario`

Si hay desperdicio o merma:

`Cantidad ajustada = Cantidad × (1 + Porcentaje de merma / 100)`

Aplica la merma antes de multiplicar por el precio unitario y muestra el porcentaje utilizado. No la apliques a mano de obra, transporte u otros conceptos si no corresponde.

Si el usuario proporciona un descuento:

`Base con descuento = Subtotal de líneas - Descuento`

Si se solicita contingencia:

`Contingencia = Base antes de impuestos × Porcentaje de contingencia / 100`

Si los precios son sin impuestos:

`Impuestos = Base imponible × Tipo de impuesto / 100`

`Total = Base imponible + Contingencia + Impuestos`

Aclara siempre si la contingencia está sujeta a impuestos. Redondea las líneas a dos decimales para presentar el presupuesto, pero evita redondeos intermedios innecesarios. Si la moneda o el tipo de impuesto no están confirmados, no los inventes.

## Formato de salida

Usa este orden:

### Resumen

- Obra y periodo.
- Tipo de presupuesto.
- Moneda y tratamiento de impuestos.
- Total de materiales.
- Total de mano de obra.
- Total de maquinaria, transporte y otros.
- Contingencia, si aplica.
- Impuestos, si aplica.
- **Total estimado o total real**.

### Desglose

Presenta una tabla con estas columnas:

| # | Categoría | Concepto | Cantidad | Unidad | Precio unitario | Merma | Subtotal | Estado |
|---|---|---|---:|---|---:|---:|---:|---|

En un presupuesto semanal, añade `Semana/fecha`, `Estado de pago` y `Proveedor` si el volumen de información lo justifica. Agrupa el resumen por categoría y, si ayuda al control, por partida de obra.

### Supuestos y pendientes

Indica por separado:

- Datos proporcionados por el usuario.
- Precios o cantidades estimados.
- Cotizaciones o facturas que faltan.
- Riesgos de variación: transporte, cambios de alcance, inflación, desperdicio, alquiler o disponibilidad.
- Qué dato debe confirmarse antes de comprar o pagar.

## Reglas de calidad

- No mezcles importes con impuestos incluidos y excluidos sin etiquetarlos.
- No presentes un total como cerrado si contiene líneas estimadas o pendientes.
- No confundas cantidad de compra con rendimiento de instalación.
- Separa materiales reutilizables, consumibles y alquileres.
- Detecta unidades incompatibles, cantidades cero o negativas y precios sin moneda.
- Señala duplicados y líneas que parezcan incluir transporte o impuestos dos veces.
- Para una semana cerrada, distingue coste previsto, coste comprometido y coste pagado cuando los datos lo permitan.
- Si el usuario entrega una foto, PDF o lista de factura, transcribe solo lo legible y marca lo dudoso para confirmación.

## Plantilla de entrada rápida

Cuando el usuario no tenga una estructura preparada, pide o propone completar:

```text
Obra:
Tipo: materiales / gastos semanales / mixto
Periodo o semana:
Moneda:
¿Precios con impuestos?: sí / no / no sé
¿Contingencia?: porcentaje o no
Conceptos:
- descripción | cantidad | unidad | precio unitario | categoría | estado
```

## Plantilla de respuesta compacta

```text
Presupuesto: [obra]
Periodo: [periodo]
Moneda: [moneda]
Base: [importe]
Contingencia: [importe o no aplica]
Impuestos: [importe o no confirmados]
TOTAL: [importe]

[tabla de desglose]

Supuestos: [lista breve]
Pendientes: [lista breve]
```