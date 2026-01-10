// ============================================================================
// ARCHIVO: Core.js
// DESCRIPCIÓN: Configuración, Login y Router (Dashboard)
// ============================================================================

// --- TU URL DE GOOGLE APPS SCRIPT ---
const URL_API = "https://script.google.com/macros/s/AKfycbyTGnoS8hevr6k7pXE16p7KtcQxYrYP0yc11yJoJyvfX8Z7pEKJ5ZYymJ--IBcoVqUB/exec"; 

// --- VARIABLES GLOBALES ---
let usuarioActual = null;
let baseDatosAlumnos = []; 
let baseDatosDocentes = []; 
let baseDatosPreceptores = [];

// ==========================================
// SISTEMA DE LOGIN Y DASHBOARD
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
        // Por defecto cargar el primer módulo o dejar vacío
    }

    // --- MENÚ PRECEPTOR ---
    if (rol === 'preceptor') {
        menu.innerHTML += `
            <button class="list-group-item list-group-item-action" onclick="iniciarModuloPreceptor()">📝 Tomar Asistencia</button>
            <button class="list-group-item list-group-item-action bg-info text-white" onclick="verContactosDocentes()">📞 Contactar Docentes</button>
        `;
        iniciarModuloPreceptor(); 
    }

    // --- MENÚ DOCENTE ---
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

// UTILIDAD GLOBAL
function calcularEdad(fechaString) {
    if (!fechaString) return "-";
    const hoy = new Date();
    const nacimiento = new Date(fechaString);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) { edad--; }
    return isNaN(edad) ? "-" : edad + " años";
}



// ============================================================================
// ARCHIVO: Templates.js
// DESCRIPCIÓN: Funciones que retornan HTML para Modales y UI
// ============================================================================

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
                    <option value="Titular" selected>Titular</option>
                    <option value="Provisional">Provisional</option>
                    <option value="Interino">Interino</option>
                    <option value="Suplencia">Suplencia</option>
                </select>
                <div id="suplente_info" class="d-none alert alert-warning mt-2">
                    <small>⚠️ La materia aparecerá marcada como suplencia.</small>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Seleccionar Materia:</label>
                <select id="sel_materia_asig" class="form-select" size="8"></select>
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
                <input type="hidden" id="accion_preceptor"><input type="hidden" id="dni_original_preceptor">
                <div class="mb-3"><label>DNI</label><input type="number" class="form-control" id="prec_dni" required></div>
                <div class="mb-3"><label>Nombre y Apellido</label><input type="text" class="form-control" id="prec_nombre" required></div>
                <div class="mb-3"><label>Email ABC</label><input type="email" class="form-control" id="prec_email"></div>
                <div class="mb-3"><label>Celular</label><input type="text" class="form-control" id="prec_celular"></div>
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
            <div class="alert alert-info small">Mantén presionada <b>Ctrl</b> para selección múltiple.</div>
            <div class="mb-3">
                <label>Seleccionar Cursos:</label>
                <select id="cursos_disponibles" class="form-select" multiple size="8"></select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-dark" id="btnGuardarCursos" onclick="guardarAsignacionCursos()">💾 Guardar</button>
          </div>
        </div>
      </div>
    </div>`;
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
            <div id="just_lista" style="max-height: 300px; overflow-y: auto;"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>`;
}



// ============================================================================
// ARCHIVO: Admin_Estudiantes.js
// DESCRIPCIÓN: Módulo Directivo - Gestión de alumnos
// ============================================================================

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
            <div class="card mb-3 shadow-sm">
                <div class="card-body">
                    <div class="row g-2">
                        <div class="col-md-8">
                            <div class="input-group">
                                <span class="input-group-text">🔍</span>
                                <input type="text" class="form-control" id="buscadorEstudiantes" placeholder="Buscar..." onkeyup="filtrarEstudiantes()">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <select class="form-select" id="filtroEstudiantes" onchange="filtrarEstudiantes()">
                                <option value="todos">Todos los campos</option>
                                <option value="nombre">Nombre</option>
                                <option value="dni">DNI</option>
                                <option value="curso">Curso</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-2 text-muted small"><span id="contadorEstudiantes">${json.data.length} estudiantes</span></div>
                </div>
            </div>
            
            <div class="table-responsive bg-white rounded shadow-sm" style="max-height: 600px; overflow-y: auto;">
                <table class="table table-hover table-bordered mb-0 align-middle">
                    <thead class="table-dark text-center" style="position: sticky; top: 0;">
                        <tr><th>DNI</th><th>Nombre</th><th>Edad</th><th>Curso</th><th>Acciones</th></tr>
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
                        <button class="btn btn-sm btn-outline-success me-1" onclick="abrirModalInscripcion(${index})" title="Inscribir">📋</button>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editarEstudiante(${index})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="borrarEstudiante('${fila[0]}', '${fila[3]}')" title="Borrar">🗑️</button>
                    </td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
        html += renderModalHTML() + renderModalInscripcionHTML();
        
        document.getElementById('contenido-dinamico').innerHTML = html;
    } catch (e) {
        console.error(e);
        alert("Error al cargar la lista de estudiantes.");
    }
}

