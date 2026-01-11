// ============================================================================
// ARCHIVO: Modulo_Docente.js (VERSIÓN CORREGIDA)
// ============================================================================

let fechaAsistenciaSeleccionada = new Date().toISOString().split('T')[0];
let cursoActualDocente = null;

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
        
        // Asegurar que el modal está en el DOM
        document.getElementById('contenido-dinamico').innerHTML = html;
        
        // Agregar el modal dinámicamente si no existe
        if (!document.getElementById('modalJustificarDocente')) {
            const modalHTML = renderModalJustificarDocenteHTML();
            document.getElementById('contenido-dinamico').insertAdjacentHTML('beforeend', modalHTML);
        }
        
    } catch (e) { 
        console.error('Error en iniciarModuloDocente:', e);
        document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; 
    }
}

async function abrirCursoDocente(curso, idMateria, nombreMateria) {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando datos...</p></div>`;
    
    try {
        const url = `${URL_API}?op=getEstudiantesConDatosCompletos&rol=Docente&dniDocente=${usuarioActual.dni}&curso=${encodeURIComponent(curso)}&idMateria=${idMateria}`;
        console.log('URL de solicitud:', url);
        
        const resp = await fetch(url);
        const json = await resp.json();
        
        if (json.status !== 'success') {
            throw new Error(json.message || 'Error al cargar el curso');
        }
        
        if (!json.data || !json.data.estudiantes) {
            throw new Error('No se recibieron datos válidos del servidor');
        }
        
        cursoActualDocente = { 
            curso: curso, 
            idMateria: idMateria, 
            nombreMateria: nombreMateria, 
            estudiantes: json.data.estudiantes,
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
                            <i class="bi bi-info-circle"></i> <b>Lógica del sistema:</b><br>
                            • Cuatrimestre se aprueba con 7 (Nota) o 4 (Intensificación)<br>
                            • Si ambos cuatrimestres aprobados y Promedio ≥ 7 → Nota Definitiva<br>
                            • Si no → Diciembre (aprueba con 4) → Febrero → C.I.
                        </div>
                        ${renderTablaNotasDocente(json.data.estudiantes)}
                    </div>

                    <div id="tabResumen" class="d-none">
                        ${renderTabResumen(json.data.estudiantes)}
                    </div>
                </div>
            </div>`;
            
        document.getElementById('contenido-dinamico').innerHTML = html;
        
        // Asegurar que el modal está en el DOM
        if (!document.getElementById('modalJustificarDocente')) {
            const modalHTML = renderModalJustificarDocenteHTML();
            document.getElementById('contenido-dinamico').insertAdjacentHTML('beforeend', modalHTML);
        }
        
        // Inicializar cálculos
        setTimeout(() => {
            if (cursoActualDocente && cursoActualDocente.estudiantes) {
                cursoActualDocente.estudiantes.forEach(est => {
                    calcularFilaCompleta(est.dni);
                });
            }
        }, 300);

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
    const targetElement = document.getElementById(target);
    if (targetElement) {
        targetElement.classList.remove('d-none');
    }
    btn.classList.add('active');
}

