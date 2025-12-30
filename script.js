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

async function iniciarModuloPreceptor() {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="spinner-border spinner-border-sm"></div> Cargando datos y estadísticas...`;
    
    try {
        const resp = await fetch(`${URL_API}?op=getDataPreceptor&rol=Preceptor`);
        const json = await resp.json();
        baseDatosAlumnos = json.data; 
        
        const cursos = [...new Set(baseDatosAlumnos.map(obj => obj.data[2]))].sort();
        let opts = cursos.map(c => `<option value="${c}">${c}</option>`).join('');
        
        // FECHA DE HOY POR DEFECTO
        const hoy = new Date().toISOString().split('T')[0];

        document.getElementById('contenido-dinamico').innerHTML = `
            <div class="card p-3 shadow-sm mb-3">
                <h5>📅 Control de Asistencia</h5>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Seleccionar Curso</label>
                        <select id="selCurso" class="form-select form-select-lg" onchange="renderTablaPreceptor()">
                            <option selected disabled>Elige un Curso</option>${opts}
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Fecha de la Falta</label>
                        <input type="date" id="fechaAsistencia" class="form-control form-select-lg" value="${hoy}">
                    </div>
                </div>
            </div>
            <div id="zonaPreceptor"></div>
            ${renderModalJustificacionHTML()}
            `;
    } catch(e) {
        console.log(e);
        document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
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
// 6. MÓDULO DOCENTE COMPLETO
// ==========================================

// --- MÓDULO PRINCIPAL DOCENTE ---

async function iniciarModuloDocente() {
    document.getElementById('contenido-dinamico').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2">Cargando tus cursos...</p>
        </div>`;
    
    try {
        // Obtener DNI del docente desde usuarioActual
        const resp = await fetch(`${URL_API}?op=getCursosDocente&rol=Docente&dni=${usuarioActual.dni || ''}`);
        const json = await resp.json();
        
        if (json.status !== 'success') {
            document.getElementById('contenido-dinamico').innerHTML = `
                <div class="alert alert-warning">
                    <h5>No tienes cursos asignados</h5>
                    <p>Contacta con la dirección para que te asignen materias.</p>
                </div>`;
            return;
        }
        
        let html = `
            <div class="card shadow-sm mb-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">🏫 Mis Cursos Asignados</h5>
                </div>
                <div class="card-body">
                    <p class="text-muted">Tienes <strong>${json.totalCursos} cursos</strong> asignados.</p>
                </div>
            </div>
            
            <div class="row" id="lista-cursos">`;
        
        json.data.forEach((cursoData, index) => {
            html += `
                <div class="col-md-6 mb-3">
                    <div class="card h-100 shadow-sm border-primary">
                        <div class="card-header bg-light">
                            <h6 class="mb-0">${cursoData.curso}</h6>
                        </div>
                        <div class="card-body">
                            <p><strong>${cursoData.totalEstudiantes}</strong> estudiantes</p>
                            <p><strong>Materias:</strong></p>
                            <ul class="list-unstyled">`;
            
            cursoData.materias.forEach(materia => {
                html += `<li class="mb-1">
                            <button class="btn btn-sm btn-outline-primary w-100 text-start" 
                                    onclick="abrirCursoDocente('${cursoData.curso}', ${materia.id}, '${materia.nombre}')">
                                📚 ${materia.nombre} 
                                <span class="badge bg-secondary float-end">${materia.tipoAsignacion}</span>
                            </button>
                         </li>`;
            });
            
            html += `    </ul>
                        </div>
                    </div>
                </div>`;
        });
        
        html += `</div>`;
        
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) {
        console.error('Error cargando cursos docente:', e);
        document.getElementById('contenido-dinamico').innerHTML = `
            <div class="alert alert-danger">
                <h5>Error al cargar cursos</h5>
                <p>${e.message}</p>
            </div>`;
    }
}

