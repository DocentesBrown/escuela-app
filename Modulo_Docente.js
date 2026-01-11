// ============================================================================
// ARCHIVO: Modulo_Docente.js
// ============================================================================

let fechaAsistenciaSeleccionada = new Date().toISOString().split('T')[0];

async function iniciarModuloDocente() {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando cursos asignados...</p></div>`;
    
    try {
        const resp = await fetch(`${URL_API}?op=getCursosDocente&rol=Docente&dni=${usuarioActual.dni || ''}`);
        const json = await resp.json();
        
        if (json.status !== 'success' || !json.data) {
            document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-warning"><h5>No tienes cursos asignados</h5><p>Contacta al directivo.</p></div>`;
            return;
        }
        
        let html = `<h4 class="mb-3">🏫 Mis Cursos</h4><div class="row" id="lista-cursos">`;
        json.data.forEach(cursoData => {
            html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 shadow-sm border-0 border-start border-4 border-primary">
                    <div class="card-body">
                        <h5 class="card-title fw-bold text-primary">${cursoData.curso}</h5>
                        <p class="text-muted small mb-3"><i class="bi bi-people"></i> ${cursoData.totalEstudiantes} estudiantes</p>
                        <hr>
                        <ul class="list-unstyled">`;
            cursoData.materias.forEach(m => {
                html += `<li class="mb-2"><button class="btn btn-outline-dark w-100 text-start d-flex justify-content-between align-items-center" onclick="abrirCursoDocente('${cursoData.curso}', '${m.id}', '${m.nombre}')"><span>📚 ${m.nombre}</span> <span class="badge bg-light text-dark border">${m.tipoAsignacion}</span></button></li>`;
            });
            html += `</ul></div></div></div>`;
        });
        html += `</div>`;
        
        html += renderModalJustificarDocenteHTML();
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) { 
        console.error('Error en iniciarModuloDocente:', e);
        document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; 
    }
}

async function abrirCursoDocente(curso, idMateria, nombreMateria) {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando datos...</p></div>`;
    
    try {
        // Usar el endpoint correcto
        const url = `${URL_API}?op=getEstudiantesConDatosCompletos&rol=Docente&dniDocente=${usuarioActual.dni}&curso=${encodeURIComponent(curso)}&idMateria=${idMateria}`;
        console.log('URL de solicitud:', url); // Para debug
        
        const resp = await fetch(url);
        const json = await resp.json();
        
        if (json.status !== 'success') {
            throw new Error(json.message || 'Error al cargar el curso');
        }
        
        if (!json.data || !json.data.estudiantes) {
            throw new Error('No se recibieron datos válidos del servidor');
        }
        
        window.cursoActualDocente = { 
            curso, 
            idMateria, 
            nombreMateria, 
            estudiantes: json.data.estudientes,
            datosMateria: json.data.materia 
        };  
        
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div><h4 class="mb-0 fw-bold text-primary">${nombreMateria} <span class="text-muted fw-normal fs-6">(${curso})</span></h4></div>
                <button class="btn btn-secondary btn-sm" onclick="iniciarModuloDocente()">← Volver</button>
            </div>

            <div class="card shadow-sm mb-4">
                <div class="card-header bg-white">
                    <ul class="nav nav-pills card-header-pills" id="tabsDocente">
                        <li class="nav-item"><button class="nav-link active" onclick="mostrarTabDocente('asistencia', this)">📅 Asistencia</button></li>
                        <li class="nav-item"><button class="nav-link" onclick="mostrarTabDocente('notas', this)">📊 Calificaciones</button></li>
                        <li class="nav-item"><button class="nav-link" onclick="mostrarTabDocente('resumen', this)">📈 Resumen</button></li>
                    </ul>
                </div>
                <div class="card-body">
                    <div id="tabAsistencia">
                        <div class="row mb-3 align-items-end bg-light p-3 rounded">
                            <div class="col-md-4">
                                <label class="fw-bold small">Fecha de toma:</label>
                                <input type="date" id="fechaAsistenciaPicker" class="form-control" value="${fechaAsistenciaSeleccionada}" onchange="cambiarFechaAsistencia(this.value)">
                            </div>
                            <div class="col-md-8 text-end">
                                <button class="btn btn-success" onclick="guardarAsistenciaDocente()">💾 Guardar Asistencia</button>
                            </div>
                        </div>
                        ${renderTablaAsistenciaDocente(json.data.estudiantes)}
                    </div>

                    <div id="tabNotas" class="d-none">
                        <div class="alert alert-info small mb-2">
                            <i class="bi bi-info-circle"></i> <b>Nota:</b> Si un cuatrimestre no está aprobado (nota < 7 e intensificación < 4), habilita Diciembre automáticamente.
                        </div>
                        ${renderTablaNotasDocente(json.data.estudiantes)}
                    </div>

                    <div id="tabResumen" class="d-none">
                        ${renderTabResumen(json.data.estudiantes)}
                    </div>
                </div>
            </div>`;
        document.getElementById('contenido-dinamico').innerHTML = html;
        
        setTimeout(recalcularTodoAlInicio, 500);

    } catch (e) { 
        console.error('Error en abrirCursoDocente:', e);
        document.getElementById('contenido-dinamico').innerHTML = `
            <div class="alert alert-danger">
                <h5>Error al cargar el curso</h5>
                <p>${e.message}</p>
                <button class="btn btn-secondary mt-2" onclick="iniciarModuloDocente()">← Volver a mis cursos</button>
            </div>`;
    }
}

function mostrarTabDocente(tab, btn) {
    document.getElementById('tabAsistencia').classList.add('d-none');
    document.getElementById('tabNotas').classList.add('d-none');
    document.getElementById('tabResumen').classList.add('d-none');
    document.querySelectorAll('#tabsDocente .nav-link').forEach(b => b.classList.remove('active'));
    
    const target = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
    document.getElementById(target).classList.remove('d-none');
    btn.classList.add('active');
}

function cambiarFechaAsistencia(fecha) {
    fechaAsistenciaSeleccionada = fecha;
    console.log('Fecha de asistencia cambiada a:', fecha);
}

// --- ASISTENCIA ---

function renderTablaAsistenciaDocente(est) {
    let html = `<div class="table-responsive"><table class="table table-hover table-striped align-middle border">
    <thead class="table-dark text-center">
        <tr>
            <th class="text-start ps-3">Estudiante</th>
            <th style="width: 80px;">% Asis</th>
            <th style="width: 80px;">Faltas</th>
            <th style="width: 80px;" class="bg-success">P</th>
            <th style="width: 80px;" class="bg-danger">A</th>
            <th style="width: 60px;">Edit</th> </tr>
    </thead>
    <tbody>`;
    
    est.forEach(e => {
        const porc = e.asistencia && e.asistencia.porcentaje ? e.asistencia.porcentaje : 0;
        const faltas = e.asistencia && e.asistencia.injustificadas ? e.asistencia.injustificadas : 0;
        let colorAsis = porc < 80 ? 'text-danger fw-bold' : 'text-success';

        html += `<tr data-dni="${e.dni}">
        <td class="fw-bold ps-3 text-start">${e.nombre}</td>
        <td class="text-center ${colorAsis}">${porc}%</td>
        <td class="text-center fw-bold text-danger">${faltas}</td>
        <td class="text-center bg-success bg-opacity-10">
            <input type="radio" name="asis_${e.dni}" value="P" checked class="form-check-input" style="transform: scale(1.3); cursor:pointer;">
        </td>
        <td class="text-center bg-danger bg-opacity-10">
            <input type="radio" name="asis_${e.dni}" value="A" class="form-check-input" style="transform: scale(1.3); cursor:pointer;">
        </td>
        <td class="text-center">
             <button class="btn btn-sm btn-outline-secondary border-0" onclick="abrirModalJustificarDoc('${e.dni}', '${e.nombre}')">✏️</button>
        </td>
        </tr>`;
    });
    return html + `</tbody></table></div>`;
}

async function guardarAsistenciaDocente() {
    if (!window.cursoActualDocente) {
        alert('Error: No hay datos del curso actual');
        return;
    }
    
    const btn = document.querySelector('#tabAsistencia .btn-success');
    const fecha = document.getElementById('fechaAsistenciaPicker').value;
    
    if (!fecha) {
        alert('Selecciona una fecha primero');
        return;
    }
    
    const asistenciaData = [];
    const estudiantes = window.cursoActualDocente.estudiantes || [];
    
    estudiantes.forEach(est => {
        const radioSeleccionado = document.querySelector(`input[name="asis_${est.dni}"]:checked`);
        if (radioSeleccionado) {
            asistenciaData.push({
                dni: est.dni,
                estado: radioSeleccionado.value
            });
        }
    });
    
    if (asistenciaData.length === 0) {
        alert('No hay datos de asistencia para guardar');
        return;
    }
    
    const datos = {
        op: 'guardarAsistenciaDocente',
        dniDocente: usuarioActual.dni,
        idMateria: window.cursoActualDocente.idMateria,
        fecha: fecha,
        asistencia: asistenciaData
    };
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';
        
        const resp = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        
        const json = await resp.json();
        
        if (json.status === 'success') {
            alert('✅ Asistencia guardada correctamente');
            // Recargar los datos
            abrirCursoDocente(
                window.cursoActualDocente.curso,
                window.cursoActualDocente.idMateria,
                window.cursoActualDocente.nombreMateria
            );
        } else {
            throw new Error(json.message || 'Error al guardar');
        }
    } catch (e) {
        console.error('Error guardando asistencia:', e);
        alert('❌ Error al guardar la asistencia: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Guardar Asistencia';
    }
}

async function abrirModalJustificarDoc(dni, nombre) {
    if (!window.cursoActualDocente) {
        alert('Error: No hay datos del curso actual');
        return;
    }
    
    document.getElementById('just_doc_nombre').innerText = nombre;
    document.getElementById('lista_faltas_docente').innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div> Buscando faltas...</div>';
    
    try {
        const modalEl = document.getElementById('modalJustificarDocente');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
        const url = `${URL_API}?op=getFaltasAlumnoDocente&rol=Docente&dni=${dni}&idMateria=${window.cursoActualDocente.idMateria}`;
        const resp = await fetch(url);
        const json = await resp.json();
        
        let html = '';
        if (json.status === 'success' && json.data && json.data.length > 0) {
            html = '<div class="list-group">';
            json.data.forEach(falta => {
                html += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <span class="fw-bold">${falta.fecha}</span>
                    <button class="btn btn-sm btn-success" onclick="justificarFaltaDocente(${falta.fila})">
                        Justificar ✅
                    </button>
                </div>`;
            });
            html += '</div>';
        } else {
            html = '<div class="alert alert-success">No tiene faltas injustificadas</div>';
        }
        
        document.getElementById('lista_faltas_docente').innerHTML = html;
    } catch (e) {
        console.error('Error al cargar faltas:', e);
        document.getElementById('lista_faltas_docente').innerHTML = '<div class="alert alert-danger">Error al cargar las faltas</div>';
    }
}

