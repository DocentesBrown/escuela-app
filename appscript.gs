// ============================================================================
// ARCHIVO: Main.gs
// DESCRIPCIÓN: Configuración global y enrutamiento (Router)
// ============================================================================

const ID_HOJA = SpreadsheetApp.getActiveSpreadsheet().getId();

/**
 * Maneja las peticiones GET (Lectura de datos)
 */
function doGet(e) {
  const op = e.parameter.op;
  const rol = e.parameter.rol;

  // --- ACCESO PÚBLICO / LOGIN ---
  if (op === 'login') return login(e.parameter.email, e.parameter.pass);

  // --- ROL: DIRECTIVO ---
  if (rol === 'Directivo') {
    if (op === 'getEstudiantes') return getTabla('Estudiantes');
    if (op === 'getDocentes') return getTabla('Docentes');
    if (op === 'getMaterias') return getTabla('Materias');
    if (op === 'getInscripcion') return getInscripcionAlumno(e.parameter.dni);
    if (op === 'getPreceptores' || op === 'getPreceptoresAdmin') return getPreceptoresAdmin();
    if (op === 'getCursosDisponibles') return getCursosDisponibles();
    if (op === 'getInfoCursos') return getInfoCursos();
  }

  // --- ROL: PRECEPTOR ---
  if (rol === 'Preceptor') {
    if (op === 'getDataPreceptor') return getEstudiantesConFaltas();
    if (op === 'getHistorialAlumno') return getHistorialAlumno(e.parameter.dni);
    if (op === 'getDocentes') return getTabla('Docentes');
    if (op === 'getCursosDisponibles') return getCursosDisponibles();
  }

  // --- ROL: DOCENTE ---
  if (rol === 'Docente') {
    if (op === 'getCursosDocente') return getCursosDocente(e.parameter.dni);
    if (op === 'getEstudiantesConDatosCompletos') return getEstudiantesConDatosCompletos(e.parameter.dniDocente, e.parameter.curso, e.parameter.idMateria);
    if (op === 'getPreceptores') return getPreceptoresParaDocente();
    if (op === 'getFaltasAlumnoDocente') return getFaltasAlumnoDocente(e);
    if (op === 'justificarFaltaDocente') return justificarFaltaDocente(e);    
  }

  return responseJSON({ status: 'error', message: 'Operación no válida o permisos insuficientes' });
}

/**
 * Maneja las peticiones POST (Escritura/Modificación de datos)
 */
function doPost(e) {
  const datos = JSON.parse(e.postData.contents);

  // Acciones generales y administrativas
  if (datos.op === 'administrarEstudiante') return administrarEstudiante(datos);
  if (datos.op === 'administrarDocente') return administrarDocente(datos);
  if (datos.op === 'administrarPreceptor') return administrarPreceptor(datos);
  if (datos.op === 'asignarDocenteMateria') return asignarDocenteMateriaCompleta(datos);
  if (datos.op === 'asignarCursosPreceptor') return asignarCursosPreceptor(datos);
  if (datos.op === 'guardarInscripcion') return guardarInscripcion(datos);

  // Acciones de Preceptoría
  if (datos.op === 'guardarAsistenciaMasiva') return guardarAsistenciaMasiva(datos);
  if (datos.op === 'justificarFalta') return justificarFalta(datos);

  // Acciones Docentes
  if (datos.op === 'guardarNotasMasivo') return guardarNotasMasivo(datos);
  if (datos.op === 'guardarAsistenciaDocente') return guardarAsistenciaDocente(datos);

  return responseJSON({ status: 'error', message: 'Acción POST no válida' });
}



// ============================================================================
// ARCHIVO: Auth.gs
// DESCRIPCIÓN: Lógica de autenticación y verificación de roles
// ============================================================================

