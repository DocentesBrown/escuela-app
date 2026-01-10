// ============================================================================
// ARCHIVO: script.js (FUSIÓN: DIRECTIVOS INTACTO + PRECEPTOR MEJORADO)
// ============================================================================

// --- TU URL DE GOOGLE APPS SCRIPT ---
const URL_API = "https://script.google.com/macros/s/AKfycbyTGnoS8hevr6k7pXE16p7KtcQxYrYP0yc11yJoJyvfX8Z7pEKJ5ZYymJ--IBcoVqUB/exec"; 

// --- VARIABLES GLOBALES ---
let usuarioActual = null;
let baseDatosAlumnos = []; 
let baseDatosDocentes = []; 

// ==========================================
// 1. SISTEMA DE LOGIN Y DASHBOARD
// ==========================================

async function iniciarSesion() {
    const email = document.getElementById('email').value;
    const clave = document.getElementById('clave').value;
    const btn = document.getElementById('btn-login');
    const errorMsg = document.getElementById('error-msg');
    
    btn.innerText = "Verificando...";
    btn.disabled = true;
    errorMsg.classList.add('d-none');

    try {
        const resp = await fetch(`${URL_API}?op=login&email=${email}&pass=${clave}`);
        const data = await resp.json();

        if (data.status === 'success') {
            usuarioActual = data;
            cargarDashboard(data);
        } else {
            errorMsg.innerText = data.message;
            errorMsg.classList.remove('d-none');
        }
    } catch (e) {
        console.error(e);
        errorMsg.innerText = "Error de conexión con el servidor.";
        errorMsg.classList.remove('d-none');
    } finally {
        btn.innerText = "Ingresar";
        btn.disabled = false;
    }
}

function cargarDashboard(user) {
    document.getElementById('login-screen').classList.add('d-none');
    document.getElementById('dashboard-screen').classList.remove('d-none');
    document.getElementById('user-name').innerText = `${user.nombre} (${user.rol})`;

    const menu = document.getElementById('menu-lateral');
    menu.innerHTML = '';
    const rol = String(user.rol).trim().toLowerCase(); 

    // --- MENÚ DIRECTIVO ---
    if (rol === 'directivo') {
        menu.innerHTML += `
            <button class="list-group-item list-group-item-action" onclick="verEstudiantes()">👥 Gestión Estudiantes</button>
            <button class="list-group-item list-group-item-action" onclick="verDocentes()">🎓 Gestión Docentes</button>
            <button class="list-group-item list-group-item-action" onclick="verPreceptores()">👨‍🏫 Gestión Preceptores</button>
        `;
        iniciarModuloDirectivo();
    }

    // --- MENÚ PRECEPTOR ---
    if (rol === 'preceptor') {
        menu.innerHTML += `
            <button class="list-group-item list-group-item-action" onclick="iniciarModuloPreceptor()">📝 Tomar Asistencia</button>
            <button class="list-group-item list-group-item-action bg-info text-white" onclick="verContactosDocentes()">📞 Contactar Docentes</button>
        `;
        iniciarModuloPreceptor(); 
    }

    // --- NUEVO: MENÚ DOCENTE ---
    if (rol === 'docente') {
        menu.innerHTML += `
            <button class="list-group-item list-group-item-action bg-primary text-white" onclick="iniciarModuloDocente()">🏫 Mis Cursos</button>
            <button class="list-group-item list-group-item-action" onclick="verMisDatosDocente()">👤 Mis Datos</button>
        `;
        iniciarModuloDocente();
    }

    // --- BOTÓN SALIR ---
    menu.innerHTML += `<button class="list-group-item list-group-item-action text-danger mt-3" onclick="location.reload()">Cerrar Sesión</button>`;
}

// ==========================================
// 2. MÓDULO DIRECTIVO: ESTUDIANTES (CÓDIGO ORIGINAL INTACTO)
// ==========================================

