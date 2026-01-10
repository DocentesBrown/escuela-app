// ============================================================================
// ARCHIVO: Codigo.gs (BACKEND CORREGIDO)
// ============================================================================

const ID_HOJA = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const op = e.parameter.op;
  const rol = e.parameter.rol;

  // LOGIN
  if (op === 'login') return login(e.parameter.email, e.parameter.pass);
  
  // DIRECTIVO
  if (rol === 'Directivo') {
    if (op === 'getEstudiantes') return getTabla('Estudiantes');
    if (op === 'getDocentes') return getTabla('Docentes'); 
    if (op === 'getMaterias') return getTabla('Materias'); 
    if (op === 'getInscripcion') return getInscripcionAlumno(e.parameter.dni);
    // CORRECCIÓN: Usamos una función dedicada para devolver objetos
    if (op === 'getPreceptores' || op === 'getPreceptoresAdmin') return getPreceptoresAdmin();
    if (op === 'getCursosDisponibles') return getCursosDisponibles(); 
    if (op === 'getInfoCursos') return getInfoCursos();
  }

  // PRECEPTOR
  if (rol === 'Preceptor') {
    if (op === 'getDataPreceptor') return getEstudiantesConFaltas();
    if (op === 'getHistorialAlumno') return getHistorialAlumno(e.parameter.dni);
    if (op === 'getDocentes') return getTabla('Docentes'); 
    if (op === 'getCursosDisponibles') return getCursosDisponibles();
  }

  // DOCENTE
  if (rol === 'Docente') {
    if (op === 'getCursosDocente') return getCursosDocente(e.parameter.dni);
    if (op === 'getEstudiantesConDatos') return getEstudiantesConDatosCompletos(e.parameter.dniDocente, e.parameter.curso, e.parameter.idMateria);
    // CORRECCIÓN: Llamamos a la función renombrada para docentes
    if (op === 'getPreceptores') return getPreceptoresParaDocente();
  }

  return responseJSON({status: 'error', message: 'Operación no válida'});
}

function doPost(e) {
  const datos = JSON.parse(e.postData.contents);
  
  if (datos.op === 'guardarAsistenciaMasiva') return guardarAsistenciaMasiva(datos);
  if (datos.op === 'justificarFalta') return justificarFalta(datos);
  if (datos.op === 'administrarEstudiante') return administrarEstudiante(datos);
  if (datos.op === 'administrarDocente') return administrarDocente(datos);
  if (datos.op === 'administrarPreceptor') return administrarPreceptor(datos); 
  if (datos.op === 'guardarInscripcion') return guardarInscripcion(datos);
  if (datos.op === 'asignarDocenteMateria') return asignarDocenteMateriaCompleta(datos);
  if (datos.op === 'asignarCursosPreceptor') return asignarCursosPreceptor(datos); 
  if (datos.op === 'guardarNotasMasivo') return guardarNotasMasivo(datos);
  if (datos.op === 'guardarAsistenciaDocente') return guardarAsistenciaDocente(datos);

  return responseJSON({status: 'error', message: 'Acción POST no válida'});
}

// ==========================================
// FUNCIÓN LOGIN ACTUALIZADA
// ==========================================

function login(email, pass) {
  const data = getSheetData('Usuarios');
  for (let i = 0; i < data.length; i++) {
    // Col 0: Email, Col 1: Clave, Col 2: Rol, Col 3: Nombre
    if (String(data[i][0]).toLowerCase() === String(email).toLowerCase() && String(data[i][1]) === String(pass)) {
      let dni = data[i][1]; 
      let rolUsuario = data[i][2];
      let cursosAsignados = ""; // Variable nueva
      
      if (rolUsuario === 'Docente') {
        const docentesData = getSheetData('Docentes');
        const docente = docentesData.find(d => String(d[2]) === String(email));
        if (docente) dni = docente[0];
      } else if (rolUsuario === 'Preceptor') {
        const preceptoresData = getSheetData('Preceptores');
        if (preceptoresData && preceptoresData.length > 0) {
           const preceptor = preceptoresData.find(p => String(p[2]) === String(email));
           if (preceptor) {
             dni = preceptor[0];
             // Asumimos que la columna 4 (índice 4) tiene los cursos "1A, 2B, etc."
             cursosAsignados = preceptor[4] || ""; 
           }
        }
      }
      
      return responseJSON({ 
        status: 'success', 
        rol: rolUsuario, 
        nombre: data[i][3],
        dni: dni,
        cursos: cursosAsignados // <--- Enviamos esto al frontend
      });
    }
  }
  return responseJSON({ status: 'error', message: 'Credenciales incorrectas' });
}

