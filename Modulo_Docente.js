// ============================================================================
// ARCHIVO: Modulo_Docente.js (VERSIÓN CORREGIDA - SIN ERRORES)
// ============================================================================

let fechaAsistenciaSeleccionada = new Date().toISOString().split('T')[0];
let cursoActualDocente = null;

async function iniciarModuloDocente() {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando cursos asignados...</p></div>`;
    
    try {
        const url = `${URL_API}?op=getCursosDocente&rol=Docente&dni=${usuarioActual.dni || ''}`;
        const resp = await fetch(url);
        const json = await resp.json();
        
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
        
        json.data.forEach((cursoData) => {
            const totalEstudiantes = cursoData.totalEstudiantes || 0;
            const totalMaterias = cursoData.materias ? cursoData.materias.length : 0;
            
            html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 shadow-sm border-0 border-start border-4 border-primary">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold text-primary mb-0">${cursoData.curso}</h5>
                            <span class="badge bg-info">${totalEstudiantes} est.</span>
                        </div>
                        
                        <hr class="my-2">`;
            
            if (cursoData.materias && cursoData.materias.length > 0) {
                html += `<ul class="list-unstyled mb-0">`;
                cursoData.materias.forEach((m) => {
                    let tipoBadge = 'bg-light text-dark border';
                    if (m.tipoAsignacion === 'Titular') tipoBadge = 'bg-success text-white';
                    
                    html += `
                    <li class="mb-2">
                        <button class="btn btn-outline-dark w-100 text-start d-flex justify-content-between align-items-center p-2" 
                                onclick="abrirCursoDocente('${cursoData.curso}', '${m.id}', '${m.nombre}')">
                            <span class="fw-medium">${m.nombre}</span>
                            <span class="badge ${tipoBadge}">${m.tipoAsignacion}</span>
                        </button>
                    </li>`;
                });
                html += `</ul>`;
            }
            
            html += `</div></div></div>`;
        });
        
        html += `</div>`;
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) { 
        console.error('Error en iniciarModuloDocente:', e);
        document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; 
    }
}

async function abrirCursoDocente(curso, idMateria, nombreMateria) {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando datos...</p></div>`;
    
    try {
        const url = `${URL_API}?op=getEstudiantesConDatosCompletos&rol=Docente&dniDocente=${usuarioActual.dni}&curso=${encodeURIComponent(curso)}&idMateria=${idMateria}`;
        const resp = await fetch(url);
        const json = await resp.json();
        
        if (json.status !== 'success' || !json.data || !json.data.estudiantes) {
            throw new Error(json.message || 'Error al cargar el curso');
        }
        
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
                            <button class="nav-link active" onclick="mostrarTab('asistencia')">📅 Asistencia</button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" onclick="mostrarTab('notas')">📝 Notas</button>
                        </li>
                    </ul>
                </div>
                <div class="card-body">
                    <div id="tabAsistencia">
                        <div class="row mb-3 align-items-end bg-light p-3 rounded">
                            <div class="col-md-4">
                                <label class="fw-bold small">Fecha de toma:</label>
                                <input type="date" id="fechaAsistenciaPicker" class="form-control" value="${fechaAsistenciaSeleccionada}">
                            </div>
                            <div class="col-md-8 text-end">
                                <button class="btn btn-success" onclick="guardarAsistenciaDocente()">💾 Guardar Asistencia</button>
                            </div>
                        </div>
                        ${renderTablaAsistencia(json.data.estudiantes)}
                    </div>

                    <div id="tabNotas" class="d-none">
                        ${renderTablaNotas(json.data.estudiantes)}
                    </div>
                </div>
            </div>`;
            
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) { 
        console.error('Error en abrirCursoDocente:', e);
        document.getElementById('contenido-dinamico').innerHTML = `
            <div class="alert alert-danger">
                <h5>Error al cargar el curso</h5>
                <p>${e.message}</p>
                <button class="btn btn-secondary mt-2" onclick="iniciarModuloDocente()">← Volver</button>
            </div>`;
    }
}

function mostrarTab(tab) {
    document.getElementById('tabAsistencia').classList.add('d-none');
    document.getElementById('tabNotas').classList.add('d-none');
    document.querySelectorAll('#tabsDocente .nav-link').forEach(b => b.classList.remove('active'));
    
    document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.remove('d-none');
    event.target.classList.add('active');
    
    if (tab === 'notas') {
        setTimeout(inicializarNotas, 100);
    }
}

