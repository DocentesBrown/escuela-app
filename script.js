// ARCHIVO: script.js (Completo: Directivo y Preceptor)

// ----------------------------------------------------
const URL_API = "https://script.google.com/macros/s/AKfycbyTGnoS8hevr6k7pXE16p7KtcQxYrYP0yc11yJoJyvfX8Z7pEKJ5ZYymJ--IBcoVqUB/exec"; 
// ----------------------------------------------------

let usuarioActual = null;
let baseDatosAlumnos = []; // Memoria para Preceptor

// --- LOGIN ---
async function iniciarSesion() {
    const email = document.getElementById('email').value;
    const clave = document.getElementById('clave').value;
    const btn = document.getElementById('btn-login');
    
    btn.innerText = "Verificando...";
    btn.disabled = true;

    try {
        const resp = await fetch(`${URL_API}?op=login&email=${email}&pass=${clave}`);
        const data = await resp.json();

        if (data.status === 'success') {
            usuarioActual = data;
            cargarDashboard(data);
        } else {
            alert(data.message);
        }
    } catch (e) {
        alert("Error de conexión");
    } finally {
        btn.innerText = "Ingresar";
        btn.disabled = false;
    }
}

function cargarDashboard(user) {
    document.getElementById('login-screen').classList.add('d-none');
    document.getElementById('dashboard-screen').classList.remove('d-none');
    document.getElementById('user-name').innerText = user.nombre + " (" + user.rol + ")";

    const menu = document.getElementById('menu-lateral');
    menu.innerHTML = '';

    // --- MENÚ DIRECTIVO (RESTAURADO) ---
    if (user.rol === 'Directivo') {
        menu.innerHTML += `
            <button class="list-group-item list-group-item-action" onclick="verEstudiantes()">👥 Estudiantes</button>
            <button class="list-group-item list-group-item-action" onclick="verDocentes()">🎓 Docentes</button>
            <div class="mt-2 text-muted small px-3">Más funciones pronto...</div>
        `;
    }

    // --- MENÚ PRECEPTOR ---
    if (user.rol === 'Preceptor') {
        iniciarModuloPreceptor(); // Carga automática al entrar
    }

    // --- MENÚ DOCENTE ---
    if (user.rol === 'Docente') {
        menu.innerHTML += `<div class="alert alert-info">Panel Docente en construcción</div>`;
    }
    
    menu.innerHTML += `<button class="list-group-item list-group-item-action text-danger mt-3" onclick="location.reload()">Cerrar Sesión</button>`;
}

// ==========================================
// MÓDULO DIRECTIVO
// ==========================================

async function verEstudiantes() {
    document.getElementById('contenido-dinamico').innerHTML = '<div class="spinner-border text-primary"></div> Cargando listado...';
    
    try {
        const resp = await fetch(`${URL_API}?op=getEstudiantes&rol=Directivo`);
        const json = await resp.json();

        let html = `<h5>Listado de Estudiantes</h5>
        <div class="table-responsive bg-white rounded shadow-sm">
            <table class="table table-striped mb-0">
                <thead class="table-dark"><tr><th>DNI</th><th>Nombre</th><th>Curso</th></tr></thead>
                <tbody>`;
        
        json.data.forEach(fila => {
            html += `<tr><td>${fila[0]}</td><td>${fila[1]}</td><td>${fila[2]}</td></tr>`;
        });
        html += `</tbody></table></div>`;
        document.getElementById('contenido-dinamico').innerHTML = html;
    } catch (e) {
        alert("Error cargando estudiantes");
    }
}

