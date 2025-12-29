// ============================================================================
// ARCHIVO: script.js (FINAL CON INTENSIFICACIÓN DOBLE)
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
        `;
    }

    // --- MENÚ PRECEPTOR ---
    if (rol === 'preceptor') {
        iniciarModuloPreceptor(); 
    }

    // --- BOTÓN SALIR ---
    menu.innerHTML += `<button class="list-group-item list-group-item-action text-danger mt-3" onclick="location.reload()">Cerrar Sesión</button>`;
}

// ==========================================
// 2. MÓDULO DIRECTIVO: ESTUDIANTES
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
            <div class="table-responsive bg-white rounded shadow-sm" style="max-height: 600px; overflow-y: auto;">
                <table class="table table-hover table-bordered mb-0 align-middle">
                    <thead class="table-dark text-center" style="position: sticky; top: 0;">
                        <tr>
                            <th>DNI</th>
                            <th>Nombre</th>
                            <th>Edad</th>
                            <th>Curso</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        json.data.forEach((fila, index) => {
            const edad = calcularEdad(fila[6]);
            html += `
                <tr>
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
        
        // Inyectamos los HTML de los Modales al final
        html += renderModalHTML(); 
        html += renderModalInscripcionHTML();
        
        document.getElementById('contenido-dinamico').innerHTML = html;
    } catch (e) {
        console.error(e);
        alert("Error al cargar la lista de estudiantes.");
    }
}

// --- LÓGICA DE INSCRIPCIÓN (MATERIAS + INTENSIFICACIÓN DOBLE) ---

async function abrirModalInscripcion(index) {
    const est = baseDatosAlumnos[index]; 
    const dni = est[0];
    const nombre = est[1];
    
    document.getElementById('ins_dni_est').value = dni;
    document.getElementById('ins_nombre_est').value = nombre;
    document.getElementById('tituloInscripcion').innerText = `Inscripción: ${nombre}`;

    // Mostrar Modal
    const modal = new bootstrap.Modal(document.getElementById('modalInscripcion'));
    modal.show();
    
    const container = document.getElementById('gridMaterias');
    container.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-success"></div><br>Cargando materias y datos previos...</div>';

    try {
        // 1. Traer Materias para llenar los desplegables
        const respMat = await fetch(`${URL_API}?op=getMaterias&rol=Directivo`);
        const jsonMat = await respMat.json();
        
        let opciones = `<option value="">-- Seleccionar --</option>`;
        jsonMat.data.forEach(m => {
            // MODIFICACIÓN: Ahora el value incluye también el curso (m[3])
            opciones += `<option value="${m[1]} (${m[3]})">${m[1]} (${m[3]})</option>`;
        });

        // 2. Construir el Formulario
        
        // PARTE A: 12 Materias Regulares (Simple)
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
        htmlForm += `</div>`;
        
        // PARTE B: 4 Intensificaciones (DOBLE ELECCIÓN: Qué debe -> Dónde rinde)
        htmlForm += `<h6 class="bg-warning bg-opacity-25 p-2 border border-start-0 border-end-0">Intensificaciones (Previas/Pendientes)</h6>
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

        // 3. Buscar si ya tiene inscripción guardada
        const respIns = await fetch(`${URL_API}?op=getInscripcion&rol=Directivo&dni=${dni}`);
        const jsonIns = await respIns.json();

        if(jsonIns.status === 'success') {
            const data = jsonIns.data; 
            // data llega así: [DNI, Nombre, Mat1...Mat12, Int1...Int4]
            
            // Llenar Materias Regulares (Indices 2 a 13)
            for(let i=1; i<=12; i++) {
                const valor = data[i+1];
                if(valor && valor.includes(' - ')) {
                    const partes = valor.split(' - ');
                    document.getElementById(`materia_${i}`).value = partes[0];
                    document.getElementById(`estado_${i}`).value = partes[1];
                }
            }
            
            // Llenar Intensificaciones Dobles (Indices 14 a 17)
            for(let j=1; j<=4; j++) {
                const valor = data[13+j];
                // El formato guardado es "Adeudada -> En"
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

    // Recolectar Materias (Formato: Materia - Estado)
    for(let i=1; i<=12; i++) {
        const mat = document.getElementById(`materia_${i}`).value;
        const est = document.getElementById(`estado_${i}`).value;
        datos[`m${i}`] = mat ? `${mat} - ${est}` : ""; 
    }
    
    // Recolectar Intensificaciones (Formato: Adeudada -> DondeRinde)
    for(let j=1; j<=4; j++) {
        const adeuda = document.getElementById(`int_adeuda_${j}`).value;
        const en = document.getElementById(`int_en_${j}`).value;
        
        if(adeuda && en) {
            datos[`i${j}`] = `${adeuda} -> ${en}`;
        } else {
            datos[`i${j}`] = "";
        }
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
    
    if(est[6]){
        document.getElementById('inp_nacimiento').value = new Date(est[6]).toISOString().split('T')[0];
    }

    new bootstrap.Modal(document.getElementById('modalEstudiante')).show();
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
    } catch (e) {
        alert("Error al guardar.");
    }
}

async function borrarEstudiante(dni, email) {
    if(!confirm(`¿Seguro que deseas eliminar al alumno con DNI ${dni}?`)) return;

    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({
            op: 'administrarEstudiante',
            accion: 'borrar',
            dni: dni,
            email: email
        })});
        alert("Eliminado.");
        verEstudiantes();
    } catch (e) {
        alert("Error al eliminar.");
    }
}

// ==========================================
// 3. MÓDULO DIRECTIVO: DOCENTES
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
            <div class="table-responsive bg-white rounded shadow-sm" style="max-height: 600px; overflow-y: auto;">
                <table class="table table-hover table-bordered mb-0 align-middle">
                    <thead class="table-dark text-center" style="position: sticky; top: 0;">
                        <tr>
                            <th>DNI</th>
                            <th>Nombre</th>
                            <th>Contacto</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        json.data.forEach((fila, index) => {
            html += `
                <tr>
                    <td>${fila[0]}</td>
                    <td>${fila[1]}</td>
                    <td><small>${fila[2]}<br>${fila[3]}</small></td>
                    <td class="text-center" style="width: 160px;">
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="abrirModalAsignacion(${index})" title="Asignar Materia">📚</button>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editarDocente(${index})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="borrarDocente('${fila[0]}', '${fila[2]}')" title="Borrar">🗑️</button>
                    </td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
        
        // Modales Docentes
        html += renderModalDocenteHTML();
        html += renderModalAsignacionHTML();
        
        document.getElementById('contenido-dinamico').innerHTML = html;
    } catch (e) {
        alert("Error cargando docentes.");
    }
}

