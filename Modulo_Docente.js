// ============================================================================
// ARCHIVO: Modulo_Docente.js (VERSIÓN DEFINITIVA - CORREGIDA Y COMPLETA)
// ============================================================================

let cursoActualData = null; 
let idMateriaActual = null;

// --- 1. PANTALLA INICIAL (GRID DE CURSOS) ---
async function iniciarModuloDocente() {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Cargando cursos...</p></div>`;
    
    try {
        const resp = await fetch(`${URL_API}?op=getCursosDocente&rol=Docente&dni=${usuarioActual.dni}`);
        const json = await resp.json();
        
        if (json.status !== 'success' || !json.data || json.data.length === 0) {
            contenedor.innerHTML = `<div class="alert alert-warning">No tienes cursos asignados.</div>`;
            return;
        }
        
        let html = `<h4 class="mb-4">🏫 Mis Cursos Asignados</h4><div class="row">`;
        
        json.data.forEach(grupo => {
            grupo.materias.forEach(mat => {
                html += `
                <div class="col-md-4 mb-3">
                    <div class="card shadow-sm border-start border-4 border-primary h-100 cursor-pointer" 
                         onclick="cargarVistaAsistencia('${mat.id}')" style="cursor:pointer;">
                        <div class="card-body hover-effect">
                            <h5 class="card-title text-primary fw-bold">${grupo.curso}</h5>
                            <h6 class="card-subtitle mb-2 text-dark">${mat.nombre}</h6>
                            <p class="small text-muted mb-0">
                                <i class="bi bi-people"></i> ${mat.cantidadEstudiantes || 0} Alumnos
                            </p>
                            <div class="mt-2 text-end">
                                <span class="badge bg-light text-primary">Ingresar ➜</span>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
        });
        html += `</div>`;
        contenedor.innerHTML = html;

    } catch (e) {
        console.error(e);
        contenedor.innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
    }
}

// --- 2. VISTA DETALLADA DEL CURSO ---
async function cargarVistaAsistencia(idMateria, fecha = null) {
    idMateriaActual = idMateria; 
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Obteniendo datos...</p></div>`;
    
    const fechaQuery = fecha || new Date().toISOString().split('T')[0];

    try {
        const url = `${URL_API}?op=getEstudiantesConDatosCompletos&rol=Docente&dni=${usuarioActual.dni}&idMateria=${idMateria}&fecha=${fechaQuery}`;
        const resp = await fetch(url);
        const json = await resp.json();
        
        if (json.status !== 'success') throw new Error(json.message);
        
        cursoActualData = json.data; 
        const d = cursoActualData;

        injectarModalJustificar();

        let html = `
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <div>
                <button class="btn btn-sm btn-outline-secondary mb-1" onclick="iniciarModuloDocente()">⬅ Volver</button>
                <h4 class="mb-0 text-primary">${d.materia.nombre} <span class="badge bg-secondary fs-6">${d.materia.curso}</span></h4>
            </div>
        </div>

        <ul class="nav nav-tabs mb-3">
            <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#panel-asist">📅 Asistencia</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#panel-notas">📊 Notas</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#panel-resumen">📈 Resumen</button></li>
        </ul>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="panel-asist">
                <div class="row mb-3 bg-light p-3 rounded mx-0 align-items-end g-2">
                    <div class="col-md-4">
                        <label class="fw-bold small text-muted">Fecha:</label>
                        <input type="date" class="form-control" id="fechaAsistencia" value="${json.data.fechaVisualizando}" 
                               onchange="cargarVistaAsistencia('${idMateria}', this.value)">
                    </div>
                    <div class="col-md-8 text-end">
                         <button id="btnGuardarAsis" class="btn btn-success" onclick="guardarAsistencia()">
                            💾 Guardar Asistencia
                         </button>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-light">
                            <tr><th>Estudiante</th><th style="min-width:180px">Asistencia</th><th class="text-center d-none d-sm-table-cell">Stats</th><th class="text-center">Acción</th></tr>
                        </thead>
                        <tbody id="tbody-asistencia">${renderFilasAsistencia(d.estudiantes)}</tbody>
                    </table>
                </div>
            </div>

            <div class="tab-pane fade" id="panel-notas">
                <div class="d-flex justify-content-end mb-2"><button class="btn btn-primary" onclick="guardarNotas()">💾 Guardar Notas</button></div>
                <div class="table-responsive">
                    <table class="table table-bordered table-sm align-middle text-center" style="min-width: 900px;">
                        <thead class="table-light">
                            <tr>
                                <th rowspan="2">Estudiante</th><th colspan="2">1° Cuat</th><th colspan="2">2° Cuat</th>
                                <th rowspan="2">Prom</th><th rowspan="2">Dic</th><th rowspan="2">Feb</th><th rowspan="2">Def</th>
                            </tr>
                            <tr><th>Reg</th><th>Int</th><th>Reg</th><th>Int</th></tr>
                        </thead>
                        <tbody id="tbody-notas">${renderFilasNotas(d.estudiantes)}</tbody>
                    </table>
                </div>
            </div>

            <div class="tab-pane fade" id="panel-resumen">${renderResumen(d.estudiantes)}</div>
        </div>`;

        contenedor.innerHTML = html;
        
        // Inicializar lógica de notas
        document.querySelectorAll('.fila-notas').forEach(tr => calcularLogicaFila(tr));

    } catch (e) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div><button class="btn btn-secondary" onclick="iniciarModuloDocente()">Volver</button>`;
    }
}

