// ============================================================================
// ARCHIVO: Modulo_Docente.js
// ============================================================================

let cursoActualData = null; 
let idMateriaActual = null;

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
                // AQUÍ ESTÁ LA CLAVE: onclick="cargarVistaAsistencia('${mat.id}')"
                html += `
                <div class="col-md-4 mb-3">
                    <div class="card shadow-sm border-start border-4 border-primary h-100 cursor-pointer" 
                         onclick="cargarVistaAsistencia('${mat.id}')" style="cursor:pointer;">
                        <div class="card-body hover-effect">
                            <h5 class="card-title text-primary fw-bold">${grupo.curso}</h5>
                            <h6 class="card-subtitle mb-2 text-dark">${mat.nombre}</h6>
                            <p class="small text-muted mb-0">
                                <i class="bi bi-people"></i> ${mat.cantidadEstudiantes} Alumnos
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

async function cargarCursoDetalle(curso, idMateria, fecha = null) {
    idMateriaActual = idMateria;
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Obteniendo datos...</p></div>`;
    
    const fechaQuery = fecha || new Date().toISOString().split('T')[0];

    try {
        const url = `${URL_API}?op=getEstudiantesConDatosCompletos&rol=Docente&dniDocente=${usuarioActual.dni}&curso=${curso}&idMateria=${idMateria}&fecha=${fechaQuery}`;
        const resp = await fetch(url);
        const json = await resp.json();
        
        if (json.status !== 'success') throw new Error(json.message);
        
        cursoActualData = json.data; 
        renderInterfazCurso(fechaQuery);

    } catch (e) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div><button class="btn btn-secondary" onclick="iniciarModuloDocente()">Volver</button>`;
    }
}

function renderInterfazCurso(fechaSeleccionada) {
    const d = cursoActualData;
    const contenedor = document.getElementById('contenido-dinamico');
    
    // Inyectar HTML Modal Justificar si no existe
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

    let html = `
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h4>${d.materia.nombre} <span class="badge bg-secondary">${d.materia.curso}</span></h4>
        <button class="btn btn-sm btn-secondary" onclick="iniciarModuloDocente()">⬅ Volver</button>
    </div>

    <ul class="nav nav-tabs mb-3">
        <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#panel-asist">📅 Asistencia</button></li>
        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#panel-notas">📊 Notas</button></li>
        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#panel-resumen">📈 Resumen</button></li>
    </ul>

    <div class="tab-content">
        <div class="tab-pane fade show active" id="panel-asist">
            <div class="row mb-3 bg-light p-3 rounded mx-0 align-items-end">
                <div class="col-md-4">
                    <label class="fw-bold">Fecha:</label>
                    <input type="date" class="form-control" id="fechaAsistencia" value="${fechaSeleccionada}" onchange="cargarCursoDetalle('${d.materia.curso}', '${d.materia.id}', this.value)">
                </div>
                <div class="col-md-8 text-end">
                     <button class="btn btn-success" onclick="guardarAsistencia()">💾 Guardar Asistencia</button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-dark text-center">
                        <tr><th>Estudiante</th><th>Asistencia (${fechaSeleccionada})</th><th>Estadísticas</th><th>Acción</th></tr>
                    </thead>
                    <tbody id="tbody-asistencia">${renderFilasAsistencia(d.estudiantes)}</tbody>
                </table>
            </div>
        </div>

        <div class="tab-pane fade" id="panel-notas">
            <div class="d-flex justify-content-end mb-2"><button class="btn btn-primary" onclick="guardarNotas()">💾 Guardar Notas</button></div>
            <div class="table-responsive">
                <table class="table table-bordered table-sm align-middle text-center" style="min-width: 1000px;">
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
    document.querySelectorAll('.fila-notas').forEach(tr => calcularLogicaFila(tr));
}

// --- FUNCIONES ASISTENCIA ---

