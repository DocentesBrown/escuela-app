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
    document.getElementById('login-screen').classList.add('d-none');
    document.getElementById('dashboard-screen').classList.remove('d-none');
    document.getElementById('user-name').innerText = usuario.nombre;

    const rol = usuario.rol.toLowerCase();
    const menuLateral = document.getElementById('menu-lateral');
    const menuMovil = document.getElementById('navbar-mobile'); // NUEVO
    
    menuLateral.innerHTML = '';
    menuMovil.innerHTML = ''; // Limpiar móvil

    // --- FUNCIÓN HELPER PARA AGREGAR BOTONES ---
    const agregarBoton = (texto, icono, onclick, claseColor = '') => {
        // 1. Versión Escritorio (Lista)
        menuLateral.innerHTML += `
            <button class="list-group-item list-group-item-action ${claseColor}" onclick="${onclick}">
                ${texto}
            </button>`;
            
        // 2. Versión Móvil (Icono + Texto)
        // Usamos emojis como iconos si no tienes FontAwesome, o cámbialos por <i class="bi bi-..."></i>
        menuMovil.innerHTML += `
            <button onclick="${onclick}" class="${claseColor ? 'text-primary' : ''}">
                <span style="font-size:20px;">${icono}</span>
                <span>${texto.split(' ')[1] || texto}</span> </button>`;
    };

    // --- CONFIGURACIÓN DE MENÚS POR ROL ---
    
    if (rol === 'directivo') {
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
    
    if (rol === 'estudiante') {
        agregarBoton('📚 Mis Materias', '📚', 'iniciarModuloEstudiante()', 'active');
        // Si quieres que vean sus datos personales, puedes reusar la función de ver datos si la adaptas, 
        // o simplemente dejarles ver materias por ahora.
        agregarBoton('👤 Mis Datos', '👤', 'alert("Próximamente")'); 
    }
    
    // Botón Salir (Siempre al final)
    menuMovil.innerHTML += `
        <button onclick="location.reload()" class="text-danger">
            <span style="font-size:20px;">🚪</span>
            <span>Salir</span>
        </button>`;
        
    menuLateral.innerHTML += `<button class="list-group-item list-group-item-action text-danger mt-3" onclick="location.reload()">Cerrar Sesión</button>`;
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
