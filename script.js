// Función para manejar la eliminación de activos
async function handleDelete(assetId) {
    const modal = document.getElementById('delete-modal');
    const confirmButton = modal.querySelector('.btn-danger');
    const cancelButton = modal.querySelector('.btn-outline');

    // Mostrar el modal
    modal.style.display = 'flex';

    // Manejar la confirmación
    confirmButton.onclick = async function() {
        try {
            // Eliminar el activo de Firebase
            const db = firebase.firestore();
            await db.collection('assets').doc(assetId).delete();
            
            // También eliminar de localStorage para mantener sincronización
            let assets = JSON.parse(localStorage.getItem('assets') || '[]');
            assets = assets.filter(asset => asset.id !== assetId);
            localStorage.setItem('assets', JSON.stringify(assets));
            
            // Ocultar el modal
            modal.style.display = 'none';
            
            // Determinar si estamos en la página de gestión
            const isManagePage = window.location.pathname.includes('assets.html');
            
            // Actualizar la tabla
            updateAssetsTable(assets, '', '', isManagePage);
            
            // Actualizar las estadísticas
            await updateStatsCards();

            // Mostrar mensaje de éxito
            alert('Activo eliminado exitosamente de Firebase');
        } catch (error) {
            console.error('Error al eliminar activo de Firebase:', error);
            alert('Error al eliminar el activo: ' + error.message);
        }
    };

    // Manejar la cancelación
    cancelButton.onclick = function() {
        modal.style.display = 'none';
    };

    // Cerrar el modal al hacer clic fuera de él
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Función para manejar la edición de activos - expuesta globalmente
function handleEdit(assetId) {
    // Redirigir a la página de registro con el ID del activo
    window.location.href = `register.html?id=${assetId}`;
}

// Asegurar que handleEdit esté disponible globalmente
window.handleEdit = handleEdit;

// Función para cargar los datos del activo en el formulario
async function loadAssetData(assetId) {
    try {
        const assets = await fetchAssets();
        const asset = assets.find(a => a.id === assetId);
        
        if (!asset) {
            console.error('Activo no encontrado');
            return;
        }

        // Cargar los datos en el formulario
        const form = document.querySelector('.register-form');
        if (!form) return;

        // Establecer el tipo de activo primero para que se muestren los campos correctos
        const typeSelect = form.querySelector('#asset-type');
        if (typeSelect) {
            typeSelect.value = asset.tipo;
            typeSelect.dispatchEvent(new Event('change'));
        }

        // Mapear los campos del formulario con los datos del activo
        const fieldMappings = {
            'name': asset.nombre,
            'serial': asset.serial,
            'brand': asset.marca,
            'model': asset.modelo,
            'purchase-date': asset.fechaCompra,
            'status': asset.estado,
            'location': asset.ubicacion,
            'assigned-to': asset.asignadoA,
            'notes': asset.notas
        };

        // Establecer los valores en los campos
        Object.entries(fieldMappings).forEach(([fieldName, value]) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field && value) {
                field.value = value;
            }
        });

        // Guardar el ID del activo en un campo oculto
        let idField = form.querySelector('#asset-id');
        if (!idField) {
            idField = document.createElement('input');
            idField.type = 'hidden';
            idField.id = 'asset-id';
            form.appendChild(idField);
        }
        idField.value = assetId;

        console.log('Datos del activo cargados:', asset);
    } catch (error) {
        console.error('Error al cargar los datos del activo:', error);
    }
}

// Función para manejar el registro de nuevos activos
function handleRegister() {
    // Redirigir a la página de registro
    window.location.href = 'register.html';
}

// Función para normalizar el estado
function normalizeState(estado) {
    if (!estado) return 'disponible';
    
    const estadoLower = estado.toLowerCase().trim();
    switch (estadoLower) {
        case 'disponible':
        case 'available':
            return 'disponible';
        case 'asignado':
        case 'assigned':
            return 'asignado';
        case 'mantenimiento':
        case 'en mantenimiento':
        case 'maintenance':
            return 'mantenimiento';
        case 'fuera de uso':
        case 'fueradeuso':
        case 'out-of-use':
            return 'fueradeuso';
        default:
            return 'disponible';
    }
}

