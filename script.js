// ============================================================================
// ARCHIVO: script.js (VERSIÓN COMPLETA INTEGRADA)
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
    } catch (error) {
        errorMsg.innerText = "Error de conexión";
        errorMsg.classList.remove('d-none');
    } finally {
        btn.innerText = "Ingresar";
        btn.disabled = false;
    }
}

function cargarDashboard(user) {
    const loginCard = document.getElementById('login-card');
    const mainContent = document.getElementById('main-content');
    const navbar = document.getElementById('navbar-user');
    const userDisplay = document.getElementById('user-display');

    loginCard.classList.add('d-none');
    navbar.classList.remove('d-none');
    userDisplay.innerText = `${user.nombre} (${user.rol})`;

    if (user.rol === 'Directivo') {
        renderDirectivoView();
    } else if (user.rol === 'Preceptor') {
        renderPreceptorView();
    } else {
        mainContent.innerHTML = `<h3 class="text-center mt-5">Bienvenido Estudiante/Docente. Tu panel está en construcción.</h3>`;
    }
}

function cerrarSesion() {
    usuarioActual = null;
    location.reload();
}

// ==========================================
// 2. VISTA DIRECTIVO
// ==========================================

function renderDirectivoView() {
    const contenedor = document.getElementById('main-content');
    contenedor.innerHTML = `
    <div class="container mt-4">
      <h2 class="mb-4">Panel Directivo</h2>
      <div class="row g-4">
        <div class="col-md-4">
          <div class="card h-100 shadow-sm hover-card" onclick="cargarTablaEstudiantes()" style="cursor:pointer">
            <div class="card-body text-center">
              <h1 class="display-4 text-primary"><i class="bi bi-people"></i></h1>
              <h5 class="card-title mt-3">Estudiantes</h5>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100 shadow-sm hover-card" onclick="cargarTablaDocentes()" style="cursor:pointer">
            <div class="card-body text-center">
              <h1 class="display-4 text-success"><i class="bi bi-person-badge"></i></h1>
              <h5 class="card-title mt-3">Docentes</h5>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100 shadow-sm hover-card" onclick="cargarTablaMaterias()" style="cursor:pointer">
            <div class="card-body text-center">
              <h1 class="display-4 text-warning"><i class="bi bi-journal-bookmark"></i></h1>
              <h5 class="card-title mt-3">Materias</h5>
            </div>
          </div>
        </div>
      </div>
      <div id="workspace" class="mt-5"></div>
      ${renderModalEstudianteHTML()}
      ${renderModalDocenteHTML()}
      ${renderModalAsignacionHTML()}
    </div>`;
}