async function abrirCursoDocente(curso, idMateria, nombreMateria) {
    document.getElementById('contenido-dinamico').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2">Cargando datos del curso...</p>
        </div>`;
    
    try {
        const resp = await fetch(`${URL_API}?op=getEstudiantesConDatos&rol=Docente&dniDocente=${usuarioActual.dni || ''}&curso=${curso}&idMateria=${idMateria}`);
        const json = await resp.json();
        
        if (json.status !== 'success') {
            throw new Error('No se pudieron cargar los datos del curso');
        }
        
        // Guardar información del contexto actual
        window.cursoActualDocente = {
            curso: curso,
            idMateria: idMateria,
            nombreMateria: nombreMateria,
            estudiantes: json.data.estudiantes
        };
        
        let html = `
            <div class="card shadow-sm mb-4">
                <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-0">📚 ${nombreMateria}</h5>
                        <small>${curso} | ${json.data.estudiantes.length} estudiantes</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-light me-2" onclick="contactarPreceptor()">📞 Contactar Preceptor</button>
                        <button class="btn btn-sm btn-warning" onclick="iniciarModuloDocente()">← Volver a cursos</button>
                    </div>
                </div>
                <div class="card-body">
                    <!-- PESTAÑAS -->
                    <ul class="nav nav-tabs mb-3" id="tabsDocente">
                        <li class="nav-item">
                            <button class="nav-link active" onclick="mostrarTabDocente('asistencia')">📅 Asistencia</button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" onclick="mostrarTabDocente('notas')">📊 Notas</button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" onclick="mostrarTabDocente('resumen')">📈 Resumen</button>
                        </li>
                    </ul>
                    
                    <!-- CONTENIDO DE PESTAÑAS -->
                    <div id="tabAsistencia">
                        ${renderTablaAsistenciaDocente(json.data.estudiantes)}
                    </div>
                    
                    <div id="tabNotas" class="d-none">
                        ${renderTablaNotasDocente(json.data.estudiantes)}
                    </div>
                    
                    <div id="tabResumen" class="d-none">
                        ${renderResumenDocente(json.data.estudiantes)}
                    </div>
                </div>
            </div>`;
        
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) {
        console.error('Error abriendo curso:', e);
        document.getElementById('contenido-dinamico').innerHTML = `
            <div class="alert alert-danger">
                <h5>Error al cargar el curso</h5>
                <p>${e.message}</p>
                <button class="btn btn-secondary mt-2" onclick="iniciarModuloDocente()">← Volver</button>
            </div>`;
    }
}

function renderTablaAsistenciaDocente(estudiantes) {
    const hoy = new Date().toISOString().split('T')[0];
    
    let html = `
        <div class="card mb-3">
            <div class="card-body">
                <h6>Tomar Asistencia Hoy (${hoy})</h6>
                <p class="text-muted small">Selecciona el estado de asistencia para cada estudiante</p>
            </div>
        </div>
        
        <div class="table-responsive">
            <table class="table table-hover table-striped align-middle">
                <thead class="table-dark">
                    <tr>
                        <th>Estudiante</th>
                        <th class="text-center" style="background:#d4edda;">P</th>
                        <th class="text-center" style="background:#f8d7da;">A</th>
                        <th class="text-center" style="background:#fff3cd;">T</th>
                        <th class="text-center" style="background:#e2e3e5;">J</th>
                        <th>% Asistencia</th>
                    </tr>
                </thead>
                <tbody>`;
    
    estudiantes.forEach(est => {
        const porcentaje = est.asistencia.porcentaje || 0;
        let badgeColor = 'success';
        if (porcentaje < 75) badgeColor = 'danger';
        else if (porcentaje < 85) badgeColor = 'warning';
        
        html += `
            <tr>
                <td class="fw-bold">${est.nombre}</td>
                <td class="text-center" style="background:#d4edda;">
                    <input type="radio" name="asis_${est.dni}" value="P" checked style="transform: scale(1.3);">
                </td>
                <td class="text-center" style="background:#f8d7da;">
                    <input type="radio" name="asis_${est.dni}" value="A" style="transform: scale(1.3);">
                </td>
                <td class="text-center" style="background:#fff3cd;">
                    <input type="radio" name="asis_${est.dni}" value="T" style="transform: scale(1.3);">
                </td>
                <td class="text-center" style="background:#e2e3e5;">
                    <input type="radio" name="asis_${est.dni}" value="J" style="transform: scale(1.3);">
                </td>
                <td>
                    <span class="badge bg-${badgeColor}">${porcentaje}%</span>
                    <small class="text-muted ms-2">(${est.asistencia.presentes}/${est.asistencia.total})</small>
                </td>
            </tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <div class="mt-3">
            <button class="btn btn-success btn-lg w-100 shadow" onclick="guardarAsistenciaDocente()">
                💾 Guardar Asistencia
            </button>
        </div>`;
    
    return html;
}

function renderTablaNotasDocente(estudiantes) {
    let html = `
        <div class="card mb-3">
            <div class="card-body">
                <h6>Sistema de Calificaciones</h6>
                <p class="text-muted small">
                    <strong>1er Cuatrimestre:</strong> Nota regular + Intensificación<br>
                    <strong>2do Cuatrimestre:</strong> Nota regular + Intensificación<br>
                    <strong>Nota Final:</strong> Se calcula automáticamente<br>
                    <strong>Diciembre/Febrero:</strong> Recuperatorios<br>
                    <strong>Nota Definitiva:</strong> Puede ser manual
                </p>
            </div>
        </div>
        
        <div class="table-responsive">
            <table class="table table-hover table-bordered align-middle">
                <thead class="table-dark">
                    <tr class="text-center">
                        <th rowspan="2">Estudiante</th>
                        <th colspan="2" class="bg-info">1er Cuatrimestre</th>
                        <th colspan="2" class="bg-warning">2do Cuatrimestre</th>
                        <th rowspan="2" class="bg-success">Nota Final</th>
                        <th rowspan="2" class="bg-secondary">Diciembre</th>
                        <th rowspan="2" class="bg-secondary">Febrero</th>
                        <th rowspan="2" class="bg-primary">Definitiva</th>
                    </tr>
                    <tr class="text-center">
                        <th class="bg-info-subtle">Nota</th>
                        <th class="bg-info-subtle">Intensif.</th>
                        <th class="bg-warning-subtle">Nota</th>
                        <th class="bg-warning-subtle">Intensif.</th>
                    </tr>
                </thead>
                <tbody>`;
    
    estudiantes.forEach(est => {
        const notas = est.notas;
        
        html += `
            <tr>
                <td class="fw-bold">${est.nombre}</td>
                
                <!-- 1er Cuatrimestre -->
                <td class="text-center">
                    <input type="number" min="0" max="10" step="0.1" 
                           class="form-control form-control-sm text-center nota-input" 
                           data-dni="${est.dni}" data-campo="nota1_C1"
                           value="${notas.nota1_C1 || ''}" 
                           placeholder="0-10">
                </td>
                <td class="text-center">
                    <input type="number" min="0" max="10" step="0.1" 
                           class="form-control form-control-sm text-center nota-input" 
                           data-dni="${est.dni}" data-campo="intensificacion1"
                           value="${notas.intensificacion1 || ''}" 
                           placeholder="0-10">
                </td>
                
                <!-- 2do Cuatrimestre -->
                <td class="text-center">
                    <input type="number" min="0" max="10" step="0.1" 
                           class="form-control form-control-sm text-center nota-input" 
                           data-dni="${est.dni}" data-campo="nota1_C2"
                           value="${notas.nota1_C2 || ''}" 
                           placeholder="0-10">
                </td>
                <td class="text-center">
                    <input type="number" min="0" max="10" step="0.1" 
                           class="form-control form-control-sm text-center nota-input" 
                           data-dni="${est.dni}" data-campo="intensificacion2"
                           value="${notas.intensificacion2 || ''}" 
                           placeholder="0-10">
                </td>
                
                <!-- Nota Final (calculada automáticamente, solo lectura) -->
                <td class="text-center bg-success-subtle fw-bold">
                    <span id="nota_final_${est.dni}">${notas.nota_final || '0.0'}</span>
                </td>
                
                <!-- Diciembre y Febrero -->
                <td class="text-center">
                    <input type="number" min="0" max="10" step="0.1" 
                           class="form-control form-control-sm text-center nota-input" 
                           data-dni="${est.dni}" data-campo="diciembre"
                           value="${notas.diciembre || ''}" 
                           placeholder="0-10">
                </td>
                <td class="text-center">
                    <input type="number" min="0" max="10" step="0.1" 
                           class="form-control form-control-sm text-center nota-input" 
                           data-dni="${est.dni}" data-campo="febrero"
                           value="${notas.febrero || ''}" 
                           placeholder="0-10">
                </td>
                
                <!-- Nota Definitiva -->
                <td class="text-center">
                    <input type="number" min="0" max="10" step="0.1" 
                           class="form-control form-control-sm text-center nota-input fw-bold" 
                           data-dni="${est.dni}" data-campo="nota_definitiva"
                           value="${notas.nota_definitiva || ''}" 
                           placeholder="0-10">
                </td>
            </tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <div class="row mt-3">
            <div class="col-md-6">
                <button class="btn btn-secondary w-100" onclick="calcularNotasAutomaticamente()">
                    🔄 Calcular Automáticamente
                </button>
            </div>
            <div class="col-md-6">
                <button class="btn btn-primary w-100" onclick="guardarNotasDocente()">
                    💾 Guardar Todas las Notas
                </button>
            </div>
        </div>`;
    
    return html;
}

function renderResumenDocente(estudiantes) {
    // Calcular estadísticas
    const totalEstudiantes = estudiantes.length;
    
    // Estadísticas de asistencia
    const porcentajesAsistencia = estudiantes.map(e => e.asistencia.porcentaje || 0);
    const promedioAsistencia = porcentajesAsistencia.length > 0 ? 
        Math.round(porcentajesAsistencia.reduce((a, b) => a + b, 0) / porcentajesAsistencia.length) : 0;
    
    const bajaAsistencia = estudiantes.filter(e => (e.asistencia.porcentaje || 0) < 75).length;
    
    // Estadísticas de notas
    const notasFinales = estudiantes.map(e => parseFloat(e.notas.nota_final) || 0);
    const promedioNotas = notasFinales.length > 0 ? 
        (notasFinales.reduce((a, b) => a + b, 0) / notasFinales.length).toFixed(1) : '0.0';
    
    const aprobados = estudiantes.filter(e => (parseFloat(e.notas.nota_final) || 0) >= 6).length;
    const desaprobados = totalEstudiantes - aprobados;
    
    let html = `
        <div class="row">
            <!-- TARJETAS RESUMEN -->
            <div class="col-md-3 mb-3">
                <div class="card text-center shadow-sm border-primary">
                    <div class="card-body">
                        <h1 class="display-5">${totalEstudiantes}</h1>
                        <p class="text-muted">Estudiantes</p>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 mb-3">
                <div class="card text-center shadow-sm border-success">
                    <div class="card-body">
                        <h1 class="display-5">${promedioAsistencia}%</h1>
                        <p class="text-muted">Asistencia Promedio</p>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 mb-3">
                <div class="card text-center shadow-sm border-warning">
                    <div class="card-body">
                        <h1 class="display-5">${promedioNotas}</h1>
                        <p class="text-muted">Nota Promedio</p>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 mb-3">
                <div class="card text-center shadow-sm border-info">
                    <div class="card-body">
                        <h1 class="display-5">${aprobados}/${desaprobados}</h1>
                        <p class="text-muted">Aprobados/Desaprobados</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <!-- ESTUDIANTES CON BAJA ASISTENCIA -->
            <div class="col-md-6 mb-3">
                <div class="card shadow-sm">
                    <div class="card-header bg-warning">
                        <h6 class="mb-0">⚠️ Baja Asistencia (< 75%)</h6>
                    </div>
                    <div class="card-body">
                        ${bajaAsistencia > 0 ? `
                            <ul class="list-group">
                                ${estudiantes
                                    .filter(e => (e.asistencia.porcentaje || 0) < 75)
                                    .map(e => `
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            ${e.nombre}
                                            <span class="badge bg-danger">${e.asistencia.porcentaje}%</span>
                                        </li>
                                    `).join('')}
                            </ul>
                        ` : '<p class="text-success">Todos los estudiantes tienen buena asistencia ✅</p>'}
                    </div>
                </div>
            </div>
            
            <!-- ESTUDIANTES DESAPROBADOS -->
            <div class="col-md-6 mb-3">
                <div class="card shadow-sm">
                    <div class="card-header bg-danger text-white">
                        <h6 class="mb-0">📉 Desaprobados (< 6)</h6>
                    </div>
                    <div class="card-body">
                        ${desaprobados > 0 ? `
                            <ul class="list-group">
                                ${estudiantes
                                    .filter(e => (parseFloat(e.notas.nota_final) || 0) < 6)
                                    .map(e => `
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            ${e.nombre}
                                            <span class="badge bg-warning">${parseFloat(e.notas.nota_final) || 0}</span>
                                        </li>
                                    `).join('')}
                            </ul>
                        ` : '<p class="text-success">Todos los estudiantes están aprobados ✅</p>'}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- LISTA COMPLETA -->
        <div class="card shadow-sm">
            <div class="card-header bg-light">
                <h6 class="mb-0">📋 Lista Completa de Estudiantes</h6>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>Estudiante</th>
                                <th class="text-center">Asistencia</th>
                                <th class="text-center">Nota Final</th>
                                <th class="text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${estudiantes.map(e => {
                                const nota = parseFloat(e.notas.nota_final) || 0;
                                const asistencia = e.asistencia.porcentaje || 0;
                                
                                let estado = '✅ Aprobado';
                                let estadoColor = 'success';
                                
                                if (nota < 6) {
                                    estado = '❌ Desaprobado';
                                    estadoColor = 'danger';
                                } else if (asistencia < 75) {
                                    estado = '⚠️ Baja asistencia';
                                    estadoColor = 'warning';
                                }
                                
                                return `
                                    <tr>
                                        <td>${e.nombre}</td>
                                        <td class="text-center">
                                            <span class="badge bg-${asistencia >= 75 ? 'success' : 'warning'}">
                                                ${asistencia}%
                                            </span>
                                        </td>
                                        <td class="text-center fw-bold ${nota >= 6 ? 'text-success' : 'text-danger'}">
                                            ${nota.toFixed(1)}
                                        </td>
                                        <td class="text-center">
                                            <span class="badge bg-${estadoColor}">${estado}</span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    
    return html;
}

// --- FUNCIONES DE CONTROL DE PESTAÑAS ---

function mostrarTabDocente(tab) {
    // Ocultar todas las pestañas
    document.getElementById('tabAsistencia').classList.add('d-none');
    document.getElementById('tabNotas').classList.add('d-none');
    document.getElementById('tabResumen').classList.add('d-none');
    
    // Remover active de todos los tabs
    document.querySelectorAll('#tabsDocente button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar la pestaña seleccionada
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.remove('d-none');
    
    // Activar el botón correspondiente
    event.target.classList.add('active');
}

// --- FUNCIONES DE GUARDADO ---

async function guardarAsistenciaDocente() {
    if (!window.cursoActualDocente) return;
    
    const inputs = document.querySelectorAll('input[type="radio"]:checked');
    let lista = [];
    
    inputs.forEach(inp => {
        const dni = inp.name.split('_')[1];
        lista.push({ 
            dni: dni, 
            estado: inp.value 
        });
    });
    
    const btn = document.querySelector('#tabAsistencia button');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Guardando...';
    btn.disabled = true;
    
    try {
        await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify({ 
                op: 'guardarAsistenciaDocente',
                dniDocente: usuarioActual.dni || '',
                idMateria: window.cursoActualDocente.idMateria,
                asistencia: lista
            })
        });
        
        alert('✅ Asistencia guardada correctamente');
        
        // Recargar los datos
        abrirCursoDocente(
            window.cursoActualDocente.curso,
            window.cursoActualDocente.idMateria,
            window.cursoActualDocente.nombreMateria
        );
        
    } catch (e) {
        alert('Error al guardar asistencia: ' + e.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function calcularNotasAutomaticamente() {
    if (!window.cursoActualDocente) return;
    
    // Calcular nota final para cada estudiante
    window.cursoActualDocente.estudiantes.forEach(est => {
        const dni = est.dni;
        
        // Obtener valores de los inputs
        const notaC1 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="nota1_C1"]`)?.value) || 0;
        const intensif1 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="intensificacion1"]`)?.value) || 0;
        const notaC2 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="nota1_C2"]`)?.value) || 0;
        const intensif2 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="intensificacion2"]`)?.value) || 0;
        
        // Usar intensificación si es mayor que la nota regular
        const notaFinalC1 = intensif1 > notaC1 ? intensif1 : notaC1;
        const notaFinalC2 = intensif2 > notaC2 ? intensif2 : notaC2;
        
        let notaFinalCalculada = (notaFinalC1 + notaFinalC2) / 2;
        notaFinalCalculada = Math.round(notaFinalCalculada * 10) / 10; // Redondear a 1 decimal
        
        // Actualizar el span de nota final
        document.getElementById(`nota_final_${dni}`).textContent = notaFinalCalculada.toFixed(1);
        
        // Si no hay nota definitiva manual, actualizarla también
        const inputDefinitiva = document.querySelector(`input[data-dni="${dni}"][data-campo="nota_definitiva"]`);
        if (inputDefinitiva && !inputDefinitiva.value) {
            inputDefinitiva.value = notaFinalCalculada.toFixed(1);
        }
    });
    
    alert('✅ Notas calculadas automáticamente');
}

async function guardarNotasDocente() {
    if (!window.cursoActualDocente) return;
    
    const notas = [];
    const estudiantes = window.cursoActualDocente.estudiantes;
    
    estudiantes.forEach(est => {
        const dni = est.dni;
        
        // Recolectar todos los valores
        const notaData = {
            dni: dni,
            nota1_C1: document.querySelector(`input[data-dni="${dni}"][data-campo="nota1_C1"]`)?.value || '',
            intensificacion1: document.querySelector(`input[data-dni="${dni}"][data-campo="intensificacion1"]`)?.value || '',
            nota1_C2: document.querySelector(`input[data-dni="${dni}"][data-campo="nota1_C2"]`)?.value || '',
            intensificacion2: document.querySelector(`input[data-dni="${dni}"][data-campo="intensificacion2"]`)?.value || '',
            diciembre: document.querySelector(`input[data-dni="${dni}"][data-campo="diciembre"]`)?.value || '',
            febrero: document.querySelector(`input[data-dni="${dni}"][data-campo="febrero"]`)?.value || '',
            nota_definitiva: document.querySelector(`input[data-dni="${dni}"][data-campo="nota_definitiva"]`)?.value || ''
        };
        
        notas.push(notaData);
    });
    
    const btn = document.querySelector('#tabNotas button.btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Guardando...';
    btn.disabled = true;
    
    try {
        await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify({ 
                op: 'guardarNotasMasivo',
                idMateria: window.cursoActualDocente.idMateria,
                nombreDocente: usuarioActual.nombre,
                notas: notas
            })
        });
        
        alert('✅ Notas guardadas correctamente');
        
        // Recargar los datos
        abrirCursoDocente(
            window.cursoActualDocente.curso,
            window.cursoActualDocente.idMateria,
            window.cursoActualDocente.nombreMateria
        );
        
    } catch (e) {
        alert('Error al guardar notas: ' + e.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function contactarPreceptor() {
    try {
        const resp = await fetch(`${URL_API}?op=getPreceptores&rol=Docente`);
        const json = await resp.json();
        
        if (json.status !== 'success' || json.data.length === 0) {
            alert('No se encontraron preceptores disponibles');
            return;
        }
        
        let html = `<div class="mb-3">
                       <h6>Preceptores disponibles:</h6>
                       <ul class="list-group">`;
        
        json.data.forEach(preceptor => {
            html += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${preceptor.nombre}</strong><br>
                        <small>${preceptor.email}</small>
                    </div>
                    <div>
                        <a href="mailto:${preceptor.email}?subject=Consulta sobre ${window.cursoActualDocente.nombreMateria} - ${window.cursoActualDocente.curso}" 
                           class="btn btn-sm btn-primary" target="_blank">
                            ✉️ Email
                        </a>
                    </div>
                </li>`;
        });
        
        html += `</ul></div>`;
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.createElement('div'));
        modal._element.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">📞 Contactar Preceptor</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${html}
                        <p class="text-muted small mt-3">
                            <strong>Curso:</strong> ${window.cursoActualDocente.curso}<br>
                            <strong>Materia:</strong> ${window.cursoActualDocente.nombreMateria}
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>`;
        
        document.body.appendChild(modal._element);
        modal.show();
        
    } catch (e) {
        alert('Error al cargar preceptores: ' + e.message);
    }
}

function verMisDatosDocente() {
    // Esta función puede mostrar los datos personales del docente
    document.getElementById('contenido-dinamico').innerHTML = `
        <div class="card shadow-sm">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">👤 Mis Datos Personales</h5>
            </div>
            <div class="card-body">
                <div class="alert alert-info">
                    <h6>Información del docente:</h6>
                    <p><strong>Nombre:</strong> ${usuarioActual.nombre}</p>
                    <p><strong>Rol:</strong> ${usuarioActual.rol}</p>
                    <p class="text-muted">Para modificar tus datos de contacto, comunícate con la dirección.</p>
                </div>
                <button class="btn btn-secondary" onclick="iniciarModuloDocente()">
                    ← Volver a mis cursos
                </button>
            </div>
        </div>`;
}

// Agregar un event listener para calcular notas en tiempo real
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('nota-input')) {
        // Si es un input de nota, recalcular la nota final automáticamente
        const dni = e.target.dataset.dni;
        if (dni) {
            calcularNotaIndividual(dni);
        }
    }
});

function calcularNotaIndividual(dni) {
    // Calcular solo para un estudiante específico
    const notaC1 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="nota1_C1"]`)?.value) || 0;
    const intensif1 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="intensificacion1"]`)?.value) || 0;
    const notaC2 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="nota1_C2"]`)?.value) || 0;
    const intensif2 = parseFloat(document.querySelector(`input[data-dni="${dni}"][data-campo="intensificacion2"]`)?.value) || 0;
    
    // Usar intensificación si es mayor que la nota regular
    const notaFinalC1 = intensif1 > notaC1 ? intensif1 : notaC1;
    const notaFinalC2 = intensif2 > notaC2 ? intensif2 : notaC2;
    
    let notaFinalCalculada = (notaFinalC1 + notaFinalC2) / 2;
    notaFinalCalculada = Math.round(notaFinalCalculada * 10) / 10;
    
    // Actualizar el span de nota final
    const notaFinalElement = document.getElementById(`nota_final_${dni}`);
    if (notaFinalElement) {
        notaFinalElement.textContent = notaFinalCalculada.toFixed(1);
    }
}

