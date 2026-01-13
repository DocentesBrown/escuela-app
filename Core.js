// ============================================================================
// ARCHIVO: Core.js (ADAPTADO A ESTÉTICA DOCENTES BROWN / APPLE)
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
        errorMsg.innerText = "Error de conexión. Intenta nuevamente.";
        errorMsg.classList.remove('d-none');
    } finally {
        btn.innerText = "Ingresar";
        btn.disabled = false;
    }
}

function cargarDashboard(user) {
    // 1. Ocultar login, mostrar dashboard
    document.getElementById('login-screen').classList.add('d-none');
    document.getElementById('dashboard-screen').classList.remove('d-none');
    
    // 2. Cargar datos básicos de usuario
    document.getElementById('user-name').innerText = user.nombre.split(' ')[0]; // Solo primer nombre
    document.getElementById('user-initial').innerText = user.nombre.charAt(0).toUpperCase();
    document.getElementById('user-initial-mobile').innerText = user.nombre.charAt(0).toUpperCase();
    document.getElementById('user-role-display').innerText = user.rol.toUpperCase();

    // 3. Generar Menús (Desktop y Mobile)
    generarMenu(user.rol);
}

function generarMenu(rol) {
    const menuLateral = document.getElementById('menu-lateral'); // Desktop
    const menuMovil = document.getElementById('menu-movil');     // Mobile
    
    menuLateral.innerHTML = '';
    menuMovil.innerHTML = '';

    // Función auxiliar para crear botones
    const crearBoton = (texto, icono, accion, activo = false) => {
        // Desktop HTML
        const btnDesk = document.createElement('button');
        btnDesk.className = `sidebar-btn ${activo ? 'active' : ''}`;
        btnDesk.onclick = () => { 
            eval(accion); 
            actualizarTitulos(texto);
            setActive(btnDesk, 'desktop'); 
        };
        btnDesk.innerHTML = `<span>${icono}</span> ${texto}`;
        menuLateral.appendChild(btnDesk);

        // Mobile HTML
        const btnMov = document.createElement('button');
        btnMov.className = `nav-item-mobile ${activo ? 'active' : ''}`;
        btnMov.onclick = () => { 
            eval(accion); 
            actualizarTitulos(texto);
            setActive(btnMov, 'mobile'); 
        };
        btnMov.innerHTML = `<span class="icon">${icono}</span><span>${texto}</span>`;
        menuMovil.appendChild(btnMov);
    };

    // --- LÓGICA DE ROLES ---
    if (rol === 'directivo') {
        crearBoton('Estudiantes', '🎓', 'verEstudiantes()', true); // Default
        crearBoton('Docentes', '👨‍🏫', 'verDocentes()');
        crearBoton('Preceptores', '📋', 'verPreceptores()');
        
        // Cargar vista por defecto
        setTimeout(verEstudiantes, 100); 
    }
    
    if (rol === 'preceptor') {
        crearBoton('Asistencia', '📝', 'iniciarModuloPreceptor()', true);
        crearBoton('Docentes', '📞', 'verContactosDocentes()');
        setTimeout(iniciarModuloPreceptor, 100);
    }
    
    if (rol === 'docente') {
        crearBoton('Cursos', '🏫', 'iniciarModuloDocente()', true);
        crearBoton('Mis Datos', '👤', 'verMisDatosDocente()');
        setTimeout(iniciarModuloDocente, 100);
    }

    // Botón salir extra en móvil (en desktop está fijo abajo)
    const btnSalirMovil = document.createElement('button');
    btnSalirMovil.className = 'nav-item-mobile text-danger';
    btnSalirMovil.onclick = () => location.reload();
    btnSalirMovil.innerHTML = `<span class="icon">🚪</span><span>Salir</span>`;
    menuMovil.appendChild(btnSalirMovil);
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
    document.getElementById('titulo-seccion').innerText = titulo;
    document.getElementById('subtitulo-seccion').innerText = "Gestión de " + titulo.toLowerCase();
}

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

// Función auxiliar para detectar móvil y renderizar contenido en el div correcto
// Modificamos el comportamiento de los otros scripts para que rendericen en ambos contenedores si es necesario
// O mejor, usamos un observer. Pero por simplicidad, en index.html duplicamos IDs o usamos clases.
// ESTRATEGIA: El index.html ahora tiene dos divs de contenido. 
// Para evitar romper los scripts Admin_*.js que buscan 'contenido-dinamico',
// vamos a hacer un truco:
const observer = new MutationObserver((mutations) => {
    // Si cambia el contenido desktop, copiamos al movil
    const desktopContent = document.getElementById('contenido-dinamico').innerHTML;
    const mobileContainer = document.getElementById('contenido-dinamico-movil');
    if(mobileContainer.innerHTML !== desktopContent) {
        mobileContainer.innerHTML = desktopContent;
    }
});

observer.observe(document.getElementById('contenido-dinamico'), { childList: true, subtree: true });