async function verEstudiantes() {
    document.getElementById('contenido-dinamico').innerHTML = '<div class="spinner-border text-primary"></div> Cargando Estudiantes...';
    
    try {
        const resp = await fetch(`${URL_API}?op=getEstudiantes&rol=Directivo`);
        const json = await resp.json();
        baseDatosAlumnos = json.data;

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>Gestión de Estudiantes</h5>
                <button onclick="abrirModalEstudiante()" class="btn btn-success">+ Nuevo Estudiante</button>
            </div>
            
            <!-- BUSCADOR DE ESTUDIANTES -->
            <div class="card mb-3 shadow-sm">
                <div class="card-body">
                    <div class="row g-2">
                        <div class="col-md-8">
                            <div class="input-group">
                                <span class="input-group-text">🔍</span>
                                <input type="text" 
                                       class="form-control" 
                                       id="buscadorEstudiantes" 
                                       placeholder="Buscar por nombre, DNI, curso, email..." 
                                       onkeyup="filtrarEstudiantes()">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <select class="form-select" id="filtroEstudiantes" onchange="filtrarEstudiantes()">
                                <option value="todos">Todos los campos</option>
                                <option value="nombre">Nombre</option>
                                <option value="dni">DNI</option>
                                <option value="curso">Curso</option>
                                <option value="email">Email</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-2 text-muted small">
                        <span id="contadorEstudiantes">${json.data.length} estudiantes encontrados</span>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive bg-white rounded shadow-sm" style="max-height: 600px; overflow-y: auto;">
                <table class="table table-hover table-bordered mb-0 align-middle" id="tablaEstudiantes">
                    <thead class="table-dark text-center" style="position: sticky; top: 0;">
                        <tr>
                            <th>DNI</th>
                            <th>Nombre</th>
                            <th>Edad</th>
                            <th>Curso</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyEstudiantes">`;
        
        json.data.forEach((fila, index) => {
            const edad = calcularEdad(fila[6]);
            html += `
                <tr class="fila-estudiante" data-dni="${fila[0]}" data-nombre="${fila[1].toLowerCase()}" data-curso="${fila[2]}" data-email="${fila[3]}">
                    <td>${fila[0]}</td>
                    <td>${fila[1]}</td>
                    <td class="text-center fw-bold text-primary">${edad}</td>
                    <td class="text-center"><span class="badge bg-secondary">${fila[2]}</span></td>
                    <td class="text-center" style="width: 180px;">
                        <button class="btn btn-sm btn-outline-success me-1" onclick="abrirModalInscripcion(${index})" title="Inscribir Materias">📋</button>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editarEstudiante(${index})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="borrarEstudiante('${fila[0]}', '${fila[3]}')" title="Borrar">🗑️</button>
                    </td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
        
        html += renderModalHTML(); 
        html += renderModalInscripcionHTML();
        
        document.getElementById('contenido-dinamico').innerHTML = html;
    } catch (e) {
        console.error(e);
        alert("Error al cargar la lista de estudiantes.");
    }
}


// --- LÓGICA DE INSCRIPCIÓN ---

async function abrirModalInscripcion(index) {
    const est = baseDatosAlumnos[index]; 
    const dni = est[0];
    const nombre = est[1];
    
    document.getElementById('ins_dni_est').value = dni;
    document.getElementById('ins_nombre_est').value = nombre;
    document.getElementById('tituloInscripcion').innerText = `Inscripción: ${nombre}`;

    const modal = new bootstrap.Modal(document.getElementById('modalInscripcion'));
    modal.show();
    
    const container = document.getElementById('gridMaterias');
    container.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-success"></div><br>Cargando materias y datos previos...</div>';

    try {
        const respMat = await fetch(`${URL_API}?op=getMaterias&rol=Directivo`);
        const jsonMat = await respMat.json();
        
        let opciones = `<option value="">-- Seleccionar --</option>`;
        jsonMat.data.forEach(m => {
            // Value incluye el Curso para guardarlo en Listado
            opciones += `<option value="${m[1]} (${m[3]})">${m[1]} (${m[3]})</option>`;
        });

        // FORMULARIO: 12 Regulares + 4 Intensificaciones
        let htmlForm = `<h6 class="bg-light p-2 border border-start-0 border-end-0">Materias Regulares (Ciclo Lectivo)</h6>
                        <div class="row g-2 mb-3">`;
        
        for(let i=1; i<=12; i++) {
            htmlForm += `
                <div class="col-md-6 d-flex align-items-center mb-1">
                    <span class="me-2 fw-bold text-muted small" style="width:20px">${i}.</span>
                    <select id="materia_${i}" class="form-select form-select-sm me-1">${opciones}</select>
                    <select id="estado_${i}" class="form-select form-select-sm" style="width:100px">
                        <option value="Cursa">Cursa</option>
                        <option value="Recursa">Recursa</option>
                    </select>
                </div>`;
        }
        htmlForm += `</div>
                     <h6 class="bg-warning bg-opacity-25 p-2 border border-start-0 border-end-0">Intensificaciones (Previas/Pendientes)</h6>
                     <div class="alert alert-warning py-1 px-2 small mb-2"><small>Selecciona: <b>Materia Adeudada</b> -> <b>En cuál intensifica</b></small></div>
                     <div class="row g-2">`;
        
        for(let j=1; j<=4; j++) {
            htmlForm += `
                <div class="col-12 d-flex align-items-center mb-1">
                    <span class="me-2 fw-bold text-muted small" style="width:20px">${j}.</span>
                    <select id="int_adeuda_${j}" class="form-select form-select-sm me-1" title="Materia que intensifica (Adeudada)">${opciones}</select>
                    <span class="small fw-bold text-muted mx-1">en</span>
                    <select id="int_en_${j}" class="form-select form-select-sm" title="Materia donde intensifica">${opciones}</select>
                </div>`;
        }
        htmlForm += `</div>`;
        container.innerHTML = htmlForm;

        // Cargar datos previos
        const respIns = await fetch(`${URL_API}?op=getInscripcion&rol=Directivo&dni=${dni}`);
        const jsonIns = await respIns.json();

        if(jsonIns.status === 'success') {
            const data = jsonIns.data; 
            for(let i=1; i<=12; i++) {
                const valor = data[i+1];
                if(valor && valor.includes(' - ')) {
                    const partes = valor.split(' - ');
                    document.getElementById(`materia_${i}`).value = partes[0];
                    document.getElementById(`estado_${i}`).value = partes[1];
                }
            }
            for(let j=1; j<=4; j++) {
                const valor = data[13+j];
                if(valor && valor.includes(' -> ')) {
                    const partes = valor.split(' -> ');
                    document.getElementById(`int_adeuda_${j}`).value = partes[0];
                    document.getElementById(`int_en_${j}`).value = partes[1];
                }
            }
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="alert alert-danger">Error cargando formulario.</div>';
    }
}

async function guardarInscripcion() {
    const btn = document.getElementById('btnGuardarIns');
    btn.disabled = true; btn.innerText = "Guardando...";

    const datos = {
        op: 'guardarInscripcion',
        dni: document.getElementById('ins_dni_est').value,
        nombre: document.getElementById('ins_nombre_est').value
    };

    for(let i=1; i<=12; i++) {
        const mat = document.getElementById(`materia_${i}`).value;
        const est = document.getElementById(`estado_${i}`).value;
        datos[`m${i}`] = mat ? `${mat} - ${est}` : ""; 
    }
    for(let j=1; j<=4; j++) {
        const adeuda = document.getElementById(`int_adeuda_${j}`).value;
        const en = document.getElementById(`int_en_${j}`).value;
        if(adeuda && en) datos[`i${j}`] = `${adeuda} -> ${en}`; else datos[`i${j}`] = "";
    }

    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        bootstrap.Modal.getInstance(document.getElementById('modalInscripcion')).hide();
        alert("¡Inscripción guardada correctamente en la hoja 'Listado'!");
    } catch (e) {
        alert("Error al guardar.");
    } finally {
        btn.disabled = false; btn.innerText = "Guardar Cambios";
    }
}

// --- CRUD DE ESTUDIANTES ---

function abrirModalEstudiante() {
    document.getElementById('modalTitle').innerText = "Nuevo Estudiante";
    document.getElementById('formEstudiante').reset();
    document.getElementById('accion_form').value = "crear";
    document.getElementById('inp_dni').disabled = false;
    document.getElementById('inp_email').disabled = false; 
    new bootstrap.Modal(document.getElementById('modalEstudiante')).show();
}

function editarEstudiante(index) {
    const est = baseDatosAlumnos[index];
    document.getElementById('modalTitle').innerText = "Editar Estudiante";
    document.getElementById('accion_form').value = "editar";
    document.getElementById('dni_original').value = est[0];
    document.getElementById('email_original').value = est[3];

    document.getElementById('inp_dni').value = est[0];
    document.getElementById('inp_nombre').value = est[1];
    document.getElementById('inp_curso').value = est[2];
    document.getElementById('inp_email').value = est[3];
    document.getElementById('inp_adulto').value = est[4];
    document.getElementById('inp_tel').value = est[5];
    if(est[6]) document.getElementById('inp_nacimiento').value = new Date(est[6]).toISOString().split('T')[0];
    
    new bootstrap.Modal(document.getElementById('modalEstudiante')).show();
}

// ==========================================
// FILTRADO DE ESTUDIANTES
// ==========================================

function filtrarEstudiantes() {
    const busqueda = document.getElementById('buscadorEstudiantes').value.toLowerCase();
    const filtro = document.getElementById('filtroEstudiantes').value;
    const filas = document.querySelectorAll('#tbodyEstudiantes tr.fila-estudiante');
    let contador = 0;
    
    filas.forEach(fila => {
        let mostrar = false;
        
        if (!busqueda) {
            mostrar = true;
        } else {
            switch(filtro) {
                case 'nombre':
                    mostrar = fila.dataset.nombre.includes(busqueda);
                    break;
                case 'dni':
                    mostrar = fila.dataset.dni.includes(busqueda);
                    break;
                case 'curso':
                    mostrar = fila.dataset.curso.toLowerCase().includes(busqueda);
                    break;
                case 'email':
                    mostrar = fila.dataset.email.toLowerCase().includes(busqueda);
                    break;
                case 'todos':
                    mostrar = fila.dataset.nombre.includes(busqueda) || 
                              fila.dataset.dni.includes(busqueda) ||
                              fila.dataset.curso.toLowerCase().includes(busqueda) ||
                              fila.dataset.email.toLowerCase().includes(busqueda);
                    break;
            }
        }
        
        if (mostrar) {
            fila.style.display = '';
            contador++;
        } else {
            fila.style.display = 'none';
        }
    });
    
    document.getElementById('contadorEstudiantes').innerText = `${contador} estudiantes encontrados`;
}

async function guardarEstudiante() {
    const btn = document.getElementById('btnGuardarModal');
    btn.disabled = true; btn.innerText = "Guardando...";
    const datos = {
        op: 'administrarEstudiante',
        accion: document.getElementById('accion_form').value,
        dni: document.getElementById('inp_dni').value,
        nombre: document.getElementById('inp_nombre').value,
        curso: document.getElementById('inp_curso').value,
        email: document.getElementById('inp_email').value,
        adulto: document.getElementById('inp_adulto').value,
        telefono: document.getElementById('inp_tel').value,
        nacimiento: document.getElementById('inp_nacimiento').value,
        dniOriginal: document.getElementById('dni_original').value,
        emailOriginal: document.getElementById('email_original').value
    };
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        bootstrap.Modal.getInstance(document.getElementById('modalEstudiante')).hide();
        alert("Operación exitosa.");
        verEstudiantes(); 
    } catch (e) { alert("Error al guardar."); }
}

async function borrarEstudiante(dni, email) {
    if(!confirm(`¿Seguro que deseas eliminar al alumno con DNI ${dni}?`)) return;
    try { 
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'administrarEstudiante', accion: 'borrar', dni: dni, email: email }) });
        alert("Eliminado."); 
        verEstudiantes(); 
    } catch (e) { alert("Error al eliminar."); }
}

// ==========================================
// 3. MÓDULO DIRECTIVO: DOCENTES (CÓDIGO ORIGINAL INTACTO)
// ==========================================

async function verDocentes() {
    document.getElementById('contenido-dinamico').innerHTML = '<div class="spinner-border text-primary"></div> Cargando Docentes...';
    
    try {
        const resp = await fetch(`${URL_API}?op=getDocentes&rol=Directivo`);
        const json = await resp.json();
        baseDatosDocentes = json.data;

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>Gestión de Docentes</h5>
                <button onclick="abrirModalDocente()" class="btn btn-success">+ Nuevo Docente</button>
            </div>
            
            <!-- BUSCADOR DE DOCENTES -->
            <div class="card mb-3 shadow-sm">
                <div class="card-body">
                    <div class="row g-2">
                        <div class="col-md-8">
                            <div class="input-group">
                                <span class="input-group-text">🔍</span>
                                <input type="text" 
                                       class="form-control" 
                                       id="buscadorDocentes" 
                                       placeholder="Buscar por nombre, DNI, email, materias..." 
                                       onkeyup="filtrarDocentes()">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <select class="form-select" id="filtroDocentes" onchange="filtrarDocentes()">
                                <option value="todos">Todos los campos</option>
                                <option value="nombre">Nombre</option>
                                <option value="dni">DNI</option>
                                <option value="email">Email</option>
                                <option value="materias">Materias</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-2 text-muted small">
                        <span id="contadorDocentes">${json.data.length} docentes encontrados</span>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive bg-white rounded shadow-sm" style="max-height: 600px; overflow-y: auto;">
                <table class="table table-hover table-bordered mb-0 align-middle" id="tablaDocentes">
                    <thead class="table-dark text-center" style="position: sticky; top: 0;">
                        <tr>
                            <th>DNI</th>
                            <th>Nombre</th>
                            <th>Contacto</th>
                            <th>Materias Asignadas</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyDocentes">`;
        
        json.data.forEach((fila, index) => {
            // fila[0]=DNI, fila[1]=Nombre, fila[2]=Email_ABC, fila[3]=Celular, fila[4]=Materias
            let materiasHTML = fila[4] || '';
            
            if(materiasHTML.includes('[SUPLANTADO]')) {
                materiasHTML = materiasHTML.replace(/\[SUPLANTADO\]/g, 
                    '<span class="badge bg-danger me-1">[SUPLANTADO]</span>');
            }
            
            if(materiasHTML.includes('[Suplencia]')) {
                materiasHTML = materiasHTML.replace(/\[Suplencia\].*?\(Suplente de: (.*?)\)/g, 
                    '<span class="badge bg-warning text-dark me-1" title="Suplente de: $1">[Suplente]</span>');
            }
            
            html += `
                <tr class="fila-docente" 
                    data-dni="${fila[0]}" 
                    data-nombre="${fila[1].toLowerCase()}" 
                    data-email="${fila[2] || ''}" 
                    data-materias="${(fila[4] || '').toLowerCase()}">
                    <td>${fila[0]}</td>
                    <td class="fw-bold">${fila[1]}</td>
                    <td><small>${fila[2] || ''}<br>${fila[3] || ''}</small></td>
                    <td><small>${materiasHTML}</small></td>
                    <td class="text-center" style="width: 160px;">
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="abrirModalAsignacion(${index})" title="Asignar Materia">📚</button>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editarDocente(${index})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="borrarDocente('${fila[0]}', '${fila[2]}')" title="Borrar">🗑️</button>
                    </td>
                </tr>`;
        });
        
        html += `</tbody></table></div>`;
        
        html += renderModalDocenteHTML(); 
        html += renderModalAsignacionCompletaHTML();
        
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) { 
        console.error('Error cargando docentes:', e);
        alert("Error cargando docentes: " + e.message); 
    }
}

// --- ASIGNACIÓN DE MATERIAS ---

async function abrirModalAsignacion(index) {
    console.log('Abrir modal asignación llamado con índice:', index); // DEBUG
    
    const doc = baseDatosDocentes[index];
    console.log('Docente seleccionado:', doc); // DEBUG
    
    document.getElementById('asig_dni_docente').value = doc[0];
    document.getElementById('asig_nombre_docente').value = doc[1];
    document.getElementById('span_nombre_docente').innerText = doc[1];

    const select = document.getElementById('sel_materia_asig');
    const tipoSelect = document.getElementById('tipo_asignacion');
    
    select.innerHTML = '<option>Cargando materias...</option>';
    tipoSelect.innerHTML = `
        <option value="Titular" selected>Titular</option>
        <option value="Provisional">Provisional</option>
        <option value="Interino">Interino</option>
        <option value="Suplencia">Suplencia</option>
    `;
    
    // Configurar evento para mostrar/ocultar info de suplente
    tipoSelect.onchange = function() {
        console.log('Tipo de asignación cambiado a:', this.value); // DEBUG
        const suplenteInfoDiv = document.getElementById('suplente_info');
        if(this.value === 'Suplencia') {
            suplenteInfoDiv.classList.remove('d-none');
        } else {
            suplenteInfoDiv.classList.add('d-none');
        }
    };

    // Mostrar el modal
    const modalEl = document.getElementById('modalAsignacionCompleta');
    console.log('Elemento modal encontrado:', modalEl); // DEBUG
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    console.log('Modal mostrado'); // DEBUG

    try {
        const resp = await fetch(`${URL_API}?op=getMaterias&rol=Directivo`);
        const json = await resp.json();
        baseDatosMaterias = json.data;
        
        console.log('Materias cargadas:', baseDatosMaterias); // DEBUG
        
        let opts = `<option value="" selected disabled>Selecciona la materia...</option>`;
        
        json.data.forEach(mat => {
            // mat[0]=ID_Materia, mat[1]=Nombre, mat[2]=DNI_Docente, mat[3]=Curso, mat[4]=Nombre_Docente
            const nombreProfe = mat[4] ? mat[4].toString().trim() : "";
            
            let estilo = "color: #333;";
            let texto = `${mat[1]} (${mat[3]})`;
            
            if(nombreProfe) {
                texto += ` - ${nombreProfe}`;
                // Verificar si hay información de tipo de asignación
                if(mat[5] && mat[5] === 'Suplencia') {
                    estilo = "color: orange; font-weight: bold;";
                    const suplenteDe = mat[6] || "";
                    texto += ` [Suplente de: ${suplenteDe}]`;
                } else if(mat[5]) {
                    texto += ` [${mat[5]}]`;
                }
            } else {
                estilo = "color: red; font-weight: bold;";
                texto = `[VACANTE] ${mat[1]} (${mat[3]})`;
            }
            
            opts += `<option value="${mat[0]}" style="${estilo}">${texto}</option>`;
        });
        
        select.innerHTML = opts;
        console.log('Opciones de materias cargadas en select'); // DEBUG
        
    } catch (e) { 
        console.error('Error cargando materias:', e);
        select.innerHTML = '<option>Error al cargar materias</option>'; 
    }
}

async function guardarAsignacionCompleta() {
    console.log('Guardar asignación completa llamado'); // DEBUG
    
    const btn = document.getElementById('btnGuardarAsigCompleta');
    btn.disabled = true; 
    btn.innerText = "Asignando...";

    const datos = {
        op: 'asignarDocenteMateria',
        id_materia: document.getElementById('sel_materia_asig').value,
        dni_docente: document.getElementById('asig_dni_docente').value,
        nombre_docente: document.getElementById('asig_nombre_docente').value,
        tipoAsignacion: document.getElementById('tipo_asignacion').value
    };

    console.log('Datos a enviar:', datos); // DEBUG

    if(!datos.id_materia) { 
        alert("Selecciona una materia."); 
        btn.disabled = false; 
        btn.innerText = "Confirmar";
        return; 
    }

    try {
        const response = await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify(datos) 
        });
        const result = await response.json();
        
        console.log('Respuesta del servidor:', result); // DEBUG
        
        if(result.status === 'success') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalAsignacionCompleta'));
            modal.hide();
            alert(`✅ Materia asignada correctamente como ${datos.tipoAsignacion}.`);
            verDocentes(); // Refrescar la vista
        } else {
            throw new Error(result.message || 'Error en la asignación');
        }
    } catch (e) { 
        console.error('Error en asignación:', e);
        alert("Error al asignar: " + e.message); 
    } 
    finally { 
        btn.disabled = false; 
        btn.innerText = "Confirmar"; 
    }
}

