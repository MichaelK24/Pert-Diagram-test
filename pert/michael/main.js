//main js
//michael king
//handles quiz logic answer checking and csv loading

document.addEventListener('DOMContentLoaded', () => {

    //loads correct answers from csv file for grading student inputs
    async function loadCSVAnswerKey()
    {
        try {
            const resp = await fetch('michael/PERTkey.csv');
            if (!resp.ok) return;
            const text = await resp.text();
            //parse csv rows and find column positions
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

            //store answers organized by layout and data set
            window.MichaelAnswerKey = window.MichaelAnswerKey || {};

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c=>c.trim());
                if (cols.length < 3) continue;
                const layout = cols[layoutI] || '';
                const setnum = cols[setI] || '';
                const task = (cols[taskI] || '').toUpperCase();
                if (!layout || !setnum || !task) continue;

                //build key name like classicdata1 paralleldata5 etc
                const keyName = `${layout}data${setnum}`;
                if (!window.MichaelAnswerKey[keyName]) window.MichaelAnswerKey[keyName] = {};
                const entry = window.MichaelAnswerKey[keyName];
                if (!entry[task]) entry[task] = { len: null, es: null, ef: null, ls: null, lf: null, slack: null };

                //convert csv strings to numbers
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

    //ANADAS WORK START - basic structure
    class UIController
    {
        constructor()
        {
    
            //ANADAS WORK START
            this.checkButton = document.getElementById('check-btn');
            this.graphContainer = document.getElementById('graph-container');
            //ANADAS WORK END

            //ANADAS WORK START
            this.soundManager = new SoundManager();
            this.animationManager = new AnimationManager(this.soundManager);
            this.graphRenderer = new GraphRenderer(this.graphContainer);
            //ANADAS WORK END

            //get a random pert chart layout to quiz the user on
            let gen = (typeof window.generateLayout === 'function') ? window.generateLayout() : (window.lastGeneratedLayout || null);
            if (gen && gen.tasks) {
                window.lastGeneratedLayout = gen;
                this.taskData = gen.tasks;
            } else {
                this.taskData = {};
            }

            //ANADAS WORK START
            this.graphRenderer.drawEmptyQuiz(this.taskData);
            //ANADAS WORK END

            //tracks if button shows check or try again
            this.isTryMode=false;
            //ANADAS WORK START
            this.checkButton.addEventListener('click', () => this.onCheckClick());
            console.log("UIController initialized. App is running.");
            //ANADAS WORK END
        }

        //matches the generated chart to correct answers in the csv
        findAnswerKeyForLayout(gen, keyStore) {
            //try matching by layout name and set number first
            try {
                const layoutName = gen.layoutName;
                const setIndex=gen.setIndex; //which preset data set 1 to 10
                const compact=gen.compact; //example a5b3c2

                if (layoutName && setIndex) {
                    const byIndex = `${layoutName}data${setIndex}`;
                    if (keyStore[byIndex]) return { keyName: byIndex, entry: keyStore[byIndex] };
                }

                //fallback match by comparing task durations
                if (compact) {
                    //extract durations from compact string like a4b8c2
                    const compactMap={};
                    compact.replace(/([a-g])(\d{1,2})/g, (m, letter, num) => { compactMap[letter.toUpperCase()] = Number(num); return ''; });

                    //find answer key with matching layout and durations
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

                //last resort just use first key for this layout type
                if (gen.layoutName) {
                    const lower = gen.layoutName.toLowerCase();
                    for (const k of Object.keys(keyStore)) {
                        if (k.startsWith(lower)) return { keyName: k, entry: keyStore[k] };
                    }
                }
            } catch (e) { console.warn('Error in key matching', e); }
            return null;
        }

        //ANADAS WORK START - basic check logic structure
        onCheckClick()
        {
            //try again button generates new random layout
            if (this.isTryMode)
            {
                console.log("Try Again clicked — regenerating layout and clearing inputs.");
                this.soundManager.playSound('click');
                this.graphRenderer.clearFeedback();
                this.graphRenderer.clearInputs();

                //make a fresh chart for the user
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

                //switch button back to check mode
                this.isTryMode=false;
                this.checkButton.textContent='Check';
                return;
            }

            //ANADAS WORK START - normal check flow
            console.log("Check button clicked.");
            //ANADAS WORK START
            this.graphRenderer.clearFeedback();
            //ANADAS WORK END
            
            //clear old answer hints from previous check
            document.querySelectorAll('.expected-hint').forEach(h => h.remove());

            let correctAnswers={};

            //load the answer key for this specific chart
            try
            {
                const keyStore=window.MichaelAnswerKey;
                const gen=window.lastGeneratedLayout || {};
                if (keyStore && gen && (gen.layoutName || gen.setIndex))
                {
                    const found=this.findAnswerKeyForLayout(gen, keyStore);
                    if (found)
                    {
                        console.log('Answer key matched:', found.keyName, '(Layout:', gen.layoutName, 'Set:', gen.setIndex + ')');
                        //convert csv data into format needed for grading
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
            
            //ANADAS WORK START - validation logic
            //track grading stats
            let allCorrect=true;
            let correctCount=0;
            let blankCount=0;
            let totalTasks=0;

            //ANADAS WORK START
            const fieldsToCkeck=['es','ef','ls','lf','slack'];
            //ANADAS WORK END
            for (const taskId in correctAnswers)
            {
                totalTasks++;
                const task=correctAnswers[taskId];
                //ANADAS WORK START
                const userAnswers=this.graphRenderer.getUserAnswers(taskId);
                //ANADAS WORK END

                let taskCorrect=true;
                let taskBlank=false;

                //check each input field for this task
                for (const field of fieldsToCkeck)
                {
                    const val=(userAnswers[field] || '').toString().trim();
                    const expected=task[field];
                    const numVal=val===''?0:Number(val);
                    //compare user answer to correct answer
                    if (!Number.isNaN(numVal) && !Number.isNaN(Number(expected)))
                    {
                        if (numVal===Number(expected))
                        {
                            //ANADAS WORK START
                            this.graphRenderer.showFeedback(taskId, field, true);
                            //ANADAS WORK END
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
                            //display correct answer next to wrong input
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

                if (taskBlank) blankCount++;
                if (taskCorrect) correctCount++;
                if (!taskCorrect) allCorrect=false;
            }
            
            //ANADAS WORK START - success handling
            if (allCorrect)
            {
                console.log("All answers correct! Playing animation.");
                //ANADAS WORK START
                this.animationManager.playCriticalPathAnimation(correctAnswers);
                //ANADAS WORK END
                //ANADAS WORK START
                this.soundManager.playSound('success_chime');
                //ANADAS WORK END
            }
            //ANADAS WORK END
            else
            {
                //play mario fall sound for wrong answers
                const errorSound=new Audio('michael/images/Mario Fall.mp3');
                errorSound.play().catch(e => console.warn('Could not play error sound', e));
            }

            //switch button to try again after grading
            this.isTryMode=true;
            this.checkButton.textContent='Try Again';
        }
        //ANADAS WORK END
    }
    //ANADAS WORK END

    (async () => {
        await loadCSVAnswerKey();
        new UIController();
    })();
});