// --- ASISTENCIA ---

function renderTablaAsistencia(est) {
    let html = `<div class="table-responsive">
        <table class="table table-hover table-striped align-middle">
        <thead class="table-dark text-center">
            <tr>
                <th class="text-start">Estudiante</th>
                <th>% Asis</th>
                <th>Faltas</th>
                <th class="bg-success">P</th>
                <th class="bg-danger">A</th>
            </tr>
        </thead>
        <tbody>`;
    
    est.forEach(e => {
        const porc = e.asistencia?.porcentaje || 0;
        const faltas = e.asistencia?.injustificadas || 0;
        
        html += `<tr>
            <td class="fw-bold text-start">${e.nombre}</td>
            <td class="text-center ${porc < 80 ? 'text-danger' : 'text-success'}">${porc}%</td>
            <td class="text-center fw-bold text-danger">${faltas}</td>
            <td class="text-center">
                <input type="radio" name="asis_${e.dni}" value="P" checked>
            </td>
            <td class="text-center">
                <input type="radio" name="asis_${e.dni}" value="A">
            </td>
        </tr>`;
    });
    
    return html + `</tbody></table></div>`;
}

async function guardarAsistenciaDocente() {
    if (!window.cursoActualDocente) return alert('Error: No hay datos del curso');
    
    const fecha = document.getElementById('fechaAsistenciaPicker').value;
    if (!fecha) return alert('Selecciona una fecha');
    
    const asistenciaData = [];
    window.cursoActualDocente.estudiantes.forEach(est => {
        const radio = document.querySelector(`input[name="asis_${est.dni}"]:checked`);
        if (radio) {
            asistenciaData.push({ dni: est.dni, estado: radio.value });
        }
    });
    
    if (asistenciaData.length === 0) return alert('No hay datos para guardar');
    
    const datos = {
        op: 'guardarAsistenciaDocente',
        dniDocente: usuarioActual.dni,
        idMateria: window.cursoActualDocente.idMateria,
        fecha: fecha,
        asistencia: asistenciaData
    };
    
    try {
        const btn = document.querySelector('#tabAsistencia .btn-success');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';
        
        const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        const json = await resp.json();
        
        if (json.status === 'success') {
            alert('✅ Asistencia guardada');
            abrirCursoDocente(window.cursoActualDocente.curso, window.cursoActualDocente.idMateria, window.cursoActualDocente.nombreMateria);
        } else {
            throw new Error(json.message);
        }
    } catch (e) {
        alert('❌ Error: ' + e.message);
    }
}

// --- NOTAS - VERSIÓN SIMPLE Y FUNCIONAL ---

function renderTablaNotas(est) {
    let html = `
    <div class="alert alert-info small mb-3">
        <b>Sistema de calificación:</b>
        <ul class="mb-0">
            <li>Notas del 1 al 10 (números enteros)</li>
            <li>Cuatrimestre aprueba con: 7 (nota) o 4 (intensificación)</li>
            <li>Promoción: Ambos cuatrimestres aprobados + promedio ≥ 7</li>
        </ul>
    </div>
    
    <div class="table-responsive">
        <table class="table table-bordered table-hover">
            <thead class="table-dark text-center">
                <tr>
                    <th class="text-start">Estudiante</th>
                    <th>1er C</th>
                    <th>Intens.</th>
                    <th>2do C</th>
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
        <tr id="fila_${e.dni}" data-dni="${e.dni}">
            <td class="fw-bold text-start">${e.nombre}</td>
            <td class="text-center">
                <input type="number" class="form-control form-control-sm nota-c1" 
                       value="${notas.nota1_C1 || ''}" min="1" max="10" step="1" 
                       onchange="actualizarNota('${e.dni}', 'c1', this.value)">
            </td>
            <td class="text-center">
                <input type="number" class="form-control form-control-sm intens-c1" 
                       value="${notas.intensificacion1 || ''}" min="1" max="10" step="1" 
                       onchange="calcularNotaFinal('${e.dni}')" disabled>
            </td>
            <td class="text-center">
                <input type="number" class="form-control form-control-sm nota-c2" 
                       value="${notas.nota1_C2 || ''}" min="1" max="10" step="1" 
                       onchange="actualizarNota('${e.dni}', 'c2', this.value)">
            </td>
            <td class="text-center">
                <input type="number" class="form-control form-control-sm intens-c2" 
                       value="${notas.intensificacion2 || ''}" min="1" max="10" step="1" 
                       onchange="calcularNotaFinal('${e.dni}')" disabled>
            </td>
            <td class="text-center"><span class="promedio">-</span></td>
            <td class="text-center">
                <input type="number" class="form-control form-control-sm diciembre" 
                       value="${notas.diciembre || ''}" min="1" max="10" step="1" 
                       onchange="calcularNotaFinal('${e.dni}')" disabled>
            </td>
            <td class="text-center">
                <input type="number" class="form-control form-control-sm febrero" 
                       value="${notas.febrero || ''}" min="1" max="10" step="1" 
                       onchange="calcularNotaFinal('${e.dni}')" disabled>
            </td>
            <td class="text-center fw-bold"><span class="definitiva">-</span></td>
        </tr>`;
    });
    
    html += `</tbody></table>
        <div class="text-end">
            <button class="btn btn-primary" onclick="guardarNotas()">💾 Guardar Todas las Notas</button>
        </div>
    </div>`;
    
    return html;
}