// ==========================================
// 7. MÓDULO GESTIÓN DE PRECEPTORES (DIRECTIVO) - PESTAÑA SEPARADA
// ==========================================

async function verPreceptores() {
    document.getElementById('contenido-dinamico').innerHTML = '<div class="spinner-border text-info"></div> Cargando Preceptores...';
    
    try {
        const resp = await fetch(`${URL_API}?op=getPreceptoresAdmin&rol=Directivo`);
        const json = await resp.json();
        
        if (json.status !== 'success') {
            document.getElementById('contenido-dinamico').innerHTML = '<p class="text-danger">Error al cargar preceptores.</p>';
            return;
        }

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>👨‍🏫 Gestión de Preceptores</h5>
                <button onclick="abrirModalPreceptor()" class="btn btn-info">+ Nuevo Preceptor</button>
            </div>
            
            <!-- BUSCADOR DE PRECEPTORES -->
            <div class="card mb-3 shadow-sm">
                <div class="card-body">
                    <div class="row g-2">
                        <div class="col-md-8">
                            <div class="input-group">
                                <span class="input-group-text">🔍</span>
                                <input type="text" 
                                       class="form-control" 
                                       id="buscadorPreceptores" 
                                       placeholder="Buscar por nombre, DNI, email, cursos..." 
                                       onkeyup="filtrarPreceptores()">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <select class="form-select" id="filtroPreceptores" onchange="filtrarPreceptores()">
                                <option value="todos">Todos los campos</option>
                                <option value="nombre">Nombre</option>
                                <option value="dni">DNI</option>
                                <option value="email">Email</option>
                                <option value="cursos">Cursos</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-2 text-muted small">
                        <span id="contadorPreceptores">${json.data.length} preceptores encontrados</span>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive bg-white rounded shadow-sm" style="max-height: 600px; overflow-y: auto;">
                <table class="table table-hover table-bordered mb-0 align-middle" id="tablaPreceptores">
                    <thead class="table-dark text-center" style="position: sticky; top: 0;">
                        <tr>
                            <th>DNI</th>
                            <th>Nombre</th>
                            <th>Contacto</th>
                            <th>Cursos Asignados</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyPreceptores">`;
        
        json.data.forEach((preceptor, index) => {
            // Estructura de datos: [DNI, Nombre, Email_ABC, Celular, Cursos_Asignados]
            const dni = preceptor[0] || '';
            const nombre = preceptor[1] || '';
            const email = preceptor[2] || '';
            const celular = preceptor[3] || '';
            const cursos = preceptor[4] || '';
            
            let cursosHTML = cursos || 'Sin cursos asignados';
            if (cursosHTML && cursosHTML !== 'Sin cursos asignados') {
                const cursosArray = cursosHTML.split(', ');
                cursosHTML = cursosArray.map(curso => 
                    `<span class="badge bg-primary me-1 mb-1" style="font-size: 0.8em">${curso}</span>`
                ).join('');
            }
            
        html += `
            <tr class="fila-preceptor" 
                data-dni="${dni}" 
                data-nombre="${nombre.toLowerCase()}" 
                data-email="${email.toLowerCase()}" 
                data-cursos="${cursos.toLowerCase()}"
                title="${tooltipText}">
                <td>${dni}</td>
                <td class="fw-bold">${nombre}</td>
                <td>
                    <small>
                        <a href="mailto:${email}">${email}</a><br>
                        ${celular || 'Sin teléfono'}
                    </small>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        ${contadorCursos > 0 ? `<span class="badge bg-info me-2">${contadorCursos}</span>` : ''}
                        <small>${cursosHTML}</small>
                    </div>
                </td>
                <td class="text-center" style="width: 180px;">
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="abrirModalAsignarCursos(${index})" title="Asignar Cursos">🏫</button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editarPreceptor(${index})" title="Editar">✏️</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="borrarPreceptor('${dni}', '${email}')" title="Borrar">🗑️</button>
                </td>
            </tr>`;
        });
        
        html += `</tbody></table></div>`;
        
        // Agregar modales
        html += renderModalPreceptorHTML();
        html += renderModalAsignarCursosHTML();
        
        document.getElementById('contenido-dinamico').innerHTML = html;
        
    } catch (e) {
        console.error('Error cargando preceptores:', e);
        document.getElementById('contenido-dinamico').innerHTML = '<p class="text-danger">Error de conexión.</p>';
    }
}

