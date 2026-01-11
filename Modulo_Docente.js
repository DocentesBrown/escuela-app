// ============================================================================
// ARCHIVO: Modulo_Docente.js (VERSIÓN SIMPLIFICADA Y FUNCIONAL)
// ============================================================================

let fechaAsistenciaSeleccionada = new Date().toISOString().split('T')[0];
let cursoActualDocente = null;

async function iniciarModuloDocente() {
    console.log('=== INICIANDO MÓDULO DOCENTE ===');
    
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando cursos asignados...</p></div>`;
    
    try {
        const url = `${URL_API}?op=getCursosDocente&rol=Docente&dni=${usuarioActual.dni || ''}`;
        console.log('URL de solicitud:', url);
        
        const resp = await fetch(url);
        const json = await resp.json();
        
        console.log('Respuesta:', json);
        
        if (json.status !== 'success' || !json.data || json.data.length === 0) {
            document.getElementById('contenido-dinamico').innerHTML = `
                <div class="alert alert-warning">
                    <h5>No tienes cursos asignados</h5>
                    <p>Contacta al directivo para que te asigne cursos.</p>
                </div>`;
            return;
        }
        
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="mb-0">🏫 Mis Cursos</h4>
                <span class="badge bg-primary">${json.data.length} curso(s)</span>
            </div>
            <div class="row" id="lista-cursos">`;
        
        json.data.forEach((cursoData, index) => {
            const totalEstudiantes = cursoData.totalEstudiantes || 0;
            const totalMaterias = cursoData.materias ? cursoData.materias.length : 0;
            
            let badgeColor = 'bg-secondary';
            if (totalEstudiantes > 0) badgeColor = 'bg-info';
            
            html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 shadow-sm border-0 border-start border-4 border-primary">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold text-primary mb-0">${cursoData.curso || 'Sin nombre'}</h5>
                            <span class="badge ${badgeColor}">${totalEstudiantes} est.</span>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="text-muted small">
                                <i class="bi bi-book"></i> ${totalMaterias} materia(s)
                            </span>
                        </div>
                        
                        <hr class="my-2">`;
            
            if (cursoData.materias && cursoData.materias.length > 0) {
                html += `<ul class="list-unstyled mb-0">`;
                cursoData.materias.forEach((m, matIndex) => {
                    let tipoBadge = 'bg-light text-dark border';
                    if (m.tipoAsignacion === 'Titular') tipoBadge = 'bg-success text-white';
                    else if (m.tipoAsignacion === 'Suplencia') tipoBadge = 'bg-warning text-dark';
                    
                    html += `
                    <li class="mb-2">
                        <button class="btn btn-outline-dark w-100 text-start d-flex justify-content-between align-items-center p-2" 
                                onclick="abrirCursoDocente('${cursoData.curso}', '${m.id}', '${m.nombre}')"
                                title="Abrir ${m.nombre}">
                            <div class="text-truncate me-2">
                                <span class="fw-medium">${m.nombre || 'Sin nombre'}</span>
                            </div>
                            <div>
                                <span class="badge ${tipoBadge}">${m.tipoAsignacion || 'Sin tipo'}</span>
                            </div>
                        </button>
                    </li>`;
                });
                html += `</ul>`;
            } else {
                html += `<p class="text-muted small mb-0">No hay materias asignadas en este curso.</p>`;
            }
            
            html += `</div></div></div>`;
        });
        
        html += `</div>`;
        
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) { 
        console.error('Error en iniciarModuloDocente:', e);
        document.getElementById('contenido-dinamico').innerHTML = `
            <div class="alert alert-danger">
                <h5>Error al cargar cursos</h5>
                <p>${e.message}</p>
            </div>`; 
    }
}

async function abrirCursoDocente(curso, idMateria, nombreMateria) {
    console.log(`Abriendo curso: ${curso}, Materia: ${nombreMateria}`);
    
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando datos...</p></div>`;
    
    try {
        const url = `${URL_API}?op=getEstudiantesConDatosCompletos&rol=Docente&dniDocente=${usuarioActual.dni}&curso=${encodeURIComponent(curso)}&idMateria=${idMateria}`;
        console.log('URL de solicitud:', url);
        
        const resp = await fetch(url);
        const json = await resp.json();
        
        console.log('Respuesta del servidor:', json);
        
        if (json.status !== 'success') {
            throw new Error(json.message || 'Error al cargar el curso');
        }
        
        if (!json.data || !json.data.estudiantes) {
            throw new Error('No se recibieron datos válidos del servidor');
        }
        
        // Guardar datos del curso globalmente
        window.cursoActualDocente = { 
            curso: curso, 
            idMateria: idMateria, 
            nombreMateria: nombreMateria, 
            estudiantes: json.data.estudiantes
        };  
        
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h4 class="mb-0 fw-bold text-primary">${nombreMateria}</h4>
                    <p class="text-muted mb-0 small">${curso} • ${json.data.estudiantes.length} estudiantes</p>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="iniciarModuloDocente()">← Volver</button>
            </div>

            <div class="card shadow-sm mb-4">
                <div class="card-header bg-white">
                    <ul class="nav nav-pills card-header-pills" id="tabsDocente">
                        <li class="nav-item">
                            <button class="nav-link active" onclick="mostrarTabDocente('asistencia', this)">📅 Asistencia</button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" onclick="mostrarTabDocente('notas', this)">📝 Notas</button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" onclick="mostrarTabDocente('resumen', this)">📈 Resumen</button>
                        </li>
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
                        ${renderTablaNotasDocente(json.data.estudiantes)}
                    </div>

                    <div id="tabResumen" class="d-none">
                        ${renderTabResumen(json.data.estudiantes)}
                    </div>
                </div>
            </div>`;
            
        document.getElementById('contenido-dinamico').innerHTML = html;
        
        console.log('Curso cargado exitosamente');
        
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
    console.log(`Mostrando pestaña: ${tab}`);
    
    // Ocultar todas las pestañas
    document.getElementById('tabAsistencia').classList.add('d-none');
    document.getElementById('tabNotas').classList.add('d-none');
    document.getElementById('tabResumen').classList.add('d-none');
    
    // Quitar active de todos los botones
    document.querySelectorAll('#tabsDocente .nav-link').forEach(b => b.classList.remove('active'));
    
    // Mostrar la pestaña seleccionada
    const target = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
    document.getElementById(target).classList.remove('d-none');
    
    // Activar el botón
    btn.classList.add('active');
    
    // Si se muestra la pestaña de Notas, inicializar las filas
    if (tab === 'notas') {
        setTimeout(() => {
            if (window.cursoActualDocente && window.cursoActualDocente.estudiantes) {
                inicializarNotas();
            }
        }, 100);
    }
}

function cambiarFechaAsistencia(fecha) {
    fechaAsistenciaSeleccionada = fecha;
}

// --- ASISTENCIA ---

function renderTablaAsistenciaDocente(est) {
    let html = `<div class="table-responsive">
        <table class="table table-hover table-striped align-middle border">
        <thead class="table-dark text-center">
            <tr>
                <th class="text-start ps-3">Estudiante</th>
                <th style="width: 80px;">% Asis</th>
                <th style="width: 80px;">Faltas</th>
                <th style="width: 80px;" class="bg-success">P</th>
                <th style="width: 80px;" class="bg-danger">A</th>
            </tr>
        </thead>
        <tbody>`;
    
    if (est.length === 0) {
        html += `<tr><td colspan="5" class="text-center text-muted py-4">No hay estudiantes en este curso</td></tr>`;
    } else {
        est.forEach(e => {
            const porc = e.asistencia && e.asistencia.porcentaje ? e.asistencia.porcentaje : 0;
            const faltas = e.asistencia && e.asistencia.injustificadas ? e.asistencia.injustificadas : 0;
            let colorAsis = porc < 80 ? 'text-danger fw-bold' : 'text-success';

            html += `<tr>
                <td class="fw-bold ps-3 text-start">${e.nombre}</td>
                <td class="text-center ${colorAsis}">${porc}%</td>
                <td class="text-center fw-bold text-danger">${faltas}</td>
                <td class="text-center bg-success bg-opacity-10">
                    <input type="radio" name="asis_${e.dni}" value="P" checked class="form-check-input" style="transform: scale(1.3); cursor:pointer;">
                </td>
                <td class="text-center bg-danger bg-opacity-10">
                    <input type="radio" name="asis_${e.dni}" value="A" class="form-check-input" style="transform: scale(1.3); cursor:pointer;">
                </td>
            </tr>`;
        });
    }
    
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

// --- NOTAS - SISTEMA SIMPLIFICADO Y FUNCIONAL ---

function renderTablaNotasDocente(est) {
    let html = `
    <div class="alert alert-info small mb-3">
        <b>📋 Sistema de calificación:</b>
        <ul class="mb-0">
            <li><b>Notas:</b> números enteros del 1 al 10</li>
            <li><b>Aprobación por cuatrimestre:</b> 7 (nota) o 4 (intensificación)</li>
            <li><b>Promoción:</b> Ambos cuatrimestres aprobados + promedio ≥ 7</li>
            <li><b>Si no promociona:</b> Diciembre → Febrero → C.I.</li>
        </ul>
    </div>
    
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
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>`;
    
    if (est.length === 0) {
        html += `<tr><td colspan="10" class="text-center text-muted py-4">No hay estudiantes en este curso</td></tr>`;
    } else {
        est.forEach(e => {
            const notas = e.notas || {};
            html += `
            <tr data-dni="${e.dni}">
                <td class="fw-bold text-start">${e.nombre}</td>
                <td class="text-center">
                    <input type="number" class="form-control form-control-sm n1" 
                           value="${notas.nota1_C1 || ''}" min="1" max="10" step="1" 
                           oninput="manejarCambioNota('${e.dni}', 1, this.value)">
                </td>
                <td class="text-center">
                    <input type="number" class="form-control form-control-sm i1" 
                           value="${notas.intensificacion1 || ''}" min="1" max="10" step="1" 
                           oninput="calcularEstado('${e.dni}')" disabled>
                </td>
                <td class="text-center">
                    <input type="number" class="form-control form-control-sm n2" 
                           value="${notas.nota1_C2 || ''}" min="1" max="10" step="1" 
                           oninput="manejarCambioNota('${e.dni}', 2, this.value)">
                </td>
                <td class="text-center">
                    <input type="number" class="form-control form-control-sm i2" 
                           value="${notas.intensificacion2 || ''}" min="1" max="10" step="1" 
                           oninput="calcularEstado('${e.dni}')" disabled>
                </td>
                <td class="text-center"><span class="fw-bold promedio">-</span></td>
                <td class="text-center">
                    <input type="number" class="form-control form-control-sm dic" 
                           value="${notas.diciembre || ''}" min="1" max="10" step="1" 
                           oninput="calcularEstado('${e.dni}')" disabled>
                </td>
                <td class="text-center">
                    <input type="number" class="form-control form-control-sm feb" 
                           value="${notas.febrero || ''}" min="1" max="10" step="1" 
                           oninput="calcularEstado('${e.dni}')" disabled>
                </td>
                <td class="text-center fw-bold text-white def-cell bg-secondary">
                    <span class="definitiva">-</span>
                </td>
                <td class="text-center">
                    <span class="estado small">-</span>
                </td>
            </tr>`;
        });
    }
    
    html += `</tbody></table>
        <div class="text-end mt-3">
            <button class="btn btn-primary" onclick="guardarTodasLasNotas()">
                💾 Guardar Todas las Notas
            </button>
        </div>
    </div>`;
    
    return html;
}

function manejarCambioNota(dni, cuatrimestre, valor) {
    console.log(`Cambio nota ${cuatrimestre} para ${dni}: ${valor}`);
    
    const row = document.querySelector(`tr[data-dni="${dni}"]`);
    if (!row) return;
    
    const inputIntens = row.querySelector(`.i${cuatrimestre}`);
    const nota = parseInt(valor) || 0;
    
    // Habilitar intensificación si la nota es menor a 7 (incluso si es 0)
    if (nota < 7) {
        console.log(`Habilitando intensificación ${cuatrimestre}`);
        inputIntens.disabled = false;
        inputIntens.placeholder = "Ingrese nota";
    } else {
        console.log(`Deshabilitando intensificación ${cuatrimestre}`);
        inputIntens.disabled = true;
        inputIntens.value = '';
        inputIntens.placeholder = "";
    }
    
    calcularEstado(dni);
}

function calcularEstado(dni) {
    console.log(`Calculando estado para ${dni}`);
    
    const row = document.querySelector(`tr[data-dni="${dni}"]`);
    if (!row) return;

    // Obtener elementos
    const inN1 = row.querySelector('.n1');
    const inI1 = row.querySelector('.i1');
    const inN2 = row.querySelector('.n2');
    const inI2 = row.querySelector('.i2');
    const inDic = row.querySelector('.dic');
    const inFeb = row.querySelector('.feb');
    const spanProm = row.querySelector('.promedio');
    const spanDef = row.querySelector('.definitiva');
    const spanEstado = row.querySelector('.estado');
    const tdDef = row.querySelector('.def-cell');

    // Obtener valores
    const vN1 = parseInt(inN1.value) || 0;
    const vN2 = parseInt(inN2.value) || 0;
    const vI1 = parseInt(inI1.value) || 0;
    const vI2 = parseInt(inI2.value) || 0;
    const vDic = parseInt(inDic.value) || 0;
    const vFeb = parseInt(inFeb.value) || 0;

    console.log(`Valores: N1=${vN1}, I1=${vI1}, N2=${vN2}, I2=${vI2}, Dic=${vDic}, Feb=${vFeb}`);

    // Determinar si los cuatrimestres están aprobados y la NOTA EFECTIVA CORRECTA
    let aprobadoC1 = false;
    let aprobadoC2 = false;
    let notaEfectivaC1 = 0;
    let notaEfectivaC2 = 0;
    
    // CUATRIMESTRE 1
    if (vN1 >= 7) {
        // Nota regular aprobada
        aprobadoC1 = true;
        notaEfectivaC1 = vN1;
        console.log(`C1: Aprobado con nota regular ${vN1}`);
    } else if (vI1 >= 4) {
        // Intensificación aprobada
        aprobadoC1 = true;
        notaEfectivaC1 = vI1;
        console.log(`C1: Aprobado con intensificación ${vI1}`);
    } else if (vN1 > 0) {
        // Nota regular desaprobada (sin intensificación aprobada)
        notaEfectivaC1 = vN1;
        console.log(`C1: Desaprobado con nota regular ${vN1}`);
    } else if (vI1 > 0) {
        // Intensificación desaprobada
        notaEfectivaC1 = vI1;
        console.log(`C1: Desaprobado con intensificación ${vI1}`);
    }
    
    // CUATRIMESTRE 2
    if (vN2 >= 7) {
        // Nota regular aprobada
        aprobadoC2 = true;
        notaEfectivaC2 = vN2;
        console.log(`C2: Aprobado con nota regular ${vN2}`);
    } else if (vI2 >= 4) {
        // Intensificación aprobada
        aprobadoC2 = true;
        notaEfectivaC2 = vI2;
        console.log(`C2: Aprobado con intensificación ${vI2}`);
    } else if (vN2 > 0) {
        // Nota regular desaprobada (sin intensificación aprobada)
        notaEfectivaC2 = vN2;
        console.log(`C2: Desaprobado con nota regular ${vN2}`);
    } else if (vI2 > 0) {
        // Intensificación desaprobada
        notaEfectivaC2 = vI2;
        console.log(`C2: Desaprobado con intensificación ${vI2}`);
    }
    
    // CALCULAR PROMEDIO - SIEMPRE QUE HAYA AL MENOS UNA NOTA EN AMBOS CUATRIMESTRES
    let promedio = 0;
    let mostrarPromedio = false;
    
    const tieneNotaC1 = (vN1 > 0) || (vI1 > 0);
    const tieneNotaC2 = (vN2 > 0) || (vI2 > 0);
    
    if (tieneNotaC1 && tieneNotaC2) {
        // Solo calcular si ambas notas efectivas tienen valor
        if (notaEfectivaC1 > 0 && notaEfectivaC2 > 0) {
            promedio = Math.round((notaEfectivaC1 + notaEfectivaC2) / 2);
            if (promedio > 10) promedio = 10;
            mostrarPromedio = true;
            console.log(`Promedio calculado: (${notaEfectivaC1} + ${notaEfectivaC2}) / 2 = ${promedio}`);
        }
    }
    
    // Lógica de definitiva
    let definitiva = "-";
    let estado = "Sin calificar";
    
    if (tieneNotaC1 && tieneNotaC2) {
        // CASO 1: Promoción (ambos cuatrimestres aprobados Y promedio ≥ 7)
        if (aprobadoC1 && aprobadoC2 && promedio >= 7) {
            definitiva = promedio;
            inDic.disabled = true;
            inFeb.disabled = true;
            estado = "Promoción";
            console.log(`Estado: Promoción con nota ${definitiva}`);
        } 
        // CASO 2: Va a Diciembre (no promociona)
        else {
            inDic.disabled = false;
            
            if (vDic > 0) {
                if (vDic >= 4) {
                    definitiva = vDic;
                    inFeb.disabled = true;
                    estado = "Aprobado Dic";
                    console.log(`Estado: Aprobado en Diciembre con ${definitiva}`);
                } else {
                    inFeb.disabled = false;
                    if (vFeb > 0) {
                        if (vFeb >= 4) {
                            definitiva = vFeb;
                            estado = "Aprobado Feb";
                            console.log(`Estado: Aprobado en Febrero con ${definitiva}`);
                        } else {
                            definitiva = "C.I.";
                            estado = "C.I.";
                            console.log(`Estado: C.I.`);
                        }
                    } else {
                        estado = "En Febrero";
                        console.log(`Estado: En Febrero`);
                    }
                }
            } else {
                inFeb.disabled = true;
                estado = "En Diciembre";
                console.log(`Estado: En Diciembre`);
            }
        }
    } else {
        inDic.disabled = true;
        inFeb.disabled = true;
        estado = "Faltan notas";
        console.log(`Estado: Faltan notas`);
    }

    // Actualizar interfaz - PROMEDIO SIEMPRE SE MUESTRA SI HAY DATOS
    if (spanProm) {
        if (mostrarPromedio && promedio > 0) {
            spanProm.innerText = promedio;
            spanProm.className = 'fw-bold ' + (promedio >= 7 ? 'text-success' : 'text-danger');
        } else {
            spanProm.innerText = "-";
            spanProm.className = 'fw-bold text-muted';
        }
    }
    
    if (spanDef) spanDef.innerText = definitiva;
    if (spanEstado) {
        spanEstado.innerText = estado;
        spanEstado.className = 'estado small ' + getColorEstado(estado);
    }
    
    // Colorear celda de definitiva
    if (tdDef) {
        if (definitiva === "C.I.") {
            tdDef.className = "text-center fw-bold text-white def-cell bg-danger";
        } else if (definitiva !== "-" && parseInt(definitiva) >= 4) {
            tdDef.className = "text-center fw-bold text-white def-cell bg-success";
        } else if (definitiva !== "-") {
            tdDef.className = "text-center fw-bold text-white def-cell bg-warning";
        } else {
            tdDef.className = "text-center fw-bold text-white def-cell bg-secondary";
        }
    }
    
    console.log(`Resultado final: Nota Definitiva = ${definitiva}, Estado = ${estado}`);
    
    return {
        dni: dni,
        n1: vN1,
        i1: vI1,
        n2: vN2,
        i2: vI2,
        prom: promedio,
        dic: vDic,
        feb: vFeb,
        def: definitiva,
        estado: estado
    };
}


function getColorEstado(estado) {
    const colores = {
        'Promoción': 'text-success fw-bold',
        'Aprobado Dic': 'text-primary fw-bold',
        'Aprobado Feb': 'text-info fw-bold',
        'C.I.': 'text-danger fw-bold',
        'En Diciembre': 'text-warning',
        'En Febrero': 'text-warning',
        'Faltan notas': 'text-muted',
        'Sin calificar': 'text-muted'
    };
    return colores[estado] || 'text-muted';
}

function inicializarNotas() {
    console.log('Inicializando notas...');
    
    if (!window.cursoActualDocente || !window.cursoActualDocente.estudiantes) {
        console.log('No hay datos del curso');
        return;
    }
    
    setTimeout(() => {
        const rows = document.querySelectorAll('#tabNotas tr[data-dni]');
        console.log(`Encontradas ${rows.length} filas`);
        
        rows.forEach(row => {
            const dni = row.dataset.dni;
            
            // Verificar intensificaciones basadas en notas existentes
            const inN1 = row.querySelector('.n1');
            const inI1 = row.querySelector('.i1');
            const inN2 = row.querySelector('.n2');
            const inI2 = row.querySelector('.i2');
            
            // Habilitar intensificación si la nota regular es menor a 7
            if (inN1 && inI1) {
                const vN1 = parseInt(inN1.value) || 0;
                if (vN1 < 7) {
                    inI1.disabled = false;
                    inI1.placeholder = "Ingrese nota";
                }
            }
            
            if (inN2 && inI2) {
                const vN2 = parseInt(inN2.value) || 0;
                if (vN2 < 7) {
                    inI2.disabled = false;
                    inI2.placeholder = "Ingrese nota";
                }
            }
            
            // Calcular estado inicial
            calcularEstado(dni);
        });
        
        console.log('Notas inicializadas');
    }, 200);
}

async function guardarTodasLasNotas() {
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
        const calculo = calcularEstado(row.dataset.dni);
        if (calculo) {
            notasArray.push(calculo);
        }
    });
    
    const datos = {
        op: 'guardarNotasMasivo',
        idMateria: window.cursoActualDocente.idMateria,
        notas: notasArray
    };
    
    console.log('Enviando datos:', datos);
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';
        
        const resp = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        
        const json = await resp.json();
        
        if (json.status === 'success') {
            alert('✅ Notas guardadas correctamente');
            abrirCursoDocente(
                window.cursoActualDocente.curso,
                window.cursoActualDocente.idMateria,
                window.cursoActualDocente.nombreMateria
            );
        } else {
            throw new Error(json.message || 'Error al guardar');
        }
    } catch (e) {
        console.error('Error guardando notas:', e);
        alert('❌ Error al guardar notas: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Guardar Todas las Notas';
    }
}

// --- RESUMEN SIMPLIFICADO ---

function renderTabResumen(est) {
    if (est.length === 0) {
        return `<div class="alert alert-info">No hay estudiantes en este curso</div>`;
    }
    
    // Contadores básicos
    let aprobados = 0, diciembre = 0, febrero = 0, ci = 0, regular = 0;
    let sumaAsis = 0;
    
    est.forEach(e => {
        const porcAsis = e.asistencia && e.asistencia.porcentaje ? e.asistencia.porcentaje : 0;
        sumaAsis += porcAsis;
        
        if (e.notas && e.notas.nota_definitiva) {
            const def = e.notas.nota_definitiva;
            if (def === "C.I.") {
                ci++;
            } else if (parseFloat(def) >= 4) {
                aprobados++;
            }
        } else if (e.notas) {
            if (e.notas.diciembre && e.notas.diciembre !== "") {
                diciembre++;
            } else if (e.notas.febrero && e.notas.febrero !== "") {
                febrero++;
            } else {
                regular++;
            }
        }
    });
    
    const promedioAsis = est.length > 0 ? Math.round(sumaAsis / est.length) : 0;
    const tasaAprobacion = est.length > 0 ? Math.round((aprobados / est.length) * 100) : 0;

    return `
    <div class="row g-3 mb-4">
        <div class="col-md-3">
            <div class="card bg-primary text-white text-center p-3 shadow-sm">
                <small>Asistencia Prom.</small>
                <h3 class="mb-0">${promedioAsis}%</h3>
                <small class="opacity-75">${est.length} estudiantes</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-success text-white text-center p-3 shadow-sm">
                <small>Aprobados</small>
                <h3 class="mb-0">${aprobados}</h3>
                <small class="opacity-75">${tasaAprobacion}%</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-warning text-dark text-center p-3 shadow-sm">
                <small>Instancias</small>
                <h3 class="mb-0">${diciembre + febrero}</h3>
                <small class="opacity-75">${diciembre} Dic / ${febrero} Feb</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-danger text-white text-center p-3 shadow-sm">
                <small>Recursantes</small>
                <h3 class="mb-0">${ci}</h3>
                <small class="opacity-75">${regular} regulares</small>
            </div>
        </div>
    </div>
    
    <div class="table-responsive">
        <table class="table table-sm table-hover">
            <thead>
                <tr>
                    <th>Estudiante</th>
                    <th class="text-center">% Asist.</th>
                    <th class="text-center">Nota Final</th>
                    <th class="text-center">Estado</th>
                </tr>
            </thead>
            <tbody>
                ${est.map(e => {
                    const porcAsis = e.asistencia && e.asistencia.porcentaje ? e.asistencia.porcentaje : 0;
                    const def = e.notas && e.notas.nota_definitiva ? e.notas.nota_definitiva : '-';
                    
                    let estado = "Sin calificar";
                    if (def === "C.I.") estado = "C.I.";
                    else if (def !== "-" && parseFloat(def) >= 4) estado = "Aprobado";
                    else if (e.notas) {
                        if (e.notas.diciembre && e.notas.diciembre !== "") estado = "En Diciembre";
                        else if (e.notas.febrero && e.notas.febrero !== "") estado = "En Febrero";
                        else estado = "Regular";
                    }
                    
                    return `
                    <tr>
                        <td class="fw-bold">${e.nombre}</td>
                        <td class="text-center ${porcAsis < 80 ? 'text-danger fw-bold' : 'text-success'}">${porcAsis}%</td>
                        <td class="text-center fw-bold ${def === 'C.I.' ? 'text-danger' : (parseFloat(def) >= 4 ? 'text-success' : 'text-warning')}">${def}</td>
                        <td class="text-center">
                            <span class="badge ${getBadgeColor(estado)}">${estado}</span>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

function getBadgeColor(estado) {
    switch(estado) {
        case 'Aprobado': return 'bg-success';
        case 'C.I.': return 'bg-danger';
        case 'En Diciembre': return 'bg-warning text-dark';
        case 'En Febrero': return 'bg-warning text-dark';
        case 'Regular': return 'bg-light text-dark border';
        default: return 'bg-secondary';
    }
}

// --- MIS DATOS ---

async function verMisDatosDocente() {
    try {
        const resp = await fetch(`${URL_API}?op=getDocentes&rol=Docente`);
        const json = await resp.json();
        
        if (json.status !== 'success' || !json.data) {
            throw new Error('No se pudieron cargar los datos');
        }
        
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
                    <h5 class="mb-0">👤 Mis Datos</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold text-muted">DNI</label>
                                <p class="form-control-plaintext">${docente[0] || 'No registrado'}</p>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold text-muted">Nombre</label>
                                <p class="form-control-plaintext">${docente[1] || 'No registrado'}</p>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold text-muted">Email</label>
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
                            ).join('') : '<span class="text-muted">Sin materias asignadas</span>'}
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
