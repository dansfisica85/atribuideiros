import { questionsAndAnswers, evaluators, approvalThreshold, syncIndicatorTime } from './config.js';

export function finalizeEvaluation(userId) {
    // Access global state managed by app.js and updated by Websim
    const userStates = window.userStates;
    const evaluationHistory = window.evaluationHistory;
    const room = window.room;

    // Make sure we have a valid userId and it exists in userStates
    if (!userId || !userStates[userId]) {
        console.error('Invalid userId or state not found:', userId);
        return;
    }

    const currentState = userStates[userId];
    const candidateName = currentState.selectedName;
    const scores = currentState.scores;

    // Check if candidate is selected and all questions are scored
    const allAnswered = scores && scores.length === questionsAndAnswers.length && !scores.includes(undefined);
    if (!candidateName || !allAnswered) {
        alert('Por favor, selecione um candidato e avalie TODAS as questões antes de finalizar.');
        return;
    }

    // Prepare state update for Websim
    const updatedUserState = {
        ...currentState,
        finalized: true
    };

    // Update local state immediately for UI responsiveness
    userStates[userId] = updatedUserState;

    // Store evaluation in history (using global history object)
    if (!evaluationHistory[candidateName]) {
        evaluationHistory[candidateName] = {}; // Use object for history entries
    }

    const historyEntryId = `${userId}-${Date.now()}`; // Unique ID for history entry
    evaluationHistory[candidateName][historyEntryId] = {
        evaluator: evaluators[userId - 1],
        evaluatorId: userId,
        date: new Date().toISOString(), // Use ISO string for consistency
        scores: [...scores], // Use a copy
        total: scores.reduce((a, b) => a + (b || 0), 0)
    };

    // Update room state via Websim
    room.updateRoomState({
        userStates: {
            [userId]: updatedUserState // Send only the updated user state
        },
        evaluationHistory: evaluationHistory // Send the entire updated history
    });
    console.log(`Evaluator ${userId} finalized for candidate: ${candidateName}`);
    showSyncIndicator(); // Show sync indicator

    // Update UI for the finalized evaluator
    const currentEvaluator = document.getElementById('user-section').dataset.user;
    if (currentEvaluator === userId) {
        document.getElementById(`status-user`).textContent = 'Finalizado';
        document.getElementById(`status-user`).className = 'status-badge completed';
        document.getElementById(`finalize-user`).disabled = true;
    }

    // Update history display (will be triggered by state subscription, but call here for immediate feedback)
    updateHistoryDisplay();

    // Check if both evaluators have finalized
    checkAndGenerateReport(userStates); // Check based on updated local state
}

export function checkAndGenerateReport(currentStates) {
    const reportElement = document.getElementById('report');
    if (!reportElement) return; // Exit if report element doesn't exist

    // Check if states for both evaluators exist and are finalized
    const eval1Finalized = currentStates && currentStates['1'] && currentStates['1'].finalized;
    const eval2Finalized = currentStates && currentStates['2'] && currentStates['2'].finalized;
    const candidate1 = currentStates && currentStates['1'] ? currentStates['1'].selectedName : null;
    const candidate2 = currentStates && currentStates['2'] ? currentStates['2'].selectedName : null;

    // Only generate the report if *both* have finalized *and* they evaluated the *same* candidate
    if (eval1Finalized && eval2Finalized && candidate1 && candidate1 === candidate2) {
        generateReport(candidate1); // Pass the candidate name
    } else {
        // Otherwise, show a waiting message or clear the report
        reportElement.innerHTML = '<h2>Relatório Final</h2><p>Aguardando a finalização de ambos os avaliadores para o mesmo candidato...</p>';
        // Keep the report section visible but show the waiting message
        if (reportElement.classList.contains('hidden')) {
            reportElement.classList.remove('hidden');
        }
    }
}