// --- 3. FUNCIONES DE ASISTENCIA ---

function renderFilasAsistencia(estudiantes) {
    if(!estudiantes || !estudiantes.length) return '<tr><td colspan="4" class="text-center py-3">No hay estudiantes.</td></tr>';
    
    return estudiantes.map(e => {
        let estado = (e.asistenciaDia && e.asistenciaDia.estado) ? e.asistenciaDia.estado : ''; 
        
        let btnP = estado === 'P' ? 'btn-success' : 'btn-outline-success';
        let btnA = estado === 'A' ? 'btn-danger' : 'btn-outline-danger';
        let btnT = estado === 'T' ? 'btn-warning' : 'btn-outline-warning';

        let colorCond = e.condicion.toLowerCase().includes('recur') ? 'bg-warning text-dark' : 'bg-light text-secondary border';

        return `
        <tr data-dni="${e.dni}">
            <td class="align-middle">
                <div class="fw-bold" style="font-size: 1rem;">${e.nombre}</div>
                <span class="badge ${colorCond} rounded-pill">${e.condicion}</span>
            </td>
            <td class="align-middle">
                <div class="d-flex gap-2" style="min-width: 160px;">
                    <button type="button" class="btn ${btnP} flex-fill py-2 shadow-sm fw-bold" 
                        onclick="seleccionarAsistencia(this, '${e.dni}', 'P')">P</button>
                    <button type="button" class="btn ${btnA} flex-fill py-2 shadow-sm fw-bold" 
                        onclick="seleccionarAsistencia(this, '${e.dni}', 'A')">A</button>
                    <button type="button" class="btn ${btnT} flex-fill py-2 shadow-sm fw-bold" 
                        onclick="seleccionarAsistencia(this, '${e.dni}', 'T')">T</button>
                </div>
            </td>
            <td class="text-center align-middle d-none d-sm-table-cell">
                <span class="badge bg-primary mb-1">${e.stats.porcentaje || 0}%</span><br>
                <span class="text-danger small fw-bold">${parseFloat(e.stats.faltas || 0)} F.</span>
            </td>
            <td class="text-center align-middle">
                <button class="btn btn-outline-secondary btn-sm py-2 px-3" onclick="abrirModalJustificar('${e.dni}', '${e.nombre}')">📜</button>
            </td>
        </tr>`;
    }).join('');
}

