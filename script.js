// BANCO DE DADOS PESSOAL (LOCALSTORAGE)
let currentUserEmail = null;
let currentUserData = {
    profile: { email: '', idade: '', peso: '', altura: '', sexo: '', trainingSplit: {} }
};

// Dias da semana
const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
let pendingExercises = []; // lista de exercícios pendentes para o dia atual

function generateId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 6); }

function persistUserData() {
    if (!currentUserEmail) return;
    const key = `theGuris_${currentUserEmail}`;
    const toStore = {
        profile: currentUserData.profile,
        updated: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(toStore));
}

function loadUserByEmail(email, profileData = null) {
    const key = `theGuris_${email}`;
    const stored = localStorage.getItem(key);
    let savedProfile = null;
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            savedProfile = parsed.profile;
        } catch(e) { }
    }
    let finalProfile = savedProfile ? { ...savedProfile } : {
        email: email, idade: '', peso: '', altura: '', sexo: '',
        trainingSplit: {}
    };
    if (profileData) {
        finalProfile = { ...finalProfile, ...profileData, email: email };
    }
    if (!finalProfile.trainingSplit) finalProfile.trainingSplit = {};
    for (const day of weekDays) {
        if (!finalProfile.trainingSplit[day]) finalProfile.trainingSplit[day] = [];
    }
    currentUserEmail = email;
    currentUserData = {
        profile: finalProfile
    };
    persistUserData();
}

function updateProfileFromForm() {
    currentUserData.profile = {
        ...currentUserData.profile,
        idade: document.getElementById('idade').value || '',
        peso: document.getElementById('peso').value || '',
        altura: document.getElementById('altura').value || '',
        sexo: document.getElementById('sexo').value || '',
        email: currentUserEmail
    };
    persistUserData();
}

// ---------- FUNÇÕES PARA DIVISÃO DE TREINO ----------
function getTrainingSplit() {
    return currentUserData.profile.trainingSplit;
}

function saveTrainingSplit(newSplit) {
    currentUserData.profile.trainingSplit = newSplit;
    persistUserData();
    renderSplitForDay();
}

function addExerciseToSplit(day, muscleGroup, exercise, sets, reps, weight) {
    const split = getTrainingSplit();
    if (!split[day]) split[day] = [];
    split[day].push({
        id: generateId(),
        muscleGroup: muscleGroup.trim(),
        name: exercise.trim(),
        sets: parseInt(sets),
        reps: parseInt(reps),
        weight: parseFloat(weight) || 0
    });
    saveTrainingSplit(split);
}

function updateExerciseInSplit(day, exerciseId, updatedData) {
    const split = getTrainingSplit();
    if (!split[day]) return;
    const index = split[day].findIndex(ex => ex.id === exerciseId);
    if (index !== -1) {
        split[day][index] = { ...split[day][index], ...updatedData };
        saveTrainingSplit(split);
    }
}

function removeExerciseFromSplit(day, exerciseId) {
    const split = getTrainingSplit();
    if (split[day]) {
        split[day] = split[day].filter(ex => ex.id !== exerciseId);
        saveTrainingSplit(split);
    }
}

