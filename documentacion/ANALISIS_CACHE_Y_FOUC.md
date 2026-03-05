# Análisis: Cache de Evento Activo y Flash de Estilos (FOUC)

**Fecha:** 05/03/2026  
**Estado:** ✅ Implementado parcialmente (Opción A de ambos problemas) — 05/03/2026

---

## Problema 1 — El evento activo tarda en actualizarse en el celu del cliente

### Descripción

Cuando el admin cambia el evento activo en el panel, los dispositivos de los clientes **no se enteran hasta que el cache local expira**. El cliente puede estar registrándose al evento viejo sin saberlo.

### Causa raíz

En [`js/firebase-db.js`](../js/firebase-db.js), la función `getEventoActivo()` guarda el evento en `localStorage` con un TTL de **30 minutos**:

```js
const CACHE_CONFIG = {
    EVENTO_ACTIVO_TTL: 30 * 60 * 1000, // 30 minutos ← aquí está el problema
    STORAGE_KEY_EVENTO: 'cmn_evento_activo',
    STORAGE_KEY_TIMESTAMP: 'cmn_evento_timestamp'
};
```

- Solo se refresca al expirar el TTL o al recargar la página manualmente.
- `clearEventoCache()` existe en el módulo pero **no está exportada** en `window.FirebaseDB`, por lo que código externo no puede llamarla.
- El evento `storage` solo dispara entre pestañas del **mismo navegador/dispositivo**, no entre dispositivos distintos.

### Opciones de solución

---

#### Opción A — Reducir el TTL (cambio mínimo, bajo riesgo) ✅ IMPLEMENTADO

Bajar de 30 min a 1–2 minutos.

```js
EVENTO_ACTIVO_TTL: 2 * 60 * 1000, // 2 minutos
```

**Pros:**
- Cambio de una línea, sin riesgo.
- El cliente se actualiza a los 2 min del cambio.

**Contras:**
- Más lecturas a Firestore (aprox. 30x más que ahora).
- Con muchos dispositivos simultáneos puede incrementar el costo de Firestore.
- El cliente puede estar 2 min registrándose al evento equivocado.

**Impacto en Firestore:** cada dispositivo hace 1 read cada 2 min en lugar de 1 cada 30 min. En un evento con 10 tablets: 300 reads/hora vs 20 actuales.

---

#### Opción B — Listener en tiempo real con `onSnapshot` ⭐ Recomendada

Reemplazar la consulta `get()` por un listener de Firestore que escucha cambios en tiempo real.

```js
// En lugar de get(), suscribirse:
db.collection('eventos')
  .where('activo', '==', true)
  .limit(1)
  .onSnapshot(snapshot => {
      if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const nuevoEvento = { id: doc.id, ...doc.data() };
          // Si el evento cambió, actualizar inmediatamente
          if (nuevoEvento.id !== currentEventoId) {
              setEventoActual(nuevoEvento.id);
              eventoActual = nuevoEvento;
              actualizarNombreEnUI(nuevoEvento.nombre);
          }
      }
  });
```

**Pros:**
- **Propagación inmediata** a todos los dispositivos cuando el admin cambia el evento.
- No hay polling ni TTL que gestionar.
- Firestore mantiene la conexión abierta y empuja el cambio.

**Contras:**
- Requiere conexión WebSocket persistente (funciona bien en WiFi de casino, puede tener issues en señal débil).
- Firestore cobra por escuchas activas de forma similar a reads.
- Hay que manejar el `unsubscribe` para evitar memory leaks si la app se destruye.
- Pequeño refactor en `initializeFirebase()` de `main-dni-optimized.js`.

**Archivos a modificar:**
- `js/firebase-db.js` → nueva función `subscribeToEventoActivo(callback)`
- `js/main-dni-optimized.js` → llamar `subscribeToEventoActivo` en lugar de `getEventoActivo`

---

#### Opción C — Verificación en background al recargar (híbrido)

Usar el cache para la carga inicial (UX rápida), pero siempre lanzar una consulta en segundo plano para verificar si el evento cambió.

```js
async function getEventoActivo() {
    const cached = getFromCache();
    
    if (cached) {
        // Usar cache inmediatamente (UX rápida)
        verificarEnBackground(); // sin await
        return cached;
    }
    
    return await consultarFirestore();
}

async function verificarEnBackground() {
    const actual = await consultarFirestore();
    if (actual.id !== currentEventoId) {
        // Cambió: actualizar UI y cache silenciosamente
        setEventoActual(actual.id);
        actualizarNombreEnUI(actual.nombre);
    }
}
```

**Pros:**
- Carga inicial siempre rápida (usa cache).
- Se auto-corrige en la siguiente pageview dentro de segundos.
- Sin listeners persistentes.

