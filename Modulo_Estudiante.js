// ============================================================================
// ARCHIVO: Modulo_Estudiante.js
// ============================================================================

let datosEstudianteCache = []; 
let faltasTotalesCache = 0; // Variable para guardar las faltas

async function iniciarModuloEstudiante() {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Cargando información académica...</p></div>';

    try {
        // 1. Pedimos las MATERIAS
        const respMaterias = await fetch(`${URL_API}?op=getDatosEstudiante&rol=Estudiante&dni=${usuarioActual.dni}`);        
        const jsonMaterias = await respMaterias.json();

        // 2. Pedimos el PERFIL (para sacar el total de faltas institucionales)
        const respPerfil = await fetch(`${URL_API}?op=getPerfilEstudiante&rol=Estudiante&dni=${usuarioActual.dni}`);
        const jsonPerfil = await respPerfil.json();

        if (jsonMaterias.status !== 'success') throw new Error(jsonMaterias.message);

        datosEstudianteCache = jsonMaterias.data; 
        
        // Guardamos las faltas si existen, sino 0
        if (jsonPerfil.status === 'success') {
            faltasTotalesCache = jsonPerfil.data.faltasInstitucionales || 0;
        }

        renderizarGridMaterias(datosEstudianteCache);

    } catch (e) {
        console.error(e);
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar datos: ${e.message}</div>`;
    }
}

function renderizarGridMaterias(materias) {
    const contenedor = document.getElementById('contenido-dinamico');
    
    // --- BLOQUE DE FALTAS (Color Cremita) ---
    // Lo ponemos al principio
    let htmlFaltas = `
        <div class="alert alert-warning text-center shadow-sm mb-4 border-warning">
            <h6 class="text-muted text-uppercase small fw-bold mb-1">Inasistencias Institucionales</h6>
            <h1 class="display-4 fw-bold text-dark mb-0">${faltasTotalesCache}</h1>
            <small class="text-muted">Registro de Preceptoría</small>
        </div>
    `;

    if (!materias || materias.length === 0) {
        contenedor.innerHTML = htmlFaltas + `
            <h4 class="mb-4">📚 Mis Materias</h4>
            <div class="alert alert-info">No tienes materias asignadas todavía.</div>`;
        return;
    }

    let html = htmlFaltas + `
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h4>📚 Mis Materias</h4>
        <span class="badge bg-primary rounded-pill">${materias.length} Asignaturas</span>
    </div>
    <div class="row g-3">`;

    materias.forEach(mat => {
        let badgeColor = 'bg-secondary';
        let textoEstado = mat.estado || 'Regular';

        if (textoEstado.toLowerCase().includes('recursa')) badgeColor = 'bg-danger';      
        else if (textoEstado.toLowerCase().includes('intensifica')) badgeColor = 'bg-warning text-dark'; 
        else if (textoEstado.toLowerCase().includes('cursa')) badgeColor = 'bg-success';  

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
                            <small class="d-block text-muted" style="font-size:0.75rem">Faltas Mat.</small>
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
    
    let htmlNotas = '';
    
    if (materia.notas && materia.notas.length > 0) {
        htmlNotas = `<ul class="list-group list-group-flush shadow-sm rounded mb-3">`;
        materia.notas.forEach(n => {
            let colorNota = 'text-dark';
            let valorNum = parseFloat(n.valor);
            if (!isNaN(valorNum)) {
                if (valorNum >= 7) colorNota = 'text-success fw-bold';
                else if (valorNum >= 4) colorNota = 'text-warning fw-bold';
                else colorNota = 'text-danger fw-bold';
            }
            htmlNotas += `
                <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                    <span class="text-muted">${n.instancia}</span>
                    <span class="fs-5 ${colorNota}">${n.valor}</span>
                </li>`;
        });
        htmlNotas += `</ul>`;
    } else {
        htmlNotas = `
            <div class="alert alert-light border text-center py-4">
                <p class="mb-0 text-muted fst-italic">Aún no hay notas cargadas para esta materia.</p>
            </div>`;
    }

    contenedor.innerHTML = `
        <button class="btn btn-outline-secondary mb-3" onclick="renderizarGridMaterias(datosEstudianteCache)">
            ⬅ Volver
        </button>

        <div class="card shadow border-0">
            <div class="card-header bg-primary text-white py-3">
                <h3 class="mb-0 text-white">${materia.materia}</h3>
                <span class="badge bg-white text-primary mt-2">${materia.estado}</span>
            </div>
            
            <div class="card-body">
                <div class="row">
                    <div class="col-md-7 mb-4">
                        <h5 class="border-bottom pb-2 mb-3 text-primary">📊 Calificaciones</h5>
                        ${htmlNotas}
                    </div>
                    <div class="col-md-5">
                        <div class="card bg-light border-0 mb-3">
                            <div class="card-body">
                                <h6 class="text-muted text-uppercase small fw-bold">Docente a cargo</h6>
                                <p class="fs-5 fw-bold mb-0 text-dark">👨‍🏫 ${materia.profesor || 'Sin asignar'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function verMisDatosEstudiante() {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Cargando perfil...</p></div>';

    try {
        const resp = await fetch(`${URL_API}?op=getPerfilEstudiante&rol=Estudiante&dni=${usuarioActual.dni}`);
        const json = await resp.json();

        if (json.status !== 'success') throw new Error(json.message);
        const d = json.data;

        // --- YA NO MOSTRAMOS LAS FALTAS AQUÍ ---
        contenedor.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card shadow border-0">
                        <div class="card-header bg-primary text-white text-center py-4">
                            <div class="display-1 mb-2">👤</div>
                            <h3 class="mb-0">${d.nombre}</h3>
                            <span class="badge bg-white text-primary mt-2 fs-6">${d.curso}</span>
                        </div>
                        <div class="card-body p-4">
                            <h5 class="text-primary border-bottom pb-2 mb-3">📄 Información Personal</h5>
                            <div class="row mb-2">
                                <div class="col-4 text-muted fw-bold text-end">DNI:</div>
                                <div class="col-8 fw-bold">${d.dni}</div>
                            </div>
                            <div class="row mb-4">
                                <div class="col-4 text-muted fw-bold text-end">Nacimiento:</div>
                                <div class="col-8">${d.nacimiento || '-'}</div>
                            </div>

                            <h5 class="text-primary border-bottom pb-2 mb-3">👨‍👩‍👦 Responsable a Cargo</h5>
                            <div class="row mb-2">
                                <div class="col-4 text-muted fw-bold text-end">Nombre:</div>
                                <div class="col-8">${d.adultoNombre || '-'}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-4 text-muted fw-bold text-end">Email:</div>
                                <div class="col-8"><a href="mailto:${d.adultoEmail}">${d.adultoEmail || '-'}</a></div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-4 text-muted fw-bold text-end">Celular:</div>
                                <div class="col-8">${d.adultoCelular || '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    } catch (e) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar perfil: ${e.message}</div>`;
    }
}
