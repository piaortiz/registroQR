# 🚀 Guía de Deployment a Vercel

## ✅ Estado del Proyecto

Todos los archivos han sido preparados y subidos a GitHub:
- Repositorio: https://github.com/piaortiz/registroQR
- Commit: `feat: Preparación completa para deploy en Vercel`
- Archivos de configuración: ✅ vercel.json, package.json, .vercelignore

---

## Opción 1: Deploy desde GitHub (RECOMENDADO)

Esta es la forma más sencilla y automática. Vercel se conectará a tu repositorio de GitHub y hará deploy automático en cada push.

### Pasos:

1. **Acceder a Vercel**
   - Ir a https://vercel.com
   - Hacer login con tu cuenta de GitHub

2. **Importar Proyecto**
   - Click en "Add New..." → "Project"
   - Buscar `piaortiz/registroQR` en la lista de repositorios
   - Click en "Import"

3. **Configurar Proyecto**
   - **Project Name**: `registro-qr-casino-magic` (o el nombre que prefieras)
   - **Framework Preset**: Other (es un sitio estático)
   - **Root Directory**: `./` (dejar por defecto)
   - **Build Command**: dejar vacío (no requiere build)
   - **Output Directory**: `./` (dejar por defecto)

4. **Variables de Entorno (OPCIONAL)**
   - No son necesarias porque las credenciales de Firebase están en el código
   - Las reglas de seguridad de Firestore protegen la base de datos

5. **Deploy**
   - Click en "Deploy"
   - Esperar 1-2 minutos mientras Vercel hace el deployment
   - ¡Listo! Vercel te dará una URL como `https://registro-qr-casino-magic.vercel.app`

### Ventajas de este método:
- ✅ Deploy automático en cada push a GitHub
- ✅ Preview deployments para cada PR
- ✅ Rollback fácil a versiones anteriores
- ✅ Dominio HTTPS gratuito
- ✅ CDN global automático

---

## Opción 2: Deploy desde CLI

Si prefieres usar la línea de comandos:

### Pasos:

1. **Abrir PowerShell o Terminal**
   ```powershell
   cd "c:\Users\ortizp.CASINOMAGIC\OneDrive - CASINO MAGIC NEUQUEN SA\Sistemas\Infraestructura\Proyecto APE 2026\REGISTRO QR PERSONALIZABLE\registroQR"
   ```

2. **Ejecutar Vercel CLI**
   ```powershell
   vercel
   ```

3. **Responder preguntas** (presionar Enter para valores por defecto):
   - **Set up and deploy?** → Y (Yes)
   - **Which scope?** → Seleccionar tu cuenta personal
   - **Link to existing project?** → N (No, es un proyecto nuevo)
   - **What's your project's name?** → `registro-qr` (o el que prefieras)
   - **In which directory is your code located?** → `.` (punto, directorio actual)

4. **Esperar el deploy**
   - Vercel subirá todos los archivos
   - Te dará una URL de preview: `https://registro-qr-xxxxx.vercel.app`

5. **Deploy a Producción** (opcional)
   ```powershell
   vercel --prod
   ```
   - Esto crea el deployment en tu dominio principal de producción

---

## 🔧 Después del Deploy

### 1. Verificar Funcionalidad
- [ ] La página principal carga correctamente
- [ ] Las imágenes de header/footer se ven bien
- [ ] El formulario de registro funciona
- [ ] El admin panel carga (admin.html)
- [ ] La personalización funciona (cambiar color primario, subir imágenes)

### 2. Configurar Dominio Personalizado (Opcional)
1. En Vercel, ir a Project Settings → Domains
2. Agregar tu dominio personalizado (ej: `registro.casinomagic.com.ar`)
3. Seguir las instrucciones para configurar DNS

### 3. Configurar CORS en Firebase (si hay errores)
Si ves errores de CORS al cargar imágenes desde Firebase Storage:

```bash
# Crear archivo cors.json
{
  "origin": ["https://tu-dominio.vercel.app"],
  "method": ["GET", "HEAD"],
  "maxAgeSeconds": 3600
}

# Aplicar configuración
gsutil cors set cors.json gs://cmn-registrosqr.firebasestorage.app
```

---

## 📊 Monitoreo y Analytics

### Vercel Analytics (Incluido en plan gratuito)
- Ver en Dashboard de Vercel
- Métricas de performance
- Requests por página
- Errors y 404s

### Firebase Analytics
- Ya configurado en el proyecto (measurementId: G-27V3ZM9FYC)
- Ver en Firebase Console → Analytics

---

## 🔐 Seguridad Post-Deploy

### Verificar:
1. **Firestore Rules**: Solo usuarios autenticados pueden escribir
2. **Storage Rules**: Solo admins pueden subir imágenes (2MB max)
3. **HTTPS**: Vercel provee SSL/TLS automático
4. **Headers de Seguridad**: Configurados en vercel.json
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection: 1; mode=block

---

## 🐛 Troubleshooting

### Error: "Failed to load resource"
- Verificar que Firebase Storage tenga las imágenes
- Verificar que storage.rules permita lectura pública

### Error: "Permission denied" en Firestore
- Verificar que el usuario esté autenticado en admin panel
- Verificar firestore.rules

### Personalización no se aplica
1. Verificar que existe el documento `configuracion/estilos` en Firestore
2. Abrir DevTools → Console para ver errores
3. Verificar que config-loader.js se cargó correctamente

### Deploy falla en Vercel
- Verificar que vercel.json tiene sintaxis JSON válida
- Verificar que no haya archivos conflictivos en .vercelignore
- Revisar logs en Vercel Dashboard

---

## 📞 Soporte

**Vercel:**
- Documentación: https://vercel.com/docs
- Status: https://vercel-status.com
- Soporte: https://vercel.com/support

**Firebase:**
- Documentación: https://firebase.google.com/docs
- Status: https://status.firebase.google.com
- Soporte: Firebase Console → Contact Support

---

## 🎯 Próximos Pasos

1. ✅ Código subido a GitHub
2. ⏳ **HACER DEPLOY A VERCEL** (seguir Opción 1 o 2)
3. ⏳ Verificar funcionalidad en URL de producción
4. ⏳ Configurar dominio personalizado (opcional)
5. ⏳ Hacer pruebas end-to-end
6. ⏳ Capacitar equipo en uso del admin panel

---

**Última actualización:** 3 de marzo de 2026  
**Repositorio:** https://github.com/piaortiz/registroQR  
**Proyecto Firebase:** cmn-registrosqr