function login(email, pass) {
  const data = getSheetData('Usuarios');
  
  for (let i = 0; i < data.length; i++) {
    // Col 0: Email, Col 1: Clave, Col 2: Rol, Col 3: Nombre
    if (String(data[i][0]).toLowerCase() === String(email).toLowerCase() && String(data[i][1]) === String(pass)) {
      
      let dni = data[i][1]; // Por defecto el DNI es la pass (si así está definido)
      let rolUsuario = data[i][2];
      let cursosAsignados = ""; 

      // Lógica especial para obtener DNI real y cursos según el Rol
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
             cursosAsignados = preceptor[4] || ""; 
           }
        }
      }
      
      return responseJSON({ 
        status: 'success', 
        rol: rolUsuario, 
        nombre: data[i][3],
        dni: dni,
        cursos: cursosAsignados
      });
    }
  }
  return responseJSON({ status: 'error', message: 'Credenciales incorrectas' });
}


// ============================================================================
// ARCHIVO: Admin_CRUD.gs
// DESCRIPCIÓN: Gestión de usuarios y asignaciones (Directivos)
// ============================================================================

function administrarEstudiante(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetEst = ss.getSheetByName('Estudiantes');
  const sheetUser = ss.getSheetByName('Usuarios'); 

  if (datos.accion === 'crear') {
    sheetEst.appendRow([datos.dni, datos.nombre, datos.curso, datos.email, datos.adulto, datos.telefono, datos.nacimiento]);
    sheetUser.appendRow([datos.email, datos.dni, 'Estudiante', datos.nombre]); 
  } else if (datos.accion === 'editar') {
    editarFilaGenerica(sheetEst, 0, datos.dniOriginal, [datos.dni, datos.nombre, datos.curso, datos.email, datos.adulto, datos.telefono, datos.nacimiento]);
    editarFilaUsuario(sheetUser, datos.dniOriginal, { email: datos.email, dni: datos.dni, nombre: datos.nombre, rol: 'Estudiante' });
  } else if (datos.accion === 'borrar') {
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
  } else if (datos.accion === 'editar') {
    editarFilaGenerica(sheetDoc, 0, datos.dniOriginal, [datos.dni, datos.nombre, datos.email, datos.celular]);
    editarFilaUsuario(sheetUser, datos.dniOriginal, { email: datos.email, dni: datos.dni, nombre: datos.nombre, rol: 'Docente' });
  } else if (datos.accion === 'borrar') {
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
  } else if (datos.accion === 'editar') {
    // Lógica especial para preservar cursos existentes al editar
    const data = sheetPre.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(datos.dniOriginal)) {
        const cursosExistente = data[i].length > 4 ? data[i][4] : '';
        sheetPre.getRange(i + 1, 1, 1, 5).setValues([[datos.dni, datos.nombre, datos.email, datos.celular, cursosExistente]]);
        break;
      }
    }
    editarFilaUsuario(sheetUser, datos.dniOriginal, { email: datos.email, dni: datos.dni, nombre: datos.nombre, rol: 'Preceptor' });
  } else if (datos.accion === 'borrar') {
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
  // datos.cursos es un array ej: ['1A', '2B']
  const cursosNuevos = datos.cursos; 
  const dniObjetivo = String(datos.dniPreceptor);

  // 1. Recorrer TODOS los preceptores para limpiar los cursos que estamos robando
  // Empezamos desde i=1 para saltar cabecera
  for (let i = 1; i < data.length; i++) {
    let dniActual = String(data[i][0]);
    
    // Si NO es el preceptor que estamos editando, revisamos si tiene algún curso conflictivo
    if (dniActual !== dniObjetivo) {
      let cursosActualesStr = data[i][4] || "";
      if (cursosActualesStr) {
        let cursosArray = cursosActualesStr.split(',').map(c => c.trim());
        
        // Filtramos: Dejamos solo los cursos que NO están en la lista nueva
        let cursosLimpios = cursosArray.filter(c => !cursosNuevos.includes(c));
        
        // Si hubo cambios (es decir, le quitamos un curso), actualizamos la celda
        if (cursosLimpios.length !== cursosArray.length) {
          sheetPre.getRange(i + 1, 5).setValue(cursosLimpios.join(', '));
        }
      }
    }
  }

  // 2. Asignar los cursos al preceptor objetivo
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === dniObjetivo) {
      sheetPre.getRange(i + 1, 5).setValue(cursosNuevos.join(', '));
      return responseJSON({ status: 'success', message: 'Cursos asignados (y actualizados en otros preceptores)' });
    }
  }
  
  return responseJSON({ status: 'error', message: 'Preceptor no encontrado' });
}

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
  
  // Buscar Materia
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
  
  // Actualizar Materia
  sheetMat.getRange(idMateriaEncontrada + 1, 3).setValue(datos.dni_docente);
  sheetMat.getRange(idMateriaEncontrada + 1, 5).setValue(datos.nombre_docente);
  sheetMat.getRange(idMateriaEncontrada + 1, 6).setValue(datos.tipoAsignacion);
  
  // Manejo de columna Suplente_De (Col 7)
  if(esSuplencia && nombreDocenteAnterior) sheetMat.getRange(idMateriaEncontrada + 1, 7).setValue(nombreDocenteAnterior);
  else sheetMat.getRange(idMateriaEncontrada + 1, 7).setValue("");
  
  // Actualizar en Hoja Docentes (Lista de materias asignadas)
  // 1. Agregar al nuevo docente
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
  
  // 2. Quitar del docente anterior (si no es suplencia)
  if(!esSuplencia && dniDocenteAnterior && dniDocenteAnterior !== datos.dni_docente) {
    const dataDoc = sheetDoc.getDataRange().getValues();
    for(let j=1; j<dataDoc.length; j++) {
      if(String(dataDoc[j][0]) === String(dniDocenteAnterior)) {
        let materiasPrevias = (dataDoc[j].length > 4) ? dataDoc[j][4] : "";
        if(materiasPrevias) {
          let materiasArray = materiasPrevias.split(', ').filter(m => !m.includes(infoMateria));
          sheetDoc.getRange(j+1, 5).setValue(materiasArray.join(', '));
        }
        break;
      }
    }
  }

  // 3. Marcar como SUPLANTADO al anterior (si es suplencia)
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