export function generateReport(candidateName) {
    const userStates = window.userStates; // Use global state
    const evaluationHistory = window.evaluationHistory; // Use global history
    const reportElement = document.getElementById('report');
    if (!reportElement || !candidateName) {
        console.error("Report generation failed: Missing element or candidate name.");
        return;
    }

    let reportHTML = `<h2>Relatório Final: ${candidateName}</h2>`;

    let combinedScores = Array(questionsAndAnswers.length).fill(0);
    let totalScore1 = 0;
    let totalScore2 = 0;
    let scores1, scores2;

    // Extract data for the specific candidate from userStates (most recent finalized state)
    if (userStates['1'] && userStates['1'].selectedName === candidateName && userStates['1'].finalized) {
        scores1 = userStates['1'].scores;
        totalScore1 = scores1.reduce((a, b) => a + (b || 0), 0);
        scores1.forEach((score, idx) => combinedScores[idx] += score);
        reportHTML += `
            <h3>Avaliador: ${evaluators[0]}</h3>
            <p>Total: ${totalScore1.toFixed(1)} pontos</p>
            <ul>
                ${scores1.map((s, i) => `
                    <li><strong>${questionsAndAnswers[i].question.split(':')[0]}:</strong> ${s !== undefined ? s : 'N/A'}</li>
                `).join('')}
            </ul>
        `;
    } else {
        reportHTML += `<h3>Avaliador: ${evaluators[0]}</h3><p>Dados não finalizados para este candidato.</p>`;
    }

    if (userStates['2'] && userStates['2'].selectedName === candidateName && userStates['2'].finalized) {
        scores2 = userStates['2'].scores;
        totalScore2 = scores2.reduce((a, b) => a + (b || 0), 0);
        scores2.forEach((score, idx) => combinedScores[idx] += score);
        reportHTML += `
            <h3>Avaliador: ${evaluators[1]}</h3>
            <p>Total: ${totalScore2.toFixed(1)} pontos</p>
            <ul>
                ${scores2.map((s, i) => `
                    <li><strong>${questionsAndAnswers[i].question.split(':')[0]}:</strong> ${s !== undefined ? s : 'N/A'}</li>
                `).join('')}
            </ul>
        `;
    } else {
        reportHTML += `<h3>Avaliador: ${evaluators[1]}</h3><p>Dados não finalizados para este candidato.</p>`;
    }

    // Add averages section only if both evaluated
    if (scores1 && scores2) {
        const averageTotal = (totalScore1 + totalScore2) / 2;
        reportHTML += '<h2>Média Final</h2>';
        reportHTML += `
            <p>Média Final: ${averageTotal.toFixed(1)} pontos</p>
            <p>Status: ${averageTotal >= approvalThreshold ?
                '<span style="color: green; font-weight: bold;">Aprovado</span>' :
                '<span style="color: red; font-weight: bold;">Reprovado</span>'}
            </p>
            <ul>
                ${combinedScores.map((s, i) => `
                    <li><strong>${questionsAndAnswers[i].question.split(':')[0]}:</strong>
                        Média: ${(s / 2).toFixed(1)} pontos</li>
                `).join('')}
            </ul>
        `;
    } else {
        reportHTML += '<h2>Média Final</h2><p>Média não pode ser calculada até que ambos avaliadores finalizem para este candidato.</p>';
    }

    reportElement.innerHTML = reportHTML;
    reportElement.classList.remove('hidden');
}

export function resetEvaluationForms(userIdToReset = null) {
    // This function might need rethinking in a multiplayer context.
    // Resetting should likely clear the state *for the next evaluation*
    // rather than wiping the current finalized state from the room.
    // Maybe this should clear the *local* UI elements only?
    console.warn("resetEvaluationForms function may need revision for multiplayer logic.");

    // Let's clear the local UI for the current evaluator
    const currentEvaluator = document.getElementById('user-section').dataset.user;
    if (currentEvaluator) {
        const select = document.getElementById('user-select');
        if (select) select.value = '';

        document.querySelectorAll(`#questions-user .score-btn.selected`).forEach(btn => {
            btn.classList.remove('selected');
        });

        // Update local state (without saving to room state yet)
        if (window.userStates[currentEvaluator]) {
            window.userStates[currentEvaluator] = {
                selectedName: '',
                scores: Array(questionsAndAnswers.length).fill(undefined),
                finalized: false
            };
        }
    }
}

export function updateHistoryDisplay() {
    const state = window.userStates;
    const evaluationHistory = window.evaluationHistory;

    const historyContainer = document.getElementById('evaluation-history');
    let historyHTML = '';

    // Group by candidate name
    Object.entries(evaluationHistory).forEach(([candidateName, evaluations]) => {
        historyHTML += `<h3>${candidateName}</h3>`;

        Object.entries(evaluations).forEach(([evaluationId, evaluation]) => {
            historyHTML += `
                <div class="history-item">
                    <p><strong>Avaliador:</strong> ${evaluation.evaluator} | <strong>Data:</strong> ${evaluation.date}</p>
                    <p><strong>Pontuação Total:</strong> ${evaluation.total.toFixed(1)}</p>
                    <details>
                        <summary>Ver detalhes</summary>
                        <ul>
                            ${evaluation.scores.map((score, idx) => `
                                <li><strong>${questionsAndAnswers[idx].question.split(':')[0]}:</strong> ${score}</li>
                            `).join('')}
                        </ul>
                    </details>
                </div>
            `;
        });

        // Calculate average if there are multiple evaluations
        const evaluationsArray = Object.values(evaluations);
        if (evaluationsArray.length > 1) {
            const totalAvg = evaluationsArray.reduce((sum, evaluation) => sum + evaluation.total, 0) / evaluationsArray.length;
            historyHTML += `
                <div class="history-item" style="background-color: #e3f2fd; padding: 10px;">
                    <p><strong>Média Final:</strong> ${totalAvg.toFixed(1)} pontos</p>
                    <p><strong>Status:</strong> ${totalAvg >= approvalThreshold ?
                        '<span style="color: green; font-weight: bold;">Aprovado</span>' :
                        '<span style="color: red; font-weight: bold;">Reprovado</span>'}
                    </p>
                </div>
            `;
        }
    });

    historyContainer.innerHTML = historyHTML || '<p>Nenhuma avaliação registrada ainda.</p>';
}

export function showSyncIndicator() {
    const indicator = document.getElementById('sync-indicator');
    indicator.style.display = 'block';

    setTimeout(() => {
        indicator.style.display = 'none';
    }, window.syncIndicatorTime);
}