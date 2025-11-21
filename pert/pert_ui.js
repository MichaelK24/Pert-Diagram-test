//abstract base class for arrow rendering strategy
class ArrowRenderer
{
    //abstract method must be overridden by subclasses
    draw(svg, fromEl, toEl, parentRect)
    {
        throw new Error('abstract method draw must be implemented by subclass');
    }

    //helper to get coordinates relative to parent
    _getCoords(el, parentRect, edge)
    {
        const rect = el.getBoundingClientRect();
        const x = (rect.left - parentRect.left) + (edge === 'right' ? rect.width - 6 : 6);
        const y = (rect.top - parentRect.top) + rect.height / 2;
        return { x, y };
    }
}

//concrete implementation curved bezier arrows
class CurvedArrowRenderer extends ArrowRenderer
{
    draw(svg, fromEl, toEl, parentRect)
    {
        const svgNS = 'http://www.w3.org/2000/svg';
        const from = this._getCoords(fromEl, parentRect, 'right');
        const to = this._getCoords(toEl, parentRect, 'left');

        const dx = Math.max(20, Math.abs(to.x - from.x) / 2);
        const cx1 = from.x + dx;
        const cx2 = to.x - dx;

        const path = document.createElementNS(svgNS, 'path');
        const d = `M ${from.x} ${from.y} C ${cx1} ${from.y} ${cx2} ${to.y} ${to.x} ${to.y}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#000');
        path.setAttribute('fill', 'none');
        path.classList.add('arrow-line');
        svg.appendChild(path);
        return path;
    }
}

//concrete implementation straight line arrows
class StraightArrowRenderer extends ArrowRenderer
{
    draw(svg, fromEl, toEl, parentRect)
    {
        const svgNS = 'http://www.w3.org/2000/svg';
        const from = this._getCoords(fromEl, parentRect, 'right');
        const to = this._getCoords(toEl, parentRect, 'left');

        const path = document.createElementNS(svgNS, 'path');
        const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#000');
        path.setAttribute('fill', 'none');
        path.classList.add('arrow-line');
        svg.appendChild(path);
        return path;
    }
}

//concrete implementation stepped arrows
class SteppedArrowRenderer extends ArrowRenderer
{
    draw(svg, fromEl, toEl, parentRect)
    {
        const svgNS = 'http://www.w3.org/2000/svg';
        const from = this._getCoords(fromEl, parentRect, 'right');
        const to = this._getCoords(toEl, parentRect, 'left');

        const midX = (from.x + to.x) / 2;

        const path = document.createElementNS(svgNS, 'path');
        const d = `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#000');
        path.setAttribute('fill', 'none');
        path.classList.add('arrow-line');
        svg.appendChild(path);
        return path;
    }
}

class GraphRenderer
{
    constructor(graphContainer)
    {
        this.container = graphContainer;
        this.currentTasks = null;
        this.resizeTimeout = null;
        
        //dynamic binding arrow renderer selected at runtime
        this.arrowRenderer = this._selectArrowRenderer();
        
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

    //runtime polymorphic selection of arrow rendering strategy
    _selectArrowRenderer()
    {
        //always use curved arrows for smooth appearance
        console.log('arrow renderer curved bezier selected');
        return new CurvedArrowRenderer();
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
                <div class="es"><input type="text" id="task-${task.id}-es"></div>
                <div class="dur">${task.len}</div>
                <div class="ef"><input type="text" id="task-${task.id}-ef"></div>
                <div class="task-name">${task.id}</div>
                <div class="ls"><input type="text" id="task-${task.id}-ls"></div>
                <div class="slack"><input type="text" id="task-${task.id}-slack"></div>
                <div class="lf"><input type="text" id="task-${task.id}-lf"></div>
            `;
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

        //use polymorphic arrow renderer to draw connections
        const parentRect = this.container.getBoundingClientRect();
        for (const taskId in tasks)
        {
            const task = tasks[taskId];
            const toEl = document.getElementById(`task-${task.id}`);
            if (!task.pred || task.pred.length === 0) continue;
            
            for (const pred of task.pred)
            {
                const fromEl = document.getElementById(`task-${pred}`);
                if (!fromEl) continue;
                
                //dynamic dispatch to selected arrow renderer
                this.arrowRenderer.draw(svg, fromEl, toEl, parentRect);
            }
        }

        //populate the task table bottom left with task len pred
        const table = document.getElementById('task-table');
        if (table) {
            let lines = [];
            lines.push('Task  Len  Pred');
            for (const tid of Object.keys(tasks)) {
                const t = tasks[tid];
                const preds = (t.pred && t.pred.length) ? t.pred.join(',') : '-';
                lines.push(`${t.id}     ${t.len}    ${preds}`);
            }
            table.innerHTML = '<pre>' + lines.join('\n') + '</pre>';
        }
    }

    _redrawArrows(tasks)
    {
        //find existing svg
        const svg = document.getElementById('arrow-svg');
        if (!svg) return;

        //clear existing paths
        const paths = svg.querySelectorAll('path');
        paths.forEach(p => p.remove());

        //redraw all arrows using polymorphic renderer
        const parentRect = this.container.getBoundingClientRect();
        for (const taskId in tasks)
        {
            const task = tasks[taskId];
            const toEl = document.getElementById(`task-${task.id}`);
            if (!task.pred || task.pred.length === 0) continue;
            
            for (const pred of task.pred)
            {
                const fromEl = document.getElementById(`task-${pred}`);
                if (!fromEl) continue;
                
                //dynamic dispatch to arrow renderer
                this.arrowRenderer.draw(svg, fromEl, toEl, parentRect);
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

class AnimationManager {
    constructor(soundManager) {
        this.soundManager = soundManager;
    }
    
    playCriticalPathAnimation(correctTasks) {
        for (const taskId in correctTasks) {
            if (correctTasks[taskId].slack === 0) {
                const nodeElement = document.getElementById(`task-${taskId}`);
                if (nodeElement) {
                    nodeElement.classList.add('critical-highlight');
                }
            }
        }
    }
}

class SoundManager {
    playSound(soundName) {

        console.log(`%cSOUND: Playing '${soundName}'`, 'color: blue; font-weight: bold;');
    }
}