// Funciones de reportes
async function generateStatusReport() {
    console.log('[generateStatusReport] Ejecutando...');
    console.log('[generateStatusReport] Iniciando generación de reporte por estado...');
    try {
        // Obtener activos desde Firebase usando la función fetchAssets
        const assets = await fetchAssets();
        const statusCount = {};
        if (!assets || assets.length === 0) {
            showReport('Reporte por Estado', '<div style="padding:2em;text-align:center;color:#d32f2f;font-weight:bold;">No hay datos de activos registrados en el sistema.</div>');
            return;
        }

        // Contar activos por estado
        assets.forEach(asset => {
            const estado = asset.estado || 'No definido';
            statusCount[estado] = (statusCount[estado] || 0) + 1;
        });

        // Generar tabla HTML
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Estado</th>
                        <th>Cantidad</th>
                        <th>Porcentaje</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const total = assets.length;
        for (const estado in statusCount) {
            const count = statusCount[estado];
            const percentage = ((count / total) * 100).toFixed(1);
            html += `
                <tr>
                    <td><span class="${getBadgeClass(estado)}">${estado}</span></td>
                    <td>${count}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }

        html += `
                <tr class="total-row">
                    <td>Total</td>
                    <td>${total}</td>
                    <td>100%</td>
                </tr>
            </tbody>
        </table>
        `;

        showReport('Reporte por Estado', html);
        console.log('[generateStatusReport] showReport llamado.');
        
        // Formatear badges después de mostrar el reporte
        setTimeout(() => {
            formatBadgeText();
        }, 100);
    } catch (error) {
        console.error('Error al generar reporte por estado:', error);
        alert('Error al generar el reporte por estado. Intente de nuevo más tarde.'); // Se mantiene para errores reales
    }
}
window.generateStatusReport = generateStatusReport;

async function generateTypeReport() {
    console.log('[generateTypeReport] Ejecutando...');
    console.log('[generateTypeReport] Iniciando generación de reporte por tipo...');
    try {
        // Obtener activos desde Firebase usando la función fetchAssets
        const assets = await fetchAssets();
        const typeCount = {};
        if (!assets || assets.length === 0) {
            showReport('Reporte por Tipo', '<div style="padding:2em;text-align:center;color:#d32f2f;font-weight:bold;">No hay datos de activos registrados en el sistema.</div>');
            return;
        }

        // Contar activos por tipo
        assets.forEach(asset => {
            const tipo = asset.tipo || 'No definido';
            typeCount[tipo] = (typeCount[tipo] || 0) + 1;
        });

        // Generar tabla HTML
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Porcentaje</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const total = assets.length;
        for (const tipo in typeCount) {
            const count = typeCount[tipo];
            const percentage = ((count / total) * 100).toFixed(1);
            html += `
                <tr>
                    <td>${tipo}</td>
                    <td>${count}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }

        html += `
                <tr class="total-row">
                    <td>Total</td>
                    <td>${total}</td>
                    <td>100%</td>
                </tr>
            </tbody>
        </table>
        `;

        showReport('Reporte por Tipo', html);
        console.log('[generateTypeReport] showReport llamado.');
    } catch (error) {
        console.error('Error al generar reporte por tipo:', error);
        alert('Error al generar el reporte por tipo. Intente de nuevo más tarde.'); // Se mantiene para errores reales
    }
}
window.generateTypeReport = generateTypeReport;