// --- FILTRADO ---
function filtrarEstudiantes() {
    const busqueda = document.getElementById('buscadorEstudiantes').value.toLowerCase();
    const filtro = document.getElementById('filtroEstudiantes').value;
    const filas = document.querySelectorAll('#tbodyEstudiantes tr.fila-estudiante');
    let contador = 0;
    
    filas.forEach(fila => {
        let mostrar = false;
        if (!busqueda) mostrar = true;
        else {
            if(filtro === 'nombre') mostrar = fila.dataset.nombre.includes(busqueda);
            else if(filtro === 'dni') mostrar = fila.dataset.dni.includes(busqueda);
            else if(filtro === 'curso') mostrar = fila.dataset.curso.toLowerCase().includes(busqueda);
            else mostrar = (fila.dataset.nombre.includes(busqueda) || fila.dataset.dni.includes(busqueda) || fila.dataset.curso.toLowerCase().includes(busqueda));
        }
        fila.style.display = mostrar ? '' : 'none';
        if(mostrar) contador++;
    });
    document.getElementById('contadorEstudiantes').innerText = `${contador} estudiantes`;
}

// --- CRUD ---
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
        dniOriginal: document.getElementById('dni_original').value
    };
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        bootstrap.Modal.getInstance(document.getElementById('modalEstudiante')).hide();
        verEstudiantes(); 
    } catch (e) { alert("Error al guardar."); }
}

function abrirModalEstudiante() {
    document.getElementById('modalTitle').innerText = "Nuevo Estudiante";
    document.getElementById('formEstudiante').reset();
    document.getElementById('accion_form').value = "crear";
    new bootstrap.Modal(document.getElementById('modalEstudiante')).show();
}

function editarEstudiante(index) {
    const est = baseDatosAlumnos[index];
    document.getElementById('modalTitle').innerText = "Editar Estudiante";
    document.getElementById('accion_form').value = "editar";
    document.getElementById('dni_original').value = est[0];
    document.getElementById('inp_dni').value = est[0];
    document.getElementById('inp_nombre').value = est[1];
    document.getElementById('inp_curso').value = est[2];
    document.getElementById('inp_email').value = est[3];
    document.getElementById('inp_adulto').value = est[4];
    document.getElementById('inp_tel').value = est[5];
    if(est[6]) document.getElementById('inp_nacimiento').value = new Date(est[6]).toISOString().split('T')[0];
    new bootstrap.Modal(document.getElementById('modalEstudiante')).show();
}

async function borrarEstudiante(dni, email) {
    if(!confirm(`¿Eliminar alumno DNI ${dni}?`)) return;
    try { 
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'administrarEstudiante', accion: 'borrar', dni: dni, email: email }) });
        verEstudiantes(); 
    } catch (e) { alert("Error al eliminar."); }
}