// --- ASIGNACIÓN DE MATERIAS ---

async function abrirModalAsignacion(index) {
    const doc = baseDatosDocentes[index];
    document.getElementById('asig_dni_docente').value = doc[0];
    document.getElementById('asig_nombre_docente').value = doc[1];
    document.getElementById('span_nombre_docente').innerText = doc[1];
    
    const select = document.getElementById('sel_materia_asig');
    select.innerHTML = '<option>Cargando materias...</option>';
    
    new bootstrap.Modal(document.getElementById('modalAsignacion')).show();

    try {
        const resp = await fetch(`${URL_API}?op=getMaterias&rol=Directivo`);
        const json = await resp.json();
        
        let opts = `<option value="" selected disabled>Selecciona la materia...</option>`;
        
        json.data.forEach(mat => {
            // mat = [ID, Materia, DNI_Prof, Curso, Nombre_Prof]
            const nombreProfe = mat[4] ? mat[4].toString().trim() : "";
            const tieneProfe = nombreProfe !== "";
            
            let estilo = "";
            let texto = "";

            if (tieneProfe) {
                texto = `${mat[1]} (${mat[3]}) - Ocupada por ${nombreProfe}`;
                estilo = "color: red; font-weight: bold;"; // ROJO SI ESTÁ OCUPADA
            } else {
                texto = `${mat[1]} (${mat[3]}) - VACANTE`;
                estilo = "color: green; font-weight: bold;"; // VERDE SI ESTÁ LIBRE
            }

            opts += `<option value="${mat[0]}" style="${estilo}">${texto}</option>`;
        });

        select.innerHTML = opts;

    } catch (e) {
        select.innerHTML = '<option>Error cargando datos</option>';
    }
}


async function guardarAsignacion() {
    const idMateria = document.getElementById('sel_materia_asig').value;
    const dniDoc = document.getElementById('asig_dni_docente').value;
    const nomDoc = document.getElementById('asig_nombre_docente').value;

    if(!idMateria) return alert("Selecciona una materia.");

    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({
            op: 'asignarDocenteMateria',
            id_materia: idMateria,
            dni_docente: dniDoc,
            nombre_docente: nomDoc
        })});
        alert("Asignación guardada.");
        bootstrap.Modal.getInstance(document.getElementById('modalAsignacion')).hide();
        verDocentes(); 
    } catch (e) {
        alert("Error al asignar.");
    }
}

// --- CRUD DOCENTES ---

function abrirModalDocente() {
    document.getElementById('formDocente').reset();
    document.getElementById('accion_doc_form').value = "crear";
    new bootstrap.Modal(document.getElementById('modalDocente')).show();
}