function getPreceptoresAdmin() {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheet = ss.getSheetByName('Preceptores');
  
  if (!sheet) {
    ss.insertSheet('Preceptores').appendRow(['DNI', 'Nombre', 'Email_ABC', 'Celular', 'Cursos_Asignados']);
    return responseJSON({ status: 'success', data: [] });
  }

  const values = sheet.getDataRange().getValues();
  values.shift(); 

  const preceptores = values.map(fila => ({
    dni: fila[0],
    nombre: fila[1],
    email: fila[2],
    celular: fila[3],
    cursos: fila[4] 
  }));

  return responseJSON({ status: 'success', data: preceptores });
}



// ============================================================================
// ARCHIVO: Docente_Logic.gs
// DESCRIPCIÓN: Funciones para el panel del Docente (Notas, Listados)
// ============================================================================

function getCursosDocente(dniDocente) {
  console.log('=== getCursosDocente ===');
  console.log('DNI recibido:', dniDocente);
  
  try {
    const ss = SpreadsheetApp.openById(ID_HOJA);
    const sheetMaterias = ss.getSheetByName('Materias');
    
    if (!sheetMaterias) {
      console.log('Error: No existe la hoja Materias');
      return responseJSON({ status: 'error', message: 'Hoja Materias no encontrada' });
    }
    
    const dataMaterias = sheetMaterias.getDataRange().getValues();
    console.log('Total de filas en Materias:', dataMaterias.length);
    
    // Saltar la cabecera
    const materiasData = dataMaterias.slice(1);
    console.log('Materias después de saltar cabecera:', materiasData.length);
    
    // Filtrar materias del docente
    const materiasDocente = materiasData.filter(fila => {
      const dniEnMateria = String(fila[2] || '').trim(); // Columna C (índice 2) es DNI_Docente
      return dniEnMateria === String(dniDocente).trim();
    });
    
    console.log('Materias del docente:', materiasDocente.length);
    
    if (materiasDocente.length === 0) {
      return responseJSON({ 
        status: 'success', 
        data: [],
        message: 'No tienes materias asignadas' 
      });
    }
    
    // Agrupar por curso
    const cursos = {};
    
    materiasDocente.forEach(m => {
      const curso = String(m[3] || '').trim(); // Columna D (índice 3) es Curso
      const idMateria = m[0]; // Columna A (índice 0) es ID
      const nombreMateria = String(m[1] || '').trim(); // Columna B (índice 1) es Nombre
      const tipoAsignacion = String(m[5] || 'Titular').trim(); // Columna F (índice 5) es Tipo
      
      if (!curso) return;
      
      if (!cursos[curso]) {
        cursos[curso] = {
          curso: curso,
          materias: [],
          totalEstudiantes: 0
        };
      }
      
      cursos[curso].materias.push({
        id: idMateria,
        nombre: nombreMateria,
        tipoAsignacion: tipoAsignacion
      });
    });
    
    // CORRECCIÓN: Contar estudiantes por MATERIA, no por curso general
    const sheetListado = ss.getSheetByName('Listado');
    if (sheetListado && sheetListado.getLastRow() > 1) {
      const dataListado = sheetListado.getDataRange().getValues();
      const listaEstudiantes = dataListado.slice(1);
      
      // Para cada curso, contar estudiantes en CADA MATERIA
      Object.keys(cursos).forEach(cursoKey => {
        const cursoData = cursos[cursoKey];
        const cursoLower = cursoKey.toLowerCase();
        let maxEstudiantesEnCurso = 0;
        
        // Para cada materia en este curso, contar estudiantes
        cursoData.materias.forEach(materia => {
          const nombreMateriaBusqueda = materia.nombre.split('[')[0].trim().toLowerCase();
          let estudiantesEnMateria = 0;
          
          listaEstudiantes.forEach(est => {
            const materiasAsignadas = est.slice(2, 14); // Columnas 3-14 (m1-m12)
            
            // Buscar si este estudiante tiene esta materia en este curso
            const tieneLaMateria = materiasAsignadas.some(celdaRaw => {
              const textoCelda = String(celdaRaw).toLowerCase();
              return textoCelda.includes(nombreMateriaBusqueda) && 
                     textoCelda.includes(cursoLower);
            });
            
            if (tieneLaMateria) {
              estudiantesEnMateria++;
            }
          });
          
          // Actualizar el máximo de estudiantes para este curso
          if (estudiantesEnMateria > maxEstudiantesEnCurso) {
            maxEstudiantesEnCurso = estudiantesEnMateria;
          }
        });
        
        cursoData.totalEstudiantes = maxEstudiantesEnCurso;
      });
    }
    
    const resultado = Object.values(cursos);
    console.log('Resultado final con estudiantes corregidos:');
    resultado.forEach(curso => {
      console.log(`- ${curso.curso}: ${curso.totalEstudiantes} estudiantes, ${curso.materias.length} materias`);
    });
    
    return responseJSON({ 
      status: 'success', 
      data: resultado,
      totalCursos: resultado.length 
    });
    
  } catch (error) {
    console.error('Error en getCursosDocente:', error);
    return responseJSON({ 
      status: 'error', 
      message: 'Error interno: ' + error.toString() 
    });
  }
}