// --- INSCRIPCIÓN ---
async function abrirModalInscripcion(index) {
    const est = baseDatosAlumnos[index]; 
    const dni = est[0];
    document.getElementById('ins_dni_est').value = dni;
    document.getElementById('ins_nombre_est').value = est[1];
    document.getElementById('tituloInscripcion').innerText = `Inscripción: ${est[1]}`;

    const modal = new bootstrap.Modal(document.getElementById('modalInscripcion'));
    modal.show();
    
    const container = document.getElementById('gridMaterias');
    container.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-success"></div><br>Cargando...</div>';

    try {
        const respMat = await fetch(`${URL_API}?op=getMaterias&rol=Directivo`);
        const jsonMat = await respMat.json();
        let opciones = `<option value="">-- Seleccionar --</option>`;
        jsonMat.data.forEach(m => { opciones += `<option value="${m[1]} (${m[3]})">${m[1]} (${m[3]})</option>`; });

        let htmlForm = `<h6 class="bg-light p-2">Materias Regulares</h6><div class="row g-2 mb-3">`;
        for(let i=1; i<=12; i++) {
            htmlForm += `<div class="col-md-6 d-flex align-items-center mb-1"><span class="me-2 fw-bold text-muted small" style="width:20px">${i}.</span><select id="materia_${i}" class="form-select form-select-sm me-1">${opciones}</select><select id="estado_${i}" class="form-select form-select-sm" style="width:100px"><option value="Cursa">Cursa</option><option value="Recursa">Recursa</option></select></div>`;
        }
        htmlForm += `</div><h6 class="bg-warning bg-opacity-25 p-2">Intensificaciones</h6><div class="row g-2">`;
        for(let j=1; j<=4; j++) {
            htmlForm += `<div class="col-12 d-flex align-items-center mb-1"><span class="me-2 fw-bold text-muted small" style="width:20px">${j}.</span><select id="int_adeuda_${j}" class="form-select form-select-sm me-1">${opciones}</select> en <select id="int_en_${j}" class="form-select form-select-sm ms-1">${opciones}</select></div>`;
        }
        htmlForm += `</div>`;
        container.innerHTML = htmlForm;

        // Cargar datos previos
        const respIns = await fetch(`${URL_API}?op=getInscripcion&rol=Directivo&dni=${dni}`);
        const jsonIns = await respIns.json();
        if(jsonIns.status === 'success') {
            const data = jsonIns.data; 
            for(let i=1; i<=12; i++) {
                if(data[i+1] && data[i+1].includes(' - ')) {
                    const partes = data[i+1].split(' - ');
                    document.getElementById(`materia_${i}`).value = partes[0];
                    document.getElementById(`estado_${i}`).value = partes[1];
                }
            }
            for(let j=1; j<=4; j++) {
                if(data[13+j] && data[13+j].includes(' -> ')) {
                    const partes = data[13+j].split(' -> ');
                    document.getElementById(`int_adeuda_${j}`).value = partes[0];
                    document.getElementById(`int_en_${j}`).value = partes[1];
                }
            }
        }
    } catch (e) { container.innerHTML = '<div class="alert alert-danger">Error cargando formulario.</div>'; }
}

async function guardarInscripcion() {
    const btn = document.getElementById('btnGuardarIns');
    btn.disabled = true; btn.innerText = "Guardando...";
    const datos = { op: 'guardarInscripcion', dni: document.getElementById('ins_dni_est').value, nombre: document.getElementById('ins_nombre_est').value };

    for(let i=1; i<=12; i++) {
        const mat = document.getElementById(`materia_${i}`).value;
        const est = document.getElementById(`estado_${i}`).value;
        datos[`m${i}`] = mat ? `${mat} - ${est}` : ""; 
    }
    for(let j=1; j<=4; j++) {
        const adeuda = document.getElementById(`int_adeuda_${j}`).value;
        const en = document.getElementById(`int_en_${j}`).value;
        datos[`i${j}`] = (adeuda && en) ? `${adeuda} -> ${en}` : "";
    }

    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        bootstrap.Modal.getInstance(document.getElementById('modalInscripcion')).hide();
        alert("Inscripción guardada.");
    } catch (e) { alert("Error al guardar."); } finally { btn.disabled = false; btn.innerText = "Guardar Cambios"; }
}




// ============================================================================
// ARCHIVO: Admin_Docentes.js
// DESCRIPCIÓN: Módulo Directivo - Gestión de Docentes y Asignaciones
// ============================================================================

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
            <div class="card mb-3 shadow-sm">
                <div class="card-body">
                    <div class="input-group">
                        <span class="input-group-text">🔍</span>
                        <input type="text" class="form-control" id="buscadorDocentes" placeholder="Buscar..." onkeyup="filtrarDocentes()">
                    </div>
                    <div class="mt-2 text-muted small"><span id="contadorDocentes">${json.data.length} docentes</span></div>
                </div>
            </div>
            
            <div class="table-responsive bg-white rounded shadow-sm" style="max-height: 600px; overflow-y: auto;">
                <table class="table table-hover table-bordered mb-0 align-middle">
                    <thead class="table-dark text-center">
                        <tr><th>DNI</th><th>Nombre</th><th>Contacto</th><th>Materias Asignadas</th><th>Acciones</th></tr>
                    </thead>
                    <tbody id="tbodyDocentes">`;
        
        json.data.forEach((fila, index) => {
            let materiasHTML = fila[4] || '';
            if(materiasHTML.includes('[SUPLANTADO]')) materiasHTML = materiasHTML.replace(/\[SUPLANTADO\]/g, '<span class="badge bg-danger me-1">[SUPLANTADO]</span>');
            if(materiasHTML.includes('[Suplencia]')) materiasHTML = materiasHTML.replace(/\[Suplencia\].*?\(Suplente de: (.*?)\)/g, '<span class="badge bg-warning text-dark me-1" title="Suplente de: $1">[Suplente]</span>');
            
            html += `
                <tr class="fila-docente" data-dni="${fila[0]}" data-nombre="${fila[1].toLowerCase()}" data-materias="${(fila[4] || '').toLowerCase()}">
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
        html += `</tbody></table></div>` + renderModalDocenteHTML() + renderModalAsignacionCompletaHTML();
        document.getElementById('contenido-dinamico').innerHTML = html;
    } catch (e) { console.error(e); alert("Error cargando docentes."); }
}