function cambiarFechaAsistencia(fecha) {
    fechaAsistenciaSeleccionada = fecha;
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
            <th style="width: 60px;">Justificar</th>
        </tr>
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
             <button class="btn btn-sm btn-outline-warning border-0" onclick="abrirModalJustificarDoc('${e.dni}', '${e.nombre}')" title="Justificar faltas">⚖️</button>
        </td>
        </tr>`;
    });
    return html + `</tbody></table></div>`;
}

async function guardarAsistenciaDocente() {
    if (!cursoActualDocente) {
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
    const estudiantes = cursoActualDocente.estudiantes || [];
    
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
        idMateria: cursoActualDocente.idMateria,
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
                cursoActualDocente.curso,
                cursoActualDocente.idMateria,
                cursoActualDocente.nombreMateria
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
    if (!cursoActualDocente) {
        alert('Error: No hay datos del curso actual');
        return;
    }
    
    // Asegurar que el modal existe en el DOM
    let modalElement = document.getElementById('modalJustificarDocente');
    if (!modalElement) {
        // Crear modal dinámicamente
        const modalHTML = renderModalJustificarDocenteHTML();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modalElement = document.getElementById('modalJustificarDocente');
    }
    
    document.getElementById('just_doc_nombre').innerText = nombre;
    document.getElementById('lista_faltas_docente').innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm"></div><br>Buscando faltas...</div>';
    
    try {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        const url = `${URL_API}?op=getFaltasAlumnoDocente&rol=Docente&dni=${dni}&idMateria=${cursoActualDocente.idMateria}`;
        const resp = await fetch(url);
        const json = await resp.json();
        
        let html = '';
        if (json.status === 'success' && json.data && json.data.length > 0) {
            html = '<div class="list-group">';
            json.data.forEach(falta => {
                html += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <span class="fw-bold">${falta.fecha}</span>
                        <span class="badge bg-danger ms-2">Ausente</span>
                    </div>
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
        document.getElementById('lista_faltas_docente').innerHTML = '<div class="alert alert-danger">Error al cargar las faltas: ' + e.message + '</div>';
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
            // Cerrar modal
            const modalEl = document.getElementById('modalJustificarDocente');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            
            // Recargar datos del curso
            abrirCursoDocente(
                cursoActualDocente.curso,
                cursoActualDocente.idMateria,
                cursoActualDocente.nombreMateria
            );
        } else {
            throw new Error(json.message || 'Error al justificar');
        }
    } catch (e) {
        console.error('Error justificando falta:', e);
        alert('❌ Error al justificar: ' + e.message);
    }
}

// --- CALIFICACIONES - LÓGICA EDUCATIVA CORRECTA ---

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
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>`;
    
    est.forEach(e => {
        const notas = e.notas || {};
        html += `
        <tr data-dni="${e.dni}">
            <td class="fw-bold text-start">${e.nombre}</td>
            <td class="text-center"><input type="number" class="form-control form-control-sm n1" value="${notas.nota1_C1 || ''}" min="0" max="10" step="0.5" oninput="calcularFilaCompleta('${e.dni}')"></td>
            <td class="text-center"><input type="number" class="form-control form-control-sm i1" value="${notas.intensificacion1 || ''}" min="0" max="10" step="0.5" oninput="calcularFilaCompleta('${e.dni}')" disabled></td>
            <td class="text-center"><input type="number" class="form-control form-control-sm n2" value="${notas.nota1_C2 || ''}" min="0" max="10" step="0.5" oninput="calcularFilaCompleta('${e.dni}')"></td>
            <td class="text-center"><input type="number" class="form-control form-control-sm i2" value="${notas.intensificacion2 || ''}" min="0" max="10" step="0.5" oninput="calcularFilaCompleta('${e.dni}')" disabled></td>
            <td class="text-center"><span class="fw-bold promedio">-</span></td>
            <td class="text-center"><input type="number" class="form-control form-control-sm dic" value="${notas.diciembre || ''}" min="0" max="10" step="0.5" oninput="calcularFilaCompleta('${e.dni}')" disabled></td>
            <td class="text-center"><input type="number" class="form-control form-control-sm feb" value="${notas.febrero || ''}" min="0" max="10" step="0.5" oninput="calcularFilaCompleta('${e.dni}')" disabled></td>
            <td class="text-center fw-bold text-white def-cell bg-secondary"><span class="definitiva">-</span></td>
            <td class="text-center"><span class="estado small">-</span></td>
        </tr>`;
    });
    
    html += `</tbody></table>
        <div class="alert alert-warning small mb-3">
            <b>Instrucciones:</b> Ingresa notas (0-10). Si una nota de cuatrimestre es menor a 7, se habilita la intensificación.
        </div>
        <div class="text-end mt-3">
            <button class="btn btn-primary" onclick="guardarNotasDocente()">💾 Guardar Todas las Calificaciones</button>
        </div>
    </div>`;
    
    return html;
}

