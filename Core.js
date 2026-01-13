// ============================================================================
// ARCHIVO: Core.js
// ============================================================================

// --- TU URL DE GOOGLE APPS SCRIPT (CAMBIALA SI ES NECESARIO) ---
const URL_API = "https://script.google.com/macros/s/AKfycbyTGnoS8hevr6k7pXE16p7KtcQxYrYP0yc11yJoJyvfX8Z7pEKJ5ZYymJ--IBcoVqUB/exec"; 

// --- VARIABLES GLOBALES ---
let usuarioActual = null;
let baseDatosAlumnos = []; 
let baseDatosDocentes = []; 
let baseDatosPreceptores = [];

// ==========================================
// LOGIN Y DASHBOARD
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
        errorMsg.innerText = "Error de conexión.";
        errorMsg.classList.remove('d-none');
    } finally {
        btn.innerText = "Ingresar";
        btn.disabled = false;
    }
}

function cargarDashboard(usuario) {
    // 1. Ocultar Login y Mostrar App (Corregido ID 'app-screen')
    document.getElementById('login-screen').classList.add('d-none');
    document.getElementById('app-screen').classList.remove('d-none'); 
    
    // 2. Cargar Datos Usuario
    document.getElementById('user-name').innerText = usuario.nombre;

    const rol = usuario.rol.toLowerCase();
    const menuLateral = document.getElementById('menu-lateral');
    const menuMovil = document.getElementById('navbar-mobile'); 
    
    menuLateral.innerHTML = '';
    menuMovil.innerHTML = ''; 

    // --- FUNCIÓN HELPER MEJORADA PARA IOS ---
    const agregarBoton = (texto, icono, onclick, claseEstado = '') => {
        
        // A. Versión Escritorio (Lista limpia)
        // Si claseEstado es 'active', el CSS lo pinta de azul automáticamente
        menuLateral.innerHTML += `
            <button class="list-group-item list-group-item-action ${claseEstado}" onclick="${onclick}">
                <span class="me-2">${icono}</span> ${texto}
            </button>`;
            
        // B. Versión Móvil (Dock iOS)
        // Usamos la clase .active real para que tome el color de la marca
        // El CSS se encarga del tamaño de la fuente, no ponemos styles en linea.
        menuMovil.innerHTML += `
            <button onclick="${onclick}" class="${claseEstado === 'active' ? 'active' : ''}">
                <span>${icono}</span>
                <span>${texto.split(' ')[1] || texto}</span> 
            </button>`;
    };

    // --- CONFIGURACIÓN DE MENÚS POR ROL ---
    
    if (rol === 'directivo') {
        // En directivos no solemos marcar uno como activo por defecto, o sí, depende tu gusto.
        agregarBoton('🎓 Estudiantes', '🎓', 'verEstudiantes()'); 
        agregarBoton('👨‍🏫 Docentes', '👨‍🏫', 'verDocentes()');
        agregarBoton('📋 Preceptores', '📋', 'verPreceptores()');
    }
    
    if (rol === 'preceptor') {
        agregarBoton('📝 Asistencia', '📝', 'iniciarModuloPreceptor()', 'active');
        agregarBoton('📞 Docentes', '📞', 'verContactosDocentes()');
    }
    
    if (rol === 'docente') {
        agregarBoton('🏫 Cursos', '🏫', 'iniciarModuloDocente()', 'active');
        agregarBoton('👤 Datos', '👤', 'verMisDatosDocente()');
    }

    // Botón Salir (Siempre al final) - Versión Móvil
    menuMovil.innerHTML += `
        <button onclick="location.reload()" class="text-secondary">
            <span>🚪</span>
            <span>Salir</span>
        </button>`;
        
    // Botón Salir - Versión Escritorio
    menuLateral.innerHTML += `
        <button class="list-group-item list-group-item-action text-danger mt-3" onclick="location.reload()">
            <span class="me-2">🚪</span> Cerrar Sesión
        </button>`;
}


function calcularEdad(fechaString) {
    if (!fechaString) return "-";
    const hoy = new Date();
    const nacimiento = new Date(fechaString);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) { edad--; }
    return isNaN(edad) ? "-" : edad + " años";
}