async function generateAssignmentReport() {
    console.log('[generateAssignmentReport] Ejecutando...');
    console.log('[generateAssignmentReport] Iniciando generación de reporte de asignaciones...');
    try {
        // Obtener activos desde Firebase usando la función fetchAssets
        const assets = await fetchAssets();
        if (!assets || assets.length === 0) {
            showReport('Reporte de Asignaciones', '<div style="padding:2em;text-align:center;color:#d32f2f;font-weight:bold;">No hay datos de activos registrados en el sistema.</div>');
            return;
        }
        const assignmentCount = {
            'Asignados': 0,
            'No Asignados': 0
        };


        // Contar activos asignados y no asignados basado en el estado
        assets.forEach(asset => {
            const estado = (asset.estado || '').toLowerCase();
            if (estado === 'asignado') {
                assignmentCount['Asignados']++;
            } else if (estado === 'disponible' || estado === 'fueradeuso') {
                assignmentCount['No Asignados']++;
            }
        });

        // Generar tabla HTML
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Estado de Asignación</th>
                        <th>Cantidad</th>
                        <th>Porcentaje</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const total = assets.length;
        for (const status in assignmentCount) {
            const count = assignmentCount[status];
            const percentage = ((count / total) * 100).toFixed(1);
            html += `
                <tr>
                    <td>${status}</td>
                    <td>${count}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }

        html += `
                <tr class="total-row">
                    <td>Total</td>
                    <td>${total}</td>
                    <td>100%</td>
                </tr>
            </tbody>
        </table>
        `;

        showReport('Reporte de Asignaciones', html);
        console.log('[generateAssignmentReport] showReport llamado.');
    } catch (error) {
        console.error('Error al generar reporte de asignaciones:', error);
        alert('Error al generar el reporte de asignaciones. Intente de nuevo más tarde.'); // Se mantiene para errores reales
    }
}

function showReport(title, content) {
    console.log('[showReport] Llamado con título:', title);
    console.log('[showReport] HTML generado:', content);

    const container = document.getElementById('reportContainer');
    const titleElement = document.getElementById('reportTitle');
    const contentElement = document.getElementById('reportContent');

    if (!container || !titleElement || !contentElement) {
        console.error('[showReport] No se encontró el contenedor del reporte.\nTítulo: ' + title + '\nHTML:\n' + content);
        return;
    }
    titleElement.textContent = title;
    contentElement.innerHTML = content;
    container.style.display = 'block';
    // alert('[showReport] Reporte mostrado en pantalla: ' + title); // Eliminado para UX sin interrupciones
}
// Función para manejar el envío del formulario de registro
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        // Obtener los datos básicos del formulario
        const assetType = formData.get('asset-type');
        const asset = {
            id: document.getElementById('asset-id')?.value || generateAssetId(),
            tipo: assetType,
            nombre: formData.get('name'),
            serial: formData.get('serial'),
            marca: formData.get('brand'),
            modelo: formData.get('model'),
            fechaCompra: formData.get('purchase-date'),
            estado: formData.get('status'),
            ubicacion: formData.get('location'),
            asignadoA: formData.get('assigned-to'),
            notas: formData.get('notes'),
            fechaRegistro: new Date().toISOString()
        };
        
        // Agregar campos específicos según el tipo de activo
        if (assetType === 'hardware') {
            asset.procesador = formData.get('processor');
            asset.memoria = formData.get('memory');
            asset.almacenamiento = formData.get('storage');
            asset.garantia = formData.get('warranty');
        } else if (assetType === 'software') {
            asset.licencia = formData.get('license-key');
            asset.fechaExpiracion = formData.get('expiration-date');
            asset.version = formData.get('version');
            asset.tipoLicencia = formData.get('license-type');
        } else if (assetType === 'network') {
            asset.ip = formData.get('ip-address');
            asset.mac = formData.get('mac-address');
            asset.tipoRed = formData.get('network-type');
            asset.puertos = formData.get('ports');
        } else if (assetType === 'other') {
            asset.categoria = formData.get('category');
            asset.especificaciones = formData.get('specifications');
        }

        // Verificar si estamos en modo edición o nuevo registro
        const isEdit = !!document.getElementById('asset-id')?.value;
        
        // Obtener referencia a Firestore
        const db = firebase.firestore();
        const assetsCollection = db.collection('assets');
        
        if (isEdit) {
            // Actualizar activo existente en Firebase
            await assetsCollection.doc(asset.id).set(asset);
        } else {
            // Agregar nuevo activo a Firebase
            await assetsCollection.doc(asset.id).set(asset);
        }
        
        // También guardar en localStorage como respaldo para compatibilidad
        const assets = JSON.parse(localStorage.getItem('assets') || '[]');
        if (isEdit) {
            // Actualizar activo existente en localStorage
            const index = assets.findIndex(a => a.id === asset.id);
            if (index !== -1) {
                assets[index] = asset;
            }
        } else {
            // Agregar nuevo activo a localStorage
            assets.push(asset);
        }
        localStorage.setItem('assets', JSON.stringify(assets));
        
        alert(`Activo ${isEdit ? 'actualizado' : 'registrado'} exitosamente en Firebase`);
        
        // Redireccionar a la página principal
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Error al procesar el formulario:', error);
        alert('Error al guardar en Firebase: ' + error.message);
    }
}

// Función para obtener los activos desde Firebase
async function fetchAssets() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('assets').get();
        const assets = [];
        snapshot.forEach(doc => {
            assets.push(doc.data());
        });
        console.log('[fetchAssets] Activos obtenidos de Firebase:', assets);
        return assets;
    } catch (error) {
        console.error('[fetchAssets] Error al obtener activos desde Firebase:', error);
        return [];
    }
}

// Función auxiliar para determinar la clase del badge
function getBadgeClass(estado) {
    if (!estado) return 'badge';
    
    estado = estado.toLowerCase();
    switch(estado) {
        case 'disponible': return 'badge badge-success';
        case 'asignado': return 'badge badge-info';
        case 'mantenimiento': return 'badge badge-warning';
        case 'fuera de uso': 
        case 'fueradeuso': return 'badge badge-secondary';
        case 'dañado': 
        case 'dañado': return 'badge badge-danger';
        default: return 'badge';
    }
}

// Función para formatear el texto de los badges de 'fuera de uso'
function formatBadgeText() {
    document.querySelectorAll('.badge').forEach(badge => {
        if (badge.textContent.toLowerCase().trim() === 'fuera de uso') {
            badge.textContent = 'Fuera de Uso';
            badge.classList.add('badge-fuera-uso');
        }
    });
}

// Variable para almacenar el ID del activo actual
let currentAssetId = null;

// Función para mostrar los detalles de un activo
async function showAssetDetails(assetId) {
    currentAssetId = assetId;
    
    try {
        // Obtener el activo desde Firebase
        const db = firebase.firestore();
        const doc = await db.collection('assets').doc(assetId).get();
        
        if (!doc.exists) {
            // Si no está en Firebase, intentar encontrarlo en localStorage
            const assets = JSON.parse(localStorage.getItem('assets') || '[]');
            const asset = assets.find(a => a.id === assetId);
            
            if (!asset) {
                console.error('Activo no encontrado');
                return;
            }
            
            showAssetDetailsInModal(asset);
        } else {
            // Si existe en Firebase, usar esos datos
            const asset = doc.data();
            showAssetDetailsInModal(asset);
        }
    } catch (error) {
        console.error('Error al obtener detalles del activo:', error);
        // Intento de respaldo con localStorage
        const assets = JSON.parse(localStorage.getItem('assets') || '[]');
        const asset = assets.find(a => a.id === assetId);
        
        if (asset) {
            showAssetDetailsInModal(asset);
        }
    }
}

// Función para mostrar los detalles del activo en el modal
function showAssetDetailsInModal(asset) {
    // Mapear los campos con sus IDs en el modal
    const fieldMappings = {
        'detail-id': asset.id,
        'detail-nombre': asset.nombre,
        'detail-tipo': asset.tipo,
        'detail-serial': asset.serial,
        'detail-marca': asset.marca,
        'detail-modelo': asset.modelo,
        'detail-estado': asset.estado,
        'detail-ubicacion': asset.ubicacion || 'N/A',
        'detail-asignado': asset.asignadoA || 'N/A',
        'detail-fecha-compra': asset.fechaCompra,
        'detail-fecha-registro': new Date(asset.fechaRegistro).toLocaleDateString(),
        'detail-notas': asset.notas || 'N/A'
    };

    // Actualizar cada campo en el modal
    Object.entries(fieldMappings).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    });

    // Mostrar el modal
    const modal = document.getElementById('details-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Función para cerrar el modal de detalles
function closeDetailsModal() {
    const modal = document.getElementById('details-modal');
    if (modal) {
        modal.classList.remove('show');
        currentAssetId = null;
    }
}

// Función para actualizar la tabla de activos
function updateAssetsTable(assets, searchTerm = '', selectedType = '', selectedStatus = '', isManagePage = false) {
    console.log('Actualizando tabla con:', { assets, searchTerm, selectedType, selectedStatus, isManagePage }); // Para depuración

    // Determinar qué tabla actualizar
    let tbody;
    if (isManagePage) {
        tbody = document.querySelector('.data-table tbody');
    } else {
        tbody = document.querySelector('#recent-assets tbody');
        if (!tbody) {
            tbody = document.querySelector('.data-table tbody');
        }
    }

    if (!tbody) {
        console.error('No se encontró el tbody de la tabla');
        return;
    }

    // Asegurarse de que assets sea un array
    if (!Array.isArray(assets)) {
        console.error('Los activos no son un array:', assets);
        assets = [];
    }

    // Limpiar la tabla
    tbody.innerHTML = '';

    // Si no hay activos, mostrar mensaje
    if (assets.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="text-center">No hay activos registrados</td>
        `;
        tbody.appendChild(row);
        return;
    }

    // Filtrar activos
    let filteredAssets = assets;

    // Aplicar todos los filtros en una sola pasada
    filteredAssets = filteredAssets.filter(asset => {
        // Verificar el término de búsqueda
        const searchMatch = !searchTerm || (
            (asset.nombre && asset.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (asset.tipo && asset.tipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (asset.serial && asset.serial.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // Verificar el tipo
        const typeMatch = !selectedType || selectedType === 'all' || 
            (asset.tipo && asset.tipo.toLowerCase() === selectedType.toLowerCase());

        // Verificar el estado - asegurarse de que ambos valores estén en minúsculas
        const statusMatch = !selectedStatus || selectedStatus === 'all' || 
            (asset.estado && asset.estado.toLowerCase() === selectedStatus.toLowerCase());

        // Registrar cada filtrado para depuración
        if (!statusMatch && selectedStatus !== 'all') {
            console.log('Estado no coincide:', {
                'estado del activo': asset.estado,
                'estado seleccionado': selectedStatus,
                'coincidencia': statusMatch
            });
        }

        return searchMatch && typeMatch && statusMatch;
    });

    console.log('Activos filtrados:', filteredAssets); // Para depuración

    // Ordenar los activos por fecha de registro (más recientes primero)
    const sortedAssets = [...filteredAssets].sort((a, b) => {
        const dateA = new Date(a.fechaRegistro || a.fechaCompra);
        const dateB = new Date(b.fechaRegistro || b.fechaCompra);
        return dateB - dateA;
    });

    // Si no es la página de gestión, mostrar solo los 5 más recientes
    const displayAssets = isManagePage ? sortedAssets : sortedAssets.slice(0, 5);

    // Agregar los activos a la tabla
    displayAssets.forEach(asset => {
        const badgeClass = getBadgeClass(asset.estado);
        const row = document.createElement('tr');
        // Formatear el estado para mostrar
        let estadoMostrado = 'N/A';
        if (asset.estado) {
            switch (asset.estado.toLowerCase()) {
                case 'disponible':
                    estadoMostrado = 'Disponible';
                    break;
                case 'asignado':
                    estadoMostrado = 'Asignado';
                    break;
                case 'mantenimiento':
                    estadoMostrado = 'En Mantenimiento';
                    break;
                case 'fueradeuso':
                    estadoMostrado = 'Fuera de Uso';
                    break;
                default:
                    estadoMostrado = asset.estado;
            }
        }

        // Formatear la fecha de última actualización
        let fechaActualizacion = 'N/A';
        if (asset.ultimaActualizacion) {
            const fecha = new Date(asset.ultimaActualizacion);
            const ahora = new Date();
            const diferenciaDias = Math.floor((ahora - fecha) / (1000 * 60 * 60 * 24));
            const diferenciaHoras = Math.floor((ahora - fecha) / (1000 * 60 * 60));
            const diferenciaMinutos = Math.floor((ahora - fecha) / (1000 * 60));

            if (diferenciaMinutos < 1) {
                fechaActualizacion = 'Hace un momento';
            } else if (diferenciaMinutos < 60) {
                fechaActualizacion = `Hace ${diferenciaMinutos} min`;
            } else if (diferenciaHoras < 24) {
                fechaActualizacion = `Hace ${diferenciaHoras} h`;
            } else if (diferenciaDias === 1) {
                fechaActualizacion = 'Ayer';
            } else if (diferenciaDias < 7) {
                fechaActualizacion = `Hace ${diferenciaDias} días`;
            } else {
                // Para fechas más antiguas, mostrar formato corto
                const dia = fecha.getDate().toString().padStart(2, '0');
                const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
                const hora = fecha.getHours().toString().padStart(2, '0');
                const minutos = fecha.getMinutes().toString().padStart(2, '0');
                fechaActualizacion = `${dia}/${mes} ${hora}:${minutos}`;
            }
        }

        if (isManagePage) {
            row.innerHTML = `
                <td>${asset.id}</td>
                <td>${asset.nombre || 'N/A'}</td>
                <td>${asset.tipo || 'N/A'}</td>
                <td>${asset.serial || 'N/A'}</td>
                <td><span class="${getBadgeClass(asset.estado)}">${estadoMostrado}</span></td>
                <td>${asset.ubicacion || 'N/A'}</td>
                <td>${asset.asignadoA || 'N/A'}</td>
                <td>${fechaActualizacion}</td>
                <td>
                    <div class="action-buttons text-center">
                        <button onclick="handleEdit('${asset.id}')" class="btn-icon edit" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="handleDelete('${asset.id}')" class="btn-icon delete" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>`;
        } else {
            row.innerHTML = `
                <td>${asset.nombre}</td>
                <td>${asset.tipo}</td>
                <td><span class="${getBadgeClass(asset.estado)}">${estadoMostrado}</span></td>
                <td>${asset.ubicacion || 'N/A'}</td>
                <td>${asset.asignadoA || 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <a href="#" class="btn-icon" onclick="handleEdit('${asset.id}')"><i class="fas fa-edit"></i></a>
                        <a href="#" class="btn-icon delete" onclick="handleDelete('${asset.id}')"><i class="fas fa-trash"></i></a>
                    </div>
                </td>
            `;
        }
        // Agregar evento click a la fila para mostrar detalles
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
            // No mostrar detalles si se hizo clic en un botón de acción
            const clickedButton = e.target.closest('.btn-icon');
            const clickedActions = e.target.closest('.action-buttons');
            
            if (!clickedButton && !clickedActions) {
                showAssetDetails(asset.id);
            }
        });

        // Agregar eventos específicos para los botones
        const editButton = row.querySelector('.btn-icon:not(.delete)');
        const deleteButton = row.querySelector('.btn-icon.delete');

        if (editButton) {
            editButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Evitar que el evento llegue a la fila
                handleEdit(asset.id);
            });
        }

        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Evitar que el evento llegue a la fila
                handleDelete(asset.id);
            });
        }
        tbody.appendChild(row);
    });

    console.log('Tabla actualizada con', displayAssets.length, 'activos'); // Para depuración
}