function calcularFilaCompleta(dni) {
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
    const vN1 = parseFloat(inN1.value) || 0;
    const vN2 = parseFloat(inN2.value) || 0;
    let vI1 = parseFloat(inI1.value) || 0;
    let vI2 = parseFloat(inI2.value) || 0;
    const vDic = parseFloat(inDic.value) || 0;
    const vFeb = parseFloat(inFeb.value) || 0;

    // LÓGICA DE INTENSIFICACIÓN
    // Si la nota del cuatrimestre es < 7, habilitar intensificación
    if (inN1.value !== "") {
        if (vN1 < 7 && vN1 > 0) {
            inI1.disabled = false;
            inI1.placeholder = "Ingrese intensif.";
        } else {
            inI1.disabled = true;
            inI1.value = '';
            vI1 = 0;
        }
    }

    if (inN2.value !== "") {
        if (vN2 < 7 && vN2 > 0) {
            inI2.disabled = false;
            inI2.placeholder = "Ingrese intensif.";
        } else {
            inI2.disabled = true;
            inI2.value = '';
            vI2 = 0;
        }
    }

    // Determinar si los cuatrimestres están aprobados
    const aprobadoC1 = (vN1 >= 7) || (vI1 >= 4);
    const aprobadoC2 = (vN2 >= 7) || (vI2 >= 4);
    
    // Calcular nota efectiva de cada cuatrimestre
    let notaEfectivaC1 = 0;
    let notaEfectivaC2 = 0;
    
    if (aprobadoC1) {
        notaEfectivaC1 = Math.max(vN1, vI1);
    } else {
        notaEfectivaC1 = Math.max(vN1, vI1);
    }
    
    if (aprobadoC2) {
        notaEfectivaC2 = Math.max(vN2, vI2);
    } else {
        notaEfectivaC2 = Math.max(vN2, vI2);
    }

    // Calcular promedio
    let promedio = 0;
    if (inN1.value !== "" && inN2.value !== "") {
        promedio = (notaEfectivaC1 + notaEfectivaC2) / 2;
        promedio = Math.round(promedio * 10) / 10; // Redondear a 1 decimal
    }

    // LÓGICA DE DEFINITIVA
    let definitiva = "-";
    let estado = "Sin datos";
    
    if (inN1.value !== "" && inN2.value !== "") {
        // CASO 1: Ambos cuatrimestres aprobados y Promedio ≥ 7
        if (aprobadoC1 && aprobadoC2 && promedio >= 7) {
            definitiva = Math.round(promedio);
            if (definitiva < 7) definitiva = 7;
            inDic.disabled = true;
            inDic.value = '';
            inFeb.disabled = true;
            inFeb.value = '';
            estado = "Aprobado por promoción";
        } 
        // CASO 2: Va a Diciembre
        else {
            inDic.disabled = false;
            
            if (inDic.value !== "") {
                // Si tiene nota de Diciembre
                if (vDic >= 4) {
                    definitiva = vDic;
                    inFeb.disabled = true;
                    inFeb.value = '';
                    estado = "Aprobado en Diciembre";
                } else {
                    // Va a Febrero
                    inFeb.disabled = false;
                    if (inFeb.value !== "") {
                        if (vFeb >= 4) {
                            definitiva = vFeb;
                            estado = "Aprobado en Febrero";
                        } else {
                            definitiva = "C.I.";
                            estado = "Recursa (C.I.)";
                        }
                    } else {
                        estado = "En Diciembre";
                    }
                }
            } else {
                inFeb.disabled = true;
                estado = "Regular";
            }
        }
    } else {
        inDic.disabled = true;
        inFeb.disabled = true;
        estado = "Faltan notas";
    }

    // Actualizar interfaz
    if (spanProm) spanProm.innerText = promedio > 0 ? promedio.toFixed(1) : "-";
    if (spanDef) spanDef.innerText = definitiva;
    if (spanEstado) spanEstado.innerText = estado;
    
    // Colores según estado
    if (tdDef) {
        if (definitiva === "C.I.") {
            tdDef.className = "text-center fw-bold text-white def-cell bg-danger";
        } else if (definitiva !== "-" && parseFloat(definitiva) >= 4) {
            tdDef.className = "text-center fw-bold text-white def-cell bg-success";
        } else if (definitiva !== "-") {
            tdDef.className = "text-center fw-bold text-white def-cell bg-warning";
        } else {
            tdDef.className = "text-center fw-bold text-white def-cell bg-secondary";
        }
    }
    
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
        estado: estado,
        aprobadoC1: aprobadoC1,
        aprobadoC2: aprobadoC2
    };
}

