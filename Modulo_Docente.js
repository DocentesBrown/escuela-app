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
                html += `<li class="mb-2"><button class="btn btn-outline-dark w-100 text-start d-flex justify-content-between align-items-center" onclick="abrirCursoDocente('${cursoData.curso}', ${m.id}, '${m.nombre}')"><span>📚 ${m.nombre}</span> <span class="badge bg-light text-dark border">${m.tipoAsignacion}</span></button></li>`;
            });
            html += `</ul></div></div></div>`;
        });
        html += `</div>`;
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) { document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
}

// Variable global para controlar fecha de asistencia
let fechaAsistenciaSeleccionada = new Date().toISOString().split('T')[0];

async function abrirCursoDocente(curso, idMateria, nombreMateria) {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando ${nombreMateria}...</p></div>`;
    
    try {
        const resp = await fetch(`${URL_API}?op=getEstudiantesConDatos&rol=Docente&dniDocente=${usuarioActual.dni || ''}&curso=${curso}&idMateria=${idMateria}`);
        const json = await resp.json();
        
        window.cursoActualDocente = { curso, idMateria, nombreMateria, estudiantes: json.data.estudiantes };
        
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h4 class="mb-0 fw-bold text-primary">${nombreMateria} <span class="text-muted fw-normal fs-6">(${curso})</span></h4>
                </div>
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
                            <i class="bi bi-info-circle"></i> <b>Reglas:</b> Intensificación se habilita si nota < 7. Final >= 7 aprueba. Final < 7 habilita Diciembre.
                        </div>
                        ${renderTablaNotasDocente(json.data.estudiantes)}
                    </div>
                </div>
            </div>`;
        document.getElementById('contenido-dinamico').innerHTML = html;
        
        // Ejecutamos cálculo inicial para bloquear campos según datos cargados
        setTimeout(recalcularTodoAlInicio, 500);

    } catch (e) { 
        console.error(e);
        alert("Error cargando el curso. Intenta nuevamente."); 
        iniciarModuloDocente(); 
    }
}

function mostrarTabDocente(tab, btn) {
    document.getElementById('tabAsistencia').classList.add('d-none');
    document.getElementById('tabNotas').classList.add('d-none');
    
    // Quitar active de todos los botones
    document.querySelectorAll('#tabsDocente .nav-link').forEach(b => b.classList.remove('active'));
    
    // Activar el seleccionado
    const target = tab === 'asistencia' ? 'tabAsistencia' : 'tabNotas';
    document.getElementById(target).classList.remove('d-none');
    btn.classList.add('active');
}

// --- LÓGICA DE ASISTENCIA ---

function cambiarFechaAsistencia(nuevaFecha) {
    fechaAsistenciaSeleccionada = nuevaFecha;
    alert(`📅 Fecha cambiada al ${nuevaFecha}. \n\nRecuerda: Al guardar, estarás modificando la asistencia de ESTE día.`);
    // Opcional: Aquí podríamos hacer un fetch para traer la asistencia de ese día si ya fue cargada, 
    // pero para simplificar, el docente sobreescribe.
}