function seleccionarAsistencia(btn, dni, valor) {
    const fila = btn.closest('td').querySelector('.d-flex');
    const botones = fila.querySelectorAll('button');
    
    botones.forEach(b => {
        if (b.classList.contains('btn-success')) b.classList.replace('btn-success', 'btn-outline-success');
        if (b.classList.contains('btn-danger')) b.classList.replace('btn-danger', 'btn-outline-danger');
        if (b.classList.contains('btn-warning')) b.classList.replace('btn-warning', 'btn-outline-warning');
    });

    if (valor === 'P') btn.classList.replace('btn-outline-success', 'btn-success');
    else if (valor === 'A') btn.classList.replace('btn-outline-danger', 'btn-danger');
    else if (valor === 'T') btn.classList.replace('btn-outline-warning', 'btn-warning');

    if (cursoActualData && cursoActualData.estudiantes) {
        let alumno = cursoActualData.estudiantes.find(e => String(e.dni) === String(dni));
        if (alumno) {
            if(!alumno.asistenciaDia) alumno.asistenciaDia = {};
            alumno.asistenciaDia.estado = valor;
        }
    }
}

async function guardarAsistencia() {
    if (!usuarioActual || !usuarioActual.dni) { alert("⚠️ Sesión expirada."); return; }
    const btn = document.getElementById('btnGuardarAsis');
    const inputFecha = document.getElementById('fechaAsistencia');

    if (!inputFecha || !idMateriaActual || !cursoActualData) { alert("Error de datos."); return; }
    if (!inputFecha.value) { alert("Seleccione una fecha."); return; }

    btn.disabled = true;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    const asistenciaPayload = cursoActualData.estudiantes
        .filter(e => e.asistenciaDia && e.asistenciaDia.estado)
        .map(e => ({ dni: e.dni, estado: e.asistenciaDia.estado }));

    if (asistenciaPayload.length === 0) {
        if(!confirm("⚠️ No hay asistencias. Se borrarán los datos de este día. ¿Continuar?")) {
            btn.disabled = false; btn.innerHTML = textoOriginal; return;
        }
    }

    try {
        const resp = await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify({
                op: 'guardarAsistenciaDocente',
                dniDocente: usuarioActual.dni,
                idMateria: idMateriaActual,
                fecha: inputFecha.value,
                asistencia: asistenciaPayload
            }) 
        });
        const json = await resp.json();
        if (json.status === 'success') {
            alert("✅ Asistencia guardada.");
            cargarVistaAsistencia(idMateriaActual, inputFecha.value);
        } else {
            alert("❌ Error: " + json.message);
        }
    } catch (e) { alert("❌ Error de conexión"); } 
    finally { btn.disabled = false; btn.innerHTML = textoOriginal; }
}

// --- 4. JUSTIFICAR Y DATOS DOCENTE ---

