// ARCHIVO COMPLETO: script.js
// (Reemplaza todo el contenido anterior con esto)

// ------------------------------------------------------------------
// PEGA AQUI ABAJO TU URL DE GOOGLE (La que termina en /exec)
const URL_API = "https://script.google.com/macros/s/AKfycbyTGnoS8hevr6k7pXE16p7KtcQxYrYP0yc11yJoJyvfX8Z7pEKJ5ZYymJ--IBcoVqUB/exec"; 
// ------------------------------------------------------------------

let usuarioActual = null; 

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
        console.error(e);
        errorMsg.innerText = "Error de conexión. Revisa tu internet o la URL.";
        errorMsg.classList.remove('d-none');
    } finally {
        btn.innerText = "Ingresar";
        btn.disabled = false;
    }
}

// --- MENU PRINCIPAL ---
function cargarDashboard(user) {
    document.getElementById('login-screen').classList.add('d-none');
    document.getElementById('dashboard-screen').classList.remove('d-none');
    document.getElementById('user-name').innerText = user.nombre;

    const menu = document.getElementById('menu-lateral');
    menu.innerHTML = '';

    // OPCIONES DIRECTIVO
    if (user.rol === 'Directivo') {
        menu.innerHTML += `<button class="list-group-item list-group-item-action" onclick="verEstudiantes()">Gestionar Estudiantes</button>`;
        menu.innerHTML += `<button class="list-group-item list-group-item-action" onclick="verDocentes()">Gestionar Docentes</button>`;
    }
    
    // OPCIONES PRECEPTOR (NUEVO)
    if (user.rol === 'Preceptor') {
        menu.innerHTML += `<button class="list-group-item list-group-item-action active" onclick="mostrarFormAsistencia()">📅 Tomar Asistencia</button>`;
    }

    // OPCIONES DOCENTE
    if (user.rol === 'Docente') {
        menu.innerHTML += `<button class="list-group-item list-group-item-action" onclick="mostrarCargaNotas()">Cargar Notas</button>`;
    }
    
    // BOTON SALIR
    menu.innerHTML += `<button class="list-group-item list-group-item-action text-danger mt-3" onclick="location.reload()">Cerrar Sesión</button>`;

    // Cargar la primera pantalla por defecto
    if (user.rol === 'Preceptor') mostrarFormAsistencia();
}

// ==========================================
// MÓDULO PRECEPTORES (ASISTENCIA)
// ==========================================

function mostrarFormAsistencia() {
    const html = `
        <div class="card p-4 shadow-sm">
            <h4 class="mb-3">Registro de Asistencia Diaria</h4>
            <div class="row g-2">
                <div class="col-md-8">
                    <select id="selector-curso" class="form-select form-select-lg">
                        <option value="" selected disabled>Selecciona el Curso</option>
                        <option value="1A">1° Año A</option>
                        <option value="1B">1° Año B</option>
                        <option value="2A">2° Año A</option>
                        <option value="2B">2° Año B</option>
                        <option value="3A">3° Año A</option>
                        <option value="3B">3° Año B</option>
                        </select>
                </div>
                <div class="col-md-4">
                    <button onclick="cargarPlanillaCurso()" class="btn btn-primary btn-lg w-100">Cargar Alumnos</button>
                </div>
            </div>
        </div>
        <div id="zona-planilla" class="mt-4"></div>
    `;
    document.getElementById('contenido-dinamico').innerHTML = html;
    document.getElementById('titulo-seccion').innerText = "Panel de Preceptoría";
}

async function cargarPlanillaCurso() {
    const curso = document.getElementById('selector-curso').value;
    if (!curso) return alert("Por favor selecciona un curso primero.");

    mostrarCargando(`Buscando listado de ${curso}...`);

    try {
        const resp = await fetch(`${URL_API}?op=getAlumnosCurso&rol=Preceptor&curso=${curso}`);
        const json = await resp.json();

        if (json.data.length === 0) {
            document.getElementById('zona-planilla').innerHTML = 
                `<div class="alert alert-warning text-center">⚠️ No hay alumnos registrados en el curso <b>${curso}</b>.<br>Revisa la hoja 'Estudiantes' en el Excel.</div>`;
            return;
        }

        renderizarTablaAsistencia(json.data);
    } catch (e) {
        console.error(e);
        document.getElementById('zona-planilla').innerHTML = `<div class="alert alert-danger">Error de conexión con Google.</div>`;
    }
}

