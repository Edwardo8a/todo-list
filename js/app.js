// ===== ELEMENTOS DEL DOM =====
const taskInput = document.getElementById('taskInput');
const addButton = document.getElementById('addButton');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const prioritySelect = document.getElementById('prioritySelect');
const sortSelect = document.getElementById('sortSelect');
const themeToggle = document.getElementById('themeToggle');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filterButtons = document.querySelectorAll('.filter-btn');

// Contadores
const pendingCountElement = document.getElementById('pendingCount');
const completedCountElement = document.getElementById('completedCount');
const totalCountElement = document.getElementById('totalCount');
const allCountElement = document.getElementById('allCount');
const pendingFilterCountElement = document.getElementById('pendingFilterCount');
const completedFilterCountElement = document.getElementById('completedFilterCount');

// ===== ESTADO DE LA APLICACIÓN =====
let tasks = [];
let currentFilter = 'all';
let currentSort = 'date';
let deleteConfirmId = null;
let editingTaskId = null;
let searchTerm = '';
let darkMode = false;

// ===== INICIALIZACIÓN =====
function init() {
    loadFromStorage();
    renderTasks();
    attachEventListeners();
    updateCounts();
    applyTheme();
}

// ===== EVENT LISTENERS =====
function attachEventListeners() {
    // Agregar tarea
    addButton.addEventListener('click', handleAddTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddTask();
    });

    // Búsqueda
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderTasks();
    });

    // Ordenamiento
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderTasks();
    });

    // Filtros
    filterButtons.forEach(button => {
        button.addEventListener('click', handleFilterChange);
    });

    // Tema
    themeToggle.addEventListener('click', toggleTheme);

    // Exportar/Importar
    exportBtn.addEventListener('click', exportTasks);
    importInput.addEventListener('change', importTasks);

    // Limpiar completadas
    clearCompletedBtn.addEventListener('click', clearCompleted);
}

// ===== FUNCIONES DE TAREAS =====

// Agregar tarea
function handleAddTask() {
    const text = taskInput.value.trim();
    
    if (text === '') {
        showNotification('⚠️ Por favor, ingresa una tarea válida', 'warning');
        return;
    }

    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        category: categorySelect.value,
        priority: prioritySelect.value,
        createdAt: new Date().toISOString(),
        completedAt: null
    };

    tasks.unshift(newTask);
    taskInput.value = '';
    categorySelect.value = 'personal';
    prioritySelect.value = 'media';
    
    saveToStorage();
    renderTasks();
    showNotification('✅ Tarea agregada exitosamente', 'success');
}

// Marcar como completada
function toggleTask(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return {
                ...task,
                completed: !task.completed,
                completedAt: !task.completed ? new Date().toISOString() : null
            };
        }
        return task;
    });
    
    saveToStorage();
    renderTasks();
}

// Iniciar edición
function startEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        editingTaskId = id;
        renderTasks();
    }
}

// Guardar edición
function saveEdit(id, newText) {
    const text = newText.trim();
    
    if (text === '') {
        showNotification('⚠️ La tarea no puede estar vacía', 'warning');
        return;
    }

    tasks = tasks.map(task => 
        task.id === id ? { ...task, text: text } :task
    );
    
    editingTaskId = null;
    saveToStorage();
    renderTasks();
    showNotification('✅ Tarea actualizada', 'success');
}

// Cancelar edición
function cancelEdit() {
    editingTaskId = null;
    renderTasks();
}

// Mostrar confirmación de eliminación
function showDeleteConfirm(id) {
    deleteConfirmId = id;
    renderTasks();
}

// Cancelar eliminación
function cancelDelete() {
    deleteConfirmId = null;
    renderTasks();
}

// Eliminar tarea
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    deleteConfirmId = null;
    
    saveToStorage();
    renderTasks();
    showNotification('🗑️ Tarea eliminada', 'info');
}

