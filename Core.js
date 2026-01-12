
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
// FUNCIONES DE DETECCIÓN DE DISPOSITIVO
// ==========================================

// Detectar si es dispositivo móvil
function esMovil() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

// Función para actualizar el estado activo en la barra móvil
function actualizarMenuActivoMobile(textoBoton) {
    const botonesMobile = document.querySelectorAll('#navbar-mobile button');
    botonesMobile.forEach(btn => {
        btn.classList.remove('active');
        // Buscar el botón cuyo texto coincide
        const spanText = btn.querySelector('span:last-child');
        if (spanText && spanText.textContent.toLowerCase().includes(textoBoton.toLowerCase())) {
            btn.classList.add('active');
        }
    });
}

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
    const agregarBoton = (texto, iconoBootstrap, onclick, activo = false) => {
        // 1. Versión Escritorio (Lista)
        const claseActivo = activo ? 'active' : '';
        menuLateral.innerHTML += `
            <button class="list-group-item list-group-item-action ${claseActivo}" onclick="${onclick}">
                <i class="bi ${iconoBootstrap} me-2"></i>${texto}
            </button>`;
            
        // 2. Versión Móvil (Icono + Texto)
        const claseActivoMovil = activo ? 'active' : '';
        const textoCorto = texto.split(' ')[0];
        menuMovil.innerHTML += `
            <button onclick="${onclick}" class="${claseActivoMovil}">
                <span style="font-size:22px;"><i class="bi ${iconoBootstrap}"></i></span>
                <span style="font-size:10px; margin-top:2px;">${textoCorto}</span>
            </button>`;
    };

    // --- CONFIGURACIÓN DE MENÚS POR ROL ---
    
    if (rol === 'directivo') {
        agregarBoton('Estudiantes', 'bi-people-fill', 'verEstudiantes(); actualizarMenuActivoMobile("Estudiantes")', true);
        agregarBoton('Docentes', 'bi-person-badge-fill', 'verDocentes(); actualizarMenuActivoMobile("Docentes")');
        agregarBoton('Preceptores', 'bi-clipboard-check-fill', 'verPreceptores(); actualizarMenuActivoMobile("Preceptores")');
        
        // Mostrar estudiantes por defecto
        setTimeout(() => {
            verEstudiantes();
            actualizarMenuActivoMobile('Estudiantes');
        }, 100);
    }
    
    if (rol === 'preceptor') {
        agregarBoton('Asistencia', 'bi-clipboard-data-fill', 'iniciarModuloPreceptor(); actualizarMenuActivoMobile("Asistencia")', true);
        agregarBoton('Contactos', 'bi-telephone-fill', 'verContactosDocentes(); actualizarMenuActivoMobile("Contactos")');
        
        // Mostrar asistencia por defecto
        setTimeout(() => {
            iniciarModuloPreceptor();
            actualizarMenuActivoMobile('Asistencia');
        }, 100);
    }
    
    if (rol === 'docente') {
        agregarBoton('Cursos', 'bi-mortarboard-fill', 'iniciarModuloDocente(); actualizarMenuActivoMobile("Cursos")', true);
        agregarBoton('Datos', 'bi-person-circle', 'verMisDatosDocente(); actualizarMenuActivoMobile("Datos")');
        
        // Mostrar cursos por defecto
        setTimeout(() => {
            iniciarModuloDocente();
            actualizarMenuActivoMobile('Cursos');
        }, 100);
    }

    // Botón Salir (Siempre al final)
    menuLateral.innerHTML += `
        <button class="list-group-item list-group-item-action text-danger mt-3" onclick="location.reload()">
            <i class="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
        </button>`;
        
    menuMovil.innerHTML += `
        <button onclick="location.reload()" class="text-danger">
            <span style="font-size:22px;"><i class="bi bi-box-arrow-right"></i></span>
            <span style="font-size:10px; margin-top:2px;">Salir</span>
        </button>`;
    
    // Asegurarnos de que la barra móvil se muestre (si es móvil)
    if (esMovil()) {
        menuMovil.classList.remove('d-none');
        menuMovil.style.display = 'flex';
    } else {
        menuMovil.classList.add('d-none');
    }
    
    // Actualizar el título de la sección
    if (rol === 'directivo') {
        document.getElementById('titulo-seccion').innerText = 'Gestión Directiva';
    } else if (rol === 'preceptor') {
        document.getElementById('titulo-seccion').innerText = 'Control de Asistencia';
    } else if (rol === 'docente') {
        document.getElementById('titulo-seccion').innerText = 'Panel Docente';
    }
}

// ==========================================
// UTILIDADES
// ==========================================

function calcularEdad(fechaString) {
    if (!fechaString) return "-";
    const hoy = new Date();
    const nacimiento = new Date(fechaString);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) { edad--; }
    return isNaN(edad) ? "-" : edad + " años";
}

// ==========================================
// MANEJO DE REDIMENSIONAMIENTO DE VENTANA
// ==========================================

window.addEventListener('resize', function() {
    const menuMovil = document.getElementById('navbar-mobile');
    if (menuMovil) {
        if (esMovil()) {
            menuMovil.classList.remove('d-none');
            menuMovil.style.display = 'flex';
        } else {
            menuMovil.classList.add('d-none');
            menuMovil.style.display = 'none';
        }
    }
});

// ==========================================
// INICIALIZACIÓN
// ==========================================

// Verificar si hay usuario al cargar (para desarrollo)
document.addEventListener('DOMContentLoaded', function() {
    // Forzar la visualización correcta de la barra móvil si es necesario
    if (esMovil()) {
        const menuMovil = document.getElementById('navbar-mobile');
        if (menuMovil) {
            menuMovil.style.display = 'flex';
        }
    }
});