function injectarModalJustificar() {
    if (!document.getElementById('modalJustificarFalta')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="modalJustificarFalta" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-warning">
                            <h5 class="modal-title">Justificar Inasistencia</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h6 id="lblAlumnoJustificar" class="fw-bold"></h6>
                            <div id="listaFaltasContainer" class="list-group mt-3"></div>
                        </div>
                    </div>
                </div>
            </div>`);
    }
}

async function abrirModalJustificar(dni, nombre) {
    const modal = new bootstrap.Modal(document.getElementById('modalJustificarFalta'));
    document.getElementById('lblAlumnoJustificar').innerText = nombre;
    document.getElementById('listaFaltasContainer').innerHTML = '<div class="text-center"><div class="spinner-border text-warning"></div></div>';
    modal.show();

    try {
        const resp = await fetch(`${URL_API}?op=getHistorialFaltasAlumno&rol=Docente&dni=${dni}&idMateria=${idMateriaActual}`);
        const json = await resp.json();
        const container = document.getElementById('listaFaltasContainer');
        container.innerHTML = '';

        if(json.data.length === 0) {
            container.innerHTML = '<div class="alert alert-success">No hay inasistencias para justificar.</div>';
        } else {
            json.data.forEach(f => {
                let badgeTipo = f.estado === 'T' ? 'bg-warning text-dark' : 'bg-danger';
                let etiqueta = f.estado === 'T' ? 'Tardanza' : 'Ausente';
                
                let accionHtml = f.justificado === 'Si' 
                    ? `<span class="badge bg-success border border-success p-2"><i class="bi bi-check-circle-fill"></i> Justificada</span>` 
                    : `<button class="btn btn-sm btn-warning shadow-sm" onclick="justificarAccion('${dni}', '${f.fechaIso}', this)">Justificar</button>`;
                
                container.innerHTML += `
                <div class="list-group-item d-flex justify-content-between align-items-center mb-2 shadow-sm border rounded">
                    <div><span class="fw-bold">${f.fecha}</span> <span class="badge ${badgeTipo} ms-2">${etiqueta}</span></div>
                    ${accionHtml}
                </div>`;
            });
        }
    } catch(e) { console.error(e); }
}

async function justificarAccion(dni, fechaIso, btn) {
    if(!confirm("¿Justificar esta falta?")) return;
    btn.disabled = true;
    try {
        const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify({op: 'justificarFaltaDocente', dni, idMateria: idMateriaActual, fechaIso}) });
        const json = await resp.json();
        if(json.status === 'success') {
            btn.parentElement.innerHTML = `<span class="badge bg-success border border-success p-2"><i class="bi bi-check-circle-fill"></i> Justificada</span>`;
            cargarVistaAsistencia(idMateriaActual, document.getElementById('fechaAsistencia').value);
        } else {
            alert("Error: " + json.message);
            btn.disabled = false;
        }
    } catch(e) { alert("Error de conexión"); }
}

async function verMisDatosDocente() {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Cargando ficha...</p></div>`;

    try {
        const resp = await fetch(`${URL_API}?op=getMisDatos&rol=Docente&dni=${usuarioActual.dni}`);
        const json = await resp.json();

        if (json.status === 'success') {
            const d = json.data;
            contenedor.innerHTML = `
            <div class="card shadow-sm mx-auto" style="max-width: 500px;">
                <div class="card-header bg-primary text-white text-center"><h5 class="mb-0">👤 Mi Ficha Docente</h5></div>
                <div class="card-body">
                    <div class="mb-3"><label class="text-muted small">Nombre Completo</label><p class="fs-5 fw-bold">${d.nombre}</p></div>
                    <div class="mb-3"><label class="text-muted small">DNI</label><p class="fs-5">${d.dni}</p></div>
                    <div class="mb-3"><label class="text-muted small">Email</label><p class="fs-6">${d.email}</p></div>
                    <hr>
                    <div class="alert alert-warning d-flex align-items-center"><i class="bi bi-exclamation-triangle-fill fs-4 me-3"></i><small>Para cambios, comuníquese con el Equipo Directivo.</small></div>
                </div>
            </div>`;
        } else { contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar datos.</div>`; }
    } catch (e) { contenedor.innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`; }
}

// --- 5. FUNCIONES NOTAS (LÓGICA RITE REACTIVA) ---

function renderFilasNotas(estudiantes) {
    return estudiantes.map(e => {
        const n = e.notas || { n1:'', i1:'', n2:'', i2:'', dic:'', feb:'', def:'' };
        return `
        <tr class="fila-notas" data-dni="${e.dni}">
            <td class="text-start ps-2 fw-bold text-truncate" style="max-width: 150px;">${e.nombre}</td>
            <td><input type="number" class="form-control form-control-sm inp-nota n1" value="${n.n1 || ''}" min="1" max="10"></td>
            <td><input type="number" class="form-control form-control-sm inp-nota i1" value="${n.i1 || ''}" min="1" max="10" disabled></td>
            <td><input type="number" class="form-control form-control-sm inp-nota n2" value="${n.n2 || ''}" min="1" max="10"></td>
            <td><input type="number" class="form-control form-control-sm inp-nota i2" value="${n.i2 || ''}" min="1" max="10" disabled></td>
            <td class="bg-info bg-opacity-10 fw-bold"><span class="promedio">-</span></td>
            <td><input type="number" class="form-control form-control-sm inp-nota dic" value="${n.dic || ''}" min="1" max="10" disabled></td>
            <td><input type="number" class="form-control form-control-sm inp-nota feb" value="${n.feb || ''}" min="1" max="10" disabled></td>
            <td class="fw-bold fs-6 text-center"><span class="definitiva badge bg-secondary">${n.def || '-'}</span></td>
        </tr>`;
    }).join('');
}

function calcularLogicaFila(tr) {
    const getVal = (cls) => {
        let v = tr.querySelector('.' + cls).value;
        return v === "" ? null : parseFloat(v);
    };
    
    const inI1 = tr.querySelector('.i1');
    const inI2 = tr.querySelector('.i2');
    const inDic = tr.querySelector('.dic');
    const inFeb = tr.querySelector('.feb');
    const spProm = tr.querySelector('.promedio');
    const spDef = tr.querySelector('.definitiva');

    const n1 = getVal('n1');
    const n2 = getVal('n2');

    // 1. Reactividad Intensificaciones
    if (n1 !== null && n1 < 7) inI1.disabled = false; 
    else { inI1.disabled = true; inI1.value = ""; }

    if (n2 !== null && n2 < 7) inI2.disabled = false;
    else { inI2.disabled = true; inI2.value = ""; }

    // 2. Aprobación por Cuatrimestre
    const valI1 = getVal('i1');
    const valI2 = getVal('i2');

    let notaEfec1 = 0, c1Aprobado = false;
    if (n1 !== null && n1 >= 7) { c1Aprobado = true; notaEfec1 = n1; }
    else if (valI1 !== null && valI1 >= 7) { c1Aprobado = true; notaEfec1 = valI1; }

    let notaEfec2 = 0, c2Aprobado = false;
    if (n2 !== null && n2 >= 7) { c2Aprobado = true; notaEfec2 = n2; }
    else if (valI2 !== null && valI2 >= 7) { c2Aprobado = true; notaEfec2 = valI2; }

    // 3. Cascada de Definición
    let definitiva = "-", color = "bg-secondary", promedio = "-";

    if (c1Aprobado && c2Aprobado) {
        let calcProm = (notaEfec1 + notaEfec2) / 2;
        promedio = Number.isInteger(calcProm) ? calcProm : calcProm.toFixed(2);
        definitiva = promedio;
        color = "bg-success"; 
        inDic.disabled = true; inDic.value = "";
        inFeb.disabled = true; inFeb.value = "";
    } else {
        promedio = "-";
        inDic.disabled = false;
        
        const valDic = getVal('dic');
        if (valDic !== null) {
            if (valDic >= 4) {
                definitiva = valDic; color = "bg-warning text-dark";
                inFeb.disabled = true; inFeb.value = "";
            } else {
                definitiva = "C.I."; color = "bg-danger";
                inFeb.disabled = false;
                const valFeb = getVal('feb');
                if (valFeb !== null) {
                    if (valFeb >= 4) { 
                        definitiva = valFeb; color = "bg-warning text-dark"; }
                    else { definitiva = "Desaprobado"; color = "bg-danger"; }
                }
            }
        } else {
            inFeb.disabled = true; inFeb.value = "";
        }
    }

    spProm.innerText = promedio;
    spDef.innerText = definitiva;
    spDef.className = `definitiva badge ${color}`;
}

async function guardarNotas() {
    const filas = document.querySelectorAll('.fila-notas');
    let paquete = [];
    filas.forEach(tr => {
        paquete.push({
            dni: tr.getAttribute('data-dni'),
            n1: tr.querySelector('.n1').value, i1: tr.querySelector('.i1').value,
            n2: tr.querySelector('.n2').value, i2: tr.querySelector('.i2').value,
            dic: tr.querySelector('.dic').value, feb: tr.querySelector('.feb').value,
            def: tr.querySelector('.definitiva').innerText
        });
    });
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'guardarNotasMasivo', idMateria: idMateriaActual, notas: paquete }) });
        alert('Notas guardadas.');
    } catch(e) { alert('Error al guardar.'); }
}

