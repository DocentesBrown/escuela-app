// ============================================================================
// ARCHIVO: Modulo_Estudiante.js
// ============================================================================

let datosEstudianteCache = []; // Para no volver a pedir datos al servidor al entrar/salir de detalles

async function iniciarModuloEstudiante() {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Cargando tus materias...</p></div>';

    try {
        // Solicitamos los datos al Backend usando el DNI del usuario logueado
        // IMPORTANTE: Tu Google Apps Script debe manejar la operación "getDatosEstudiante"
        const resp = await fetch(`${URL_API}?op=getDatosEstudiante&rol=Estudiante&dni=${usuarioActual.dni}`);        
        const json = await resp.json();

        if (json.status !== 'success') throw new Error(json.message);

        datosEstudianteCache = json.data; // Guardamos en memoria
        renderizarGridMaterias(datosEstudianteCache);

    } catch (e) {
        console.error(e);
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar datos: ${e.message}</div>`;
    }
}

function renderizarGridMaterias(materias) {
    const contenedor = document.getElementById('contenido-dinamico');
    
    if (!materias || materias.length === 0) {
        contenedor.innerHTML = `
            <h4 class="mb-4">📚 Mis Materias</h4>
            <div class="alert alert-info">No tienes materias asignadas todavía.</div>`;
        return;
    }

    let html = `
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h4>📚 Mis Materias</h4>
        <span class="badge bg-primary rounded-pill">${materias.length} Asignaturas</span>
    </div>
    <div class="row g-3">`;

    materias.forEach(mat => {
        // Lógica de colores según el Estado
        let badgeColor = 'bg-secondary';
        let textoEstado = mat.estado || 'Regular';

        // Detectamos palabras clave para colorear
        if (textoEstado.toLowerCase().includes('recursa')) badgeColor = 'bg-danger';      // Rojo para recursantes
        else if (textoEstado.toLowerCase().includes('intensifica')) badgeColor = 'bg-warning text-dark'; // Amarillo para intensificación
        else if (textoEstado.toLowerCase().includes('cursa')) badgeColor = 'bg-success';  // Verde para cursada normal

        html += `
        <div class="col-md-4 col-sm-6">
            <div class="card shadow-sm h-100 border-start border-4 border-primary" 
                 onclick="verDetalleMateria('${mat.id}')" 
                 style="cursor:pointer; transition: transform 0.2s;" 
                 onmouseover="this.style.transform='scale(1.02)'" 
                 onmouseout="this.style.transform='scale(1)'">
                
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title fw-bold text-dark mb-0 text-truncate" style="max-width: 70%;">${mat.materia}</h5>
                        <span class="badge ${badgeColor}">${textoEstado}</span>
                    </div>
                    
                    <p class="card-text text-muted small mb-3">👨‍🏫 ${mat.profesor || 'Docente a designar'}</p>
                    
                    <div class="d-flex justify-content-between align-items-center bg-light p-2 rounded">
                        <div class="text-center">
                            <small class="d-block text-muted" style="font-size:0.75rem">Promedio</small>
                            <span class="fw-bold ${mat.promedio && mat.promedio >= 7 ? 'text-success' : 'text-dark'}">${mat.promedio || '-'}</span>
                        </div>
                        <div class="text-center border-start ps-3">
                            <small class="d-block text-muted" style="font-size:0.75rem">Faltas</small>
                            <span class="fw-bold ${mat.faltas > 10 ? 'text-danger' : 'text-dark'}">${mat.faltas || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });

    html += '</div>';
    contenedor.innerHTML = html;
}

function verDetalleMateria(id) {
    const materia = datosEstudianteCache.find(m => m.id == id);
    if (!materia) return;

    const contenedor = document.getElementById('contenido-dinamico');
    
    // Generamos la lista de notas HTML
    let listaNotas = '';
    if (materia.notas && materia.notas.length > 0) {
        materia.notas.forEach(n => {
            listaNotas += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${n.instancia}</span> <span class="badge bg-primary rounded-pill" style="font-size: 1em;">${n.valor}</span>
                </li>`;
        });
    } else {
        listaNotas = `<li class="list-group-item text-muted fst-italic">No hay notas registradas aún.</li>`;
    }

    // Renderizamos la vista de detalle
    contenedor.innerHTML = `
        <button class="btn btn-outline-secondary mb-3" onclick="renderizarGridMaterias(datosEstudianteCache)">
            ⬅ Volver a Materias
        </button>

        <div class="card shadow border-0">
            <div class="card-header bg-primary text-white py-3">
                <h3 class="mb-0">${materia.materia}</h3>
                <span class="opacity-75">Profesor: ${materia.profesor || 'Sin asignar'}</span>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-7 mb-4">
                        <h5 class="border-bottom pb-2 mb-3">📊 Calificaciones</h5>
                        <ul class="list-group list-group-flush shadow-sm rounded">
                            ${listaNotas}
                        </ul>
                        <div class="mt-3 text-end">
                            <span class="fs-5 text-muted">Promedio General: </span>
                            <span class="fs-4 fw-bold">${materia.promedio || '-'}</span>
                        </div>
                    </div>

                    <div class="col-md-5">
                        <h5 class="border-bottom pb-2 mb-3">📅 Situación de Asistencia</h5>
                        <div class="card bg-light border-0 text-center py-4">
                            <h1 class="display-1 fw-bold ${materia.faltas > 15 ? 'text-danger' : 'text-dark'}">${materia.faltas || 0}</h1>
                            <p class="text-muted text-uppercase fw-bold ls-1">Faltas Injustificadas</p>
                            <small class="text-muted px-3">Recuerda justificar tus inasistencias dentro de las 48hs.</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
