/**
 * Config Loader - Módulo de Carga de Configuración
 * Sistema de Registro QR - Casino Magic
 * 
 * Carga la configuración de personalización desde Firebase
 * y la aplica dinámicamente al sitio
 */

(function() {
    'use strict';

    // Configuración del cache
    const CACHE_KEY = 'cmn_config_cache';
    const CACHE_TTL = 60 * 60 * 1000; // 1 hora en milisegundos

    // Configuración predeterminada (fallback)
    const defaultConfig = {
        primaryColor: '#161337',
        headerImage: 'img/Heather.png',
        footerImage: 'img/Pie blanco.png'
    };

    /**
     * Obtener configuración del cache
     */
    function getFromCache() {
        try {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();

            // Verificar si el cache expiró
            if (now - data.timestamp > CACHE_TTL) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }

            return data.config;
        } catch (error) {
            console.warn('Error leyendo cache:', error);
            return null;
        }
    }

    /**
     * Guardar configuración en cache
     */
    function saveToCache(config) {
        try {
            const data = {
                config: config,
                timestamp: Date.now()
            };
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('Error guardando cache:', error);
        }
    }

    /**
     * Cargar configuración desde Firebase
     */
    async function loadConfigFromFirebase() {
        try {
            // Verificar si Firebase está inicializado
            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                console.warn('Firebase no inicializado, usando configuración predeterminada');
                return defaultConfig;
            }

            const db = firebase.firestore();
            const doc = await db.collection('configuracion').doc('estilos').get();

            if (doc.exists) {
                const config = doc.data();
                console.log('✅ Configuración cargada desde Firebase');
                return {
                    primaryColor: config.primaryColor || defaultConfig.primaryColor,
                    headerImage: config.headerImage || defaultConfig.headerImage,
                    footerImage: config.footerImage || defaultConfig.footerImage
                };
            } else {
                console.log('ℹ️ No hay configuración personalizada, usando predeterminada');
                return defaultConfig;
            }
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
            return defaultConfig;
        }
    }

    /**
     * Aplicar color primario
     */
    function applyPrimaryColor(color) {
        try {
            // Aplicar variable CSS
            document.documentElement.style.setProperty('--primary-color', color);
            
            // Aplicar a elementos específicos si existen
            const buttons = document.querySelectorAll('button[type="submit"], .btn-primary');
            buttons.forEach(btn => {
                btn.style.backgroundColor = color;
            });

            console.log('✅ Color primario aplicado:', color);
        } catch (error) {
            console.error('Error aplicando color:', error);
        }
    }

    /**
     * Aplicar imagen de header
     */
    function applyHeaderImage(imageUrl) {
        try {
            // Buscar elemento del header
            const headerImg = document.getElementById('logoHeaderImg');
            const header = document.querySelector('.header');

            if (headerImg) {
                headerImg.src = imageUrl;
                headerImg.onerror = function() {
                    console.warn('Error cargando imagen header, usando predeterminada');
                    this.src = defaultConfig.headerImage;
                };
            }

            if (header) {
                // Si quieres aplicar como background también
                // header.style.backgroundImage = `url(${imageUrl})`;
            }

            console.log('✅ Header image aplicada');
        } catch (error) {
            console.error('Error aplicando header:', error);
        }
    }

    /**
     * Aplicar imagen de footer
     */
    function applyFooterImage(imageUrl) {
        try {
            // Buscar elementos del footer
            const footerImgs = document.querySelectorAll('.footer img, #logoFooterImg, .logo-image');
            
            footerImgs.forEach(img => {
                if (img.alt && img.alt.toLowerCase().includes('footer')) {
                    img.src = imageUrl;
                    img.onerror = function() {
                        console.warn('Error cargando imagen footer, usando predeterminada');
                        this.src = defaultConfig.footerImage;
                    };
                }
            });

            console.log('✅ Footer image aplicada');
        } catch (error) {
            console.error('Error aplicando footer:', error);
        }
    }

    /**
     * Aplicar configuración completa
     */
    function applyConfiguration(config) {
        if (!config) {
            console.warn('No hay configuración para aplicar');
            return;
        }

        // Aplicar cada elemento de la configuración
        if (config.primaryColor) {
            applyPrimaryColor(config.primaryColor);
        }

        if (config.headerImage) {
            applyHeaderImage(config.headerImage);
        }

        if (config.footerImage) {
            applyFooterImage(config.footerImage);
        }
    }

    /**
     * Inicializar - Función principal
     */
    async function init() {
        console.log('🎨 Iniciando carga de configuración...');

        try {
            // Intentar cargar desde cache primero
            let config = getFromCache();

            if (config) {
                console.log('📦 Usando configuración desde cache');
                applyConfiguration(config);
            } else {
                console.log('🔄 Cargando configuración desde Firebase...');
                config = await loadConfigFromFirebase();
                saveToCache(config);
                applyConfiguration(config);
            }

        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            // Aplicar configuración predeterminada
            applyConfiguration(defaultConfig);
        }
    }

    /**
     * Recargar configuración (forzar desde Firebase)
     */
    async function reload() {
        console.log('🔄 Recargando configuración...');
        sessionStorage.removeItem(CACHE_KEY);
        await init();
    }

    /**
     * Limpiar cache
     */
    function clearCache() {
        sessionStorage.removeItem(CACHE_KEY);
        console.log('🗑️ Cache limpiado');
    }

    // Exportar API pública
    window.ConfigLoader = {
        init: init,
        reload: reload,
        clearCache: clearCache,
        getDefaultConfig: () => ({ ...defaultConfig })
    };

    // Auto-inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM ya está listo
        init();
    }

})();
