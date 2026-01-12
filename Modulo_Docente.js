// ============================================================================
// ARCHIVO: Modulo_Docente.js (VERSIÓN FINAL INTEGRADA)
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
                // LLAMADA CORREGIDA: Usa el ID único triturado (ej: 'matematica2do1ra')
                html += `
                <div class="col-md-4 mb-3">
                    <div class="card shadow-sm border-start border-4 border-primary h-100 cursor-pointer" 
                         onclick="cargarVistaAsistencia('${mat.id}')" style="cursor:pointer;">
                        <div class="card-body hover-effect">
                            <h5 class="card-title text-primary fw-bold">${grupo.curso}</h5>
                            <h6 class="card-subtitle mb-2 text-dark">${mat.nombre}</h6>
                            <p class="small text-muted mb-0">
                                <i class="bi bi-people"></i> ${mat.cantidadEstudiantes || mat.totalEstudiantes || 0} Alumnos
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

// --- 2. VISTA DETALLADA DEL CURSO (ASISTENCIA, NOTAS, RESUMEN) ---
async function cargarVistaAsistencia(idMateria, fecha = null) {
    idMateriaActual = idMateria; 
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Obteniendo datos...</p></div>`;
    
    const fechaQuery = fecha || new Date().toISOString().split('T')[0];

    try {
        // Pedimos datos completos (Materia + Alumnos + Asistencia del día)
        const url = `${URL_API}?op=getEstudiantesConDatosCompletos&rol=Docente&dni=${usuarioActual.dni}&idMateria=${idMateria}&fecha=${fechaQuery}`;
        const resp = await fetch(url);
        const json = await resp.json();
        
        if (json.status !== 'success') throw new Error(json.message);
        
        cursoActualData = json.data; // GUARDAMOS EN MEMORIA GLOBAL
        const d = cursoActualData;

        // Inyectar Modal Justificar (si no existe)
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
                            <tr>
                                <th>Estudiante</th>
                                <th style="min-width:180px">Asistencia</th>
                                <th class="text-center d-none d-sm-table-cell">Stats</th>
                                <th class="text-center">Acción</th>
                            </tr>
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

// --- 3. FUNCIONES DE ASISTENCIA (LÓGICA GRANDE / TOUCH) ---

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
                <button class="btn btn-outline-secondary btn-sm py-2 px-3" onclick="abrirModalJustificar('${e.dni}', '${e.nombre}')">
                   📜
                </button>
            </td>
        </tr>`;
    }).join('');
}


function seleccionarAsistencia(btn, dni, valor) {
    // 1. Reset visual de los hermanos
    const fila = btn.closest('td').querySelector('.d-flex');
    const botones = fila.querySelectorAll('button');
    
    botones.forEach(b => {
        if (b.classList.contains('btn-success')) b.classList.replace('btn-success', 'btn-outline-success');
        if (b.classList.contains('btn-danger')) b.classList.replace('btn-danger', 'btn-outline-danger');
        if (b.classList.contains('btn-warning')) b.classList.replace('btn-warning', 'btn-outline-warning');
    });

    // 2. Pintar activo el seleccionado
    if (valor === 'P') btn.classList.replace('btn-outline-success', 'btn-success');
    else if (valor === 'A') btn.classList.replace('btn-outline-danger', 'btn-danger');
    else if (valor === 'T') btn.classList.replace('btn-outline-warning', 'btn-warning');

    // 3. ACTUALIZAR MEMORIA (CRUCIAL PARA GUARDAR)
    if (cursoActualData && cursoActualData.estudiantes) {
        let alumno = cursoActualData.estudiantes.find(e => String(e.dni) === String(dni));
        if (alumno) {
            if(!alumno.asistenciaDia) alumno.asistenciaDia = {};
            alumno.asistenciaDia.estado = valor;
        }
    }
}

async function guardarAsistencia() {
    // Seguridad
    if (!usuarioActual || !usuarioActual.dni) { alert("⚠️ Sesión expirada."); return; }
    
    const btn = document.getElementById('btnGuardarAsis');
    const inputFecha = document.getElementById('fechaAsistencia');

    if (!inputFecha || !idMateriaActual || !cursoActualData) {
        alert("Error de datos. Recargue la página."); return;
    }

    const fecha = inputFecha.value;
    if (!fecha) { alert("Seleccione una fecha."); return; }

    // Bloqueo botón
    btn.disabled = true;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    // 1. RECOLECTAR DATOS DE MEMORIA
    const asistenciaPayload = cursoActualData.estudiantes
        .filter(e => e.asistenciaDia && e.asistenciaDia.estado)
        .map(e => ({ dni: e.dni, estado: e.asistenciaDia.estado }));

    // 2. ADVERTENCIA SI ESTÁ VACÍO
    if (asistenciaPayload.length === 0) {
        if(!confirm("⚠️ No has marcado ninguna asistencia (P, A o T).\nSi guardas ahora, borrarás lo que haya en este día.\n¿Continuar?")) {
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
            return;
        }
    }

    const datos = {
        op: 'guardarAsistenciaDocente',
        dniDocente: usuarioActual.dni,
        idMateria: idMateriaActual,
        fecha: fecha,
        asistencia: asistenciaPayload
    };

    try {
        const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        const json = await resp.json();
        
        if (json.status === 'success') {
            alert("✅ Asistencia guardada correctamente.");
            cargarVistaAsistencia(idMateriaActual, fecha); // Recargar para actualizar stats
        } else {
            alert("❌ Error: " + json.message);
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }
    } catch (e) {
        alert("❌ Error de conexión");
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

// --- 4. JUSTIFICACIÓN DE FALTAS ---

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
                // LÓGICA VISUAL: Si ya está justificado ('Si'), mostramos badge verde. Si no, botón amarillo.
                let accionHtml = '';
                
                if (f.justificado === 'Si') {
                    accionHtml = `<span class="badge bg-success border border-success p-2">
                                    <i class="bi bi-check-circle-fill"></i> Justificada
                                  </span>`;
                } else {
                    accionHtml = `<button class="btn btn-sm btn-warning shadow-sm" onclick="justificarAccion('${dni}', '${f.fechaIso}', this)">
                                    Justificar
                                  </button>`;
                }
                
                // Muestra si es Ausente (A) o Tarde (T)
                let badgeTipo = f.estado === 'T' ? 'bg-warning text-dark' : 'bg-danger';
                let etiqueta = f.estado === 'T' ? 'Tardanza' : 'Ausente';

                container.innerHTML += `
                <div class="list-group-item d-flex justify-content-between align-items-center mb-2 shadow-sm border rounded">
                    <div>
                        <span class="fw-bold">${f.fecha}</span> 
                        <span class="badge ${badgeTipo} ms-2">${etiqueta}</span>
                    </div>
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
            btn.parentElement.innerHTML = `<span class="badge bg-success">Justificada</span>`;
            // Recargamos vista
            const fechaActualInput = document.getElementById('fechaAsistencia').value;
            cargarVistaAsistencia(idMateriaActual, fechaActualInput);
        } else {
            alert("Error: " + json.message);
            btn.disabled = false;
        }
    } catch(e) { alert("Error de conexión"); }
}

