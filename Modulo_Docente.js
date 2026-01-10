// ============================================================================
// ARCHIVO: Modulo_Docente.js
// ============================================================================

async function iniciarModuloDocente() {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando cursos...</p></div>`;
    
    try {
        const resp = await fetch(`${URL_API}?op=getCursosDocente&rol=Docente&dni=${usuarioActual.dni || ''}`);
        const json = await resp.json();
        
        if (json.status !== 'success' || !json.data) {
            document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-warning"><h5>No tienes cursos asignados</h5></div>`;
            return;
        }
        
        let html = `<div class="row" id="lista-cursos">`;
        json.data.forEach(cursoData => {
            html += `
            <div class="col-md-6 mb-3">
                <div class="card h-100 shadow-sm border-primary">
                    <div class="card-header bg-light"><h6 class="mb-0">${cursoData.curso}</h6></div>
                    <div class="card-body">
                        <p><strong>${cursoData.totalEstudiantes}</strong> estudiantes</p>
                        <ul class="list-unstyled">`;
            cursoData.materias.forEach(m => {
                html += `<li class="mb-1"><button class="btn btn-sm btn-outline-primary w-100 text-start" onclick="abrirCursoDocente('${cursoData.curso}', ${m.id}, '${m.nombre}')">📚 ${m.nombre} <span class="badge bg-secondary float-end">${m.tipoAsignacion}</span></button></li>`;
            });
            html += `</ul></div></div></div>`;
        });
        html += `</div>`;
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) { document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
}