function filtrarDocentes() {
    const busqueda = document.getElementById('buscadorDocentes').value.toLowerCase();
    const filas = document.querySelectorAll('#tbodyDocentes tr.fila-docente');
    let contador = 0;
    filas.forEach(fila => {
        const mostrar = fila.dataset.nombre.includes(busqueda) || fila.dataset.dni.includes(busqueda) || fila.dataset.materias.includes(busqueda);
        fila.style.display = mostrar ? '' : 'none';
        if(mostrar) contador++;
    });
    document.getElementById('contadorDocentes').innerText = `${contador} docentes`;
}

// --- ASIGNACIÓN DE MATERIAS ---
async function abrirModalAsignacion(index) {
    const doc = baseDatosDocentes[index];
    document.getElementById('asig_dni_docente').value = doc[0];
    document.getElementById('asig_nombre_docente').value = doc[1];
    document.getElementById('span_nombre_docente').innerText = doc[1];
    
    const select = document.getElementById('sel_materia_asig');
    select.innerHTML = '<option>Cargando materias...</option>';
    
    // Evento para mostrar info suplencia
    document.getElementById('tipo_asignacion').onchange = function() {
        const info = document.getElementById('suplente_info');
        if(this.value === 'Suplencia') info.classList.remove('d-none'); else info.classList.add('d-none');
    };

    new bootstrap.Modal(document.getElementById('modalAsignacionCompleta')).show();

    try {
        const resp = await fetch(`${URL_API}?op=getMaterias&rol=Directivo`);
        const json = await resp.json();
        let opts = `<option value="" selected disabled>Selecciona...</option>`;
        
        json.data.forEach(mat => {
            const nombreProfe = mat[4] ? mat[4].toString().trim() : "";
            let estilo = "color: #333;";
            let texto = `${mat[1]} (${mat[3]})`;
            
            if(nombreProfe) {
                texto += ` - ${nombreProfe}`;
                if(mat[5] && mat[5] === 'Suplencia') {
                    estilo = "color: orange; font-weight: bold;";
                    texto += ` [Suplente de: ${mat[6] || ""}]`;
                }
            } else {
                estilo = "color: red; font-weight: bold;";
                texto = `[VACANTE] ${mat[1]} (${mat[3]})`;
            }
            opts += `<option value="${mat[0]}" style="${estilo}">${texto}</option>`;
        });
        select.innerHTML = opts;
    } catch (e) { select.innerHTML = '<option>Error al cargar materias</option>'; }
}

async function guardarAsignacionCompleta() {
    const btn = document.getElementById('btnGuardarAsigCompleta');
    btn.disabled = true; btn.innerText = "Asignando...";
    const datos = {
        op: 'asignarDocenteMateria',
        id_materia: document.getElementById('sel_materia_asig').value,
        dni_docente: document.getElementById('asig_dni_docente').value,
        nombre_docente: document.getElementById('asig_nombre_docente').value,
        tipoAsignacion: document.getElementById('tipo_asignacion').value
    };
    if(!datos.id_materia) { alert("Selecciona una materia."); btn.disabled = false; return; }
    try {
        const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        const res = await resp.json();
        if(res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modalAsignacionCompleta')).hide();
            alert("Asignación correcta.");
            verDocentes();
        } else throw new Error(res.message);
    } catch (e) { alert("Error: " + e.message); } finally { btn.disabled = false; btn.innerText = "Confirmar Asignación"; }
}