// --- LOGICA ESTUDIANTES (DIRECTIVO) ---
async function cargarTablaEstudiantes() {
    const ws = document.getElementById('workspace');
    ws.innerHTML = '<div class="spinner-border text-primary"></div> Cargando...';
    
    const resp = await fetch(`${URL_API}?op=getEstudiantes&rol=Directivo`);
    const json = await resp.json();
    baseDatosAlumnos = json.data; 

    let html = `
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3>Listado de Estudiantes</h3>
        <button class="btn btn-primary" onclick="abrirModalEstudiante('crear')">+ Nuevo</button>
    </div>
    <div class="table-responsive">
    <table class="table table-striped table-hover shadow-sm">
      <thead class="table-dark"><tr><th>DNI</th><th>Nombre</th><th>Curso</th><th>Email</th><th>Acciones</th></tr></thead>
      <tbody>`;
    
    json.data.forEach(fila => {
        html += `<tr>
            <td>${fila[0]}</td>
            <td>${fila[1]}</td>
            <td>${fila[2]}</td>
            <td>${fila[3]}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="abrirModalEstudiante('editar', '${fila[0]}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-danger" onclick="borrarEstudiante('${fila[0]}')"><i class="bi bi-trash"></i></button>
                <button class="btn btn-sm btn-info" onclick="verInscripcion('${fila[0]}')"><i class="bi bi-eye"></i></button>
            </td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    ws.innerHTML = html;
}

// --- LOGICA DOCENTES (DIRECTIVO) ---
async function cargarTablaDocentes() {
    const ws = document.getElementById('workspace');
    ws.innerHTML = '<div class="spinner-border text-primary"></div> Cargando...';
    
    const resp = await fetch(`${URL_API}?op=getDocentes&rol=Directivo`);
    const json = await resp.json();
    baseDatosDocentes = json.data;

    let html = `
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3>Plantel Docente</h3>
        <button class="btn btn-primary" onclick="abrirModalDocente('crear')">+ Nuevo</button>
    </div>
    <table class="table table-striped shadow-sm">
      <thead class="table-success"><tr><th>DNI</th><th>Nombre</th><th>Email</th><th>Celular</th><th>Acciones</th></tr></thead>
      <tbody>`;
    
    json.data.forEach(fila => {
        html += `<tr>
            <td>${fila[0]}</td><td>${fila[1]}</td><td>${fila[2]}</td><td>${fila[3]}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="abrirModalDocente('editar', '${fila[0]}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-danger" onclick="borrarDocente('${fila[0]}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    ws.innerHTML = html;
}

// --- LOGICA MATERIAS (DIRECTIVO) ---
async function cargarTablaMaterias() {
    const ws = document.getElementById('workspace');
    ws.innerHTML = '<div class="spinner-border text-warning"></div> Cargando...';
    
    const resp = await fetch(`${URL_API}?op=getMaterias&rol=Directivo`);
    const json = await resp.json();

    // Traemos docentes para el select si no estan cargados
    if(baseDatosDocentes.length === 0) {
        const dResp = await fetch(`${URL_API}?op=getDocentes&rol=Directivo`);
        const dJson = await dResp.json();
        baseDatosDocentes = dJson.data;
    }

    let html = `
    <h3>Gestión de Materias</h3>
    <table class="table table-bordered shadow-sm mt-3">
      <thead class="table-warning"><tr><th>ID</th><th>Materia</th><th>DNI Prof</th><th>Curso</th><th>Profesor</th><th>Acción</th></tr></thead>
      <tbody>`;
    
    json.data.forEach(fila => {
        html += `<tr>
            <td>${fila[0]}</td><td>${fila[1]}</td><td>${fila[2]}</td><td>${fila[3]}</td><td>${fila[4]}</td>
            <td>
                <button class="btn btn-sm btn-outline-dark" onclick="abrirModalAsignacion('${fila[0]}')">Asignar Docente</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    ws.innerHTML = html;
}

// ==========================================
// 3. VISTA PRECEPTOR (NUEVA VERSIÓN)
// ==========================================

function renderPreceptorView() {
    const contenedor = document.getElementById('main-content');
    contenedor.innerHTML = `
    <div class="container mt-4">
      <h2 class="mb-4">Panel de Preceptor</h2>
      
      <div class="row g-4">
        <div class="col-md-3">
          <div class="card h-100 shadow-sm hover-card" onclick="cargarAsistenciaPreceptor()" style="cursor:pointer">
            <div class="card-body text-center">
              <h1 class="display-4 text-primary"><i class="bi bi-calendar-check"></i></h1>
              <h5 class="card-title mt-3">Tomar Asistencia</h5>
            </div>
          </div>
        </div>

        <div class="col-md-3">
          <div class="card h-100 shadow-sm hover-card" onclick="cargarFaltasPreceptor()" style="cursor:pointer">
            <div class="card-body text-center">
              <h1 class="display-4 text-danger"><i class="bi bi-exclamation-triangle"></i></h1>
              <h5 class="card-title mt-3">Ver Faltas</h5>
            </div>
          </div>
        </div>

        <div class="col-md-3">
           <div class="card h-100 shadow-sm hover-card" onclick="alert('Usa el botón Justificar dentro de la opción Ver Faltas')" style="cursor:pointer; opacity: 0.7">
            <div class="card-body text-center">
              <h1 class="display-4 text-success"><i class="bi bi-check-circle"></i></h1>
              <h5 class="card-title mt-3">Justificar</h5>
              <small class="text-muted">Ir a "Ver Faltas"</small>
            </div>
          </div>
        </div>

        <div class="col-md-3">
          <div class="card h-100 shadow-sm hover-card" onclick="cargarDocentesParaPreceptor()" style="cursor:pointer">
            <div class="card-body text-center">
              <h1 class="display-4 text-success"><i class="bi bi-whatsapp"></i></h1>
              <h5 class="card-title mt-3">Contactar Docentes</h5>
            </div>
          </div>
        </div>
      </div>

      <div id="workspace" class="mt-5"></div>
      ${renderModalHistorialHTML()} 
    </div>`;
}

// --- 3.1 PRECEPTOR: TOMAR ASISTENCIA ---
async function cargarAsistenciaPreceptor() {
    const ws = document.getElementById('workspace');
    ws.innerHTML = '<div class="spinner-border text-primary"></div> Cargando planilla...';

    // Reutilizamos getEstudiantes pero con rol preceptor
    const resp = await fetch(`${URL_API}?op=getDataPreceptor&rol=Preceptor`);
    const json = await resp.json();
    
    // json.data viene con { data: [alumno...], stats: {...} }
    // Necesitamos solo la parte de 'data' del alumno para armar la lista
    
    let html = `
    <div class="card shadow">
        <div class="card-header bg-primary text-white d-flex justify-content-between">
            <h5 class="mb-0">Planilla Diaria</h5>
            <span>${new Date().toLocaleDateString()}</span>
        </div>
        <div class="card-body">
            <table class="table table-hover" id="tablaAsistencia">
                <thead>
                    <tr><th>Alumno</th><th>Estado</th></tr>
                </thead>
                <tbody>`;

    json.data.forEach(item => {
        const alumno = item.data; // [dni, nombre, curso...]
        html += `
        <tr data-dni="${alumno[0]}">
            <td>${alumno[1]} <small class="text-muted">(${alumno[0]})</small></td>
            <td>
                <div class="btn-group" role="group">
                    <input type="radio" class="btn-check" name="asis_${alumno[0]}" id="P_${alumno[0]}" value="P" checked>
                    <label class="btn btn-outline-success" for="P_${alumno[0]}">P</label>

                    <input type="radio" class="btn-check" name="asis_${alumno[0]}" id="A_${alumno[0]}" value="A">
                    <label class="btn btn-outline-danger" for="A_${alumno[0]}">A</label>

                    <input type="radio" class="btn-check" name="asis_${alumno[0]}" id="T_${alumno[0]}" value="T">
                    <label class="btn btn-outline-warning" for="T_${alumno[0]}">T</label>
                </div>
            </td>
        </tr>`;
    });

    html += `</tbody></table>
             <button class="btn btn-success w-100 mt-3" onclick="enviarAsistencia()">Guardar Asistencia del Día</button>
        </div>
    </div>`;
    ws.innerHTML = html;
}

async function enviarAsistencia() {
    const filas = document.querySelectorAll('#tablaAsistencia tbody tr');
    let lista = [];

    filas.forEach(tr => {
        const dni = tr.getAttribute('data-dni');
        // Buscar cual radio está checkeado
        const estado = document.querySelector(`input[name="asis_${dni}"]:checked`).value;
        lista.push({ dni: dni, estado: estado });
    });

    if(!confirm(`¿Guardar asistencia para ${lista.length} alumnos?`)) return;

    const btn = document.querySelector('button.w-100');
    btn.disabled = true; btn.innerText = "Guardando...";

    await fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify({ op: 'guardarAsistenciaMasiva', lista: lista, preceptor: usuarioActual.nombre })
    });

    alert("Asistencia guardada correctamente.");
    document.getElementById('workspace').innerHTML = ""; 
}

// --- 3.2 PRECEPTOR: VER FALTAS ---
async function cargarFaltasPreceptor() {
    const ws = document.getElementById('workspace');
    ws.innerHTML = '<div class="spinner-border text-danger"></div> Calculando faltas...';

    const resp = await fetch(`${URL_API}?op=getDataPreceptor&rol=Preceptor`);
    const json = await resp.json();
    
    if (json.status === 'success') {
        renderTablaFaltas(json.data);
    }
}

function renderTablaFaltas(lista) {
    const ws = document.getElementById('workspace');
    let html = `
    <div class="card shadow">
        <div class="card-header bg-danger text-white">
            <h5 class="mb-0">Reporte de Faltas</h5>
        </div>
        <div class="card-body">
            <input type="text" id="buscadorFalta" class="form-control mb-3" placeholder="Buscar alumno..." onkeyup="filtrarTablaFaltas()">
            <div class="table-responsive">
            <table class="table table-bordered" id="tablaFaltas">
                <thead class="table-light">
                    <tr>
                        <th>Alumno</th>
                        <th>Total</th>
                        <th>P</th>
                        <th>A</th>
                        <th>T</th>
                        <th>J</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>`;
    
    lista.forEach(item => {
        // item = { data: [dni, nombre...], stats: {total, P, A, T, J} }
        const alu = item.data;
        const st = item.stats;
        
        // Alerta visual si tiene muchas faltas
        const claseAlerta = st.total > 10 ? "table-danger" : "";

        html += `
        <tr class="${claseAlerta}">
            <td>${alu[1]} <br><small>${alu[0]}</small></td>
            <td class="fw-bold fs-5">${st.total}</td>
            <td>${st.P}</td>
            <td>${st.A}</td>
            <td>${st.T}</td>
            <td>${st.J}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="abrirModalJustificar('${alu[0]}', '${alu[1]}')">
                   Justificar
                </button>
            </td>
        </tr>`;
    });

    html += `</tbody></table></div></div></div>`;
    ws.innerHTML = html;
}

// --- 3.3 PRECEPTOR: CONTACTAR DOCENTES (NUEVO) ---
async function cargarDocentesParaPreceptor() {
    const ws = document.getElementById('workspace');
    ws.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div> Cargando docentes...</div>';

    try {
        const resp = await fetch(`${URL_API}?op=getDocentes&rol=Preceptor`);
        const json = await resp.json();

        if (json.status === 'success') {
            renderTablaDocentesPreceptor(json.data);
        } else {
            ws.innerHTML = `<div class="alert alert-danger">Error: ${json.message}</div>`;
        }
    } catch (e) {
        console.error(e);
        ws.innerHTML = '<div class="alert alert-danger">Error de conexión</div>';
    }
}

function renderTablaDocentesPreceptor(lista) {
    const ws = document.getElementById('workspace');
    
    if (lista.length === 0) {
        ws.innerHTML = '<div class="alert alert-info">No hay docentes cargados.</div>';
        return;
    }

    let html = `
    <div class="card shadow">
        <div class="card-header bg-success text-white">
            <h5 class="mb-0">Directorio de Docentes</h5>
        </div>
        <div class="card-body">
            <input type="text" id="buscadorDocente" class="form-control mb-3" placeholder="Buscar por nombre..." onkeyup="filtrarTablaDocentes()">
            <div class="table-responsive">
                <table class="table table-hover table-bordered" id="tablaDocentesPreceptor">
                    <thead class="table-light">
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Celular</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>`;

    lista.forEach(doc => {
        // doc = [DNI, Nombre, Email, Celular]
        const nombre = doc[1];
        const email = doc[2];
        let celular = String(doc[3] || "");

        // Limpieza y formato de WhatsApp
        let cleanPhone = celular.replace(/[^0-9]/g, ''); 
        let waLink = "#";
        let btnDisabled = "disabled";
        
        if(cleanPhone.length >= 8) {
             if(!cleanPhone.startsWith("54")) cleanPhone = "549" + cleanPhone; 
             waLink = `https://wa.me/${cleanPhone}`;
             btnDisabled = "";
        }

        html += `
        <tr>
            <td>${nombre}</td>
            <td>${email}</td>
            <td>${celular}</td>
            <td class="text-center">
                <a href="${waLink}" target="_blank" class="btn btn-success btn-sm ${btnDisabled}">
                    <i class="bi bi-whatsapp"></i> Chat
                </a>
            </td>
        </tr>`;
    });

    html += `</tbody></table></div></div></div>`;
    ws.innerHTML = html;
}

function filtrarTablaDocentes() {
    const input = document.getElementById("buscadorDocente");
    const filter = input.value.toUpperCase();
    const table = document.getElementById("tablaDocentesPreceptor");
    const tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName("td")[0]; 
        if (td) {
            let txtValue = td.textContent || td.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }       
    }
}

