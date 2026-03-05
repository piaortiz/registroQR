/**
 * Módulo de Administración Firebase
 * Funciones específicas para el panel de administración
 * Autenticación: Firebase Authentication (Email/Password)
 */

// IMPORTANTE: Este sistema usa Firebase Authentication
// NO hay contraseñas en el código por seguridad
// Configurar usuarios en: Firebase Console → Authentication → Users

/**
 * Login con Firebase Authentication
 */
async function loginWithFirebase(email, password) {
    try {
        const auth = firebase.auth();
        
        // Configurar persistencia LOCAL (persiste incluso al cerrar el navegador)
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login exitoso:', userCredential.user.email);
        return true;
    } catch (error) {
        console.error('❌ Error login:', error.code, error.message);
        throw error;
    }
}

/**
 * Cerrar sesión
 * Única fuente de verdad: Firebase Auth + onAuthStateChanged en admin.html.
 */
async function cerrarSesion() {
    try {
        await firebase.auth().signOut();
        console.log('✅ Sesión cerrada correctamente');
    } catch (error) {
        console.error('Error al cerrar sesión Firebase:', error);
    }
}

/**
 * Verificar y corregir si hay múltiples eventos activos
 * Solo debe haber 1 evento activo a la vez
 */
async function verificarYCorregirEventosActivos() {
    try {
        const db = firebase.firestore();
        const eventosActivos = await db.collection('eventos').where('activo', '==', true).get();
        
        if (eventosActivos.size > 1) {
            console.warn(`⚠️ Se encontraron ${eventosActivos.size} eventos activos. Corrigiendo...`);
            
            // Mantener solo el más reciente activo
            const eventos = [];
            eventosActivos.forEach(doc => {
                eventos.push({
                    id: doc.id,
                    ref: doc.ref,
                    actualizadoEn: doc.data().actualizadoEn?.toDate() || new Date(0)
                });
            });
            
            // Ordenar por fecha de actualización (más reciente primero)
            eventos.sort((a, b) => b.actualizadoEn - a.actualizadoEn);
            
            // Desactivar todos excepto el primero
            const batch = db.batch();
            for (let i = 1; i < eventos.length; i++) {
                batch.update(eventos[i].ref, { activo: false });
            }
            await batch.commit();
            
            console.log(`✅ Corregido: Se mantuvo activo ${eventos[0].id} y se desactivaron ${eventos.length - 1} eventos`);
            return eventos[0].id; // Retorna el ID del evento que quedó activo
        }
        
        return null; // No hubo correcciones
    } catch (error) {
        console.error('❌ Error verificando eventos activos:', error);
        return null;
    }
}

/**
 * Obtener todos los eventos
 */