// ==========================================
// NUEVA FUNCIÓN CORREGIDA: PRECEPTORES ADMIN
// ==========================================
// Esta función lee la hoja Preceptores y devuelve OBJETOS, no arrays.
// Esto soluciona errores en el frontend si esperas data.dni o data.nombre
function getPreceptoresAdmin() {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheet = ss.getSheetByName('Preceptores');
  
  if (!sheet) {
    // Si no existe, la creamos al vuelo para evitar errores
    ss.insertSheet('Preceptores').appendRow(['DNI', 'Nombre', 'Email_ABC', 'Celular', 'Cursos_Asignados']);
    return responseJSON({ status: 'success', data: [] });
  }

  const values = sheet.getDataRange().getValues();
  values.shift(); // Quitar cabecera

  const preceptores = values.map(fila => ({
    dni: fila[0],
    nombre: fila[1],
    email: fila[2],
    celular: fila[3],
    cursos: fila[4] // Columna de cursos asignados
  }));

  return responseJSON({ status: 'success', data: preceptores });
}

// ==========================================
// ADMINISTRACIÓN (ESTUDIANTES, DOCENTES Y PRECEPTORES)
// ==========================================

function administrarEstudiante(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetEst = ss.getSheetByName('Estudiantes');
  const sheetUser = ss.getSheetByName('Usuarios'); 

  if (datos.accion === 'crear') {
    sheetEst.appendRow([datos.dni, datos.nombre, datos.curso, datos.email, datos.adulto, datos.telefono, datos.nacimiento]);
    sheetUser.appendRow([datos.email, datos.dni, 'Estudiante', datos.nombre]); 
  } 
  else if (datos.accion === 'editar') {
    editarFilaGenerica(sheetEst, 0, datos.dniOriginal, [datos.dni, datos.nombre, datos.curso, datos.email, datos.adulto, datos.telefono, datos.nacimiento]);
    editarFilaUsuario(sheetUser, datos.dniOriginal, { email: datos.email, dni: datos.dni, nombre: datos.nombre, rol: 'Estudiante' });
  } 
  else if (datos.accion === 'borrar') {
    borrarFila(sheetEst, 0, datos.dni);
    borrarFila(sheetUser, 1, datos.dni); 
  }
  return responseJSON({ status: 'success' });
}

function administrarDocente(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetDoc = ss.getSheetByName('Docentes');
  const sheetUser = ss.getSheetByName('Usuarios');

  if (datos.accion === 'crear') {
    sheetDoc.appendRow([datos.dni, datos.nombre, datos.email, datos.celular, '']);
    sheetUser.appendRow([datos.email, datos.dni, 'Docente', datos.nombre]);
  } 
  else if (datos.accion === 'editar') {
    editarFilaGenerica(sheetDoc, 0, datos.dniOriginal, [datos.dni, datos.nombre, datos.email, datos.celular]);
    editarFilaUsuario(sheetUser, datos.dniOriginal, { email: datos.email, dni: datos.dni, nombre: datos.nombre, rol: 'Docente' });
  } 
  else if (datos.accion === 'borrar') {
     borrarFila(sheetDoc, 0, datos.dni);
     borrarFila(sheetUser, 1, datos.dni);
  }
  return responseJSON({ status: 'success' });
}

function administrarPreceptor(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  let sheetPre = ss.getSheetByName('Preceptores');
  const sheetUser = ss.getSheetByName('Usuarios');

  if (!sheetPre) {
    sheetPre = ss.insertSheet('Preceptores');
    sheetPre.getRange(1, 1, 1, 5).setValues([['DNI', 'Nombre', 'Email_ABC', 'Celular', 'Cursos_Asignados']]);
  }

  if (datos.accion === 'crear') {
    sheetPre.appendRow([datos.dni, datos.nombre, datos.email, datos.celular, '']);
    sheetUser.appendRow([datos.email, datos.dni, 'Preceptor', datos.nombre]);
  } 
  else if (datos.accion === 'editar') {
    const data = sheetPre.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(datos.dniOriginal)) {
        const cursosExistente = data[i].length > 4 ? data[i][4] : '';
        sheetPre.getRange(i + 1, 1, 1, 5).setValues([[datos.dni, datos.nombre, datos.email, datos.celular, cursosExistente]]);
        break;
      }
    }
    editarFilaUsuario(sheetUser, datos.dniOriginal, { email: datos.email, dni: datos.dni, nombre: datos.nombre, rol: 'Preceptor' });
  } 
  else if (datos.accion === 'borrar') {
     borrarFila(sheetPre, 0, datos.dni);
     borrarFila(sheetUser, 1, datos.dni);
  }
  return responseJSON({ status: 'success' });
}

