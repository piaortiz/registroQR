/**
 * Módulo de Base de Datos Firebase - Firestore
 * Casino Magic - Sistema de Registro de Eventos
 * Optimizado para uso desde TABLET (cache agresivo)
 * 
 * ESTRUCTURA:
 * eventos/{eventoId}/registros/{dni}
 */

// Modo DEBUG (cambiar a false en producción)
const DEBUG_MODE = false;
function debugLog(...args) {
    if (DEBUG_MODE) console.log(...args);
}

// Configuración de cache para tablet
const CACHE_CONFIG = {
    EVENTO_ACTIVO_TTL: 2 * 60 * 1000, // 2 minutos - propagación rápida al cambiar evento activo
    ENABLE_CACHE: true,
    STORAGE_KEY_EVENTO: 'cmn_evento_activo',
    STORAGE_KEY_TIMESTAMP: 'cmn_evento_timestamp'
};

// Inicializar Firebase
let db = null;
let currentEventoId = null;

/**
 * Inicializar Firestore
 */
function initFirestore() {
    if (!window.FIREBASE_CONFIG) {
        console.error('❌ Firebase config no encontrada');
        return false;
    }

    try {
        // Inicializar Firebase App
        if (!firebase.apps.length) {
            firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        
        // Inicializar Firestore
        db = firebase.firestore();
        
        debugLog('✅ Firestore inicializado correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error inicializando Firestore:', error);
        return false;
    }
}

/**
 * Establecer el evento actual
 * @param {string} eventoId - ID del evento activo
 */
function setEventoActual(eventoId) {
    currentEventoId = eventoId;
    debugLog('📅 Evento actual:', eventoId);
}

/**
 * Obtener el evento actual
 * @returns {string} ID del evento actual
 */
function getEventoActual() {
    return currentEventoId || 'evento-default';
}

/**
 * Verificar si un DNI ya está registrado en el evento actual
 * @param {string} dni - DNI a verificar
 * @returns {Promise<Object>} {exists: boolean, data: Object|null}
 */
async function checkDniExists(dni) {
    try {
        const eventoId = getEventoActual();
        const docRef = db.collection('eventos').doc(eventoId).collection('registros').doc(dni);
        const doc = await docRef.get();
        
        if (doc.exists) {
            return {
                exists: true,
                data: doc.data()
            };
        }
        
        return {
            exists: false,
            data: null
        };
    } catch (error) {
        console.error('❌ Error verificando DNI:', error);
        throw error;
    }
}

/**
 * Crear un nuevo registro en el evento actual
 * @param {Object} registroData - Datos del registro
 * @returns {Promise<Object>} Resultado de la operación
 */
async function createRegistro(registroData) {
    try {
        const eventoId = getEventoActual();
        const dni = registroData.dni;
        
        // Verificar si ya existe
        const exists = await checkDniExists(dni);
        if (exists.exists) {
            return {
                status: 'DUPLICATE',
                message: 'Este DNI ya está registrado en este evento',
                data: exists.data
            };
        }
        
        // Crear documento con DNI como ID
        const docRef = db.collection('eventos').doc(eventoId).collection('registros').doc(dni);
        
        // Preparar datos - Filtrar campos undefined
        const baseData = {
            ...registroData,
            eventoId: eventoId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            estado: 'ACTIVO',
            syncedToSheets: false
        };
        
        // Eliminar campos undefined o null para evitar errores de Firestore
        const dataToSave = Object.fromEntries(
            Object.entries(baseData).filter(([_, value]) => value !== undefined && value !== null)
        );
        
        // Guardar en Firestore e incrementar contador atómicamente
        const eventoRef = db.collection('eventos').doc(eventoId);
        await Promise.all([
            docRef.set(dataToSave),
            eventoRef.update({
                totalRegistros: firebase.firestore.FieldValue.increment(1)
            })
        ]);
        
        debugLog('✅ Registro creado:', dni);
        
        return {
            status: 'SUCCESS',
            message: 'Registro creado exitosamente',
            data: dataToSave
        };
        
    } catch (error) {
        console.error('❌ Error creando registro:', error);
        return {
            status: 'ERROR',
            message: 'Error al crear el registro: ' + error.message,
            error: error
        };
    }
}

/**
 * Obtener todos los registros del evento actual
 * @param {number} limit - Límite de registros (default: 100)
 * @returns {Promise<Array>} Lista de registros
 */
async function getRegistros(limit = 100) {
    try {
        const eventoId = getEventoActual();
        const snapshot = await db.collection('eventos')
            .doc(eventoId)
            .collection('registros')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        
        const registros = [];
        snapshot.forEach(doc => {
            registros.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return registros;
    } catch (error) {
        console.error('❌ Error obteniendo registros:', error);
        throw error;
    }
}

/**
 * Obtener registros pendientes de sincronización con Google Sheets
 * @returns {Promise<Array>} Lista de registros pendientes
 */
async function getPendientesSincronizacion() {
    try {
        const eventoId = getEventoActual();
        const snapshot = await db.collection('eventos')
            .doc(eventoId)
            .collection('registros')
            .where('syncedToSheets', '==', false)
            .orderBy('timestamp', 'asc')
            .get();
        
        const pendientes = [];
        snapshot.forEach(doc => {
            pendientes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return pendientes;
    } catch (error) {
        console.error('❌ Error obteniendo pendientes:', error);
        throw error;
    }
}

/**
 * Marcar registro como sincronizado con Google Sheets
 * @param {string} dni - DNI del registro
 * @returns {Promise<void>}
 */
async function markAsSynced(dni) {
    try {
        const eventoId = getEventoActual();
        const docRef = db.collection('eventos').doc(eventoId).collection('registros').doc(dni);
        await docRef.update({
            syncedToSheets: true
        });
        debugLog('✅ Registro marcado como sincronizado:', dni);
    } catch (error) {
        console.error('❌ Error marcando como sincronizado:', error);
        throw error;
    }
}

/**
 * Crear o actualizar evento
 * @param {string} eventoId - ID del evento
 * @param {Object} eventoData - Datos del evento
 * @returns {Promise<void>}
 */
async function createOrUpdateEvento(eventoId, eventoData) {
    try {
        const docRef = db.collection('eventos').doc(eventoId);
        await docRef.set({
            ...eventoData,
            actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        debugLog('✅ Evento creado/actualizado:', eventoId);
    } catch (error) {
        console.error('❌ Error creando/actualizando evento:', error);
        throw error;
    }
}

/**
 * Obtener evento activo (CON CACHE OPTIMIZADO PARA TABLET)
 * Cache de 30 minutos - perfecto para uso continuo desde mismo dispositivo
 * @returns {Promise<Object>} Datos del evento activo
 */
async function getEventoActivo() {
    try {
        // Verificar cache en localStorage
        if (CACHE_CONFIG.ENABLE_CACHE) {
            const cachedEvento = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY_EVENTO);
            const cachedTimestamp = parseInt(localStorage.getItem(CACHE_CONFIG.STORAGE_KEY_TIMESTAMP) || '0');
            const now = Date.now();
            
            // Si hay cache válido, usarlo
            if (cachedEvento && (now - cachedTimestamp) < CACHE_CONFIG.EVENTO_ACTIVO_TTL) {
                debugLog('📦 Cache HIT - Evento activo desde localStorage');
                return JSON.parse(cachedEvento);
            } else {
                debugLog('🔄 Cache MISS - Consultando Firestore');
            }
        }
        
        // Consultar Firestore
        const snapshot = await db.collection('eventos')
            .where('activo', '==', true)
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const evento = {
                id: doc.id,
                ...doc.data()
            };
            
            // Guardar en cache
            if (CACHE_CONFIG.ENABLE_CACHE) {
                localStorage.setItem(CACHE_CONFIG.STORAGE_KEY_EVENTO, JSON.stringify(evento));
                localStorage.setItem(CACHE_CONFIG.STORAGE_KEY_TIMESTAMP, Date.now().toString());
                debugLog('💾 Evento guardado en cache');
            }
            
            return evento;
        }
        
        return null;
    } catch (error) {
        console.error('❌ Error obteniendo evento activo:', error);
        throw error;
    }
}

/**
 * Limpiar cache de evento activo (usar al cambiar de evento en admin)
 */
function clearEventoCache() {
    localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY_EVENTO);
    localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY_TIMESTAMP);
    debugLog('🗑️ Cache de evento limpiado');
}

// Exportar funciones
window.FirebaseDB = {
    initFirestore,
    setEventoActual,
    getEventoActual,
    checkDniExists,
    createRegistro,
    getRegistros,
    getPendientesSincronizacion,
    markAsSynced,
    createOrUpdateEvento,
    getEventoActivo
};

