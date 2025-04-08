import { names, questionsAndAnswers, evaluators, approvalThreshold } from './config.js';
import {
    finalizeEvaluation,
    updateHistoryDisplay,
    generateReport,
    resetEvaluationForms,
    showSyncIndicator,
    checkAndGenerateReport
} from './functions.js';

// Global state
let room; // WebsimSocket instance
let userStates = {}; // Initialize as empty, will be populated from room state or defaults
let evaluationHistory = {};
/* @tweakable A configuração para armazenar o avaliador selecionado no localStorage */
let storeEvaluatorInLocalStorage = true;
let selectedEvaluator = null;

async function initializeApp() {
    // Initialize WebsimSocket for realtime collaboration
    room = new WebsimSocket();
    await room.initialize();

    // Make these available globally for other modules
    window.room = room;
    window.userStates = userStates; // Reference to the global state object
    window.evaluationHistory = evaluationHistory; // Reference to the global history object

    // Check if evaluator is already selected from localStorage
    if (storeEvaluatorInLocalStorage && localStorage.getItem('selectedEvaluator')) {
        selectedEvaluator = localStorage.getItem('selectedEvaluator');
        setupEvaluatorInterface(selectedEvaluator);
    }

    // Set up evaluator selection buttons
    document.querySelectorAll('.evaluator-btn[data-evaluator]').forEach(btn => {
        btn.addEventListener('click', function() {
            selectedEvaluator = this.dataset.evaluator;
            if (storeEvaluatorInLocalStorage) {
                localStorage.setItem('selectedEvaluator', selectedEvaluator);
            }
            setupEvaluatorInterface(selectedEvaluator);
        });
    });

    // Clear local storage button
    document.getElementById('clear-storage-btn').addEventListener('click', () => {
        localStorage.clear();
        alert('Dados locais limpos. A página será recarregada.');
        window.location.reload();
    });


    // Subscribe to room state updates
    room.subscribeRoomState((currentRoomState) => {
        console.log("Room state updated:", currentRoomState);
        let needsUIUpdate = false;
        let historyChanged = false;

        if (currentRoomState && currentRoomState.evaluationHistory) {
             // Basic deep comparison check
             if (JSON.stringify(evaluationHistory) !== JSON.stringify(currentRoomState.evaluationHistory)) {
                 Object.assign(evaluationHistory, currentRoomState.evaluationHistory); // Update global history object
                 historyChanged = true;
            }
        }

        if (currentRoomState && currentRoomState.userStates) {
            // Update local state from remote, ensuring no local data loss for other users
            Object.keys(currentRoomState.userStates).forEach(evaluatorId => {
                 const remoteState = currentRoomState.userStates[evaluatorId];
                 const localState = userStates[evaluatorId] || { scores: [], finalized: false }; // Default if not exists locally

                 // Check if remote state is different from local state
                 if (JSON.stringify(remoteState) !== JSON.stringify(localState)) {
                    userStates[evaluatorId] = { ...localState, ...remoteState }; // Merge, remote takes precedence
                    if (selectedEvaluator === evaluatorId) {
                        needsUIUpdate = true; // Mark UI update only if it affects the current user
                    }
                 }
            });
             // Ensure userStates always has entries for both evaluators, even if empty
             [1, 2].forEach(id => {
                if (!userStates[id]) {
                    userStates[id] = { selectedName: '', scores: Array(questionsAndAnswers.length).fill(undefined), finalized: false };
                }
             });
        } else {
             // Initialize userStates if not present in roomState
             [1, 2].forEach(id => {
                if (!userStates[id]) {
                    userStates[id] = { selectedName: '', scores: Array(questionsAndAnswers.length).fill(undefined), finalized: false };
                }
             });
        }


        // Update UI if necessary
        if (needsUIUpdate && selectedEvaluator) {
            updateEvaluatorUI(selectedEvaluator);
        }
        if (historyChanged) {
             updateHistoryDisplay();
        }

        // Check if we should generate report
        checkAndGenerateReport(userStates); // Pass the global userStates

        showSyncIndicator();
    });

    // Initialize room state if it's empty or incomplete
    const initialRoomState = {};
    let updateNeeded = false;

    if (!room.roomState.evaluationHistory) {
        initialRoomState.evaluationHistory = {};
        updateNeeded = true;
    } else {
        // Sync local history with initial room state
        Object.assign(evaluationHistory, room.roomState.evaluationHistory);
    }

    if (!room.roomState.userStates) {
        initialRoomState.userStates = {
            1: { selectedName: '', scores: Array(questionsAndAnswers.length).fill(undefined), finalized: false },
            2: { selectedName: '', scores: Array(questionsAndAnswers.length).fill(undefined), finalized: false }
        };
         Object.assign(userStates, initialRoomState.userStates); // Update local userStates
         updateNeeded = true;
    } else {
        // Sync local userStates with initial room state
        Object.assign(userStates, room.roomState.userStates);
         // Ensure both evaluator slots exist locally
         [1, 2].forEach(id => {
            if (!userStates[id]) {
                userStates[id] = { selectedName: '', scores: Array(questionsAndAnswers.length).fill(undefined), finalized: false };
                // Potentially update room state if a user slot was missing
                // This scenario might indicate inconsistent state, tread carefully
                // initialRoomState.userStates = initialRoomState.userStates || {}; // Ensure it exists
                // initialRoomState.userStates[id] = userStates[id];
                // updateNeeded = true;
            }
         });
    }


    if (updateNeeded) {
        console.log("Initializing room state:", initialRoomState);
        room.updateRoomState(initialRoomState);
    }

     // Initial UI setup after state synchronization
     if (selectedEvaluator) {
        updateEvaluatorUI(selectedEvaluator);
     }
     updateHistoryDisplay(); // Update history display with initial state
     checkAndGenerateReport(userStates); // Check report status initially

}