function renderTablaAsistenciaDocente(est) {
    let html = `<div class="table-responsive"><table class="table table-hover table-striped align-middle border">
    <thead class="table-dark text-center">
        <tr>
            <th class="text-start ps-3">Estudiante</th>
            <th style="width: 100px;" class="bg-success">Presente</th>
            <th style="width: 100px;" class="bg-danger">Ausente</th>
        </tr>
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
                fecha: fechaAsistenciaSeleccionada, // Usamos la fecha del calendario
                asistencia: lista 
            }) 
        });
        alert(`✅ Asistencia del ${fechaAsistenciaSeleccionada} guardada correctamente.`);
    } catch (e) { alert('Error al guardar asistencia.'); } 
    finally { btn.disabled = false; btn.innerText = "💾 Guardar Asistencia"; }
}

// --- LÓGICA DE NOTAS (LA CALCULADORA) ---

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
        // Renderizamos inputs con Data Attributes para encontrarlos fácil
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

// Función que se ejecuta al cargar para aplicar reglas a datos existentes
function recalcularTodoAlInicio() {
    if(!window.cursoActualDocente) return;
    window.cursoActualDocente.estudiantes.forEach(e => calcularFila(e.dni));
}

// EL CEREBRO DE LAS NOTAS
function calcularFila(dni) {
    const row = document.querySelector(`tr[data-dni="${dni}"]`);
    if(!row) return;

    // Obtener Inputs
    const inN1 = row.querySelector('.n1');
    const inI1 = row.querySelector('.i1');
    const inN2 = row.querySelector('.n2');
    const inI2 = row.querySelector('.i2');
    const inDic = row.querySelector('.dic');
    const inFeb = row.querySelector('.feb');
    
    const spanProm = row.querySelector('.promedio');
    const spanDef = row.querySelector('.definitiva');
    const tdDef = row.querySelector('.def-cell');

    // Valores Numéricos (0 si vacío)
    let vN1 = parseFloat(inN1.value) || 0;
    let vN2 = parseFloat(inN2.value) || 0;
    
    // 1. REGLA INTENSIFICACION: Si cuatri < 7, se habilita intensificación
    if (vN1 > 0 && vN1 < 7) inI1.disabled = false; else { inI1.disabled = true; inI1.value = ''; }
    if (vN2 > 0 && vN2 < 7) inI2.disabled = false; else { inI2.disabled = true; inI2.value = ''; }

    // Obtenemos valor de intensificaciones (si están habilitadas)
    let vI1 = !inI1.disabled ? (parseFloat(inI1.value) || 0) : 0;
    let vI2 = !inI2.disabled ? (parseFloat(inI2.value) || 0) : 0;

    // 2. CALCULO DE PROMEDIO 
    // Si aprobó intensificación (>=4), consideramos el cuatri "salvado" con 4 para el promedio? 
    // O usamos la nota original? El sistema PBA suele ser complejo. 
    // REGLA SIMPLIFICADA PEDIDA: "Promedio de los cuatris". 
    // Si recuperó, usaremos la nota de recuperación (tope 7 o 4 según criterio, usaremos valor real input).
    
    let notaFinal1 = vI1 >= 4 ? vI1 : vN1; // Si recuperó, toma nota recup, sino nota original
    let notaFinal2 = vI2 >= 4 ? vI2 : vN2;

    let promedio = 0;
    if (vN1 > 0 && vN2 > 0) {
        promedio = (notaFinal1 + notaFinal2) / 2;
        spanProm.innerText = promedio.toFixed(1); // Redondeo simple
        // Redondeo matemático para definir aprobación (6.5 -> 7)
        promedio = Math.round(promedio); 
    } else {
        spanProm.innerText = "-";
    }

    // 3. LOGICA DICIEMBRE / FEBRERO / DEFINITIVA
    
    let definitiva = "-";
    let estado = "cursando"; // cursando, aprobado, diciembre, febrero, ci

    // Solo calculamos si hay notas cargadas
    if (vN1 > 0 && vN2 > 0) {
        if (promedio >= 7) {
            // PROMOCIONA
            definitiva = promedio;
            estado = "aprobado";
            inDic.disabled = true; inDic.value = '';
            inFeb.disabled = true; inFeb.value = '';
        } else {
            // A DICIEMBRE
            estado = "diciembre";
            inDic.disabled = false;
            
            let vDic = parseFloat(inDic.value) || 0;
            
            if (vDic >= 4) {
                // APROBÓ DICIEMBRE
                definitiva = vDic;
                estado = "aprobado_dic";
                inFeb.disabled = true; inFeb.value = '';
            } else {
                // A FEBRERO (Si ya pasamos diciembre y no aprobó o no rindió)
                // Habilitamos febrero si hay algo escrito en diciembre (aunque sea un 1) o si explicitamente queremos habilitarlo
                // Asumimos que si promedio < 7, Diciembre está abierto. Si diciembre < 4 (y tiene dato), abre Febrero.
                
                if (inDic.value !== "") { // Solo si ya "rindió" mal diciembre
                    estado = "febrero";
                    inFeb.disabled = false;
                    
                    let vFeb = parseFloat(inFeb.value) || 0;
                    if (inFeb.value !== "") {
                         if (vFeb >= 4) {
                             definitiva = vFeb;
                             estado = "aprobado_feb";
                         } else {
                             definitiva = "C.I.";
                             estado = "recursante";
                         }
                    } else {
                        definitiva = "-"; // Esperando nota febrero
                    }
                } else {
                    definitiva = "-"; // Esperando nota diciembre
                    inFeb.disabled = true;
                }
            }
        }
    }

    // ACTUALIZAR VISTA DEFINITIVA
    spanDef.innerText = definitiva;
    
    // Colores Definitiva
    tdDef.className = "text-center fw-bold text-white def-cell"; // Reset
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
