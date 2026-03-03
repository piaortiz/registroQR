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
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

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

            // Verificar si hay una versión más nueva en localStorage (admin actualizó)
            const lastUpdate = localStorage.getItem('config_updated');
            if (lastUpdate && parseInt(lastUpdate) > data.timestamp) {
                console.log('🔄 Nueva configuración disponible, actualizando...');
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
     * Convertir hex a RGB
     */
    function hexToRgb(hex) {
        // Remover el # si existe
        hex = hex.replace(/^#/, '');
        
        // Parsear los valores RGB
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        
        return { r, g, b };
    }

    /**
     * Ajustar brillo de un color RGB (factor > 1 aclara, < 1 oscurece)
     */
    function adjustBrightness(rgb, factor) {
        return {
            r: Math.min(255, Math.round(rgb.r * factor)),
            g: Math.min(255, Math.round(rgb.g * factor)),
            b: Math.min(255, Math.round(rgb.b * factor))
        };
    }

    /**
     * Convertir RGB a hex
     */
    function rgbToHex(rgb) {
        return '#' + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b)
            .toString(16)
            .slice(1);
    }

    /**
     * Aplicar color primario y generar todas sus variantes
     */
    function applyPrimaryColor(color) {
        try {
            // Convertir el color a RGB
            const baseRgb = hexToRgb(color);
            
            // Generar variantes
            const darkerRgb = adjustBrightness(baseRgb, 0.75);  // 25% más oscuro
            const lighterRgb = adjustBrightness(baseRgb, 1.25); // 25% más claro
            
            // Aplicar todas las variables CSS
            const root = document.documentElement;
            
            // Colores base
            root.style.setProperty('--primary-color', color);
            root.style.setProperty('--color-primary', rgbToHex(darkerRgb));     // Oscuro
            root.style.setProperty('--color-secondary', color);                  // Base
            root.style.setProperty('--color-accent', rgbToHex(lighterRgb));     // Claro
            
            // Versiones con transparencia (10% opacidad)
            root.style.setProperty('--color-primary-light', `rgba(${darkerRgb.r}, ${darkerRgb.g}, ${darkerRgb.b}, 0.1)`);
            root.style.setProperty('--color-secondary-light', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, 0.1)`);
            root.style.setProperty('--color-accent-light', `rgba(${lighterRgb.r}, ${lighterRgb.g}, ${lighterRgb.b}, 0.1)`);

            console.log('✅ Color primario y variantes aplicados:', {
                primary: rgbToHex(darkerRgb),
                secondary: color,
                accent: rgbToHex(lighterRgb)
            });
        } catch (error) {
            console.error('Error aplicando color:', error);
        }
    }

    /**
     * Aplicar imagen de header
     */
    function applyHeaderImage(imageUrl) {
        try {
            // Selector específico para el header
            const headerImg = document.getElementById('logoHeaderImg');

            if (headerImg) {
                // Agregar clase de loading mientras carga
                headerImg.style.opacity = '0.5';
                
                headerImg.src = imageUrl;
                
                headerImg.onload = function() {
                    this.style.opacity = '1';
                    console.log('✅ Header image cargada');
                };
                
                headerImg.onerror = function() {
                    console.warn('Error cargando imagen header, usando predeterminada');
                    this.src = defaultConfig.headerImage;
                    this.style.opacity = '1';
                };
            }
        } catch (error) {
            console.error('Error aplicando header:', error);
        }
    }

    /**
     * Aplicar imagen de footer
     */
    function applyFooterImage(imageUrl) {
        try {
            // Selector específico solo para el logo principal del footer
            const footerImg = document.getElementById('logoFooterImg');
            
            if (footerImg) {
                // Agregar clase de loading mientras carga
                footerImg.style.opacity = '0.5';
                
                footerImg.src = imageUrl;
                
                footerImg.onload = function() {
                    this.style.opacity = '1';
                    console.log('✅ Footer image cargada');
                };
                
                footerImg.onerror = function() {
                    console.warn('Error cargando imagen footer, usando predeterminada');
                    this.src = defaultConfig.footerImage;
                    this.style.opacity = '1';
                };
            }
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

    // Listener para detectar cambios desde admin (sincronización entre tabs)
    window.addEventListener('storage', (e) => {
        if (e.key === 'config_updated') {
            console.log('🔄 Configuración actualizada desde otra pestaña, recargando...');
            sessionStorage.removeItem(CACHE_KEY);
            init();
        }
    });

    // Auto-inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM ya está listo
        init();
    }

})();