// FUNCIÓN DE FILTRADO
function filtrarPreceptores() {
    const busqueda = document.getElementById('buscadorPreceptores').value.toLowerCase();
    const filtro = document.getElementById('filtroPreceptores').value;
    const filas = document.querySelectorAll('#tbodyPreceptores tr.fila-preceptor');
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
                case 'cursos':
                    mostrar = fila.dataset.cursos.includes(busqueda);
                    break;
                case 'todos':
                    mostrar = fila.dataset.nombre.includes(busqueda) || 
                              fila.dataset.dni.includes(busqueda) ||
                              fila.dataset.email.includes(busqueda) ||
                              fila.dataset.cursos.includes(busqueda);
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
    
    document.getElementById('contadorPreceptores').innerText = `${contador} preceptores encontrados`;
}

// MODAL PARA NUEVO/EDITAR PRECEPTOR
function abrirModalPreceptor() {
    document.getElementById('modalTitlePreceptor').innerText = "Nuevo Preceptor";
    document.getElementById('formPreceptor').reset();
    document.getElementById('accion_preceptor').value = "crear";
    document.getElementById('preceptor_dni').disabled = false;
    document.getElementById('preceptor_email').disabled = false;
    document.getElementById('preceptor_dni_orig').value = '';
    document.getElementById('preceptor_email_orig').value = '';
    
    const modalEl = document.getElementById('modalPreceptor');
    if (modalEl) {
        new bootstrap.Modal(modalEl).show();
    }
}

