// ============================================================================
// ARCHIVO: Modulo_Docente.js
// ============================================================================

async function iniciarModuloDocente() {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando cursos asignados...</p></div>`;
    
    try {
        const resp = await fetch(`${URL_API}?op=getCursosDocente&rol=Docente&dni=${usuarioActual.dni || ''}`);
        const json = await resp.json();
        
        if (json.status !== 'success' || !json.data) {
            document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-warning"><h5>No tienes cursos asignados</h5><p>Contacta al directivo para que te asigne materias.</p></div>`;
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
        
        // Inyectamos el Modal de Justificación aquí para asegurar que exista
        html += renderModalJustificarDocenteHTML();

        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) { document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
}

// Variable global para fecha
let fechaAsistenciaSeleccionada = new Date().toISOString().split('T')[0];

async function abrirCursoDocente(curso, idMateria, nombreMateria) {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando ${nombreMateria}...</p></div>`;
    
    try {
        const resp = await fetch(`${URL_API}?op=getEstudiantesConDatos&rol=Docente&dniDocente=${usuarioActual.dni || ''}&curso=${curso}&idMateria=${idMateria}`);
        const json = await resp.json();
        
        window.cursoActualDocente = { curso, idMateria, nombreMateria, estudiantes: json.data.estudiantes };
        
        // Si por alguna razón se borró el modal, lo volvemos a poner
        if (!document.getElementById('modalJustificarDocente')) {
             document.body.insertAdjacentHTML('beforeend', renderModalJustificarDocenteHTML());
        }
        
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
                                <small class="text-muted d-block mb-1">Se guardará como la asistencia del día seleccionado.</small>
                                <button class="btn btn-success" onclick="guardarAsistenciaDocente()">💾 Guardar Asistencia</button>
                            </div>
                        </div>
                        ${renderTablaAsistenciaDocente(json.data.estudiantes)}
                    </div>

                    <div id="tabNotas" class="d-none">
                        <div class="alert alert-info small mb-2">
                            <i class="bi bi-info-circle"></i> <b>Reglas:</b> Promedio >= 7 y cuatris aprobados -> Promociona. Si no -> Diciembre (aprueba con 4). Si no -> Febrero (aprueba con 4).
                        </div>
                        ${renderTablaNotasDocente(json.data.estudiantes)}
                    </div>
                </div>
            </div>`;
        document.getElementById('contenido-dinamico').innerHTML = html;
        
        setTimeout(recalcularTodoAlInicio, 500);

    } catch (e) { 
        console.error(e);
        alert("Error cargando el curso."); 
        iniciarModuloDocente(); 
    }
}

function mostrarTabDocente(tab, btn) {
    document.getElementById('tabAsistencia').classList.add('d-none');
    document.getElementById('tabNotas').classList.add('d-none');
    document.querySelectorAll('#tabsDocente .nav-link').forEach(b => b.classList.remove('active'));
    
    const target = tab === 'asistencia' ? 'tabAsistencia' : 'tabNotas';
    document.getElementById(target).classList.remove('d-none');
    btn.classList.add('active');
}

// --- FUNCIONES DE ASISTENCIA ---

function cambiarFechaAsistencia(nuevaFecha) {
    fechaAsistenciaSeleccionada = nuevaFecha;
}

function renderTablaAsistenciaDocente(est) {
    // CORRECCION: Aseguramos que haya 4 columnas en THEAD y 4 en TBODY
    let html = `<div class="table-responsive"><table class="table table-hover table-striped align-middle border">
    <thead class="table-dark text-center">
        <tr>
            <th class="text-start ps-3">Estudiante</th>
            <th style="width: 80px;" class="bg-success">P</th>
            <th style="width: 80px;" class="bg-danger">A</th>
            <th style="width: 60px;">Inasist.</th> </tr>
    </thead>
    <tbody>`;
    
    est.forEach(e => {
        html += `<tr>
        <td class="fw-bold ps-3">${e.nombre}</td>
        <td class="text-center bg-success bg-opacity-10">
            <input type="radio" name="asis_${e.dni}" value="P" checked class="form-check-input" style="transform: scale(1.3); cursor:pointer;">
        </td>
        <td class="text-center bg-danger bg-opacity-10">
            <input type="radio" name="asis_${e.dni}" value="A" class="form-check-input" style="transform: scale(1.3); cursor:pointer;">
        </td>
        <td class="text-center">
             <button class="btn btn-sm btn-outline-secondary border-0" onclick="abrirModalJustificarDoc('${e.dni}', '${e.nombre}')" title="Ver Historial">
                ✏️
             </button>
        </td>
        </tr>`;
    });
    return html + `</tbody></table></div>`;
}