async function justificarFaltaDocente(fila) {
    if (!confirm('¿Confirmar justificación de esta falta?')) return;
    
    try {
        const datos = {
            op: 'justificarFaltaDocente',
            fila: fila
        };
        
        const resp = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        
        const json = await resp.json();
        
        if (json.status === 'success') {
            alert('✅ Falta justificada correctamente');
            // Cerrar modal y recargar
            const modalEl = document.getElementById('modalJustificarDocente');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            
            // Recargar datos del curso
            abrirCursoDocente(
                window.cursoActualDocente.curso,
                window.cursoActualDocente.idMateria,
                window.cursoActualDocente.nombreMateria
            );
        } else {
            throw new Error(json.message || 'Error al justificar');
        }
    } catch (e) {
        console.error('Error justificando falta:', e);
        alert('❌ Error al justificar: ' + e.message);
    }
}

// --- CALIFICACIONES ---

function renderTablaNotasDocente(est) {
    let html = `
    <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle">
            <thead class="table-dark text-center">
                <tr>
                    <th class="text-start">Estudiante</th>
                    <th>1er C (N)</th>
                    <th>Intens.</th>
                    <th>2do C (N)</th>
                    <th>Intens.</th>
                    <th>Prom</th>
                    <th>Dic</th>
                    <th>Feb</th>
                    <th>Def</th>
                </tr>
            </thead>
            <tbody>`;
    
    est.forEach(e => {
        const notas = e.notas || {};
        html += `
        <tr data-dni="${e.dni}">
            <td class="fw-bold text-start">${e.nombre}</td>
            <td class="text-center"><input type="number" class="form-control form-control-sm n1" value="${notas.nota1_C1 || ''}" min="0" max="10" step="0.5" onchange="calcularFila('${e.dni}')"></td>
            <td class="text-center"><input type="number" class="form-control form-control-sm i1" value="${notas.intensificacion1 || ''}" min="0" max="10" step="0.5" onchange="calcularFila('${e.dni}')" disabled></td>
            <td class="text-center"><input type="number" class="form-control form-control-sm n2" value="${notas.nota1_C2 || ''}" min="0" max="10" step="0.5" onchange="calcularFila('${e.dni}')"></td>
            <td class="text-center"><input type="number" class="form-control form-control-sm i2" value="${notas.intensificacion2 || ''}" min="0" max="10" step="0.5" onchange="calcularFila('${e.dni}')" disabled></td>
            <td class="text-center"><span class="fw-bold promedio">-</span></td>
            <td class="text-center"><input type="number" class="form-control form-control-sm dic" value="${notas.diciembre || ''}" min="0" max="10" step="0.5" onchange="calcularFila('${e.dni}')" disabled></td>
            <td class="text-center"><input type="number" class="form-control form-control-sm feb" value="${notas.febrero || ''}" min="0" max="10" step="0.5" onchange="calcularFila('${e.dni}')" disabled></td>
            <td class="text-center fw-bold text-white def-cell bg-secondary"><span class="definitiva">-</span></td>
        </tr>`;
    });
    
    html += `</tbody></table>
        <div class="text-end mt-3">
            <button class="btn btn-primary" onclick="guardarNotasDocente()">💾 Guardar Todas las Calificaciones</button>
        </div>
    </div>`;
    
    return html;
}