function getEstudiantesConDatosCompletos(dniDocente, curso, idMateria) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetListado = ss.getSheetByName('Listado');
  const sheetNotas = ss.getSheetByName('Notas');
  const sheetAsistencia = ss.getSheetByName('Asistencia');
  const sheetMaterias = ss.getSheetByName('Materias');
  
  // 1. Info Materia
  const dataMaterias = sheetMaterias.getDataRange().getValues();
  dataMaterias.shift();
  const materiaInfo = dataMaterias.find(m => String(m[0]) === String(idMateria));
  if (!materiaInfo) return responseJSON({ status: 'error', message: 'Materia no encontrada' });

  const nombreMateriaBusqueda = String(materiaInfo[1]).split('[')[0].trim().toLowerCase(); 
  const cursoBusqueda = String(curso).trim().toLowerCase(); 
  const nombreMateriaReal = String(materiaInfo[1]).trim(); 
  
  // 2. Buscar Alumnos en LISTADO
  let estudiantesCurso = [];
  if (sheetListado && sheetListado.getLastRow() > 1) {
    const dataListado = sheetListado.getDataRange().getValues();
    dataListado.shift();
    
    dataListado.forEach(fila => {
        const materiasAsignadas = fila.slice(2, 14); 
        let condicionEncontrada = "Cursa"; 

        const tieneLaMateria = materiasAsignadas.some(celdaRaw => {
             const textoCelda = String(celdaRaw).toLowerCase();
             if (textoCelda.includes(nombreMateriaBusqueda) && textoCelda.includes(cursoBusqueda)) {
                 const partes = String(celdaRaw).split('-'); 
                 if (partes.length > 1) condicionEncontrada = partes[1].trim();
                 return true;
             }
             return false;
        });

        if (tieneLaMateria) {
            estudiantesCurso.push({
                dni: fila[0],
                nombre: fila[1],
                curso: curso, 
                condicion: condicionEncontrada
            });
        }
    });
  }
  
  // 3. Cruzar con Notas y Asistencia
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
    const notasEstudiante = dataNotas.find(n => String(n[0]) === String(est.dni) && String(n[1]) === String(idMateria));
    
    const asistencias = dataAsistencia.filter(a =>
      String(a[1]) === String(est.dni) && String(a[4]) === String(dniDocente) && String(a[5]) === String(idMateria)
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
      asistencia: { total: totalClases, porcentaje: porcentajeAsistencia }
    };
  });
  
  return responseJSON({
    status: 'success',
    data: {
      materia: { id: idMateria, nombre: nombreMateriaReal, curso: curso },
      estudiantes: resultado.sort((a, b) => a.nombre.localeCompare(b.nombre))
    }
  });
}function getEstudiantesConDatosCompletos(dniDocente, curso, idMateria) {
  try {
    const ss = SpreadsheetApp.openById(ID_HOJA);
    
    // 1. Verificar que el docente tiene permiso para esta materia
    const sheetMaterias = ss.getSheetByName('Materias');
    if (!sheetMaterias) {
      return responseJSON({ status: 'error', message: 'Hoja Materias no encontrada' });
    }
    
    const dataMaterias = sheetMaterias.getDataRange().getValues();
    let materiaAutorizada = false;
    let nombreMateriaReal = '';
    let nombreMateriaBusqueda = '';
    let cursoBusqueda = '';
    
    for (let i = 1; i < dataMaterias.length; i++) {
      if (String(dataMaterias[i][0]) === String(idMateria)) {
        // Verificar que el DNI del docente coincide
        if (String(dataMaterias[i][2]) !== String(dniDocente)) {
          return responseJSON({ status: 'error', message: 'No tienes permiso para acceder a esta materia' });
        }
        
        materiaAutorizada = true;
        nombreMateriaReal = String(dataMaterias[i][1]).trim();
        nombreMateriaBusqueda = nombreMateriaReal.split('[')[0].trim().toLowerCase();
        cursoBusqueda = String(dataMaterias[i][3]).trim().toLowerCase();
        break;
      }
    }
    
    if (!materiaAutorizada) {
      return responseJSON({ status: 'error', message: 'Materia no encontrada o no autorizada' });
    }
    
    // 2. Buscar estudiantes en Listado
    const sheetListado = ss.getSheetByName('Listado');
    if (!sheetListado || sheetListado.getLastRow() <= 1) {
      return responseJSON({ status: 'error', message: 'No hay estudiantes inscritos' });
    }
    
    const dataListado = sheetListado.getDataRange().getValues();
    let estudiantesCurso = [];
    
    for (let i = 1; i < dataListado.length; i++) {
      const fila = dataListado[i];
      const materiasAsignadas = fila.slice(2, 14); // Columnas 3-14 (m1-m12)
      
      for (let j = 0; j < materiasAsignadas.length; j++) {
        const celdaRaw = String(materiasAsignadas[j]);
        const textoCelda = celdaRaw.toLowerCase();
        
        if (textoCelda.includes(nombreMateriaBusqueda) && textoCelda.includes(cursoBusqueda)) {
          let condicion = "Cursa";
          if (celdaRaw.includes('-')) {
            const partes = celdaRaw.split('-');
            if (partes.length > 1) condicion = partes[1].trim();
          }
          
          estudiantesCurso.push({
            dni: fila[0],
            nombre: fila[1],
            curso: curso,
            condicion: condicion
          });
          break; // Salir del loop de materias si ya encontramos esta
        }
      }
    }
    
    if (estudiantesCurso.length === 0) {
      return responseJSON({ 
        status: 'success', 
        data: {
          materia: { id: idMateria, nombre: nombreMateriaReal, curso: curso },
          estudiantes: []
        }
      });
    }
    
    // 3. Obtener notas de los estudiantes
    const sheetNotas = ss.getSheetByName('Notas');
    let dataNotas = [];
    if (sheetNotas && sheetNotas.getLastRow() > 1) {
      dataNotas = sheetNotas.getDataRange().getValues();
    }
    
    // 4. Obtener asistencias
    const sheetAsistencia = ss.getSheetByName('Asistencia');
    let dataAsistencia = [];
    if (sheetAsistencia && sheetAsistencia.getLastRow() > 1) {
      dataAsistencia = sheetAsistencia.getDataRange().getValues();
    }
    
    // 5. Construir respuesta
    const resultado = estudiantesCurso.map(est => {
      // Buscar notas del estudiante para esta materia
      const notasEstudiante = dataNotas.find(n => 
        n.length > 1 && 
        String(n[0]) === String(est.dni) && 
        String(n[1]) === String(idMateria)
      );
      
      // Calcular asistencia
      const asistencias = dataAsistencia.filter(a =>
        a.length > 5 &&
        String(a[1]) === String(est.dni) && 
        String(a[4]) === String(dniDocente) && 
        String(a[5]) === String(idMateria)
      );
      
      const totalClases = asistencias.length;
      const presentes = asistencias.filter(a => a[2] === 'P').length;
      const porcentajeAsistencia = totalClases > 0 ? Math.round((presentes / totalClases) * 100) : 0;
      
      return {
        dni: est.dni,
        nombre: est.nombre,
        condicion: est.condicion,
        notas: {
          nota1_C1: notasEstudiante && notasEstudiante[2] ? notasEstudiante[2] : '',
          intensificacion1: notasEstudiante && notasEstudiante[3] ? notasEstudiante[3] : '',
          nota1_C2: notasEstudiante && notasEstudiante[4] ? notasEstudiante[4] : '',
          intensificacion2: notasEstudiante && notasEstudiante[5] ? notasEstudiante[5] : '',
          diciembre: notasEstudiante && notasEstudiante[7] ? notasEstudiante[7] : '',
          febrero: notasEstudiante && notasEstudiante[8] ? notasEstudiante[8] : '',
          nota_definitiva: notasEstudiante && notasEstudiante[9] ? notasEstudiante[9] : ''
        },
        asistencia: { 
          total: totalClases, 
          porcentaje: porcentajeAsistencia,
          injustificadas: asistencias.filter(a => a[2] === 'A' && a[3] === 'No').length
        }
      };
    });
    
    // Ordenar alfabéticamente
    resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    return responseJSON({
      status: 'success',
      data: {
        materia: { 
          id: idMateria, 
          nombre: nombreMateriaReal, 
          curso: curso 
        },
        estudiantes: resultado
      }
    });
    
  } catch (error) {
    console.error('Error en getEstudiantesConDatosCompletos:', error);
    return responseJSON({ 
      status: 'error', 
      message: 'Error interno del servidor: ' + error.toString() 
    });
  }
}

