//pert ui js
//michael king
//handles graph rendering animation and sound management

/*Ananda: AnimationManager (Confetti/Dragon), 
 and SoundManager classes. Implemented the visual feedback system. */

class GraphRenderer {
    constructor(graphContainer) {
        this.container = graphContainer;
        this.currentTasks = null;
        this.resizeTimeout = null;
        
        //add resize handler to redraw arrows
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                if (this.currentTasks) {
                    this._redrawArrows(this.currentTasks);
                }
            }, 100);
        });
    }

    drawEmptyQuiz(tasks) {
        //clear existing
        this.container.innerHTML='';
        this.currentTasks = tasks;

        //create an svg overlay for arrows
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'pert-arrows');
        svg.setAttribute('id', 'arrow-svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.pointerEvents='none';

        //no arrowheads plain lines keep defs available for future styles if needed
        const defs = document.createElementNS(svgNS, 'defs');
        svg.appendChild(defs);

        this.container.appendChild(svg);

        //create nodes
        for (const taskId in tasks) {
            const task = tasks[taskId];
            const nodeElement = document.createElement('div');
            nodeElement.className = 'pert-node';
            nodeElement.id = `task-${task.id}`;
            nodeElement.style.left = task.x;
            nodeElement.style.top = task.y;

            nodeElement.innerHTML = `
                <div class="es"><input type="text" pattern="[0-9]*" placeholder="0" id="task-${task.id}-es"></div>
                <div class="dur">${task.len}</div>
                <div class="ef"><input type="text" pattern="[0-9]*" placeholder="0" id="task-${task.id}-ef"></div>
                <div class="task-name">${task.id}</div>
                <div class="ls"><input type="text" pattern="[0-9]*" placeholder="0" id="task-${task.id}-ls"></div>
                <div class="slack"><input type="text" pattern="[0-9]*" placeholder="0" id="task-${task.id}-slack"></div>
                <div class="lf"><input type="text" pattern="[0-9]*" placeholder="0" id="task-${task.id}-lf"></div>
            `.replace(/\n\s*/g, '');
            this.container.appendChild(nodeElement);
        }

        //after nodes are in dom relax positions to avoid vertical overlap
        this._relaxNodePositions();

        //after nodes are in dom draw arrows between predecessors
        //small helper to get center coordinates of a node
        const getCenter = (el) => {
            const rect = el.getBoundingClientRect();
            const parentRect = this.container.getBoundingClientRect();
            const x = rect.left - parentRect.left + rect.width/2;
            const y = rect.top - parentRect.top + rect.height/2;
            return { x, y };
        };

        for (const taskId in tasks) {
            const task = tasks[taskId];
            const toEl = document.getElementById(`task-${task.id}`);
            if (!task.pred || task.pred.length === 0) continue;
            for (const pred of task.pred) {
                const fromEl = document.getElementById(`task-${pred}`);
                if (!fromEl) continue;
                //compute edge endpoints right center of fromel to left center of toel
                const rFrom = fromEl.getBoundingClientRect();
                const rTo = toEl.getBoundingClientRect();
                const parentRect = this.container.getBoundingClientRect();
                const x1 = (rFrom.left - parentRect.left) + rFrom.width - 6; //right edge
                const y1 = (rFrom.top - parentRect.top) + rFrom.height/2;
                const x2 = (rTo.left - parentRect.left) + 6; //left edge
                const y2 = (rTo.top - parentRect.top) + rTo.height/2;

                //draw a curved path for nicer appearance
                const dx = Math.max(20, Math.abs(x2 - x1) / 2);
                const cx1 = x1 + dx;
                const cx2 = x2 - dx;
                const path = document.createElementNS(svgNS, 'path');
                const d = `M ${x1} ${y1} C ${cx1} ${y1} ${cx2} ${y2} ${x2} ${y2}`;
                path.setAttribute('d', d);
                path.setAttribute('stroke', '#000');
                path.setAttribute('fill', 'none');
                path.classList.add('arrow-line');
                //no marker end plain line without arrow tip
                svg.appendChild(path);
            }
        }

        //populate the task table bottom left with task len pred
        const table = document.getElementById('task-table');
        if (table) {
            let lines = [];
            lines.push('Task  Len  Pred');
            for (const tid of Object.keys(tasks)) {
                const t = tasks[tid];
                const preds = (t.pred && t.pred.length) ? t.pred.join(',') : '-';
                lines.push(`${t.id}     ${t.len}    ${preds}`);
            }
            table.innerHTML = '<pre>' + lines.join('\n') + '</pre>';
        }
    }

    _redrawArrows(tasks) {
        //find existing svg
        const svg = document.getElementById('arrow-svg');
        if (!svg) return;

        //clear existing paths
        const paths = svg.querySelectorAll('path');
        paths.forEach(p => p.remove());

        const svgNS = 'http://www.w3.org/2000/svg';

        //redraw all arrows
        for (const taskId in tasks) {
            const task = tasks[taskId];
            const toEl = document.getElementById(`task-${task.id}`);
            if (!task.pred || task.pred.length === 0) continue;
            for (const pred of task.pred) {
                const fromEl = document.getElementById(`task-${pred}`);
                if (!fromEl) continue;
                const rFrom = fromEl.getBoundingClientRect();
                const rTo = toEl.getBoundingClientRect();
                const parentRect = this.container.getBoundingClientRect();
                const x1 = (rFrom.left - parentRect.left) + rFrom.width - 6;
                const y1 = (rFrom.top - parentRect.top) + rFrom.height/2;
                const x2 = (rTo.left - parentRect.left) + 6;
                const y2 = (rTo.top - parentRect.top) + rTo.height/2;

                const dx = Math.max(20, Math.abs(x2 - x1) / 2);
                const cx1 = x1 + dx;
                const cx2 = x2 - dx;
                const path = document.createElementNS(svgNS, 'path');
                const d = `M ${x1} ${y1} C ${cx1} ${y1} ${cx2} ${y2} ${x2} ${y2}`;
                path.setAttribute('d', d);
                path.setAttribute('stroke', '#000');
                path.setAttribute('fill', 'none');
                path.classList.add('arrow-line');
                svg.appendChild(path);
            }
        }
    }

    getUserAnswers(taskId) {
        return {
            es: document.getElementById(`task-${taskId}-es`).value,
            ef: document.getElementById(`task-${taskId}-ef`).value,
            ls: document.getElementById(`task-${taskId}-ls`).value,
            lf: document.getElementById(`task-${taskId}-lf`).value,
            slack: document.getElementById(`task-${taskId}-slack`).value
        };
    }

    showFeedback(taskId, field, isCorrect) {
        const inputElement = document.getElementById(`task-${taskId}-${field}`);
        if (inputElement) {
            inputElement.classList.add(isCorrect ? 'correct' : 'wrong');
        }
    }

    clearFeedback() {
        const inputs = document.querySelectorAll('.pert-node input');
        inputs.forEach(input => {
            input.classList.remove('correct', 'wrong');
        });
        const nodes = document.querySelectorAll('.pert-node');
        nodes.forEach(node => {
            node.classList.remove('critical-highlight');
        });
    }

    clearInputs() {
        const inputs = document.querySelectorAll('.pert-node input');
        inputs.forEach(input => {
            input.value = '';
            input.classList.remove('correct', 'wrong');
        });
    }

    _relaxNodePositions() {
        const nodes = Array.from(this.container.querySelectorAll('.pert-node'));
        if (nodes.length === 0) return;

        const padding=18; //extra vertical breathing room between stacked nodes
        const maxIter = 20;

        for (let iter = 0; iter < maxIter; iter++) {
            let moved=false;

            //recompute metrics each iteration
            const metrics = nodes.map(n => ({
                el: n,
                left: n.offsetLeft,
                top: n.offsetTop,
                w: n.offsetWidth,
                h: n.offsetHeight
            }));

            for (let i = 0; i < metrics.length; i++) {
                for (let j = i + 1; j < metrics.length; j++) {
                    const a = metrics[i];
                    const b = metrics[j];

                    //check if horizontally overlapping same column ish
                    const horizOverlap = a.left < b.left + b.w && a.left + a.w > b.left;
                    if (!horizOverlap) continue;

                    //check vertical overlap
                    const vertOverlap = a.top < b.top + b.h && a.top + a.h > b.top;
                    if (!vertOverlap) {
                        //even if not overlapping ensure minimum vertical gap
                        const gap = Math.abs((a.top + a.h) - b.top);
                        if (gap < padding) {
                            const shift = Math.ceil((padding - gap) / 2);
                            //push the lower one down and the upper one up when possible
                            if (a.top <= b.top) {
                                b.el.style.top = (b.top + shift) + 'px';
                                a.el.style.top = Math.max(0, a.top - shift) + 'px';
                            } else {
                                a.el.style.top = (a.top + shift) + 'px';
                                b.el.style.top = Math.max(0, b.top - shift) + 'px';
                            }
                            moved=true;
                        }
                        continue;
                    }

                    //compute overlap height and separate them evenly
                    const overlap = (a.top + a.h) - b.top;
                    const separateBy = Math.ceil((overlap + padding) / 2);
                    if (separateBy > 0) {
                        //move the lower one down and the upper one up
                        if (a.top <= b.top) {
                            b.el.style.top = (b.top + separateBy) + 'px';
                            a.el.style.top = Math.max(0, a.top - separateBy) + 'px';
                        } else {
                            a.el.style.top = (a.top + separateBy) + 'px';
                            b.el.style.top = Math.max(0, b.top - separateBy) + 'px';
                        }
                        moved=true;
                    }
                }
            }

            if (!moved) break;
        }
    }
}

