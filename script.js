// ARCHIVO: script.js (Con Filtro Inteligente)

// ----------------------------------------------------
const URL_API = "https://script.google.com/macros/s/AKfycbyTGnoS8hevr6k7pXE16p7KtcQxYrYP0yc11yJoJyvfX8Z7pEKJ5ZYymJ--IBcoVqUB/exec"; 
// ----------------------------------------------------

let usuarioActual = null;
let baseDatosAlumnos = []; // Aquí guardaremos todo para que sea rápido

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
    document.getElementById('user-name').innerText = user.nombre;

    const menu = document.getElementById('menu-lateral');
    menu.innerHTML = '';

    if (user.rol === 'Preceptor') {
        // Al entrar como preceptor, descargamos los datos YA MISMO
        iniciarModuloPreceptor();
    }
    
    menu.innerHTML += `<button class="list-group-item list-group-item-action text-danger mt-3" onclick="location.reload()">Salir</button>`;
}

// ==========================================
// MÓDULO PRECEPTORES INTELIGENTE
// ==========================================

async function iniciarModuloPreceptor() {
    // Mostramos mensaje de carga inicial
    document.getElementById('contenido-dinamico').innerHTML = `
        <div class="alert alert-info text-center">
            <div class="spinner-border spinner-border-sm"></div> 
            Descargando base de datos de estudiantes... Por favor espera.
        </div>
    `;

    try {
        // Pedimos TODOS los estudiantes de una sola vez
        const resp = await fetch(`${URL_API}?op=getDataPreceptor&rol=Preceptor`);
        const json = await resp.json();
        
        // Guardamos en memoria
        baseDatosAlumnos = json.data; 
        
        // Ahora dibujamos la pantalla
        renderizarPantallaPreceptor();

    } catch (e) {
        document.getElementById('contenido-dinamico').innerHTML = `<div class="alert alert-danger">Error al descargar datos. Recarga la página.</div>`;
    }
}

function renderizarPantallaPreceptor() {
    // 1. Analizar cursos disponibles automáticamente
    // La columna Curso es la [2] en el Excel (0=DNI, 1=Nombre, 2=Curso)
    const todosLosCursos = baseDatosAlumnos.map(fila => fila[2]);
    
    // Eliminar duplicados y ordenar (Set crea lista de unicos)
    const cursosUnicos = [...new Set(todosLosCursos)].sort();

    // 2. Crear las opciones del Select HTML
    let opcionesHTML = `<option value="" selected disabled>Selecciona un Curso</option>`;
    cursosUnicos.forEach(curso => {
        if(curso) { // Solo si no está vacío
            opcionesHTML += `<option value="${curso}">${curso}</option>`;
        }
    });

    const html = `
        <div class="card p-3 mb-3 shadow-sm">
            <h5>📅 Tomar Asistencia</h5>
            <div class="mb-2 text-muted small">Cursos detectados automáticamente desde el Excel</div>
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
    
    // FILTRO LOCAL (Instantáneo, no usa internet)
    const alumnosDelCurso = baseDatosAlumnos.filter(fila => String(fila[2]) === cursoSeleccionado);
    
    // Ordenar por nombre
    alumnosDelCurso.sort((a, b) => String(a[1]).localeCompare(String(b[1])));

    renderizarTabla(alumnosDelCurso);
}

function renderizarTabla(lista) {
    if (lista.length === 0) return;

    let html = `
        <form id="form-asistencia">
        <div class="table-responsive bg-white rounded shadow-sm">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-dark">
                    <tr>
                        <th>Estudiante</th>
                        <th class="text-center">P</th>
                        <th class="text-center">A</th>
                        <th class="text-center">T</th>
                    </tr>
                </thead>
                <tbody>
    `;

    lista.forEach(alumno => {
        const dni = alumno[0];
        const nombre = alumno[1];
        
        html += `
            <tr>
                <td class="fw-bold">${nombre}</td>
                <td class="text-center"><input type="radio" class="form-check-input" name="estado_${dni}" value="P" checked></td>
                <td class="text-center"><input type="radio" class="form-check-input" name="estado_${dni}" value="A"></td>
                <td class="text-center"><input type="radio" class="form-check-input" name="estado_${dni}" value="T"></td>
            </tr>
        `;
    });

    html += `</tbody></table></div>
        <button type="button" onclick="guardarTodo()" class="btn btn-success w-100 mt-3 btn-lg">💾 Confirmar Asistencia</button>
        </form>`;
    
    document.getElementById('zona-planilla').innerHTML = html;
}

async function guardarTodo() {
    const inputs = document.querySelectorAll('input[type="radio"]:checked');
    let lista = [];

    inputs.forEach(inp => {
        lista.push({ dni: inp.name.split('_')[1], estado: inp.value });
    });

    document.getElementById('zona-planilla').innerHTML = '<div class="alert alert-warning">Guardando en la nube...</div>';

    await fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify({
            op: 'guardarAsistenciaMasiva',
            lista: lista,
            preceptor: usuarioActual.nombre
        })
    });

    alert("¡Asistencia guardada!");
    // Limpiamos selección para evitar doble carga
    document.getElementById('selector-curso').value = "";
    document.getElementById('zona-planilla').innerHTML = "";
}