async function getAllEventos() {
    try {
        const snapshot = await firebase.firestore()
            .collection('eventos')
            .orderBy('actualizadoEn', 'desc')
            .get();
        
        const eventos = [];
        snapshot.forEach(doc => {
            eventos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return eventos;
    } catch (error) {
        console.error('❌ Error obteniendo eventos:', error);
        throw error;
    }
}

/**
 * Activar/desactivar evento
 */
async function toggleEventoActivo(eventoId, activo) {
    try {
        const db = firebase.firestore();
        
        // Si se está activando, desactivar todos los demás primero
        if (activo) {
            const eventos = await db.collection('eventos').where('activo', '==', true).get();
            const batch = db.batch();
            eventos.forEach(doc => {
                batch.update(doc.ref, { activo: false });
            });
            await batch.commit();
        }
        
        // Actualizar el evento seleccionado
        await db.collection('eventos').doc(eventoId).update({
            activo: activo,
            actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Evento ${eventoId} ${activo ? 'activado' : 'desactivado'}`);
        return true;
    } catch (error) {
        console.error('❌ Error actualizando evento:', error);
        throw error;
    }
}

/**
 * Eliminar evento
 */
async function eliminarEvento(eventoId) {
    try {
        const db = firebase.firestore();
        
        // Contar registros
        const registros = await db.collection('eventos')
            .doc(eventoId)
            .collection('registros')
            .limit(1)
            .get();
        
        if (!registros.empty) {
            throw new Error('No se puede eliminar un evento con registros. Desactívalo en su lugar.');
        }
        
        await db.collection('eventos').doc(eventoId).delete();
        console.log('✅ Evento eliminado:', eventoId);
        return true;
    } catch (error) {
        console.error('❌ Error eliminando evento:', error);
        throw error;
    }
}

/**
 * Obtener estadísticas de un evento (OPTIMIZADO - lee solo el doc del evento)
 * Usa el campo 'totalRegistros' que se mantiene con FieldValue.increment()
 */
async function getEstadisticasEvento(eventoId) {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('eventos').doc(eventoId).get();
        const total = doc.exists ? (doc.data().totalRegistros || 0) : 0;
        return { total };
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        throw error;
    }
}

/**
 * Obtener estadísticas detalladas de un evento (descarga todos los registros)
 * ⚠️  COSTO ALTO: genera N lecturas de Firestore (una por registro).
 * Solo usar cuando sea estrictamente necesario (auditoría puntual).
 * Para el dashboard normal, usar getEstadisticasEvento() que es gratuita.
 *
 * Rate limiting: máximo 1 vez cada 30 minutos por eventoId.
 */
async function getEstadisticasCompletas(eventoId) {
    // ── RATE LIMITING: máximo 1 vez cada 30 minutos por evento ──
    const LIMITER_KEY = `cmn_estadisticas_completas_${eventoId}`;
    const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos
    const lastRun = parseInt(localStorage.getItem(LIMITER_KEY) || '0');
    if (Date.now() - lastRun < COOLDOWN_MS) {
        const minutosRestantes = Math.ceil((COOLDOWN_MS - (Date.now() - lastRun)) / 60000);
        console.warn(`⏳ getEstadisticasCompletas() bloqueada por rate limiting. Reintentá en ${minutosRestantes} min.`);
        throw new Error(`Operación bloqueada: esperá ${minutosRestantes} minuto${minutosRestantes !== 1 ? 's' : ''} antes de volver a ejecutar estadísticas completas.`);
    }

    console.warn(
        '⚠️  getEstadisticasCompletas() — OPERACIÓN COSTOSA\n' +
        `Descargando TODOS los registros del evento "${eventoId}".\n` +
        'Considera usar getEstadisticasEvento() si solo necesitás el total.'
    );

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('eventos')
            .doc(eventoId)
            .collection('registros')
            .get();
        
        let total = 0;
        let sincronizados = 0;
        let activos = 0;
        
        snapshot.forEach(doc => {
            total++;
            const data = doc.data();
            if (data.syncedToSheets) sincronizados++;
            if (data.estado === 'ACTIVO') activos++;
        });

        // Guardar timestamp del último uso
        localStorage.setItem(LIMITER_KEY, Date.now().toString());
        
        return { total, sincronizados, pendientesSincronizacion: total - sincronizados, activos, inactivos: total - activos };
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas completas:', error);
        throw error;
    }
}

/**
 * Recalcular y guardar totalRegistros en todos los eventos.
 * ⚠️  COSTO ALTO: lee todos los registros de todos los eventos (N lecturas).
 * Solo usar ante inconsistencias reales. El panel de admin aplica rate limiting
 * de 1 hora antes de permitir una nueva llamada.
 */
async function recalcularContadores() {
    console.warn(
        '⚠️  recalcularContadores() — OPERACIÓN COSTOSA\n' +
        'Descargando todos los registros de todos los eventos para recalcular contadores.'
    );
    const db = firebase.firestore();
    const eventos = await db.collection('eventos').get();
    const batch = db.batch();
    const counts = [];
    
    for (const eventoDoc of eventos.docs) {
        const snap = await db.collection('eventos').doc(eventoDoc.id).collection('registros').get();
        batch.update(eventoDoc.ref, { totalRegistros: snap.size });
        counts.push({ id: eventoDoc.id, total: snap.size });
    }
    
    await batch.commit();
    console.log('✅ Contadores actualizados:', counts);
    return counts;
}

/**
 * Obtener todos los registros de un evento
 */
async function getAllRegistrosEvento(eventoId, orderBy = 'timestamp', orderDir = 'desc') {
    try {
        const snapshot = await firebase.firestore()
            .collection('eventos')
            .doc(eventoId)
            .collection('registros')
            .orderBy(orderBy, orderDir)
            .get();
        
        const registros = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            registros.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
            });
        });
        
        return registros;
    } catch (error) {
        console.error('❌ Error obteniendo registros:', error);
        throw error;
    }
}

/**
 * Exportar registros a CSV
 */
function exportarCSV(registros, nombreEvento) {
    const headers = [
        'DNI',
        'Nombre Completo',
        'Fecha Nacimiento',
        'Email',
        'Teléfono',
        'Fecha Evento',
        'Hora Evento',
        'Fecha Registro',
        'Estado',
        'IP',
        'Sincronizado'
    ];

    const formatFecha = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const sanitize = (val) => {
        if (val === null || val === undefined) return '';
        return String(val).replace(/"/g, '""');
    };

    const rows = registros.map(r => [
        r.dni,
        r.nombreCompleto,
        r.fechaNacimiento || '',
        r.email || '',
        r.telefono || '',
        r.fechaEvento || '',
        r.horaEvento || '',
        formatFecha(r.timestamp),
        r.estado || 'ACTIVO',
        r.ipAddress || '',
        r.syncedToSheets ? 'Sí' : 'No'
    ]);

    // Separador ; para compatibilidad con Excel en español
    // BOM UTF-8 para que Excel interprete tildes y ñ correctamente
    const SEP = ';';
    const BOM = '\uFEFF';
    let csv = BOM + headers.map(h => `"${sanitize(h)}"`).join(SEP) + '\r\n';
    rows.forEach(row => {
        csv += row.map(field => `"${sanitize(field)}"`).join(SEP) + '\r\n';
    });

    // Nombre de archivo legible con fecha
    const ahora = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fechaArchivo = `${ahora.getFullYear()}${pad(ahora.getMonth()+1)}${pad(ahora.getDate())}_${pad(ahora.getHours())}${pad(ahora.getMinutes())}`;
    const nombreArchivo = `registros_${nombreEvento.replace(/\s+/g, '_')}_${fechaArchivo}.csv`;

    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Buscar registros por DNI en todos los eventos
 */
async function buscarPorDNI(dni) {
    try {
        const snapshot = await firebase.firestore()
            .collectionGroup('registros')
            .where('dni', '==', dni)
            .get();
        
        const resultados = [];
        snapshot.forEach(doc => {
            resultados.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return resultados;
    } catch (error) {
        console.error('❌ Error buscando DNI:', error);
        throw error;
    }
}

// Exportar funciones
window.FirebaseAdmin = {
    cerrarSesion,
    verificarYCorregirEventosActivos,
    getAllEventos,
    toggleEventoActivo,
    eliminarEvento,
    getEstadisticasEvento,
    getEstadisticasCompletas,
    recalcularContadores,
    getAllRegistrosEvento,
    exportarCSV,
    buscarPorDNI
};
