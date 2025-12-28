// ARCHIVO: script.js

// --- PEGA TU URL DE GOOGLE AQUÍ ABAJO ---
const URL_API = "https://script.google.com/macros/s/AKfycbyTGnoS8hevr6k7pXE16p7KtcQxYrYP0yc11yJoJyvfX8Z7pEKJ5ZYymJ--IBcoVqUB/exec"; 
// ----------------------------------------

let usuarioActual = null; // Para recordar quién se logueó

async function iniciarSesion() {
    const email = document.getElementById('email').value;
    const clave = document.getElementById('clave').value;
    const btn = document.getElementById('btn-login');
    
    btn.innerText = "Entrando...";
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

    // MENU DIRECTIVO
    if (user.rol === 'Directivo') {
        menu.innerHTML += `<button class="list-group-item list-group-item-action" onclick="verEstudiantes()">Gestionar Estudiantes</button>`;
        menu.innerHTML += `<button class="list-group-item list-group-item-action" onclick="verDocentes()">Gestionar Docentes</button>`;
    }
    // MENU PRECEPTOR
    if (user.rol === 'Preceptor') {
        menu.innerHTML += `<button class="list-group-item list-group-item-action" onclick="mostrarFormAsistencia()">Tomar Asistencia</button>`;
    }
    // MENU DOCENTE
    if (user.rol === 'Docente') {
        menu.innerHTML += `<button class="list-group-item list-group-item-action" onclick="mostrarCargaNotas()">Cargar Notas</button>`;
    }
    
    menu.innerHTML += `<button class="list-group-item list-group-item-action text-danger" onclick="location.reload()">Salir</button>`;
}

// --- FUNCIONES DIRECTIVO ---
async function verEstudiantes() {
    mostrarCargando("Cargando lista de alumnos...");
    const resp = await fetch(`${URL_API}?op=getEstudiantes&rol=Directivo`);
    const json = await resp.json();
    
    let html = `<table class="table table-striped"><thead><tr><th>DNI</th><th>Nombre</th><th>Curso</th></tr></thead><tbody>`;
    json.data.forEach(fila => {
        html += `<tr><td>${fila[0]}</td><td>${fila[1]}</td><td>${fila[2]}</td></tr>`;
    });
    html += `</tbody></table>`;
    
    document.getElementById('contenido-dinamico').innerHTML = html;
}

async function verDocentes() {
    mostrarCargando("Cargando docentes...");
    // Reutilizamos la tabla Usuarios pero filtramos en cliente por simplicidad
    const resp = await fetch(`${URL_API}?op=getDocentes&rol=Directivo`);
    const json = await resp.json();
    
    let html = `<h5>Lista de Docentes</h5><ul class="list-group">`;
    json.data.forEach(fila => {
        if(fila[2] === 'Docente') { // Columna 2 es ROL
            html += `<li class="list-group-item">${fila[3]} (${fila[0]})</li>`;
        }
    });
    html += `</ul>`;
    document.getElementById('contenido-dinamico').innerHTML = html;
}

// --- FUNCIONES PRECEPTOR ---
function mostrarFormAsistencia() {
    const html = `
        <h5>Tomar Asistencia Rápida</h5>
        <div class="mb-3">
            <label>DNI Alumno:</label>
            <input type="text" id="asis-dni" class="form-control">
        </div>
        <div class="mb-3">
            <label>Estado:</label>
            <select id="asis-estado" class="form-select">
                <option value="Presente">Presente</option>
                <option value="Ausente">Ausente</option>
                <option value="Tarde">Tarde</option>
            </select>
        </div>
        <button onclick="enviarAsistencia()" class="btn btn-success">Guardar</button>
    `;
    document.getElementById('contenido-dinamico').innerHTML = html;
}

async function enviarAsistencia() {
    const dni = document.getElementById('asis-dni').value;
    const estado = document.getElementById('asis-estado').value;
    
    const datos = {
        op: 'guardarAsistencia',
        dni_alumno: dni,
        estado: estado,
        preceptor: usuarioActual.nombre
    };

    enviarDatos(datos);
}

// --- FUNCIONES DOCENTE ---
function mostrarCargaNotas() {
    const html = `
        <h5>Cargar Nota</h5>
        <input type="text" id="nota-dni" placeholder="DNI Alumno" class="form-control mb-2">
        <input type="text" id="nota-materia" placeholder="Materia" class="form-control mb-2">
        <select id="nota-periodo" class="form-select mb-2">
            <option>Cuatrimestre_1</option>
            <option>Cuatrimestre_2</option>
            <option>Nota_Final</option>
        </select>
        <input type="number" id="nota-valor" placeholder="Nota (1-10)" class="form-control mb-2">
        <button onclick="enviarNota()" class="btn btn-primary">Subir Nota</button>
    `;
    document.getElementById('contenido-dinamico').innerHTML = html;
}

async function enviarNota() {
    const datos = {
        op: 'guardarNota',
        dni_alumno: document.getElementById('nota-dni').value,
        materia: document.getElementById('nota-materia').value,
        periodo: document.getElementById('nota-periodo').value,
        nota: document.getElementById('nota-valor').value,
        profesor: usuarioActual.nombre
    };
    enviarDatos(datos);
}

// --- AUXILIARES ---
async function enviarDatos(objetoDatos) {
    document.getElementById('contenido-dinamico').innerHTML = '<div class="alert alert-info">Guardando...</div>';
    
    // TRUCO PARA EVITAR ERROR DE CORS EN GOOGLE APPS SCRIPT:
    // Usamos 'no-cors' o text/plain, Google maneja esto especial.
    await fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify(objetoDatos)
    });

    alert("¡Guardado con éxito!");
    document.getElementById('contenido-dinamico').innerHTML = '<div class="alert alert-success">Datos guardados. Seleccione otra opción del menú.</div>';
}

function mostrarCargando(txt) {
    document.getElementById('contenido-dinamico').innerHTML = `<div class="spinner-border text-primary" role="status"></div> ${txt}`;
}