// --- CRUD DOCENTE STANDARD ---

function abrirModalDocente() {
    document.getElementById('modalTitleDoc').innerText = "Nuevo Docente";
    document.getElementById('formDocente').reset();
    document.getElementById('accion_doc').value = "crear";
    new bootstrap.Modal(document.getElementById('modalDocente')).show();
}

function editarDocente(index) {
    const doc = baseDatosDocentes[index];
    document.getElementById('modalTitleDoc').innerText = "Editar Docente";
    document.getElementById('accion_doc').value = "editar";
    document.getElementById('doc_dni_orig').value = doc[0];
    document.getElementById('doc_email_orig').value = doc[2];
    document.getElementById('doc_dni').value = doc[0];
    document.getElementById('doc_nombre').value = doc[1];
    document.getElementById('doc_email').value = doc[2];
    document.getElementById('doc_cel').value = doc[3];
    new bootstrap.Modal(document.getElementById('modalDocente')).show();
}

// ==========================================
// FILTRADO DE DOCENTES
// ==========================================

function filtrarDocentes() {
    const busqueda = document.getElementById('buscadorDocentes').value.toLowerCase();
    const filtro = document.getElementById('filtroDocentes').value;
    const filas = document.querySelectorAll('#tbodyDocentes tr.fila-docente');
    let contador = 0;
    
    filas.forEach(fila => {
        let mostrar = false;
        
        if (!busqueda) {
            mostrar = true;
        } else {
            switch(filtro) {
                case 'nombre':
                    mostrar = fila.dataset.nombre.includes(busqueda);
                    break;
                case 'dni':
                    mostrar = fila.dataset.dni.includes(busqueda);
                    break;
                case 'email':
                    mostrar = fila.dataset.email.includes(busqueda);
                    break;
                case 'materias':
                    mostrar = fila.dataset.materias.includes(busqueda);
                    break;
                case 'todos':
                    mostrar = fila.dataset.nombre.includes(busqueda) || 
                              fila.dataset.dni.includes(busqueda) ||
                              fila.dataset.email.includes(busqueda) ||
                              fila.dataset.materias.includes(busqueda);
                    break;
            }
        }
        
        if (mostrar) {
            fila.style.display = '';
            contador++;
        } else {
            fila.style.display = 'none';
        }
    });
    
    document.getElementById('contadorDocentes').innerText = `${contador} docentes encontrados`;
}

async function guardarDocente() {
    const datos = {
        op: 'administrarDocente',
        accion: document.getElementById('accion_doc').value,
        dni: document.getElementById('doc_dni').value,
        nombre: document.getElementById('doc_nombre').value,
        email: document.getElementById('doc_email').value,
        celular: document.getElementById('doc_cel').value,
        dniOriginal: document.getElementById('doc_dni_orig').value,
        emailOriginal: document.getElementById('doc_email_orig').value
    };
    try { await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        bootstrap.Modal.getInstance(document.getElementById('modalDocente')).hide();
        verDocentes(); 
    } catch (e) { alert("Error al guardar."); }
}