function renderFilasAsistencia(estudiantes) {
    if(!estudiantes.length) return '<tr><td colspan="4" class="text-center py-3">No hay estudiantes en este curso.</td></tr>';
    
    return estudiantes.map(e => {
        let estado = e.asistenciaDia.estado || ''; 
        
        // Lógica visual: Si está seleccionado es SÓLIDO, si no es BORDE (Outline)
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
                        onclick="seleccionarAsistencia(this, '${e.dni}', 'P')">
                        P
                    </button>
                    
                    <button type="button" class="btn ${btnA} flex-fill py-2 shadow-sm fw-bold" 
                        onclick="seleccionarAsistencia(this, '${e.dni}', 'A')">
                        A
                    </button>
                    
                    <button type="button" class="btn ${btnT} flex-fill py-2 shadow-sm fw-bold" 
                        onclick="seleccionarAsistencia(this, '${e.dni}', 'T')">
                        T
                    </button>

                </div>
            </td>

            <td class="text-center align-middle d-none d-sm-table-cell"> <span class="badge bg-primary mb-1">${e.stats.porcentaje}%</span><br>
                <span class="text-danger small fw-bold">${e.stats.faltas} F.</span>
            </td>

            <td class="text-center align-middle">
                <button class="btn btn-outline-secondary btn-sm py-2 px-3" onclick="abrirModalJustificar('${e.dni}', '${e.nombre}')">
                   📜
                </button>
            </td>
        </tr>`;
    }).join('');
}

async function cargarVistaAsistencia(idMateria) {
    idMateriaActual = idMateria; // Variable Global
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Cargando planilla...</p></div>`;

    try {
        const resp = await fetch(`${URL_API}?op=getEstudiantesConDatosCompletos&rol=Docente&dni=${usuarioActual.dni}&idMateria=${idMateria}`);
        const json = await resp.json();

        if (json.status === 'success') {
            cursoActualData = json.data; // Variable Global para guardar cambios
            const materia = json.data.materia;
            const hoy = new Date().toISOString().split('T')[0];

            let html = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                    <button class="btn btn-outline-secondary btn-sm mb-1" onclick="iniciarModuloDocente()">← Volver</button>
                    <h5 class="mb-0 text-primary">${materia.nombre} <small class="text-muted">(${materia.curso})</small></h5>
                </div>
                
                <div class="d-flex gap-2 align-items-end">
                    <div>
                        <label class="small text-muted fw-bold">Fecha:</label>
                        <input type="date" id="fechaAsistencia" class="form-control form-control-sm" value="${hoy}" onchange="recargarAsistenciaFecha(this.value)">
                    </div>
                    <div>
                        <label class="d-block">&nbsp;</label>
                        <button id="btnGuardarAsis" class="btn btn-primary btn-sm" onclick="guardarAsistencia()">
                            💾 Guardar
                        </button>
                    </div>
                </div>
            </div>

            <div class="card shadow-sm border-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Estudiante</th>
                                <th style="min-width:180px">Asistencia</th>
                                <th class="text-center d-none d-sm-table-cell">Detalles</th>
                                <th class="text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="tbodyAsistencia">
                            ${renderFilasAsistencia(json.data.estudiantes)}
                        </tbody>
                    </table>
                </div>
            </div>`;

            contenedor.innerHTML = html;
        } else {
            contenedor.innerHTML = `<div class="alert alert-danger">Error: ${json.message}</div>`;
        }
    } catch (e) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
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
            container.innerHTML = '<div class="alert alert-success">No hay inasistencias injustificadas.</div>';
        } else {
            json.data.forEach(f => {
                let btn = f.justificado === 'Si' 
                    ? `<span class="badge bg-success">Justificada</span>` 
                    : `<button class="btn btn-sm btn-warning" onclick="justificarAccion('${dni}', '${f.fechaIso}', this)">Justificar</button>`;
                
                container.innerHTML += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${f.fecha} <span class="badge bg-danger">${f.estado}</span></span>
                    ${btn}
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
            // RECARGAMOS LOS DATOS DETRÁS PARA ACTUALIZAR EL CONTADOR
            const fechaActualInput = document.getElementById('fechaAsistencia').value;
            cargarCursoDetalle(cursoActualData.materia.curso, idMateriaActual, fechaActualInput);
        } else {
            alert("Error: " + json.message);
            btn.disabled = false;
        }
    } catch(e) { alert("Error de conexión"); }
}

function cambiarFechaAsistencia(nuevaFecha) {
    cargarCursoDetalle(cursoActualData.materia.curso, idMateriaActual, nuevaFecha);
}

// EN ARCHIVO: Modulo_Docente.js

async function guardarAsistencia() {
    const btn = document.getElementById('btnGuardarAsis');
    const inputFecha = document.getElementById('fechaAsistencia');

    if (!inputFecha || !idMateriaActual || !cursoActualData) {
        alert("Error de datos. Recargue la página.");
        return;
    }

    const fecha = inputFecha.value;
    if (!fecha) { alert("Seleccione una fecha."); return; }

    btn.disabled = true;
    btn.innerHTML = 'Guardando...';

    // Tomamos los datos de la memoria (cursoActualData) que modificaste con los botones
    const asistenciaPayload = cursoActualData.estudiantes
        .filter(e => e.asistenciaDia && e.asistenciaDia.estado)
        .map(e => ({ dni: e.dni, estado: e.asistenciaDia.estado }));

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
            alert("✅ Guardado correctamente");
            cargarVistaAsistencia(idMateriaActual); // Recargamos para confirmar visualmente
        } else {
            alert("❌ Error: " + json.message);
        }
    } catch (e) {
        alert("❌ Error de conexión");
    } finally {
        btn.disabled = false;
        btn.innerText = "💾 Guardar";
    }
}
// --- FUNCIONES NOTAS (RITE) ---

function renderFilasNotas(estudiantes) {
    return estudiantes.map(e => {
        const n = e.notas || {};
        return `
        <tr class="fila-notas" data-dni="${e.dni}">
            <td class="text-start ps-2 fw-bold text-truncate" style="max-width: 150px;">${e.nombre}</td>
            
            <td><input type="number" class="form-control form-control-sm inp-nota n1" value="${n.n1}" min="1" max="10"></td>
            <td><input type="number" class="form-control form-control-sm inp-nota i1" value="${n.i1}" min="1" max="10" disabled></td>
            
            <td><input type="number" class="form-control form-control-sm inp-nota n2" value="${n.n2}" min="1" max="10"></td>
            <td><input type="number" class="form-control form-control-sm inp-nota i2" value="${n.i2}" min="1" max="10" disabled></td>
            
            <td class="bg-info bg-opacity-10 fw-bold"><span class="promedio">-</span></td>
            <td><input type="number" class="form-control form-control-sm inp-nota dic" value="${n.dic}" min="1" max="10" disabled></td>
            <td><input type="number" class="form-control form-control-sm inp-nota feb" value="${n.feb}" min="1" max="10" disabled></td>
            <td class="fw-bold fs-6 text-center"><span class="definitiva badge bg-secondary">-</span></td>
        </tr>`;
    }).join('');
}

// Detectar cambios en inputs de notas
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('inp-nota')) {
        calcularLogicaFila(e.target.closest('tr'));
    }
});

function calcularLogicaFila(tr) {
    const getVal = (cls) => {
        let v = tr.querySelector('.' + cls).value;
        return v === "" ? 0 : parseFloat(v);
    };
    
    // Elementos DOM
    const inI1 = tr.querySelector('.i1');
    const inI2 = tr.querySelector('.i2');
    const inDic = tr.querySelector('.dic');
    const inFeb = tr.querySelector('.feb');
    const spProm = tr.querySelector('.promedio');
    const spDef = tr.querySelector('.definitiva');

    const n1 = getVal('n1');
    const n2 = getVal('n2');

    // 1. Habilitar Intensificaciones si nota < 7
    if (n1 > 0 && n1 < 7) inI1.disabled = false; else { inI1.disabled = true; if(n1 >=7) inI1.value = ''; }
    if (n2 > 0 && n2 < 7) inI2.disabled = false; else { inI2.disabled = true; if(n2 >=7) inI2.value = ''; }

    // 2. Calcular Notas Finales de Cuatrimestre (La mejor entre Regular e Intensificación)
    const i1 = getVal('i1');
    const i2 = getVal('i2');
    
    // Si hay intensificación, esa es la que vale, si no, la regular. 
    // PERO RITE dice: "Se intensifica la nota". Usualmente se toma la mayor o la aprobada.
    // Usaremos Math.max para simplificar: Si saca 8 en intensificación y tenía 4, queda 8.
    const final1 = (n1 < 7 && i1 > 0) ? i1 : n1; 
    const final2 = (n2 < 7 && i2 > 0) ? i2 : n2;

    // 3. Promedio
    let promedio = 0;
    if (n1 > 0 && n2 > 0) { // Solo si hay notas cargadas en ambos
        promedio = (final1 + final2) / 2;
        spProm.innerText = promedio; // Mostramos decimales sin redondear
    } else {
        spProm.innerText = '-';
    }

    // 4. Definición de Estado
    // PROMOCIONA: Promedio >= 7 Y (Final1 >= 7 Y Final2 >= 7)
    const aproboC1 = final1 >= 7;
    const aproboC2 = final2 >= 7;
    const promociona = promedio >= 7 && aproboC1 && aproboC2;

    let definitiva = "-";
    let color = "bg-secondary";

    if (promociona) {
        definitiva = promedio; // Nota exacta
        color = "bg-success";
        inDic.disabled = true; inDic.value = '';
        inFeb.disabled = true; inFeb.value = '';
    } else {
        // No promociona. Revisar instancias.
        // Habilitar Diciembre si cursó (tiene notas regulares)
        if (n1 > 0 && n2 > 0) {
            inDic.disabled = false;
            const notaDic = getVal('dic');
            
            if (notaDic >= 4) {
                // APROBÓ EN DICIEMBRE
                definitiva = notaDic;
                color = "bg-warning text-dark";
                inFeb.disabled = true; inFeb.value = '';
            } else {
                // NO APROBÓ DIC -> FEBRERO
                // Solo habilitar Febrero si hay intento en Dic o si ya se definió
                // Si el campo Dic tiene valor (aunque sea menor a 4), habilita Feb.
                if (tr.querySelector('.dic').value !== "") {
                    inFeb.disabled = false;
                    const notaFeb = getVal('feb');
                    
                    if (notaFeb >= 4) {
                        definitiva = notaFeb;
                        color = "bg-warning text-dark";
                    } else if (tr.querySelector('.feb').value !== "") {
                        definitiva = "C.I."; // Comisión Evaluadora / Recursa
                        color = "bg-danger";
                    }
                } else {
                    inFeb.disabled = true;
                }
            }
        }
    }
    
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
        // Verificar existencia de notas
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


function seleccionarAsistencia(btn, dni, valor) {
    // 1. Quitar colores activos de los hermanos (resetear fila)
    const fila = btn.closest('td').querySelector('.d-flex');
    const botones = fila.querySelectorAll('button');
    
    botones.forEach(b => {
        // Volver todos a outline
        if (b.classList.contains('btn-success')) b.classList.replace('btn-success', 'btn-outline-success');
        if (b.classList.contains('btn-danger')) b.classList.replace('btn-danger', 'btn-outline-danger');
        if (b.classList.contains('btn-warning')) b.classList.replace('btn-warning', 'btn-outline-warning');
    });

    // 2. Pintar el botón clickeado
    if (valor === 'P') {
        btn.classList.replace('btn-outline-success', 'btn-success');
    } else if (valor === 'A') {
        btn.classList.replace('btn-outline-danger', 'btn-danger');
    } else if (valor === 'T') {
        btn.classList.replace('btn-outline-warning', 'btn-warning');
    }

    // 3. (Opcional) Guardar en memoria temporal si tienes un objeto global
    // if(cursoActualData) {
    //    let alumno = cursoActualData.estudiantes.find(e => e.dni == dni);
    //    if(alumno) alumno.asistenciaDia.estado = valor;
    // }
}
