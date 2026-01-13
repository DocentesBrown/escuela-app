// ============================================================================
// ARCHIVO: Core.js (CORREGIDO - ROLES Y MENÚS)
// ============================================================================

const URL_API = "https://script.google.com/macros/s/AKfycbyTGnoS8hevr6k7pXE16p7KtcQxYrYP0yc11yJoJyvfX8Z7pEKJ5ZYymJ--IBcoVqUB/exec"; 

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
    
    // Reset visual
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
            errorMsg.innerText = data.message || "Credenciales incorrectas";
            errorMsg.classList.remove('d-none');
        }
    } catch (e) {
        console.error("Error de login:", e);
        errorMsg.innerText = "Error de conexión. Intenta nuevamente.";
        errorMsg.classList.remove('d-none');
    } finally {
        btn.innerText = "Ingresar";
        btn.disabled = false;
    }
}

function cargarDashboard(user) {
    console.log("Cargando Dashboard para:", user.rol); // Debug

    // 1. Ocultar login, mostrar dashboard
    document.getElementById('login-screen').classList.add('d-none');
    document.getElementById('dashboard-screen').classList.remove('d-none');
    
    // 2. Cargar datos básicos de usuario (Evitamos errores si falta el nombre)
    const nombreMostrar = user.nombre ? user.nombre.split(' ')[0] : 'Usuario';
    const inicial = user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U';

    document.getElementById('user-name').innerText = nombreMostrar;
    document.getElementById('user-initial').innerText = inicial;
    
    // Elementos móviles si existen
    const initialMobile = document.getElementById('user-initial-mobile');
    if(initialMobile) initialMobile.innerText = inicial;

    document.getElementById('user-role-display').innerText = user.rol.toUpperCase();

    // 3. Generar Menús (Desktop y Mobile)
    generarMenu(user.rol);
}

function generarMenu(rolOriginal) {
    const menuLateral = document.getElementById('menu-lateral'); // Desktop
    const menuMovil = document.getElementById('menu-movil');     // Mobile
    
    if(!menuLateral || !menuMovil) {
        console.error("Error: No encuentro los contenedores del menú en el HTML");
        return;
    }

    menuLateral.innerHTML = '';
    menuMovil.innerHTML = '';

    // AQUI ESTA LA CORRECCION: Normalizamos el rol a minúsculas y sin espacios
    const rol = rolOriginal.toString().trim().toLowerCase();
    console.log("Generando menú para rol normalizado:", rol);

    // Función auxiliar para crear botones
    const crearBoton = (texto, icono, accion, activo = false) => {
        // 1. Botón Desktop (Sidebar)
        const btnDesk = document.createElement('button');
        btnDesk.className = `sidebar-btn ${activo ? 'active' : ''}`;
        // Usamos una función anónima para evitar problemas con eval()
        btnDesk.onclick = () => { 
            ejecutarAccion(accion);
            actualizarTitulos(texto);
            setActive(btnDesk, 'desktop'); 
        };
        btnDesk.innerHTML = `<span>${icono}</span> ${texto}`;
        menuLateral.appendChild(btnDesk);

        // 2. Botón Mobile (Bottom Nav)
        const btnMov = document.createElement('button');
        btnMov.className = `nav-item-mobile ${activo ? 'active' : ''}`;
        btnMov.onclick = () => { 
            ejecutarAccion(accion);
            actualizarTitulos(texto);
            setActive(btnMov, 'mobile'); 
        };
        btnMov.innerHTML = `<span class="icon">${icono}</span><span>${texto}</span>`;
        menuMovil.appendChild(btnMov);
    };

    // --- LÓGICA DE ROLES ---
    
    // ROL: DIRECTIVO
    if (rol === 'directivo' || rol === 'director' || rol === 'admin') {
        crearBoton('Estudiantes', '🎓', 'verEstudiantes', true);
        crearBoton('Docentes', '👨‍🏫', 'verDocentes');
        crearBoton('Preceptores', '📋', 'verPreceptores');
        // Cargar vista inicial
        setTimeout(() => { if(typeof verEstudiantes === 'function') verEstudiantes(); }, 100);
    }
    
    // ROL: PRECEPTOR
    else if (rol === 'preceptor') {
        crearBoton('Asistencia', '📝', 'iniciarModuloPreceptor', true);
        crearBoton('Docentes', '📞', 'verContactosDocentes'); // Asegúrate que esta función exista en Modulo_Preceptor
        setTimeout(() => { if(typeof iniciarModuloPreceptor === 'function') iniciarModuloPreceptor(); }, 100);
    }
    
    // ROL: DOCENTE
    else if (rol === 'docente' || rol === 'profesor') {
        crearBoton('Cursos', '🏫', 'iniciarModuloDocente', true);
        crearBoton('Mis Datos', '👤', 'verMisDatosDocente'); // Asegúrate que esta función exista
        setTimeout(() => { if(typeof iniciarModuloDocente === 'function') iniciarModuloDocente(); }, 100);
    } 
    
    // ROL DESCONOCIDO (Fallback)
    else {
        menuLateral.innerHTML = `<div class="p-3 text-danger">Rol no reconocido: ${rol}</div>`;
    }

    // Botón Salir Móvil (siempre al final)
    const btnSalirMovil = document.createElement('button');
    btnSalirMovil.className = 'nav-item-mobile text-danger';
    btnSalirMovil.onclick = () => location.reload();
    btnSalirMovil.innerHTML = `<span class="icon">🚪</span><span>Salir</span>`;
    menuMovil.appendChild(btnSalirMovil);
}

// Ejecutor seguro de funciones
function ejecutarAccion(nombreFuncion) {
    // Busca la función en el ámbito global (window)
    if (typeof window[nombreFuncion] === "function") {
        window[nombreFuncion]();
    } else {
        console.error(`La función ${nombreFuncion} no existe o no se cargó.`);
        // Feedback visual si falla
        document.getElementById('contenido-dinamico').innerHTML = 
            `<div class="alert alert-danger">Error: No se encontró la función del módulo (${nombreFuncion}).</div>`;
    }
}

// Helpers visuales
function setActive(elemento, modo) {
    if (modo === 'desktop') {
        document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
        elemento.classList.add('active');
    } else {
        document.querySelectorAll('.nav-item-mobile').forEach(b => b.classList.remove('active'));
        elemento.classList.add('active');
    }
}

function actualizarTitulos(titulo) {
    const t = document.getElementById('titulo-seccion');
    const s = document.getElementById('subtitulo-seccion');
    if(t) t.innerText = titulo;
    if(s) s.innerText = "Gestión de " + titulo.toLowerCase();
}

// --- UTILIDADES GLOBALES NECESARIAS PARA OTROS MÓDULOS ---

function calcularEdad(fechaString) {
    if (!fechaString) return "-";
    const hoy = new Date();
    const nacimiento = new Date(fechaString);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return isNaN(edad) ? "-" : edad;
}

// Observador para sincronizar contenido Desktop <-> Mobile
// (Esto asegura que si el JS de Docentes actualiza el div desktop, se vea en mobile también)
document.addEventListener("DOMContentLoaded", () => {
    const targetNode = document.getElementById('contenido-dinamico');
    const mobileNode = document.getElementById('contenido-dinamico-movil');
    
    if(targetNode && mobileNode) {
        const config = { childList: true, subtree: true };
        const callback = (mutationsList, observer) => {
            mobileNode.innerHTML = targetNode.innerHTML;
        };
        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }
});
