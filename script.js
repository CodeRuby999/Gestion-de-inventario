// ------------------- Gestión de Usuarios ------------------- //

// Guardar un nuevo usuario
function registerUser(username, password, role) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.find(user => user.username === username)) {
      return { success: false, message: 'El usuario ya existe.' };
    }
    users.push({ username, password, role });
    localStorage.setItem('users', JSON.stringify(users));
    return { success: true, message: 'Usuario registrado con éxito.' };
  }
  
  // Autenticación de usuario
  function loginUser(username, password) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, message: 'Credenciales incorrectas.' };
  }
  
  // Obtener usuario logueado
  function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
  }
  
  // Cerrar sesión
  function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  }
  
  // Proteger páginas según sesión y rol
  function protectPage(allowedRoles = []) {
    const user = getCurrentUser();
    if (!user || (allowedRoles.length && !allowedRoles.includes(user.role))) {
      alert('Acceso no autorizado. Redirigiendo al login.');
      window.location.href = 'login.html';
    }
  }
  
  // ------------------- Eventos ------------------- //
  
  document.addEventListener('DOMContentLoaded', () => {
    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const result = loginUser(username, password);
        const msg = document.getElementById('loginMessage');
        if (result.success) {
          window.location.href = 'index.html';
        } else {
          msg.textContent = result.message;
        }
      });
    }
  
    // Registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        const result = registerUser(username, password, role);
        const msg = document.getElementById('registerMessage');
        msg.style.color = result.success ? 'green' : 'red';
        msg.textContent = result.message;
        if (result.success) {
          registerForm.reset();
        }
      });
    }
  });
  
  // ------------------- Fin gestión usuarios ------------------- //
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
            // Obtener activos actuales
            let assets = JSON.parse(localStorage.getItem('assets') || '[]');
            
            // Eliminar el activo
            assets = assets.filter(asset => asset.id !== assetId);
            
            // Guardar los cambios
            localStorage.setItem('assets', JSON.stringify(assets));
            
            // Ocultar el modal
            modal.style.display = 'none';
            
            // Determinar si estamos en la página de gestión
            const isManagePage = window.location.pathname.includes('assets.html');
            
            // Actualizar la tabla con el parámetro correcto
            updateAssetsTable(assets, '', '', isManagePage);
            
            // Actualizar las estadísticas
            await updateStatsCards();

            // Mostrar mensaje de éxito
            alert('Activo eliminado exitosamente');
        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar el activo');
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

// Función para manejar la edición de activos
function handleEdit(assetId) {
    // Redirigir a la página de registro con el ID del activo
    window.location.href = `register.html?id=${assetId}`;
}

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
function generateStatusReport() {
    const assets = JSON.parse(localStorage.getItem('assets')) || [];
    const statusCount = {};

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
}

function generateTypeReport() {
    const assets = JSON.parse(localStorage.getItem('assets')) || [];
    const typeCount = {};

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
}

function generateAssignmentReport() {
    const assets = JSON.parse(localStorage.getItem('assets')) || [];
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
}

function showReport(title, content) {
    const container = document.getElementById('reportContainer');
    const titleElement = document.getElementById('reportTitle');
    const contentElement = document.getElementById('reportContent');

    titleElement.textContent = title;
    contentElement.innerHTML = content;
    container.style.display = 'block';
}

// Función para manejar el envío del formulario de registro
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Obtener los datos del formulario
    const formData = new FormData(event.target);
    const existingId = document.querySelector('#asset-id')?.value;

    const assetData = {
        id: existingId || generateAssetId(),
        tipo: formData.get('asset-type'),
        nombre: formData.get('name'),
        serial: formData.get('serial'),
        marca: formData.get('brand'),
        modelo: formData.get('model'),
        fechaCompra: formData.get('purchase-date'),
        fechaRegistro: existingId ? formData.get('fecha-registro') : new Date().toISOString(),
        ultimaActualizacion: new Date().toISOString(),
        estado: normalizeState(formData.get('status')),
        ubicacion: formData.get('location'),
        asignadoA: formData.get('assigned-to'),
        notas: formData.get('notes')
    };

    console.log('Datos del activo:', assetData); // Para depuración

    try {
        // Obtener activos existentes
        const assetsJson = localStorage.getItem('assets');
        console.log('Activos existentes:', assetsJson); // Para depuración
        
        let assets = [];
        if (assetsJson) {
            assets = JSON.parse(assetsJson);
            if (!Array.isArray(assets)) {
                console.error('Los datos en localStorage no son un array');
                assets = [];
            }
        }
        
        if (existingId) {
            // Actualizar activo existente
            const index = assets.findIndex(a => a.id === existingId);
            if (index !== -1) {
                assetData.fechaRegistro = assets[index].fechaRegistro; // Mantener la fecha de registro original
                assets[index] = assetData;
                console.log('Activo actualizado:', assetData);
            } else {
                console.error('No se encontró el activo a actualizar');
                return;
            }
        } else {
            // Agregar nuevo activo al inicio del array
            assets.unshift(assetData);
            console.log('Nuevo activo agregado:', assetData);
        }
        
        // Guardar en localStorage
        localStorage.setItem('assets', JSON.stringify(assets));
        console.log('Activos guardados:', assets); // Para depuración

        // Mostrar mensaje de éxito
        alert(existingId ? 'Activo actualizado exitosamente' : 'Activo registrado exitosamente');

        // Redirigir a la página de gestión
        window.location.href = 'assets.html';
    } catch (error) {
        console.error('Error al procesar el activo:', error);
        alert('Error al procesar el activo. Por favor, intente nuevamente.');
    }
}

// Función para obtener los activos
async function fetchAssets() {
    try {
        // Obtener activos del localStorage
        const assetsJson = localStorage.getItem('assets');
        if (!assetsJson) {
            console.log('No hay activos registrados');
            return [];
        }

        const assets = JSON.parse(assetsJson);
        console.log('Activos recuperados:', assets); // Para depuración
        return Array.isArray(assets) ? assets : [];
    } catch (error) {
        console.error('Error al obtener activos:', error);
        return [];
    }
}

// Función para obtener la clase CSS del badge según el estado
function getBadgeClass(estado) {
    if (!estado) return 'badge badge-secondary';
    const estadoLower = estado.toLowerCase();
    switch (estadoLower) {
        case 'disponible':
            return 'badge badge-success';
        case 'asignado':
            return 'badge badge-info';
        case 'mantenimiento':
            return 'badge badge-warning';
        case 'fueradeuso':
            return 'badge badge-danger';
        default:
            return 'badge badge-secondary';
    }
}

// Variable para almacenar el ID del activo actual
let currentAssetId = null;

// Función para mostrar los detalles de un activo
function showAssetDetails(assetId) {
    currentAssetId = assetId;
    const assets = JSON.parse(localStorage.getItem('assets') || '[]');
    const asset = assets.find(a => a.id === assetId);

    if (!asset) {
        console.error('Activo no encontrado');
        return;
    }

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
document.addEventListener('DOMContentLoaded', async function() {
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
});