**Contras:**
- El primer cliente que carga la página después del cambio todavía puede ver el evento viejo por unos segundos.
- El cambio no es inmediato mid-session.

---

#### Opción D — Exportar `clearEventoCache` y llamarla desde admin (complemento)

En el panel admin, al cambiar el evento activo, llamar `FirebaseDB.clearEventoCache()` para limpiar el cache en ese dispositivo. Además, escribir un timestamp en `localStorage` con una clave compartida para invalidar otros dispositivos del mismo origen.

> **Limitación:** `localStorage` no se comparte entre dispositivos diferentes. Solo funciona para el mismo navegador/dispositivo. Útil solo como complemento de otra opción.

**Cambio requerido:**
```js
// En firebase-db.js, exportar la función:
window.FirebaseDB = {
    ...
    clearEventoCache  // agregar esta línea
};
```

---

### Recomendación para Problema 1

✅ **Opción A implementada** (TTL reducido a 2 min). Pendiente: **Opción B (onSnapshot)** como solución definitiva en tiempo real.

---

---

## Problema 2 — El cliente ve los estilos por defecto un segundo antes de que carguen los personalizados (FOUC)

### Descripción

FOUC = **Flash of Unstyled Content**. El cliente entra a la página, ve el diseño genérico (colores, imágenes por defecto) y en ~1 segundo la página "salta" a la estética personalizada del evento. Esto se ve raro y da sensación de página rota.

### Causa raíz

En [`js/config-loader.js`](../js/config-loader.js), la función `init()` aplica los estilos **después** de una consulta asíncrona a Firebase:

```
1. DOMContentLoaded  →  el browser pinta la página con CSS por defecto  ← aquí se ve el flash
2. init() se ejecuta
3. Intenta leer sessionStorage
4. Siempre consulta Firebase para comparar cacheVersion  ← operación async ~300-800ms
5. Firebase responde
6. applyConfiguration() aplica colores e imágenes  ← recién aquí se ven los estilos
```

Incluso cuando hay cache en `sessionStorage`, el código SIEMPRE va a Firebase a comparar versiones:

```js
if (cachedData) {
    // SIEMPRE espera esta consulta antes de aplicar estilos
    const firebaseData = await loadConfigFromFirebase(); // ← bloqueante
    if (firebaseData.cacheVersion > cachedData.cacheVersion) {
        applyConfiguration(firebaseData.config);
    } else {
        applyConfiguration(cachedData.config); // ← recién aquí, tarde
    }
}
```

### Opciones de solución

---

#### Opción A — Aplicar cache inmediatamente, verificar en background ⭐ ✅ IMPLEMENTADO

Separar la **aplicación de estilos** (debe ser instantánea) de la **verificación de versión** (puede ser en background).

```js
async function init() {
    const cachedData = getFromCache();

    if (cachedData) {
        // INMEDIATO: aplicar estilos del cache sin esperar Firebase
        applyConfiguration(cachedData.config);

        // BACKGROUND: verificar si hay versión nueva (sin bloquear)
        verificarVersionEnBackground(cachedData.cacheVersion);
    } else {
        // Sin cache: cargar desde Firebase (primera vez)
        const firebaseData = await loadConfigFromFirebase();
        saveToCache(firebaseData.config, firebaseData.cacheVersion);
        applyConfiguration(firebaseData.config);
    }
}

async function verificarVersionEnBackground(versionLocal) {
    try {
        const firebaseData = await loadConfigFromFirebase();
        if (firebaseData.cacheVersion > versionLocal) {
            saveToCache(firebaseData.config, firebaseData.cacheVersion);
            applyConfiguration(firebaseData.config); // actualiza silenciosamente
        }
    } catch (e) {
        // Silencioso, no es crítico
    }
}
```

**Pros:**
- El flash desaparece para usuarios que ya visitaron la página (tienen cache).
- La actualización de estilos sigue funcionando en background.
- Cambio mínimo y localizado en `config-loader.js`.

**Contras:**
- La primera visita (sin cache) sigue teniendo el flash por el tiempo de carga de Firebase.

---

#### Opción B — Guardar CSS en localStorage y aplicar en `<head>` antes del render

Guardar las variables CSS calculadas en `localStorage` y aplicarlas con un `<script>` inline en el `<head>` del HTML, **antes de que el browser pinte cualquier pixel**.

**En `index.html`, agregar en el `<head>` antes de cualquier CSS:**
```html
<script>
  (function() {
    try {
      var s = localStorage.getItem('cmn_css_vars');
      if (s) {
        var vars = JSON.parse(s);
        var root = document.documentElement;
        Object.keys(vars).forEach(function(k) { root.style.setProperty(k, vars[k]); });
      }
    } catch(e) {}
  })();
</script>
```