function filtrarTablaFaltas() {
    const input = document.getElementById("buscadorFalta");
    const filter = input.value.toUpperCase();
    const table = document.getElementById("tablaFaltas");
    const tr = table.getElementsByTagName("tr");
    for (let i = 1; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName("td")[0];
        if (td) {
            let txtValue = td.textContent || td.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) tr[i].style.display = "";
            else tr[i].style.display = "none";
        }
    }
}

// --- 3.4 JUSTIFICAR FALTAS ---
let modalHistorial = null;
let currentJustificarDNI = null;

function renderModalHistorialHTML() {
    return `
    <div class="modal fade" id="modalHistorial" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Justificar Falta: <span id="just_nombre"></span></h5>
            <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\"></button>
          </div>
          <div class="modal-body">
             <div id="listaHistorial">Cargando...</div>
          </div>
        </div>
      </div>
    </div>`;
}

async function abrirModalJustificar(dni, nombre) {
    currentJustificarDNI = dni;
    document.getElementById('just_nombre').innerText = nombre;
    
    if(!modalHistorial) modalHistorial = new bootstrap.Modal(document.getElementById('modalHistorial'));
    modalHistorial.show();

    // Cargar historial
    const container = document.getElementById('listaHistorial');
    container.innerHTML = '<div class="spinner-border"></div>';

    const resp = await fetch(`${URL_API}?op=getHistorialAlumno&rol=Preceptor&dni=${dni}`);
    const json = await resp.json();

    if(json.data.length === 0) {
        container.innerHTML = '<p>No tiene inasistencias injustificadas recientes.</p>';
        return;
    }

    let html = '<table class="table"><thead><tr><th>Fecha</th><th>Estado</th><th>Accion</th></tr></thead><tbody>';
    json.data.forEach(h => {
        html += `
        <tr>
            <td>${h.fecha}</td>
            <td>${h.estado === 'A' ? 'Ausente' : 'Tarde'}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="confirmarJustificacion(${h.fila})">Justificar</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function confirmarJustificacion(fila) {
    if(!confirm("¿Justificar esta falta?")) return;
    
    document.getElementById('listaHistorial').innerHTML = "Procesando...";
    
    await fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify({ op: 'justificarFalta', fila: fila })
    });

    // Recargar historial para ver cambios
    abrirModalJustificar(currentJustificarDNI, document.getElementById('just_nombre').innerText);
    // Y refrescar la tabla de fondo
    cargarFaltasPreceptor();
}


// ==========================================
// 4. FUNCIONES MODALES DIRECTIVO (CRUD)
// ==========================================

// --- HTML DE MODALES ---
function renderModalEstudianteHTML() {
    return `
    <div class="modal fade" id="modalEstudiante" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="lblModalEst">Estudiante</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="est_accion">
            <input type="hidden" id="est_dni_original">
            <div class="mb-2"><label>DNI</label><input type="number" id="est_dni" class="form-control"></div>
            <div class="mb-2"><label>Nombre</label><input type="text" id="est_nombre" class="form-control"></div>
            <div class="mb-2"><label>Curso</label><input type="text" id="est_curso" class="form-control"></div>
            <div class="mb-2"><label>Email</label><input type="email" id="est_email" class="form-control"></div>
            <div class="mb-2"><label>Adulto Resp.</label><input type="text" id="est_adulto" class="form-control"></div>
            <div class="mb-2"><label>Teléfono</label><input type="text" id="est_telefono" class="form-control"></div>
            <div class="mb-2"><label>Fecha Nac.</label><input type="date" id="est_nacimiento" class="form-control"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnGuardarEst" onclick="guardarEstudiante()">Guardar</button>
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
            <h5 class="modal-title" id="lblModalDoc">Docente</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="doc_accion">
            <input type="hidden" id="doc_dni_original">
            <div class="mb-2"><label>DNI</label><input type="number" id="doc_dni" class="form-control"></div>
            <div class="mb-2"><label>Nombre</label><input type="text" id="doc_nombre" class="form-control"></div>
            <div class="mb-2"><label>Email</label><input type="email" id="doc_email" class="form-control"></div>
            <div class="mb-2"><label>Celular</label><input type="text" id="doc_celular" class="form-control"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-success" id="btnGuardarDoc" onclick="guardarDocente()">Guardar</button>
          </div>
        </div>
      </div>
    </div>`;
}

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
            <input type="hidden" id="asig_id_materia">
            <div class="mb-3">
                <label>Seleccionar Docente:</label>
                <select id="sel_docente_asig" class="form-select"></select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-warning" onclick="guardarAsignacion()">Asignar</button>
          </div>
        </div>
      </div>
    </div>`;
}

// --- FUNCIONES JS MODALES ---

let modalEst = null;
let modalDoc = null;
let modalAsig = null;

function abrirModalEstudiante(accion, dni = null) {
    if (!modalEst) modalEst = new bootstrap.Modal(document.getElementById('modalEstudiante'));
    document.getElementById('est_accion').value = accion;
    document.getElementById('est_dni_original').value = dni || '';
    
    if (accion === 'editar') {
        const alu = baseDatosAlumnos.find(a => String(a[0]) === String(dni));
        if (alu) {
            document.getElementById('est_dni').value = alu[0];
            document.getElementById('est_nombre').value = alu[1];
            document.getElementById('est_curso').value = alu[2];
            document.getElementById('est_email').value = alu[3];
            document.getElementById('est_adulto').value = alu[4];
            document.getElementById('est_telefono').value = alu[5];
            
            // Formatear fecha para input date (yyyy-MM-dd)
            let fechaRaw = new Date(alu[6]);
            if(!isNaN(fechaRaw)) {
                let yyyy = fechaRaw.getFullYear();
                let mm = String(fechaRaw.getMonth() + 1).padStart(2, '0');
                let dd = String(fechaRaw.getDate()).padStart(2, '0');
                document.getElementById('est_nacimiento').value = `${yyyy}-${mm}-${dd}`;
            }
        }
    } else {
        document.querySelectorAll('#modalEstudiante input').forEach(i => { if(i.type !== 'hidden') i.value = ''; });
    }
    modalEst.show();
}

async function guardarEstudiante() {
    const datos = {
        op: 'administrarEstudiante',
        accion: document.getElementById('est_accion').value,
        dniOriginal: document.getElementById('est_dni_original').value,
        dni: document.getElementById('est_dni').value,
        nombre: document.getElementById('est_nombre').value,
        curso: document.getElementById('est_curso').value,
        email: document.getElementById('est_email').value,
        adulto: document.getElementById('est_adulto').value,
        telefono: document.getElementById('est_telefono').value,
        nacimiento: document.getElementById('est_nacimiento').value
    };
    
    document.getElementById('btnGuardarEst').disabled = true;
    await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
    modalEst.hide();
    document.getElementById('btnGuardarEst').disabled = false;
    cargarTablaEstudiantes();
}

async function borrarEstudiante(dni) {
    if (confirm('¿Seguro de borrar este estudiante?')) {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'administrarEstudiante', accion: 'borrar', dni: dni }) });
        cargarTablaEstudiantes();
    }
}

