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
                html += `
                <div class="col-md-4 mb-3">
                    <div class="card shadow-sm border-start border-4 border-primary h-100">
                        <div class="card-body">
                            <h5 class="card-title text-primary fw-bold">${grupo.curso}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${mat.nombre}</h6>
                            <p class="small text-muted mb-3">${mat.tipoAsignacion}</p>
                            <button onclick="cargarCursoDetalle('${grupo.curso}', '${mat.id}')" class="btn btn-outline-primary w-100">
                                Gestionar Alumnos
                            </button>
                        </div>
                    </div>
                </div>`;
            });
        });
        html += `</div>`;
        contenedor.innerHTML = html;

    } catch (e) {
        console.error(e);
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar cursos.</div>`;
    }
}

async function cargarCursoDetalle(curso, idMateria, fecha = null) {
    idMateriaActual = idMateria;
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Obteniendo datos...</p></div>`;
    
    // Fecha por defecto: Hoy (YYYY-MM-DD)
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
    
    let html = `
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h4>${d.materia.nombre} <span class="badge bg-secondary">${d.materia.curso}</span></h4>
        <button class="btn btn-sm btn-secondary" onclick="iniciarModuloDocente()">⬅ Volver</button>
    </div>

    <ul class="nav nav-tabs mb-3" id="docenteTabs" role="tablist">
        <li class="nav-item">
            <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#panel-asist" type="button">📅 Asistencia</button>
        </li>
        <li class="nav-item">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#panel-notas" type="button">📊 Notas (RITE)</button>
        </li>
        <li class="nav-item">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#panel-resumen" type="button">📈 Resumen</button>
        </li>
    </ul>

    <div class="tab-content">
        <div class="tab-pane fade show active" id="panel-asist">
            <div class="row mb-3 align-items-end bg-light p-3 rounded mx-0">
                <div class="col-md-4">
                    <label class="form-label fw-bold">Fecha de Registro:</label>
                    <input type="date" class="form-control" id="fechaAsistencia" value="${fechaSeleccionada}" onchange="cambiarFechaAsistencia(this.value)">
                </div>
                <div class="col-md-8 text-end">
                     <button class="btn btn-success" onclick="guardarAsistencia()">💾 Guardar Asistencia</button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-dark text-center">
                        <tr>
                            <th>Estudiante</th>
                            <th>Estado (${fechaSeleccionada})</th>
                            <th>Inasistencias</th>
                            <th>Historial</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-asistencia">
                        ${renderFilasAsistencia(d.estudiantes)}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="tab-pane fade" id="panel-notas">
            <div class="d-flex justify-content-end mb-2">
                <button class="btn btn-primary" onclick="guardarNotas()">💾 Guardar Todas las Notas</button>
            </div>
            <div class="table-responsive">
                <table class="table table-bordered table-sm align-middle text-center" style="min-width: 1000px;">
                    <thead class="table-light">
                        <tr>
                            <th rowspan="2" class="align-middle">Estudiante</th>
                            <th colspan="2">1° Cuatrimestre</th>
                            <th colspan="2">2° Cuatrimestre</th>
                            <th rowspan="2" class="align-middle bg-info bg-opacity-10" style="width: 60px;">Prom</th>
                            <th rowspan="2" class="align-middle" style="width: 60px;">Dic</th>
                            <th rowspan="2" class="align-middle" style="width: 60px;">Feb</th>
                            <th rowspan="2" class="align-middle bg-secondary text-white">DEFINITIVA</th>
                        </tr>
                        <tr>
                            <th>Reg</th><th>Int</th>
                            <th>Reg</th><th>Int</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-notas">
                        ${renderFilasNotas(d.estudiantes)}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="tab-pane fade" id="panel-resumen">
            ${renderResumen(d.estudiantes)}
        </div>
    </div>`;

    contenedor.innerHTML = html;
    
    // Inicializar lógica de notas visualmente
    document.querySelectorAll('.fila-notas').forEach(tr => calcularLogicaFila(tr));
}

// --- FUNCIONES ASISTENCIA ---

function renderFilasAsistencia(estudiantes) {
    if(!estudiantes.length) return '<tr><td colspan="4">No hay estudiantes.</td></tr>';
    
    return estudiantes.map(e => {
        let estado = e.asistenciaDia.estado || ''; 
        let isP = estado === 'P' ? 'checked' : '';
        let isA = estado === 'A' ? 'checked' : '';
        
        return `
        <tr data-dni="${e.dni}">
            <td>${e.nombre}</td>
            <td class="text-center">
                <div class="btn-group" role="group">
                    <input type="radio" class="btn-check" name="asis_${e.dni}" id="P_${e.dni}" value="P" ${isP}>
                    <label class="btn btn-outline-success btn-sm" for="P_${e.dni}">Presente</label>

                    <input type="radio" class="btn-check" name="asis_${e.dni}" id="A_${e.dni}" value="A" ${isA}>
                    <label class="btn btn-outline-danger btn-sm" for="A_${e.dni}">Ausente</label>
                </div>
            </td>
            <td class="text-center text-danger fw-bold">${e.stats.faltas}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-link" onclick="alert('Funcionalidad de historial detallado en desarrollo')">Justificar</button>
            </td>
        </tr>`;
    }).join('');
}

function cambiarFechaAsistencia(nuevaFecha) {
    cargarCursoDetalle(cursoActualData.materia.curso, idMateriaActual, nuevaFecha);
}

async function guardarAsistencia() {
    const fecha = document.getElementById('fechaAsistencia').value;
    const filas = document.querySelectorAll('#tbody-asistencia tr');
    let datosAsistencia = [];

    filas.forEach(tr => {
        const dni = tr.getAttribute('data-dni');
        const checked = tr.querySelector(`input[name="asis_${dni}"]:checked`);
        // Si no está chequeado nada, no enviamos nada (o podríamos enviar vacío para borrar)
        if (checked) {
            datosAsistencia.push({ dni: dni, estado: checked.value });
        }
    });

    try {
        const resp = await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify({
                op: 'guardarAsistenciaDocente',
                idMateria: idMateriaActual,
                dniDocente: usuarioActual.dni,
                fecha: fecha,
                asistencia: datosAsistencia
            })
        });
        alert("Asistencia guardada.");
    } catch(e) { alert("Error al guardar."); }
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
    let aprobados = 0;
    let recursantes = 0;
    let totalAsist = 0;
    
    estudiantes.forEach(e => {
        const def = e.notas?.def;
        // Consideramos aprobado si es número >= 4
        if (!isNaN(parseFloat(def)) && parseFloat(def) >= 4) aprobados++;
        if (def === 'C.I.') recursantes++;
        
        totalAsist += (e.stats.porcentaje || 0);
    });
    
    const promAsist = estudiantes.length ? Math.round(totalAsist / estudiantes.length) : 0;

    return `
    <div class="row g-3 text-center">
        <div class="col-md-4"><div class="card p-3 bg-success text-white"><h3>${aprobados}</h3><p>Aprobados</p></div></div>
        <div class="col-md-4"><div class="card p-3 bg-danger text-white"><h3>${recursantes}</h3><p>No Aprobados (C.I.)</p></div></div>
        <div class="col-md-4"><div class="card p-3 bg-info text-white"><h3>${promAsist}%</h3><p>Asistencia Promedio</p></div></div>
    </div>`;
}