async function abrirCursoDocente(curso, idMateria, nombreMateria) {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando...</p></div>`;
    
    try {
        const resp = await fetch(`${URL_API}?op=getEstudiantesConDatos&rol=Docente&dniDocente=${usuarioActual.dni || ''}&curso=${curso}&idMateria=${idMateria}`);
        const json = await resp.json();
        
        window.cursoActualDocente = { curso, idMateria, nombreMateria, estudiantes: json.data.estudiantes };
        
        let html = `
            <div class="card shadow-sm mb-4">
                <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <div><h5 class="mb-0">📚 ${nombreMateria}</h5><small>${curso} | ${json.data.estudiantes.length} alumnos</small></div>
                    <div>
                        <button class="btn btn-sm btn-light me-2" onclick="contactarPreceptor()">📞 Contactar Preceptor</button>
                        <button class="btn btn-sm btn-warning" onclick="iniciarModuloDocente()">← Volver</button>
                    </div>
                </div>
                <div class="card-body">
                    <ul class="nav nav-tabs mb-3" id="tabsDocente">
                        <li class="nav-item"><button class="nav-link active" onclick="mostrarTabDocente('asistencia')">📅 Asistencia</button></li>
                        <li class="nav-item"><button class="nav-link" onclick="mostrarTabDocente('notas')">📊 Notas</button></li>
                        <li class="nav-item"><button class="nav-link" onclick="mostrarTabDocente('resumen')">📈 Resumen</button></li>
                    </ul>
                    <div id="tabAsistencia">${renderTablaAsistenciaDocente(json.data.estudiantes)}</div>
                    <div id="tabNotas" class="d-none">${renderTablaNotasDocente(json.data.estudiantes)}</div>
                    <div id="tabResumen" class="d-none">${renderResumenDocente(json.data.estudiantes)}</div>
                </div>
            </div>`;
        document.getElementById('contenido-dinamico').innerHTML = html;
    } catch (e) { alert("Error cargando curso."); iniciarModuloDocente(); }
}

function mostrarTabDocente(tab) {
    document.getElementById('tabAsistencia').classList.add('d-none');
    document.getElementById('tabNotas').classList.add('d-none');
    document.getElementById('tabResumen').classList.add('d-none');
    document.querySelectorAll('#tabsDocente button').forEach(b => b.classList.remove('active'));
    
    const target = tab === 'asistencia' ? 'tabAsistencia' : (tab === 'notas' ? 'tabNotas' : 'tabResumen');
    document.getElementById(target).classList.remove('d-none');
    event.target.classList.add('active');
}

function renderTablaAsistenciaDocente(est) {
    const hoy = new Date().toISOString().split('T')[0];
    let html = `<div class="card mb-3"><div class="card-body"><h6>Tomar Asistencia Hoy (${hoy})</h6></div></div><div class="table-responsive"><table class="table table-hover table-striped align-middle"><thead class="table-dark"><tr><th>Estudiante</th><th class="text-center bg-success">P</th><th class="text-center bg-danger">A</th><th class="text-center bg-warning">T</th><th class="text-center bg-secondary">J</th><th>%</th></tr></thead><tbody>`;
    est.forEach(e => {
        const p = e.asistencia.porcentaje || 0;
        const color = p < 75 ? 'danger' : (p < 85 ? 'warning' : 'success');
        html += `<tr><td class="fw-bold">${e.nombre}</td>
        <td class="text-center bg-success bg-opacity-10"><input type="radio" name="asis_${e.dni}" value="P" checked style="transform: scale(1.3);"></td>
        <td class="text-center bg-danger bg-opacity-10"><input type="radio" name="asis_${e.dni}" value="A" style="transform: scale(1.3);"></td>
        <td class="text-center bg-warning bg-opacity-10"><input type="radio" name="asis_${e.dni}" value="T" style="transform: scale(1.3);"></td>
        <td class="text-center bg-secondary bg-opacity-10"><input type="radio" name="asis_${e.dni}" value="J" style="transform: scale(1.3);"></td>
        <td><span class="badge bg-${color}">${p}%</span></td></tr>`;
    });
    return html + `</tbody></table></div><button class="btn btn-success btn-lg w-100 mt-3" onclick="guardarAsistenciaDocente()">💾 Guardar Asistencia</button>`;
}

function renderTablaNotasDocente(est) {
    let html = `<div class="table-responsive"><table class="table table-bordered align-middle"><thead class="table-dark"><tr class="text-center"><th rowspan="2">Estudiante</th><th colspan="2" class="bg-info">1er C.</th><th colspan="2" class="bg-warning">2do C.</th><th rowspan="2" class="bg-success">Final</th><th rowspan="2">Def.</th></tr><tr class="text-center"><th>Nota</th><th>Int.</th><th>Nota</th><th>Int.</th></tr></thead><tbody>`;
    est.forEach(e => {
        const n = e.notas;
        html += `<tr><td class="fw-bold">${e.nombre}</td>
        <td><input type="number" step="0.1" class="form-control form-control-sm text-center nota-input" data-dni="${e.dni}" data-campo="nota1_C1" value="${n.nota1_C1 || ''}"></td>
        <td><input type="number" step="0.1" class="form-control form-control-sm text-center nota-input" data-dni="${e.dni}" data-campo="intensificacion1" value="${n.intensificacion1 || ''}"></td>
        <td><input type="number" step="0.1" class="form-control form-control-sm text-center nota-input" data-dni="${e.dni}" data-campo="nota1_C2" value="${n.nota1_C2 || ''}"></td>
        <td><input type="number" step="0.1" class="form-control form-control-sm text-center nota-input" data-dni="${e.dni}" data-campo="intensificacion2" value="${n.intensificacion2 || ''}"></td>
        <td class="text-center bg-success-subtle fw-bold"><span id="nota_final_${e.dni}">${n.nota_final || '0.0'}</span></td>
        <td><input type="number" step="0.1" class="form-control form-control-sm text-center nota-input fw-bold" data-dni="${e.dni}" data-campo="nota_definitiva" value="${n.nota_definitiva || ''}"></td>
        </tr>`;
    });
    return html + `</tbody></table></div><div class="row mt-3"><div class="col-6"><button class="btn btn-secondary w-100" onclick="calcularNotasAutomaticamente()">🔄 Calcular</button></div><div class="col-6"><button class="btn btn-primary w-100" onclick="guardarNotasDocente()">💾 Guardar Notas</button></div></div>`;
}

function renderResumenDocente(est) {
    const aprobados = est.filter(e => (parseFloat(e.notas.nota_final) || 0) >= 6).length;
    return `<div class="row text-center"><div class="col-md-4"><div class="card shadow-sm"><div class="card-body"><h1>${est.length}</h1><p>Alumnos</p></div></div></div>
            <div class="col-md-4"><div class="card shadow-sm border-success"><div class="card-body"><h1>${aprobados}</h1><p>Aprobados</p></div></div></div>
            <div class="col-md-4"><div class="card shadow-sm border-danger"><div class="card-body"><h1>${est.length - aprobados}</h1><p>Desaprobados</p></div></div></div></div>`;
}

async function guardarAsistenciaDocente() {
    if (!window.cursoActualDocente) return;
    const inputs = document.querySelectorAll('input[type="radio"]:checked');
    let lista = []; inputs.forEach(i => lista.push({ dni: i.name.split('_')[1], estado: i.value }));
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'guardarAsistenciaDocente', dniDocente: usuarioActual.dni, idMateria: window.cursoActualDocente.idMateria, asistencia: lista }) });
        alert('✅ Guardado');
        abrirCursoDocente(window.cursoActualDocente.curso, window.cursoActualDocente.idMateria, window.cursoActualDocente.nombreMateria);
    } catch (e) { alert('Error.'); }
}

async function guardarNotasDocente() {
    if (!window.cursoActualDocente) return;
    const notas = window.cursoActualDocente.estudiantes.map(e => ({
        dni: e.dni,
        nota1_C1: document.querySelector(`input[data-dni="${e.dni}"][data-campo="nota1_C1"]`)?.value || '',
        intensificacion1: document.querySelector(`input[data-dni="${e.dni}"][data-campo="intensificacion1"]`)?.value || '',
        nota1_C2: document.querySelector(`input[data-dni="${e.dni}"][data-campo="nota1_C2"]`)?.value || '',
        intensificacion2: document.querySelector(`input[data-dni="${e.dni}"][data-campo="intensificacion2"]`)?.value || '',
        nota_definitiva: document.querySelector(`input[data-dni="${e.dni}"][data-campo="nota_definitiva"]`)?.value || ''
    }));
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'guardarNotasMasivo', idMateria: window.cursoActualDocente.idMateria, nombreDocente: usuarioActual.nombre, notas: notas }) });
        alert('✅ Notas guardadas');
    } catch (e) { alert('Error.'); }
}

document.addEventListener('input', function(e) {
    if (e.target.classList.contains('nota-input')) {
        const dni = e.target.dataset.dni;
        const n1 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="nota1_C1"]`)?.value) || 0;
        const i1 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="intensificacion1"]`)?.value) || 0;
        const n2 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="nota1_C2"]`)?.value) || 0;
        const i2 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="intensificacion2"]`)?.value) || 0;
        const final = ((i1 > n1 ? i1 : n1) + (i2 > n2 ? i2 : n2)) / 2;
        const el = document.getElementById(`nota_final_${dni}`);
        if(el) el.textContent = final.toFixed(1);
    }
});

function calcularNotasAutomaticamente() {
    alert('El cálculo ya es automático al escribir. Revisa los valores finales.');
}

async function contactarPreceptor() {
    try {
        const resp = await fetch(`${URL_API}?op=getPreceptores&rol=Docente`);
        const json = await resp.json();
        let html = '<ul class="list-group">';
        json.data.forEach(p => html += `<li class="list-group-item">${p.nombre} (${p.email}) <a href="mailto:${p.email}" class="btn btn-sm btn-primary float-end">✉️</a></li>`);
        html += '</ul>';
        const modal = new bootstrap.Modal(document.createElement('div')); 
        modal._element.innerHTML = `<div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Preceptores</h5></div><div class="modal-body">${html}</div></div></div>`;
        modal.show();
    } catch(e) { alert('Error.'); }
}

function verMisDatosDocente() {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="card shadow-sm p-4"><h3>👤 ${usuarioActual.nombre}</h3><p>Rol: ${usuarioActual.rol}</p><button class="btn btn-secondary" onclick="iniciarModuloDocente()">Volver</button></div>`;
}
