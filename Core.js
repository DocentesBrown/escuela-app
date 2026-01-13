// ============================================================================
// ARCHIVO: Core.js (VERSIÓN ROBUSTA / DEBUG)
// ============================================================================

const URL_API = "https://script.google.com/macros/s/AKfycbyTGnoS8hevr6k7pXE16p7KtcQxYrYP0yc11yJoJyvfX8Z7pEKJ5ZYymJ--IBcoVqUB/exec"; 

let usuarioActual = null;
let baseDatosAlumnos = []; 
let baseDatosDocentes = []; 
let baseDatosPreceptores = [];

// --- INICIO DE SESIÓN ---
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
            // ALERT: Confirmación visual temporal
            // alert("Login exitoso. Rol detectado: " + data.rol); 
            cargarDashboard(data);
        } else {
            throw new Error(data.message || "Datos incorrectos");
        }
    } catch (e) {
        errorMsg.innerText = e.message;
        errorMsg.classList.remove('d-none');
        alert("Error al ingresar: " + e.message);
    } finally {
        btn.innerText = "Ingresar";
        btn.disabled = false;
    }
}

function cargarDashboard(user) {
    try {
        // 1. Ocultar Login / Mostrar Dashboard
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('dashboard-screen').classList.remove('d-none');
        
        // 2. Llenar datos de usuario
        const nombre = user.nombre || "Usuario";
        document.getElementById('user-name').innerText = nombre.split(' ')[0];
        document.getElementById('user-initial').innerText = nombre.charAt(0).toUpperCase();
        
        // Rol en pantalla
        const rolDisplay = user.rol ? user.rol.toUpperCase() : "SIN ROL";
        document.getElementById('user-role-display').innerText = rolDisplay;

        // 3. Generar Menú
        generarMenu(user.rol);

    } catch (error) {
        console.error(error);
        alert("Error cargando el panel: " + error.message);
    }
}

function generarMenu(rolOriginal) {
    // Normalizar rol (quitar espacios, minúsculas)
    const rol = rolOriginal ? rolOriginal.toString().trim().toLowerCase() : "invitado";
    
    const menuLateral = document.getElementById('menu-lateral');
    const menuMovil = document.getElementById('menu-movil');

    // Limpiar menús previos
    if (menuLateral) menuLateral.innerHTML = '';
    if (menuMovil) menuMovil.innerHTML = '';

    let menuEncontrado = false;

    // --- DEFINICIÓN DE BOTONES ---
    // (Rol: DIRECTIVO / ADMIN)
    if (['directivo', 'director', 'admin'].includes(rol)) {
        crearBoton('Estudiantes', '🎓', 'verEstudiantes', true);
        crearBoton('Docentes', '👨‍🏫', 'verDocentes');
        crearBoton('Preceptores', '📋', 'verPreceptores');
        
        // Intentar cargar la primera pantalla automáticamente
        setTimeout(() => {
            if (typeof window.verEstudiantes === 'function') window.verEstudiantes();
        }, 500);
        menuEncontrado = true;
    }

    // (Rol: PRECEPTOR)
    else if (rol === 'preceptor') {
        crearBoton('Asistencia', '📝', 'iniciarModuloPreceptor', true);
        crearBoton('Docentes', '📞', 'verContactosDocentes');
        
        setTimeout(() => {
            if (typeof window.iniciarModuloPreceptor === 'function') window.iniciarModuloPreceptor();
        }, 500);
        menuEncontrado = true;
    }

    // (Rol: DOCENTE)
    else if (['docente', 'profesor'].includes(rol)) {
        crearBoton('Cursos', '🏫', 'iniciarModuloDocente', true);
        crearBoton('Mis Datos', '👤', 'verMisDatosDocente');
        
        setTimeout(() => {
            if (typeof window.iniciarModuloDocente === 'function') window.iniciarModuloDocente();
        }, 500);
        menuEncontrado = true;
    }

    // Si no encontró rol, mostrar aviso
    if (!menuEncontrado) {
        const msg = `<div class="p-3 text-danger">Tu rol "${rolOriginal}" no tiene menú asignado.</div>`;
        if (menuLateral) menuLateral.innerHTML = msg;
        if (menuMovil) menuMovil.innerHTML = msg;
    }

    // Botón Salir Móvil
    if (menuMovil) {
        const btnSalir = document.createElement('button');
        btnSalir.className = 'nav-item-mobile text-danger';
        btnSalir.onclick = () => location.reload();
        btnSalir.innerHTML = `<span class="icon">🚪</span><span>Salir</span>`;
        menuMovil.appendChild(btnSalir);
    }
}

function crearBoton(texto, icono, nombreFuncion, activo = false) {
    // Referencias a los contenedores
    const menuLateral = document.getElementById('menu-lateral');
    const menuMovil = document.getElementById('menu-movil');

    // Función segura de ejecución
    const accion = () => {
        if (typeof window[nombreFuncion] === 'function') {
            window[nombreFuncion]();
            // Actualizar títulos
            const titulo = document.getElementById('titulo-seccion');
            if (titulo) titulo.innerText = texto;
        } else {
            alert(`Error: No se encuentra la función "${nombreFuncion}". Verifica que el archivo .js esté cargado.`);
        }
    };

    // 1. Botón PC
    if (menuLateral) {
        const btn = document.createElement('button');
        btn.className = `sidebar-btn ${activo ? 'active' : ''}`;
        btn.onclick = () => { 
            limpiarClases('sidebar-btn'); 
            btn.classList.add('active'); 
            accion(); 
        };
        btn.innerHTML = `<span>${icono}</span> ${texto}`;
        menuLateral.appendChild(btn);
    }

    // 2. Botón Celular
    if (menuMovil) {
        const btn = document.createElement('button');
        btn.className = `nav-item-mobile ${activo ? 'active' : ''}`;
        btn.onclick = () => { 
            limpiarClases('nav-item-mobile'); 
            btn.classList.add('active'); 
            accion(); 
        };
        btn.innerHTML = `<span class="icon">${icono}</span><span>${texto}</span>`;
        menuMovil.appendChild(btn);
    }
}

function limpiarClases(claseBase) {
    document.querySelectorAll('.' + claseBase).forEach(b => b.classList.remove('active'));
}

// Utilidad necesaria
function calcularEdad(fecha) {
    if (!fecha) return "-";
    const hoy = new Date();
    const nac = new Date(fecha);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
}

// Sincronización PC <-> Celular
document.addEventListener("DOMContentLoaded", () => {
    const desktopDiv = document.getElementById('contenido-dinamico');
    const mobileDiv = document.getElementById('contenido-dinamico-movil');

    if (desktopDiv && mobileDiv) {
        const observer = new MutationObserver(() => {
            mobileDiv.innerHTML = desktopDiv.innerHTML;
        });
        observer.observe(desktopDiv, { childList: true, subtree: true });
    }
});