function asignarCursosPreceptor(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetPre = ss.getSheetByName('Preceptores');
  
  if (!sheetPre) return responseJSON({ status: 'error', message: 'No existe la pestaña Preceptores' });
  
  const data = sheetPre.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(datos.dniPreceptor)) {
      sheetPre.getRange(i + 1, 5).setValue(datos.cursos.join(', '));
      return responseJSON({ status: 'success', message: 'Cursos asignados correctamente' });
    }
  }
  return responseJSON({ status: 'error', message: 'Preceptor no encontrado' });
}

// --- FUNCIONES AUXILIARES CRUD ---

function editarFilaGenerica(sheet, colIndexBusqueda, valorBusqueda, nuevosValores) {
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][colIndexBusqueda]) === String(valorBusqueda)) {
      sheet.getRange(i + 1, 1, 1, nuevosValores.length).setValues([nuevosValores]);
      break;
    }
  }
}

function editarFilaUsuario(sheet, dniOriginal, d) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) == String(dniOriginal)) { 
      sheet.getRange(i + 1, 1, 1, 4).setValues([[d.email, d.dni, d.rol, d.nombre]]);
      break;
    }
  }
}

function borrarFila(sheet, colIndex, valorBusqueda) {
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (String(data[i][colIndex]) == String(valorBusqueda)) {
      sheet.deleteRow(i + 1);
    }
  }
}

// ==========================================
// LOGICA PRECEPTOR (ASISTENCIA, E.F. Y ESTADÍSTICAS)
// ==========================================

function getEstudiantesConFaltas() {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const hojaEst = ss.getSheetByName('Estudiantes');
  const hojaAsis = ss.getSheetByName('Asistencia');
  
  const dataEst = hojaEst.getDataRange().getValues();
  dataEst.shift(); 
  
  let dataAsis = [];
  if (hojaAsis.getLastRow() > 1) {
    dataAsis = hojaAsis.getDataRange().getValues();
    dataAsis.shift(); 
  }

  let resumen = {};
  dataAsis.forEach(fila => {
    let dni = fila[1];
    let estado = fila[2]; 
    if(!resumen[dni]) resumen[dni] = { P: 0, A: 0, T: 0, EF: 0, J: 0 };
    if (estado === 'P') resumen[dni].P++;
    else if (estado === 'A') resumen[dni].A++;
    else if (estado === 'T') resumen[dni].T++;
    else if (estado === 'EF') resumen[dni].EF++; 
    else if (estado === 'J') resumen[dni].J++;
  });

  let resultado = dataEst.map(alumno => {
    let dni = alumno[0];
    let stats = resumen[dni] || { P: 0, A: 0, T: 0, EF: 0, J: 0 };
    let totalFaltas = stats.A + (stats.T * 0.25) + (stats.EF * 0.5); 
    
    return {
      data: alumno,
      stats: { 
          total: totalFaltas, 
          P: stats.P, 
          A: stats.A, 
          T: stats.T, 
          EF: stats.EF,
          J: stats.J 
      }
    };
  });
  return responseJSON({ status: 'success', data: resultado });
}

function guardarAsistenciaMasiva(datos) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName('Asistencia');
  let fechaAGuardar;
  if (datos.fecha) {
    fechaAGuardar = Utilities.formatDate(new Date(datos.fecha + 'T12:00:00'), Session.getScriptTimeZone(), "yyyy-MM-dd");
  } else {
    fechaAGuardar = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  datos.lista.forEach(alumno => {
    sheet.appendRow([fechaAGuardar, alumno.dni, alumno.estado, 'No', datos.preceptor]);
  });
  return responseJSON({ status: 'success', message: 'Guardado correctamente' });
}