// --- CRUD DOCENTE ---
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
    document.getElementById('doc_dni').value = doc[0];
    document.getElementById('doc_nombre').value = doc[1];
    document.getElementById('doc_email').value = doc[2];
    document.getElementById('doc_cel').value = doc[3];
    new bootstrap.Modal(document.getElementById('modalDocente')).show();
}

async function guardarDocente() {
    const datos = {
        op: 'administrarDocente',
        accion: document.getElementById('accion_doc').value,
        dni: document.getElementById('doc_dni').value,
        nombre: document.getElementById('doc_nombre').value,
        email: document.getElementById('doc_email').value,
        celular: document.getElementById('doc_cel').value,
        dniOriginal: document.getElementById('doc_dni_orig').value
    };
    try { await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
    bootstrap.Modal.getInstance(document.getElementById('modalDocente')).hide(); verDocentes(); } catch (e) { alert("Error."); }
}

async function borrarDocente(dni, email) {
    if(!confirm("¿Eliminar docente?")) return;
    try { await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'administrarDocente', accion: 'borrar', dni: dni, email: email }) }); verDocentes(); } catch (e) { alert("Error."); }
}




// ============================================================================
// ARCHIVO: Admin_Preceptores.js
// DESCRIPCIÓN: Módulo Directivo - Gestión de Preceptores
// ============================================================================