function editarDocente(index) {
    const d = baseDatosDocentes[index];
    document.getElementById('accion_doc_form').value = "editar";
    document.getElementById('dni_doc_original').value = d[0];
    document.getElementById('email_doc_original').value = d[2];

    document.getElementById('inp_doc_dni').value = d[0];
    document.getElementById('inp_doc_nombre').value = d[1];
    document.getElementById('inp_doc_email').value = d[2];
    document.getElementById('inp_doc_cel').value = d[3];

    new bootstrap.Modal(document.getElementById('modalDocente')).show();
}

async function guardarDocente() {
    const datos = {
        op: 'administrarDocente',
        accion: document.getElementById('accion_doc_form').value,
        dni: document.getElementById('inp_doc_dni').value,
        nombre: document.getElementById('inp_doc_nombre').value,
        email: document.getElementById('inp_doc_email').value,
        celular: document.getElementById('inp_doc_cel').value,
        dniOriginal: document.getElementById('dni_doc_original').value,
        emailOriginal: document.getElementById('email_doc_original').value
    };

    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        bootstrap.Modal.getInstance(document.getElementById('modalDocente')).hide();
        verDocentes();
    } catch (e) {
        alert("Error al guardar docente.");
    }
}

async function borrarDocente(dni, email) {
    if(!confirm("¿Eliminar docente?")) return;
    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({
            op: 'administrarDocente', accion: 'borrar', dni: dni, email: email
        })});
        verDocentes();
    } catch(e) { alert("Error."); }
}


// ==========================================
// 4. HTML DE LOS MODALES (Templates)
// ==========================================

function renderModalHTML() {
    return `
    <div class="modal fade" id="modalEstudiante" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="modalTitle">Estudiante</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="formEstudiante">
                <input type="hidden" id="accion_form">
                <input type="hidden" id="dni_original"><input type="hidden" id="email_original">
                <div class="mb-2"><label>DNI</label><input type="number" id="inp_dni" class="form-control"></div>
                <div class="mb-2"><label>Nombre Completo</label><input type="text" id="inp_nombre" class="form-control"></div>
                <div class="row">
                    <div class="col"><label>Curso</label><input type="text" id="inp_curso" class="form-control"></div>
                    <div class="col"><label>Teléfono</label><input type="text" id="inp_tel" class="form-control"></div>
                </div>
                <div class="mb-2"><label>Email</label><input type="email" id="inp_email" class="form-control"></div>
                <div class="mb-2"><label>Adulto Responsable</label><input type="text" id="inp_adulto" class="form-control"></div>
                <div class="mb-2"><label>Fecha Nacimiento</label><input type="date" id="inp_nacimiento" class="form-control"></div>
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
          <div class="modal-body bg-light">
            <input type="hidden" id="ins_dni_est"><input type="hidden" id="ins_nombre_est">
            <div id="gridMaterias"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
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
          <div class="modal-header bg-dark text-white">
            <h5 class="modal-title">Datos del Docente</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="formDocente">
                <input type="hidden" id="accion_doc_form">
                <input type="hidden" id="dni_doc_original"><input type="hidden" id="email_doc_original">
                <div class="mb-2"><label>DNI</label><input type="number" id="inp_doc_dni" class="form-control"></div>
                <div class="mb-2"><label>Nombre</label><input type="text" id="inp_doc_nombre" class="form-control"></div>
                <div class="mb-2"><label>Email</label><input type="email" id="inp_doc_email" class="form-control"></div>
                <div class="mb-2"><label>Celular</label><input type="text" id="inp_doc_cel" class="form-control"></div>
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

// HTML DEL MODAL ASIGNACIÓN
function renderModalAsignacionHTML() {
    return `
    <div class="modal fade" id="modalAsignacion" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-warning">
            <h5 class="modal-title text-dark">Asignar Materia</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Docente: <b><span id="span_nombre_docente"></span></b></p>
            <input type="hidden" id="asig_dni_docente"><input type="hidden" id="asig_nombre_docente">
            <div class="mb-3">
                <label>Seleccionar Materia:</label>
                <select id="sel_materia_asig" class="form-select" size="8"></select>
                <small class="text-danger fw-bold">* Las vacantes aparecen en rojo</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="guardarAsignacion()">Confirmar Asignación</button>
          </div>
        </div>
      </div>
    </div>`;
}

// --- UTILIDADES ---
function calcularEdad(fechaNac) {
    if (!fechaNac) return "-";
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) {
        edad--;
    }
    return edad;
}

// --- PRECEPTOR (Solo Placeholders) ---
function iniciarModuloPreceptor() {
    document.getElementById('contenido-dinamico').innerHTML = `<h3>Panel de Preceptor</h3><p>Funcionalidad en desarrollo...</p>`;
}