async function verDocentes() {
    document.getElementById('contenido-dinamico').innerHTML = '<div class="spinner-border text-primary"></div> Cargando docentes...';
    
    try {
        const resp = await fetch(`${URL_API}?op=getDocentes&rol=Directivo`);
        const json = await resp.json();

        let html = `<h5>Listado de Docentes</h5>
        <div class="table-responsive bg-white rounded shadow-sm">
            <table class="table table-striped mb-0">
                <thead class="table-dark"><tr><th>DNI</th><th>Nombre</th><th>Email</th></tr></thead>
                <tbody>`;
        
        // Ajusta los índices [0], [1], [2] según el orden de tu hoja Docentes
        json.data.forEach(fila => {
            html += `<tr><td>${fila[0]}</td><td>${fila[1]}</td><td>${fila[2]}</td></tr>`;
        });
        html += `</tbody></table></div>`;
        document.getElementById('contenido-dinamico').innerHTML = html;
    } catch (e) {
        document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-warning">No se encontró la hoja 'Docentes' o está vacía.</div>`;
    }
}


// ==========================================
// MÓDULO PRECEPTOR (INTELIGENTE)
// ==========================================

async function iniciarModuloPreceptor() {
    document.getElementById('contenido-dinamico').innerHTML = `
        <div class="alert alert-info text-center">
            <div class="spinner-border spinner-border-sm"></div> Descargando cursos...
        </div>`;

    try {
        const resp = await fetch(`${URL_API}?op=getDataPreceptor&rol=Preceptor`);
        const json = await resp.json();
        baseDatosAlumnos = json.data; 
        renderizarPantallaPreceptor();
    } catch (e) {
        document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
    }
}

function renderizarPantallaPreceptor() {
    const todosLosCursos = baseDatosAlumnos.map(fila => fila[2]);
    const cursosUnicos = [...new Set(todosLosCursos)].sort();

    let opcionesHTML = `<option value="" selected disabled>Selecciona un Curso</option>`;
    cursosUnicos.forEach(curso => {
        if(curso) opcionesHTML += `<option value="${curso}">${curso}</option>`;
    });

    const html = `
        <div class="card p-3 mb-3 shadow-sm">
            <h5>📅 Tomar Asistencia</h5>
            <select id="selector-curso" class="form-select form-select-lg" onchange="filtrarYMostrar()">
                ${opcionesHTML}
            </select>
        </div>
        <div id="zona-planilla"></div>
    `;
    document.getElementById('contenido-dinamico').innerHTML = html;
}

function filtrarYMostrar() {
    const cursoSeleccionado = document.getElementById('selector-curso').value;
    const alumnosDelCurso = baseDatosAlumnos.filter(fila => String(fila[2]) === cursoSeleccionado);
    alumnosDelCurso.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    renderizarTabla(alumnosDelCurso);
}

function renderizarTabla(lista) {
    let html = `
        <form id="form-asistencia">
        <div class="table-responsive bg-white rounded shadow-sm">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-dark">
                    <tr><th>Estudiante</th><th class="text-center">P</th><th class="text-center">A</th><th class="text-center">T</th></tr>
                </thead>
                <tbody>`;
    
    lista.forEach(alumno => {
        html += `
            <tr>
                <td class="fw-bold">${alumno[1]}</td>
                <td class="text-center"><input type="radio" class="form-check-input" name="estado_${alumno[0]}" value="P" checked></td>
                <td class="text-center"><input type="radio" class="form-check-input" name="estado_${alumno[0]}" value="A"></td>
                <td class="text-center"><input type="radio" class="form-check-input" name="estado_${alumno[0]}" value="T"></td>
            </tr>`;
    });

    html += `</tbody></table></div>
        <button type="button" onclick="guardarTodo()" class="btn btn-success w-100 mt-3 btn-lg">💾 Confirmar Asistencia</button>
        </form>`;
    
    document.getElementById('zona-planilla').innerHTML = html;
}

async function guardarTodo() {
    const inputs = document.querySelectorAll('input[type="radio"]:checked');
    let lista = [];
    inputs.forEach(inp => lista.push({ dni: inp.name.split('_')[1], estado: inp.value }));

    document.getElementById('zona-planilla').innerHTML = '<div class="alert alert-warning">Guardando...</div>';

    await fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify({
            op: 'guardarAsistenciaMasiva',
            lista: lista,
            preceptor: usuarioActual.nombre
        })
    });
    
    alert("¡Asistencia guardada!");
    document.getElementById('selector-curso').value = "";
    document.getElementById('zona-planilla').innerHTML = "";
}
