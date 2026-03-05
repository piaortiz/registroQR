# Informe de Estado Firebase — Casino Magic QR Registro
**Proyecto:** `cmn-registrosqr`  
**Fecha:** 05 de marzo de 2026  
**Analista:** Revisión técnica experta  
**Plan activo:** Spark (gratuito)

---

## 1. Resumen Ejecutivo

El sistema está en **Plan Spark (gratuito)** y hace un uso moderado y mayormente correcto de Firebase. Existen varias optimizaciones bien implementadas (cache de evento activo, contador atómico `totalRegistros`, DNI como ID de documento). Sin embargo, hay **4 riesgos concretos** que pueden generar consumo descontrolado de lecturas o superar los límites gratuitos sin que el equipo lo note, especialmente durante eventos con alta concurrencia o cuando el admin usa ciertas funciones.

**Veredicto: El sistema puede operar gratuitamente sin cambios** para eventos de escala normal (hasta ~3.000 registros/día). Dos funciones de admin representan riesgo si se usan en eventos grandes.

---

## 2. Servicios Firebase Utilizados

| Servicio | Estado | Uso |
|---|---|---|
| **Firestore** | ✅ Activo | Base de datos principal |
| **Authentication** | ✅ Activo | Login del panel admin (email/password) |
| **Storage** | ✅ Activo | Imágenes de personalización (header/footer) |
| **Hosting** | ❌ No usado | Se usa Vercel como alternativa |
| **Functions** | ❌ No usado | Toda la lógica está en el cliente |
| **Analytics** | ⚠️ Configurado | `measurementId` presente pero Firebase Analytics no se usa activamente |

---

## 3. Límites del Plan Spark (Gratuitos)

### 3.1 Firestore
| Operación | Límite diario | Estado actual |
|---|---|---|
| Lecturas | **50.000 / día** | Riesgo: ver sección 5 |
| Escrituras | **20.000 / día** | Bajo consumo |
| Eliminaciones | **20.000 / día** | Sin uso real |
| Almacenamiento | **1 GiB** | Sin riesgo previsible |

### 3.2 Authentication
| Métrica | Límite | Estado |
|---|---|---|
| Usuarios email/password | **Ilimitados** | ✅ Sin riesgo |
| Logins/mes | **Ilimitados (email)** | ✅ Sin riesgo |

### 3.3 Storage
| Métrica | Límite | Estado |
|---|---|---|
| Almacenamiento | **1 GB** | ✅ Solo 2 imágenes (header/footer, máx 2MB c/u) |
| Descargas/día | **50.000** | ✅ Sin riesgo |
| Carga/día | **1 GB** | ✅ Sin riesgo |

---

## 4. Análisis de Consumo por Operación

### 4.1 Flujo de Registro de Usuario (por cada persona que se registra)

```
Operación                          Lecturas    Escrituras
─────────────────────────────────────────────────────────
getEventoActivo() — cache HIT           0            0
getEventoActivo() — cache MISS          1            0
checkDniExists()                        1            0
  └─ isEventoActivo() (en rules)       +1            0   ← LECTURA OCULTA
createRegistro() — docRef.set()         0            1
  └─ isEventoActivo() (en rules)       +1            0   ← LECTURA OCULTA
createRegistro() — eventoRef.update()   0            1
─────────────────────────────────────────────────────────
TOTAL (con cache activo)               3 lect.    2 escrit.
TOTAL (sin cache)                      4 lect.    2 escrit.
```

> **⚠️ LECTURAS OCULTAS**: La función `isEventoActivo()` definida en `firestore.rules` ejecuta un `get()` en cada operación sobre registros. Estas lecturas **sí se cobran** contra la cuota diaria y no aparecen en el código JavaScript de la app.

**Capacidad estimada de registros diarios dentro del límite gratuito:**
- Con ~3 lecturas por registro: **~16.500 registros/día** antes de agotar lecturas (50.000 / 3)
- Con 2 escrituras por registro: **~10.000 registros/día** antes de agotar escrituras (20.000 / 2)
- **Cuello de botella real: escrituras → ~10.000 registros/día**

Para un casino/evento típico, esto es más que suficiente.

### 4.2 Panel de Administración (por sesión de admin)