function renderizarTablaAsistencia(alumnos) {
    let html = `
        <form id="form-asistencia">
        <div class="card shadow-sm">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-dark">
                        <tr>
                            <th style="width: 50%">Estudiante</th>
                            <th class="text-center">Presente</th>
                            <th class="text-center">Ausente</th>
                            <th class="text-center">Tarde</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    alumnos.forEach(alumno => {
        // En Apps Script definimos: index 0=DNI, index 1=Nombre
        const dni = alumno[0]; 
        const nombre = alumno[1];

        html += `
            <tr>
                <td class="fw-bold text-secondary">${nombre}</td>
                <td class="text-center bg-light">
                    <input class="form-check-input" type="radio" name="estado_${dni}" value="P" checked style="transform: scale(1.3);">
                </td>
                <td class="text-center">
                    <input class="form-check-input" type="radio" name="estado_${dni}" value="A" style="transform: scale(1.3);">
                </td>
                <td class="text-center">
                    <input class="form-check-input" type="radio" name="estado_${dni}" value="T" style="transform: scale(1.3);">
                </td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
            <div class="p-3 bg-light border-top">
                <button type="button" onclick="guardarTodo()" class="btn btn-success w-100 btn-lg">✅ Guardar Asistencia</button>
            </div>
        </div>
        </form>
    `;

    document.getElementById('zona-planilla').innerHTML = html;
}

async function guardarTodo() {
    const form = document.getElementById('form-asistencia');
    const inputs = form.querySelectorAll('input[type="radio"]:checked');
    const btnGuardar = form.querySelector('button');
    
    btnGuardar.disabled = true;
    btnGuardar.innerText = "Guardando...";

    let listaAsistencia = [];

    inputs.forEach(input => {
        // name="estado_123456" -> split('_') -> ["estado", "123456"]
        const dni = input.name.split('_')[1]; 
        const estado = input.value;
        listaAsistencia.push({ dni: dni, estado: estado });
    });

    const datos = {
        op: 'guardarAsistenciaMasiva',
        lista: listaAsistencia,
        preceptor: usuarioActual.nombre
    };

    await enviarDatos(datos);
}

// ==========================================
// MÓDULO DIRECTIVO (Visualización)
// ==========================================

async function verEstudiantes() {
    mostrarCargando("Descargando base de datos...");
    const resp = await fetch(`${URL_API}?op=getEstudiantes&rol=Directivo`);
    const json = await resp.json();
    
    let html = `<h5>Listado General</h5><table class="table table-bordered table-striped bg-white">
                <thead class="table-dark"><tr><th>DNI</th><th>Nombre</th><th>Curso</th></tr></thead><tbody>`;
    
    json.data.forEach(fila => {
        html += `<tr><td>${fila[0]}</td><td>${fila[1]}</td><td>${fila[2]}</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('contenido-dinamico').innerHTML = html;
}

async function verDocentes() {
    mostrarCargando("Cargando docentes...");
    alert("Función disponible próximamente"); // Simplificado por ahora
    document.getElementById('contenido-dinamico').innerHTML = "";
}

// ==========================================
// MÓDULO DOCENTE (Notas)
// ==========================================

function mostrarCargaNotas() {
    // Reutilizamos el código anterior, o lo dejamos pendiente si hoy solo hacemos Preceptores
    document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-info">Módulo de notas en construcción.</div>`;
}

// ==========================================
// HERRAMIENTAS GENERALES
// ==========================================

async function enviarDatos(objetoDatos) {
    try {
        await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify(objetoDatos)
        });
        alert("¡Datos guardados con éxito!");
        // Limpiamos la pantalla
        document.getElementById('zona-planilla').innerHTML = '<div class="alert alert-success mt-3">Planilla guardada correctamente.</div>';
    } catch (e) {
        console.error(e);
        alert("Hubo un error al guardar. Intenta de nuevo.");
    }
}

function mostrarCargando(texto) {
    document.getElementById('contenido-dinamico').innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="height: 200px;">
            <div class="spinner-border text-primary me-3" role="status"></div>
            <span class="h5 text-muted">${texto}</span>
        </div>
    `;
}

