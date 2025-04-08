import { names, questionsAndAnswers, evaluators, approvalThreshold, rememberEvaluator, evaluatorStorageKey, syncIndicatorTime } from './config.js';
import {
    finalizeEvaluation,
    updateHistoryDisplay,
    generateReport,
    resetEvaluationForms,
    showSyncIndicator,
    checkAndGenerateReport
} from './functions.js';

// Global state - accessible via window for functions.js for simplicity
let room; // WebsimSocket instance
window.userStates = {}; // Holds state for evaluator 1 and 2 { 1: { selectedName, scores, finalized }, 2: ... }
window.evaluationHistory = {}; // Holds historical records { candidateName: { evalId: { evaluator, date, scores, total } } }

let selectedEvaluator = null; // Which evaluator (1 or 2) is using this browser instance

async function initializeApp() {
    // Initialize WebsimSocket for realtime collaboration
    room = new WebsimSocket();
    await room.initialize();
    window.room = room; // Make room instance globally available

    console.log("Websim initialized. Client ID:", room.clientId);

    // Check if evaluator is already selected from localStorage
    if (rememberEvaluator && localStorage.getItem(evaluatorStorageKey)) {
        selectedEvaluator = localStorage.getItem(evaluatorStorageKey);
        console.log(`Found stored evaluator: ${selectedEvaluator}`);
        setupEvaluatorInterface(selectedEvaluator);
    } else {
        console.log("No evaluator stored locally. Showing selection screen.");
        // Show evaluator selection screen by default (it's visible initially)
    }

    // --- Event Listeners ---

    // Evaluator selection buttons
    document.querySelectorAll('.evaluator-btn[data-evaluator]').forEach(btn => {
        btn.addEventListener('click', function() {
            selectedEvaluator = this.dataset.evaluator;
            if (rememberEvaluator) {
                localStorage.setItem(evaluatorStorageKey, selectedEvaluator);
                console.log(`Stored evaluator ${selectedEvaluator} locally.`);
            }
            setupEvaluatorInterface(selectedEvaluator);
        });
    });

    // Clear local storage button
    document.getElementById('clear-storage-btn').addEventListener('click', () => {
        localStorage.removeItem(evaluatorStorageKey);
        alert('Seleção de avaliador local limpa. A página será recarregada.');
        window.location.reload();
    });

    // --- Websim Subscriptions ---

    // Subscribe to Room State updates
    room.subscribeRoomState((currentRoomState) => {
        console.log("Received Room State Update:", currentRoomState);
        let needsUIUpdateForThisEvaluator = false;
        let historyChanged = false;
        let reportNeedsCheck = false;

        // Update History State
        if (currentRoomState && currentRoomState.evaluationHistory) {
             if (JSON.stringify(window.evaluationHistory) !== JSON.stringify(currentRoomState.evaluationHistory)) {
                 console.log("Evaluation history changed, updating local state.");
                 window.evaluationHistory = { ...currentRoomState.evaluationHistory }; // Replace local with remote
                 historyChanged = true;
                 reportNeedsCheck = true; // History change might affect report status if a finalization occurred
            }
        } else if (window.evaluationHistory && Object.keys(window.evaluationHistory).length > 0) {
            // If remote history is null/undefined but local isn't, clear local (or handle merge)
            console.log("Remote history empty/null, clearing local history.");
            window.evaluationHistory = {};
            historyChanged = true;
            reportNeedsCheck = true;
        }

        // Update User States
        if (currentRoomState && currentRoomState.userStates) {
            // Iterate through evaluators (1 and 2)
            [1, 2].forEach(id => {
                const remoteState = currentRoomState.userStates[id];
                const localState = window.userStates[id];

                // Check if remote state exists and differs from local state
                if (remoteState && JSON.stringify(remoteState) !== JSON.stringify(localState)) {
                    console.log(`Updating state for evaluator ${id}.`);
                    window.userStates[id] = { ...remoteState }; // Replace local with remote state for this user
                    reportNeedsCheck = true; // Any state change could affect report

                    // Mark UI update only if it affects the evaluator using this browser
                    if (selectedEvaluator === String(id)) {
                        needsUIUpdateForThisEvaluator = true;
                    }
                } else if (!remoteState && localState) {
                     // Remote state for this user is missing, clear local (or handle differently)
                     console.log(`Remote state missing for evaluator ${id}, clearing local.`);
                     delete window.userStates[id];
                     reportNeedsCheck = true;
                     if (selectedEvaluator === String(id)) {
                         needsUIUpdateForThisEvaluator = true; // Need to reflect cleared state
                     }
                }

                // Ensure local state always has a placeholder if remote doesn't provide one
                if (!window.userStates[id]) {
                     window.userStates[id] = createDefaultUserState();
                }
            });
        } else {
            // Remote userStates is null/undefined, reset local state
            console.log("Remote userStates empty/null, resetting local userStates.");
            window.userStates = { 1: createDefaultUserState(), 2: createDefaultUserState() };
            reportNeedsCheck = true;
            needsUIUpdateForThisEvaluator = true; // Update UI for current evaluator based on default state
        }

        // --- Trigger UI Updates based on changes ---
        if (needsUIUpdateForThisEvaluator && selectedEvaluator) {
            console.log(`Updating UI for selected evaluator ${selectedEvaluator}.`);
            updateEvaluatorUI(selectedEvaluator);
        }
        if (historyChanged) {
             console.log("Updating history display.");
             updateHistoryDisplay();
        }
        if (reportNeedsCheck) {
             console.log("Checking report status.");
             checkAndGenerateReport(window.userStates);
        }

        // Only show sync indicator if the update wasn't triggered by this client
        // (Websim doesn't directly expose the source, so we show it always for now)
        showSyncIndicator();
    });

    // --- Initialize Room State if empty ---
    // We fetch the current state first and only initialize if parts are missing.
    const currentState = room.roomState;
    const initialRoomStateUpdate = {};
    let updateNeeded = false;

    // Initialize History if missing
    if (!currentState || !currentState.evaluationHistory) {
        console.log("Initializing evaluationHistory in room state.");
        initialRoomStateUpdate.evaluationHistory = {};
        window.evaluationHistory = {}; // Sync local
        updateNeeded = true;
    } else {
        // Sync local history with initial room state on load
        window.evaluationHistory = { ...currentState.evaluationHistory };
    }

    // Initialize User States if missing or incomplete
    if (!currentState || !currentState.userStates) {
        console.log("Initializing userStates in room state.");
        const defaultStates = { 1: createDefaultUserState(), 2: createDefaultUserState() };
        initialRoomStateUpdate.userStates = defaultStates;
        window.userStates = defaultStates; // Sync local
        updateNeeded = true;
    } else {
        // Sync local userStates and ensure both evaluator slots exist
        window.userStates = { ...currentState.userStates };
         [1, 2].forEach(id => {
            if (!window.userStates[id]) {
                console.log(`Adding missing default state for evaluator ${id} during init.`);
                window.userStates[id] = createDefaultUserState();
                // Add this missing part to the initial update if needed
                 initialRoomStateUpdate.userStates = initialRoomStateUpdate.userStates || { ...currentState.userStates };
                 initialRoomStateUpdate.userStates[id] = window.userStates[id];
                updateNeeded = true;
            }
         });
    }

    // Send initial state update if anything was missing
    if (updateNeeded) {
        console.log("Sending initial room state update:", initialRoomStateUpdate);
        room.updateRoomState(initialRoomStateUpdate);
    }

     // --- Initial UI Setup After State Synchronization ---
     if (selectedEvaluator) {
        updateEvaluatorUI(selectedEvaluator); // Update UI based on potentially synced state
     }
     updateHistoryDisplay(); // Update history display with initial/synced state
     checkAndGenerateReport(window.userStates); // Check report status initially

     console.log("Initialization complete. Current State:", {
        users: window.userStates,
        history: window.evaluationHistory
     });
}