function abrirModalDocente(accion, dni = null) {
    if (!modalDoc) modalDoc = new bootstrap.Modal(document.getElementById('modalDocente'));
    document.getElementById('doc_accion').value = accion;
    document.getElementById('doc_dni_original').value = dni || '';

    if (accion === 'editar') {
        const doc = baseDatosDocentes.find(d => String(d[0]) === String(dni));
        if (doc) {
            document.getElementById('doc_dni').value = doc[0];
            document.getElementById('doc_nombre').value = doc[1];
            document.getElementById('doc_email').value = doc[2];
            document.getElementById('doc_celular').value = doc[3];
        }
    } else {
        document.querySelectorAll('#modalDocente input').forEach(i => { if(i.type !== 'hidden') i.value = ''; });
    }
    modalDoc.show();
}

async function guardarDocente() {
    const datos = {
        op: 'administrarDocente',
        accion: document.getElementById('doc_accion').value,
        dniOriginal: document.getElementById('doc_dni_original').value,
        dni: document.getElementById('doc_dni').value,
        nombre: document.getElementById('doc_nombre').value,
        email: document.getElementById('doc_email').value,
        celular: document.getElementById('doc_celular').value
    };
    document.getElementById('btnGuardarDoc').disabled = true;
    await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
    modalDoc.hide();
    document.getElementById('btnGuardarDoc').disabled = false;
    cargarTablaDocentes();
}