// Limpiar tareas completadas
function clearCompleted() {
    const completedCount = tasks.filter(t => t.completed).length;
    
    if (completedCount === 0) {
        showNotification('ℹ️ No hay tareas completadas', 'info');
        return;
    }

    if (confirm(`¿Eliminar ${completedCount} tarea(s) completada(s)?`)) {
        tasks = tasks.filter(task => !task.completed);
        saveToStorage();
        renderTasks();
        showNotification(`✅ ${completedCount} tarea(s) eliminada(s)`, 'success');
    }
}

// ===== FILTROS Y ORDENAMIENTO =====

// Cambiar filtro
function handleFilterChange(event) {
    currentFilter = event.target.dataset.filter;
    
    filterButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    renderTasks();
}

// Obtener tareas filtradas
function getFilteredTasks() {
    let filtered = [...tasks];

    // Filtro por estado
    switch (currentFilter) {
        case 'completed':
            filtered = filtered.filter(task => task.completed);
            break;
        case 'pending':
            filtered = filtered.filter(task => !task.completed);
            break;
    }

    // Filtro por búsqueda
    if (searchTerm) {
        filtered = filtered.filter(task =>
            task.text.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Ordenamiento
    filtered.sort((a, b) => {
        switch (currentSort) {
            case 'priority':
                const priorityOrder = { alta: 0, media: 1, baja: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            case 'alphabetical':
                return a.text.localeCompare(b.text);
            default: // date
                return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });

    return filtered;
}

// ===== RENDERIZADO =====

// Renderizar todas las tareas
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    
    taskList.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
        if (tasks.length === 0) {
            emptyState.textContent = '🎯 No hay tareas. ¡Agrega una para comenzar!';
        } else if (searchTerm) {
            emptyState.textContent = '🔍 No se encontraron tareas con ese término';
        } else {
            emptyState.textContent = '📋 No hay tareas en esta categoría';
        }
    } else {
        emptyState.classList.add('hidden');
    }
    
    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
    });
    
    updateCounts();
}