function setupEvaluatorInterface(evaluatorId) {
    // Hide selection, show interface
    document.getElementById('evaluator-selection').classList.add('hidden');
    document.getElementById('instructions').classList.remove('hidden');
    document.getElementById('evaluation-container').classList.remove('hidden');
    document.getElementById('history-section').classList.remove('hidden');
    document.getElementById('report').classList.remove('hidden'); // Show report area initially

    // Set evaluator name
    document.getElementById('evaluator-name').textContent = evaluators[evaluatorId - 1];

    // Clear any previous user-specific elements/listeners to avoid duplication
    const oldUserSection = document.querySelector('.user-section[data-user]');
    if (oldUserSection) {
        oldUserSection.removeAttribute('data-user');
        // Potentially remove old event listeners here if dynamically added before
    }
     const oldFinalizeBtn = document.querySelector('.finalize-btn[id^="finalize-user"]');
     if(oldFinalizeBtn) oldFinalizeBtn.replaceWith(oldFinalizeBtn.cloneNode(true)); // Quick way to remove listeners

    // Configure the single user section for the selected evaluator
    const userSection = document.getElementById('user-section');
    userSection.dataset.user = evaluatorId; // Set the current user context

    const finalizeBtn = document.getElementById('finalize-user'); // Get the generic button
    finalizeBtn.dataset.evaluator = evaluatorId; // Add data attribute to identify evaluator

     // Use generic IDs for elements that are reused
    const statusBadge = document.getElementById('status-user');
    const questionsContainer = document.getElementById('questions-user');
    const select = document.getElementById('user-select');

    // --- Populate Select ---
    // Clear previous options except the default
    select.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
    names.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index; // Use index as value
        option.textContent = name;
        select.appendChild(option);
    });

    // --- Select Change Event Listener (only one needed) ---
    // Remove previous listener if exists to prevent multiple triggers
    select.replaceWith(select.cloneNode(true)); // Clone to remove listeners
    const newSelect = document.getElementById('user-select'); // Re-select the new element
    newSelect.addEventListener('change', function() {
        const currentEvaluatorId = document.getElementById('user-section').dataset.user;
        if (!currentEvaluatorId) return; // Exit if no evaluator context

        const selectedIndex = this.value;
        const selectedCandidateName = selectedIndex !== "" ? names[selectedIndex] : "";

        // Update local state first
        userStates[currentEvaluatorId].selectedName = selectedCandidateName;
         // Reset scores when candidate changes? Optional:
         // userStates[currentEvaluatorId].scores = Array(questionsAndAnswers.length).fill(undefined);
         // userStates[currentEvaluatorId].finalized = false;

        // Update room state
        const update = {
            userStates: {
                [currentEvaluatorId]: {
                    selectedName: selectedCandidateName
                     // If resetting scores:
                     // scores: userStates[currentEvaluatorId].scores,
                     // finalized: userStates[currentEvaluatorId].finalized
                }
            }
        };
         console.log(`Evaluator ${currentEvaluatorId} selected candidate: ${selectedCandidateName}`);
        room.updateRoomState(update);
        showSyncIndicator();

         // Update UI immediately for responsiveness
         updateEvaluatorUI(currentEvaluatorId);
    });


    // --- Create Questions ---
    questionsContainer.innerHTML = ''; // Clear existing questions
    questionsAndAnswers.forEach((qa, qIndex) => {
        const div = document.createElement('div');
        div.className = 'question';
        div.innerHTML = `
            <p><strong>${qa.question}</strong></p>
            <div class="answer">${qa.answer}</div>
            <div>
                <button class="score-btn" data-score="5" data-q="${qIndex}">Atende Plenamente (5 pontos)</button>
                <button class="score-btn" data-score="2.5" data-q="${qIndex}">Atende Parcialmente (2,5 pontos)</button>
                <button class="score-btn" data-score="0" data-q="${qIndex}">Não Atende (0 pontos)</button>
            </div>
        `;
        questionsContainer.appendChild(div);
    });

    // --- Score Button Listeners (attach to container for delegation) ---
     questionsContainer.replaceWith(questionsContainer.cloneNode(true)); // Remove old listeners
     const newQuestionsContainer = document.getElementById('questions-user');
     newQuestionsContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('score-btn')) {
            const btn = event.target;
            const currentEvaluatorId = document.getElementById('user-section').dataset.user;
            if (!currentEvaluatorId) return;

             const qIndex = parseInt(btn.dataset.q);
             const score = parseFloat(btn.dataset.score);

             // Update local state
             // Ensure scores array exists and has the correct length
             if (!userStates[currentEvaluatorId].scores || userStates[currentEvaluatorId].scores.length !== questionsAndAnswers.length) {
                 userStates[currentEvaluatorId].scores = Array(questionsAndAnswers.length).fill(undefined);
             }
             userStates[currentEvaluatorId].scores[qIndex] = score;

             // Update UI for this question immediately
             const questionDiv = btn.closest('.question');
             questionDiv.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
             btn.classList.add('selected');

             // Update room state
             const update = {
                 userStates: {
                     [currentEvaluatorId]: {
                         // Send the entire scores array
                         scores: userStates[currentEvaluatorId].scores
                     }
                 }
             };
             console.log(`Evaluator ${currentEvaluatorId} scored Q${qIndex}: ${score}`);
             room.updateRoomState(update);
             showSyncIndicator();
        }
    });


    // --- Finalize Button Listener ---
     finalizeBtn.replaceWith(finalizeBtn.cloneNode(true)); // Remove old listeners
     const newFinalizeBtn = document.getElementById('finalize-user');
     newFinalizeBtn.addEventListener('click', function() {
         const currentEvaluatorId = this.dataset.evaluator;
         if (currentEvaluatorId) {
             finalizeEvaluation(currentEvaluatorId); // Pass the evaluator ID
         } else {
             console.error("Could not determine evaluator ID for finalize button.");
         }
    });


    // Update UI based on current state for this evaluator
    updateEvaluatorUI(evaluatorId);

    // Update history display (uses global history state)
    updateHistoryDisplay();
     // Check report status
     checkAndGenerateReport(userStates);
}