// Renderização com agrupamento por músculo
function renderSplitForDay() {
    const selectedDay = document.getElementById('splitDaySelect').value;
    const exercises = getTrainingSplit()[selectedDay] || [];
    const container = document.getElementById('splitExercisesContainer');
    if (!container) return;

    if (exercises.length === 0) {
        container.innerHTML = '<p style="color:#888;">Nenhum exercício cadastrado para este dia. Adicione abaixo.</p>';
        return;
    }

    // Agrupar por muscleGroup
    const groups = {};
    exercises.forEach(ex => {
        const group = ex.muscleGroup || 'Outros';
        if (!groups[group]) groups[group] = [];
        groups[group].push(ex);
    });

    let html = '';
    for (const [group, groupExercises] of Object.entries(groups)) {
        html += `<div class="muscle-group"><h4>${group.toUpperCase()}</h4>`;
        groupExercises.forEach(ex => {
            html += `
                <div class="split-exercise-item" data-id="${ex.id}">
                    <div class="split-exercise-info">
                        <strong>${ex.name}</strong> — ${ex.sets} séries x ${ex.reps} reps · ${ex.weight} kg
                    </div>
                    <div class="split-exercise-actions">
                        <button class="edit-split-ex" data-day="${selectedDay}" data-id="${ex.id}">[ EDITAR ]</button>
                        <button class="remove-split-ex" data-day="${selectedDay}" data-id="${ex.id}">[ REMOVER ]</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    container.innerHTML = html;

    // Eventos para botões de editar e remover
    document.querySelectorAll('.edit-split-ex').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const day = btn.getAttribute('data-day');
            const id = btn.getAttribute('data-id');
            openEditModal(day, id);
        });
    });
    document.querySelectorAll('.remove-split-ex').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const day = btn.getAttribute('data-day');
            const id = btn.getAttribute('data-id');
            if (confirm('Remover este exercício?')) {
                removeExerciseFromSplit(day, id);
            }
        });
    });
}

// ---------- FUNÇÕES PARA LISTA DE PENDENTES ----------
function renderPendingList() {
    const container = document.getElementById('pendingItems');
    if (!container) return;
    if (pendingExercises.length === 0) {
        container.innerHTML = '<p style="color:#888;">Nenhum exercício pendente. Adicione abaixo.</p>';
        return;
    }
    let html = '';
    pendingExercises.forEach((ex, idx) => {
        html += `
            <div class="pending-item" data-idx="${idx}">
                <div class="info">
                    <strong>${ex.muscleGroup.toUpperCase()}</strong> — ${ex.name} · ${ex.sets}x${ex.reps} · ${ex.weight}kg
                </div>
                <button class="remove-pending" data-idx="${idx}">[ X ]</button>
            </div>
        `;
    });
    container.innerHTML = html;

    document.querySelectorAll('.remove-pending').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            if (!isNaN(idx)) {
                pendingExercises.splice(idx, 1);
                renderPendingList();
            }
        });
    });
}

function addToPending() {
    const muscleGroup = document.getElementById('pendingMuscleGroup').value;
    const name = document.getElementById('pendingExerciseName').value.trim();
    const sets = document.getElementById('pendingSets').value;
    const reps = document.getElementById('pendingReps').value;
    const weight = document.getElementById('pendingWeight').value;

    if (!name || !sets || !reps) {
        alert('Preencha nome do exercício, séries e repetições.');
        return;
    }

    pendingExercises.push({
        muscleGroup,
        name,
        sets: parseInt(sets),
        reps: parseInt(reps),
        weight: parseFloat(weight) || 0
    });

    // Limpar campos
    document.getElementById('pendingExerciseName').value = '';
    document.getElementById('pendingSets').value = '3';
    document.getElementById('pendingReps').value = '8';
    document.getElementById('pendingWeight').value = '';

    renderPendingList();
}

function saveAllPending() {
    if (pendingExercises.length === 0) {
        alert('Nenhum exercício pendente para salvar.');
        return;
    }
    const currentDay = document.getElementById('splitDaySelect').value;
    for (const ex of pendingExercises) {
        addExerciseToSplit(currentDay, ex.muscleGroup, ex.name, ex.sets, ex.reps, ex.weight);
    }
    pendingExercises = [];
    renderPendingList();
    alert(`${pendingExercises.length} exercícios salvos com sucesso!`);
    renderSplitForDay(); // atualiza a visualização
}

function clearPending() {
    if (pendingExercises.length > 0 && confirm('Limpar toda a lista de pendentes?')) {
        pendingExercises = [];
        renderPendingList();
    }
}

// Abrir modal de edição
function openEditModal(day, exerciseId) {
    const exercises = getTrainingSplit()[day] || [];
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    document.getElementById('editDay').value = day;
    document.getElementById('editId').value = exerciseId;
    document.getElementById('editMuscleGroup').value = exercise.muscleGroup || 'Peito';
    document.getElementById('editExerciseName').value = exercise.name;
    document.getElementById('editSets').value = exercise.sets;
    document.getElementById('editReps').value = exercise.reps;
    document.getElementById('editWeight').value = exercise.weight;

    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}

function saveEditedExercise() {
    const day = document.getElementById('editDay').value;
    const id = document.getElementById('editId').value;
    const updatedData = {
        muscleGroup: document.getElementById('editMuscleGroup').value,
        name: document.getElementById('editExerciseName').value.trim(),
        sets: parseInt(document.getElementById('editSets').value),
        reps: parseInt(document.getElementById('editReps').value),
        weight: parseFloat(document.getElementById('editWeight').value)
    };
    if (!updatedData.name || isNaN(updatedData.sets) || isNaN(updatedData.reps)) {
        alert('Preencha todos os campos corretamente.');
        return;
    }
    updateExerciseInSplit(day, id, updatedData);
    closeEditModal();
}

function refreshDashboard() {
    if (!currentUserEmail) return;

    document.getElementById('displayEmail').innerText = currentUserEmail;
    document.getElementById('displayIdade').innerText = currentUserData.profile.idade || '-';
    document.getElementById('displayPeso').innerText = currentUserData.profile.peso || '-';
    document.getElementById('displayAltura').innerText = currentUserData.profile.altura || '-';
    let sexoShow = currentUserData.profile.sexo || '-';
    if (sexoShow === 'M') sexoShow = 'MASC';
    else if (sexoShow === 'F') sexoShow = 'FEM';
    document.getElementById('displaySexo').innerText = sexoShow;

    renderSplitForDay();
    renderPendingList();
}

function showProfileSection() {
    document.getElementById('profileSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
    currentUserEmail = null;
    currentUserData = { profile: { email: '', idade: '', peso: '', altura: '', sexo: '', trainingSplit: {} } };
    pendingExercises = [];
    document.getElementById('profileForm').reset();
}

function showDashboard() {
    document.getElementById('profileSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    refreshDashboard();
}

// EVENTOS
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    const changeUserBtn = document.getElementById('changeUserBtn');
    const splitDaySelect = document.getElementById('splitDaySelect');
    const addToPendingBtn = document.getElementById('addToPendingBtn');
    const saveAllPendingBtn = document.getElementById('saveAllPendingBtn');
    const clearPendingBtn = document.getElementById('clearPendingBtn');
    const editModal = document.getElementById('editModal');
    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    const editExerciseForm = document.getElementById('editExerciseForm');

    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        if (!email) {
            alert("E-mail obrigatório para banco pessoal.");
            return;
        }
        const idade = document.getElementById('idade').value;
        const peso = document.getElementById('peso').value;
        const altura = document.getElementById('altura').value;
        const sexo = document.getElementById('sexo').value;
        loadUserByEmail(email, { idade, peso, altura, sexo });
        updateProfileFromForm();
        showDashboard();
    });

    changeUserBtn.addEventListener('click', () => showProfileSection());

    splitDaySelect.addEventListener('change', () => {
        renderSplitForDay();
        if (pendingExercises.length > 0) {
            if (confirm('Mudar de dia irá descartar os exercícios pendentes. Continuar?')) {
                pendingExercises = [];
                renderPendingList();
            }
        }
    });

    addToPendingBtn.addEventListener('click', addToPending);
    saveAllPendingBtn.addEventListener('click', saveAllPending);
    clearPendingBtn.addEventListener('click', clearPending);

    closeEditModalBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
    editExerciseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEditedExercise();
    });
});