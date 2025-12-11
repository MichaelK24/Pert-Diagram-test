//main js
//michael king
//handles quiz logic answer checking and csv loading
/*
[Ananda]: Implemented UIController interaction, Audio toggle logic, 
 and the 'Check' button validation workflow.*/

document.addEventListener('DOMContentLoaded', () => {

    //load authoritative answers from the csv file if present and merge into window michaelanswer key using the same structure the grader expects
    async function loadCSVAnswerKey() {
        try {
            const resp = await fetch('michael/PERTkey.csv');
            if (!resp.ok) return;
            const text = await resp.text();
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length>0);
            if (lines.length === 0) return;
            const header = lines[0].split(',').map(h=>h.trim());
            const idx = (col) => header.indexOf(col);
            const layoutI = idx('Layout');
            const setI = idx('Set');
            const taskI = idx('Task');
            const durI = idx('Duration');
            const esI = idx('ES');
            const efI = idx('EF');
            const lsI = idx('LS');
            const lfI = idx('LF');
            const slackI = idx('Slack');

            window.MichaelAnswerKey = window.MichaelAnswerKey || {};

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c=>c.trim());
                if (cols.length < 3) continue;
                const layout = cols[layoutI] || '';
                const setnum = cols[setI] || '';
                const task = (cols[taskI] || '').toUpperCase();
                if (!layout || !setnum || !task) continue;

                const keyName = `${layout}data${setnum}`;
                if (!window.MichaelAnswerKey[keyName]) window.MichaelAnswerKey[keyName] = {};
                const entry = window.MichaelAnswerKey[keyName];
                //ensure task object exists
                if (!entry[task]) entry[task] = { len: null, es: null, ef: null, ls: null, lf: null, slack: null };

                //parse numeric values where possible
                const parseNum = (j) => {
                    if (j < 0 || j >= cols.length) return null;
                    const v = cols[j];
                    if (v === undefined || v === '') return null;
                    const n = Number(v);
                    return Number.isNaN(n) ? v : n;
                };

                entry[task].len = parseNum(durI);
                entry[task].es = parseNum(esI);
                entry[task].ef = parseNum(efI);
                entry[task].ls = parseNum(lsI);
                entry[task].lf = parseNum(lfI);
                entry[task].slack = parseNum(slackI);
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
            let gen = (typeof window.generateLayout === 'function') ? window.generateLayout() : (window.lastGeneratedLayout || null);
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

        //find the best matching answer key entry for a generated layout
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
                    const gen2 = (typeof window.generateLayout === 'function') ? window.generateLayout() : (window.lastGeneratedLayout || null);
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
                const keyStore=window.MichaelAnswerKey;
                const gen=window.lastGeneratedLayout || {};
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
            catch (e)
            {
                console.warn('Answer key lookup failed', e);
            }
            
            let allCorrect=true;
            let correctCount=0; //per task correct
            let blankCount=0; //per task blank any field blank
            let totalTasks=0;

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
                    const val=(userAnswers[field] || '').toString().trim();
                    const expected=task[field];
                    const numVal=val===''?0:Number(val);
                    if (!Number.isNaN(numVal) && !Number.isNaN(Number(expected)))
                    {
                        if (numVal===Number(expected))
                        {
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
                            catch (e) { }
                        }
                    }
                    else
                    {
                        if (val==expected)
                        {
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
                    }
                }

                //user must provide answers grading will compare against computed values

                if (taskBlank) blankCount++;
                if (taskCorrect) correctCount++;
                if (!taskCorrect) allCorrect=false;
            }

            // BIGYAN: Test Mode scoring based on tasks correct and time taken
            if (this.mode === 'test' && typeof TestMode !== 'undefined') {
                const elapsed = TestMode.stopTimer();
                const totalCount = totalTasks;
                const score = TestMode.calculateScore({
                    correctCount: correctCount,
                    totalCount: totalCount,
                    timeSeconds: elapsed
                });
                const passed = TestMode.isPass(score);
                TestMode.showResult({
                    score,
                    elapsed,
                    correctCount,
                    totalCount,
                    passed
                });
            }



            
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