function editarPreceptor(index) {
    const filas = document.querySelectorAll('#tbodyPreceptores tr.fila-preceptor');
    const fila = filas[index];
    
    // Obtener datos de la fila
    const dni = fila.dataset.dni;
    const nombre = fila.querySelector('td:nth-child(2)').textContent.trim();
    const email = fila.dataset.email;
    
    // Obtener celular (tercera celda, segunda línea)
    const contactoCell = fila.querySelector('td:nth-child(3)');
    const contactoHTML = contactoCell.innerHTML;
    const celularMatch = contactoHTML.match(/<br>(.*?)<\/small>/);
    const celular = celularMatch ? celularMatch[1].replace('Sin teléfono', '').trim() : '';
    
    document.getElementById('modalTitlePreceptor').innerText = "Editar Preceptor";
    document.getElementById('accion_preceptor').value = "editar";
    document.getElementById('preceptor_dni_orig').value = dni;
    document.getElementById('preceptor_email_orig').value = email;
    document.getElementById('preceptor_dni').value = dni;
    document.getElementById('preceptor_dni').disabled = true;
    document.getElementById('preceptor_nombre').value = nombre;
    document.getElementById('preceptor_email').value = email;
    document.getElementById('preceptor_email').disabled = true;
    document.getElementById('preceptor_celular').value = celular;
    
    const modalEl = document.getElementById('modalPreceptor');
    if (modalEl) {
        new bootstrap.Modal(modalEl).show();
    }
}

