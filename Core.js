
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
    const menuMovil = document.getElementById('navbar-mobile');
    
    // Limpiar ambos menús
    menuLateral.innerHTML = '';
    menuMovil.innerHTML = '';

    // --- FUNCIÓN HELPER PARA AGREGAR BOTONES ---
    const agregarBoton = (texto, icono, onclick, activo = false) => {
        // 1. Versión Escritorio (Lista)
        const claseActivo = activo ? 'active' : '';
        menuLateral.innerHTML += `
            <button class="list-group-item list-group-item-action ${claseActivo}" onclick="${onclick}">
                ${texto}
            </button>`;
            
        // 2. Versión Móvil (Icono + Texto)
        const claseActivoMovil = activo ? 'active' : '';
        menuMovil.innerHTML += `
            <button onclick="${onclick}" class="${claseActivoMovil}">
                <span style="font-size:22px;">${icono}</span>
                <span style="font-size:10px;">${texto.split(' ')[1] || texto}</span>
            </button>`;
    };

    // --- CONFIGURACIÓN DE MENÚS POR ROL ---
    
    if (rol === 'directivo') {
        agregarBoton('🎓 Estudiantes', '👥', 'verEstudiantes()', true);
        agregarBoton('👨‍🏫 Docentes', '👨‍🏫', 'verDocentes()');
        agregarBoton('📋 Preceptores', '📋', 'verPreceptores()');
        
        // Mostrar estudiantes por defecto
        setTimeout(() => verEstudiantes(), 100);
    }
    
    if (rol === 'preceptor') {
        agregarBoton('📝 Asistencia', '📝', 'iniciarModuloPreceptor()', true);
        agregarBoton('📞 Docentes', '📞', 'verContactosDocentes()');
        
        // Mostrar asistencia por defecto
        setTimeout(() => iniciarModuloPreceptor(), 100);
    }
    
    if (rol === 'docente') {
        agregarBoton('🏫 Cursos', '🏫', 'iniciarModuloDocente()', true);
        agregarBoton('👤 Datos', '👤', 'verMisDatosDocente()');
        
        // Mostrar cursos por defecto
        setTimeout(() => iniciarModuloDocente(), 100);
    }

    // Botón Salir (Siempre al final)
    menuLateral.innerHTML += `
        <button class="list-group-item list-group-item-action text-danger mt-3" onclick="location.reload()">
            <i class="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
        </button>`;
        
    menuMovil.innerHTML += `
        <button onclick="location.reload()" class="text-danger">
            <span style="font-size:22px;">🚪</span>
            <span style="font-size:10px;">Salir</span>
        </button>`;
    
    // Asegurarnos de que la barra móvil se muestre
    menuMovil.classList.remove('d-none');
    
    // Actualizar el título de la sección
    if (rol === 'directivo') {
        document.getElementById('titulo-seccion').innerText = 'Gestión Directiva';
    } else if (rol === 'preceptor') {
        document.getElementById('titulo-seccion').innerText = 'Control de Asistencia';
    } else if (rol === 'docente') {
        document.getElementById('titulo-seccion').innerText = 'Panel Docente';
    }
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

// Función para detectar dispositivo móvil
function esMovil() {
    return window.innerWidth <= 768;
}

// Redirigir automáticamente el primer menú al cargar en móvil
document.addEventListener('DOMContentLoaded', function() {
    // Si estamos en móvil y ya hay un usuario logueado, ejecutar el primer menú
    if (esMovil() && usuarioActual) {
        const rol = usuarioActual.rol.toLowerCase();
        if (rol === 'directivo') {
            verEstudiantes();
        } else if (rol === 'preceptor') {
            iniciarModuloPreceptor();
        } else if (rol === 'docente') {
            iniciarModuloDocente();
        }
    }
});
