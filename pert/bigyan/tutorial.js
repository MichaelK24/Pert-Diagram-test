// pert/bigyan/tutorial.js
// ------------------------------------------------------
// Visual PERT Tutorial with table
// ------------------------------------------------------
// - Uses ChartGen to create a layout
// - Uses GraphRenderer to draw the quiz nodes
// - Uses PertMathEngine to compute ES/EF/LS/LF/Slack
// - Steps through forward pass, backward pass, and slack
//   while progressively filling node boxes AND a summary table.
// ------------------------------------------------------

(function () {
    let tasks = {};
    let order = [];
    let projectFinish = 0;
    let criticalPath = [];
    let steps = [];
    let currentStepIndex = 0;

    let layoutInfoEl;
    let stepDescriptionEl;
    let prevBtn, nextBtn, resetBtn, backBtn;
    let graphContainer;
    let graphRenderer;
    let taskTableBody; // table body ref

    document.addEventListener('DOMContentLoaded', initTutorial);

    function initTutorial() {
        layoutInfoEl = document.getElementById('layoutInfo');
        stepDescriptionEl = document.getElementById('stepDescription');
        prevBtn = document.getElementById('prevStep');
        nextBtn = document.getElementById('nextStep');
        resetBtn = document.getElementById('resetStep');
        backBtn = document.getElementById('backToMenu');
        graphContainer = document.getElementById('graph-container');
        taskTableBody = document.getElementById('taskTableBody');

        prevBtn.addEventListener('click', goPrevStep);
        nextBtn.addEventListener('click', goNextStep);
        resetBtn.addEventListener('click', resetSteps);
        backBtn.addEventListener('click', () => {
            window.location.href = '../michael/mainmenu.html';
        });

        // 1) Generate layout from ChartGen
        let gen = (typeof window.generateLayout === 'function')
            ? window.generateLayout()
            : (window.lastGeneratedLayout || null);

        if (!gen || !gen.tasks) {
            stepDescriptionEl.textContent = 'Error: could not generate a PERT chart.';
            return;
        }

        window.lastGeneratedLayout = gen;
        tasks = gen.tasks;

        // 2) Run math engine
        const engine = PertMathEngine.getInstance();
        const result = engine.computeTimes(tasks);
        order = result.order;
        projectFinish = result.projectFinish;
        criticalPath = result.criticalPath;

        // 3) Draw graph using existing GraphRenderer
        graphRenderer = new GraphRenderer(graphContainer);
        graphRenderer.drawEmptyQuiz(tasks);

        // Make all inputs read-only and styled as tutorial
        const inputs = graphContainer.querySelectorAll('input');
        inputs.forEach(inp => {
            inp.readOnly = true;
            inp.classList.add('tutorial-input');
            inp.value = ''; // start empty; we'll fill as we step
        });

        // 4) Display layout info
        const layoutName = gen.layoutName || '(unknown layout)';
        const setIndex = (typeof gen.setIndex !== 'undefined') ? gen.setIndex : '?';
        layoutInfoEl.textContent =
            `Layout: ${layoutName}, Set: ${setIndex}, Project Finish Time: ${projectFinish}`;

        // 5) Build and render table
        renderTaskTable();

        // 6) Build explanation steps (with "reveal" info)
        buildSteps();

        // 7) Start tutorial
        updateStepUI();
    }

    // --------------------------------------------------
    // Build table of tasks (initially ES/EF/LS/LF/Slack cells empty)
    // --------------------------------------------------
    function renderTaskTable() {
        if (!taskTableBody) return;
        taskTableBody.innerHTML = '';

        for (const id of order) {
            const t = tasks[id];
            const row = document.createElement('tr');
            row.dataset.taskId = id;

            function cell(text, fieldName) {
                const td = document.createElement('td');
                td.textContent = text;
                if (fieldName) {
                    td.dataset.field = fieldName; // es, ef, ls, lf, slack
                }
                row.appendChild(td);
            }

            cell(id);                                       // Task
            cell(t.len);                                    // Dur
            cell((t.pred || []).join(',') || '-');          // Pred
            cell((t.succ || []).join(',') || '-');          // Succ
            cell('', 'es');                                 // ES (filled later)
            cell('', 'ef');                                 // EF
            cell('', 'ls');                                 // LS
            cell('', 'lf');                                 // LF
            cell('', 'slack');                              // Slack

            taskTableBody.appendChild(row);
        }
    }

    // --------------------------------------------------
    // Build steps: intro, forward pass, backward pass, slack
    // --------------------------------------------------
    function buildSteps() {
        steps = [];

        // Intro step
        steps.push({
            type: 'intro',
            description:
                'Welcome to PERT Tutorial Mode.\n' +
                'We will compute the earliest and latest times for each task, ' +
                'and then find the slack and critical path.\n' +
                'Use Next/Prev to move through the steps. Values will appear on the chart and in the table.',
            highlight: [],
            reveal: {}
        });

        // Forward pass steps (ES/EF)
        for (const id of order) {
            const t = tasks[id];
            const preds = t.pred || [];
            let desc;

            if (preds.length === 0) {
                desc = `Forward: Task ${id} has no predecessors.\n` +
                       `So ES = 0, and EF = ES + duration = 0 + ${t.len} = ${t.ef}.`;
            } else {
                const predsStr = preds.join(', ');
                desc = `Forward: For task ${id}, ES = max(EF of predecessors ${predsStr}) = ${t.es}.\n` +
                       `Then EF = ES + duration = ${t.es} + ${t.len} = ${t.ef}.`;
            }

            steps.push({
                type: 'forward',
                description: desc,
                highlight: [id],
                reveal: { es: [id], ef: [id] }
            });
        }

        // Backward pass steps (LS/LF)
        const rev = [...order].reverse();
        for (const id of rev) {
            const t = tasks[id];
            const succs = t.succ || [];
            let desc;

            if (succs.length === 0) {
                desc = `Backward: Task ${id} has no successors.\n` +
                       `So LF = project finish time = ${projectFinish}, and LS = LF - duration = ${t.ls}.`;
            } else {
                const succStr = succs.join(', ');
                desc = `Backward: For task ${id}, LF = min(LS of successors ${succStr}) = ${t.lf}.\n` +
                       `Then LS = LF - duration = ${t.lf} - ${t.len} = ${t.ls}.`;
            }

            steps.push({
                type: 'backward',
                description: desc,
                highlight: [id],
                reveal: { ls: [id], lf: [id] }
            });
        }

        // Slack & critical path step
        const cpStr = criticalPath.join(' → ');
        steps.push({
            type: 'slack',
            description:
                `Slack: Slack = LS - ES for each task.\n` +
                `Tasks with slack = 0 are on the critical path.\n` +
                `Here, the critical path is: ${cpStr}.\n` +
                `We now fill in slack for those tasks.`,
            highlight: criticalPath,
            reveal: { slack: criticalPath }
        });

        currentStepIndex = 0;
    }

    // --------------------------------------------------
    // Step navigation
    // --------------------------------------------------
    function goPrevStep() {
        if (steps.length === 0) return;
        if (currentStepIndex > 0) {
            currentStepIndex--;
            updateStepUI();
        }
    }

    function goNextStep() {
        if (steps.length === 0) return;
        if (currentStepIndex < steps.length - 1) {
            currentStepIndex++;
            updateStepUI();
        }
    }

    function resetSteps() {
        if (steps.length === 0) return;
        currentStepIndex = 0;
        updateStepUI();
    }

    // --------------------------------------------------
    // UI Update: text, highlight nodes & rows, fill fields
    // --------------------------------------------------
    function updateStepUI() {
        clearHighlights();
        if (steps.length === 0) {
            stepDescriptionEl.textContent = 'No steps available.';
            return;
        }

        const step = steps[currentStepIndex];

        stepDescriptionEl.textContent =
            `Step ${currentStepIndex + 1} of ${steps.length}:\n\n` + step.description;

        // highlight nodes
        (step.highlight || []).forEach(taskId => {
            const node = document.getElementById(`task-${taskId}`);
            if (node) node.classList.add('tutorial-highlight');
        });

        // highlight table rows
        if (taskTableBody) {
            const rows = taskTableBody.querySelectorAll('tr');
            rows.forEach(r => r.classList.remove('tutorial-row-highlight'));
            (step.highlight || []).forEach(taskId => {
                const row = taskTableBody.querySelector(`tr[data-task-id="${taskId}"]`);
                if (row) row.classList.add('tutorial-row-highlight');
            });
        }

        // update which fields are visible up to this step
        updateFieldVisibility(currentStepIndex);
    }

    function clearHighlights() {
        const nodes = graphContainer.querySelectorAll('.pert-node');
        nodes.forEach(node => node.classList.remove('tutorial-highlight'));
        if (taskTableBody) {
            const rows = taskTableBody.querySelectorAll('tr');
            rows.forEach(r => r.classList.remove('tutorial-row-highlight'));
        }
    }

    // Fill in ES/EF/LS/LF/Slack cumulatively up to stepIndex
    function updateFieldVisibility(stepIndex) {
        const visible = {
            es: new Set(),
            ef: new Set(),
            ls: new Set(),
            lf: new Set(),
            slack: new Set()
        };

        // accumulate reveal sets up to current step
        for (let i = 0; i <= stepIndex && i < steps.length; i++) {
            const r = steps[i].reveal || {};
            if (r.es) r.es.forEach(id => visible.es.add(id));
            if (r.ef) r.ef.forEach(id => visible.ef.add(id));
            if (r.ls) r.ls.forEach(id => visible.ls.add(id));
            if (r.lf) r.lf.forEach(id => visible.lf.add(id));
            if (r.slack) r.slack.forEach(id => visible.slack.add(id));
        }

        // helper to set graph input value
        function setGraphField(taskId, fieldName, isVisible) {
            const input = document.getElementById(`task-${taskId}-${fieldName}`);
            if (!input) return;
            if (!isVisible) {
                input.value = '';
                return;
            }
            const t = tasks[taskId];
            if (!t) return;
            switch (fieldName) {
                case 'es':    input.value = t.es;    break;
                case 'ef':    input.value = t.ef;    break;
                case 'ls':    input.value = t.ls;    break;
                case 'lf':    input.value = t.lf;    break;
                case 'slack': input.value = t.slack; break;
            }
        }

        // helper to set table cell value
        function setTableField(taskId, fieldName, isVisible) {
            if (!taskTableBody) return;
            const row = taskTableBody.querySelector(`tr[data-task-id="${taskId}"]`);
            if (!row) return;
            const td = row.querySelector(`td[data-field="${fieldName}"]`);
            if (!td) return;

            if (!isVisible) {
                td.textContent = '';
                return;
            }

            const t = tasks[taskId];
            if (!t) return;
            switch (fieldName) {
                case 'es':    td.textContent = t.es;    break;
                case 'ef':    td.textContent = t.ef;    break;
                case 'ls':    td.textContent = t.ls;    break;
                case 'lf':    td.textContent = t.lf;    break;
                case 'slack': td.textContent = t.slack; break;
            }
        }

        const ids = Object.keys(tasks);
        for (const id of ids) {
            const showES    = visible.es.has(id);
            const showEF    = visible.ef.has(id);
            const showLS    = visible.ls.has(id);
            const showLF    = visible.lf.has(id);
            const showSlack = visible.slack.has(id);

            setGraphField(id, 'es',    showES);
            setGraphField(id, 'ef',    showEF);
            setGraphField(id, 'ls',    showLS);
            setGraphField(id, 'lf',    showLF);
            setGraphField(id, 'slack', showSlack);

            setTableField(id, 'es',    showES);
            setTableField(id, 'ef',    showEF);
            setTableField(id, 'ls',    showLS);
            setTableField(id, 'lf',    showLF);
            setTableField(id, 'slack', showSlack);
        }
    }
})();