async function verPreceptores() {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = '<div class="spinner-border text-primary"></div> Cargando Preceptores...';
    try {
        const resp = await fetch(`${URL_API}?op=getPreceptoresAdmin&rol=Directivo`);
        const json = await resp.json();
        if (json.status !== 'success') throw new Error(json.message);

        baseDatosPreceptores = json.data; 

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>Gestión de Preceptores</h5>
                <button onclick="abrirModalPreceptor()" class="btn btn-success">+ Nuevo Preceptor</button>
            </div>
            <div class="table-responsive bg-white rounded shadow-sm">
                <table class="table table-hover table-bordered mb-0 align-middle">
                    <thead class="table-dark text-center">
                        <tr><th>DNI</th><th>Nombre</th><th>Contacto</th><th>Cursos</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>`;
        
        json.data.forEach((p, index) => {
            let cursosHTML = p.cursos ? p.cursos.split(',').map(c => `<span class="badge bg-info text-dark me-1">${c.trim()}</span>`).join('') : '<span class="text-muted small">Sin asignar</span>';
            html += `
                <tr>
                    <td>${p.dni}</td>
                    <td class="fw-bold">${p.nombre}</td>
                    <td><small>${p.email}<br>${p.celular || ''}</small></td>
                    <td>${cursosHTML}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="abrirModalCursosPreceptor(${index})" title="Asignar Cursos">📚</button>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editarPreceptor(${index})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="borrarPreceptor('${p.dni}', '${p.email}')" title="Borrar">🗑️</button>
                    </td>
                </tr>`;
        });
        html += `</tbody></table></div>` + renderModalPreceptorHTML() + renderModalCursosPreceptorHTML();
        contenedor.innerHTML = html;
    } catch (e) { alert("Error: " + e.message); }
}

// --- CRUD ---
function abrirModalPreceptor() {
    document.getElementById('formPreceptor').reset();
    document.getElementById('tituloModalPreceptor').innerText = "Nuevo Preceptor";
    document.getElementById('accion_preceptor').value = "crear";
    new bootstrap.Modal(document.getElementById('modalPreceptor')).show();
}

function editarPreceptor(index) {
    const p = baseDatosPreceptores[index];
    document.getElementById('tituloModalPreceptor').innerText = "Editar Preceptor";
    document.getElementById('accion_preceptor').value = "editar";
    document.getElementById('dni_original_preceptor').value = p.dni;
    document.getElementById('prec_dni').value = p.dni;
    document.getElementById('prec_nombre').value = p.nombre;
    document.getElementById('prec_email').value = p.email;
    document.getElementById('prec_celular').value = p.celular;
    new bootstrap.Modal(document.getElementById('modalPreceptor')).show();
}

async function guardarPreceptor() {
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
        await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        bootstrap.Modal.getInstance(document.getElementById('modalPreceptor')).hide();
        verPreceptores();
    } catch (e) { alert("Error al guardar."); }
}

async function borrarPreceptor(dni) {
    if(!confirm(`¿Eliminar preceptor?`)) return;
    try { await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'administrarPreceptor', accion: 'borrar', dni: dni }) }); verPreceptores(); } catch (e) { alert("Error."); }
}

// --- ASIGNACIÓN CURSOS ---
async function abrirModalCursosPreceptor(index) {
    const p = baseDatosPreceptores[index];
    document.getElementById('tituloModalCursos').innerText = `Cursos de: ${p.nombre}`;
    document.getElementById('dni_curso_preceptor').value = p.dni;
    const select = document.getElementById('cursos_disponibles');
    select.innerHTML = '<option>Cargando...</option>';
    new bootstrap.Modal(document.getElementById('modalCursosPreceptor')).show();

    try {
        const resp = await fetch(`${URL_API}?op=getCursosDisponibles&rol=Directivo`);
        const json = await resp.json();
        select.innerHTML = '';
        const asignados = p.cursos ? p.cursos.split(', ').map(c => c.trim()) : [];
        json.data.forEach(c => {
            select.innerHTML += `<option value="${c}" ${asignados.includes(c) ? 'selected' : ''}>${c}</option>`;
        });
    } catch (e) { select.innerHTML = '<option>Error</option>'; }
}

async function guardarAsignacionCursos() {
    const dni = document.getElementById('dni_curso_preceptor').value;
    const select = document.getElementById('cursos_disponibles');
    const seleccionados = Array.from(select.selectedOptions).map(o => o.value);
    
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'asignarCursosPreceptor', dniPreceptor: dni, cursos: seleccionados }) });
        bootstrap.Modal.getInstance(document.getElementById('modalCursosPreceptor')).hide();
        verPreceptores();
    } catch (e) { alert("Error al asignar."); }
}



// ============================================================================
// ARCHIVO: Modulo_Preceptor.js
// DESCRIPCIÓN: Panel de Preceptor (Asistencia, Justificación, Contactos)
// ============================================================================

async function iniciarModuloPreceptor() {
    const contenedor = document.getElementById('contenido-dinamico');
    contenedor.innerHTML = `
        <div class="mb-4"><h3>Hola, ${usuarioActual.nombre} 👋</h3><p class="text-muted">Selecciona un curso.</p></div>
        <div id="lista-cursos-preceptor" class="row g-3"><div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div></div>`;

    try {
        const resp = await fetch(`${URL_API}?op=getCursosDisponibles&rol=Preceptor`);
        const json = await resp.json();
        const divCursos = document.getElementById('lista-cursos-preceptor');
        divCursos.innerHTML = ''; 

        if (json.status === 'success' && json.data.length > 0) {
            const misCursos = (usuarioActual.cursos || "").split(',').map(c => c.trim());
            const propios = [], otros = [];
            json.data.forEach(c => misCursos.includes(c) ? propios.push(c) : otros.push(c));

            if (propios.length > 0) {
                divCursos.innerHTML += `<div class="col-12 mt-2"><h6 class="text-primary fw-bold border-bottom pb-2">⭐ Mis Cursos</h6></div>`;
                propios.forEach(c => divCursos.innerHTML += `<div class="col-6 col-md-4 col-lg-3"><button class="btn btn-primary w-100 py-4 shadow-sm fw-bold fs-5" onclick="cargarAsistencia('${c}')">${c}</button></div>`);
            }
            if (otros.length > 0) {
                divCursos.innerHTML += `<div class="col-12 mt-5"><h6 class="text-muted border-bottom pb-2">📂 Otros Cursos</h6></div>`;
                otros.forEach(c => divCursos.innerHTML += `<div class="col-6 col-md-4 col-lg-3"><button class="btn btn-outline-secondary w-100 py-2" onclick="cargarAsistencia('${c}')">${c}</button></div>`);
            }
        } else divCursos.innerHTML = '<div class="alert alert-warning">No hay cursos.</div>';
    } catch (e) { console.error(e); }
}

// Nota: cargarAsistencia faltaba en tu código original, se asume que existe o usa esta lógica
async function cargarAsistencia(curso) {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="spinner-border text-primary"></div> Cargando ${curso}...`;
    // Simulamos la carga visualizando el HTML base y luego inyectando datos
    const fechaHoy = new Date().toISOString().split('T')[0];
    document.getElementById('contenido-dinamico').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h3>Curso: ${curso}</h3>
            <div class="d-flex align-items-center">
                <input type="date" id="fechaAsistencia" class="form-control me-2" value="${fechaHoy}">
                <button class="btn btn-warning" onclick="iniciarModuloPreceptor()">Volver</button>
            </div>
        </div>
        <input type="hidden" id="selCurso" value="${curso}">
        <div id="zonaPreceptor"><div class="spinner-border text-primary"></div> Obteniendo listado...</div>
        ${renderModalJustificacionHTML()}
    `;
    
    // Obtenemos datos reales
    try {
        const resp = await fetch(`${URL_API}?op=getDataPreceptor&rol=Preceptor`);
        const json = await resp.json();
        baseDatosAlumnos = json.data; // Actualizamos la DB local
        renderTablaPreceptor();
    } catch(e) { alert("Error cargando alumnos"); }
}

function renderTablaPreceptor() {
    const curso = document.getElementById('selCurso').value;
    const lista = baseDatosAlumnos.filter(obj => String(obj.data[2]) === curso).sort((a,b) => String(a.data[1]).localeCompare(b.data[1]));
    
    if(lista.length === 0) {
        document.getElementById('zonaPreceptor').innerHTML = '<div class="alert alert-warning">No hay alumnos.</div>';
        return;
    }

    let html = `<div class="card shadow-sm"><table class="table align-middle table-striped mb-0 text-center"><thead class="table-dark"><tr>
        <th class="text-start">Estudiante</th><th title="Faltas">F</th><th style="background:#d4edda; color:green;">P</th><th style="background:#f8d7da; color:red;">A</th><th style="background:#fff3cd; color:#856404;">T</th><th style="background:#e2e3e5; color:#383d41;">EF</th><th>Acción</th>
        </tr></thead><tbody>`;
    
    lista.forEach(item => {
        const alu = item.data; 
        const st = item.stats; 
        let total = parseFloat(st.total);
        let totalStr = Number.isInteger(total) ? total : total.toFixed(2).replace('.00','');
        let alerta = total >= 10 ? `<span class="badge bg-danger ms-2">⚠️ ${totalStr}</span>` : (total > 0 ? `<span class="badge bg-light text-dark border ms-2">${totalStr}</span>` : "");

        html += `<tr>
            <td class="text-start fw-bold">${alu[1]} ${alerta}</td>
            <td><small>${totalStr}</small></td>
            <td style="background:#d4edda;"><input type="radio" name="e_${alu[0]}" value="P" checked style="transform: scale(1.3);"></td>
            <td style="background:#f8d7da;"><input type="radio" name="e_${alu[0]}" value="A" style="transform: scale(1.3);"></td>
            <td style="background:#fff3cd;"><input type="radio" name="e_${alu[0]}" value="T" style="transform: scale(1.3);"></td>
            <td style="background:#e2e3e5;"><input type="radio" name="e_${alu[0]}" value="EF" style="transform: scale(1.3);"></td>
            <td><button class="btn btn-sm btn-outline-primary" onclick="abrirModalJustificar('${alu[0]}', '${alu[1]}')">⚖️</button></td>
        </tr>`;
    });
    html += `</tbody></table><div class="p-3 bg-light border-top"><button onclick="guardarAsis()" class="btn btn-success w-100 btn-lg shadow">✅ Guardar Asistencia</button></div></div>`;
    document.getElementById('zonaPreceptor').innerHTML = html;
}

async function guardarAsis() {
    const inputs = document.querySelectorAll('input[type="radio"]:checked');
    const fecha = document.getElementById('fechaAsistencia').value;
    if (!fecha) return alert("Selecciona fecha.");
    
    let lista = [];
    inputs.forEach(inp => lista.push({ dni: inp.name.split('_')[1], estado: inp.value }));
    
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'guardarAsistenciaMasiva', lista: lista, preceptor: usuarioActual.nombre, fecha: fecha })});
        alert(`¡Asistencia del ${fecha} guardada!`);
        iniciarModuloPreceptor();
    } catch(e) { alert("Error al guardar."); }
}

// --- JUSTIFICACIÓN ---
async function abrirModalJustificar(dni, nombre) {
    document.getElementById('just_nombre').innerText = nombre;
    document.getElementById('just_lista').innerHTML = '<div class="spinner-border spinner-border-sm"></div> Buscando faltas...';
    new bootstrap.Modal(document.getElementById('modalJustificar')).show();
    
    try {
        const resp = await fetch(`${URL_API}?op=getHistorialAlumno&rol=Preceptor&dni=${dni}`);
        const json = await resp.json();
        let html = `<ul class="list-group">`;
        if(json.data.length === 0) html = '<div class="alert alert-success">Sin faltas injustificadas.</div>';
        else {
            json.data.forEach(item => {
                let badge = item.estado === 'A' ? '<span class="badge bg-danger">Ausente</span>' : (item.estado === 'T' ? '<span class="badge bg-warning text-dark">Tarde</span>' : '<span class="badge bg-secondary">EF</span>');
                html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                    <div><strong>${item.fecha}</strong> ${badge}</div>
                    <button class="btn btn-sm btn-outline-success" onclick="confirmarJustificacion(${item.fila}, '${dni}')">Justificar ✅</button>
                </li>`;
            });
            html += `</ul>`;
        }
        document.getElementById('just_lista').innerHTML = html;
    } catch(e) { document.getElementById('just_lista').innerHTML = "Error."; }
}