function renderResumen(estudiantes) {
    if (!estudiantes || estudiantes.length === 0) return '<div class="alert alert-info">Sin datos para mostrar.</div>';

    // --- 1. CÁLCULOS ESTADÍSTICOS ---
    let totalAlumnos = estudiantes.length;
    let riesgoFaltas = 0;     // Asistencia < 75%
    let contConNota = 0;      // Cantidad con nota numérica válida
    let sumaNotas = 0;
    
    // Distribución de Notas
    let dist = { 
        bajos: 0,      // 1 a 3 (Desaprobados)
        medios: 0,     // 4 a 6 (Aprobados)
        altos: 0       // 7 a 10 (Destacados/Promoción)
    };

    estudiantes.forEach(e => {
        // A. Cálculo de Riesgo de Faltas (< 75%)
        let asis = e.stats.porcentaje !== undefined ? e.stats.porcentaje : 100;
        if (asis < 75) riesgoFaltas++;

        // B. Cálculo de Notas
        // Intentamos leer la definitiva, asegurando formato numérico (punto o coma)
        let defStr = e.notas && e.notas.def ? String(e.notas.def).replace(',', '.') : '';
        let nota = parseFloat(defStr);

        if (!isNaN(nota)) {
            contConNota++;
            sumaNotas += nota;

            if (nota < 4) dist.bajos++;
            else if (nota < 7) dist.medios++;
            else dist.altos++;
        }
    });

    let sinNota = totalAlumnos - contConNota;
    let promedio = contConNota > 0 ? (sumaNotas / contConNota).toFixed(2) : '-';
    let progresoCarga = Math.round((contConNota / totalAlumnos) * 100);

    // Colores dinámicos
    let colorRiesgo = riesgoFaltas > 0 ? 'danger' : 'success';
    let colorCarga = progresoCarga === 100 ? 'success' : (progresoCarga > 50 ? 'primary' : 'warning');

    // --- 2. GENERACIÓN DE HTML ---
    return `
    <div class="card mb-4 shadow-sm">
        <div class="card-body">
            <div class="row g-4 text-center">
                
                <div class="col-md-3 border-end">
                    <h6 class="text-muted mb-3">Alertas</h6>
                    
                    <div class="mb-3">
                        <h2 class="text-${colorRiesgo} fw-bold mb-0">${riesgoFaltas}</h2>
                        <small class="text-muted">En Riesgo (Asist < 75%)</small>
                    </div>

                    <div>
                        <h4 class="text-secondary fw-bold mb-0">${sinNota}</h4>
                        <small class="text-muted">Alumnos sin Nota</small>
                    </div>
                </div>

                <div class="col-md-5 border-end">
                    <h6 class="text-muted mb-3">Rendimiento del Curso</h6>
                    
                    <div class="d-flex justify-content-center align-items-center mb-3">
                        <div class="me-3">
                            <span class="display-6 fw-bold text-dark">${promedio}</span>
                            <div class="small text-muted">Promedio Gral.</div>
                        </div>
                    </div>

                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-danger" role="progressbar" style="width: ${(dist.bajos/contConNota)*100}%" title="Desaprobados (<4): ${dist.bajos}">${dist.bajos > 0 ? dist.bajos : ''}</div>
                        <div class="progress-bar bg-warning text-dark" role="progressbar" style="width: ${(dist.medios/contConNota)*100}%" title="Aprobados (4-6): ${dist.medios}">${dist.medios > 0 ? dist.medios : ''}</div>
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${(dist.altos/contConNota)*100}%" title="Destacados (7-10): ${dist.altos}">${dist.altos > 0 ? dist.altos : ''}</div>
                    </div>
                    <div class="d-flex justify-content-between small text-muted mt-1">
                        <span>Bajos</span><span>Medios</span><span>Altos</span>
                    </div>
                </div>

                <div class="col-md-4">
                    <h6 class="text-muted mb-3">Estado de Carga</h6>
                    
                    <div class="position-relative d-inline-block mb-2">
                        <h2 class="text-${colorCarga}">${progresoCarga}%</h2>
                    </div>
                    <div class="progress mb-2" style="height: 8px;">
                        <div class="progress-bar bg-${colorCarga}" role="progressbar" style="width: ${progresoCarga}%"></div>
                    </div>
                    <p class="small text-muted mb-0">
                        ${contConNota} de ${totalAlumnos} notas cerradas
                    </p>
                </div>

            </div>
        </div>
    </div>
    `;
}

// --- 6. EVENT LISTENER EN VIVO (IMPORTANTE) ---
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('inp-nota')) {
        calcularLogicaFila(e.target.closest('tr'));
    }
});