// Función para generar un ID único para el activo
function generateAssetId() {
    const prefix = 'A';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
}

// Función para aplicar todos los filtros
async function applyFilters() {
    try {
        const searchInput = document.querySelector('#search-input');
        const typeFilter = document.querySelector('#type-filter');
        const statusFilter = document.querySelector('#status-filter');

        const searchTerm = searchInput ? searchInput.value : '';
        const selectedType = typeFilter ? typeFilter.value : '';
        const selectedStatus = statusFilter ? statusFilter.value : '';

        console.log('Aplicando filtros:', {
            searchTerm,
            selectedType,
            selectedStatus
        });

        const assets = await fetchAssets();
        console.log('Assets antes de filtrar:', assets);

        updateAssetsTable(assets, searchTerm, selectedType, selectedStatus, true);
    } catch (error) {
        console.error('Error al aplicar filtros:', error);
    }
}

// Función para manejar el filtro por tipo
function handleTypeFilter(event) {
    applyFilters();
}

// Función para manejar el filtro por estado
function handleStatusFilter(event) {
    applyFilters();
}

// Función para manejar la gestión de activos
function handleManage() {
    // Redirigir a la página de activos
    window.location.href = 'assets.html';
}

// Función para manejar la generación de reportes
function handleReports() {
    // Redirigir a la página de reportes
    window.location.href = 'reports.html';
}