async function confirmarJustificacion(fila, dni) {
    if(!confirm("¿Confirmar justificación?")) return;
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'justificarFalta', fila: fila })});
        alert("Justificada.");
        bootstrap.Modal.getInstance(document.getElementById('modalJustificar')).hide();
    } catch(e) { alert("Error."); }
}

// --- CONTACTOS ---
async function verContactosDocentes() {
    const cont = document.getElementById('contenido-dinamico');
    cont.innerHTML = '<div class="spinner-border text-info"></div> Cargando Directorio...';
    try {
        const resp = await fetch(`${URL_API}?op=getDocentes&rol=Preceptor`);
        const json = await resp.json();
        if (json.status !== 'success') return cont.innerHTML = '<p class="text-danger">Error de permisos.</p>';

        let html = `
            <h5 class="mb-3">📞 Directorio de Docentes</h5>
            <div class="input-group mb-3"><span class="input-group-text">🔍</span><input type="text" class="form-control" id="buscadorContactos" placeholder="Buscar..." onkeyup="filtrarContactos()"></div>
            <div class="table-responsive bg-white rounded shadow-sm"><table class="table table-hover table-striped mb-0 align-middle"><thead class="table-dark"><tr><th>Docente</th><th>Email</th><th>Contacto Rápido</th></tr></thead><tbody id="tbodyContactos">`;
        
        json.data.forEach(d => {
            let cel = d[3] ? d[3].toString().replace(/[^0-9]/g, '') : '';
            let btnWsp = cel.length > 6 ? `<a href="https://wa.me/549${cel}" target="_blank" class="btn btn-success btn-sm text-white">📱 WhatsApp</a>` : `<span class="text-muted small">Sin celular</span>`;
            html += `<tr class="fila-contacto" data-nombre="${d[1].toLowerCase()}" data-email="${d[2].toLowerCase()}"><td class="fw-bold">${d[1]}</td><td><a href="mailto:${d[2]}">${d[2]}</a></td><td>${btnWsp}</td></tr>`;
        });
        html += `</tbody></table></div>`;
        cont.innerHTML = html;
    } catch (e) { cont.innerHTML = '<p class="text-danger">Error.</p>'; }
}