function actualizarNota(dni, cuatrimestre, valor) {
    const row = document.getElementById(`fila_${dni}`);
    if (!row) return;
    
    const intensInput = row.querySelector(`.intens-${cuatrimestre}`);
    const nota = parseInt(valor) || 0;
    
    // Habilitar intensificación si la nota es menor a 7
    if (nota > 0 && nota < 7) {
        intensInput.disabled = false;
    } else {
        intensInput.disabled = true;
        intensInput.value = '';
    }
    
    calcularNotaFinal(dni);
}

function calcularNotaFinal(dni) {
    console.log(`Calculando nota final para: ${dni}`);
    
    const row = document.getElementById(`fila_${dni}`);
    if (!row) {
        console.log('Fila no encontrada');
        return;
    }

    // Obtener valores de manera segura
    const getValue = (selector) => {
        const element = row.querySelector(selector);
        return element ? parseInt(element.value) || 0 : 0;
    };

    const vN1 = getValue('.nota-c1');
    const vI1 = getValue('.intens-c1');
    const vN2 = getValue('.nota-c2');
    const vI2 = getValue('.intens-c2');
    const vDic = getValue('.diciembre');
    const vFeb = getValue('.febrero');

    console.log(`Valores: N1=${vN1}, I1=${vI1}, N2=${vN2}, I2=${vI2}, Dic=${vDic}, Feb=${vFeb}`);

    // Determinar si los cuatrimestres están aprobados
    const aprobadoC1 = (vN1 >= 7) || (vI1 >= 4);
    const aprobadoC2 = (vN2 >= 7) || (vI2 >= 4);
    
    // Calcular nota efectiva (usar la mayor entre nota e intensificación)
    const notaEfectivaC1 = Math.max(vN1, vI1);
    const notaEfectivaC2 = Math.max(vN2, vI2);
    
    // Calcular promedio
    let promedio = 0;
    if ((vN1 > 0 || vI1 > 0) && (vN2 > 0 || vI2 > 0)) {
        promedio = Math.round((notaEfectivaC1 + notaEfectivaC2) / 2);
    }
    
    // Lógica de definitiva
    let definitiva = "-";
    
    if ((vN1 > 0 || vI1 > 0) && (vN2 > 0 || vI2 > 0)) {
        // CASO 1: Promoción
        if (aprobadoC1 && aprobadoC2 && promedio >= 7) {
            definitiva = promedio;
            row.querySelector('.diciembre').disabled = true;
            row.querySelector('.febrero').disabled = true;
        } 
        // CASO 2: Va a Diciembre
        else {
            row.querySelector('.diciembre').disabled = false;
            
            if (vDic > 0) {
                if (vDic >= 4) {
                    definitiva = vDic;
                    row.querySelector('.febrero').disabled = true;
                } else {
                    row.querySelector('.febrero').disabled = false;
                    if (vFeb > 0) {
                        definitiva = vFeb >= 4 ? vFeb : "C.I.";
                    }
                }
            } else {
                row.querySelector('.febrero').disabled = true;
            }
        }
    } else {
        row.querySelector('.diciembre').disabled = true;
        row.querySelector('.febrero').disabled = true;
    }

    // Actualizar interfaz
    const spanProm = row.querySelector('.promedio');
    const spanDef = row.querySelector('.definitiva');
    
    if (spanProm) {
        spanProm.textContent = promedio > 0 ? promedio : "-";
        spanProm.className = 'promedio ' + (promedio >= 7 ? 'text-success fw-bold' : 'text-danger');
    }
    
    if (spanDef) {
        spanDef.textContent = definitiva;
        if (definitiva === "C.I.") {
            spanDef.className = 'definitiva text-danger fw-bold';
        } else if (definitiva !== "-") {
            spanDef.className = 'definitiva ' + (parseInt(definitiva) >= 4 ? 'text-success fw-bold' : 'text-warning fw-bold');
        } else {
            spanDef.className = 'definitiva text-muted';
        }
    }
    
    console.log(`Resultado: Prom=${promedio}, Def=${definitiva}`);
    
    return {
        dni: dni,
        n1: vN1,
        i1: vI1,
        n2: vN2,
        i2: vI2,
        prom: promedio,
        dic: vDic,
        feb: vFeb,
        def: definitiva
    };
}

