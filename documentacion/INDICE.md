# Documentación Técnica — Sistema Registro QR
## Casino Magic Neuquén SA

---

**Proyecto:** APE 2026 — Sistema de Registro QR Personalizable  
**Repositorio:** piaortiz/registroQR  
**Última actualización:** Marzo 2026

---

## Índice de Documentos

### 1. Infraestructura y Deployment
| N° | Documento | Descripción |
|----|-----------|-------------|
| 1.1 | [Deployment Vercel](1.1_DEPLOYMENT_VERCEL.md) | Configuración y deploy en Vercel |
| 1.2 | [Variables de Entorno](1.2_VARIABLES_ENTORNO.md) | Variables necesarias para producción |

### 2. Base de Datos Firebase
| N° | Documento | Descripción |
|----|-----------|-------------|
| 2.1 | [Estructura Firestore](2.1_FIRESTORE_ESTRUCTURA.md) | Colecciones, campos y tipos de datos |
| 2.2 | [Reglas de Seguridad](2.2_FIRESTORE_REGLAS.md) | Firestore Rules explicadas |
| 2.3 | [Optimización de Lecturas](2.3_OPTIMIZACION_LECTURAS.md) | Counter pattern y buenas prácticas |

### 3. Panel de Administración
| N° | Documento | Descripción |
|----|-----------|-------------|
| 3.1 | [Arquitectura Admin Panel](3.1_ADMIN_ARQUITECTURA.md) | Estructura del panel de administración |
| **3.2** | **[Documentación Técnica Cloudinary](3.2_CLOUDINARY_TECNICA.md)** | **Integración de subida de imágenes** |
| 3.3 | [Sistema de Personalización](3.3_PERSONALIZACION.md) | Flujo completo de personalización visual |

### 4. Frontend Público
| N° | Documento | Descripción |
|----|-----------|-------------|
| 4.1 | [Config Loader](4.1_CONFIG_LOADER.md) | Carga dinámica de configuración desde Firestore |
| 4.2 | [Flujo de Registro](4.2_FLUJO_REGISTRO.md) | Proceso de registro de visitante |

### 5. Guías de Uso
| N° | Documento | Descripción |
|----|-----------|-------------|
| 5.1 | [Guía de Administrador](../docs/GUIA_ADMIN.md) | Manual de uso del panel |
| 5.2 | [Referencia Rápida](../docs/REFERENCIA_RAPIDA.md) | Comandos y acciones frecuentes |

---

> Esta carpeta contiene documentación **técnica interna** orientada a desarrollo y mantenimiento.  
> Para guías de usuario final, ver la carpeta `docs/`.
