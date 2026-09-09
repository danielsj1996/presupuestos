const workspace = document.querySelector('#workspace');
const cards = document.querySelectorAll('[data-view]');
const mainCards = document.querySelectorAll('[data-main-view]');

const state = {
  materials: [
    { description: 'Cemento gris 25 kg', category: 'Material', quantity: 20, unit: 'bolsas', price: 7.4, status: 'Cotizado' },
    { description: 'Arena de río', category: 'Material', quantity: 2, unit: 'm³', price: 31, status: 'Estimado' }
  ],
  weekly: [
    { description: 'Jornada oficial de albañilería', category: 'Mano de obra', quantity: 3, unit: 'días', price: 145, status: 'Pagado' },
    { description: 'Alquiler de hormigonera', category: 'Maquinaria', quantity: 1, unit: 'semana', price: 86, status: 'Pendiente' }
  ]
};

const directory = JSON.parse(localStorage.getItem('obraClaraDirectory') || '{"clients":[],"architects":[]}');
const budgets = JSON.parse(localStorage.getItem('obraClaraBudgets') || '[]');
const activeProfiles = { client: null, architect: null };
let currentEditingBudgetId = null;

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const today = new Date().toISOString().slice(0, 10);

function formatCurrency(value) {
  return currency.format(value).replace(' ', ' ');
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function capitalizeName(value = '') {
  return value.toLocaleLowerCase('es-AR').replace(/(^|[\s'-])([a-záéíóúüñ])/g, (_, separator, letter) => `${separator}${letter.toLocaleUpperCase('es-AR')}`);
}

function formatCuit(value = '') {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  if (digits.length === 10) return `${digits.slice(0, 2)}-${digits.slice(2, -1)}-${digits.slice(-1)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, -1)}-${digits.slice(-1)}`;
}

function bindInputFormatting() {
  workspace.querySelectorAll('[data-name-field]').forEach(field => field.addEventListener('input', event => {
    event.target.value = capitalizeName(event.target.value);
  }));
  workspace.querySelectorAll('[data-cuit-field]').forEach(field => field.addEventListener('input', event => {
    event.target.value = formatCuit(event.target.value);
  }));
}

function saveDirectory() {
  localStorage.setItem('obraClaraDirectory', JSON.stringify(directory));
}

function saveActiveProfile(kind, index) {
  const saved = JSON.parse(localStorage.getItem('obraClaraActiveProfiles') || '{}');
  saved[kind] = index;
  localStorage.setItem('obraClaraActiveProfiles', JSON.stringify(saved));
}

function profileValue(profile, key) {
  return escapeHtml(profile?.[key] || '');
}

function renderPanel(type) {
  const isMaterials = type === 'materials';
  workspace.dataset.panelType = type;
  workspace.innerHTML = `
    <div class="form-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">${isMaterials ? 'Nuevo presupuesto' : 'Control semanal'}</p>
          <h2>${isMaterials ? 'Añadir materiales' : 'Registrar trabajo o gasto'}</h2>
          <span class="currency-label">ARS · pesos argentinos</span>
        </div>
        <div class="panel-actions">
          <button class="preview-panel" type="button" data-preview data-requires-profiles disabled>Vista previa PDF</button>
          <button class="save-panel" type="button" data-save-budget data-requires-profiles disabled>Guardar presupuesto</button>
          <button class="print-panel" type="button" data-print data-requires-profiles disabled>Descargar PDF</button>
          <button class="close-panel" type="button" data-close>Cerrar panel ×</button>
        </div>
      </div>
      <div class="letterhead-form">
        <div class="form-block-title">Datos del membrete del PDF</div>
        <div class="form-grid letterhead-grid">
          <div class="field">
            <label for="profile-client">Cliente registrado</label>
            <select id="profile-client" data-profile-select="client"><option value="">Elegir cliente...</option>${directory.clients.map((profile, index) => `<option value="${index}" ${activeProfiles.client === profile ? 'selected' : ''}>${escapeHtml(profile.name)}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label for="profile-architect">Arquitecto registrado</label>
            <select id="profile-architect" data-profile-select="architect"><option value="">Elegir arquitecto...</option>${directory.architects.map((profile, index) => `<option value="${index}" ${activeProfiles.architect === profile ? 'selected' : ''}>${escapeHtml(profile.name)}</option>`).join('')}</select>
          </div>
          <div class="field wide">
            <label for="project-name">Nombre de la obra</label>
            <input id="project-name" data-project-name placeholder="Ej. Vivienda familiar · Etapa 1" required>
          </div>
          <div class="profile-selection-note" data-profile-requirement>Completa el nombre de la obra y selecciona un cliente y un arquitecto.</div>
          ${isMaterials ? `
            <div class="field">
              <label for="print-date">Fecha de impresión</label>
              <input id="print-date" data-meta="printDate" type="date" value="${today}">
            </div>` : `
            <div class="field">
              <label for="period-type">Periodo del PDF</label>
              <select id="period-type" data-meta="periodType">
                <option value="number">Semana numerada</option>
                <option value="range">Rango de fechas</option>
              </select>
            </div>
            <div class="field" data-week-number-field>
              <label for="week-number">Semana</label>
              <select id="week-number" data-meta="weekNumber">${Array.from({ length: 52 }, (_, index) => `<option value="${index + 1}">Semana ${index + 1}</option>`).join('')}</select>
            </div>
            <div class="field is-hidden" data-week-range-field>
              <label for="week-start">Desde</label>
              <input id="week-start" data-meta="weekStart" type="date">
            </div>
            <div class="field is-hidden" data-week-range-field>
              <label for="week-end">Hasta</label>
              <input id="week-end" data-meta="weekEnd" type="date">
            </div>`}
        </div>
      </div>
      <div class="print-letterhead">
        <div class="print-letterhead-top"><span>OBRA CLARA · ${isMaterials ? 'MATERIALES' : 'JORNALES Y GASTOS'}</span><strong data-print-period></strong></div>
        <div class="print-letterhead-title"><span>Obra</span><h3 data-print-project>Nombre de la obra</h3><p data-print-holder>Cliente: Titular de la obra</p></div>
        <div class="print-architect"><div class="print-architect-name"><span class="print-label">Arquitecto/a</span><strong data-print-architect>Arquitecto/a sin informar</strong></div><div class="print-professional-data"><div><span class="print-label">CUIL</span><span data-print-cuil>Sin informar</span></div><div><span class="print-label">Teléfono</span><span data-print-phone>Sin informar</span></div><div><span class="print-label">Mail</span><span data-print-email>Sin informar</span></div><div><span class="print-label">Matrícula profesional</span><span data-print-license>Sin informar</span></div></div></div>
      </div>
      <form class="line-form" data-form="${type}">
        <div class="form-grid">
          <div class="field wide">
            <label for="description">Concepto</label>
            <input id="description" name="description" placeholder="Ej. Ladrillo hueco 8 cm" required>
          </div>
          <div class="field">
            <label for="category">Categoría</label>
            <select id="category" name="category">
              ${isMaterials ? '<option>Material</option><option>Herramienta</option><option>Transporte</option><option>Otro</option>' : '<option>Mano de obra</option><option>Maquinaria</option><option>Transporte</option><option>Servicio</option><option>Otro</option>'}
            </select>
          </div>
          <div class="field">
            <label for="quantity">Cantidad</label>
            <input id="quantity" name="quantity" type="number" min="0.01" step="0.01" placeholder="0" required>
          </div>
          <div class="field">
            <label for="unit">Unidad</label>
            <input id="unit" name="unit" placeholder="bolsas / ud / h" required>
          </div>
          <div class="field">
            <label for="price">Precio unitario</label>
            <input id="price" name="price" type="number" min="0" step="0.01" placeholder="0,00" required>
          </div>
          <div class="field">
            <label for="status">Estado</label>
            <select id="status" name="status">
              ${isMaterials ? '<option>Cotizado</option><option>Estimado</option><option>Pendiente</option>' : '<option>Pagado</option><option>Pendiente</option><option>Previsto</option>'}
            </select>
          </div>
          <button class="add-row" type="submit" data-requires-profiles disabled>+ Añadir línea</button>
        </div>
      </form>
      <div class="entries">
        <div class="entries-head">
          <h3>${isMaterials ? 'Partidas de compra' : 'Actividad de la semana'}</h3>
          <span class="total" data-total></span>
        </div>
        <table class="entry-table">
          <thead><tr><th>Concepto</th><th>Categoría</th><th>Cantidad</th><th>Estado</th><th>Importe</th></tr></thead>
          <tbody data-rows></tbody>
        </table>
        <div class="summary-bar"><span>Moneda: ARS · pesos argentinos</span><span>${isMaterials ? 'Total estimado' : 'Total registrado'} <strong data-summary></strong></span></div>
      </div>
      <div class="print-document-footer"><span>Obra Clara · Documento generado el ${formatDate(today)}</span><span>Página 1</span></div>
    </div>`;

  renderRows(type);
  updatePrintMetadata(type);
  workspace.querySelector('[data-close]').addEventListener('click', closePanel);
  workspace.querySelector('[data-preview]').addEventListener('click', () => showPdfPreview(type));
  workspace.querySelector('[data-save-budget]').addEventListener('click', () => saveBudget(type));
  workspace.querySelector('[data-print]').addEventListener('click', () => window.print());
  workspace.querySelector('[data-form]').addEventListener('submit', event => addEntry(event, type));
  workspace.querySelectorAll('[data-profile-select]').forEach(select => select.addEventListener('change', event => applyProfile(event.target.dataset.profileSelect, event.target.value)));
  workspace.querySelector('[data-project-name]').addEventListener('input', () => {
    updateActionAvailability();
    updatePrintMetadata(type);
  });
  bindInputFormatting();
  updateActionAvailability();
  const periodType = workspace.querySelector('[data-meta="periodType"]');
  if (periodType) periodType.addEventListener('change', () => toggleWeekFields(periodType.value));
  workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getBudgetPeriod(type) {
  if (type === 'materials') return `Impreso el ${formatDate(workspace.querySelector('[data-meta="printDate"]')?.value || today)}`;
  if (workspace.querySelector('[data-meta="periodType"]')?.value === 'range') return `Del ${formatDate(workspace.querySelector('[data-meta="weekStart"]')?.value)} al ${formatDate(workspace.querySelector('[data-meta="weekEnd"]')?.value)}`;
  return `Semana ${workspace.querySelector('[data-meta="weekNumber"]')?.value || '1'}`;
}

function saveBudget(type) {
  if (!hasRequiredProfiles()) return;
  const total = state[type].reduce((sum, entry) => sum + entry.quantity * entry.price, 0);
  const record = {
    id: currentEditingBudgetId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    type,
    project: workspace.querySelector('[data-project-name]').value.trim(),
    client: { ...activeProfiles.client },
    architect: { ...activeProfiles.architect },
    period: getBudgetPeriod(type),
    entries: state[type].map(entry => ({ ...entry })),
    total,
    createdAt: today
  };
  const existingIndex = budgets.findIndex(budget => budget.id === currentEditingBudgetId);
  if (existingIndex >= 0) budgets[existingIndex] = record;
  else budgets.push(record);
  localStorage.setItem('obraClaraBudgets', JSON.stringify(budgets));
  const saveButton = workspace.querySelector('[data-save-budget]');
  saveButton.textContent = existingIndex >= 0 ? 'Cambios guardados' : 'Presupuesto guardado';
  saveButton.disabled = true;
  currentEditingBudgetId = record.id;
}

function renderDirectoryRecords() {
  const records = document.querySelector('#directory-records');
  if (!records) return;
  const isClient = document.body.classList.contains('client-page');
  const collection = isClient ? directory.clients : directory.architects;
  const title = isClient ? 'Clientes guardados' : 'Arquitectos guardados';
  records.innerHTML = `<div class="history-heading"><div><p class="eyebrow">Registros persistidos</p><h2>${title}</h2></div><span>${collection.length} ${collection.length === 1 ? 'registro' : 'registros'}</span></div>${collection.length ? `<div class="history-list directory-record-list">${collection.map(profile => `<article class="history-item"><div><h3>${escapeHtml(profile.name)}</h3><p>${escapeHtml(profile.email || 'Sin mail')} · ${escapeHtml(profile.phone || 'Sin teléfono')}${isClient ? '' : ` · ${escapeHtml(profile.license || 'Sin matrícula')}`}</p></div><span class="history-type">Guardado</span></article>`).join('')}</div>` : '<p class="directory-empty">Todavía no hay registros guardados.</p>'}`;
}

function renderBudgetHistoryPanel() {
  workspace.innerHTML = `<div class="history-panel"><div class="panel-header"><div><p class="eyebrow">Registro persistido</p><h2>Historial de presupuestos</h2></div><button class="close-panel" type="button" data-close>Cerrar panel ×</button></div><div class="history-filter"><label for="history-client">Elegir cliente</label><select id="history-client"><option value="">Seleccionar cliente...</option>${directory.clients.map((client, index) => `<option value="${index}">${escapeHtml(client.name)}</option>`).join('')}</select></div><div data-history-results><p class="directory-empty">Selecciona un cliente para ver sus presupuestos.</p></div></div>`;
  workspace.querySelector('[data-close]').addEventListener('click', closePanel);
  workspace.querySelector('#history-client').addEventListener('change', event => renderBudgetHistoryResults(event.target.value));
  workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderBudgetHistoryResults(clientIndex) {
  const results = workspace.querySelector('[data-history-results]');
  if (!results) return;
  const client = directory.clients[Number(clientIndex)];
  const records = client ? budgets.filter(budget => budget.client.name === client.name).slice().reverse() : [];
  results.innerHTML = records.length ? `<div class="history-list budget-history-list">${records.map(record => `<article class="history-item"><div><span class="history-type">${record.type === 'materials' ? 'Materiales' : 'Jornales y gastos'}</span><h3>${escapeHtml(record.project)}</h3><p>${escapeHtml(record.period)} · ${escapeHtml(record.architect.name)}</p></div><div class="history-record-actions"><strong>${formatCurrency(record.total)}</strong><button type="button" data-budget-action="view" data-budget-id="${record.id}">Ver</button><button type="button" data-budget-action="edit" data-budget-id="${record.id}">Modificar</button><button type="button" data-budget-action="delete" data-budget-id="${record.id}">Borrar</button></div></article>`).join('')}</div>` : '<p class="directory-empty">Este cliente todavía no tiene presupuestos guardados.</p>';
  results.querySelectorAll('[data-budget-action]').forEach(button => button.addEventListener('click', () => handleBudgetAction(button.dataset.budgetAction, button.dataset.budgetId)));
}

function handleBudgetAction(action, id) {
  const record = budgets.find(budget => budget.id === id);
  if (!record) return;
  if (action === 'delete') {
    budgets.splice(budgets.indexOf(record), 1);
    localStorage.setItem('obraClaraBudgets', JSON.stringify(budgets));
    renderBudgetHistoryPanel();
    return;
  }
  loadBudgetRecord(record);
  if (action === 'view') showPdfPreview(record.type);
}

function loadBudgetRecord(record) {
  currentEditingBudgetId = record.id;
  state[record.type] = record.entries.map(entry => ({ ...entry }));
  renderPanel(record.type);
  const project = workspace.querySelector('[data-project-name]');
  project.value = record.project;
  const clientIndex = directory.clients.findIndex(client => client.name === record.client.name);
  const architectIndex = directory.architects.findIndex(architect => architect.name === record.architect.name);
  if (clientIndex >= 0) workspace.querySelector('[data-profile-select="client"]').value = String(clientIndex);
  if (architectIndex >= 0) workspace.querySelector('[data-profile-select="architect"]').value = String(architectIndex);
  if (clientIndex >= 0) applyProfile('client', clientIndex);
  if (architectIndex >= 0) applyProfile('architect', architectIndex);
  renderRows(record.type);
  updatePrintMetadata(record.type);
  updateActionAvailability();
}

function applyProfile(kind, index) {
  if (index === '') {
    activeProfiles[kind] = null;
    updateActionAvailability();
    return;
  }
  const collection = kind === 'client' ? directory.clients : directory.architects;
  activeProfiles[kind] = collection[Number(index)];
  saveActiveProfile(kind, Number(index));
  updatePrintMetadata(workspace.dataset.panelType || 'materials');
  updateActionAvailability();
}

function hasRequiredProfiles() {
  return Boolean(activeProfiles.client && activeProfiles.architect && workspace.querySelector('[data-project-name]')?.value.trim());
}

function updateActionAvailability() {
  const available = hasRequiredProfiles();
  workspace.querySelectorAll('[data-requires-profiles]').forEach(button => { button.disabled = !available; });
  const note = workspace.querySelector('[data-profile-requirement]');
  if (note) note.textContent = available ? 'Obra, cliente y arquitecto seleccionados. Ya puedes continuar.' : 'Completa el nombre de la obra y selecciona un cliente y un arquitecto.';
}

function showPdfPreview(type) {
  const printContent = workspace.querySelector('.print-letterhead').outerHTML + workspace.querySelector('.entries').outerHTML + workspace.querySelector('.print-document-footer').outerHTML;
  const modal = document.createElement('div');
  modal.className = 'preview-modal';
  modal.innerHTML = `
    <div class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <div class="preview-toolbar">
        <div><p class="eyebrow">Documento listo para revisar</p><h2 id="preview-title">Vista previa del PDF</h2></div>
        <button class="preview-close" type="button" data-preview-close aria-label="Cerrar vista previa">×</button>
      </div>
      <div class="preview-sheet">${printContent}</div>
      <div class="preview-footer">
        <span>Revisa los datos antes de generar el documento.</span>
        <button class="print-panel" type="button" data-preview-print>Imprimir / guardar PDF</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-preview-close]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
  modal.querySelector('[data-preview-print]').addEventListener('click', () => { modal.remove(); window.print(); });
}

function toggleWeekFields(periodType) {
  workspace.querySelectorAll('[data-week-number-field]').forEach(field => field.classList.toggle('is-hidden', periodType !== 'number'));
  workspace.querySelectorAll('[data-week-range-field]').forEach(field => field.classList.toggle('is-hidden', periodType !== 'range'));
}

function updatePrintMetadata(type) {
  const getValue = name => workspace.querySelector(`[data-meta="${name}"]`)?.value.trim() || '';
  const project = workspace.querySelector('[data-project-name]')?.value.trim() || 'Nombre de la obra';
  const holder = getValue('holder') || activeProfiles.client?.name || 'Titular de la obra';
  const architect = getValue('architect') || activeProfiles.architect?.name || 'Arquitecto/a sin informar';
  let period = type === 'materials' ? `Impreso el ${formatDate(getValue('printDate') || today)}` : `Semana ${getValue('weekNumber') || '1'}`;
  if (type === 'weekly' && getValue('periodType') === 'range') period = `Del ${formatDate(getValue('weekStart'))} al ${formatDate(getValue('weekEnd'))}`;
  workspace.querySelector('[data-print-project]').textContent = project;
  workspace.querySelector('[data-print-holder]').textContent = `Cliente: ${holder}`;
  workspace.querySelector('[data-print-architect]').textContent = architect;
  workspace.querySelector('[data-print-cuil]').textContent = activeProfiles.architect?.cuil || getValue('cuil') || 'Sin informar';
  workspace.querySelector('[data-print-phone]').textContent = activeProfiles.architect?.phone || getValue('phone') || 'Sin informar';
  workspace.querySelector('[data-print-email]').textContent = activeProfiles.architect?.email || getValue('email') || 'Sin informar';
  workspace.querySelector('[data-print-license]').textContent = activeProfiles.architect?.license || getValue('license') || 'Sin informar';
  workspace.querySelector('[data-print-period]').textContent = period;
}

function renderRows(type) {
  const rows = workspace.querySelector('[data-rows]');
  const entries = state[type];
  const total = entries.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);
  rows.innerHTML = entries.length ? entries.map(entry => `
    <tr>
      <td><strong>${entry.description}</strong></td>
      <td>${entry.category}</td>
      <td>${entry.quantity} ${entry.unit}</td>
      <td><span class="pill ${entry.status === 'Pendiente' || entry.status === 'Estimado' ? 'pending' : ''}">${entry.status}</span></td>
      <td>${formatCurrency(entry.quantity * entry.price)}</td>
    </tr>`).join('') : '<tr><td colspan="5" class="table-empty">Todavía no hay líneas añadidas.</td></tr>';
  workspace.querySelector('[data-total]').textContent = `${entries.length} ${entries.length === 1 ? 'línea' : 'líneas'}`;
  workspace.querySelector('[data-summary]').textContent = formatCurrency(total);
}

function renderMainMenu(title, eyebrow, options) {
  workspace.innerHTML = `
    <div class="sub-menu-panel">
      <div class="sub-menu-header"><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div><button class="close-panel" type="button" data-close>Volver al inicio ×</button></div>
      <div class="sub-choice-grid">${options.map(option => `<button class="sub-choice" data-sub-action="${option.action}" type="button"><span class="sub-choice-number">${option.number}</span><span class="sub-choice-icon">${option.icon}</span><strong>${option.title}</strong><small>${option.description}</small><span class="card-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>
    </div>`;
  workspace.querySelector('[data-close]').addEventListener('click', closePanel);
  workspace.querySelectorAll('[data-sub-action]').forEach(button => button.addEventListener('click', () => handleSubAction(button.dataset.subAction)));
  workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleSubAction(action) {
  if (action === 'materials' || action === 'weekly') renderPanel(action);
  else renderDirectoryPanel(action);
}

function renderClientMenu(kind) {
  const label = kind === 'client' ? 'cliente' : 'arquitecto';
  renderMainMenu(kind === 'client' ? 'Gestionar clientes' : 'Gestionar arquitectos', 'Directorio de obra', [
    { number: '01', action: `${kind}-add`, icon: '+', title: `Agregar ${label}`, description: `Carga los datos de un nuevo ${label}.` },
    { number: '02', action: `${kind}-search`, icon: '⌕', title: `Buscar ${label}`, description: `Selecciona un ${label} que ya esté registrado.` }
  ]);
}

function renderBudgetMenu() {
  renderMainMenu('Generar presupuestos', 'Presupuestos de obra', [
    { number: '01', action: 'materials', icon: '▦', title: 'Materiales', description: 'Compra y estima lo necesario para cada partida.' },
    { number: '02', action: 'weekly', icon: '◷', title: 'Jornales y gastos', description: 'Registra trabajos, pagos y gastos semanales.' }
  ]);
}

function renderDirectoryPanel(mode, editIndex = null) {
  const isClient = mode.startsWith('client');
  const kind = isClient ? 'client' : 'architect';
  const collection = isClient ? directory.clients : directory.architects;
  const label = isClient ? 'cliente' : 'arquitecto';
  const isAdd = mode.endsWith('add') || mode.endsWith('edit');
  const editing = editIndex !== null;
  const profile = editing ? collection[editIndex] : null;
  workspace.innerHTML = `
    <div class="form-panel directory-panel">
      <div class="panel-header">
        <div><p class="eyebrow">Directorio de obra</p><h2>${isAdd ? (editing ? `Modificar ${label}` : `Agregar ${label}`) : `Buscar ${label}`}</h2></div>
        <button class="close-panel" type="button" data-close>Cerrar panel ×</button>
      </div>
      ${isAdd ? `<form class="directory-form" data-directory-form="${kind}" data-edit-index="${editing ? editIndex : ''}">
        <div class="form-grid">
          <div class="field wide"><label for="directory-name">Nombre completo</label><input id="directory-name" data-name-field name="name" value="${profileValue(profile, 'name')}" required placeholder="Nombre y apellido o razón social"></div>
          ${isClient ? `<div class="field"><label for="directory-cuil">CUIL / CUIT</label><input id="directory-cuil" data-cuit-field name="cuil" value="${profileValue(profile, 'cuil')}" placeholder="30-1221321-1"></div><div class="field"><label for="directory-phone">Teléfono</label><input id="directory-phone" name="phone" value="${profileValue(profile, 'phone')}" placeholder="11 5555 5555"></div><div class="field wide"><label for="directory-email">Mail</label><input id="directory-email" name="email" value="${profileValue(profile, 'email')}" type="email" placeholder="correo@ejemplo.com"></div>` : `<div class="field"><label for="directory-cuil">CUIL</label><input id="directory-cuil" data-cuit-field name="cuil" value="${profileValue(profile, 'cuil')}" placeholder="30-1221321-1"></div><div class="field"><label for="directory-phone">Teléfono</label><input id="directory-phone" name="phone" value="${profileValue(profile, 'phone')}" placeholder="11 5555 5555"></div><div class="field"><label for="directory-email">Mail</label><input id="directory-email" name="email" value="${profileValue(profile, 'email')}" type="email" placeholder="correo@ejemplo.com"></div><div class="field"><label for="directory-license">Matrícula profesional</label><input id="directory-license" name="license" value="${profileValue(profile, 'license')}" required placeholder="MP 12345"></div>`}
          <button class="add-row" type="submit">${editing ? 'Guardar cambios' : `Guardar ${label}`}</button>
        </div>
      </form>` : `<div class="directory-list">${collection.length ? collection.map((profile, index) => `<div class="directory-result"><div><strong>${escapeHtml(profile.name)}</strong><span>${escapeHtml(profile.email || profile.license || 'Sin datos adicionales')}</span></div><div class="directory-result-actions"><button type="button" data-profile-index="${index}">Usar</button><button type="button" data-profile-action="edit" data-profile-index="${index}">Modificar</button><button type="button" data-profile-action="delete" data-profile-index="${index}">Borrar</button></div></div>`).join('') : '<p class="directory-empty">Todavía no hay registros guardados.</p>'}</div>`}
    </div>`;
  workspace.querySelector('[data-close]').addEventListener('click', closePanel);
  const form = workspace.querySelector('[data-directory-form]');
  if (form) form.addEventListener('submit', event => saveProfile(event, kind));
  bindInputFormatting();
  workspace.querySelectorAll('[data-profile-index]').forEach(button => button.addEventListener('click', () => selectProfile(kind, Number(button.dataset.profileIndex))));
  workspace.querySelectorAll('[data-profile-action="edit"]').forEach(button => button.addEventListener('click', () => renderDirectoryPanel(`${kind}-edit`, Number(button.dataset.profileIndex))));
  workspace.querySelectorAll('[data-profile-action="delete"]').forEach(button => button.addEventListener('click', () => deleteProfile(kind, Number(button.dataset.profileIndex))));
  workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveProfile(event, kind) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const profile = Object.fromEntries(formData.entries());
  profile.name = capitalizeName(profile.name);
  profile.cuil = formatCuit(profile.cuil);
  const collection = directory[kind === 'client' ? 'clients' : 'architects'];
  const editIndex = event.currentTarget.dataset.editIndex;
  if (editIndex === '') collection.push(profile);
  else collection[Number(editIndex)] = profile;
  activeProfiles[kind] = profile;
  saveActiveProfile(kind, editIndex === '' ? collection.length - 1 : Number(editIndex));
  saveDirectory();
  workspace.innerHTML = `<div class="workspace-empty"><span class="empty-mark">✓</span><p>${kind === 'client' ? 'Cliente' : 'Arquitecto'} guardado. Ya está seleccionado para el próximo presupuesto.</p></div>`;
}

function selectProfile(kind, index) {
  activeProfiles[kind] = directory[kind === 'client' ? 'clients' : 'architects'][index];
  saveActiveProfile(kind, index);
  workspace.innerHTML = `<div class="workspace-empty"><span class="empty-mark">✓</span><p>${kind === 'client' ? 'Cliente' : 'Arquitecto'} seleccionado. Sus datos se usarán en el próximo PDF.</p></div>`;
}

function deleteProfile(kind, index) {
  const collection = directory[kind === 'client' ? 'clients' : 'architects'];
  collection.splice(index, 1);
  saveDirectory();
  if (activeProfiles[kind] && !collection.includes(activeProfiles[kind])) {
    activeProfiles[kind] = null;
    const saved = JSON.parse(localStorage.getItem('obraClaraActiveProfiles') || '{}');
    delete saved[kind];
    localStorage.setItem('obraClaraActiveProfiles', JSON.stringify(saved));
  }
  renderDirectoryPanel(`${kind}-search`);
}

function addEntry(event, type) {
  event.preventDefault();
  if (!hasRequiredProfiles()) return;
  const formData = new FormData(event.currentTarget);
  state[type].push({
    description: formData.get('description'),
    category: formData.get('category'),
    quantity: Number(formData.get('quantity')),
    unit: formData.get('unit'),
    price: Number(formData.get('price')),
    status: formData.get('status')
  });
  event.currentTarget.reset();
  renderRows(type);
}

function closePanel() {
  workspace.innerHTML = '<div class="workspace-empty"><span class="empty-mark">+</span><p>Selecciona una opción para abrir tu presupuesto</p></div>';
}

cards.forEach(card => card.addEventListener('click', () => renderPanel(card.dataset.view)));
document.querySelectorAll('[data-directory]').forEach(button => button.addEventListener('click', () => renderDirectoryPanel(button.dataset.directory)));
mainCards.forEach(card => card.addEventListener('click', () => {
  if (card.dataset.mainView === 'budget') renderBudgetMenu();
  else renderClientMenu(card.dataset.mainView);
}));
document.querySelector('[data-history-view]')?.addEventListener('click', renderBudgetHistoryPanel);
renderDirectoryRecords();