function inicializarNotas() {
    console.log('Inicializando notas...');
    
    if (!window.cursoActualDocente || !window.cursoActualDocente.estudiantes) {
        console.log('No hay datos del curso');
        return;
    }
    
    setTimeout(() => {
        window.cursoActualDocente.estudiantes.forEach(est => {
            const row = document.getElementById(`fila_${est.dni}`);
            if (row) {
                // Verificar intensificaciones basadas en notas existentes
                const n1 = parseInt(row.querySelector('.nota-c1').value) || 0;
                const n2 = parseInt(row.querySelector('.nota-c2').value) || 0;
                
                if (n1 > 0 && n1 < 7) {
                    row.querySelector('.intens-c1').disabled = false;
                }
                if (n2 > 0 && n2 < 7) {
                    row.querySelector('.intens-c2').disabled = false;
                }
                
                // Calcular estado inicial
                calcularNotaFinal(est.dni);
            }
        });
        
        console.log('Notas inicializadas correctamente');
    }, 200);
}

async function guardarNotas() {
    if (!window.cursoActualDocente) {
        alert('Error: No hay datos del curso actual');
        return;
    }
    
    const notasArray = [];
    let tieneDatos = false;
    
    window.cursoActualDocente.estudiantes.forEach(est => {
        const calculo = calcularNotaFinal(est.dni);
        if (calculo && (calculo.n1 > 0 || calculo.n2 > 0)) {
            notasArray.push(calculo);
            tieneDatos = true;
        }
    });
    
    if (!tieneDatos) {
        alert('No hay notas para guardar');
        return;
    }
    
    const datos = {
        op: 'guardarNotasMasivo',
        idMateria: window.cursoActualDocente.idMateria,
        notas: notasArray
    };
    
    try {
        const btn = document.querySelector('#tabNotas .btn-primary');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';
        
        const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        const json = await resp.json();
        
        if (json.status === 'success') {
            alert('✅ Notas guardadas correctamente');
            abrirCursoDocente(window.cursoActualDocente.curso, window.cursoActualDocente.idMateria, window.cursoActualDocente.nombreMateria);
        } else {
            throw new Error(json.message || 'Error al guardar');
        }
    } catch (e) {
        alert('❌ Error: ' + e.message);
    } finally {
        const btn = document.querySelector('#tabNotas .btn-primary');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '💾 Guardar Todas las Notas';
        }
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
                            <p><strong>DNI:</strong> ${docente[0] || 'No registrado'}</p>
                            <p><strong>Nombre:</strong> ${docente[1] || 'No registrado'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Email:</strong> ${docente[2] || 'No registrado'}</p>
                            <p><strong>Celular:</strong> ${docente[3] || 'No registrado'}</p>
                        </div>
                    </div>
                    <div class="mt-3">
                        <button class="btn btn-outline-secondary" onclick="iniciarModuloDocente()">← Volver</button>
                    </div>
                </div>
            </div>`;
        
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) {
        document.getElementById('contenido-dinamico').innerHTML = `
            <div class="alert alert-danger">
                <h5>Error al cargar tus datos</h5>
                <p>${e.message}</p>
                <button class="btn btn-secondary mt-2" onclick="iniciarModuloDocente()">← Volver</button>
            </div>`;
    }
}