// Helper to create default state for an evaluator
function createDefaultUserState() {
    return {
        selectedName: '',
        scores: Array(questionsAndAnswers.length).fill(undefined),
        finalized: false
    };
}

// Sets up the main interface for the selected evaluator
function setupEvaluatorInterface(evaluatorId) {
    // Hide selection screen, show main interface elements
    document.getElementById('evaluator-selection').classList.add('hidden');
    document.getElementById('instructions').classList.remove('hidden');
    document.getElementById('evaluation-container').classList.remove('hidden');
    // Report and History are within evaluation-container now, no need to show separately

    // Set evaluator name display
    document.getElementById('evaluator-name').textContent = evaluators[evaluatorId - 1];

    // Configure the user section for the selected evaluator
    const userSection = document.getElementById('user-section');
    userSection.dataset.user = evaluatorId; // Store current

    const finalizeBtn = document.getElementById('finalize-user'); // Get the generic button
    finalizeBtn.dataset.evaluator = evaluatorId; // Add data attribute to identify evaluator

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
        window.userStates[currentEvaluatorId].selectedName = selectedCandidateName;
         // Reset scores when candidate changes? Optional:
         // window.userStates[currentEvaluatorId].scores = Array(questionsAndAnswers.length).fill(undefined);
         // window.userStates[currentEvaluatorId].finalized = false;

        // Update room state
        const update = {
            userStates: {
                [currentEvaluatorId]: {
                    selectedName: selectedCandidateName
                     // If resetting scores:
                     // scores: window.userStates[currentEvaluatorId].scores,
                     // finalized: window.userStates[currentEvaluatorId].finalized
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
             if (!window.userStates[currentEvaluatorId].scores || window.userStates[currentEvaluatorId].scores.length !== questionsAndAnswers.length) {
                 window.userStates[currentEvaluatorId].scores = Array(questionsAndAnswers.length).fill(undefined);
             }
             window.userStates[currentEvaluatorId].scores[qIndex] = score;

             // Update UI for this question immediately
             const questionDiv = btn.closest('.question');
             questionDiv.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
             btn.classList.add('selected');

             // Update room state
             const update = {
                 userStates: {
                     [currentEvaluatorId]: {
                         // Send the entire scores array
                         scores: window.userStates[currentEvaluatorId].scores
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
     checkAndGenerateReport(window.userStates);
}

function updateEvaluatorUI(evaluatorId) {
    const state = window.userStates[evaluatorId];
    if (!state) {
        console.warn(`No state found for evaluator ${evaluatorId}. Initializing default.`);
        window.userStates[evaluatorId] = { selectedName: '', scores: Array(questionsAndAnswers.length).fill(undefined), finalized: false };
        // Optionally update room state here if this represents a missing piece
        // room.updateRoomState({ userStates: { [evaluatorId]: window.userStates[evaluatorId] } });
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