function guardarNotasMasivo(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheet = ss.getSheetByName('Listado');
  const data = sheet.getDataRange().getValues();
  const idMateria = String(datos.idMateria); // ID de la materia actual

  // datos.notas es un array de objetos {dni, n1_c1, i1, n1_c2, i2, dic, feb, def}

  datos.notas.forEach(notaAlumno => {
    let dniAlumno = String(notaAlumno.dni);

    // Buscamos la fila del alumno
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) == dniAlumno) {
        
        // Ahora buscamos la columna que corresponde a ESTA materia
        // La estructura de 'Listado' es: DNI, Nombre, Mat1, Mat2... 
        // Cada materia ocupa 1 columna con formato "Nombre - Estado".
        // PERO para guardar notas detalladas (parciales), lo ideal sería tener una hoja "Notas" aparte.
        // Como estamos usando una estructura simplificada en 'Listado' para todo, 
        // vamos a guardar un JSON stringificado dentro de la celda de la materia o usar una hoja aparte.
        
        // *PARA MANTENER TU SISTEMA ACTUAL SIN ROMPER TODO:*
        // Vamos a guardar en la celda de la materia un resumen visual y 
        // usaremos Propiedades del Documento o una hoja oculta para el detalle, 
        // O MEJOR: Guardamos el string completo en la celda de 'Listado' con un formato especial parseable.
        
        // Formato de guardado en la celda: "7 (Def) | [7, -, 8, -, -, -]" 
        // Visualmente se ve la definitiva, pero guardamos todo.
        
        // Buscamos la columna de la materia (m1...m12)
        // Nota: Esto asume que sabemos qué columna (m1, m2) es la materia.
        // Como el ID de materia viene de 'Materias', necesitamos cruzarlo.
        // SIMPLIFICACIÓN: Para que funcione YA, guardaremos en la hoja 'Calificaciones' (Nueva Pestaña recomendada)
        // Si no tienes hoja 'Calificaciones', créala con columnas: ID_Materia, DNI_Alumno, JSON_Notas
        
        guardarEnHojaCalificaciones(ss, idMateria, dniAlumno, notaAlumno);
        break;
      }
    }
  });

  return responseJSON({ status: 'success' });
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