async function guardarNotasDocente() {
    if (!cursoActualDocente) {
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
        const calculo = calcularFilaCompleta(row.dataset.dni);
        if (calculo) {
            notasArray.push(calculo);
        }
    });
    
    const datos = {
        op: 'guardarNotasMasivo',
        idMateria: cursoActualDocente.idMateria,
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
            // Recargar para ver cambios
            abrirCursoDocente(
                cursoActualDocente.curso,
                cursoActualDocente.idMateria,
                cursoActualDocente.nombreMateria
            );
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

// --- RESUMEN MEJORADO ---

function renderTabResumen(est) {
    // Contadores
    let aprobados = 0, diciembre = 0, febrero = 0, ci = 0, regular = 0, promocionados = 0;
    let sumaAsis = 0, sumaNotas = 0, contNotas = 0;
    
    // Análisis por estudiante
    const detalleEstudiantes = est.map(e => {
        const porcAsis = e.asistencia && e.asistencia.porcentaje ? e.asistencia.porcentaje : 0;
        const faltas = e.asistencia && e.asistencia.injustificadas ? e.asistencia.injustificadas : 0;
        
        let def = "-";
        let estado = "Sin datos";
        let notaNumerica = 0;
        
        if (e.notas && e.notas.nota_definitiva) {
            def = e.notas.nota_definitiva;
            if (def === "C.I.") {
                estado = "C.I.";
                ci++;
            } else if (parseFloat(def) >= 4) {
                estado = "Aprobado";
                aprobados++;
                notaNumerica = parseFloat(def);
                sumaNotas += notaNumerica;
                contNotas++;
            }
        } else if (e.notas) {
            if (e.notas.diciembre && e.notas.diciembre !== "") {
                estado = "En Diciembre";
                diciembre++;
            } else if (e.notas.febrero && e.notas.febrero !== "") {
                estado = "En Febrero";
                febrero++;
            } else {
                estado = "Regular";
                regular++;
            }
        }
        
        // Verificar si es promocionado
        const n1 = parseFloat(e.notas?.nota1_C1 || 0);
        const n2 = parseFloat(e.notas?.nota1_C2 || 0);
        const i1 = parseFloat(e.notas?.intensificacion1 || 0);
        const i2 = parseFloat(e.notas?.intensificacion2 || 0);
        
        const aprobadoC1 = (n1 >= 7) || (i1 >= 4);
        const aprobadoC2 = (n2 >= 7) || (i2 >= 4);
        const prom = (Math.max(n1, i1) + Math.max(n2, i2)) / 2;
        
        if (aprobadoC1 && aprobadoC2 && prom >= 7 && estado === "Aprobado") {
            estado = "Promocionado";
            promocionados++;
        }
        
        sumaAsis += porcAsis;
        
        return {
            nombre: e.nombre,
            asistencia: porcAsis,
            faltas: faltas,
            definitiva: def,
            estado: estado,
            nota1: n1 || '-',
            nota2: n2 || '-',
            intens1: i1 || '-',
            intens2: i2 || '-',
            diciembre: e.notas?.diciembre || '-',
            febrero: e.notas?.febrero || '-'
        };
    });
    
    const promedioAsis = est.length > 0 ? Math.round(sumaAsis / est.length) : 0;
    const promedioNotas = contNotas > 0 ? (sumaNotas / contNotas).toFixed(1) : 0;

    return `
    <div class="row g-3 mb-4">
        <div class="col-md-3">
            <div class="card bg-primary text-white text-center p-3 shadow-sm">
                <small>Asistencia Promedio</small>
                <h3 class="mb-0">${promedioAsis}%</h3>
                <small class="opacity-75">${est.length} estudiantes</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-success text-white text-center p-3 shadow-sm">
                <small>Aprobados</small>
                <h3 class="mb-0">${aprobados}</h3>
                <small class="opacity-75">${promocionados} promocionados</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-warning text-dark text-center p-3 shadow-sm">
                <small>En Instancias</small>
                <h3 class="mb-0">${diciembre + febrero}</h3>
                <small class="opacity-75">${diciembre} Dic / ${febrero} Feb</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-danger text-white text-center p-3 shadow-sm">
                <small>Recursantes</small>
                <h3 class="mb-0">${ci}</h3>
                <small class="opacity-75">Prom. notas: ${promedioNotas}</small>
            </div>
        </div>
    </div>
    
    <div class="card mb-4">
        <div class
