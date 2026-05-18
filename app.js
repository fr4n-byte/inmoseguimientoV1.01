function getHoy() { const h = new Date(); h.setHours(0,0,0,0); return h; }
let _fechaHoy = getHoy().toDateString();
setInterval(() => {
  const hoyActual = getHoy().toDateString();
  if (hoyActual !== _fechaHoy) { _fechaHoy = hoyActual; renderCards(); }
}, 60000);
let clientes;
try {
  const raw = localStorage.getItem('inmo_clientes');
  clientes = raw ? JSON.parse(raw) : null;
} catch(e) {
  try {
    const backup = localStorage.getItem('inmo_clientes_backup');
    clientes = backup ? JSON.parse(backup) : null;
    if (clientes) showToast('Datos recuperados del backup automatico');
  } catch(e2) { clientes = null; }
}
if (!clientes) clientes = [
  { id: 1, tel: '70000000', nombre: 'Juan Pérez (ejemplo)', prop: 'Departamento 2 dormitorios', propDetalle: '2 dormitorios, piso 3', zona: 'Miraflores', estado: 'pensando', notas: [{ fecha: new Date().toISOString(), texto: 'Cliente de ejemplo — puedes eliminarlo cuando quieras.' }], historial: [], diasSeg: 5, fechaCreacion: new Date().toISOString(), fechaContacto: new Date().toISOString() },
];
let detalleId = null;
let filtroActual = 'todos';
let ordenAsc = localStorage.getItem('inmo_orden') === 'asc';
let textoBusqueda = '';
function guardar() {
  try {
    const datos = JSON.stringify(clientes);
    localStorage.setItem('inmo_clientes', datos);
    localStorage.setItem('inmo_clientes_backup', datos);
    localStorage.setItem('inmo_last_save', Date.now().toString());
    return true;
  } catch(e) {
    try {
      const esenciales = clientes.slice(-50);
      localStorage.setItem('inmo_clientes_emergencia', JSON.stringify(esenciales));
    } catch(e2) {}
    showToast('⚠️ Error al guardar. Libera espacio en el dispositivo.');
    return false;
  }
}
function migrarNotas(c) {
  if (!c.notas) {
    c.notas = c.nota ? [{ fecha: c.fechaContacto || c.fechaCreacion, texto: c.nota }] : [];
    delete c.nota;
  }
  if (!c.historial) c.historial = [];
}
// Migración automática al arrancar
clientes.forEach(c => migrarNotas(c));
function toggleDrawer() {
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  drawer.classList.toggle('open');
  overlay.classList.toggle('visible');
}
function exportarDatos() {
  const datos = { version: 1, fecha: new Date().toISOString(), clientes };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = new Date().toISOString().slice(0,10);
  a.href = url; a.download = `inmo-backup-${fecha}.json`;
  a.click(); URL.revokeObjectURL(url);
  toggleDrawer();
  showToast('Backup descargado ✓');
}
function importarDatos(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const datos = JSON.parse(e.target.result);
      if (!datos.clientes || !Array.isArray(datos.clientes)) { showToast('Archivo inválido ✕'); return; }
      const opcion = confirm(`Se encontraron ${datos.clientes.length} clientes.\n\nAceptar → Combinar con datos existentes\nCancelar → Reemplazar todo`);
      if (opcion) {
        // Combinar: agregar solo los que no existen por ID
        const idsExistentes = new Set(clientes.map(c => c.id));
        const nuevos = datos.clientes.filter(c => !idsExistentes.has(c.id));
        clientes = [...clientes, ...nuevos];
        guardar(); renderCards();
        showToast(`${nuevos.length} clientes agregados ✓`);
      } else {
        if (!confirm('¿Seguro? Esto borrará todos tus datos actuales.')) return;
        clientes = datos.clientes;
        guardar(); renderCards();
        showToast(`${clientes.length} clientes restaurados ✓`);
      }
      toggleDrawer();
    } catch(err) { showToast('Error al leer el archivo ✕'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}
function toggleOrden() {
  ordenAsc = !ordenAsc;
  localStorage.setItem('inmo_orden', ordenAsc ? 'asc' : 'desc');
  document.getElementById('sort-icon').textContent = ordenAsc ? '↑' : '↓';
  document.getElementById('sort-label').textContent = ordenAsc ? 'Más antiguo' : 'Más reciente';
  renderCards();
}
function normalizar(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function limpiarBusqueda() {
  textoBusqueda = '';
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.remove('visible');
  renderCards();
}
function toggleBusqueda() {
  const panel = document.getElementById('search-panel');
  const overlay = document.getElementById('search-overlay');
  const btn = document.getElementById('nav-buscar');
  const abierto = panel.classList.contains('visible');
  if (abierto) {
    cerrarBusqueda();
  } else {
    panel.classList.add('visible');
    overlay.classList.add('visible');
    btn.classList.add('search-active');
    setTimeout(() => document.getElementById('search-input').focus(), 220);
  }
}
function cerrarBusqueda() {
  document.getElementById('search-panel').classList.remove('visible');
  document.getElementById('search-overlay').classList.remove('visible');
  document.getElementById('nav-buscar').classList.remove('search-active');
}
function waLink(tel) {
  const limpio = tel.replace(/\D/g, '');
  const numero = limpio.startsWith('591') ? limpio : '591' + limpio;
  return `https://wa.me/${numero}`;
}
function diasRestantes(c) { const fc = new Date(c.fechaContacto); fc.setHours(0,0,0,0); return c.diasSeg - Math.round((getHoy() - fc) / 86400000); }
function tipoBadge(c) {
  if (c.estado === 'cerrado') return { tipo: 'cerrado', label: '✓ Trato cerrado' };
  if (c.urgenteManual) return { tipo: 'urgente-manual', label: '⚡ Urgente' };
  const d = diasRestantes(c);
  if (d < 0) return { tipo: 'urgente', label: `Venció hace ${Math.abs(d)} día${Math.abs(d)===1?'':'s'}` };
  if (d === 0) return { tipo: 'hoy', label: 'Contactar hoy' };
  return { tipo: 'ok', label: `En ${d} día${d===1?'':'s'}` };
}
function fmtFecha(iso) { if (!iso) return '—'; const d = new Date(iso); const m = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return `${d.getDate()} ${m[d.getMonth()]}`; }
function chipContacto(iso) {
  if (!iso) return '<span class="fecha-chip viejo">—</span>';
  const dias = Math.round((new Date() - new Date(iso)) / 86400000);
  const label = fmtFecha(iso);
  if (dias <= 2) return `<span class="fecha-chip reciente">${label}</span>`;
  if (dias <= 7) return `<span class="fecha-chip moderado">${label}</span>`;
  return `<span class="fecha-chip viejo">${label}</span>`;
}
function toggleCard(id) {
  const det = document.getElementById('det-' + id);
  if (det) det.classList.toggle('abierto');
}
function renderCards() {
  let lista = [...clientes];
  if (filtroActual === 'archivado') lista = lista.filter(c => c.archivado);
  else if (filtroActual === 'cerrado') lista = lista.filter(c => c.estado === 'cerrado' && !c.archivado);
  else if (filtroActual === 'para-cierre') lista = lista.filter(c => !c.archivado && c.estado === 'para-cierre');
  else if (filtroActual === 'urgente-manual') lista = lista.filter(c => !c.archivado && c.estado !== 'cerrado' && !c.negocioConcluido && c.urgenteManual);
  else if (filtroActual === 'hoy') lista = lista.filter(c => !c.archivado && c.estado !== 'cerrado' && !c.negocioConcluido && !c.urgenteManual && diasRestantes(c) === 0);
  else if (filtroActual === 'ok') lista = lista.filter(c => !c.archivado && c.estado !== 'cerrado' && !c.negocioConcluido && !c.urgenteManual && diasRestantes(c) > 0);
  else lista = lista.filter(c => !c.archivado && c.estado !== 'cerrado' && !c.negocioConcluido);
  if (textoBusqueda) {
    const q = normalizar(textoBusqueda);
    lista = lista.filter(c => {
      return normalizar(c.nombre).includes(q) || normalizar(c.tel).includes(q) || normalizar(c.prop).includes(q);
    });
  }
  lista.sort((a,b) => {
    if (a.urgenteManual && !b.urgenteManual) return -1;
    if (!a.urgenteManual && b.urgenteManual) return 1;
    const fa = new Date(a.fechaCreacion), fb = new Date(b.fechaCreacion);
    return ordenAsc ? fa - fb : fb - fa;
  });
  const cont = document.getElementById('cards-container');
  if (lista.length === 0) {
    const mensaje = textoBusqueda 
      ? `<div class="empty-state"><div class="icon">🔍</div><p>No se encontraron clientes</p></div>`
      : `<div class="empty-state"><div class="icon">✓</div><p>No hay clientes en esta categoría.<br>¡Todo al día!</p></div>`;
    cont.innerHTML = mensaje;
    return;
  }
  cont.innerHTML = lista.map(c => {
    const b = tipoBadge(c); const nombre = c.nombre || c.tel; const esCerrado = c.estado === 'cerrado';
    // Reset automático: si el último contacto fue antes de hoy, rehabilitar botón
    const fcDia = c.fechaContacto ? new Date(c.fechaContacto).toDateString() : null;
    const contactadoHoy = fcDia === getHoy().toDateString();
    const botonContactado = c.contactado && contactadoHoy;
    return `<div class="client-card ${b.tipo}">
      <div class="card-top">
        <div style="flex:1;min-width:0;">
          <div class="client-name" style="${esCerrado?'text-decoration:line-through;opacity:0.6;':''}" onclick="toggleCard(${c.id})">${nombre} <span style="font-size:11px;color:var(--text3);font-weight:400;">▾</span></div>
        </div>
        <span class="badge ${b.tipo}">${b.label}</span>
      </div>
      <div class="card-prop"><span class="icon">🏠</span> ${c.prop||'Sin propiedad'}</div>
      <div class="card-expandible" id="det-${c.id}">
        ${c.tel?`<div style="margin-bottom:6px;"><a href="${waLink(c.tel)}" target="_blank" style="font-size:15px;color:var(--ok);font-family:var(--font-mono);text-decoration:none;display:inline-flex;align-items:center;gap:5px;"><span>💬</span>${c.tel}</a></div>`:''}
        ${(()=>{ const ul = c.notas&&c.notas[0]; return ul?`<div class="card-nota">${ul.texto}</div>`:''; })()}
        <div class="card-meta">
          <div class="card-meta-item">Ingresó<span>${fmtFecha(c.fechaCreacion)}</span></div>
          <div class="card-meta-item">Último contacto${chipContacto(c.fechaContacto)}</div>
        </div>
      </div>
      <div class="card-actions" style="margin-top:10px;">${!esCerrado?`<button class="btn-sm ${botonContactado?'contactado':'primary'}" onclick="${botonContactado?'':'marcarContactado('+c.id+', this)'}">${botonContactado?'Contactado':'Contactar'}</button>`:''}<button class="btn-sm" onclick="abrirDetalle(${c.id})">${esCerrado?'Ver detalle':'Editar'}</button></div>
      ${esCerrado && filtroActual === 'cerrado' ?`<div class="card-tabs">
        <button class="card-tab docs" onclick="abrirDocs(${c.id})">📋 Documentación</button>
        <button class="card-tab negocio ${c.negocioConcluido?'concluido':''}" onclick="toggleNegocio(${c.id})">✓ Negocio Concluido</button>
      </div>
      <div class="negocio-panel hidden" id="negocio-${c.id}">
        <label style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#0F2A45;border-radius:0 0 var(--radius-sm) var(--radius-sm);cursor:pointer;">
          <input type="checkbox" ${c.negocioConcluido?'checked':''} onchange="confirmarNegocio(${c.id},this.checked)" style="width:18px;height:18px;cursor:pointer;accent-color:#4A9EE0;" />
          <span style="color:white;font-size:14px;font-weight:500;">Confirmar negocio concluido — el cliente dejará de aparecer en Seguimiento</span>
        </label>
      </div>`:''}
    </div>`;
  }).join('');
  document.getElementById('stat-urgente').textContent = clientes.filter(c => c.estado !== 'cerrado' && (c.urgenteManual || diasRestantes(c) < 0)).length;
  document.getElementById('stat-hoy').textContent = clientes.filter(c => c.estado !== 'cerrado' && !c.urgenteManual && diasRestantes(c) === 0).length;
  document.getElementById('stat-total').textContent = clientes.filter(c => c.estado !== 'cerrado').length;
}
function setFiltro(f, btn) { filtroActual = f; document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); renderCards(); }
let ultimoContactado = null;
function marcarContactado(id, btn) {
  btn.classList.remove('primary');
  btn.classList.add('confirmando');
  btn.textContent = '¡Listo! ✓';
  setTimeout(() => {
    const c = clientes.find(x => x.id === id);
    if (c) {
      ultimoContactado = { id, fechaAnterior: c.fechaContacto, contactadoAnterior: c.contactado };
      c.fechaContacto = new Date().toISOString();
      c.contactado = true;
      guardar();
      renderCards();
      showToastDeshacer('Seguimiento actualizado ✓', () => {
        const cx = clientes.find(x => x.id === ultimoContactado.id);
        if (cx) {
          cx.fechaContacto = ultimoContactado.fechaAnterior;
          cx.contactado = ultimoContactado.contactadoAnterior;
          guardar();
          renderCards();
          showToast('Accion deshecha');
        }
      });
    }
  }, 1200);
}
function guardarCliente() {
  const tel = document.getElementById('f-tel').value.trim();
  if (!tel) { showToast('El teléfono es obligatorio'); return; }
  const notaInicial = document.getElementById('f-nota').value.trim();
  const propInicial = document.getElementById('f-prop').value.trim();
  const propDetalleInicial = document.getElementById('f-prop-detalle').value.trim();
  const nuevo = {
    id: Date.now(), tel,
    nombre: document.getElementById('f-nombre').value.trim(),
    prop: propInicial,
    propDetalle: propDetalleInicial,
    zona: document.getElementById('f-zona').value.trim(),
    historial: propInicial ? [{ tipo: 'prop', fecha: new Date().toISOString(), texto: propInicial, detalle: propDetalleInicial }] : [],
    estado: document.getElementById('f-estado').value,
    notas: notaInicial ? [{ fecha: new Date().toISOString(), texto: notaInicial }] : [],
    diasSeg: parseInt(document.getElementById('f-dias').value),
    urgenteManual: document.getElementById('f-urgente').checked,
    fechaCreacion: new Date().toISOString(),
    fechaContacto: new Date().toISOString()
  };
  clientes.unshift(nuevo); guardar();
  ['f-tel','f-nombre','f-prop','f-prop-detalle','f-nota','f-zona'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-estado').value = 'pensando';
  document.getElementById('f-urgente').checked = false;
  initSlider('f', 5);
  showView('lista'); showToast('Cliente guardado ✓');
}
function fmtFechaCompleta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const m = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${dias[d.getDay()]} ${d.getDate()} ${m[d.getMonth()]} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function renderHistorial(notas) {
  const cont = document.getElementById('d-notas-historial');
  if (!notas || notas.length === 0) { cont.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:6px 0;">Sin notas aún.</div>'; return; }
  cont.innerHTML = notas.map((n,i) => `
    <div class="nota-entrada">
      <div class="nota-fecha">${fmtFechaCompleta(n.fecha)}</div>
      <div class="nota-texto">${n.texto}</div>
    </div>
  `).join('');
}
function agregarNota() {
  const texto = document.getElementById('d-nota-nueva').value.trim();
  if (!texto) { showToast('Escribe algo antes de agregar'); return; }
  const c = clientes.find(x => x.id === detalleId); if (!c) return;
  migrarNotas(c);
  c.notas.unshift({ fecha: new Date().toISOString(), texto });
  c.contactado = false;
  document.getElementById('d-nota-nueva').value = '';
  guardar();
  renderHistorial(c.notas);
  showToast('Nota agregada ✓');
}
function abrirDetalle(id) {
  const c = clientes.find(x => x.id === id); if (!c) return; detalleId = id;
  migrarNotas(c);
  if (!c.historial) c.historial = [];
  const esCerrado = c.estado === 'cerrado' || c.archivado === true;
  document.getElementById('detalle-titulo').textContent = c.nombre || c.tel;
  document.getElementById('d-nombre').value = c.nombre || '';
  document.getElementById('d-tel').value = c.tel;
  document.getElementById('d-prop').value = c.prop || '';
  document.getElementById('d-prop-detalle').value = c.propDetalle || '';
  document.getElementById('d-zona').value = c.zona || '';
  document.getElementById('d-estado').value = c.estado;
  document.getElementById('d-dias').value = c.diasSeg || 5;
  initSlider('d', c.diasSeg || 5);
  document.getElementById('d-urgente').checked = c.urgenteManual || false;
  document.getElementById('d-cita-fecha').value = c.citaFecha || '';
  document.getElementById('d-cita-hora').value = c.citaHora || '';
  document.getElementById('d-cita-nota').value = c.citaNota || '';
  document.getElementById('d-nota-nueva').value = '';
  renderHistorial(c.notas);
  // ── Modo solo lectura / editable según estado ──
  const campos = ['d-nombre','d-tel','d-prop','d-prop-detalle','d-nota-nueva'];
  campos.forEach(fid => {
    const el = document.getElementById(fid);
    if (!el) return;
    el.disabled = esCerrado;
    el.style.opacity = esCerrado ? '0.7' : '';
    el.style.background = esCerrado ? 'var(--surface2)' : '';
  });
  const selects = ['d-dias','d-urgente'];
  selects.forEach(fid => {
    const el = document.getElementById(fid);
    if (!el) return;
    el.disabled = esCerrado;
    el.style.opacity = esCerrado ? '0.7' : '';
  });
  // Selector de estado — siempre habilitado (para poder reactivar desde Cerrados)
  const elEstado = document.getElementById('d-estado');
  if (elEstado) { elEstado.disabled = false; elEstado.style.opacity = ''; }
  // Sección de seguimiento — ocultar si cerrado
  const secSeg = document.getElementById('seccion-seguimiento');
  if (secSeg) secSeg.style.display = esCerrado ? 'none' : '';
  // Sección de cita — ocultar si cerrado
  const secCita = document.getElementById('seccion-cita');
  if (secCita) secCita.style.display = esCerrado ? 'none' : '';
  ['d-cita-fecha','d-cita-hora','d-cita-nota'].forEach(fid => {
    const el = document.getElementById(fid);
    if (el) el.closest('.form-group').style.display = esCerrado ? 'none' : '';
  });
  const citaBtns = document.getElementById('cita-btns-row');
  if (citaBtns) citaBtns.style.display = esCerrado ? 'none' : 'flex';
  // Botón guardar cambios — siempre visible en cerrado para poder reactivar
  const btnGuardarCambios = document.getElementById('btn-guardar-cambios');
  if (btnGuardarCambios) btnGuardarCambios.style.display = '';
  // Botón agregar nota — ocultar si cerrado
  const btnAgregarNota = document.getElementById('btn-agregar-nota');
  if (btnAgregarNota) btnAgregarNota.style.display = esCerrado ? 'none' : '';
  // Archivar y ver historial — SIEMPRE visibles y funcionales
  const btnHistorial = document.getElementById('btn-ver-historial');
  const btnArchivar = document.getElementById('btn-archivar');
  if (btnHistorial) { btnHistorial.style.display = ''; btnHistorial.style.pointerEvents = 'auto'; btnHistorial.style.opacity = '1'; }
  if (btnArchivar) {
    btnArchivar.textContent = c.archivado ? 'Desarchivar cliente' : 'Archivar cliente';
    btnArchivar.style.display = '';
    btnArchivar.style.pointerEvents = 'auto';
    btnArchivar.style.opacity = '1';
  }
  const btnEliminar = document.getElementById('btn-eliminar');
  if (btnEliminar) btnEliminar.style.display = c.archivado ? '' : 'none';
  // Botones de cita
  const btnGuardar = document.getElementById('btn-guardar-cita');
  const btnGcal = document.getElementById('btn-gcal');
  if (!esCerrado) {
    if (c.citaFecha) {
      btnGuardar.textContent = 'Cita guardada ✓';
      btnGuardar.style.opacity = '0.5';
      btnGuardar.style.pointerEvents = 'none';
      btnGcal.style.opacity = '1';
      btnGcal.style.pointerEvents = 'auto';
      btnGcal.textContent = '📅 A Google Calendar';
    } else {
      btnGuardar.textContent = 'Guardar cita';
      btnGuardar.style.opacity = '1';
      btnGuardar.style.pointerEvents = 'auto';
      btnGcal.style.opacity = '0.4';
      btnGcal.style.pointerEvents = 'none';
      btnGcal.textContent = '📅 A Google Calendar';
    }
  }
  showView('detalle');
}
function guardarDetalle() {
  const c = clientes.find(x => x.id === detalleId); if (!c) return;
  migrarNotas(c);
  if (!c.historial) c.historial = [];
  const nuevoEstado = document.getElementById('d-estado').value;
  const nuevosDias = parseInt(document.getElementById('d-dias').value);
  const nuevaProp = document.getElementById('d-prop').value.trim();
  const nuevaPropDetalle = document.getElementById('d-prop-detalle').value.trim();
  if (nuevoEstado !== c.estado || nuevosDias !== c.diasSeg) { c.contactado = false; }
  // Si cambió la propiedad, guardar la ANTERIOR en historial
  if (nuevaProp && nuevaProp !== c.prop && c.prop) {
    c.historial.unshift({ tipo: 'prop', fecha: new Date().toISOString(), texto: c.prop, detalle: c.propDetalle || '' });
  }
  c.nombre = document.getElementById('d-nombre').value.trim();
  c.tel = document.getElementById('d-tel').value.trim();
  c.prop = nuevaProp;
  c.propDetalle = nuevaPropDetalle;
  c.zona = document.getElementById('d-zona').value.trim();
  // Propagar propDetalle a todos los clientes con la misma propiedad
  if (nuevaPropDetalle && nuevaProp) {
    clientes.forEach(x => { if (x.id !== c.id && x.prop === nuevaProp) x.propDetalle = nuevaPropDetalle; });
  }
  c.estado = nuevoEstado;
  c.diasSeg = nuevosDias;
  c.urgenteManual = document.getElementById('d-urgente').checked;
  c.fechaContacto = new Date().toISOString();
  guardar(); showView('lista'); showToast('Cambios guardados ✓');
}
function rehabilitarCita() {
  const btnGuardar = document.getElementById('btn-guardar-cita');
  const btnGcal = document.getElementById('btn-gcal');
  btnGuardar.textContent = 'Guardar cita';
  btnGuardar.style.opacity = '1';
  btnGuardar.style.pointerEvents = 'auto';
  btnGcal.style.opacity = '0.4';
  btnGcal.style.pointerEvents = 'none';
  btnGcal.textContent = '📅 A Google Calendar';
}
function guardarCita() {
  const c = clientes.find(x => x.id === detalleId); if (!c) return;
  if (!c.historial) c.historial = [];
  // Guardar cita anterior en historial antes de reemplazar
  if (c.citaFecha) {
    c.historial.unshift({ tipo: 'cita', fecha: new Date().toISOString(), texto: `${c.citaFecha}${c.citaHora?' '+c.citaHora:''}`, detalle: c.citaNota || '', estado: c.citaEstado || 'guardada' });
  }
  c.citaFecha = document.getElementById('d-cita-fecha').value;
  c.citaHora = document.getElementById('d-cita-hora').value;
  c.citaNota = document.getElementById('d-cita-nota').value.trim();
  c.citaEstado = null;
  guardar();
  const btnGuardar = document.getElementById('btn-guardar-cita');
  const btnGcal = document.getElementById('btn-gcal');
  btnGuardar.textContent = 'Cita guardada ✓';
  btnGuardar.style.opacity = '0.5';
  btnGuardar.style.pointerEvents = 'none';
  btnGcal.style.opacity = '1';
  btnGcal.style.pointerEvents = 'auto';
  showToast('Cita guardada ✓');
}
function eliminarPermanente() {
  if (!confirm('¿Eliminar este cliente permanentemente? Esta acción no se puede deshacer.')) return;
  if (!confirm('⚠️ Última confirmación — se borrarán todos sus datos, historial y notas.')) return;
  clientes = clientes.filter(x => x.id !== detalleId);
  guardar();
  filtroActual = 'archivado';
  showView('lista');
  showToast('Cliente eliminado permanentemente');
}
function toggleArchivar() {
  const c = clientes.find(x => x.id === detalleId); if (!c) return;
  if (c.archivado) {
    if (!confirm('¿Desarchivar este cliente? Volverá a la pestaña Todos en Seguimiento.')) return;
    c.archivado = false;
    c.fechaArchivo = null;
    if (c.estado === 'cerrado') c.estado = 'pensando';
    guardar();
    filtroActual = 'todos';
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab')[0].classList.add('active');
    showView('lista');
    showToast('Cliente desarchivado ✓');
  } else {
    if (!confirm('¿Archivar este cliente? Podrás verlo en la pestaña Archivados.')) return;
    c.archivado = true;
    c.fechaArchivo = new Date().toISOString();
    guardar();
    filtroActual = 'todos';
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab')[0].classList.add('active');
    showView('lista');
    showToast('Cliente archivado ✓');
  }
}
function getZonas() {
  return [...new Set(clientes.filter(c => c.zona).map(c => c.zona))];
}
function mostrarSugerenciasZona(pre, valor) {
  const lista = document.getElementById(`autocomplete-zona-${pre}`);
  if (!valor || valor.length < 2) { lista.classList.add('hidden'); return; }
  const q = normalizar(valor);
  const zonas = getZonas().filter(z => normalizar(z).includes(q) && normalizar(z) !== normalizar(valor));
  if (zonas.length === 0) { lista.classList.add('hidden'); return; }
  lista.innerHTML = zonas.slice(0,5).map(z => `<div class="autocomplete-item" onmousedown="seleccionarZona('${pre}','${z.replace(/'/g,"\\'")}')">📍 ${z}</div>`).join('');
  lista.classList.remove('hidden');
}
function seleccionarZona(pre, zona) {
  document.getElementById(`${pre}-zona`).value = zona;
  document.getElementById(`autocomplete-zona-${pre}`).classList.add('hidden');
}
function getPropiedades() {
  const mapa = {};
  clientes.forEach(c => {
    // prop actual
    if (c.prop) {
      if (!mapa[c.prop]) mapa[c.prop] = c.propDetalle || '';
      else if (c.propDetalle) mapa[c.prop] = c.propDetalle; // preferir el que tiene detalle
    }
    // props en historial
    if (c.historial) {
      c.historial.filter(h => h.tipo === 'prop').forEach(h => {
        if (h.texto && !mapa[h.texto]) mapa[h.texto] = h.detalle || '';
      });
    }
  });
  return mapa;
}
function mostrarSugerenciasNuevo(valor) {
  const lista = document.getElementById('autocomplete-list-nuevo');
  if (!valor || valor.length < 2) { lista.classList.add('hidden'); return; }
  const q = normalizar(valor);
  const mapa = getPropiedades();
  const props = Object.keys(mapa).filter(p => normalizar(p).includes(q) && normalizar(p) !== normalizar(valor));
  if (props.length === 0) { lista.classList.add('hidden'); return; }
  lista.innerHTML = props.slice(0,5).map(p => `<div class="autocomplete-item" onmousedown="seleccionarSugerenciaNuevo('${p.replace(/'/g,"\\'")}')">🏠 ${p}${mapa[p]?` <span style='color:var(--text3);font-size:12px;'>· ${mapa[p]}</span>`:''}</div>`).join('');
  lista.classList.remove('hidden');
}
function seleccionarSugerenciaNuevo(prop) {
  const mapa = getPropiedades();
  document.getElementById('f-prop').value = prop;
  document.getElementById('f-prop-detalle').value = mapa[prop] || '';
  document.getElementById('autocomplete-list-nuevo').classList.add('hidden');
}
function mostrarSugerencias(valor) {
  const lista = document.getElementById('autocomplete-list');
  if (!valor || valor.length < 2) { lista.classList.add('hidden'); return; }
  const q = normalizar(valor);
  const mapa = getPropiedades();
  const props = Object.keys(mapa).filter(p => normalizar(p).includes(q) && normalizar(p) !== normalizar(valor));
  if (props.length === 0) { lista.classList.add('hidden'); return; }
  lista.innerHTML = props.slice(0,5).map(p => `<div class="autocomplete-item" onmousedown="seleccionarSugerencia('${p.replace(/'/g,"\\'")}')">🏠 ${p}${mapa[p]?` <span style='color:var(--text3);font-size:12px;'>· ${mapa[p]}</span>`:''}</div>`).join('');
  lista.classList.remove('hidden');
}
function seleccionarSugerencia(prop) {
  const mapa = getPropiedades();
  document.getElementById('d-prop').value = prop;
  document.getElementById('d-prop-detalle').value = mapa[prop] || '';
  ocultarSugerencias();
}
function ocultarSugerencias() {
  document.getElementById('autocomplete-list').classList.add('hidden');
}
function abrirHistorialCliente() {
  const c = clientes.find(x => x.id === detalleId); if (!c) return;
  if (!c.historial) c.historial = [];
  document.getElementById('historial-titulo').textContent = `Historial — ${c.nombre || c.tel}`;
  const cont = document.getElementById('historial-container');
  if (c.historial.length === 0) {
    cont.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>Sin eventos en el historial aún.</p></div>';
  } else {
    cont.innerHTML = c.historial.map(h => {
      const esProp = h.tipo === 'prop';
      return `<div class="historial-entrada">
        <div class="historial-tipo ${h.tipo}">${esProp ? '🏠 Propiedad registrada' : '📅 Cita programada'}</div>
        <div class="historial-fecha">${fmtFechaCompleta(h.fecha)}</div>
        <div class="historial-texto">${h.texto}${h.detalle ? ` · ${h.detalle}` : ''}${h.estado && h.estado !== 'guardada' ? ` · <em>${h.estado}</em>` : ''}</div>
      </div>`;
    }).join('');
  }
  showView('historial');
}
function abrirGoogleCalendar() {
  const c = clientes.find(x => x.id === detalleId); if (!c) return;
  const fecha = document.getElementById('d-cita-fecha').value;
  const hora = document.getElementById('d-cita-hora').value;
  const lugar = document.getElementById('d-cita-nota').value.trim();
  if (!fecha) { showToast('Primero guarda la fecha de la cita'); return; }
  const nombre = c.nombre || c.tel;
  const titulo = encodeURIComponent(`Visita: ${nombre} — ${c.prop || 'Sin propiedad'}`);
  const detalle = encodeURIComponent(`Cliente: ${nombre}\nTeléfono: ${c.tel}\nPropiedad: ${c.prop||''}\n${lugar}`);
  let fechaStr = fecha.replace(/-/g,'');
  let inicio, fin;
  if (hora) {
    const [h,m] = hora.split(':');
    inicio = `${fechaStr}T${h}${m}00`;
    const hFin = String(parseInt(h)+1).padStart(2,'0');
    fin = `${fechaStr}T${hFin}${m}00`;
  } else {
    inicio = fechaStr; fin = fechaStr;
  }
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${inicio}/${fin}&details=${detalle}&location=${encodeURIComponent(lugar)}`;
  window.open(url, '_blank');
  // Bloquear botón de Google Calendar
  const btnGcal = document.getElementById('btn-gcal');
  btnGcal.textContent = '✓ Agregada al calendario';
  btnGcal.style.opacity = '0.5';
  btnGcal.style.pointerEvents = 'none';
}
function marcarCita(id, estado) {
  const c = clientes.find(x => x.id === id); if (!c) return;
  if (estado === 'postergada') {
    abrirDetalle(id);
    setTimeout(() => {
      const sec = document.getElementById('seccion-cita');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return;
  }
  c.citaEstado = estado;
  guardar();
  renderAgenda();
  showToast(estado === 'realizada' ? 'Visita realizada ✓' : 'Cita cancelada');
}
let mostrarPasadas = false;
function togglePasadas() {
  mostrarPasadas = !mostrarPasadas;
  renderAgenda();
}
function renderAgenda() {
  const cont = document.getElementById('agenda-container');
  const hoyStr = new Date().toISOString().slice(0,10);
  let conCita = clientes.filter(c => c.citaFecha).sort((a,b) => (a.citaFecha+(a.citaHora||'')).localeCompare(b.citaFecha+(b.citaHora||'')));
  document.getElementById('stat-citas').textContent = conCita.filter(c => c.citaFecha >= hoyStr && !c.citaEstado).length;
  if (conCita.length === 0) { cont.innerHTML = `<div class="empty-state"><div class="icon">📅</div><p>No hay citas programadas.<br>Edita un cliente para agregar una.</p></div>`; return; }
  const proximas = conCita.filter(c => c.citaFecha >= hoyStr);
  const pasadas = conCita.filter(c => c.citaFecha < hoyStr);
  let html = ''; let ultimaFecha = '';
  const renderCita = (c) => {
    const nombre = c.nombre || c.tel;
    const fechaObj = new Date(c.citaFecha+'T12:00:00');
    const ds = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const ms = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const fechaLabel = `${ds[fechaObj.getDay()]} ${fechaObj.getDate()} ${ms[fechaObj.getMonth()]}`;
    const esHoy = c.citaFecha === hoyStr;
    const esPasada = c.citaFecha < hoyStr;
    const est = c.citaEstado;
    const claseCard = est==='realizada'?'cita-realizada':est==='cancelada'?'cita-cancelada':est==='postergada'?'cita-postergada':(esPasada&&!esHoy?'ok':'hoy');
    if (c.citaFecha !== ultimaFecha) {
      ultimaFecha = c.citaFecha;
      html += `<div style="font-size:12px;font-weight:600;color:${esHoy?'var(--accent)':'var(--text3)'};text-transform:uppercase;letter-spacing:0.07em;padding:14px 0 6px;border-bottom:1px solid var(--border);margin-bottom:8px;">${esHoy?'● Hoy — ':''}${fechaLabel}</div>`;
    }
    const badgeEstado = est==='realizada'?`<span class="badge ok">Realizada ✓</span>`:est==='cancelada'?`<span class="badge urgente">Cancelada</span>`:est==='postergada'?`<span class="badge hoy">Postergada</span>`:esHoy?`<span class="badge hoy">Hoy</span>`:esPasada?`<span class="badge ok">Pasada</span>`:'';
    html += `<div class="client-card ${claseCard}">
      <div class="card-top"><div><div class="client-name" style="cursor:default;">${nombre}</div>${c.citaHora?`<div class="client-tel">🕐 ${c.citaHora}</div>`:''}</div>${badgeEstado}</div>
      <div class="card-prop"><span class="icon">🏠</span> ${c.prop||'Sin propiedad'}</div>
      ${c.citaNota?`<div class="card-nota">${c.citaNota}</div>`:''}
      <div class="card-actions" style="margin-top:8px;">
        <button class="btn-sm" onclick="abrirDetalle(${c.id})">Ver cliente</button>
      </div>
      ${!est?`<div class="resultado-btns">
        <button class="btn-resultado realizada" onclick="marcarCita(${c.id},'realizada')">✓ Realizada</button>
        <button class="btn-resultado postergada" onclick="marcarCita(${c.id},'postergada')">↷ Postergar</button>
        <button class="btn-resultado cancelada" onclick="marcarCita(${c.id},'cancelada')">✕ Cancelada</button>
      </div>`:`<div style="margin-top:6px;"><button style="background:none;border:none;font-size:12px;color:var(--text3);font-family:var(--font);cursor:pointer;text-decoration:underline;" onclick="marcarCita(${c.id}, null)">Deshacer</button></div>`}
    </div>`;
  };
  proximas.forEach(renderCita);
  if (pasadas.length > 0) {
    html += `<div class="toggle-pasadas"><button onclick="togglePasadas()">${mostrarPasadas?'Ocultar':'Mostrar'} citas pasadas (${pasadas.length})</button></div>`;
    if (mostrarPasadas) { ultimaFecha = ''; pasadas.forEach(renderCita); }
  }
  cont.innerHTML = html;
}
function eliminarCliente() { if (!confirm('¿Eliminar este cliente?')) return; clientes = clientes.filter(x => x.id !== detalleId); guardar(); showView('lista'); showToast('Cliente eliminado'); }
// ── SLIDER DE SEGUIMIENTO ──
const SEG_CONFIG = { dia: { max: 30, label: 'día', labelP: 'días' }, semana: { max: 10, label: 'semana', labelP: 'semanas' }, mes: { max: 5, label: 'mes', labelP: 'meses' } };
const segUnidad = { f: 'dia', d: 'dia' };
function setSegUnidad(pre, unidad) {
  segUnidad[pre] = unidad;
  const cfg = SEG_CONFIG[unidad];
  const slider = document.getElementById(`${pre}-slider`);
  slider.max = cfg.max;
  if (parseInt(slider.value) > cfg.max) slider.value = cfg.max;
  ['dia','semana','mes'].forEach(u => {
    const btn = document.getElementById(`${pre}-seg-${u}`);
    if (btn) btn.classList.toggle('active', u === unidad);
  });
  updateSegLabel(pre);
}
function updateSegLabel(pre) {
  const slider = document.getElementById(`${pre}-slider`);
  const val = parseInt(slider.value);
  const unidad = segUnidad[pre];
  const cfg = SEG_CONFIG[unidad];
  const label = val === 1 ? cfg.label : cfg.labelP;
  document.getElementById(`${pre}-seg-label`).textContent = `${val} ${label}`;
  // Calcular días reales
  let dias = val;
  if (unidad === 'semana') dias = val * 7;
  if (unidad === 'mes') dias = val * 30;
  document.getElementById(`${pre}-dias`).value = dias;
  // Quitar activo de rapidos
  document.querySelectorAll(`#${pre === 'f' ? 'view-nuevo' : 'view-detalle'} .seg-rapido`).forEach(b => b.classList.remove('active'));
}
function setSegRapido(pre, dias) {
  document.getElementById(`${pre}-dias`).value = dias;
  segUnidad[pre] = 'dia';
  const slider = document.getElementById(`${pre}-slider`);
  slider.max = 30;
  slider.value = dias;
  ['dia','semana','mes'].forEach(u => {
    const btn = document.getElementById(`${pre}-seg-${u}`);
    if (btn) btn.classList.toggle('active', u === 'dia');
  });
  const label = dias === 0 ? 'Hoy' : 'Mañana';
  document.getElementById(`${pre}-seg-label`).textContent = label;
  document.querySelectorAll(`#${pre === 'f' ? 'view-nuevo' : 'view-detalle'} .seg-rapido`).forEach((b,i) => b.classList.toggle('active', i === dias));
}
function initSlider(pre, diasActual) {
  diasActual = diasActual || 5;
  let unidad = 'dia'; let val = diasActual;
  if (diasActual % 30 === 0 && diasActual >= 30) { unidad = 'mes'; val = diasActual / 30; }
  else if (diasActual % 7 === 0 && diasActual >= 7) { unidad = 'semana'; val = diasActual / 7; }
  segUnidad[pre] = unidad;
  const cfg = SEG_CONFIG[unidad];
  const slider = document.getElementById(`${pre}-slider`);
  slider.max = cfg.max;
  slider.value = val;
  ['dia','semana','mes'].forEach(u => {
    const btn = document.getElementById(`${pre}-seg-${u}`);
    if (btn) btn.classList.toggle('active', u === unidad);
  });
  const label = val === 1 ? cfg.label : cfg.labelP;
  document.getElementById(`${pre}-seg-label`).textContent = `${val} ${label}`;
  document.getElementById(`${pre}-dias`).value = diasActual;
}
const ABREVIATURAS = {
  'IPBI': 'IMPUESTO A LA PROPIEDAD DE BIENES INMUEBLES',
  'IMT': 'IMPUESTO MUNICIPAL A LAS TRANSFERENCIAS',
  'IVA': 'IMPUESTO AL VALOR AGREGADO',
  'C.I.': 'CÉDULA DE IDENTIDAD',
  'N/A': 'NO APLICA',
};
const DOCS_REF = {
  compraventa: {
    'Vendedor': [
      'Folio Real original (Derechos Reales)',
      'Certificado Alodial actualizado (libre de gravámenes)',
      'Escritura Pública / Testimonio de propiedad',
      'C.I. del vendedor (original + fotocopia)',
      'Comprobantes IPBI últimos años',
      'Plano catastral / Certificado catastral',
      'Consentimiento del cónyuge (si aplica)',
      'Minuta de compraventa firmada por abogado',
      'Comprobante pago IMT (3% del valor, 10 días hábiles)',
    ],
    'Comprador': [
      'C.I. del comprador (original + fotocopia)',
      'Testimonio de Escritura Pública protocolizada',
      'Comprobante de inscripción en Derechos Reales',
    ]
  },
  alquiler: {
    'Propietario': [
      'Folio Real (acredita titularidad)',
      'C.I. del propietario',
      'Contrato privado de alquiler con reconocimiento de firmas',
      'Comprobante de pago IVA (13% del canon mensual)',
    ],
    'Inquilino': [
      'C.I. del inquilino',
      'Certificado de antecedentes penales',
      'Garantía / depósito documentado',
    ]
  },
  anticretico: {
    'Propietario': [
      'Folio Real original',
      'Certificado Alodial (libre de gravámenes e hipotecas)',
      'Escritura Pública del anticrético (obligatorio por ley)',
      'C.I. del propietario',
      'Inscripción en Derechos Reales (obligatorio por ley)',
    ],
    'Anticresista': [
      'C.I. del anticresista',
      'Comprobante de entrega del monto pactado',
      'Copia de inscripción en Derechos Reales',
    ]
  }
};
function detectarAbreviaturas(texto) {
  let abrevs = [];
  Object.keys(ABREVIATURAS).forEach(abr => {
    if (texto.includes(abr)) abrevs.push(abr);
  });
  return abrevs;
}
function renderRefDocs(tipo) {
  const secciones = DOCS_REF[tipo];
  let html = '';
  Object.entries(secciones).forEach(([seccion, lista]) => {
    html += `<div class="checklist-seccion">${seccion}</div>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:14px;">`;
    lista.forEach((doc, idx) => {
      const borde = idx < lista.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
      const abrevs = detectarAbreviaturas(doc);
      const abrevHtml = abrevs.length ? `<div style="margin-top:3px;">${abrevs.map(a=>`<span style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">${a}: ${ABREVIATURAS[a]}</span>`).join(' &nbsp;')}</div>` : '';
      html += `<div style="padding:10px 12px;${borde}">
        <div style="font-size:14px;color:var(--text);line-height:1.4;">${doc}</div>
        ${abrevHtml}
      </div>`;
    });
    html += `</div>`;
  });
  document.getElementById('ref-docs-container').innerHTML = html;
}
let tipoRefActual = 'compraventa';
function abrirRefDocs() {
  toggleDrawer();
  tipoRefActual = 'compraventa';
  document.querySelectorAll('#modal-ref-docs .tipo-btn').forEach((b,i) => b.classList.toggle('active', i===0));
  renderRefDocs(tipoRefActual);
  document.getElementById('modal-ref-overlay').classList.add('visible');
  document.getElementById('modal-ref-docs').classList.add('visible');
}
function cerrarRefDocs() {
  document.getElementById('modal-ref-overlay').classList.remove('visible');
  document.getElementById('modal-ref-docs').classList.remove('visible');
}
function setTipoRef(tipo, btn) {
  tipoRefActual = tipo;
  document.querySelectorAll('#modal-ref-docs .tipo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRefDocs(tipo);
}
const DOCS = {
  compraventa: {
    vendedor: [
      'Folio Real original (Derechos Reales)',
      'Certificado Alodial actualizado (libre de gravámenes)',
      'Escritura Pública / Testimonio de propiedad',
      'C.I. del vendedor (original + fotocopia)',
      'Comprobantes IPBI últimos años',
      'Plano catastral / Certificado catastral',
      'Consentimiento del cónyuge (si aplica)',
      'Minuta de compraventa firmada por abogado',
      'Comprobante pago IMT (3% del valor, 10 días hábiles)',
    ],
    comprador: [
      'C.I. del comprador (original + fotocopia)',
      'Testimonio de Escritura Pública protocolizada',
      'Comprobante de inscripción en Derechos Reales',
    ]
  },
  alquiler: {
    propietario: [
      'Folio Real (acredita titularidad)',
      'C.I. del propietario',
      'Contrato privado de alquiler con reconocimiento de firmas',
      'Comprobante de pago IVA (13% del canon mensual)',
    ],
    inquilino: [
      'C.I. del inquilino',
      'Certificado de antecedentes penales',
      'Garantía / depósito documentado',
    ]
  },
  anticretico: {
    propietario: [
      'Folio Real original',
      'Certificado Alodial (libre de gravámenes e hipotecas)',
      'Escritura Pública del anticrético (obligatorio por ley)',
      'C.I. del propietario',
      'Inscripción en Derechos Reales (obligatorio por ley)',
    ],
    anticresista: [
      'C.I. del anticresista',
      'Comprobante de entrega del monto pactado',
      'Copia de inscripción en Derechos Reales',
    ]
  }
};
const LABELS = {
  compraventa: { a: 'Vendedor', b: 'Comprador', ka: 'vendedor', kb: 'comprador' },
  alquiler: { a: 'Propietario', b: 'Inquilino', ka: 'propietario', kb: 'inquilino' },
  anticretico: { a: 'Propietario', b: 'Anticresista', ka: 'propietario', kb: 'anticresista' }
};
let docsClienteId = null;
let docsClienteTipo = 'compraventa';
function abrirDocs(id) {
  docsClienteId = id;
  const c = clientes.find(x => x.id === id); if (!c) return;
  if (!c.docs) c.docs = {};
  docsClienteTipo = c.docs.tipo || 'compraventa';
  document.getElementById('modal-titulo').textContent = `📋 ${c.nombre || c.tel}`;
  document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tipo-btn').forEach(b => { if (b.textContent.toLowerCase().includes(docsClienteTipo === 'anticretico' ? 'anticr' : docsClienteTipo)) b.classList.add('active'); });
  renderChecklist();
  document.getElementById('modal-overlay').classList.add('visible');
  document.getElementById('modal-docs').classList.add('visible');
}
function cerrarModal() {
  document.getElementById('modal-overlay').classList.remove('visible');
  document.getElementById('modal-docs').classList.remove('visible');
}
function setTipoDoc(tipo, btn) {
  docsClienteTipo = tipo;
  const c = clientes.find(x => x.id === docsClienteId); if (!c) return;
  if (!c.docs) c.docs = {};
  c.docs.tipo = tipo;
  guardar();
  document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderChecklist();
}
function getEstadoDoc(c, seccion, idx) {
  return c.docs && c.docs[seccion] && c.docs[seccion][idx] ? c.docs[seccion][idx] : null;
}
function setEstadoDoc(id, seccion, idx, estado) {
  const c = clientes.find(x => x.id === id); if (!c) return;
  if (!c.docs) c.docs = {};
  if (!c.docs[seccion]) c.docs[seccion] = {};
  c.docs[seccion][idx] = c.docs[seccion][idx] === estado ? null : estado;
  guardar();
  renderChecklist();
}
function renderChecklist() {
  const c = clientes.find(x => x.id === docsClienteId); if (!c) return;
  const tipo = docsClienteTipo;
  const lbl = LABELS[tipo];
  const docs = DOCS[tipo];
  const secA = Object.keys(docs)[0];
  const secB = Object.keys(docs)[1];
  let html = '';
  [[lbl.a, secA, docs[secA]], [lbl.b, secB, docs[secB]]].forEach(([label, seccion, lista]) => {
    html += `<div class="checklist-seccion">${label}</div>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:14px;">`;
    lista.forEach((doc, idx) => {
      const est = getEstadoDoc(c, seccion, idx);
      const claseItem = est === 'listo' ? 'listo' : est === 'nn' ? 'no-necesario' : '';
      const claseTexto = est === 'nn' ? 'tachado' : '';
      const borde = idx < lista.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
      html += `<div class="checklist-item ${claseItem}" style="border:none;border-radius:0;${borde}">
        <span class="checklist-texto ${claseTexto}">${doc}</span>
        <div class="checklist-btns">
          <button class="check-btn ${est==='listo'?'ok':''}" onclick="setEstadoDoc(${c.id},'${seccion}',${idx},'listo')">✓ Listo</button>
          <button class="check-btn ${est==='nn'?'nn':''}" onclick="setEstadoDoc(${c.id},'${seccion}',${idx},'nn')">— N/A</button>
        </div>
      </div>`;
    });
    html += `</div>`;
  });
  document.getElementById('checklist-container').innerHTML = html;
  renderDocsPersonalizados(c);
}
function renderDocsPersonalizados(c) {
  const lista = (c.docs && c.docs.personalizados) || [];
  const cont = document.getElementById('docs-personalizados');
  cont.innerHTML = lista.map((d, idx) => `
    <div class="checklist-item ${d.estado==='listo'?'listo':d.estado==='nn'?'no-necesario':''}">
      <span class="checklist-texto ${d.estado==='nn'?'tachado':''}">${d.texto}</span>
      <div class="checklist-btns">
        <button class="check-btn ${d.estado==='listo'?'ok':''}" onclick="setEstadoDocPersonalizado(${idx},'listo')">✓ Listo</button>
        <button class="check-btn ${d.estado==='nn'?'nn':''}" onclick="setEstadoDocPersonalizado(${idx},'nn')">— N/A</button>
        <button class="check-btn" onclick="eliminarDocPersonalizado(${idx})" style="color:var(--danger);">✕</button>
      </div>
    </div>`).join('');
}
function agregarDocPersonalizado() {
  const input = document.getElementById('nuevo-doc-input');
  const texto = input.value.trim(); if (!texto) return;
  const c = clientes.find(x => x.id === docsClienteId); if (!c) return;
  if (!c.docs) c.docs = {};
  if (!c.docs.personalizados) c.docs.personalizados = [];
  c.docs.personalizados.push({ texto, estado: null });
  input.value = '';
  guardar();
  renderDocsPersonalizados(c);
}
function setEstadoDocPersonalizado(idx, estado) {
  const c = clientes.find(x => x.id === docsClienteId); if (!c) return;
  c.docs.personalizados[idx].estado = c.docs.personalizados[idx].estado === estado ? null : estado;
  guardar();
  renderDocsPersonalizados(c);
}
function eliminarDocPersonalizado(idx) {
  const c = clientes.find(x => x.id === docsClienteId); if (!c) return;
  c.docs.personalizados.splice(idx, 1);
  guardar();
  renderDocsPersonalizados(c);
}
let negocioTaps = {};
function toggleNegocio(id) {
  const c = clientes.find(x => x.id === id); if (!c) return;
  const panel = document.getElementById(`negocio-${id}`);
  if (!panel) return;
  if (c.negocioConcluido) {
    // Requiere doble tap
    if (!negocioTaps[id]) {
      negocioTaps[id] = true;
      showToast('Toca de nuevo para abrir');
      setTimeout(() => { negocioTaps[id] = false; }, 2000);
      return;
    }
    negocioTaps[id] = false;
  }
  panel.classList.toggle('hidden');
}
function confirmarNegocio(id, checked) {
  const c = clientes.find(x => x.id === id); if (!c) return;
  c.negocioConcluido = checked;
  if (!checked) {
    // Al desmarcar, volver el cliente a seguimiento activo
    c.estado = 'pensando';
  }
  guardar();
  renderCards();
  showToast(checked ? 'Negocio concluido ✓' : 'Negocio reabierto — cliente en seguimiento');
}
function showView(v) {
  cerrarBusqueda();
  document.getElementById('view-lista').classList.toggle('hidden', v !== 'lista');
  document.getElementById('view-nuevo').classList.toggle('hidden', v !== 'nuevo');
  document.getElementById('view-detalle').classList.toggle('hidden', v !== 'detalle');
  document.getElementById('view-agenda').classList.toggle('hidden', v !== 'agenda');
  document.getElementById('view-historial').classList.toggle('hidden', v !== 'historial');
  document.getElementById('nav-hoy').classList.toggle('active', v === 'lista');
  document.getElementById('nav-nuevo').classList.toggle('active', v === 'nuevo');
  document.getElementById('nav-agenda').classList.toggle('active', v === 'agenda');
  if (v === 'lista') renderCards();
  if (v === 'agenda') renderAgenda();
  window.scrollTo(0, 0);
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${msg}</span>`;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2200);
}
function showToastDeshacer(msg, onDeshacer) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${msg}</span><button class="toast-deshacer" onclick="deshacerContactado()">Deshacer</button>`;
  t._onDeshacer = onDeshacer;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => { t.classList.remove('show'); t._onDeshacer = null; }, 4000);
}
function deshacerContactado() {
  const t = document.getElementById('toast');
  t.classList.remove('show');
  if (t._onDeshacer) { t._onDeshacer(); t._onDeshacer = null; }
}
const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const hoyFecha = new Date();
document.getElementById('header-date').textContent = `${dias[hoyFecha.getDay()]} ${hoyFecha.getDate()} ${meses[hoyFecha.getMonth()]}`;
document.getElementById('sort-icon').textContent = ordenAsc ? '↑' : '↓';
document.getElementById('sort-label').textContent = ordenAsc ? 'Más antiguo' : 'Más reciente';
renderCards();
document.getElementById('search-input').addEventListener('input', function(e) {
  textoBusqueda = normalizar(e.target.value);
  document.getElementById('search-clear').classList.toggle('visible', e.target.value.length > 0);
  renderCards();
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}