function filtrarContactos() {
    const q = document.getElementById('buscadorContactos').value.toLowerCase();
    document.querySelectorAll('.fila-contacto').forEach(row => {
        row.style.display = (row.dataset.nombre.includes(q) || row.dataset.email.includes(q)) ? '' : 'none';
    });
}




// ============================================================================
// ARCHIVO: Modulo_Docente.js
// DESCRIPCIÓN: Panel Docente - Notas, Asistencias y Reportes
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

// --- RENDERIZADORES INTERNOS ---
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

// --- LOGICA GUARDADO DOCENTE ---
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

// Cálculo en tiempo real
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
    // Dispara el evento input manualmente o recorre los campos
    alert('El cálculo ya es automático al escribir. Revisa los valores finales.');
}

async function contactarPreceptor() {
    try {
        const resp = await fetch(`${URL_API}?op=getPreceptores&rol=Docente`);
        const json = await resp.json();
        let html = '<ul class="list-group">';
        json.data.forEach(p => html += `<li class="list-group-item">${p.nombre} (${p.email}) <a href="mailto:${p.email}" class="btn btn-sm btn-primary float-end">✉️</a></li>`);
        html += '</ul>';
        // Mostrar en un modal simple (puedes reutilizar uno existente o crear uno dinámico)
        const modal = new bootstrap.Modal(document.createElement('div')); 
        modal._element.innerHTML = `<div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Preceptores</h5></div><div class="modal-body">${html}</div></div></div>`;
        modal.show();
    } catch(e) { alert('Error.'); }
}

function verMisDatosDocente() {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="card shadow-sm p-4"><h3>👤 ${usuarioActual.nombre}</h3><p>Rol: ${usuarioActual.rol}</p><button class="btn btn-secondary" onclick="iniciarModuloDocente()">Volver</button></div>`;
}