async function guardarPreceptor() {
    const btn = document.getElementById('btnGuardarPreceptor');
    btn.disabled = true;
    btn.innerText = "Guardando...";
    
    const datos = {
        op: 'administrarPreceptor',
        accion: document.getElementById('accion_preceptor').value,
        dni: document.getElementById('preceptor_dni').value,
        nombre: document.getElementById('preceptor_nombre').value,
        email: document.getElementById('preceptor_email').value,
        celular: document.getElementById('preceptor_celular').value,
        dniOriginal: document.getElementById('preceptor_dni_orig').value,
        emailOriginal: document.getElementById('preceptor_email_orig').value
    };
    
    try {
        const response = await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify(datos) 
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            const modalEl = document.getElementById('modalPreceptor');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) {
                modal.hide();
            }
            alert("✅ Preceptor guardado correctamente");
            verPreceptores(); // Recargar la vista
        } else {
            throw new Error(result.message || 'Error al guardar');
        }
        
    } catch (e) {
        alert("Error al guardar: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Guardar";
    }
}

async function borrarPreceptor(dni, email) {
    if (!confirm(`¿Seguro que deseas eliminar al preceptor con DNI ${dni}?`)) return;
    
    try {
        const response = await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify({ 
                op: 'administrarPreceptor', 
                accion: 'borrar', 
                dni: dni, 
                email: email 
            }) 
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert("✅ Preceptor eliminado correctamente");
            verPreceptores(); // Recargar la vista
        } else {
            throw new Error(result.message || 'Error al eliminar');
        }
        
    } catch (e) {
        alert("Error al eliminar: " + e.message);
    }
}