function getFaltasAlumnoDocente(e) {
  const dniAlumno = e.parameter.dni;
  const idMateria = String(e.parameter.idMateria);
  
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheet = ss.getSheetByName('Asistencia');
  const data = sheet.getDataRange().getValues();
  
  let faltas = [];
  
  // Asumimos columnas Asistencia: 
  // 0:Fecha, 1:DNI_Alumno, 2:Estado, 3:Justificado(Si/No), 4:DNI_Doc, 5:ID_Materia
  
  for (let i = 1; i < data.length; i++) {
    // Filtramos: Que sea el alumno, que sea la materia, que esté Ausente ('A') y NO justificado ('No')
    if (String(data[i][1]) === String(dniAlumno) && 
        String(data[i][5]) === idMateria && 
        data[i][2] === 'A' && 
        data[i][3] === 'No') {
      
      let fechaRaw = new Date(data[i][0]);
      let fechaStr = Utilities.formatDate(fechaRaw, Session.getScriptTimeZone(), "dd/MM/yyyy");
      
      faltas.push({
        fila: i + 1, // Guardamos el número de fila para editarla rápido después
        fecha: fechaStr
      });
    }
  }
  
  return responseJSON({ status: 'success', data: faltas });
}

function justificarFaltaDocente(e) {
  let datos; try { datos = JSON.parse(e.postData.contents); } catch(err) { datos = e.parameter; }
  
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheet = ss.getSheetByName('Asistencia');
  
  // datos.fila es el número de fila real en el Excel
  const fila = parseInt(datos.fila);
  
  // Validamos por seguridad que la fila existe
  if (fila > 1 && fila <= sheet.getLastRow()) {
    // Columna 3 es el Estado (ponemos 'J' de Justificado)
    // Columna 4 es "¿Justificado?" (ponemos 'Si')
    // Ajusta los índices según tus columnas. Aquí asumo: 
    // Col C (3) = Estado (P/A/T), Col D (4) = Justificado (Si/No)
    
    sheet.getRange(fila, 3).setValue('J');  // Cambiamos 'A' por 'J' (Opcional, según tu criterio)
    sheet.getRange(fila, 4).setValue('Si'); // Marcamos como justificado
    
    return responseJSON({ status: 'success', message: 'Falta justificada.' });
  }
  
  return responseJSON({ status: 'error', message: 'Error al ubicar la fila.' });
}