function getHistorialAlumno(dni) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName('Asistencia');
  const data = sheet.getDataRange().getValues();
  let historial = [];
  for(let i=1; i<data.length; i++) {
    const estado = data[i][2];
    if(String(data[i][1]) === String(dni) && (estado === 'A' || estado === 'T' || estado === 'EF')) {
       historial.push({
         fila: i + 1,
         fecha: Utilities.formatDate(new Date(data[i][0]), Session.getScriptTimeZone(), "dd/MM/yyyy"),
         estado: estado
       });
    }
  }
  return responseJSON({ status: 'success', data: historial });
}

function justificarFalta(datos) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName('Asistencia');
  sheet.getRange(datos.fila, 3).setValue('J');
  sheet.getRange(datos.fila, 4).setValue('Si');
  return responseJSON({ status: 'success' });
}

// ==========================================
// ASIGNACIÓN COMPLETA DE DOCENTES
// ==========================================
function asignarDocenteMateriaCompleta(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetMat = ss.getSheetByName('Materias');
  const sheetDoc = ss.getSheetByName('Docentes');
  
  const dataMat = sheetMat.getDataRange().getValues();
  let idMateriaEncontrada = -1;
  let infoMateria = "";
  let dniDocenteAnterior = "";
  let nombreDocenteAnterior = "";
  let esSuplencia = datos.tipoAsignacion === 'Suplencia';
  
  for(let i=1; i<dataMat.length; i++) {
    if(String(dataMat[i][0]) === String(datos.id_materia)) {
      idMateriaEncontrada = i;
      infoMateria = `${dataMat[i][1]} (${dataMat[i][3]})`; 
      dniDocenteAnterior = dataMat[i][2] || ""; 
      nombreDocenteAnterior = dataMat[i][4] || ""; 
      break;
    }
  }
  
  if(idMateriaEncontrada === -1) return responseJSON({ status: 'error', message: 'Materia no encontrada' });
  
  sheetMat.getRange(idMateriaEncontrada + 1, 3).setValue(datos.dni_docente);
  sheetMat.getRange(idMateriaEncontrada + 1, 5).setValue(datos.nombre_docente);
  
  const headers = dataMat[0];
  if(headers.length <= 5) sheetMat.getRange(1, 6).setValue('Tipo_Asignacion');
  if(headers.length <= 6) sheetMat.getRange(1, 7).setValue('Suplente_De');
  
  sheetMat.getRange(idMateriaEncontrada + 1, 6).setValue(datos.tipoAsignacion);
  
  if(esSuplencia && nombreDocenteAnterior) sheetMat.getRange(idMateriaEncontrada + 1, 7).setValue(nombreDocenteAnterior);
  else sheetMat.getRange(idMateriaEncontrada + 1, 7).setValue("");
  
  if(datos.dni_docente) {
    const dataDoc = sheetDoc.getDataRange().getValues();
    for(let j=1; j<dataDoc.length; j++) {
      if(String(dataDoc[j][0]) === String(datos.dni_docente)) {
        let materiasPrevias = (dataDoc[j].length > 4) ? dataDoc[j][4] : "";
        let materiaConTipo = `${infoMateria} [${datos.tipoAsignacion}]`;
        if(esSuplencia && nombreDocenteAnterior) materiaConTipo += ` (Suplente de: ${nombreDocenteAnterior})`;
        
        let nuevaLista = "";
        let materiaYaExiste = false;
        if(materiasPrevias) {
          const materiasArray = materiasPrevias.split(', ');
          materiaYaExiste = materiasArray.some(m => m.includes(infoMateria));
        }
        if(!materiaYaExiste) {
          nuevaLista = materiasPrevias ? `${materiasPrevias}, ${materiaConTipo}` : materiaConTipo;
          sheetDoc.getRange(j+1, 5).setValue(nuevaLista);
        }
        break;
      }
    }
  }
  
  if(!esSuplencia && dniDocenteAnterior && dniDocenteAnterior !== datos.dni_docente) {
    const dataDoc = sheetDoc.getDataRange().getValues();
    for(let j=1; j<dataDoc.length; j++) {
      if(String(dataDoc[j][0]) === String(dniDocenteAnterior)) {
        let materiasPrevias = (dataDoc[j].length > 4) ? dataDoc[j][4] : "";
        if(materiasPrevias) {
          let materiasArray = materiasPrevias.split(', ').filter(m => {
            return !m.includes(infoMateria);
          });
          sheetDoc.getRange(j+1, 5).setValue(materiasArray.join(', '));
        }
        break;
      }
    }
  }
  
  if(esSuplencia && dniDocenteAnterior && dniDocenteAnterior !== datos.dni_docente) {
    const dataDoc = sheetDoc.getDataRange().getValues();
    for(let j=1; j<dataDoc.length; j++) {
      if(String(dataDoc[j][0]) === String(dniDocenteAnterior)) {
        let materiasPrevias = (dataDoc[j].length > 4) ? dataDoc[j][4] : "";
        if(materiasPrevias) {
          let materiasArray = materiasPrevias.split(', ');
          let nuevasMaterias = materiasArray.map(m => {
            if(m.includes(infoMateria)) return m + ' [SUPLANTADO]';
            return m;
          });
          sheetDoc.getRange(j+1, 5).setValue(nuevasMaterias.join(', '));
        }
        break;
      }
    }
  }
  return responseJSON({ status: 'success', message: 'Asignación realizada correctamente' });
}