/* [Ananda] Handles visual updates, confetti, and the dragon popup */
class AnimationManager {
    constructor(soundManager) {
        this.soundManager = soundManager;
        this.successMessages = ["Great Job!", "You got an A!", "Correct!", "Wow Wonderful!", "You're a Star!", "You are on a good track", "Excellent Work!", "You deserve a pizza", "Dr BC is proud!", "Let's celebrate!", "Let's party!", "You nailed it!", "Dr BC is impressed!", "Be Proud of Yourself!", "You rock!"];
        this.errorMessages = ["Check your math!", "Not quite right!", "Almost there!, Don't give up! You can do it!", "Review your calculations!", "Mistakes are proof you're trying!", "Practice makes perfect!", "Errors help you learn!", "Stay positive and try again!", "Every wrong answer is a step closer to the right one!", "Don't be discouraged, keep going!", " Who taught you this?", "You made Dr BC disappointed!", "The dragon is sad now."];
    }   
    playCriticalPathAnimation(correctTasks) {
        // Highlight Critical Path
        for (const taskId in correctTasks) {
            if (correctTasks[taskId].slack === 0) {
                const nodeElement = document.getElementById(`task-${taskId}`);
                if (nodeElement) nodeElement.classList.add('critical-highlight');
            }
        }
        this.triggerPopup(true);
        this.playSuccessConfetti();
    }
    triggerError() {
        this.triggerPopup(false);
    }
    triggerPopup(isSuccess) {
        const overlay = document.getElementById('feedback-overlay');
        const box = document.getElementById('popup-box');
        if(!overlay || !box) return;
        box.className = 'popup-content';
        box.classList.add(isSuccess ? 'success' : 'error');      
        const messages = isSuccess ? this.successMessages : this.errorMessages;
        const msg = messages[Math.floor(Math.random() * messages.length)];     
        if (isSuccess) {
            box.innerHTML = `<div style="font-size: 50px;">🎉</div><h2>Success!</h2><p>${msg}</p>`;
        } else {
            box.innerHTML = `
                <div class="dragon-container">
                    <img src="ananda/dragon.gif" class="dragon-gif" alt="ROAR">
                </div>
                <h2 style="color: #d9534f; font-size: 32px; font-weight: bold;">WRONG!</h2>
                <p>${msg}</p>
            `;
        }
            overlay.style.display = 'flex';
            setTimeout(() => { overlay.style.display = 'none'; }, 6000);
    }
    playSuccessConfetti() {
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff'];
        const container = document.body; 
        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = Math.random() * 2 + 's';
            container.appendChild(piece);
            setTimeout(() => piece.remove(), 4000);
        }
    }
}