// Crear elemento de tarea
function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    // Checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'task-checkbox';
    checkbox.addEventListener('click', () => toggleTask(task.id));
    
    // Contenido de la tarea
    const content = document.createElement('div');
    content.className = 'task-content';
    
    // Meta información
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    
    const categoryIcon = document.createElement('span');
    categoryIcon.className = 'task-category';
    categoryIcon.textContent = getCategoryIcon(task.category);
    
    const priorityBadge = document.createElement('span');
    priorityBadge.className = `task-priority priority-${task.priority}`;
    priorityBadge.textContent = task.priority.toUpperCase();
    
    meta.appendChild(categoryIcon);
    meta.appendChild(priorityBadge);
    
    // Texto de la tarea
    if (editingTaskId === task.id) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-text-input';
        input.value = task.text;
        input.autofocus = true;
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveEdit(task.id, input.value);
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        });
        
        content.appendChild(meta);
        content.appendChild(input);
    } else {
        const text = document.createElement('p');
        text.className = 'task-text';
        text.textContent = task.text;
        
        const date = document.createElement('p');
        date.className = 'task-date';
        date.textContent = formatDate(task.createdAt);
        
        content.appendChild(meta);
        content.appendChild(text);
        content.appendChild(date);
    }
    
    // Acciones
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    
    if (editingTaskId === task.id) {
        // Botones de guardar y cancelar
        const saveBtn = document.createElement('button');
        saveBtn.className = 'task-btn btn-save';
        saveBtn.innerHTML = '💾';
        saveBtn.title = 'Guardar';
        saveBtn.addEventListener('click', () => {
            const input = content.querySelector('.task-text-input');
            saveEdit(task.id, input.value);
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'task-btn btn-cancel';
        cancelBtn.innerHTML = '❌';
        cancelBtn.title = 'Cancelar';
        cancelBtn.addEventListener('click', cancelEdit);
        
        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
    } else if (deleteConfirmId === task.id) {
        // Confirmación de eliminación
        const confirmDiv = document.createElement('div');
        confirmDiv.className = 'confirm-delete';
        
        const yesBtn = document.createElement('button');
        yesBtn.className = 'confirm-btn confirm-yes';
        yesBtn.textContent = 'Sí';
        yesBtn.addEventListener('click', () => deleteTask(task.id));
        
        const noBtn = document.createElement('button');
        noBtn.className = 'confirm-btn confirm-no';
        noBtn.textContent = 'No';
        noBtn.addEventListener('click', cancelDelete);
        
        confirmDiv.appendChild(yesBtn);
        confirmDiv.appendChild(noBtn);
        actions.appendChild(confirmDiv);
    } else {
        // Botones normales
        const editBtn = document.createElement('button');
        editBtn.className = 'task-btn btn-edit';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Editar';
        editBtn.addEventListener('click', () => startEdit(task.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-btn btn-delete';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Eliminar';
        deleteBtn.addEventListener('click', () => showDeleteConfirm(task.id));
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
    }
    
    // Ensamblar
    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(actions);
    
    return li;
}

// ===== CONTADORES =====
function updateCounts() {
    const pending = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    
    pendingCountElement.textContent = pending;
    completedCountElement.textContent = completed;
    totalCountElement.textContent = total;
    
    allCountElement.textContent = total;
    pendingFilterCountElement.textContent = pending;
    completedFilterCountElement.textContent = completed;
    
    // Mostrar/ocultar botón de limpiar
    clearCompletedBtn.style.display = completed > 0 ? 'flex' : 'none';
}

// ===== TEMA =====
function toggleTheme() {
    darkMode = !darkMode;
    applyTheme();
    saveToStorage();
}

function applyTheme() {
    const body = document.body;
    const themeIcon = themeToggle.querySelector('.theme-icon');
    
    if (darkMode) {
        body.classList.add('dark-mode');
        themeIcon.textContent = '☀️';
    } else {
        body.classList.remove('dark-mode');
        themeIcon.textContent = '🌙';
    }
}

// ===== IMPORTAR/EXPORTAR =====
function exportTasks() {
    if (tasks.length === 0) {
        showNotification('ℹ️ No hay tareas para exportar', 'info');
        return;
    }

    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `tareas_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('💾 Tareas exportadas exitosamente', 'success');
}

function importTasks(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedTasks = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedTasks)) {
                throw new Error('Formato inválido');
            }
            
            // Validar estructura de las tareas
            const validTasks = importedTasks.filter(task => 
                task.id && task.text && typeof task.completed === 'boolean'
            );
            
            if (validTasks.length === 0) {
                throw new Error('No se encontraron tareas válidas');
            }
            
            tasks = [...tasks, ...validTasks];
            saveToStorage();
            renderTasks();
            showNotification(`✅ ${validTasks.length} tarea(s) importada(s)`, 'success');
        } catch (error) {
            showNotification('❌ Error al importar: archivo inválido', 'error');
            console.error('Error al importar:', error);
        }
    };
    
    reader.onerror = function() {
        showNotification('❌ Error al leer el archivo', 'error');
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

// ===== ALMACENAMIENTO LOCAL =====
function saveToStorage() {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    } catch (error) {
        console.error('Error al guardar:', error);
        showNotification('⚠️ Error al guardar los datos', 'warning');
    }
}

function loadFromStorage() {
    try {
        const savedTasks = localStorage.getItem('tasks');
        const savedDarkMode = localStorage.getItem('darkMode');
        
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
        }
        
        if (savedDarkMode) {
            darkMode = JSON.parse(savedDarkMode);
        }
    } catch (error) {
        console.error('Error al cargar:', error);
        showNotification('⚠️ Error al cargar los datos guardados', 'warning');
    }
}

// ===== UTILIDADES =====
function getCategoryIcon(category) {
    const icons = {
        'trabajo': '💼',
        'personal': '👤',
        'estudio': '📚',
        'salud': '💪',
        'compras': '🛒'
    };
    return icons[category] || '📌';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('es-ES', options);
}

function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== INICIAR APLICACIÓN =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}