// ==========================================
// LÓGICA DOCENTE: A PRUEBA DE ERRORES DE FORMATO
// ==========================================

function getCursosDocente(dni) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetMaterias = ss.getSheetByName('Materias');
  const sheetListado = ss.getSheetByName('Listado');
  
  // 1. Obtener las materias que da el docente
  const dataMaterias = sheetMaterias.getDataRange().getValues();
  dataMaterias.shift(); 
  
  const materiasDocente = dataMaterias.filter(fila => {
    return String(fila[2]) === String(dni);
  });
  
  // Cacheamos el listado
  let dataListado = [];
  if (sheetListado && sheetListado.getLastRow() > 1) {
    dataListado = sheetListado.getDataRange().getValues();
    dataListado.shift();
  }

  const cursos = [...new Set(materiasDocente.map(m => m[3]))].sort();
  
  const resultado = cursos.map(curso => {
    const materiasEnCurso = materiasDocente
      .filter(m => m[3] === curso)
      .map(m => {
        // --- LIMPIEZA DE SEGURIDAD ---
        // Tomamos el nombre y, por si acaso, quitamos cualquier cosa entre corchetes []
        // Ejemplo: "Educación Física [Titular]" se convierte en "educación física"
        const nombreMateria = String(m[1]).split('[')[0].trim().toLowerCase(); 
        const nombreCurso = String(m[3]).trim().toLowerCase();   
        
        const estudiantesInscriptos = dataListado.filter(alumno => {
            const materiasAlumno = alumno.slice(2, 14); 
            
            return materiasAlumno.some(mat => {
                const textoCelda = String(mat).toLowerCase();
                // La celda debe tener el Nombre (limpio) Y el Curso
                return textoCelda.includes(nombreMateria) && textoCelda.includes(nombreCurso);
            });
        }).length;

        return {
          id: m[0],
          nombre: m[1], // Devolvemos el nombre original para mostrarlo bonito
          tipoAsignacion: m[5] || 'Titular', // Aquí va el [Titular], solo para mostrar
          cantidadAlumnos: estudiantesInscriptos
        };
      });
    
    const maxEstudiantes = materiasEnCurso.reduce((max, m) => Math.max(max, m.cantidadAlumnos), 0);

    return {
      curso: curso,
      materias: materiasEnCurso,
      totalEstudiantes: maxEstudiantes
    };
  });
  
  return responseJSON({ 
    status: 'success', 
    data: resultado,
    totalCursos: cursos.length
  });
}