// MODAL PARA ASIGNAR CURSOS
async function abrirModalAsignarCursos(index) {
    const filas = document.querySelectorAll('#tbodyPreceptores tr.fila-preceptor');
    const fila = filas[index];
    
    const dni = fila.dataset.dni;
    const nombre = fila.querySelector('td:nth-child(2)').textContent.trim();
    const cursosActuales = fila.dataset.cursos;
    
    document.getElementById('asignar_preceptor_dni').value = dni;
    document.getElementById('asignar_preceptor_nombre').value = nombre;
    document.getElementById('span_nombre_preceptor').innerText = nombre;
    
    // Cargar cursos disponibles desde Materias
    const select = document.getElementById('cursos_disponibles');
    select.innerHTML = '<option>Cargando cursos...</option>';
    
    const modalEl = document.getElementById('modalAsignarCursos');
    if (modalEl) {
        new bootstrap.Modal(modalEl).show();
    }
    
    try {
        const resp = await fetch(`${URL_API}?op=getCursosDisponibles&rol=Directivo`);
        const json = await resp.json();
        
        if (json.status !== 'success') {
            select.innerHTML = `<option>Error al cargar cursos: ${json.message || 'Error desconocido'}</option>`;
            return;
        }
        
        if (json.data.length === 0) {
            select.innerHTML = '<option>No hay cursos disponibles</option>';
            return;
        }
        
        let html = '';
        const cursosArray = cursosActuales ? cursosActuales.split(',').map(c => c.trim()) : [];
        
        json.data.forEach(curso => {
            const cursoTrimmed = curso.trim();
            const selected = cursosArray.some(c => c.toLowerCase() === cursoTrimmed.toLowerCase()) ? 'selected' : '';
            const displayText = `${cursoTrimmed}`;
            
            html += `<option value="${cursoTrimmed}" ${selected}>${displayText}</option>`;
        });
        
        select.innerHTML = html;
        
        // Hacerlo selección múltiple
        select.setAttribute('multiple', 'multiple');
        select.size = Math.min(10, json.data.length);
        
        // Cargar información adicional de los cursos
        cargarInfoCursosAdicional(json.data, cursosArray);
        
    } catch (e) {
        console.error('Error cargando cursos:', e);
        select.innerHTML = '<option>Error al cargar cursos. Intenta nuevamente.</option>';
    }
}