// ============================================================================
// ARCHIVO: Preceptor_Logic.gs
// DESCRIPCIÓN: Funciones para el panel de Preceptor (Asistencia, Stats)
// ============================================================================

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
      stats: { total: totalFaltas, P: stats.P, A: stats.A, T: stats.T, EF: stats.EF, J: stats.J }
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



// ============================================================================
// ARCHIVO: Utils.gs
// DESCRIPCIÓN: Utilidades, conexión a base de datos y helpers CRUD
// ============================================================================

// --- LECTURA GENÉRICA DE TABLAS ---

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

// --- CURSOS E INFORMACIÓN ACADÉMICA COMPARTIDA ---

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
  
  // Agregar cursos de Estudiantes por si no tienen materias cargadas aún
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
  
  return responseJSON({ status: 'success', data: cursos });
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
  
  return responseJSON({ status: 'success', data: resultado });
}

// --- INSCRIPCIONES ---

function getInscripcionAlumno(dni) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName('Listado');
  if (!sheet) return responseJSON({ status: 'not_found', data: [] });
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(dni)) return responseJSON({ status: 'success', data: data[i] });
  }
  return responseJSON({ status: 'not_found', data: [] });
}

// ==========================================
// EN ARCHIVO: Codigo.gs
// ==========================================