function recalcularTodoAlInicio() {
    if (!window.cursoActualDocente || !window.cursoActualDocente.estudiantes) return;
    
    window.cursoActualDocente.estudientes.forEach(e => {
        if (e && e.dni) {
            calcularFila(e.dni);
        }
    });
}

function calcularFila(dni) {
    const row = document.querySelector(`tr[data-dni="${dni}"]`);
    if (!row) return;

    const inN1 = row.querySelector('.n1');
    const inI1 = row.querySelector('.i1');
    const inN2 = row.querySelector('.n2');
    const inI2 = row.querySelector('.i2');
    const inDic = row.querySelector('.dic');
    const inFeb = row.querySelector('.feb');
    const spanProm = row.querySelector('.promedio');
    const spanDef = row.querySelector('.definitiva');
    const tdDef = row.querySelector('.def-cell');

    let vN1 = parseFloat(inN1.value) || 0;
    let vN2 = parseFloat(inN2.value) || 0;
    
    // Regla: Nota < 7 habilita intensificación
    if (inN1.value !== "" && vN1 < 7) {
        inI1.disabled = false;
    } else {
        inI1.disabled = true;
        inI1.value = '';
    }
    
    if (inN2.value !== "" && vN2 < 7) {
        inI2.disabled = false;
    } else {
        inI2.disabled = true;
        inI2.value = '';
    }

    let vI1 = parseFloat(inI1.value) || 0;
    let vI2 = parseFloat(inI2.value) || 0;

    // ¿Aprobó el cuatrimestre?
    let aprobadoC1 = (vN1 >= 7) || (vI1 >= 4);
    let aprobadoC2 = (vN2 >= 7) || (vI2 >= 4);

    // Nota de cálculo para el promedio
    let notaEfec1 = (vN1 >= 7) ? vN1 : vI1;
    let notaEfec2 = (vN2 >= 7) ? vN2 : vI2;
    
    if (vN1 < 7 && inI1.value === "") notaEfec1 = vN1;
    if (vN2 < 7 && inI2.value === "") notaEfec2 = vN2;

    let promedio = 0;
    let definitiva = "-";

    if (inN1.value !== "" && inN2.value !== "") {
        let calculo = (notaEfec1 + notaEfec2) / 2;
        promedio = parseFloat(calculo.toFixed(2));
        if (spanProm) spanProm.innerText = promedio;

        // REGLA CLAVE: Promedio >= 7 Y AMBOS APROBADOS
        if (promedio >= 7 && aprobadoC1 && aprobadoC2) {
            definitiva = Math.round(promedio);
            if (definitiva < 7) definitiva = 7;
            inDic.disabled = true;
            inDic.value = '';
            inFeb.disabled = true;
            inFeb.value = '';
        } else {
            // DEBE IR A DICIEMBRE
            inDic.disabled = false;
            let vDic = parseFloat(inDic.value) || 0;
            if (inDic.value !== "") {
                if (vDic >= 4) {
                    definitiva = vDic;
                    inFeb.disabled = true;
                    inFeb.value = '';
                } else {
                    inFeb.disabled = false;
                    let vFeb = parseFloat(inFeb.value) || 0;
                    if (inFeb.value !== "") {
                        definitiva = vFeb >= 4 ? vFeb : "C.I.";
                    }
                }
            } else {
                inFeb.disabled = true;
            }
        }
    } else {
        if (spanProm) spanProm.innerText = "-";
        inDic.disabled = true;
        inFeb.disabled = true;
    }

    if (spanDef) spanDef.innerText = definitiva;
    if (tdDef) {
        tdDef.className = "text-center fw-bold text-white def-cell " + 
            (definitiva === "C.I." ? "bg-danger" : 
             (definitiva !== "-" ? "bg-success" : "bg-secondary"));
    }
}