// NUEVA FUNCIÓN: CARGAR INFORMACIÓN ADICIONAL DE CURSOS
async function cargarInfoCursosAdicional(cursosDisponibles, cursosAsignados) {
    try {
        const resp = await fetch(`${URL_API}?op=getInfoCursos&rol=Directivo`);
        const json = await resp.json();
        
        if (json.status === 'success') {
            const container = document.getElementById('infoCursosContainer');
            if (container) {
                let html = '<h6 class="mt-3 mb-2">📊 Información de Cursos</h6>';
                html += '<div class="accordion" id="accordionCursos">';
                
                json.data.forEach((curso, index) => {
                    const isAssigned = cursosAsignados.some(c => c.toLowerCase() === curso.nombre.toLowerCase());
                    const badgeClass = isAssigned ? 'bg-success' : 'bg-secondary';
                    
                    html += `
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                                        data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
                                    <span class="badge ${badgeClass} me-2">${isAssigned ? '✓' : '○'}</span>
                                    ${curso.nombre}
                                    <small class="text-muted ms-2">(${curso.totalMaterias} materias)</small>
                                </button>
                            </h2>
                            <div id="collapse${index}" class="accordion-collapse collapse" data-bs-parent="#accordionCursos">
                                <div class="accordion-body">
                                    ${curso.tienePreceptor ? 
                                        `<p><strong>Preceptor actual:</strong> ${curso.preceptores.join(', ')}</p>` : 
                                        '<p class="text-warning">⚠️ Sin preceptor asignado</p>'
                                    }
                                    <p><strong>Materias:</strong></p>
                                    <ul class="list-unstyled">
                                        ${curso.materias.map(m => 
                                            `<li class="mb-1">
                                                <span class="badge bg-info me-1">${m.nombre}</span>
                                                <small>${m.docente || 'Sin docente'}</small>
                                            </li>`
                                        ).join('')}
                                    </ul>
                                </div>
                            </div>
                        </div>`;
                });
                
                html += '</div>';
                container.innerHTML = html;
            }
        }
    } catch (e) {
        console.log('No se pudo cargar información adicional de cursos:', e);
    }
}

async function guardarAsignacionCursos() {
    const btn = document.getElementById('btnGuardarCursos');
    btn.disabled = true;
    btn.innerText = "Asignando...";
    
    const select = document.getElementById('cursos_disponibles');
    const cursosSeleccionados = Array.from(select.selectedOptions).map(option => option.value);
    
    const datos = {
        op: 'asignarCursosPreceptor',
        dniPreceptor: document.getElementById('asignar_preceptor_dni').value,
        cursos: cursosSeleccionados
    };
    
    try {
        const response = await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify(datos) 
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            const modalEl = document.getElementById('modalAsignarCursos');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) {
                modal.hide();
            }
            alert("✅ Cursos asignados correctamente");
            verPreceptores(); // Recargar la vista
        } else {
            throw new Error(result.message || 'Error al asignar cursos');
        }
        
    } catch (e) {
        alert("Error al asignar cursos: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Guardar Asignación";
    }
}

// MODALES HTML
function renderModalPreceptorHTML() {
    return `
    <div class="modal fade" id="modalPreceptor" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-info text-white">
            <h5 class="modal-title" id="modalTitlePreceptor">Preceptor</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="formPreceptor">
                <input type="hidden" id="accion_preceptor">
                <input type="hidden" id="preceptor_dni_orig">
                <input type="hidden" id="preceptor_email_orig">
                
                <div class="mb-3">
                    <label class="form-label">DNI</label>
                    <input type="number" id="preceptor_dni" class="form-control" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Nombre Completo</label>
                    <input type="text" id="preceptor_nombre" class="form-control" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Email ABC</label>
                    <input type="email" id="preceptor_email" class="form-control" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Celular</label>
                    <input type="text" id="preceptor_celular" class="form-control" placeholder="Ej: 1134567890">
                </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-info" id="btnGuardarPreceptor" onclick="guardarPreceptor()">Guardar</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderModalAsignarCursosHTML() {
    return `
    <div class="modal fade" id="modalAsignarCursos" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-warning">
            <h5 class="modal-title text-dark">Asignar Cursos a Preceptor</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6">
                <p>Preceptor: <b><span id="span_nombre_preceptor"></span></b></p>
                <input type="hidden" id="asignar_preceptor_dni">
                <input type="hidden" id="asignar_preceptor_nombre">
                
                <div class="mb-3">
                    <label class="form-label">Seleccionar Cursos:</label>
                    <select id="cursos_disponibles" class="form-select" multiple>
                        <!-- Los cursos se cargarán dinámicamente -->
                    </select>
                    <div class="form-text">
                        <small>Mantén presionada la tecla Ctrl (Cmd en Mac) para seleccionar múltiples cursos.</small>
                    </div>
                </div>
                
                <div class="d-grid">
                  <button type="button" class="btn btn-warning" id="btnGuardarCursos" onclick="guardarAsignacionCursos()">
                    💾 Guardar Asignación de Cursos
                  </button>
                </div>
              </div>
              
              <div class="col-md-6">
                <div id="infoCursosContainer" style="max-height: 400px; overflow-y: auto;">
                  <!-- Aquí se cargará la información de los cursos -->
                </div>
              </div>
            </div>
            
            <div class="alert alert-info mt-3">
              <small>
                <strong>💡 Consejo:</strong> Puedes asignar múltiples cursos al mismo preceptor. 
                Los cursos se obtienen de la pestaña "Materias" (columna D).
              </small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          </div>
        </div>
      </div>
    </div>`;
}