// Función para inicializar los eventos
function initializeEvents() {
    // Agregar manejadores de eventos para los botones principales
    const btnRegister = document.querySelector('#btn-register');
    if (btnRegister) {
        btnRegister.addEventListener('click', handleRegister);
    }

    const btnManage = document.querySelector('#btn-manage');
    if (btnManage) {
        btnManage.addEventListener('click', handleManage);
    }

    const btnReports = document.querySelector('#btn-reports');
    if (btnReports) {
        btnReports.addEventListener('click', handleReports);
    }

    // Agregar manejador para el buscador
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
}
async function calculateAssetStats() {
    const assets = await fetchAssets();
    
    const stats = {
        hardware: { count: 0 },
        software: { count: 0 },
        network: { count: 0 },
        other: { count: 0 }
    };

    // Contar activos actuales por tipo
    assets.forEach(asset => {
        const type = asset.tipo.toLowerCase();
        switch(type) {
            case 'hardware':
                stats.hardware.count++;
                break;
            case 'software':
                stats.software.count++;
                break;
            case 'redes':
            case 'network':
                stats.network.count++;
                break;
            default:
                stats.other.count++;
                break;
        }
    });

    // Obtener conteos anteriores del localStorage
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previousMonthKey = `stats_${previousMonth.getFullYear()}_${previousMonth.getMonth() + 1}`;
    
    let previousStats = JSON.parse(localStorage.getItem(previousMonthKey));
    
    if (!previousStats) {
        // Si no hay estadísticas anteriores, usar los valores actuales
        previousStats = {
            hardware: stats.hardware.count,
            software: stats.software.count,
            network: stats.network.count,
            other: stats.other.count
        };
    }

    // Actualizar conteos anteriores
    stats.hardware.previousCount = previousStats.hardware;
    stats.software.previousCount = previousStats.software;
    stats.network.previousCount = previousStats.network;
    stats.other.previousCount = previousStats.other;

    // Guardar estadísticas actuales
    const currentMonthKey = `stats_${new Date().getFullYear()}_${new Date().getMonth() + 1}`;
    localStorage.setItem(currentMonthKey, JSON.stringify({
        hardware: stats.hardware.count,
        software: stats.software.count,
        network: stats.network.count,
        other: stats.other.count
    }));

    return stats;
}