// --- 5. FICHA DE "MIS DATOS" (CON ALERTA) ---

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
                <div class="card-header bg-primary text-white text-center">
                    <h5 class="mb-0">👤 Mi Ficha Docente</h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="text-muted small">Nombre Completo</label>
                        <p class="fs-5 fw-bold">${d.nombre}</p>
                    </div>
                    <div class="mb-3">
                        <label class="text-muted small">DNI</label>
                        <p class="fs-5">${d.dni}</p>
                    </div>
                    <div class="mb-3">
                        <label class="text-muted small">Email Registrado</label>
                        <p class="fs-6">${d.email}</p>
                    </div>
                    <div class="mb-3">
                        <label class="text-muted small">Celular / Contacto</label>
                        <p class="fs-6">${d.celular || 'No registrado'}</p>
                    </div>
                    <hr>
                    <div class="alert alert-warning d-flex align-items-center" role="alert">
                        <i class="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                        <small>
                            Esta información es la que figura en los registros de Dirección. 
                            <strong>Si desea modificar algún dato, por favor comuníquese con el Equipo Directivo.</strong>
                        </small>
                    </div>
                </div>
            </div>`;
        } else {
            contenedor.innerHTML = `<div class="alert alert-danger">No se pudieron cargar los datos.</div>`;
        }
    } catch (e) {
        console.error(e);
        contenedor.innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
    }
}

// --- 6. FUNCIONES NOTAS (LÓGICA RITE INTACTA) ---

function renderFilasNotas(estudiantes) {
    return estudiantes.map(e => {
        // Nos aseguramos que n sea un objeto, si falla el backend usamos vacío
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
    // 1. HELPER: Obtener valor numérico seguro
    const getVal = (cls) => {
        let v = tr.querySelector('.' + cls).value;
        return v === "" ? null : parseFloat(v); // Retorna null si está vacío para diferenciar de 0
    };
    const hasVal = (cls) => tr.querySelector('.' + cls).value !== "";

    // 2. ELEMENTOS DOM
    const inN1 = tr.querySelector('.n1');
    const inI1 = tr.querySelector('.i1');
    const inN2 = tr.querySelector('.n2');
    const inI2 = tr.querySelector('.i2');
    
    const inDic = tr.querySelector('.dic');
    const inFeb = tr.querySelector('.feb');
    
    const spProm = tr.querySelector('.promedio');
    const spDef = tr.querySelector('.definitiva');

    // 3. OBTENER DATOS
    const n1 = getVal('n1');
    const i1 = getVal('i1');
    const n2 = getVal('n2');
    const i2 = getVal('i2');

    // =========================================================
    // ETAPA 1: VALIDACIÓN DE INTENSIFICACIONES (Regla 1)
    // =========================================================
    
    // Cuatrimestre 1
    if (n1 !== null && n1 < 7) {
        inI1.disabled = false; // Habilitar si < 7
    } else {
        inI1.disabled = true; 
        if (n1 !== null && n1 >= 7) inI1.value = ""; // Limpiar si aprobó la regular
    }

    // Cuatrimestre 2
    if (n2 !== null && n2 < 7) {
        inI2.disabled = false; 
    } else {
        inI2.disabled = true; 
        if (n2 !== null && n2 >= 7) inI2.value = ""; 
    }

    // =========================================================
    // ETAPA 2: CÁLCULO DE APROBACIÓN POR CUATRIMESTRE
    // =========================================================
    
    // Determinar nota efectiva C1 (Nota o Intensificación)
    let notaEfec1 = 0;
    let c1Aprobado = false;

    if (n1 !== null && n1 >= 7) {
        c1Aprobado = true;
        notaEfec1 = n1;
    } else if (i1 !== null && i1 >= 7) {
        c1Aprobado = true;
        notaEfec1 = i1; // Vale la intensificación si es >= 7
    }

    // Determinar nota efectiva C2
    let notaEfec2 = 0;
    let c2Aprobado = false;

    if (n2 !== null && n2 >= 7) {
        c2Aprobado = true;
        notaEfec2 = n2;
    } else if (i2 !== null && i2 >= 7) {
        c2Aprobado = true;
        notaEfec2 = i2;
    }

    // =========================================================
    // ETAPA 3: DEFINICIÓN DE TRAYECTORIA (Reglas 2, 3 y 4)
    // =========================================================

    let definitiva = "-";
    let color = "bg-secondary";
    let promedio = "-";

    // CASO A: PROMOCIONA (Ambos aprobados con >= 7)
    if (c1Aprobado && c2Aprobado) {
        let calcProm = (notaEfec1 + notaEfec2) / 2;
        
        // Mostrar promedio (puede tener decimales, ej: 7.50)
        promedio = Number.isInteger(calcProm) ? calcProm : calcProm.toFixed(2);
        
        // La definitiva es el promedio
        definitiva = promedio;
        color = "bg-success"; // Verde

        // Limpiar y bloquear instancias futuras
        inDic.disabled = true; inDic.value = "";
        inFeb.disabled = true; inFeb.value = "";
    } 
    // CASO B: NO PROMOCIONA (Va a Diciembre)
    else {
        // Promedio oculto (Regla 2)
        promedio = "-"; 

        // Habilitar Diciembre
        inDic.disabled = false;
        
        // Logica Diciembre
        const valDic = getVal('dic');

        if (valDic !== null) {
            if (valDic >= 4) {
                // APROBÓ DICIEMBRE
                definitiva = valDic;
                color = "bg-warning text-dark"; // Amarillo (Aprobado en instancia)
                
                // Bloquear Febrero
                inFeb.disabled = true; inFeb.value = "";
            } else {
                // DESAPROBÓ DICIEMBRE -> Va a Febrero
                definitiva = "C.I."; // Regla 3
                color = "bg-danger"; // Rojo
                
                // Habilitar Febrero
                inFeb.disabled = false;

                // Logica Febrero
                const valFeb = getVal('feb');
                if (valFeb !== null) {
                    if (valFeb >= 4) {
                        // APROBÓ FEBRERO
                        definitiva = valFeb;
                        color = "bg-warning text-dark";
                    } else {
                        // DESAPROBÓ FEBRERO
                        definitiva = "Desaprobado"; // Regla 4
                        color = "bg-danger";
                    }
                }
            }
        } else {
            // Si Diciembre está vacío, Febrero está deshabilitado esperando a Dic.
            inFeb.disabled = true; 
            inFeb.value = "";
        }
    }

    // =========================================================
    // ETAPA 4: RENDERIZADO FINAL
    // =========================================================
    
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
            n1: tr.querySelector('.n1').value,
            i1: tr.querySelector('.i1').value,
            n2: tr.querySelector('.n2').value,
            i2: tr.querySelector('.i2').value,
            dic: tr.querySelector('.dic').value,
            feb: tr.querySelector('.feb').value,
            def: tr.querySelector('.definitiva').innerText
        });
    });

    try {
        await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify({
                op: 'guardarNotasMasivo',
                idMateria: idMateriaActual,
                notas: paquete
            })
        });
        alert('Notas guardadas.');
    } catch(e) { alert('Error al guardar.'); }
}

function renderResumen(estudiantes) {
    if (!estudiantes || estudiantes.length === 0) return '<div class="alert alert-info">Sin datos.</div>';

    let aprobados = 0, recursantes = 0, totalAsist = 0;
    
    estudiantes.forEach(e => {
        const def = e.notas && e.notas.def ? e.notas.def : '-';
        if (!isNaN(parseFloat(def)) && parseFloat(def) >= 4) aprobados++;
        if (def === 'C.I.') recursantes++;
        totalAsist += (e.stats.porcentaje || 0);
    });

    const promAsist = estudiantes.length ? Math.round(totalAsist / estudiantes.length) : 0;

    return `
    <div class="row g-3 text-center">
        <div class="col-md-4"><div class="card p-3 bg-success text-white"><h3>${aprobados}</h3><p>Aprobados</p></div></div>
        <div class="col-md-4"><div class="card p-3 bg-danger text-white"><h3>${recursantes}</h3><p>No Aprobados</p></div></div>
        <div class="col-md-4"><div class="card p-3 bg-info text-white"><h3>${promAsist}%</h3><p>Asistencia Promedio</p></div></div>
    </div>`;
}

// =========================================================
// EVENTO "EN VIVO": DETECTA CADA TECLAJE
// =========================================================
document.addEventListener('input', function(e) {
    // Si el elemento que tocaste tiene la clase 'inp-nota'...
    if (e.target.classList.contains('inp-nota')) {
        // ...calculamos la fila entera automáticamente
        calcularLogicaFila(e.target.closest('tr'));
    }
});