async function guardarNotasDocente() {
    if (!window.cursoActualDocente) {
        alert('Error: No hay datos del curso actual');
        return;
    }
    
    const btn = document.querySelector('#tabNotas .btn-primary');
    const rows = document.querySelectorAll('#tabNotas tr[data-dni]');
    
    if (rows.length === 0) {
        alert('No hay datos para guardar');
        return;
    }
    
    const notasArray = [];
    
    rows.forEach(row => {
        const dni = row.dataset.dni;
        const n1 = row.querySelector('.n1').value;
        const i1 = row.querySelector('.i1').value;
        const n2 = row.querySelector('.n2').value;
        const i2 = row.querySelector('.i2').value;
        const dic = row.querySelector('.dic').value;
        const feb = row.querySelector('.feb').value;
        const def = row.querySelector('.definitiva').innerText;
        
        notasArray.push({
            dni: dni,
            n1_c1: n1,
            i1: i1,
            n1_c2: n2,
            i2: i2,
            dic: dic,
            feb: feb,
            def: def
        });
    });
    
    const datos = {
        op: 'guardarNotasMasivo',
        idMateria: window.cursoActualDocente.idMateria,
        notas: notasArray
    };
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';
        
        const resp = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        
        const json = await resp.json();
        
        if (json.status === 'success') {
            alert('✅ Calificaciones guardadas correctamente');
        } else {
            throw new Error(json.message || 'Error al guardar');
        }
    } catch (e) {
        console.error('Error guardando notas:', e);
        alert('❌ Error al guardar calificaciones: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Guardar Todas las Calificaciones';
    }
}