// Función para actualizar las estadísticas en las tarjetas
async function updateStatsCards() {
    const stats = await calculateAssetStats();

    // Actualizar tarjeta de Hardware
    const hardwareCard = document.querySelector('.stat-card:nth-child(1)');
    if (hardwareCard) {
        const count = stats.hardware.count;
        hardwareCard.querySelector('.stat-value').textContent = count;
        const changeElement = hardwareCard.querySelector('.stat-change');
        if (changeElement) {
            changeElement.style.display = 'none';
        }
    }

    // Actualizar tarjeta de Software
    const softwareCard = document.querySelector('.stat-card:nth-child(2)');
    if (softwareCard) {
        const count = stats.software.count;
        softwareCard.querySelector('.stat-value').textContent = count;
        const changeElement = softwareCard.querySelector('.stat-change');
        if (changeElement) {
            changeElement.style.display = 'none';
        }
    }

    // Actualizar tarjeta de Redes
    const networkCard = document.querySelector('.stat-card:nth-child(3)');
    if (networkCard) {
        const count = stats.network.count;
        networkCard.querySelector('.stat-value').textContent = count;
        const changeElement = networkCard.querySelector('.stat-change');
        if (changeElement) {
            changeElement.style.display = 'none';
        }
    }

    // Actualizar tarjeta de Otros Activos
    const otherCard = document.querySelector('.stat-card:nth-child(4)');
    if (otherCard) {
        const count = stats.other.count;
        otherCard.querySelector('.stat-value').textContent = count;
        const changeElement = otherCard.querySelector('.stat-change');
        if (changeElement) {
            changeElement.style.display = 'none';
        }
    }
}

// Función para manejar la búsqueda de activos
async function handleSearch(event) {
    const searchTerm = event.target.value;
    const assets = await fetchAssets();
    const isManagePage = window.location.pathname.includes('assets.html');
    updateAssetsTable(assets, searchTerm, '', '', isManagePage);
}

// Inicializar los eventos cuando el DOM esté cargado
// --- SISTEMA DE USUARIOS Y AUTENTICACIÓN ---

// Guardar usuario logueado en localStorage
// Eliminado: ahora toda la gestión de usuario se hace con Firebase Auth.

// Eliminado: ahora toda la gestión de usuario se hace con Firebase Auth.

// Nueva función de logout solo con Firebase Auth
function logoutUser() {
    firebase.auth().signOut().then(function() {
        window.location.href = 'login.html';
    });
}

// Registrar nuevo usuario
function registerUser(username, password, role) {
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(u => u.username === username)) {
        return { success: false, message: 'El usuario ya existe.' };
    }
    users.push({ username, password, role });
    localStorage.setItem('users', JSON.stringify(users));
    return { success: true };
}

// Login de usuario
// Eliminado: ahora toda la gestión de usuario se hace con Firebase Auth.

// Proteger páginas que requieren login
// Nueva función de protección de rutas solo con Firebase Auth
function requireAuth(roles = []) {
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = 'login.html';
            return false;
        }
        // Si se requieren roles, deberías guardar el rol en el perfil de usuario de Firebase
        // y consultarlo aquí. Por ahora, solo chequea autenticación.
        return true;
    });
}
// --- GESTIÓN DE USUARIOS Y PERMISOS ---
function getAllUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

function setAllUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

function updateUserRole(username, newRole) {
    let users = getAllUsers();
    users = users.map(u => u.username === username ? { ...u, role: newRole } : u);
    setAllUsers(users);
}

function setUserBanned(username, banned) {
    let users = getAllUsers();
    users = users.map(u => u.username === username ? { ...u, banned: banned } : u);
    setAllUsers(users);
}

function deleteUser(username) {
    let users = getAllUsers();
    users = users.filter(u => u.username !== username);
    setAllUsers(users);
}