async function guardarAsistenciaDocente() {
    if (!window.cursoActualDocente) return;
    const inputs = document.querySelectorAll('input[type="radio"]:checked');
    let lista = []; 
    inputs.forEach(i => lista.push({ dni: i.name.split('_')[1], estado: i.value }));
    
    const btn = document.querySelector('button[onclick="guardarAsistenciaDocente()"]');
    btn.disabled = true; btn.innerText = "Guardando...";

    try {
        await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify({ 
                op: 'guardarAsistenciaDocente', 
                dniDocente: usuarioActual.dni, 
                idMateria: window.cursoActualDocente.idMateria, 
                fecha: fechaAsistenciaSeleccionada, 
                asistencia: lista 
            }) 
        });
        alert(`✅ Asistencia guardada.`);
    } catch (e) { alert('Error al guardar asistencia.'); } 
    finally { btn.disabled = false; btn.innerText = "💾 Guardar Asistencia"; }
}

// --- MODAL Y LÓGICA DE JUSTIFICACIÓN ---

function renderModalJustificarDocenteHTML() {
    return `
    <div class="modal fade" id="modalJustificarDocente" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-warning">
            <h5 class="modal-title text-dark">Justificar Inasistencias</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Alumno: <b id="just_doc_nombre"></b></p>
            <div id="lista_faltas_docente" class="list-group"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>`;
}