```
Operación                              Lecturas estimadas
──────────────────────────────────────────────────────────
getAllEventos()                         1 por evento (+1 query)
getEstadisticasEvento()                 1 por evento (campo totalRegistros)
getAllRegistrosEvento() — ver lista     N (uno por registro)
buscarPorDNI() — collectionGroup        N (todos los eventos)
recalcularContadores() — ⛔ PELIGROSO  N registros × M eventos
getEstadisticasCompletas() — export     N (todos los registros del evento)
```

---

## 5. Riesgos Identificados

### 🔴 RIESGO ALTO — `recalcularContadores()`
**Archivo:** `js/firebase-admin.js` — función `recalcularContadores()`

**Problema:** Esta función descarga **todos los registros de todos los eventos** para recalcular el contador. Si hay 5 eventos con 500 registros cada uno, consume **2.500 lecturas en una sola operación**. Si se llama accidentalmente varias veces en un día con datos grandes, puede agotar la cuota diaria.

**Recomendación:** Agregar un `confirm()` de advertencia en el botón del admin antes de ejecutarla, y restringir su uso a casos de inconsistencia real.

---

### 🔴 RIESGO ALTO — `getEstadisticasCompletas()`
**Archivo:** `js/firebase-admin.js` — función `getEstadisticasCompletas()`

**Problema:** Descarga todos los documentos de registros de un evento para calcular estadísticas. Se llama implícitamente cuando el admin visualiza estadísticas detalladas o exporta.

**Recomendación:** Ya existe `getEstadisticasEvento()` optimizada que usa el campo `totalRegistros`. Verificar que la versión "completa" solo se llame al exportar CSV, no en la carga normal del panel.

---

### 🟡 RIESGO MEDIO — Lecturas ocultas en `isEventoActivo()` (Security Rules)
**Archivo:** `firestore.rules`

**Problema:** La función `isEventoActivo()` hace un `get()` al documento del evento en cada operación de lectura/escritura sobre la colección `registros`. Esto genera 2 lecturas ocultas por cada registro creado, y 1 lectura oculta por cada verificación de DNI. Estas lecturas **no son visibles en el código JS** pero se cobran en la cuota.

**Recomendación:** Para eventos de escala muy alta (>5.000 registros/día), considerar cachear el estado del evento en el cliente y pasar un token firmado, o simplificar la regla a solo verificar el campo básico. Para escala actual, no es urgente.

---

### 🟡 RIESGO MEDIO — Sistema de autenticación dual
**Archivos:** `js/firebase-admin.js`

**Problema:** El sistema usa **dos mecanismos de sesión en paralelo**:
1. Firebase Authentication con persistencia `LOCAL` (persiste al cerrar el navegador)
2. `sessionStorage` con `admin_logged` y expiración de 4 horas (se pierde al cerrar el tab)

Esto crea comportamiento inconsistente: Firebase Auth puede tener sesión activa pero `sessionStorage` no, o viceversa. La función `verificarAdmin()` con el sistema legacy retorna siempre `false` pero aún existe en el código.

**Recomendación:** Unificar completamente en Firebase Auth. Eliminar el `sessionStorage` y confiar en `onAuthStateChanged` como única fuente de verdad.

---

### 🟢 RIESGO BAJO — Analytics configurado pero sin uso definido
**Archivo:** `js/firebase-config.js`

El `measurementId: "G-27V3ZM9FYC"` está configurado. Si se carga el SDK de Analytics, generará un evento `page_view` por cada carga de página. En Plan Spark esto no tiene costo, pero conviene revisar si se usa conscientemente.

---

## 6. Buenas Prácticas Implementadas Correctamente ✅

| Práctica | Implementación |
|---|---|
| **Cache agresivo de evento activo** | `localStorage` con TTL de 30 minutos — ahorra 1 lectura por carga de página |
| **DNI como ID de documento** | Permite `doc.get()` directo en lugar de queries — mínimo costo |
| **Contador atómico `totalRegistros`** | Usa `FieldValue.increment()` — evita descargar todos los registros para contar |
| **Limit en `getRegistros()`** | `limit(100)` — evita descargar colecciones completas sin control |
| **`Promise.all()` en createRegistro** | Paraleliza escrituras — reduce latencia percibida |
| **Filtrado de `undefined/null`** | Evita errores inesperados de Firestore con campos vacíos |
| **`DEBUG_MODE = false`** | Sin logs innecesarios en producción |
| **Reglas de Storage restrictivas** | Solo JPEG/PNG/WebP hasta 2MB en rutas específicas |
| **Registro inmutable** | `allow update, delete: if false` en registros — integridad de datos garantizada |
| **Evento activo único forzado** | `verificarYCorregirEventosActivos()` mantiene consistencia |
| **`collectionGroup` index** | Declarado en `firestore.indexes.json` — permite search por DNI entre eventos |

