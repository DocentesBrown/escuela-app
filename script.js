// ARCHIVO: script.js (Con Edad Automática)

// ----------------------------------------------------
const URL_API = "https://script.google.com/macros/s/AKfycbyTGnoS8hevr6k7pXE16p7KtcQxYrYP0yc11yJoJyvfX8Z7pEKJ5ZYymJ--IBcoVqUB/exec"; 
// ----------------------------------------------------

let usuarioActual = null;
let baseDatosAlumnos = []; 

// --- LOGIN ---
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
        errorMsg.innerText = "Error de conexión.";
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

    if (rol === 'directivo') {
        menu.innerHTML += `
            <button class="list-group-item list-group-item-action" onclick="verEstudiantes()">👥 ABM Estudiantes</button>
            <button class="list-group-item list-group-item-action" onclick="verDocentes()">🎓 Ver Docentes</button>
        `;
    }

    if (rol === 'preceptor') {
        iniciarModuloPreceptor(); 
    }

    menu.innerHTML += `<button class="list-group-item list-group-item-action text-danger mt-3" onclick="location.reload()">Cerrar Sesión</button>`;
}

// ==========================================
// MÓDULO DIRECTIVO: GESTIÓN DE ESTUDIANTES
// ==========================================

async function verEstudiantes() {
    document.getElementById('contenido-dinamico').innerHTML = '<div class="spinner-border text-primary"></div> Cargando base de datos...';
    
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
                            <th>Edad</th> <th>Curso</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        json.data.forEach((fila, index) => {
            // fila = [0:DNI, 1:Nombre, 2:Curso, 3:Email, 4:Adulto, 5:Tel, 6:NACIMIENTO]
            const edad = calcularEdad(fila[6]); // Calculamos la edad al vuelo

            html += `
                <tr>
                    <td>${fila[0]}</td>
                    <td>${fila[1]}</td>
                    <td class="text-center fw-bold text-primary">${edad}</td>
                    <td class="text-center"><span class="badge bg-secondary">${fila[2]}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editarEstudiante(${index})">✏️</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="borrarEstudiante('${fila[0]}', '${fila[3]}')">🗑️</button>
                    </td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
        html += renderModalHTML();
        document.getElementById('contenido-dinamico').innerHTML = html;
    } catch (e) {
        console.error(e);
        alert("Error cargando estudiantes.");
    }
}

// --- FUNCIÓN MATEMÁTICA PARA LA EDAD ---
function calcularEdad(fechaString) {
    if (!fechaString) return "-";
    const hoy = new Date();
    const nacimiento = new Date(fechaString);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    // Si aún no cumplió años este año, restamos 1
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return isNaN(edad) ? "-" : edad + " años";
}

// --- MODAL Y FORMULARIO ---

function abrirModalEstudiante() {
    document.getElementById('modalTitle').innerText = "Nuevo Estudiante";
    document.getElementById('formEstudiante').reset();
    document.getElementById('accion_form').value = "crear";
    document.getElementById('inp_dni').disabled = false;
    document.getElementById('inp_email').disabled = false; 
    
    const modal = new bootstrap.Modal(document.getElementById('modalEstudiante'));
    modal.show();
}

function editarEstudiante(index) {
    const est = baseDatosAlumnos[index];
    // est = [0:DNI, 1:Nombre, 2:Curso, 3:Email, 4:Adulto, 5:Tel, 6:NACIMIENTO]
    
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
    
    // Convertir fecha de Excel a formato HTML (YYYY-MM-DD)
    if(est[6]){
        const fecha = new Date(est[6]);
        // Truco para ajustar formato fecha y evitar problemas de zona horaria
        const formato = fecha.toISOString().split('T')[0];
        document.getElementById('inp_nacimiento').value = formato;
    }

    const modal = new bootstrap.Modal(document.getElementById('modalEstudiante'));
    modal.show();
}

async function guardarEstudiante() {
    const btn = document.getElementById('btnGuardarModal');
    btn.disabled = true;
    btn.innerText = "Guardando...";

    const datos = {
        op: 'administrarEstudiante',
        accion: document.getElementById('accion_form').value,
        dni: document.getElementById('inp_dni').value,
        nombre: document.getElementById('inp_nombre').value,
        curso: document.getElementById('inp_curso').value,
        email: document.getElementById('inp_email').value,
        adulto: document.getElementById('inp_adulto').value,
        telefono: document.getElementById('inp_tel').value,
        nacimiento: document.getElementById('inp_nacimiento').value, // NUEVO CAMPO
        dniOriginal: document.getElementById('dni_original').value,
        emailOriginal: document.getElementById('email_original').value
    };

    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify(datos) });
        
        const modalEl = document.getElementById('modalEstudiante');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        alert("¡Operación exitosa!");
        verEstudiantes(); 
    } catch (e) {
        alert("Error al guardar.");
    }
}

async function borrarEstudiante(dni, email) {
    if(!confirm(`¿Eliminar alumno DNI ${dni}?`)) return;
    try {
        await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify({ op: 'administrarEstudiante', accion: 'borrar', dni: dni, email: email }) 
        });
        alert("Eliminado.");
        verEstudiantes();
    } catch (e) {
        alert("Error al eliminar.");
    }
}

function renderModalHTML() {
    return `
    <div class="modal fade" id="modalEstudiante" tabindex="-1">
      <div class="modal-dialog modal-lg"> <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="modalTitle">Estudiante</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="formEstudiante">
                <input type="hidden" id="accion_form">
                <input type="hidden" id="dni_original">
                <input type="hidden" id="email_original">
                
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <label>DNI</label>
                        <input type="number" id="inp_dni" class="form-control" required>
                    </div>
                    <div class="col-md-6 mb-2">
                        <label>Fecha de Nacimiento</label>
                        <input type="date" id="inp_nacimiento" class="form-control" required>
                    </div>
                </div>

                <div class="mb-2">
                    <label>Apellido y Nombre</label>
                    <input type="text" id="inp_nombre" class="form-control" required>
                </div>
                
                <div class="row">
                     <div class="col-md-6 mb-2">
                        <label>Curso (Ej: 1A)</label>
                        <input type="text" id="inp_curso" class="form-control" required>
                    </div>
                    <div class="col-md-6 mb-2">
                        <label>Email Estudiante (Usuario)</label>
                        <input type="email" id="inp_email" class="form-control" required>
                    </div>
                </div>

                <hr>
                <h6>Contacto Adulto</h6>
                <div class="row">
                    <div class="col-6 mb-2">
                        <label>Nombre Adulto</label>
                        <input type="text" id="inp_adulto" class="form-control">
                    </div>
                    <div class="col-6 mb-2">
                        <label>Teléfono</label>
                        <input type="text" id="inp_tel" class="form-control">
                    </div>
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

// --- MÓDULOS RESTANTES (Iguales que antes) ---

async function verDocentes() {
    const resp = await fetch(`${URL_API}?op=getDocentes&rol=Directivo`);
    const json = await resp.json();
    let html = `<h5>Docentes</h5><ul class="list-group">`;
    json.data.forEach(d => html += `<li class="list-group-item">${d[3]} (${d[0]})</li>`);
    html += `</ul>`;
    document.getElementById('contenido-dinamico').innerHTML = html;
}

async function iniciarModuloPreceptor() {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="spinner-border spinner-border-sm"></div> Cargando...`;
    const resp = await fetch(`${URL_API}?op=getDataPreceptor&rol=Preceptor`);
    const json = await resp.json();
    baseDatosAlumnos = json.data;
    const cursos = [...new Set(baseDatosAlumnos.map(f => f[2]))].sort();
    let opts = cursos.map(c => `<option value="${c}">${c}</option>`).join('');
    
    document.getElementById('contenido-dinamico').innerHTML = `
        <div class="card p-3 shadow-sm"><h5 class="mb-3">📅 Tomar Asistencia</h5>
        <select id="selCurso" class="form-select form-select-lg" onchange="renderTablaPreceptor()">
            <option selected disabled>Elige Curso</option>${opts}
        </select></div><div id="zonaPreceptor" class="mt-3"></div>`;
}

function renderTablaPreceptor() {
    const curso = document.getElementById('selCurso').value;
    const lista = baseDatosAlumnos.filter(f => String(f[2]) === curso).sort((a,b) => String(a[1]).localeCompare(b[1]));
    let html = `<div class="card p-2"><table class="table align-middle"><tbody>`;
    lista.forEach(a => html += `
        <tr><td class="fw-bold">${a[1]}</td>
        <td><input type="radio" name="e_${a[0]}" value="P" checked style="transform: scale(1.3)"> P</td>
        <td><input type="radio" name="e_${a[0]}" value="A" style="transform: scale(1.3)"> A</td></tr>`);
    html += `</tbody></table><button onclick="guardarAsis()" class="btn btn-success w-100 btn-lg">Guardar</button></div>`;
    document.getElementById('zonaPreceptor').innerHTML = html;
}

async function guardarAsis() {
    const inputs = document.querySelectorAll('input[type="radio"]:checked');
    let lista = [];
    inputs.forEach(inp => lista.push({ dni: inp.name.split('_')[1], estado: inp.value }));
    await fetch(URL_API, { method: 'POST', body: JSON.stringify({ op: 'guardarAsistenciaMasiva', lista: lista, preceptor: usuarioActual.nombre }) });
    alert("Guardado!");
    document.getElementById('selCurso').value = "";
    document.getElementById('zonaPreceptor').innerHTML = "";
}