async function abrirModalJustificarDoc(dni, nombre) {
    if (!window.cursoActualDocente) return;
    const modal = new bootstrap.Modal(document.getElementById('modalJustificarDocente'));
    document.getElementById('just_doc_nombre').innerText = nombre;
    document.getElementById('lista_faltas_docente').innerHTML = '<div class="text-center p-3"><div class="spinner-border text-warning"></div> Buscando faltas...</div>';
    modal.show();

    try {
        const resp = await fetch(`${URL_API}?op=getFaltasAlumnoDocente&dni=${dni}&idMateria=${window.cursoActualDocente.idMateria}`);
        const json = await resp.json();
        
        const divLista = document.getElementById('lista_faltas_docente');
        divLista.innerHTML = '';

        if (json.data && json.data.length > 0) {
            json.data.forEach(falta => {
                divLista.innerHTML += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <span>📅 ${falta.fecha} - <span class="badge bg-danger">Ausente</span></span>
                    <button class="btn btn-sm btn-outline-success" onclick="justificarFaltaAccion(${falta.fila}, '${dni}', '${nombre}')">Justificar ✅</button>
                </div>`;
            });
        } else {
            divLista.innerHTML = '<div class="alert alert-success m-2 small">No tiene inasistencias injustificadas.</div>';
        }
    } catch (e) {
        document.getElementById('lista_faltas_docente').innerHTML = '<div class="text-danger">Error al cargar datos.</div>';
    }
}

async function justificarFaltaAccion(fila, dni, nombre) {
    if(!confirm("¿Confirmar justificación?")) return;
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'justificarFaltaDocente', fila: fila }) });
        abrirModalJustificarDoc(dni, nombre); 
    } catch (e) { alert("Error al justificar."); }
}

// --- LÓGICA DE NOTAS (CORREGIDA AL 100%) ---

function renderTablaNotasDocente(est) {
    let html = `
    <div class="table-responsive">
        <table class="table table-bordered align-middle table-sm" style="font-size: 0.9rem;">
            <thead class="table-dark text-center">
                <tr>
                    <th rowspan="2" class="align-middle" style="min-width: 200px;">Estudiante</th>
                    <th colspan="2" class="bg-primary bg-opacity-50">1° Cuatrimestre</th>
                    <th colspan="2" class="bg-primary bg-opacity-25">2° Cuatrimestre</th>
                    <th rowspan="2" class="align-middle bg-secondary">Prom.</th>
                    <th rowspan="2" class="align-middle bg-danger bg-opacity-75">Dic.</th>
                    <th rowspan="2" class="align-middle bg-danger">Feb.</th>
                    <th rowspan="2" class="align-middle bg-success">Def.</th>
                </tr>
                <tr>
                    <th>Nota</th><th>Int.</th>
                    <th>Nota</th><th>Int.</th>
                </tr>
            </thead>
            <tbody>`;
            
    est.forEach(e => {
        const n = e.notas || {};
        html += `<tr data-dni="${e.dni}">
            <td class="fw-bold ps-2">${e.nombre}</td>
            <td class="p-1"><input type="number" min="1" max="10" class="form-control text-center nota-input n1" value="${n.n1_c1||''}" oninput="calcularFila('${e.dni}')"></td>
            <td class="p-1"><input type="number" min="1" max="10" class="form-control text-center nota-input i1" value="${n.i1||''}" disabled oninput="calcularFila('${e.dni}')"></td>
            <td class="p-1"><input type="number" min="1" max="10" class="form-control text-center nota-input n2" value="${n.n1_c2||''}" oninput="calcularFila('${e.dni}')"></td>
            <td class="p-1"><input type="number" min="1" max="10" class="form-control text-center nota-input i2" value="${n.i2||''}" disabled oninput="calcularFila('${e.dni}')"></td>
            <td class="text-center fw-bold bg-light"><span class="promedio">-</span></td>
            <td class="p-1"><input type="number" min="1" max="10" class="form-control text-center nota-input dic" value="${n.dic||''}" disabled oninput="calcularFila('${e.dni}')"></td>
            <td class="p-1"><input type="number" min="1" max="10" class="form-control text-center nota-input feb" value="${n.feb||''}" disabled oninput="calcularFila('${e.dni}')"></td>
            <td class="text-center fw-bold text-white bg-secondary def-cell"><span class="definitiva">-</span></td>
        </tr>`;
    });

    html += `</tbody></table></div>
    <div class="d-grid gap-2 mt-3">
        <button class="btn btn-primary" onclick="guardarNotasDocente()">💾 Guardar Todas las Notas</button>
    </div>`;
    return html;
}

function recalcularTodoAlInicio() {
    if(!window.cursoActualDocente) return;
    window.cursoActualDocente.estudiantes.forEach(e => calcularFila(e.dni));
}

function calcularFila(dni) {
    const row = document.querySelector(`tr[data-dni="${dni}"]`);
    if(!row) return;

    // --- OBTENER INPUTS ---
    const inN1 = row.querySelector('.n1');
    const inI1 = row.querySelector('.i1');
    const inN2 = row.querySelector('.n2');
    const inI2 = row.querySelector('.i2');
    const inDic = row.querySelector('.dic');
    const inFeb = row.querySelector('.feb');
    
    const spanProm = row.querySelector('.promedio');
    const spanDef = row.querySelector('.definitiva');
    const tdDef = row.querySelector('.def-cell');

    // --- VALORES RAW ---
    let vN1 = parseFloat(inN1.value) || 0;
    let vN2 = parseFloat(inN2.value) || 0;
    
    // --- LÓGICA CUATRIMESTRES ---
    // Regla: Nota < 7 habilita intensificación.
    // Si la nota es 6.5, habilita. Si es 7, deshabilita.
    
    if (inN1.value !== "" && vN1 < 7) { 
        inI1.disabled = false; 
    } else { 
        inI1.disabled = true; inI1.value = ''; 
    }

    if (inN2.value !== "" && vN2 < 7) { 
        inI2.disabled = false; 
    } else { 
        inI2.disabled = true; inI2.value = ''; 
    }

    // Valores Intensificación
    let vI1 = !inI1.disabled ? (parseFloat(inI1.value) || 0) : 0;
    let vI2 = !inI2.disabled ? (parseFloat(inI2.value) || 0) : 0;

    // --- ESTADO DE CADA CUATRIMESTRE ---
    // Aprobado si Nota >= 7 OR Intensificación >= 4
    let aprobadoC1 = (vN1 >= 7) || (vI1 >= 4);
    let aprobadoC2 = (vN2 >= 7) || (vI2 >= 4);

    // --- CALCULO PROMEDIO ---
    // Regla: "Nota final es el resultado de promediar los dos cuatrimestres"
    // Valor efectivo para el promedio: Si aprobó intensificación (>=4), usamos esa nota.
    // Si no fue a intensificación (tiene 7 o más), usamos la nota original.
    // Si fue a intensificación y desaprobó (tiene 2 y 2), usamos la intensificación o la nota? 
    // Usualmente se usa la nota más alta lograda o la de cierre. Usaremos la nota "efectiva".
    
    let notaEfectiva1 = (vN1 >= 7) ? vN1 : vI1; // Si < 7 usamos lo que sacó en Recup (aunque sea 0)
    let notaEfectiva2 = (vN2 >= 7) ? vN2 : vI2;
    
    // Corrección para cuando aún no hay recup cargada: Usamos la nota original para proyectar el promedio
    if (vN1 < 7 && inI1.value === "") notaEfectiva1 = vN1;
    if (vN2 < 7 && inI2.value === "") notaEfectiva2 = vN2;

    let promedio = 0;
    let definitiva = "-";

    if (inN1.value !== "" && inN2.value !== "") {
        let calculo = (notaEfectiva1 + notaEfectiva2) / 2;
        promedio = parseFloat(calculo.toFixed(2)); // Guardamos decimales para mostrar
        spanProm.innerText = promedio;

        // --- DEFINICION DE ESTATUS FINAL ---
        // Condición Promoción: Promedio >= 7 Y ambos cuatris aprobados.
        // Si el promedio da 8 pero desaprobó el 2do cuatri (Ej: 10 y 2), NO promociona.
        
        if (promedio >= 7 && aprobadoC1 && aprobadoC2) {
            // PROMOCIONA
            definitiva = Math.round(promedio); // Redondeo matemático (7.5 -> 8)
            if(definitiva < 7) definitiva = 7; // Piso 7 si promociona
            
            inDic.disabled = true; inDic.value = '';
            inFeb.disabled = true; inFeb.value = '';
        } else {
            // A DICIEMBRE
            inDic.disabled = false;
            let vDic = parseFloat(inDic.value) || 0;
            
            if (inDic.value !== "") {
                if (vDic >= 4) {
                    // APROBÓ DICIEMBRE -> NOTA VA A DEFINITIVA
                    definitiva = vDic;
                    inFeb.disabled = true; inFeb.value = '';
                } else {
                    // A FEBRERO
                    inFeb.disabled = false;
                    let vFeb = parseFloat(inFeb.value) || 0;
                    if (inFeb.value !== "") {
                        if (vFeb >= 4) {
                            definitiva = vFeb;
                        } else {
                            definitiva = "C.I."; // Desaprobó Febrero
                        }
                    } else {
                        definitiva = "-"; // Esperando nota Febrero
                    }
                }
            } else {
                definitiva = "-"; // Esperando nota Diciembre
                inFeb.disabled = true; 
            }
        }
    } else {
        spanProm.innerText = "-";
        inDic.disabled = true;
        inFeb.disabled = true;
    }

    spanDef.innerText = definitiva;
    
    // Colores Definitiva
    tdDef.className = "text-center fw-bold text-white def-cell";
    if (definitiva === "C.I.") tdDef.classList.add("bg-danger");
    else if (definitiva !== "-") tdDef.classList.add("bg-success");
    else tdDef.classList.add("bg-secondary");
}

async function guardarNotasDocente() {
    if (!window.cursoActualDocente) return;
    
    const filas = document.querySelectorAll('#tabNotas tr[data-dni]');
    let notasArray = [];
    
    filas.forEach(row => {
        const dni = row.getAttribute('data-dni');
        notasArray.push({
            dni: dni,
            n1_c1: row.querySelector('.n1').value,
            i1: row.querySelector('.i1').value,
            n1_c2: row.querySelector('.n2').value,
            i2: row.querySelector('.i2').value,
            dic: row.querySelector('.dic').value,
            feb: row.querySelector('.feb').value,
            def: row.querySelector('.definitiva').innerText
        });
    });

    const btn = document.querySelector('button[onclick="guardarNotasDocente()"]');
    btn.disabled = true; btn.innerText = "Guardando...";

    try {
        await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify({ 
                op: 'guardarNotasMasivo', 
                idMateria: window.cursoActualDocente.idMateria, 
                notas: notasArray 
            }) 
        });
        alert('✅ Calificaciones guardadas correctamente.');
    } catch (e) { alert('Error al guardar notas.'); }
    finally { btn.disabled = false; btn.innerText = "💾 Guardar Todas las Notas"; }
}