function updateEvaluatorUI(evaluatorId) {
    const state = userStates[evaluatorId];
    if (!state) {
        console.warn(`No state found for evaluator ${evaluatorId}. Initializing default.`);
        userStates[evaluatorId] = { selectedName: '', scores: Array(questionsAndAnswers.length).fill(undefined), finalized: false };
        // Optionally update room state here if this represents a missing piece
        // room.updateRoomState({ userStates: { [evaluatorId]: userStates[evaluatorId] } });
        return; // Exit early or use default state
    }


    // Update select element value
    const selectElement = document.getElementById('user-select');
    if (state.selectedName) {
        const index = names.indexOf(state.selectedName);
        if (index > -1) {
            selectElement.value = index;
        } else {
             selectElement.value = ""; // Candidate name not in list, reset dropdown
        }
    } else {
        selectElement.value = ""; // No name selected
    }

    // Update score buttons
    const questionsContainer = document.getElementById('questions-user');
    questionsAndAnswers.forEach((_, qIndex) => {
        const buttons = questionsContainer.querySelectorAll(`.score-btn[data-q="${qIndex}"]`);
        const currentScore = state.scores ? state.scores[qIndex] : undefined; // Handle case where scores array might be missing initially

         buttons.forEach(btn => {
            // Check score equality carefully (including undefined)
            if (currentScore !== undefined && parseFloat(btn.dataset.score) === currentScore) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    });


    // Update status badge and finalize button
    const statusBadge = document.getElementById('status-user');
    const finalizeBtn = document.getElementById('finalize-user');

    if (state.finalized) {
        statusBadge.textContent = 'Finalizado';
        statusBadge.className = 'status-badge completed';
        finalizeBtn.disabled = true;
    } else {
        statusBadge.textContent = 'Aguardando';
        statusBadge.className = 'status-badge waiting';
        // Re-enable button only if candidate is selected and all questions answered
        const allAnswered = state.scores && state.scores.length === questionsAndAnswers.length && !state.scores.includes(undefined);
        finalizeBtn.disabled = !state.selectedName || !allAnswered;
    }
}

window.onload = initializeApp;