function renderUsersTable() {
    const tableBody = document.querySelector('#users-table tbody');
    if (!tableBody) return;
    const users = getAllUsers();
    const currentUser = getCurrentUser();
    tableBody.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>
                <select class="role-select" data-username="${user.username}" ${currentUser.role !== 'admin' || user.username === currentUser.username ? 'disabled' : ''}>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="operario" ${user.role === 'operario' ? 'selected' : ''}>Moderador</option>
                </select>
            </td>
            <td>
                ${user.banned ? '<span class="badge badge-danger">Baneado</span>' : '<span class="badge badge-success">Activo</span>'}
            </td>
            <td>
                ${currentUser.role === 'admin' && user.username !== currentUser.username ? `<button class="btn btn-outline btn-sm delete-user" data-username="${user.username}"><i class="fas fa-trash"></i></button>` : ''}
                ${user.role !== 'admin' && user.username !== currentUser.username ?
                    (user.banned ? `<button class="btn btn-primary btn-sm unban-user" data-username="${user.username}">Desbanear</button>` : `<button class="btn btn-danger btn-sm ban-user" data-username="${user.username}">Banear</button>`) : ''}
            </td>
        `;
        tableBody.appendChild(tr);
    });
    // Eventos para cambio de rol
    document.querySelectorAll('.role-select').forEach(sel => {
        sel.addEventListener('change', function() {
            const username = this.getAttribute('data-username');
            const newRole = this.value;
            updateUserRole(username, newRole);
            renderUsersTable();
        });
    });
    // Eventos para banear/desbanear
    document.querySelectorAll('.ban-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            setUserBanned(username, true);
            renderUsersTable();
        });
    });
    document.querySelectorAll('.unban-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            setUserBanned(username, false);
            renderUsersTable();
        });
    });
    // Eventos para eliminar usuario
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            if (confirm('¿Seguro que deseas eliminar este usuario?')) {
                deleteUser(username);
                renderUsersTable();
            }
        });
    });
}

// --- EVENTOS DE LOGIN Y REGISTRO ---
// Función para manejar mensajes de error de Firebase
function getSignupErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'Ya existe una cuenta con este correo electrónico';
        case 'auth/invalid-email':
            return 'Correo electrónico inválido';
        case 'auth/operation-not-allowed':
            return 'El registro con correo electrónico no está habilitado';
        case 'auth/weak-password':
            return 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres';
        default:
            return 'Error al registrar usuario. Por favor, intenta de nuevo.';
    }
}

function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/wrong-password':
            return 'Contraseña incorrecta';
        case 'auth/user-not-found':
            return 'No existe una cuenta con este correo';
        case 'auth/invalid-email':
            return 'Correo electrónico inválido';
        default:
            return 'Error al iniciar sesión. Por favor, intenta de nuevo.';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado');
    
    // Mostrar el rol del usuario si estamos en el dashboard
    const userRoleElement = document.getElementById('user-role');
    if (userRoleElement) {
        // Intentar obtener el usuario actual
        const auth = window.auth;
        if (auth && auth.currentUser) {
            userRoleElement.textContent = auth.currentUser.displayName || 'Usuario';
        } else {
            userRoleElement.textContent = 'Usuario';
        }
    }

    // Manejar el botón de cerrar sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                const auth = window.auth;
                if (auth) {
                    const { signOut } = await import('https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js');
                    await signOut(auth);
                }
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                // Redireccionar de todos modos
                window.location.href = 'login.html';
            }
        });
    }

    // Login form handling
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            
            if (!email || !password) {
                errorDiv.textContent = 'Por favor, complete todos los campos';
                errorDiv.classList.remove('hidden');
                return;
            }
            
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
            
            try {
                const auth = window.auth;
                const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js');
                
                await signInWithEmailAndPassword(auth, email, password);
                console.log('Login exitoso');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error durante el login:', error);
                errorDiv.textContent = getErrorMessage(error.code);
                errorDiv.classList.remove('hidden');
            }
        });
        return; // No inicializar nada más en login.html
    }

    // Signup form handling
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const role = document.getElementById('signup-role').value;
            const errorDiv = document.getElementById('signup-error');
            
            if (!email || !password || !role) {
                errorDiv.textContent = 'Por favor, complete todos los campos';
                errorDiv.classList.remove('hidden');
                return;
            }
            
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
            
            try {
                const auth = window.auth;
                const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js');
                
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: role });
                
                console.log('Usuario registrado exitosamente');
                window.location.href = 'login.html';

                // Mostrar mensaje de éxito
                alert('Registro exitoso. Por favor, inicia sesión.');
            } catch (error) {
                console.error('Error durante el registro:', error);
                errorDiv.textContent = getSignupErrorMessage(error.code);
                errorDiv.classList.remove('hidden');
            }
        });
        return; // No inicializar nada más en signup.html
    }

    // --- REGISTRO ---
    const signupForm2 = document.getElementById('signup-form');
    if (signupForm2) {
        signupForm2.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('signup-username').value.trim();
            const password = document.getElementById('signup-password').value;
            const role = document.getElementById('signup-role').value;
            const result = registerUser(username, password, role);
            const errorDiv = document.getElementById('signup-error');
            if (!result.success) {
                errorDiv.textContent = result.message;
                errorDiv.classList.remove('hidden');
            } else {
                errorDiv.classList.add('hidden');
                alert('Usuario registrado exitosamente. Ahora puedes iniciar sesión.');
                window.location.href = 'login.html';
            }
        });
        return; // No inicializar nada más en signup.html
    }

    // --- PROTECCIÓN Y UI SEGÚN ROL ---

// Función para actualizar la UI según el rol del usuario autenticado
function updateUIForRole() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;
        // El rol se almacena en displayName
        const role = user.displayName || 'usuario';
        // Actualizar el texto del encabezado
        const userRoleElement = document.getElementById('user-role');
        if (userRoleElement) {
            userRoleElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        }
        // Mostrar u ocultar opciones según el rol
        // Ejemplo: solo admin puede ver la gestión de usuarios
        const usersMenu = document.getElementById('users-menu');
        if (usersMenu) {
            if (role.toLowerCase() === 'admin') {
                usersMenu.style.display = '';
            } else {
                usersMenu.style.display = 'none';
            }
        }
        // Si hay otras opciones avanzadas, ocultarlas para roles básicos
        const advancedOptions = document.querySelectorAll('.only-admin');
        advancedOptions.forEach(el => {
            if (role.toLowerCase() === 'admin') {
                el.style.display = '';
            } else {
                el.style.display = 'none';
            }
        });
    });
}
window.updateUIForRole = updateUIForRole;

    // Proteger páginas principales (excepto login/signup)
    const path = window.location.pathname;
    if (!path.includes('login.html') && !path.includes('signup.html')) {
        requireAuth();
        updateUIForRole();
    }
    // Gestión de usuarios solo para admin
    if (path.includes('users.html')) {
        if (!requireAuth(['admin'])) return;
        renderUsersTable();
    }

    // Inicializar eventos para cerrar el modal de detalles
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeDetailsModal);
    });

    // Cerrar el modal al hacer clic fuera de él
    const detailsModal = document.getElementById('details-modal');
    if (detailsModal) {
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) {
                closeDetailsModal();
            }
        });
    }
    initializeEvents();

    // --- INICIO BLOQUE ASYNC ---
    (async function() {
        try {
            // Limpiar la tabla de datos de ejemplo
            const tbody = document.querySelector('.data-table tbody');
            if (tbody) {
                tbody.innerHTML = '';
            }

            // Obtener los activos registrados
            const assets = await fetchAssets();

            // Verificar si estamos en modo edición
            const urlParams = new URLSearchParams(window.location.search);
            const editId = urlParams.get('id');
            if (editId && window.location.pathname.includes('register.html')) {
                // Estamos editando un activo existente
                await loadAssetData(editId);
                // Cambiar el título del formulario
                const formTitle = document.querySelector('.page-header h1');
                if (formTitle) {
                    formTitle.textContent = 'Editar Activo';
                }
                // Cambiar el texto del botón de envío
                const submitButton = document.querySelector('.register-form button[type="submit"]');
                if (submitButton) {
                    submitButton.textContent = 'Actualizar Activo';
                }
            }

            const isManagePage = window.location.pathname.includes('assets.html');
            // Si estamos en la página de gestión
            if (isManagePage) {
                // Configurar event listeners para los filtros
                const typeFilter = document.querySelector('#type-filter');
                const statusFilter = document.querySelector('#status-filter');
                const searchInput = document.querySelector('#search-input');

                // Remover event listeners existentes para evitar duplicados
                if (typeFilter) {
                    typeFilter.removeEventListener('change', handleTypeFilter);
                    typeFilter.addEventListener('change', handleTypeFilter);
                }

                if (statusFilter) {
                    statusFilter.removeEventListener('change', handleStatusFilter);
                    statusFilter.addEventListener('change', handleStatusFilter);
                }

                if (searchInput) {
                    searchInput.removeEventListener('input', handleSearch);
                    searchInput.addEventListener('input', handleSearch);
                }

                console.log('Event listeners configurados');
                updateAssetsTable(assets, '', '', '', true);
            }
            // Si estamos en la página principal
            else if (document.querySelector('.stats-grid')) {
                const searchInput = document.querySelector('.search-box input');
                if (searchInput) {
                    searchInput.removeEventListener('input', handleSearch);
                    searchInput.addEventListener('input', handleSearch);
                }
                updateAssetsTable(assets, '', '', false);
                await updateStatsCards();
            }
        } catch (error) {
            console.error('Error al cargar los datos:', error);
        }

        // Agregar manejador de eventos para el formulario de registro si estamos en la página de registro
        const registerForm = document.querySelector('.register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', handleFormSubmit);

            // Manejar la visibilidad de los campos específicos según el tipo de activo
            const assetTypeSelect = document.getElementById('asset-type');
            if (assetTypeSelect) {
                assetTypeSelect.addEventListener('change', function() {
                    const selectedType = this.value;
                    const specificFields = ['hardware-field', 'software-field', 'network-field', 'other-field'];
                    
                    specificFields.forEach(fieldClass => {
                        const fields = document.querySelectorAll(`.${fieldClass}`);
                        fields.forEach(field => {
                            field.classList.toggle('hidden', !fieldClass.startsWith(selectedType));
                        });
                    });
                });

                // Trigger change event to set initial visibility
                assetTypeSelect.dispatchEvent(new Event('change'));
            }
        }
    })();
    // --- FIN BLOQUE ASYNC ---
});