// --- RESUMEN ---

function renderTabResumen(est) {
    let aprobados = 0, diciembre = 0, febrero = 0, ci = 0;
    let sumaAsis = 0;

    est.forEach(e => {
        const porcAsis = e.asistencia && e.asistencia.porcentaje ? e.asistencia.porcentaje : 0;
        sumaAsis += porcAsis;
        
        const def = e.notas && e.notas.nota_definitiva ? e.notas.nota_definitiva : "-";
        if (def === "C.I.") ci++;
        else if (def !== "-" && parseFloat(def) >= 4) aprobados++;
        
        // Lógica simplificada para conteo de instancias
        if (e.notas && e.notas.diciembre !== "" && def === "") diciembre++;
        if (e.notas && e.notas.febrero !== "" && def === "") febrero++;
    });

    const promedioAsis = est.length > 0 ? Math.round(sumaAsis / est.length) : 0;

    return `
    <div class="row g-3 mb-4">
        <div class="col-md-3">
            <div class="card bg-primary text-white text-center p-3 shadow-sm">
                <small>Asistencia Promedio</small>
                <h3 class="mb-0">${promedioAsis}%</h3>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-success text-white text-center p-3 shadow-sm">
                <small>Aprobados</small>
                <h3 class="mb-0">${aprobados}</h3>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-warning text-dark text-center p-3 shadow-sm">
                <small>En Instancias</small>
                <h3 class="mb-0">${diciembre + febrero}</h3>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-danger text-white text-center p-3 shadow-sm">
                <small>Recursantes (C.I.)</small>
                <h3 class="mb-0">${ci}</h3>
            </div>
        </div>
    </div>
    <div class="table-responsive">
        <table class="table table-bordered table-sm text-center">
            <thead class="table-light">
                <tr><th>Estudiante</th><th>% Asist.</th><th>Faltas</th><th>Definitiva</th></tr>
            </thead>
            <tbody>
                ${est.map(e => {
                    const porcAsis = e.asistencia && e.asistencia.porcentaje ? e.asistencia.porcentaje : 0;
                    const faltas = e.asistencia && e.asistencia.injustificadas ? e.asistencia.injustificadas : 0;
                    const def = e.notas && e.notas.nota_definitiva ? e.notas.nota_definitiva : '-';
                    return `
                    <tr>
                        <td class="text-start">${e.nombre}</td>
                        <td>${porcAsis}%</td>
                        <td class="text-danger">${faltas}</td>
                        <td class="fw-bold">${def}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

// --- MIS DATOS ---

async function verMisDatosDocente() {
    try {
        // Obtener datos del docente desde la hoja Docentes
        const resp = await fetch(`${URL_API}?op=getDocentes&rol=Docente`);
        const json = await resp.json();
        
        if (json.status !== 'success' || !json.data) {
            throw new Error('No se pudieron cargar los datos');
        }
        
        // Buscar al docente actual por DNI o email
        const docente = json.data.find(d => 
            String(d[0]) === String(usuarioActual.dni) || 
            String(d[2]) === String(usuarioActual.email)
        );
        
        if (!docente) {
            throw new Error('No se encontraron tus datos');
        }
        
        let html = `
            <div class="card shadow-sm">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">👤 Mis Datos Personales</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold text-muted">DNI</label>
                                <p class="form-control-plaintext">${docente[0] || 'No registrado'}</p>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold text-muted">Nombre Completo</label>
                                <p class="form-control-plaintext">${docente[1] || 'No registrado'}</p>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold text-muted">Email ABC</label>
                                <p class="form-control-plaintext">${docente[2] || 'No registrado'}</p>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold text-muted">Celular</label>
                                <p class="form-control-plaintext">${docente[3] || 'No registrado'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <label class="form-label fw-bold text-muted">Materias Asignadas</label>
                        <div class="border rounded p-3 bg-light">
                            ${docente[4] ? docente[4].split(', ').map(m => 
                                `<span class="badge bg-info text-dark me-2 mb-2">${m}</span>`
                            ).join('') : '<span class="text-muted">No tienes materias asignadas</span>'}
                        </div>
                    </div>
                    
                    <div class="mt-4 text-center">
                        <button class="btn btn-outline-secondary" onclick="iniciarModuloDocente()">
                            ← Volver a mis cursos
                        </button>
                    </div>
                </div>
            </div>`;
        
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) {
        console.error('Error cargando datos del docente:', e);
        document.getElementById('contenido-dinamico').innerHTML = `
            <div class="alert alert-danger">
                <h5>Error al cargar tus datos</h5>
                <p>${e.message}</p>
                <button class="btn btn-secondary mt-2" onclick="iniciarModuloDocente()">← Volver</button>
            </div>`;
    }
}