async function borrarDocente(dni, email) {
    if(!confirm(`¿Eliminar docente?`)) return;
    try { await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'administrarDocente', accion: 'borrar', dni: dni, email: email }) });
        verDocentes(); } catch (e) { alert("Error."); }
}

// ==========================================
// 4. MÓDULO PRECEPTOR MEJORADO (CON FECHA Y E.F.)
// ==========================================

// ==========================================
// LÓGICA DEL PRECEPTOR (DASHBOARD MEJORADO)
// ==========================================

async function iniciarModuloPreceptor() {
    const contenedor = document.getElementById('contenido-dinamico');
    
    // Mostramos mensaje de bienvenida y spinner de carga
    contenedor.innerHTML = `
        <div class="mb-4">
            <h3>Hola, ${usuarioActual.nombre} 👋</h3>
            <p class="text-muted">Selecciona un curso para gestionar la asistencia.</p>
        </div>
        <div id="lista-cursos-preceptor" class="row g-3">
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">Cargando cursos disponibles...</p>
            </div>
        </div>
    `;

    try {
        // 1. Pedimos TODOS los cursos disponibles al sistema (usando el rol Preceptor)
        const resp = await fetch(`${URL_API}?op=getCursosDisponibles&rol=Preceptor`);
        const json = await resp.json();
        
        const divCursos = document.getElementById('lista-cursos-preceptor');
        divCursos.innerHTML = ''; // Limpiamos el spinner

        if (json.status === 'success' && json.data && json.data.length > 0) {
            
            // 2. Obtenemos los cursos asignados al usuario (vienen del Login actualizado)
            // Si usuarioActual.cursos es "1A, 2B", esto crea el array ['1A', '2B']
            const misCursosStr = usuarioActual.cursos || ""; 
            const misCursos = misCursosStr.split(',').map(c => c.trim());

            // 3. Separamos los cursos en dos grupos
            const cursosPropios = [];
            const otrosCursos = [];

            json.data.forEach(curso => {
                if (misCursos.includes(curso)) {
                    cursosPropios.push(curso);
                } else {
                    otrosCursos.push(curso);
                }
            });

            // 4. Renderizamos primero MIS CURSOS (Destacados en Azul)
            if (cursosPropios.length > 0) {
                divCursos.innerHTML += `
                    <div class="col-12 mt-2">
                        <h6 class="text-primary fw-bold border-bottom pb-2">
                            ⭐ Mis Cursos Asignados
                        </h6>
                    </div>`;
                
                cursosPropios.forEach(curso => {
                    divCursos.innerHTML += `
                        <div class="col-6 col-md-4 col-lg-3">
                            <button class="btn btn-primary w-100 py-4 shadow-sm fw-bold fs-5 position-relative" onclick="cargarAsistencia('${curso}')">
                                ${curso}
                                <span class="position-absolute top-0 start-100 translate-middle p-2 bg-warning border border-light rounded-circle">
                                    <span class="visually-hidden">Asignado</span>
                                </span>
                            </button>
                        </div>`;
                });
            }

            // 5. Renderizamos el RESTO de cursos (Secundarios en Gris)
            if (otrosCursos.length > 0) {
                // Si hay cursos propios, ponemos un separador visual
                if (cursosPropios.length > 0) {
                    divCursos.innerHTML += `
                        <div class="col-12 mt-5">
                            <h6 class="text-muted border-bottom pb-2">
                                📂 Otros Cursos del Colegio
                            </h6>
                        </div>`;
                }

                otrosCursos.forEach(curso => {
                    divCursos.innerHTML += `
                        <div class="col-6 col-md-4 col-lg-3">
                            <button class="btn btn-outline-secondary w-100 py-2" onclick="cargarAsistencia('${curso}')">
                                ${curso}
                            </button>
                        </div>`;
                });
            }

        } else {
            divCursos.innerHTML = '<div class="alert alert-warning">No se encontraron cursos en el sistema.</div>';
        }

    } catch (e) {
        console.error(e);
        document.getElementById('lista-cursos-preceptor').innerHTML = 
            `<div class="alert alert-danger">Error al cargar los cursos: ${e.message}</div>`;
    }
}

// Función auxiliar para el botón "Contactar Docentes" del menú
async function verContactosDocentes() {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = '<div class="spinner-border text-info"></div> Cargando directorio docente...';
    
    try {
        const resp = await fetch(`${URL_API}?op=getDocentes&rol=Preceptor`);
        const json = await resp.json();
        
        let html = `<h3>📞 Directorio Docente</h3>
                    <div class="table-responsive">
                    <table class="table table-striped">
                        <thead><tr><th>Nombre</th><th>Materia(s)</th><th>Email</th><th>Celular</th></tr></thead>
                        <tbody>`;
        
        // Asumiendo que getDocentes devuelve array de arrays [dni, nombre, email, celular, materias]
        json.data.forEach(d => {
            html += `<tr>
                        <td>${d[1]}</td>
                        <td><small>${d[4] || '-'}</small></td>
                        <td><a href="mailto:${d[2]}">${d[2]}</a></td>
                        <td><a href="https://wa.me/549${d[3]}" target="_blank">${d[3]}</a></td>
                     </tr>`;
        });
        
        html += '</tbody></table></div>';
        contenedor.innerHTML = html;
        
    } catch (e) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
}

function renderTablaPreceptor() {
    const curso = document.getElementById('selCurso').value;
    const lista = baseDatosAlumnos
                    .filter(obj => String(obj.data[2]) === curso)
                    .sort((a,b) => String(a.data[1]).localeCompare(b.data[1]));
    
    if(lista.length === 0) {
        document.getElementById('zonaPreceptor').innerHTML = '<div class="alert alert-warning">No hay alumnos en este curso.</div>';
        return;
    }

    let html = `<div class="card shadow-sm"><table class="table align-middle table-striped mb-0 text-center">
                <thead class="table-dark">
                    <tr>
                        <th class="text-start">Estudiante</th>
                        <th title="Faltas Acumuladas">F</th>
                        <th style="background:#d4edda; color:green;">P</th>
                        <th style="background:#f8d7da; color:red;">A</th>
                        <th style="background:#fff3cd; color:#856404;">T</th>
                        <th style="background:#e2e3e5; color:#383d41;">EF</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>`;
    
    lista.forEach(item => {
        const alu = item.data; 
        const st = item.stats; 
        
        let totalDisplay = parseFloat(st.total);
        // Si es decimal (ej 1.25), lo mostramos con decimales. Si es entero (1.00), sin decimales.
        let totalStr = Number.isInteger(totalDisplay) ? totalDisplay : totalDisplay.toFixed(2).replace('.00','');

        // Alerta de faltas > 10
        let alerta = "";
        if(st.total >= 10) {
            alerta = `<span class="badge bg-danger ms-2">⚠️ ${totalStr}</span>`;
        } else if(st.total > 0) {
            alerta = `<span class="badge bg-light text-dark border ms-2">${totalStr}</span>`;
        }

        html += `
            <tr>
                <td class="text-start fw-bold">
                    ${alu[1]} ${alerta}
                </td>
                <td><small>${totalStr}</small></td>
                
                <td style="background:#d4edda;">
                    <input type="radio" name="e_${alu[0]}" value="P" checked style="transform: scale(1.3); cursor: pointer;">
                </td>
                
                <td style="background:#f8d7da;">
                    <input type="radio" name="e_${alu[0]}" value="A" style="transform: scale(1.3); cursor: pointer;">
                </td>
                
                <td style="background:#fff3cd;">
                    <input type="radio" name="e_${alu[0]}" value="T" title="Tarde (0.25)" style="transform: scale(1.3); cursor: pointer;">
                </td>

                <td style="background:#e2e3e5;">
                    <input type="radio" name="e_${alu[0]}" value="EF" title="Educ. Física (0.5)" style="transform: scale(1.3); cursor: pointer;">
                </td>

                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="abrirModalJustificar('${alu[0]}', '${alu[1]}')" title="Ver Historial / Justificar">
                        ⚖️
                    </button>
                </td>
            </tr>`;
    });
    html += `</tbody></table>
             <div class="p-3 bg-light border-top">
                <button onclick="guardarAsis()" class="btn btn-success w-100 btn-lg shadow">✅ Guardar Asistencia</button>
             </div>
             </div>`;
    document.getElementById('zonaPreceptor').innerHTML = html;
}

async function guardarAsis() {
    const inputs = document.querySelectorAll('input[type="radio"]:checked');
    const fechaSeleccionada = document.getElementById('fechaAsistencia').value; // Capturamos la fecha
    
    if (!fechaSeleccionada) {
        alert("Por favor selecciona una fecha.");
        return;
    }

    let lista = [];
    inputs.forEach(inp => lista.push({ dni: inp.name.split('_')[1], estado: inp.value }));
    
    const btn = document.querySelector('#zonaPreceptor button');
    btn.innerText = "Guardando..."; btn.disabled = true;

    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ 
            op: 'guardarAsistenciaMasiva', 
            lista: lista, 
            preceptor: usuarioActual.nombre,
            fecha: fechaSeleccionada // Enviamos la fecha al backend
        })});
        alert(`¡Asistencia del ${fechaSeleccionada} guardada!`);
        iniciarModuloPreceptor();
    } catch(e) {
        alert("Error al guardar.");
        btn.innerText = "Reintentar"; btn.disabled = false;
    }
}