---

## 7. Estructura de Datos Firestore

```
/eventos/{eventoId}
  ├── activo: boolean
  ├── nombre: string
  ├── fechaEvento: string
  ├── horaEvento: string
  ├── totalRegistros: number   ← contador atómico
  └── actualizadoEn: timestamp

  └── /registros/{dni}         ← DNI como Document ID
        ├── dni: string
        ├── nombreCompleto: string
        ├── fechaNacimiento: string
        ├── email: string
        ├── telefono: string
        ├── eventoId: string
        ├── timestamp: timestamp
        ├── estado: "ACTIVO"
        ├── syncedToSheets: boolean
        ├── ipAddress: string
        ├── fechaEvento?: string
        └── horaEvento?: string

/configuracion/{configId}
  └── estilos: { primaryColor, ... }
```

---

## 8. Índices Definidos

3 índices compuestos en `collectionGroup: registros`:

| Índice | Campos | Uso |
|---|---|---|
| 1 | `eventoId ASC` + `timestamp DESC` | Listado de registros por evento ordenado |
| 2 | `estado ASC` + `timestamp DESC` | Filtrar activos/inactivos |
| 3 | `syncedToSheets ASC` + `timestamp ASC` | Cola de sincronización con Sheets |

Son apropiados para las queries actuales. Sin índices innecesarios.

---

## 9. Proyección de Uso Mensual (escenario típico)

Asumiendo: 10 eventos/mes, 200 registros por evento, 5 sesiones admin/mes:

| Operación | Volumen | Lecturas |
|---|---|---|
| Registros de usuarios (3 lect. c/u) | 2.000 registros | 6.000 |
| Admin — ver lista de eventos | 5 sesiones × 10 eventos | 50 |
| Admin — ver registros en lista | 5 sesiones × 200 reg. | 1.000 |
| Admin — exportar CSV | 3 exportaciones × 200 reg. | 600 |
| Verificaciones de DNI duplicado | ~400 (20% de intentos) | 800 |
| **TOTAL MENSUAL** | | **~8.450 lecturas** |
| **Límite mensual (50k × 30 días)** | | **1.500.000 lecturas** |
| **% del límite usado** | | **< 1%** |

**Conclusión:** Con el volumen actual de eventos, el sistema está muy lejos de los límites del plan gratuito.

---

## 10. Recomendaciones Priorizadas

### Prioridad 1 — Hacer ahora (sin costo, sin riesgo)
1. **Agregar advertencia al botón `recalcularContadores()`** en el admin panel para evitar uso accidental.
2. **Eliminar la función `verificarAdmin()` y el sistema legacy** de `sessionStorage` — unificar en Firebase Auth.

### Prioridad 2 — Optimizaciones recomendadas
3. **Verificar que `getEstadisticasCompletas()` solo se llame al exportar CSV**, no en la carga del dashboard.
4. **Agregar paginación** al listado de registros en admin para cuando los eventos crezcan (>500 registros).

### Prioridad 3 — Solo si escala masivamente
5. Si supera 5.000 registros/evento, evaluar reemplazar `isEventoActivo()` en las rules por un campo denormalizado en el registro (`eventoActivo: true`), eliminando las lecturas ocultas de las reglas.
6. Si se requiere reporting avanzado, considerar BigQuery Export (disponible en Plan Blaze, bajo costo).

---

## 11. Conclusión

| Aspecto | Estado |
|---|---|
| **Costo actual** | $0 — dentro del plan gratuito |
| **Riesgo de superar límites** | Bajo para uso normal de eventos |
| **Arquitectura de datos** | Sólida — bien pensada para el caso de uso |
| **Seguridad (Rules)** | Buena — registros inmutables, Storage restringido |
| **Deuda técnica** | Baja — sistema de auth dual a unificar |
| **Mantenibilidad** | Alta — código bien documentado y modular |

El sistema está listo para producción en Plan Spark. No hay necesidad de migrar a Plan Blaze (pago) en el corto plazo. El único gasto externo detectado es **Cloudinary** para imágenes (según `documentacion/3.2_CLOUDINARY_TECNICA.md`), que tampoco implica costo si se mantiene dentro de la capa gratuita.
