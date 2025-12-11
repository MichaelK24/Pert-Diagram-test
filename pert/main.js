//main js
//michael king
//handles quiz logic answer checking and csv loading
/*
[Ananda]: Implemented UIController interaction, Audio toggle logic, 
 and the 'Check' button validation workflow.*/

document.addEventListener('DOMContentLoaded', () => {

    //load authoritative answers from the csv file if present and build a dictionary keyed by layout and dataset
    //so we can map to computed answers
    async function loadCSVAnswerKey() {
        try {
            const resp = await fetch('michael/PERTkey.csv');
            if (!resp.ok) return;
            const text = await resp.text();
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length>0);
            //expected columns
            //layoutname, datasetindex, task, duration, ES, EF, LS, LF, slack
            const keyStore={};
            const header=lines[0].split(',');
            //find indices
            const layoutIdx=header.indexOf('layoutname');
            const setIdx=header.indexOf('dataset');
            const taskIdx=header.indexOf('task');
            const durIdx=header.indexOf('len');
            const esIdx=header.indexOf('ES');
            const efIdx=header.indexOf('EF');
            const lsIdx=header.indexOf('LS');
            const lfIdx=header.indexOf('LF');
            const slackIdx=header.indexOf('slack');

            function parseNum(x) {
                if (x == null || x === '') return null;
                const n = Number(x);
                return Number.isNaN(n) ? null : n;
            }

            for (let i=1;i<lines.length;i++) {
                const cols=lines[i].split(',');
                if (cols.length<header.length) continue;
                const layout=cols[layoutIdx];
                const dataset=cols[setIdx];
                const task=cols[taskIdx];
                if (!layout || !dataset || !task) continue;
                const keyName=layout + 'data' + dataset;
                if (!keyStore[keyName]) keyStore[keyName]={};
                if (!keyStore[keyName][task]) keyStore[keyName][task]={};
                const entry = keyStore[keyName][task];
                const durI = durIdx >= 0 ? cols[durIdx] : '';
                const esI  = esIdx  >= 0 ? cols[esIdx]  : '';
                const efI  = efIdx  >= 0 ? cols[efIdx]  : '';
                const lsI  = lsIdx  >= 0 ? cols[lsIdx]  : '';
                const lfI  = lfIdx  >= 0 ? cols[lfIdx]  : '';
                const slackI = slackIdx >= 0 ? cols[slackIdx] : '';

                entry.len = parseNum(durI);
                entry.es = parseNum(esI);
                entry.ef = parseNum(efI);
                entry.ls = parseNum(lsI);
                entry.lf = parseNum(lfI);
                entry.slack = parseNum(slackI);
            }
            console.log('CSV answer key loaded, entries:', Object.keys(window.MichaelAnswerKey).length);
        } catch (e) {
            console.warn('Failed to load CSV answer key', e);
        }
    }

    function getUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    class UIController {
        
        constructor() {
    

            // BIGYAN: read mode/level from URL (start / practice / test)
            this.mode = getUrlParam('mode') || 'start';
            this.level = getUrlParam('level') || null;

            this.checkButton = document.getElementById('check-btn');
            this.graphContainer = document.getElementById('graph-container');

            this.soundManager = new SoundManager();
            this.animationManager = new AnimationManager(this.soundManager);
            this.graphRenderer = new GraphRenderer(this.graphContainer);

            //obtain initial layout via chartgen if available
            let gen = (typeof window.generateLayout === 'function')
                ? window.generateLayout()
                : (window.lastGeneratedLayout || null);
            if (gen && gen.tasks) {
                window.lastGeneratedLayout = gen;
                this.taskData = gen.tasks;
            } else {
                this.taskData = {};
            }

            if (gen && gen.tasks && typeof PertMathEngine !== 'undefined') {
                try {
                    const engine = PertMathEngine.getInstance();
                    const mathResult = engine.computeTimes(gen.tasks);
                    // For now, just log it so you can see it's working
                    console.log('PertMathEngine computed times:', mathResult);

                    // BIGYAN: Validate computed answers vs CSV key
                    if (typeof KeyValidator !== 'undefined' && window.MichaelAnswerKey) {
                        const keyInfo = this._findAnswerKeyForLayout(gen, window.MichaelAnswerKey);
                        if (keyInfo && keyInfo.entry) {
                            KeyValidator.validate(gen.tasks, keyInfo.entry);
                        } else {
                            console.warn('[KeyValidator] No matching answer key found for this layout.');
                        }
                    }

                } catch (e) {
                    console.error('Error running PertMathEngine:', e);
                }
            }
            // BIGYAN: Start Test Mode timer when quiz is ready
            if (this.mode === 'test' && typeof TestMode !== 'undefined') {
                TestMode.startTimer();
            }



            this.graphRenderer.drawEmptyQuiz(this.taskData);

            this.isTryMode=false; //false waiting for check true try again mode
            this.checkButton.addEventListener('click', () => this.onCheckClick());
            // [Ananda] Setup Audio Toggle Button
            this.audioButton = document.getElementById('audio-btn');
            if (this.audioButton) {
                this.audioButton.addEventListener('click', () => {
                    console.log("Audio button clicked, current mute state:", this.soundManager.isMuted);
                    const status = this.soundManager.toggleMute();
                    this.audioButton.textContent = status;
                    console.log("New mute state:", this.soundManager.isMuted, "Button text:", status);
                });
            } else {
                console.error("Audio button not found!");
            }
            console.log("UIController initialized. App is running.");
        }

        //helper to find best match in keyStore for this layout and dataset combination
        _findAnswerKeyForLayout(gen, keyStore) {
            //prefer direct index naming layoutname data setindex
            try {
                const layoutName = gen.layoutName;
                const setIndex=gen.setIndex; //which preset data set 1 to 10
                const compact=gen.compact; //example a5b3c2

                if (layoutName && setIndex) {
                    const byIndex = `${layoutName}data${setIndex}`;
                    if (keyStore[byIndex]) return { keyName: byIndex, entry: keyStore[byIndex] };
                }

                //otherwise try to match compact lengths build lengths string for candidate and compare
                if (compact) {
                    //parse compact into map of lengths a5 b3 etc
                    const compactMap={};
                    //compact format used elsewhere is example a5b3c2d4e6f1g7
                    compact.replace(/([a-g])(\d{1,2})/g, (m, letter, num) => { compactMap[letter.toUpperCase()] = Number(num); return ''; });

                    for (const keyName of Object.keys(keyStore)) {
                        if (!keyName.startsWith((gen.layoutName||'').toLowerCase())) continue;
                        const entry = keyStore[keyName];
                        let match = true;
                        for (const t of ['A','B','C','D','E','F','G']) {
                            const expectedLen = compactMap[t];
                            const keyLen = entry[t] && entry[t].len;
                            if (expectedLen !== undefined && keyLen != null && Number(keyLen) !== Number(expectedLen)) { match = false; break; }
                        }
                        if (match) return { keyName, entry };
                    }
                }

                //fallback if a single key for the layout exists return the first one
                if (gen.layoutName) {
                    const lower = gen.layoutName.toLowerCase();
                    for (const k of Object.keys(keyStore)) {
                        if (k.startsWith(lower)) return { keyName: k, entry: keyStore[k] };
                    }
                }
            } catch (e) { console.warn('Error in key matching', e); }
            return null;
        }

        /**
         * BIGYAN (Test Mode): Render a simple ES/EF/LS/LF/Slack answer table
         * inside the existing #task-table container so students can review
         * the correct values after submitting in Test Mode.
         */
        _renderAnswerTable(correctAnswers, fieldsToCheck) {
            if (!correctAnswers) return;
            const container = document.getElementById('task-table');
            if (!container) return;

            const ids = Object.keys(correctAnswers || {});
            if (!ids.length) return;

            // Simple HTML table; we rely on default styling from the page.
            let html = '<h3 style="margin-top:8px;">Correct Answers (Test Mode)</h3>';
            html += '<table class="pert-answer-table"><thead><tr>';
            html += '<th>Task</th>';
            html += '<th>len</th>';

            (fieldsToCheck || []).forEach(f => {
                const label = f.toUpperCase();
                html += `<th>${label}</th>`;
            });

            html += '</tr></thead><tbody>';

            ids.sort().forEach(id => {
                const t = correctAnswers[id] || {};
                html += '<tr>';
                html += `<td>${id}</td>`;
                html += `<td>${t.len != null ? t.len : ''}</td>`;
                (fieldsToCheck || []).forEach(f => {
                    const v = t[f];
                    html += `<td>${v != null ? v : ''}</td>`;
                });
                html += '</tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html;
        }

        onCheckClick() {
            //if currently in try again mode reset the quiz with a new layout
            if (this.isTryMode) {
                console.log("Try Again clicked — regenerating layout and clearing inputs.");
                this.soundManager.playSound('click');
                //clear current feedback and inputs
                this.graphRenderer.clearFeedback();
                this.graphRenderer.clearInputs();

                //generate new layout via chartgen and rerender
                try {
                    const gen2 = (typeof window.generateLayout === 'function')
                        ? window.generateLayout()
                        : (window.lastGeneratedLayout || null);
                    if (gen2 && gen2.tasks) {
                        window.lastGeneratedLayout = gen2;
                        this.taskData = gen2.tasks;
                    } else {
                        this.taskData = {};
                    }
                } catch (e) {
                    this.taskData = {};
                }
                this.graphRenderer.drawEmptyQuiz(this.taskData);


                //Call my engiene


                //flip mode back to check
                this.isTryMode=false;
                this.checkButton.textContent='Check';
                return;
            }

            //normal check flow
            console.log("Check button clicked.");
            this.graphRenderer.clearFeedback();
            
            //remove any previous expected hints
            document.querySelectorAll('.expected-hint').forEach(h => h.remove());

            let correctAnswers={};

            //find the right key entry
            try
            {
                if (typeof window.MichaelAnswerKey === 'object')
                {
                    const keyStore=window.MichaelAnswerKey;
                    const gen = window.lastGeneratedLayout || null;

                    if (keyStore && gen && (gen.layoutName || gen.setIndex))
                    {
                        const found=this._findAnswerKeyForLayout(gen, keyStore);
                        if (found)
                        {
                            console.log('Answer key matched:', found.keyName, '(Layout:', gen.layoutName, 'Set:', gen.setIndex + ')');
                            //map the stored key object to the same shape used by grader
                            const mapped={};
                            for (const tid of Object.keys(found.entry))
                            {
                                const src=found.entry[tid];
                                mapped[tid]=
                                {
                                    id:tid,
                                    len:src.len!=null ? Number(src.len) : (correctAnswers[tid] && correctAnswers[tid].len),
                                    es:src.es!=null ? Number(src.es) : (correctAnswers[tid] && correctAnswers[tid].es),
                                    ef:src.ef!=null ? Number(src.ef) : (correctAnswers[tid] && correctAnswers[tid].ef),
                                    ls:src.ls!=null ? Number(src.ls) : (correctAnswers[tid] && correctAnswers[tid].ls),
                                    lf:src.lf!=null ? Number(src.lf) : (correctAnswers[tid] && correctAnswers[tid].lf),
                                    slack:src.slack!=null ? Number(src.slack) : (correctAnswers[tid] && correctAnswers[tid].slack),
                                    pred:(correctAnswers[tid] && correctAnswers[tid].pred) || [],
                                    succ:(correctAnswers[tid] && correctAnswers[tid].succ) || []
                                };
                            }
                            //use the key as the authoritative correctanswers for grading
                            correctAnswers=mapped;
                        }
                        else
                        {
                                console.log('No matching answer key entry found for this layout.');
                            }
                        }
                }
            }
            catch (e)
            {
                console.warn('Error using CSV answer key', e);
            }

            //if not yet computed then compute using engine
            if (!correctAnswers || Object.keys(correctAnswers).length===0)
            {
                if (typeof PertMathEngine !== 'undefined')
                {
                    try
                    {
                        const engine = PertMathEngine.getInstance();
                        const mathResult = engine.computeTimes(this.taskData || {});
                        correctAnswers = mathResult.tasks || {};
                    }
                    catch (e) {
                        console.error('Error computing answers', e);
                        correctAnswers={};
                    }
                }
            }

            let allCorrect=true;
            let correctCount=0; // per-task completely correct
            let blankCount=0;  // per-task with any field blank
            let totalTasks=0;  // number of tasks

            // BIGYAN (Test Mode): field-level counters so partial answers get partial credit
            let fieldCorrectCount = 0; // number of individual fields correct
            let fieldTotalCount   = 0; // total number of fields checked

            //full field grading check es ef ls lf slack
            const fieldsToCkeck=['es','ef','ls','lf','slack'];
            for (const taskId in correctAnswers)
            {
                totalTasks++;
                const task=correctAnswers[taskId];
                const userAnswers=this.graphRenderer.getUserAnswers(taskId);

                let taskCorrect=true;
                let taskBlank=false;

                for (const field of fieldsToCkeck)
                {
                    // Track every field that we grade (for Test Mode scoring)
                    fieldTotalCount++;
                    const val=(userAnswers[field] || '').toString().trim();
                    const expected=task[field];
                    const numVal=val===''?0:Number(val);
                    if (!Number.isNaN(numVal) && !Number.isNaN(Number(expected)))
                    {
                        if (numVal===Number(expected))
                        {
                            // This field is correct
                            fieldCorrectCount++;
                            this.graphRenderer.showFeedback(taskId, field, true);
                            //remove any expected hint
                            const inp=document.getElementById(`task-${taskId}-${field}`);
                            if (inp)
                            {
                                const hint=inp.parentElement.querySelector('.expected-hint');
                                if (hint) hint.remove();
                            }
                        }
                        else
                        {
                            this.graphRenderer.showFeedback(taskId, field, false);
                            taskCorrect=false;
                            //show expected value hint
                            try
                            {
                                const inp=document.getElementById(`task-${taskId}-${field}`);
                                if (inp)
                                {
                                    let hint=inp.parentElement.querySelector('.expected-hint');
                                    if (!hint)
                                    {
                                        hint=document.createElement('span');
                                        hint.className='expected-hint';
                                        inp.parentElement.appendChild(hint);
                                    }
                                    hint.textContent=`→ ${expected}`;
                                }
                            }
                            catch (e) { /*ignore*/ }
                        }
                        if (val==='')
                        {
                            taskBlank=true;
                        }
                    }
                    else
                    {
                        if (val==expected)
                        {
                            // This field is correct (non-numeric comparison)
                            fieldCorrectCount++;
                            this.graphRenderer.showFeedback(taskId, field, true);
                            const inp=document.getElementById(`task-${taskId}-${field}`);
                            if (inp)
                            {
                                const hint=inp.parentElement.querySelector('.expected-hint');
                                if (hint) hint.remove();
                            }
                        }
                        else
                        {
                            this.graphRenderer.showFeedback(taskId, field, false);
                            taskCorrect=false;
                            try
                            {
                                const inp=document.getElementById(`task-${taskId}-${field}`);
                                if (inp)
                                {
                                    let hint=inp.parentElement.querySelector('.expected-hint');
                                    if (!hint)
                                    {
                                        hint=document.createElement('span');
                                        hint.className='expected-hint';
                                        inp.parentElement.appendChild(hint);
                                    }
                                    hint.textContent=`→ ${expected}`;
                                }
                            }
                            catch (e) { /*ignore*/ }
                        }
                        if (val==='')
                        {
                            taskBlank=true;
                        }
                    }
                }

                //user must provide answers grading will compare against computed values

                if (taskBlank) blankCount++;
                if (taskCorrect) correctCount++;
                if (!taskCorrect) allCorrect=false;
            }

            // BIGYAN: Test Mode scoring based on *fields* correct and time taken
            if (this.mode === 'test' && typeof TestMode !== 'undefined') {
                const elapsed = TestMode.stopTimer();

                // Use fine-grained field-level accuracy for scoring in Test Mode
                const totalCount = fieldTotalCount;
                const score = TestMode.calculateScore({
                    correctCount: fieldCorrectCount,
                    totalCount: totalCount,
                    timeSeconds: elapsed
                });
                const passed = TestMode.isPass(score);
                TestMode.showResult({
                    score,
                    elapsed,
                    correctCount: fieldCorrectCount,
                    totalCount: totalCount,
                    passed
                });

                // Additionally, display a table of correct answers for review in Test Mode
                this._renderAnswerTable(correctAnswers, fieldsToCkeck);
            }



            
            // Visual & audio feedback (game mode only; animations are skipped in Test Mode)
            if (this.mode !== 'test') {
if (allCorrect)
            {
                console.log("All answers correct! Playing animation.");
                this.animationManager.playCriticalPathAnimation(correctAnswers);
                this.soundManager.playSound('success_chime');
            }
            else
            {
                //play error sound when user gets something wrong
                const errorSound=new Audio('michael/images/Mario Fall.mp3');
                errorSound.play().catch(e => console.warn('Could not play error sound', e));
            }

            // [Ananda] Trigger Visual & Audio Feedback
            if (allCorrect) {
                console.log("All answers correct! Playing animation.");
                // Trigger your success animation & sound
                this.animationManager.playCriticalPathAnimation(correctAnswers);
                this.soundManager.playSound('success_chime');
            } else {
                // Trigger your error animation (Dragon) & sound
                this.animationManager.triggerError();
                this.soundManager.playSound('error');
            }

            
            }
//after a check toggle to try again mode so user can get a new random layout
            this.isTryMode=true;
            this.checkButton.textContent='Try Again';
        }
        
    }

    (async () => {
        await loadCSVAnswerKey();
        new UIController();
    })();
});
