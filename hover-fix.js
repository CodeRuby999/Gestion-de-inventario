// Script modificado para eliminar efectos hover en las filas de tablas
document.addEventListener('DOMContentLoaded', function() {
    // Función modificada para eliminar los efectos hover
    function applyHoverStyles() {
        // Obtener todas las filas en tablas
        const tableRows = document.querySelectorAll('table.data-table tbody tr');
        
        console.log(`Eliminando estilos de hover de ${tableRows.length} filas`);
        
        // Para cada fila, eliminar los eventos de hover existentes
        tableRows.forEach(row => {
            // Asegurarse de que sea clickable sin hover
            row.classList.add('clickable-row');
            
            // Remover cualquier transición existente
            row.style.transition = 'none';
            row.style.backgroundColor = '';
            row.style.cursor = 'default';
            
            // Eliminar los event listeners anteriores no es posible directamente,
            // pero podemos sobrescribir el comportamiento
            row.onmouseenter = null;
            row.onmouseleave = null;
        });
    }
    
    // Ejecutar inmediatamente
    applyHoverStyles();
    
    // Y también después de un pequeño retraso para asegurar que se aplique a elementos cargados dinámicamente
    setTimeout(applyHoverStyles, 1000);
    setTimeout(applyHoverStyles, 3000);
});