function getEstudiantesConDatosCompletos(dniDocente, curso, idMateria) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetListado = ss.getSheetByName('Listado');
  const sheetNotas = ss.getSheetByName('Notas');
  const sheetAsistencia = ss.getSheetByName('Asistencia');
  const sheetMaterias = ss.getSheetByName('Materias');
  
  // 1. Obtener info exacta de la Materia
  const dataMaterias = sheetMaterias.getDataRange().getValues();
  dataMaterias.shift();
  const materiaInfo = dataMaterias.find(m => String(m[0]) === String(idMateria));
  
  if (!materiaInfo) return responseJSON({ status: 'error', message: 'Materia no encontrada' });

  // --- LIMPIEZA DE SEGURIDAD ---
  // Ignoramos [Titular] o [Suplente] para la búsqueda, solo nos importa el nombre real
  const nombreMateriaBusqueda = String(materiaInfo[1]).split('[')[0].trim().toLowerCase(); 
  const cursoBusqueda = String(curso).trim().toLowerCase(); 
  const nombreMateriaReal = String(materiaInfo[1]).trim(); 
  
  // 2. Buscar en LISTADO
  let estudiantesCurso = [];
  if (sheetListado && sheetListado.getLastRow() > 1) {
    const dataListado = sheetListado.getDataRange().getValues();
    dataListado.shift();
    
    dataListado.forEach(fila => {
        const materiasAsignadas = fila.slice(2, 14); 
        let condicionEncontrada = "Cursa"; 

        const tieneLaMateria = materiasAsignadas.some(celdaRaw => {
             const textoCelda = String(celdaRaw).toLowerCase();
             
             // COINCIDENCIA DOBLE: Nombre Limpio + Curso
             if (textoCelda.includes(nombreMateriaBusqueda) && textoCelda.includes(cursoBusqueda)) {
                 
                 // DETECTAR CONDICIÓN (Lo que está después del guion)
                 const partes = String(celdaRaw).split('-'); 
                 if (partes.length > 1) {
                     condicionEncontrada = partes[1].trim(); // Ej: "Recursa"
                 }
                 return true;
             }
             return false;
        });

        if (tieneLaMateria) {
            estudiantesCurso.push({
                dni: fila[0],
                nombre: fila[1],
                curso: curso, 
                condicion: condicionEncontrada // Enviamos "Recursa", "Cursa", etc.
            });
        }
    });
  }
  
  // 3. Cruzar con Notas y Asistencia (Sin cambios)
  let dataNotas = [];
  if (sheetNotas.getLastRow() > 1) {
    dataNotas = sheetNotas.getDataRange().getValues();
    dataNotas.shift();
  }
  
  let dataAsistencia = [];
  if (sheetAsistencia.getLastRow() > 1) {
    dataAsistencia = sheetAsistencia.getDataRange().getValues();
    dataAsistencia.shift();
  }
  
  const resultado = estudiantesCurso.map(est => {
    const notasEstudiante = dataNotas.find(n => 
      String(n[0]) === String(est.dni) && String(n[1]) === String(idMateria)
    );
    
    const asistencias = dataAsistencia.filter(a =>
      String(a[1]) === String(est.dni) && 
      String(a[4]) === String(dniDocente) && 
      String(a[5]) === String(idMateria)
    );
    
    const totalClases = asistencias.length;
    const presentes = asistencias.filter(a => a[2] === 'P').length;
    const porcentajeAsistencia = totalClases > 0 ? Math.round((presentes / totalClases) * 100) : 0;
    
    let notaFinalCalculada = 0;
    if (notasEstudiante) {
       let nC1 = parseFloat(notasEstudiante[2]) || 0; let nInt1 = parseFloat(notasEstudiante[3]) || 0;
       let nC2 = parseFloat(notasEstudiante[4]) || 0; let nInt2 = parseFloat(notasEstudiante[5]) || 0;
       let final1 = nInt1 > nC1 ? nInt1 : nC1;
       let final2 = nInt2 > nC2 ? nInt2 : nC2;
       notaFinalCalculada = (final1 + final2) / 2;
       notaFinalCalculada = Math.round(notaFinalCalculada * 10) / 10;
    }

    return {
      dni: est.dni,
      nombre: est.nombre,
      condicion: est.condicion,
      notas: notasEstudiante ? {
        nota1_C1: notasEstudiante[2] || '',
        intensificacion1: notasEstudiante[3] || '',
        nota1_C2: notasEstudiante[4] || '',
        intensificacion2: notasEstudiante[5] || '',
        nota_final: notasEstudiante[6] || notaFinalCalculada,
        diciembre: notasEstudiante[7] || '',
        febrero: notasEstudiante[8] || '',
        nota_definitiva: notasEstudiante[9] || ''
      } : {
        nota1_C1: '', intensificacion1: '', nota1_C2: '', intensificacion2: '', nota_final: notaFinalCalculada, diciembre: '', febrero: '', nota_definitiva: ''
      },
      asistencia: {
        total: totalClases, porcentaje: porcentajeAsistencia
      }
    };
  });
  
  return responseJSON({
    status: 'success',
    data: {
      materia: { id: idMateria, nombre: nombreMateriaReal, curso: curso }, // Nombre bonito para el frontend
      estudiantes: resultado.sort((a, b) => a.nombre.localeCompare(b.nombre))
    }
  });
}