// --- NUEVA FUNCIÓN: CONTACTAR DOCENTES ---

async function verContactosDocentes() {
    document.getElementById('contenido-dinamico').innerHTML = '<div class="spinner-border text-info"></div> Cargando Directorio de Docentes...';
    
    try {
        const resp = await fetch(`${URL_API}?op=getDocentes&rol=Preceptor`);
        const json = await resp.json();
        
        if (json.status !== 'success') {
            document.getElementById('contenido-dinamico').innerHTML = '<p class="text-danger">No tienes permiso o hubo un error.</p>';
            return;
        }

        let html = `
            <h5 class="mb-3">📞 Directorio de Docentes</h5>
            
            <!-- BUSCADOR DE CONTACTOS -->
            <div class="card mb-3 shadow-sm">
                <div class="card-body">
                    <div class="row g-2">
                        <div class="col-md-8">
                            <div class="input-group">
                                <span class="input-group-text">🔍</span>
                                <input type="text" 
                                       class="form-control" 
                                       id="buscadorContactos" 
                                       placeholder="Buscar por nombre, email, teléfono..." 
                                       onkeyup="filtrarContactos()">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <select class="form-select" id="filtroContactos" onchange="filtrarContactos()">
                                <option value="todos">Todos los campos</option>
                                <option value="nombre">Nombre</option>
                                <option value="email">Email</option>
                                <option value="telefono">Teléfono</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-2 text-muted small">
                        <span id="contadorContactos">${json.data.length} docentes encontrados</span>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive bg-white rounded shadow-sm">
                <table class="table table-hover table-striped mb-0 align-middle" id="tablaContactos">
                    <thead class="table-dark">
                        <tr>
                            <th>Docente</th>
                            <th>Email</th>
                            <th>Contacto Rápido</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyContactos">`;
        
        json.data.forEach((d, index) => {
            // d[0]=dni, d[1]=nombre, d[2]=email, d[3]=celular
            let cel = d[3] ? d[3].toString().replace(/[^0-9]/g, '') : '';
            let btnWsp = '';
            
            if(cel.length > 6) {
                btnWsp = `<a href="https://wa.me/549${cel}" target="_blank" class="btn btn-success btn-sm text-white fw-bold">📱 WhatsApp</a>`;
            } else {
                btnWsp = `<span class="text-muted small">Sin celular</span>`;
            }

            html += `
                <tr class="fila-contacto" 
                    data-nombre="${d[1].toLowerCase()}" 
                    data-email="${d[2].toLowerCase()}" 
                    data-telefono="${cel}">
                    <td class="fw-bold">${d[1]}</td>
                    <td><a href="mailto:${d[2]}">${d[2]}</a></td>
                    <td>${btnWsp}</td>
                </tr>`;
        });
        
        html += `</tbody></table></div>`;
        document.getElementById('contenido-dinamico').innerHTML = html;

    } catch (e) {
        document.getElementById('contenido-dinamico').innerHTML = '<p class="text-danger">Error de conexión.</p>';
    }
}

// --- FUNCIONES DE JUSTIFICACIÓN (IGUAL QUE ANTES) ---

