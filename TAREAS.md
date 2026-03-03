# Plan de Tareas - Sistema Registro QR

## 🚀 Fase 1: Preparación para Vercel

### 1.1 Archivos de Configuración
- [ ] Crear `vercel.json` con configuración de deployment
- [ ] Crear `package.json` con scripts básicos
- [ ] Actualizar `.gitignore` para excluir archivos innecesarios
- [ ] Crear `.env.example` con todas las variables necesarias

### 1.2 Variables de Entorno
- [ ] Documentar todas las variables de Firebase necesarias
- [ ] Configurar variables en Vercel Dashboard
- [ ] Validar que no haya credenciales hardcodeadas

### 1.3 Testing Pre-deployment
- [ ] Probar build local
- [ ] Verificar rutas y assets
- [ ] Validar configuración de Firebase en producción

---

## 🔥 Fase 2: Base de Datos Firebase

### 2.1 Revisión de Estructura Actual
- [ ] Analizar colección `registros` existente
- [ ] Documentar campos y tipos de datos
- [ ] Identificar índices necesarios

### 2.2 Nueva Colección: Configuración
- [ ] Crear colección `configuracion` en Firestore
- [ ] Crear documento `estilos` con campos:
  - `headerImage` (string/URL)
  - `footerImage` (string/URL)
  - `primaryColor` (string/HEX)
  - `updatedAt` (timestamp)
  - `updatedBy` (string)

### 2.3 Firebase Storage
- [ ] Configurar carpeta `configuracion/` en Storage
- [ ] Actualizar reglas de Storage para permitir uploads
- [ ] Definir límites de tamaño (2MB por imagen)

### 2.4 Firestore Rules
- [ ] Actualizar `firestore.rules` para colección configuración
- [ ] Añadir permisos de lectura pública para estilos
- [ ] Restringir escritura solo a usuarios autenticados

### 2.5 Documentación
- [ ] Crear `docs/FIREBASE_DATABASE.md` con:
  - Estructura de colecciones
  - Ejemplos de consultas
  - Reglas de seguridad
  - Guía de uso de Storage

---

## 🎨 Fase 3: Panel de Administración Mejorado

### 3.1 Estructura HTML
- [ ] Crear sistema de tabs (Registros, Personalización, Estadísticas)
- [ ] Diseñar formulario de personalización
- [ ] Añadir previews en tiempo real
- [ ] Mantener funcionalidad existente de registros

### 3.2 Formulario de Personalización
- [ ] Input para imagen de header
- [ ] Input para imagen de footer
- [ ] Selector de color primario (color picker + input text)
- [ ] Vista previa en vivo
- [ ] Botón "Guardar Cambios"
- [ ] Botón "Restaurar Predeterminado"

### 3.3 Funcionalidades JavaScript
- [ ] Preview de imágenes antes de subir
- [ ] Validación de tamaño de archivo (max 2MB)
- [ ] Validación de formato de imagen (jpg, png)
- [ ] Upload a Firebase Storage
- [ ] Guardar URLs en Firestore
- [ ] Feedback visual al usuario (success/error)

### 3.4 Tab de Estadísticas
- [ ] Mostrar total de registros
- [ ] Registros del día actual
- [ ] Registros de la semana
- [ ] Registros del mes
- [ ] Gráficos básicos (opcional)

### 3.5 Estilos CSS
- [ ] Diseño responsive para admin panel
- [ ] Estilos para tabs
- [ ] Cards de estadísticas
- [ ] Preview containers
- [ ] Estados hover/active/disabled

---

## 🔗 Fase 4: Integración Frontend

### 4.1 Módulo Config Loader
- [ ] Crear `js/config-loader.js`
- [ ] Función para cargar configuración desde Firestore
- [ ] Aplicar color primario vía CSS variables
- [ ] Reemplazar imágenes de header/footer
- [ ] Cache de configuración en sessionStorage

### 4.2 Actualizar index.html
- [ ] Importar módulo config-loader
- [ ] Inicializar carga de configuración al inicio
- [ ] Actualizar CSS para usar `var(--primary-color)`
- [ ] Fallback a valores predeterminados

### 4.3 Actualizar Estilos
- [ ] Convertir colores hardcodeados a variables CSS
- [ ] Asegurar que todos los botones/links usen color primario
- [ ] Testing de contraste y accesibilidad

---

## 📚 Fase 5: Documentación

### 5.1 README Principal
- [ ] Descripción del proyecto
- [ ] Características principales
- [ ] Requisitos previos
- [ ] Instrucciones de instalación local
- [ ] Instrucciones de deployment en Vercel
- [ ] Configuración de Firebase
- [ ] Screenshots

### 5.2 Documentación Técnica
- [ ] `docs/FIREBASE_DATABASE.md` - Estructura de datos
- [ ] `docs/DEPLOYMENT.md` - Guía de deployment
- [ ] `docs/CUSTOMIZATION.md` - Guía de personalización
- [ ] `docs/DEVELOPMENT.md` - Guía para desarrolladores

### 5.3 Guía de Usuario
- [ ] Manual de uso del panel de administración
- [ ] Cómo personalizar la apariencia
- [ ] Cómo exportar registros
- [ ] Solución de problemas comunes

---

## ✅ Fase 6: Testing y QA

### 6.1 Testing Funcional
- [ ] Probar registro de visitantes
- [ ] Probar export a CSV
- [ ] Probar upload de imágenes
- [ ] Probar cambio de color
- [ ] Probar estadísticas

### 6.2 Testing de Seguridad
- [ ] Validar reglas de Firestore
- [ ] Validar reglas de Storage
- [ ] Probar acceso sin autenticación
- [ ] Verificar que .env no esté en git

### 6.3 Testing de UI/UX
- [ ] Responsive en mobile
- [ ] Responsive en tablet
- [ ] Responsive en desktop
- [ ] Accesibilidad (colores, contraste)
- [ ] Velocidad de carga

### 6.4 Testing en Producción
- [ ] Deploy a ambiente de staging
- [ ] Pruebas end-to-end
- [ ] Validar variables de entorno
- [ ] Deploy a producción

---

## 🎯 Prioridades

### Alta Prioridad (Esta Semana)
1. Crear archivos para Vercel (vercel.json, package.json)
2. Nuevo admin.html con tabs y personalización
3. Crear config-loader.js
4. Actualizar firestore.rules y storage.rules
5. Testing básico de funcionalidad

### Media Prioridad (Próxima Semana)
1. Documentación completa
2. Tab de estadísticas
3. Testing exhaustivo
4. Deploy a staging

### Baja Prioridad (Futuro)
1. Gráficos avanzados
2. Más opciones de personalización
3. Sistema de temas
4. Export en múltiples formatos

---

## 📝 Notas

- **Firebase**: Asegurarse de tener el plan Blaze para Storage
- **Vercel**: Cuenta gratuita es suficiente para este proyecto
- **Imágenes**: Considerar optimización antes de subir
- **Performance**: Implementar lazy loading para imágenes
- **Backup**: Mantener backup de configuración predeterminada

---

## 🔄 Estado Actual

- ✅ Proyecto clonado
- ✅ Servidor local corriendo
- ⏳ Tareas pendientes: Ver secciones anteriores

---

**Última actualización:** 3 de Marzo, 2026
**Desarrollado por:** Mariapia Ortiz para Casino Magic SA