function guardarNotasMasivo(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetNotas = ss.getSheetByName('Notas');
  const headers = sheetNotas.getRange(1, 1, 1, sheetNotas.getLastColumn()).getValues()[0];
  
  if (headers.length < 12 || headers[0] !== 'DNI_Estudiante') {
    sheetNotas.clear();
    sheetNotas.getRange(1, 1, 1, 12).setValues([[
      'DNI_Estudiante', 'ID_Materia', 'Nota1_C1', 'Intensificacion1', 
      'Nota1_C2', 'Intensificacion2', 'Nota_Final', 'Diciembre', 
      'Febrero', 'Nota_Definitiva', 'Fecha_Ultima_Actualizacion', 'Docente_Actualizador'
    ]]);
  }
  
  const fechaActual = new Date();
  const fechaFormateada = Utilities.formatDate(fechaActual, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  
  datos.notas.forEach(nota => {
    const data = sheetNotas.getDataRange().getValues();
    let filaExistente = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(nota.dni) && String(data[i][1]) === String(datos.idMateria)) {
        filaExistente = i; break;
      }
    }
    const notaC1 = parseFloat(nota.nota1_C1) || 0;
    const intensif1 = parseFloat(nota.intensificacion1) || 0;
    const notaC2 = parseFloat(nota.nota1_C2) || 0;
    const intensif2 = parseFloat(nota.intensificacion2) || 0;
    
    const notaFinalC1 = intensif1 > notaC1 ? intensif1 : notaC1;
    const notaFinalC2 = intensif2 > notaC2 ? intensif2 : notaC2;
    
    let notaFinalCalculada = (notaFinalC1 + notaFinalC2) / 2;
    notaFinalCalculada = Math.round(notaFinalCalculada * 10) / 10;
    
    if (nota.diciembre && parseFloat(nota.diciembre) > 0) notaFinalCalculada = Math.max(notaFinalCalculada, parseFloat(nota.diciembre));
    if (nota.febrero && parseFloat(nota.febrero) > 0) notaFinalCalculada = Math.max(notaFinalCalculada, parseFloat(nota.febrero));
    
    let notaDefinitiva = nota.nota_definitiva || notaFinalCalculada;
    
    const nuevaFila = [
      nota.dni, datos.idMateria, nota.nota1_C1 || '', nota.intensificacion1 || '',
      nota.nota1_C2 || '', nota.intensificacion2 || '', notaFinalCalculada,
      nota.diciembre || '', nota.febrero || '', notaDefinitiva, fechaFormateada, datos.nombreDocente
    ];
    
    if (filaExistente > 0) sheetNotas.getRange(filaExistente + 1, 1, 1, nuevaFila.length).setValues([nuevaFila]);
    else sheetNotas.appendRow(nuevaFila);
  });
  return responseJSON({ status: 'success', message: 'Notas guardadas correctamente' });
}

function guardarAsistenciaDocente(datos) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName('Asistencia');
  const fechaActual = new Date();
  const fechaFormateada = Utilities.formatDate(fechaActual, Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  datos.asistencia.forEach(item => {
    sheet.appendRow([fechaFormateada, item.dni, item.estado, 'No', datos.dniDocente, datos.idMateria]);
  });
  return responseJSON({ status: 'success', message: 'Asistencia guardada correctamente' });
}

// =======================================================
// CORRECCIÓN: RENOMBRAMOS ESTA FUNCIÓN PARA EVITAR CONFLICTOS
// =======================================================
function getPreceptoresParaDocente() {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetUsuarios = ss.getSheetByName('Usuarios');
  const data = sheetUsuarios.getDataRange().getValues();
  data.shift();
  
  const preceptores = data
    .filter(fila => String(fila[2]).toLowerCase() === 'preceptor')
    .map(fila => ({ nombre: fila[3], email: fila[0] }));
  
  return responseJSON({ status: 'success', data: preceptores });
}

// ==========================================
// FUNCIONES COMPARTIDAS
// ==========================================

function getInscripcionAlumno(dni) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName('Listado');
  if (!sheet) return responseJSON({ status: 'not_found', data: [] });
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(dni)) return responseJSON({ status: 'success', data: data[i] });
  }
  return responseJSON({ status: 'not_found', data: [] });
}