async function abrirModalJustificar(dni, nombre) {
    document.getElementById('just_nombre').innerText = nombre;
    document.getElementById('just_lista').innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div> Buscando faltas...</div>';
    
    const modalEl = document.getElementById('modalJustificar');
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) { modal = new bootstrap.Modal(modalEl); }
    modal.show();
    
    try {
        const resp = await fetch(`${URL_API}?op=getHistorialAlumno&rol=Preceptor&dni=${dni}`);
        const json = await resp.json();
        
        const contenedor = document.getElementById('just_lista');
        contenedor.innerHTML = "";

        if(json.data.length === 0) {
            contenedor.innerHTML = '<div class="alert alert-success">No tiene inasistencias injustificadas recientes.</div>';
            return;
        }

        let html = `<ul class="list-group">`;
        json.data.forEach(item => {
            let badge = '';
            if(item.estado === 'A') badge = '<span class="badge bg-danger">Ausente</span>';
            else if(item.estado === 'T') badge = '<span class="badge bg-warning text-dark">Tarde</span>';
            else if(item.estado === 'EF') badge = '<span class="badge bg-secondary">Ed. Física</span>';

            html += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${item.fecha}</strong> ${badge}
                    </div>
                    <button class="btn btn-sm btn-outline-success" onclick="confirmarJustificacion(${item.fila}, '${dni}')">
                        Justificar ✅
                    </button>
                </li>`;
        });
        html += `</ul>`;
        contenedor.innerHTML = html;

    } catch(e) {
        document.getElementById('just_lista').innerHTML = "Error al cargar historial.";
    }
}

async function confirmarJustificacion(fila, dni) {
    if(!confirm("¿Confirmas que esta falta está justificada?")) return;
    const contenedor = document.getElementById('just_lista');
    contenedor.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div><br>Guardando cambios...</div>';
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'justificarFalta', fila: fila })});
        const modalEl = document.getElementById('modalJustificar');
        const modal = bootstrap.Modal.getInstance(modalEl); 
        if(modal) { modal.hide(); }
        alert("¡Justificación guardada correctamente!");
        iniciarModuloPreceptor();
    } catch(e) {
        alert("Ocurrió un error al intentar justificar.");
        const modalEl = document.getElementById('modalJustificar');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();
    }
}

// ==========================================
// FILTRADO DE CONTACTOS
// ==========================================

function filtrarContactos() {
    const busqueda = document.getElementById('buscadorContactos').value.toLowerCase();
    const filtro = document.getElementById('filtroContactos').value;
    const filas = document.querySelectorAll('#tbodyContactos tr.fila-contacto');
    let contador = 0;
    
    filas.forEach(fila => {
        let mostrar = false;
        
        if (!busqueda) {
            mostrar = true;
        } else {
            switch(filtro) {
                case 'nombre':
                    mostrar = fila.dataset.nombre.includes(busqueda);
                    break;
                case 'email':
                    mostrar = fila.dataset.email.includes(busqueda);
                    break;
                case 'telefono':
                    mostrar = fila.dataset.telefono.includes(busqueda);
                    break;
                case 'todos':
                    mostrar = fila.dataset.nombre.includes(busqueda) || 
                              fila.dataset.email.includes(busqueda) ||
                              fila.dataset.telefono.includes(busqueda);
                    break;
            }
        }
        
        if (mostrar) {
            fila.style.display = '';
            contador++;
        } else {
            fila.style.display = 'none';
        }
    });
    
    document.getElementById('contadorContactos').innerText = `${contador} docentes encontrados`;
}

// ==========================================
// 5. UTILIDADES Y MODALES
// ==========================================

function calcularEdad(fechaString) {
    if (!fechaString) return "-";
    const hoy = new Date();
    const nacimiento = new Date(fechaString);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) { edad--; }
    return isNaN(edad) ? "-" : edad + " años";
}

function renderModalJustificacionHTML() {
    return `
    <div class="modal fade" id="modalJustificar" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">Justificar Inasistencias</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <h6 class="mb-3 text-center" id="just_nombre">Alumno</h6>
            <p class="small text-muted text-center">Faltas pendientes de justificación:</p>
            <div id="just_lista" style="max-height: 300px; overflow-y: auto;"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>`;
}

// Templates anteriores (Estudiante, Inscripción, Docente, Asignación) SE MANTIENEN IGUAL...
function renderModalInscripcionHTML() {
    return `
    <div class="modal fade" id="modalInscripcion" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title" id="tituloInscripcion">Inscripción</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="ins_dni_est"><input type="hidden" id="ins_nombre_est">
            <div id="gridMaterias"></div> 
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-success" id="btnGuardarIns" onclick="guardarInscripcion()">Guardar Cambios</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderModalHTML() {
    return `
    <div class="modal fade" id="modalEstudiante" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="modalTitle">Estudiante</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="formEstudiante">
                <input type="hidden" id="accion_form"><input type="hidden" id="dni_original"><input type="hidden" id="email_original">
                <div class="row">
                    <div class="col-md-6 mb-2"><label>DNI</label><input type="number" id="inp_dni" class="form-control" required></div>
                    <div class="col-md-6 mb-2"><label>Nacimiento</label><input type="date" id="inp_nacimiento" class="form-control"></div>
                </div>
                <div class="mb-2"><label>Nombre y Apellido</label><input type="text" id="inp_nombre" class="form-control" required></div>
                <div class="row">
                    <div class="col-md-6 mb-2"><label>Curso</label><input type="text" id="inp_curso" class="form-control" required></div>
                    <div class="col-md-6 mb-2"><label>Email</label><input type="email" id="inp_email" class="form-control" required></div>
                </div>
                <div class="row">
                    <div class="col-6 mb-2"><label>Adulto Resp.</label><input type="text" id="inp_adulto" class="form-control"></div>
                    <div class="col-6 mb-2"><label>Teléfono</label><input type="text" id="inp_tel" class="form-control"></div>
                </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnGuardarModal" onclick="guardarEstudiante()">Guardar</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderModalDocenteHTML() {
    return `
    <div class="modal fade" id="modalDocente" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title" id="modalTitleDoc">Docente</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="formDocente">
                <input type="hidden" id="accion_doc"><input type="hidden" id="doc_dni_orig"><input type="hidden" id="doc_email_orig">
                <div class="mb-2"><label>DNI</label><input type="number" id="doc_dni" class="form-control"></div>
                <div class="mb-2"><label>Nombre</label><input type="text" id="doc_nombre" class="form-control"></div>
                <div class="mb-2"><label>Email ABC</label><input type="email" id="doc_email" class="form-control"></div>
                <div class="mb-2"><label>Celular</label><input type="text" id="doc_cel" class="form-control"></div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-success" id="btnGuardarDoc" onclick="guardarDocente()">Guardar</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderModalAsignacionCompletaHTML() {
    return `
    <div class="modal fade" id="modalAsignacionCompleta" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-warning">
            <h5 class="modal-title text-dark">Asignar Materia</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Docente: <b><span id="span_nombre_docente"></span></b></p>
            <input type="hidden" id="asig_dni_docente">
            <input type="hidden" id="asig_nombre_docente">
            
            <div class="mb-3">
                <label class="form-label">Tipo de Asignación:</label>
                <select id="tipo_asignacion" class="form-select">
                    <option value="Titular">Titular</option>
                    <option value="Provisional">Provisional</option>
                    <option value="Interino">Interino</option>
                    <option value="Suplencia">Suplencia</option>
                </select>
                <div class="form-text">
                    <small>
                        <strong>Titular/Provisional/Interino:</strong> Reemplaza al docente anterior.<br>
                        <strong>Suplencia:</strong> Marca en rojo al docente suplantado.
                    </small>
                </div>
            </div>
            
            <div id="suplente_info" class="d-none alert alert-warning">
                <small>⚠️ La materia aparecerá marcada como suplencia en el docente actual y se mantendrá el docente anterior como referencia.</small>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Seleccionar Materia:</label>
                <select id="sel_materia_asig" class="form-select" size="8"></select>
                <small class="text-danger fw-bold">* Las vacantes aparecen en rojo</small><br>
                <small class="text-warning fw-bold">* Las suplencias aparecen en naranja</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-dark" id="btnGuardarAsigCompleta" onclick="guardarAsignacionCompleta()">Confirmar Asignación</button>
          </div>
        </div>
      </div>
    </div>`;
}

// ==========================================
// 3. MÓDULO DOCENTE (NUEVO Y MEJORADO)
// PEGA ESTO REEMPLAZANDO LAS FUNCIONES DE DOCENTE ANTIGUAS
// ==========================================

async function iniciarModuloDocente() {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = '<div class="spinner-border text-primary"></div> Cargando tus cursos...';

    try {
        const resp = await fetch(`${URL_API}?op=getCursosDocente&dni=${usuarioActual.dni}`);
        const json = await resp.json();

        if (json.status !== 'success') throw new Error(json.message);

        let html = `
        <div class="mb-4">
            <h3>Panel Docente</h3>
            <p class="text-muted">Bienvenido/a, ${usuarioActual.nombre}</p>
        </div>
        <div class="row g-3">`;

        json.data.forEach(curso => {
            html += `
            <div class="col-md-6">
                <div class="card h-100 shadow-sm border-primary">
                    <div class="card-header bg-primary text-white fw-bold">${curso.curso}</div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush">`;
            curso.materias.forEach(mat => {
                 html += `
                 <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${mat.nombre}</strong>
                        <div class="small text-muted">${mat.tipoAsignacion}</div>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="gestionarMateria('${curso.curso}', '${mat.id}')">
                        Gestionar
                    </button>
                 </li>`;
            });
            html += `</ul></div></div></div>`;
        });
        
        html += `</div>`;
        contenedor.innerHTML = html;

    } catch (e) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
}

async function gestionarMateria(curso, idMateria) {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = '<div class="spinner-border text-primary"></div> Cargando aula...';
    
    let html = `
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h5>Materia: <span id="nombreMateriaTitulo">Cargando...</span> - Curso: ${curso}</h5>
        <button class="btn btn-outline-secondary btn-sm" onclick="iniciarModuloDocente()">⬅ Volver</button>
    </div>

    <ul class="nav nav-tabs mb-3" id="docenteTabs">
      <li class="nav-item">
        <button class="nav-link active" id="tab-asistencia" data-bs-toggle="tab" data-bs-target="#panel-asistencia">Asistencia</button>
      </li>
      <li class="nav-item">
        <button class="nav-link" id="tab-notas" data-bs-toggle="tab" data-bs-target="#panel-notas">Notas y Calificaciones</button>
      </li>
    </ul>

    <div class="tab-content" id="myTabContent">
      <div class="tab-pane fade show active" id="panel-asistencia">
           <div class="card p-3 mb-3">
               <div class="d-flex justify-content-between align-items-center mb-2">
                   <h6><i class="bi bi-calendar-check"></i> Tomar Asistencia</h6>
                   <div class="d-flex align-items-center">
                       <label class="me-2 small">Fecha:</label>
                       <input type="date" id="fechaAsistenciaDocente" class="form-control form-control-sm" value="${new Date().toISOString().split('T')[0]}">
                   </div>
               </div>
               <div id="contenedor-tabla-asistencia" class="mt-2">
                  <div class="text-center p-3">Cargando lista...</div>
               </div>
           </div>
      </div>

      <div class="tab-pane fade" id="panel-notas">
           <div class="card p-3">
               <h6><i class="bi bi-journal-bookmark"></i> Planilla de Calificaciones</h6>
               <div class="alert alert-info py-1 small">
                  <i class="bi bi-info-circle"></i> Reglas: Nota >= 7 anula intensificación. Diciembre se habilita si Final < 7. Febrero si Diciembre < 4.
               </div>
               <div id="contenedor-tabla-notas"></div>
           </div>
      </div>
    </div>`;
    
    contenedor.innerHTML = html;
    cargarAlumnosMateria(usuarioActual.dni, curso, idMateria);
}

async function cargarAlumnosMateria(dniDocente, curso, idMateria) {
    try {
        const resp = await fetch(`${URL_API}?op=getEstudiantesConDatos&dniDocente=${dniDocente}&curso=${curso}&idMateria=${idMateria}`);
        const json = await resp.json();
        
        if(json.status === 'success') {
            document.getElementById('nombreMateriaTitulo').innerText = json.data.materia.nombre;
            const estudiantes = json.data.estudiantes;
            renderTablaAsistenciaDocente(estudiantes, idMateria);
            renderTablaNotas(estudiantes, idMateria);
        }
    } catch(e) {
        alert("Error cargando datos del curso");
    }
}

// --- RENDER ASISTENCIA (SIN J, CON BOTÓN HISTORIAL) ---
function renderTablaAsistenciaDocente(estudiantes, idMateria) {
    if (!estudiantes || estudiantes.length === 0) {
        document.getElementById('contenedor-tabla-asistencia').innerHTML = '<div class="alert alert-warning">No hay estudiantes.</div>';
        return;
    }

    let html = `
    <div class="table-responsive">
      <table class="table table-hover align-middle table-sm">
        <thead class="table-light">
          <tr>
            <th>Estudiante</th>
            <th>Estado</th>
            <th class="text-center">Historial</th>
            <th class="text-center">Asistencia Global</th>
          </tr>
        </thead>
        <tbody>`;

    estudiantes.forEach(est => {
        let porc = est.asistencia.porcentaje;
        let colorPorc = porc < 60 ? 'text-danger' : (porc < 80 ? 'text-warning' : 'text-success');
        
        html += `
        <tr>
          <td>
            <div class="fw-bold">${est.nombre}</div>
            <div class="small text-muted">DNI: ${est.dni}</div>
          </td>
          <td>
            <div class="btn-group" role="group">
              <input type="radio" class="btn-check" name="asis_${est.dni}" id="P_${est.dni}" value="P" checked>
              <label class="btn btn-outline-success btn-sm" for="P_${est.dni}">P</label>

              <input type="radio" class="btn-check" name="asis_${est.dni}" id="A_${est.dni}" value="A">
              <label class="btn btn-outline-danger btn-sm" for="A_${est.dni}">Ausente</label>

              <input type="radio" class="btn-check" name="asis_${est.dni}" id="T_${est.dni}" value="T">
              <label class="btn btn-outline-warning btn-sm" for="T_${est.dni}">Tarde</label>
            </div>
          </td>
          <td class="text-center">
             <button class="btn btn-sm btn-info text-white" onclick="verHistorialMateria('${est.dni}', '${est.nombre}', '${idMateria}')">
                <i class="bi bi-clock-history"></i> Ver Faltas
             </button>
          </td>
          <td class="text-center">
             <div class="fw-bold ${colorPorc}">${porc}%</div>
             <div class="small text-muted">(${est.asistencia.presentes}/${est.asistencia.total})</div>
          </td>
        </tr>`;
    });

    html += `</tbody></table></div>
    <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-3">
        <button class="btn btn-primary" onclick="enviarAsistenciaDocente('${idMateria}')">
            <i class="bi bi-save"></i> Guardar Asistencia
        </button>
    </div>`;

    document.getElementById('contenedor-tabla-asistencia').innerHTML = html;
}

// --- RENDER NOTAS (CON LOGICA VISUAL) ---
function renderTablaNotas(estudiantes, idMateria) {
    let html = `
    <div class="table-responsive">
      <table class="table table-bordered table-sm align-middle text-center small">
        <thead class="table-light">
          <tr>
            <th rowspan="2" class="align-middle">Estudiante</th>
            <th colspan="2">1º Cuat.</th>
            <th colspan="2">2º Cuat.</th>
            <th rowspan="2" class="align-middle bg-light">Final</th>
            <th rowspan="2" class="align-middle">Dic.</th>
            <th rowspan="2" class="align-middle">Feb.</th>
            <th rowspan="2" class="align-middle bg-warning bg-opacity-10">DEF</th>
          </tr>
          <tr>
            <th>Nota</th><th>Intens.</th>
            <th>Nota</th><th>Intens.</th>
          </tr>
        </thead>
        <tbody>`;

    estudiantes.forEach(est => {
        let n = est.notas;
        const c1 = parseFloat(n.nota1_C1) || 0;
        const c2 = parseFloat(n.nota1_C2) || 0;
        const final = parseFloat(n.nota_final) || 0;
        const dic = parseFloat(n.diciembre) || 0;

        const disableInt1 = (c1 >= 7) ? 'disabled style="background-color: #e9ecef;"' : '';
        const disableInt2 = (c2 >= 7) ? 'disabled style="background-color: #e9ecef;"' : '';
        const disableDic = (final >= 7) ? 'disabled style="background-color: #e9ecef;"' : '';
        const disableFeb = (final >= 7 || dic >= 4) ? 'disabled style="background-color: #e9ecef;"' : '';

        html += `
        <tr data-dni="${est.dni}">
          <td class="text-start text-truncate" style="max-width: 150px;" title="${est.nombre}">${est.nombre}</td>
          <td><input type="number" class="form-control form-control-sm inp-nota inp-c1" value="${n.nota1_C1}" oninput="checkLogicaNotas(this)"></td>
          <td><input type="number" class="form-control form-control-sm inp-nota inp-int1" value="${n.intensificacion1}" ${disableInt1}></td>
          <td><input type="number" class="form-control form-control-sm inp-nota inp-c2" value="${n.nota1_C2}" oninput="checkLogicaNotas(this)"></td>
          <td><input type="number" class="form-control form-control-sm inp-nota inp-int2" value="${n.intensificacion2}" ${disableInt2}></td>
          <td class="bg-light fw-bold">${n.nota_final}</td>
          <td><input type="number" class="form-control form-control-sm inp-nota inp-dic" value="${n.diciembre}" oninput="checkLogicaNotas(this)" ${disableDic}></td>
          <td><input type="number" class="form-control form-control-sm inp-nota inp-feb" value="${n.febrero}" ${disableFeb}></td>
          <td class="fw-bold text-primary">${n.nota_definitiva}</td>
        </tr>`;
    });

    html += `</tbody></table></div>
    <div class="mt-3 text-end">
       <button class="btn btn-success" onclick="guardarNotasDocente('${idMateria}')">
         <i class="bi bi-save"></i> Guardar Todas las Notas
       </button>
    </div>`;

    document.getElementById('contenedor-tabla-notas').innerHTML = html;
}

function checkLogicaNotas(input) {
    const row = input.closest('tr');
    const c1 = parseFloat(row.querySelector('.inp-c1').value) || 0;
    const c2 = parseFloat(row.querySelector('.inp-c2').value) || 0;
    
    const int1 = row.querySelector('.inp-int1');
    const int2 = row.querySelector('.inp-int2');
    
    if (c1 >= 7) { int1.value = ''; int1.disabled = true; int1.style.backgroundColor = '#e9ecef'; } 
    else { int1.disabled = false; int1.style.backgroundColor = ''; }

    if (c2 >= 7) { int2.value = ''; int2.disabled = true; int2.style.backgroundColor = '#e9ecef'; } 
    else { int2.disabled = false; int2.style.backgroundColor = ''; }
}

async function enviarAsistenciaDocente(idMateria) {
    if(!usuarioActual) return;
    const fechaInput = document.getElementById('fechaAsistenciaDocente').value;
    if(!fechaInput) { alert("Selecciona una fecha válida"); return; }

    const inputs = document.querySelectorAll('input[type=radio]:checked');
    let listaAsistencia = [];
    inputs.forEach(input => {
        let dni = input.name.split('_')[1];
        let estado = input.value;
        listaAsistencia.push({ dni: dni, estado: estado });
    });

    if(listaAsistencia.length === 0) return;
    try {
        const resp = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify({
                op: 'guardarAsistenciaDocente',
                dniDocente: usuarioActual.dni,
                idMateria: idMateria,
                fecha: fechaInput,
                asistencia: listaAsistencia
            })
        });
        const data = await resp.json();
        if(data.status === 'success') {
            alert('Asistencia guardada.');
            document.querySelector('.nav-link.active').click(); 
        }
    } catch(e) { alert('Error de conexión'); }
}