**En `config-loader.js`, guardar las variables al aplicarlas:**
```js
function applyPrimaryColor(color) {
    // ... lógica existente ...
    
    // Guardar en localStorage para precarga en head
    const cssVars = {
        '--primary-color': color,
        '--color-primary': rgbToHex(darkerRgb),
        '--color-secondary': color,
        '--color-accent': rgbToHex(lighterRgb),
        '--header-gradient': gradient
    };
    localStorage.setItem('cmn_css_vars', JSON.stringify(cssVars));
}
```

**Pros:**
- **Elimina el flash completamente** para visitas posteriores a la primera.
- El browser aplica los colores antes de pintar, sin ningún reflow visible.
- Funciona también offline.

**Contras:**
- Requiere modificar el HTML (`index.html`) y el JS.
- Las imágenes (header/footer) siguen cargando async, el flash de imagen puede persistir (ver Opción C).
- Primera visita sin cache sigue teniendo el flash.

---

#### Opción C — Ocultar el body hasta que los estilos estén listos

Mientras se cargan los estilos, el body permanece invisible. Una vez aplicados, se muestra con una transición suave.

**En CSS (`styles.css`):**
```css
body {
    visibility: hidden;
    opacity: 0;
    transition: opacity 0.2s ease;
}
body.estilos-listos {
    visibility: visible;
    opacity: 1;
}
```

**En `config-loader.js`, al final de `applyConfiguration()`:**
```js
function applyConfiguration(config) {
    // ... lógica existente ...
    
    // Marcar estilos como listos
    document.body.classList.add('estilos-listos');
}
```

**Pros:**
- No hay flash visible, el usuario ve la página ya con los estilos correctos.
- Simple de implementar.

**Contras:**
- El usuario ve una **pantalla en blanco** (~300-800ms en primera visita) en lugar del flash. Puede percibirse como lentitud.
- Para usuarios con cache, el delay es mínimo (localStorage es síncrono).
- Podría combinarse con un skeleton/spinner para mejorar la percepción.

---

#### Opción D — Reducir el TTL de sessionStorage o usar localStorage

El cache actual usa `sessionStorage` con 24h de TTL. `sessionStorage` se borra al cerrar la pestaña/app. En móviles, las apps del browser se cierran frecuentemente, lo que hace que el cache sea ineficaz.

Cambiar a `localStorage` con TTL de 4-6 horas:

```js
// En config-loader.js
const CACHE_KEY = 'cmn_config_cache';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas

// getFromCache: cambiar sessionStorage → localStorage
localStorage.getItem(CACHE_KEY);
// saveToCache: cambiar sessionStorage → localStorage
localStorage.setItem(CACHE_KEY, ...);
```

**Pros:**
- El cache persiste entre sesiones del browser móvil.
- Reducir el flash en la primera visita del día de un usuario recurrente.

**Contras:**
- Solo soluciona el flash para usuarios recurrentes, no la primera visita.
- Combinarlo con Opción A o B es necesario para resultados visibles.

---

### Recomendación para Problema 2

Implementar en este orden (cada una suma sobre la anterior):

| Prioridad | Opción | Esfuerzo | Impacto | Estado |
|-----------|--------|----------|---------|--------|
| 1 | **Opción A** — Aplicar cache inmediatamente, verificar en background | Bajo | Alto para usuarios recurrentes | ✅ Implementado |
| 2 | **Opción D** — Cambiar sessionStorage a localStorage | Muy bajo | Medio (más hits de cache en móvil) | Pendiente |
| 3 | **Opción B** — Script inline en `<head>` con CSS vars | Medio | Muy alto (elimina flash completamente) | Pendiente |
| 4 | **Opción C** — Ocultar body hasta estilos listos | Bajo | Complemento de B para imágenes | Pendiente |

---

## Resumen Ejecutivo

| # | Problema | Causa | Solución Recomendada | Archivos Afectados | Estado |
|---|----------|-------|----------------------|--------------------|--------|
| 1 | Evento activo desactualizado en celu | Cache localStorage 30 min, sin invalidación cross-device | onSnapshot en tiempo real + TTL 2 min como parche | `js/firebase-db.js`, `js/main-dni-optimized.js` | ✅ Opción A (TTL 2 min) |
| 2 | Flash de estilos por defecto al entrar | Config se aplica después de Firebase async, siempre espera | Aplicar cache inmediato + script inline en head | `js/config-loader.js`, `index.html` | ✅ Opción A (cache inmediato) |

---

*Documento generado para decisión técnica — Casino Magic / Sistema APE 2026*
