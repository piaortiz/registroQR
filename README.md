# Sistema de Registro QR Personalizable

Sistema web para registro de visitantes mediante códigos QR con interfaz personalizable y panel de administración.

**Desarrollado por:** Mariapia Ortiz para Casino Magic SA

---

## 📋 Características

- ✅ Registro de visitantes con formulario optimizado
- ✅ Generación y lectura de códigos QR
- ✅ Panel de administración completo
- ✅ Interfaz personalizable (colores, imágenes)
- ✅ Base de datos en tiempo real con Firebase
- ✅ Exportación de registros a CSV
- ✅ Diseño responsive para tablets y móviles
- ✅ Modo offline con sincronización

---

## 🚀 Inicio Rápido

### Requisitos Previos

- Cuenta de Firebase (plan Blaze para Storage)
- Python 3.x (para servidor local)
- Git

### Instalación Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/piaortiz/registroQR.git
   cd registroQR
   ```

2. **Configurar Firebase**
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales de Firebase
   ```

3. **Iniciar servidor local**
   ```bash
   python -m http.server 8000
   ```

4. **Abrir en el navegador**
   ```
   http://localhost:8000
   ```

---

## 📁 Estructura del Proyecto

```
registroQR/
├── css/                    # Estilos
│   ├── styles.css         # Estilos principales
│   └── admin.css          # Estilos del panel admin
├── js/                     # Scripts
│   ├── main-dni-optimized.js     # Lógica principal
│   ├── firebase-config.js        # Configuración Firebase
│   ├── firebase-db.js            # Operaciones BD
│   ├── firebase-admin.js         # Panel admin
│   ├── config.js                 # Configuración general
│   └── close-page.js             # Utilidades
├── img/                    # Imágenes de la UI
│   ├── Heather.png        # Header
│   ├── Pie blanco.png     # Footer 1
│   ├── Pie sorteo BW-02.png     # Footer 2
│   └── archive/           # Imágenes no utilizadas
├── docs/                   # Documentación
│   ├── images/            # Diagramas y capturas
│   └── *.md               # Guías y manuales
├── tests/                  # Archivos de prueba
├── backend/                # Lógica del servidor
├── index.html             # Página principal
├── admin.html             # Panel de administración
├── firebase.json          # Configuración Firebase
├── firestore.rules        # Reglas de seguridad
├── .env.example           # Plantilla de variables
├── generar_qr.py          # Generador de QR
└── README.md              # Este archivo
```

---

## 🔧 Configuración

### Variables de Entorno

Crear archivo `.env` con:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/...
```

### Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilitar Firestore Database
3. Habilitar Firebase Storage
4. Habilitar Authentication (Email/Password)
5. Configurar reglas de seguridad

---

## 📚 Documentación

- [Guía de Despliegue](docs/GUIA_DEPLOY.md)
- [Guía de Administración](docs/GUIA_ADMIN.md)
- [Guía de Soporte](docs/GUIA_SOPORTE.md)
- [Base de Datos Firebase](docs/FIREBASE_DATABASE.md)
- [Lista de Tareas](TAREAS.md)

---

## 🚢 Deployment

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

Ver [Guía de Deployment](docs/GUIA_DEPLOY.md) para más detalles.

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

---

## 🛠️ Desarrollo

### Estructura de Código

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Firebase (Firestore, Storage, Auth)
- **Backup**: Google Apps Script (Sheets)

### Testing

Los archivos de prueba están en `/tests/`:
- `test-firebase.html` - Prueba de conexión Firebase
- `test-mobile-functionality.html` - Prueba responsive
- `quick-test.html` - Pruebas rápidas

---

## 📄 Licencia

Ver archivo [LICENSE](LICENSE)

---

## 👥 Soporte

Para reportar problemas o solicitar características, contactar a:
- **Desarrollador**: Mariapia Ortiz
- **Empresa**: Casino Magic SA

---

## 📝 Changelog

### v1.0.0 (2026-03-03)
- Estructura inicial del proyecto
- Sistema de registro QR
- Panel de administración básico
- Integración con Firebase