async function guardarNotasDocente(idMateria) {
    const filas = document.querySelectorAll('#contenedor-tabla-notas tbody tr');
    let listaNotas = [];
    filas.forEach(fila => {
        listaNotas.push({
            dni: fila.dataset.dni,
            nota1_C1: fila.querySelector('.inp-c1').value,
            intensificacion1: fila.querySelector('.inp-int1').value,
            nota1_C2: fila.querySelector('.inp-c2').value,
            intensificacion2: fila.querySelector('.inp-int2').value,
            diciembre: fila.querySelector('.inp-dic').value,
            febrero: fila.querySelector('.inp-feb').value
        });
    });

    try {
        const resp = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify({
                op: 'guardarNotasMasivo',
                idMateria: idMateria,
                nombreDocente: usuarioActual.nombre,
                notas: listaNotas
            })
        });
        const data = await resp.json();
        if(data.status === 'success') {
            alert('Notas guardadas.');
            const linkActivo = document.querySelector('.nav-link.active');
            if(linkActivo) linkActivo.click(); 
        }
    } catch(e) { alert('Error de conexión'); }
}

// --- MODAL HISTORIAL (NUEVO) ---
async function verHistorialMateria(dni, nombreAlumno, idMateria) {
    let modalDiv = document.getElementById('modalHistorialMateria');
    if (!modalDiv) {
        modalDiv = document.createElement('div');
        modalDiv.id = 'modalHistorialMateria';
        modalDiv.className = 'modal fade';
        modalDiv.tabIndex = -1;
        modalDiv.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Historial: <span id="tituloHistorialAlumno"></span></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
               <div id="listaHistorialMateria" class="list-group list-group-flush">
                  <div class="text-center"><div class="spinner-border text-primary"></div></div>
               </div>
            </div>
          </div>
        </div>`;
        document.body.appendChild(modalDiv);
    }
    document.getElementById('tituloHistorialAlumno').innerText = nombreAlumno;
    const modal = new bootstrap.Modal(modalDiv);
    modal.show();

    try {
        const resp = await fetch(`${URL_API}?op=getHistorialMateria&dni=${dni}&idMateria=${idMateria}`);
        const data = await resp.json();
        const container = document.getElementById('listaHistorialMateria');
        if (data.status === 'success' && data.data.length > 0) {
            let html = '';
            data.data.forEach(item => {
                let badge = '';
                if(item.estado === 'A') badge = '<span class="badge bg-danger">Ausente</span>';
                else if(item.estado === 'T') badge = '<span class="badge bg-warning text-dark">Tarde</span>';
                else if(item.estado === 'J') badge = '<span class="badge bg-success">Justificado</span>';
                else badge = '<span class="badge bg-secondary">' + item.estado + '</span>';
                
                let btnJustificar = '';
                if ((item.estado === 'A' || item.estado === 'T') && item.justificado !== 'Si') {
                    btnJustificar = `<button class="btn btn-sm btn-outline-primary ms-2" onclick="justificarDesdeDocente(${item.fila}, '${dni}', '${idMateria}')">Justificar</button>`;
                }
                html += `<div class="list-group-item d-flex justify-content-between align-items-center"><div><strong>${item.fecha}</strong> ${badge}</div>${btnJustificar}</div>`;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div class="alert alert-info">No hay inasistencias registradas en esta materia.</div>';
        }
    } catch(e) { document.getElementById('listaHistorialMateria').innerHTML = '<div class="text-danger">Error al cargar.</div>'; }
}

async function justificarDesdeDocente(fila, dni, idMateria) {
    if(!confirm("¿Confirmas justificar esta falta?")) return;
    try {
        const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'justificarFalta', fila: fila }) });
        const r = await resp.json();
        if(r.status === 'success') {
            const nombre = document.getElementById('tituloHistorialAlumno').innerText;
            verHistorialMateria(dni, nombre, idMateria); 
        }
    } catch(e) { alert("Error de conexión"); }
}
// ==========================================
// 4. MÓDULO DIRECTIVO: PRECEPTORES (CORREGIDO)
// ==========================================

let baseDatosPreceptores = []; // Variable global para guardar los datos

async function verPreceptores() {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = '<div class="spinner-border text-primary"></div> Cargando Preceptores...';
    
    try {
        // Solicitamos los datos al nuevo Backend mejorado
        const resp = await fetch(`${URL_API}?op=getPreceptoresAdmin&rol=Directivo`);
        const json = await resp.json();
        
        if (json.status !== 'success') {
            contenedor.innerHTML = `<div class="alert alert-danger">Error: ${json.message}</div>`;
            return;
        }

        baseDatosPreceptores = json.data; // Guardamos los datos recibidos (Objetos)

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>Gestión de Preceptores</h5>
                <button onclick="abrirModalPreceptor()" class="btn btn-success">+ Nuevo Preceptor</button>
            </div>
            
            <div class="table-responsive bg-white rounded shadow-sm">
                <table class="table table-hover table-bordered mb-0 align-middle">
                    <thead class="table-dark text-center">
                        <tr>
                            <th>DNI</th>
                            <th>Nombre</th>
                            <th>Contacto</th>
                            <th>Cursos a Cargo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        // AQUI ESTABA EL ERROR: Ahora leemos propiedades (.dni, .nombre) en lugar de indices ([0])
        json.data.forEach((preceptor, index) => {
            let cursosHTML = preceptor.cursos ? 
                preceptor.cursos.split(',').map(c => `<span class="badge bg-info text-dark me-1">${c.trim()}</span>`).join('') : 
                '<span class="text-muted small">Sin asignar</span>';

            html += `
                <tr>
                    <td>${preceptor.dni}</td>
                    <td class="fw-bold">${preceptor.nombre}</td>
                    <td><small>${preceptor.email}<br>${preceptor.celular || ''}</small></td>
                    <td>${cursosHTML}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="abrirModalCursosPreceptor(${index})" title="Asignar Cursos">📚</button>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editarPreceptor(${index})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="borrarPreceptor('${preceptor.dni}', '${preceptor.email}')" title="Borrar">🗑️</button>
                    </td>
                </tr>`;
        });
        
        html += `</tbody></table></div>`;
        
        // Agregamos los Modales necesarios al HTML
        html += renderModalPreceptorHTML();
        html += renderModalCursosPreceptorHTML();
        
        contenedor.innerHTML = html;
        
    } catch (e) {
        console.error(e);
        alert("Error al cargar preceptores: " + e.message);
    }
}

// --- FUNCIONES CRUD PRECEPTORES ---

function abrirModalPreceptor() {
    const modal = new bootstrap.Modal(document.getElementById('modalPreceptor'));
    document.getElementById('formPreceptor').reset();
    document.getElementById('tituloModalPreceptor').innerText = "Nuevo Preceptor";
    document.getElementById('accion_preceptor').value = "crear";
    document.getElementById('prec_dni').disabled = false;
    modal.show();
}

function editarPreceptor(index) {
    const p = baseDatosPreceptores[index];
    const modal = new bootstrap.Modal(document.getElementById('modalPreceptor'));
    
    document.getElementById('tituloModalPreceptor').innerText = "Editar Preceptor";
    document.getElementById('accion_preceptor').value = "editar";
    document.getElementById('dni_original_preceptor').value = p.dni;
    
    document.getElementById('prec_dni').value = p.dni;
    document.getElementById('prec_nombre').value = p.nombre;
    document.getElementById('prec_email').value = p.email;
    document.getElementById('prec_celular').value = p.celular;
    
    modal.show();
}

async function guardarPreceptor() {
    const btn = document.getElementById('btnGuardarPreceptor');
    btn.disabled = true; btn.innerText = "Guardando...";
    
    const datos = {
        op: 'administrarPreceptor',
        accion: document.getElementById('accion_preceptor').value,
        dniOriginal: document.getElementById('dni_original_preceptor').value,
        dni: document.getElementById('prec_dni').value,
        nombre: document.getElementById('prec_nombre').value,
        email: document.getElementById('prec_email').value,
        celular: document.getElementById('prec_celular').value
    };

    try {
        const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        const json = await resp.json();
        
        if(json.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalPreceptor')).hide();
            alert("Preceptor guardado correctamente.");
            verPreceptores(); // Recargar tabla
        } else {
            alert("Error: " + json.message);
        }
    } catch (e) {
        alert("Error de conexión al guardar.");
    } finally {
        btn.disabled = false; btn.innerText = "Guardar";
    }
}

async function borrarPreceptor(dni, email) {
    if(!confirm(`¿Seguro que deseas eliminar al preceptor DNI ${dni}?`)) return;
    
    try {
        await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify({ op: 'administrarPreceptor', accion: 'borrar', dni: dni }) 
        });
        alert("Eliminado.");
        verPreceptores();
    } catch (e) {
        alert("Error al eliminar.");
    }
}

// --- ASIGNACIÓN DE CURSOS ---

async function abrirModalCursosPreceptor(index) {
    const p = baseDatosPreceptores[index];
    const modal = new bootstrap.Modal(document.getElementById('modalCursosPreceptor'));
    
    document.getElementById('tituloModalCursos').innerText = `Cursos de: ${p.nombre}`;
    document.getElementById('dni_curso_preceptor').value = p.dni;
    
    const select = document.getElementById('cursos_disponibles');
    select.innerHTML = '<option>Cargando cursos...</option>';
    
    modal.show();
    
    try {
        // Obtenemos cursos disponibles desde el backend
        const resp = await fetch(`${URL_API}?op=getCursosDisponibles&rol=Directivo`);
        const json = await resp.json();
        
        select.innerHTML = '';
        const cursosAsignados = p.cursos ? p.cursos.split(', ').map(c => c.trim()) : [];
        
        json.data.forEach(curso => {
            const selected = cursosAsignados.includes(curso) ? 'selected' : '';
            select.innerHTML += `<option value="${curso}" ${selected}>${curso}</option>`;
        });
        
    } catch (e) {
        select.innerHTML = '<option>Error al cargar cursos</option>';
    }
}

async function guardarAsignacionCursos() {
    const dni = document.getElementById('dni_curso_preceptor').value;
    const select = document.getElementById('cursos_disponibles');
    // Obtener valores múltiples seleccionados
    const seleccionados = Array.from(select.selectedOptions).map(option => option.value);
    
    const btn = document.getElementById('btnGuardarCursos');
    btn.disabled = true; btn.innerText = "Guardando...";
    
    try {
        const resp = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify({
                op: 'asignarCursosPreceptor',
                dniPreceptor: dni,
                cursos: seleccionados
            })
        });
        
        bootstrap.Modal.getInstance(document.getElementById('modalCursosPreceptor')).hide();
        alert("Cursos asignados correctamente.");
        verPreceptores();
        
    } catch (e) {
        alert("Error al guardar cursos.");
    } finally {
        btn.disabled = false; btn.innerText = "💾 Guardar Asignación de Cursos";
    }
}

// --- RENDERIZADO DE MODALES (HTML) ---

function renderModalPreceptorHTML() {
    return `
    <div class="modal fade" id="modalPreceptor" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title" id="tituloModalPreceptor">Nuevo Preceptor</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="formPreceptor">
                <input type="hidden" id="accion_preceptor">
                <input type="hidden" id="dni_original_preceptor">
                
                <div class="mb-3">
                    <label>DNI</label>
                    <input type="number" class="form-control" id="prec_dni" required>
                </div>
                <div class="mb-3">
                    <label>Nombre y Apellido</label>
                    <input type="text" class="form-control" id="prec_nombre" required>
                </div>
                <div class="mb-3">
                    <label>Email ABC</label>
                    <input type="email" class="form-control" id="prec_email">
                </div>
                <div class="mb-3">
                    <label>Celular</label>
                    <input type="text" class="form-control" id="prec_celular">
                </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-success" id="btnGuardarPreceptor" onclick="guardarPreceptor()">Guardar</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderModalCursosPreceptorHTML() {
    return `
    <div class="modal fade" id="modalCursosPreceptor" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-warning">
            <h5 class="modal-title" id="tituloModalCursos">Asignar Cursos</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="dni_curso_preceptor">
            <div class="alert alert-info small">
                Mantén presionada la tecla <b>Ctrl</b> (o Cmd) para seleccionar múltiples cursos a la vez.
            </div>
            <div class="mb-3">
                <label>Seleccionar Cursos:</label>
                <select id="cursos_disponibles" class="form-select" multiple size="8">
                    </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-dark" id="btnGuardarCursos" onclick="guardarAsignacionCursos()">💾 Guardar Asignación de Cursos</button>
          </div>
        </div>
      </div>
    </div>`;
}