function guardarInscripcion(datos) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName('Listado');
  const data = sheet.getDataRange().getValues();
  let filaEncontrada = -1;
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(datos.dni)) { filaEncontrada = i + 1; break; }
  }
  let filaDatos = [datos.dni, datos.nombre];
  for(let k=1; k<=12; k++) filaDatos.push(datos[`m${k}`]);
  for(let k=1; k<=4; k++) filaDatos.push(datos[`i${k}`]);
  
  if(filaEncontrada > 0) sheet.getRange(filaEncontrada, 1, 1, filaDatos.length).setValues([filaDatos]);
  else sheet.appendRow(filaDatos);
  
  return responseJSON({ status: 'success' });
}

// =======================================================
// CORRECCIÓN: DEJAMOS SOLO ESTA VERSIÓN DE getCursosDisponibles
// =======================================================
function getCursosDisponibles() {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetMat = ss.getSheetByName('Materias');
  if (!sheetMat) return responseJSON({ status: 'error', message: 'No existe la pestaña Materias', data: [] });
  
  const data = sheetMat.getDataRange().getValues();
  if (data.length <= 1) return responseJSON({ status: 'success', data: [] });
  
  const cursos = [...new Set(data.slice(1).map(fila => {
    const curso = fila[3]; 
    return curso ? String(curso).trim() : '';
  }))].filter(curso => curso !== '').sort();
  
  const sheetEst = ss.getSheetByName('Estudiantes');
  if (sheetEst && sheetEst.getLastRow() > 1) {
    const dataEst = sheetEst.getDataRange().getValues();
    dataEst.slice(1).forEach(fila => {
      const curso = fila[2]; 
      if (curso && !cursos.includes(String(curso).trim())) {
        cursos.push(String(curso).trim());
      }
    });
  }
  cursos.sort();
  
  return responseJSON({ 
    status: 'success', 
    data: cursos,
    message: `Cursos obtenidos de Materias: ${cursos.length} encontrados`
  });
}

function getInfoCursos() {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetMat = ss.getSheetByName('Materias');
  const sheetPre = ss.getSheetByName('Preceptores');
  
  if (!sheetMat) return responseJSON({ status: 'error', message: 'No existe la pestaña Materias' });
  
  const dataMat = sheetMat.getDataRange().getValues();
  const dataPre = sheetPre ? sheetPre.getDataRange().getValues() : [];
  
  const cursosUnicos = [...new Set(dataMat.slice(1).map(fila => {
    return fila[3] ? String(fila[3]).trim() : null;
  }))].filter(curso => curso !== null);
  
  const preceptoresPorCurso = {};
  if (sheetPre && dataPre.length > 1) {
    dataPre.slice(1).forEach(fila => {
      const preceptor = fila[1] || '';
      const cursos = fila[4] || ''; 
      if (cursos) {
        cursos.split(', ').forEach(curso => {
          const cursoTrimmed = curso.trim();
          if (cursoTrimmed) {
            if (!preceptoresPorCurso[cursoTrimmed]) preceptoresPorCurso[cursoTrimmed] = [];
            preceptoresPorCurso[cursoTrimmed].push(preceptor);
          }
        });
      }
    });
  }
  
  const materiasPorCurso = {};
  dataMat.slice(1).forEach(fila => {
    const curso = fila[3] ? String(fila[3]).trim() : '';
    const materia = fila[1] || ''; 
    const docente = fila[4] || ''; 
    
    if (curso && materia) {
      if (!materiasPorCurso[curso]) materiasPorCurso[curso] = [];
      materiasPorCurso[curso].push({ nombre: materia, docente: docente });
    }
  });
  
  const resultado = cursosUnicos.sort().map(curso => {
    return {
      nombre: curso,
      preceptores: preceptoresPorCurso[curso] || [],
      materias: materiasPorCurso[curso] || [],
      totalMaterias: (materiasPorCurso[curso] || []).length,
      tienePreceptor: (preceptoresPorCurso[curso] || []).length > 0
    };
  });
  
  return responseJSON({ status: 'success', data: resultado, totalCursos: cursosUnicos.length });
}

// ==========================================
// UTILIDADES GLOBALES
// ==========================================

function getTabla(nombreHoja) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(nombreHoja);
  if (!sheet) return responseJSON({status: 'error', data: []});
  const values = sheet.getDataRange().getValues();
  values.shift(); 
  return responseJSON({ status: 'success', data: values });
}

function getSheetData(nombre) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(nombre);
  const values = sheet.getDataRange().getValues();
  values.shift(); 
  return values;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