function guardarInscripcion(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const dniObjetivo = String(datos.dni).trim(); // Forzamos texto y quitamos espacios
  
  // ---------------------------------------------------
  // 1. GUARDAR EL CURSO EN LA HOJA "ESTUDIANTES"
  // ---------------------------------------------------
  const sheetEst = ss.getSheetByName('Estudiantes');
  const dataEst = sheetEst.getDataRange().getValues();
  let estudianteEncontrado = false;
  
  // Empezamos de 1 para saltar cabecera
  for (let i = 1; i < dataEst.length; i++) {
    // Comparamos DNI convirtiendo ambos a String para evitar errores de tipo
    if (String(dataEst[i][0]).trim() === dniObjetivo) {
      // Columna 3 (indice 2) es el CURSO. Actualizamos ese dato.
      // Ojo: getRange usa indices basados en 1. Fila i+1, Columna 3.
      if (datos.curso) {
        sheetEst.getRange(i + 1, 3).setValue(datos.curso);
      }
      estudianteEncontrado = true;
      break;
    }
  }

  // ---------------------------------------------------
  // 2. GUARDAR MATERIAS EN LA HOJA "LISTADO"
  // ---------------------------------------------------
  const sheetListado = ss.getSheetByName('Listado');
  const dataListado = sheetListado.getDataRange().getValues();
  let filaIndex = -1;

  for (let i = 1; i < dataListado.length; i++) {
    if (String(dataListado[i][0]).trim() === dniObjetivo) {
      filaIndex = i + 1;
      break;
    }
  }

  // Preparamos la fila de materias
  let nuevaFila = [datos.dni, datos.nombre];
  
  // Agregamos las 12 materias
  for (let k = 1; k <= 12; k++) {
    nuevaFila.push(datos[`m${k}`] || ""); 
  }
  // Agregamos las 4 intensificaciones
  for (let k = 1; k <= 4; k++) {
    nuevaFila.push(datos[`i${k}`] || ""); 
  }

  if (filaIndex > 0) {
    // Si existe, sobrescribimos (desde columna 1, longitud igual al array)
    sheetListado.getRange(filaIndex, 1, 1, nuevaFila.length).setValues([nuevaFila]);
  } else {
    // Si no existe, creamos nueva fila
    sheetListado.appendRow(nuevaFila);
  }

  return responseJSON({ 
    status: 'success', 
    message: estudianteEncontrado ? 'Inscripción y Curso actualizados' : 'Inscripción guardada (pero no se encontró al alumno en Estudiantes)' 
  });
}

// --- HELPERS PARA EDITAR/BORRAR ---

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

// --- RESPUESTA JSON ESTANDAR ---

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