async function borrarDocente(dni) {
    if (confirm('¿Seguro de borrar este docente?')) {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'administrarDocente', accion: 'borrar', dni: dni }) });
        cargarTablaDocentes();
    }
}

function abrirModalAsignacion(idMateria) {
    if (!modalAsig) modalAsig = new bootstrap.Modal(document.getElementById('modalAsignacion'));
    document.getElementById('asig_id_materia').value = idMateria;
    
    const sel = document.getElementById('sel_docente_asig');
    sel.innerHTML = '<option value="">Seleccione...</option>';
    baseDatosDocentes.forEach(d => {
        sel.innerHTML += `<option value="${d[0]}">${d[1]}</option>`;
    });
    
    modalAsig.show();
}

async function guardarAsignacion() {
    const idMat = document.getElementById('asig_id_materia').value;
    const dniDoc = document.getElementById('sel_docente_asig').value;
    
    // Buscar nombre del docente seleccionado
    const docente = baseDatosDocentes.find(d => String(d[0]) === String(dniDoc));
    if(!docente) return alert("Seleccione un docente");

    const datos = {
        op: 'asignarDocenteMateria',
        id_materia: idMat,
        dni_docente: dniDoc,
        nombre_docente: docente[1]
    };

    await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
    modalAsig.hide();
    cargarTablaMaterias();
}

// INICIALIZACION
// Si quisieras que intente loguearse solo al recargar si hay sesion guardada, iría aqui.
// Por ahora es manual.
