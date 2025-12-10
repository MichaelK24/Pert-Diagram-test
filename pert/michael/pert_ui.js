//pert ui js
//michael king
//handles graph rendering animation and sound management

//base class defines how arrows are drawn between nodes
class ArrowRenderer
{
    //subclasses implement different arrow styles curved straight stepped
    draw(svg, fromEl, toEl, parentRect)
    {
        throw new Error('abstract method draw must be implemented by subclass');
    }

    //calculates arrow connection point on node edge
    getCoords(el, parentRect, edge)
    {
        const rect = el.getBoundingClientRect();
        const x = (rect.left - parentRect.left) + (edge === 'right' ? rect.width - 6 : 6);
        const y = (rect.top - parentRect.top) + rect.height / 2;
        return { x, y };
    }
}

//draws smooth curved arrows using bezier paths
class CurvedArrowRenderer extends ArrowRenderer
{
    draw(svg, fromEl, toEl, parentRect)
    {
        const svgNS = 'http://www.w3.org/2000/svg';
        const from = this.getCoords(fromEl, parentRect, 'right');
        const to = this.getCoords(toEl, parentRect, 'left');

        //control points for bezier curve
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

//draws direct straight line arrows
class StraightArrowRenderer extends ArrowRenderer
{
    draw(svg, fromEl, toEl, parentRect)
    {
        const svgNS = 'http://www.w3.org/2000/svg';
        const from = this.getCoords(fromEl, parentRect, 'right');
        const to = this.getCoords(toEl, parentRect, 'left');

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

//draws arrows with right angle bends like stairs
class SteppedArrowRenderer extends ArrowRenderer
{
    draw(svg, fromEl, toEl, parentRect)
    {
        const svgNS = 'http://www.w3.org/2000/svg';
        const from = this.getCoords(fromEl, parentRect, 'right');
        const to = this.getCoords(toEl, parentRect, 'left');

        //vertical line goes through middle point
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
        
        //polymorphism step 1 store reference to concrete renderer instance
        //this stores object that implements arrowrenderer interface
        //at runtime we can swap curvedarrowrenderer with straightarrowrenderer or steppedarrowrenderer
        //all three implement the same draw method signature but with different behavior
        this.arrowRenderer = this.selectArrowRenderer();
        
        //debounced resize handler prevents excessive redraws during window resize
        //clears previous timeout if user is still resizing
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            //wait 100ms after resize stops before redrawing
            this.resizeTimeout = setTimeout(() => {
                if (this.currentTasks) {
                    //polymorphic call arrows redrawn using whatever renderer instance is stored
                    this.redrawArrows(this.currentTasks);
                }
            }, 100);
        });
    }


    //polymorphism step 2 factory method selects which concrete renderer to instantiate
    //returns object of type curvedarrowrenderer straightarrowrenderer or steppedarrowrenderer
    //all three inherit from arrowrenderer base class and override draw method
    //caller stores returned object in this.arrowrenderer without knowing exact type
    //this method is now just default fallback real selection happens per arrow
    selectArrowRenderer()
    {
        //default to curved but each arrow picks its own based on duration difference
        console.log('arrow renderer using dynamic selection based on task duration');
        return new CurvedArrowRenderer();
    }
    
    //selects arrow renderer based on duration difference between tasks
    //straight for same duration curved for 1 or 2 difference stepped for 3 or more
    selectArrowRendererForPair(fromTask, toTask)
    {
        //get duration values from tasks
        const fromDuration=fromTask.len;
        const toDuration=toTask.len;
        
        //calculate absolute difference
        const diff=Math.abs(fromDuration-toDuration);
        
        //same duration use straight arrow shows equal weight
        if (diff===0) 
            {
            return new StraightArrowRenderer();
        }
        //small difference 1 or 2 units use curved arrow smooth transition
        else if (diff=== 1||diff===2) 
        {
            return new CurvedArrowRenderer();
        }
        //large difference 3 or more use stepped arrow shows big jump
        else {
            return new SteppedArrowRenderer();
        }
    }


    drawEmptyQuiz(tasks)
    {
        this.container.innerHTML='';
        this.currentTasks = tasks;

        //svg layer sits over everything to draw arrow lines
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

        const defs = document.createElementNS(svgNS, 'defs');
        svg.appendChild(defs);

        this.container.appendChild(svg);


        for (const taskId in tasks)
        {
            const task = tasks[taskId];
            const nodeElement = document.createElement('div');
            nodeElement.className = 'pert-node';
            nodeElement.id = `task-${task.id}`;
            nodeElement.style.left = task.x;
            nodeElement.style.top = task.y;

            nodeElement.innerHTML = `
                <div class="es"><input type="text" id="task-${task.id}-es" placeholder="ES"></div>
                <div class="dur">${task.len}</div>
                <div class="ef"><input type="text" id="task-${task.id}-ef" placeholder="EF"></div>
                <div class="task-name">${task.id}</div>
                <div class="ls"><input type="text" id="task-${task.id}-ls" placeholder="LS"></div>
                <div class="slack"><input type="text" id="task-${task.id}-slack" placeholder="Slack"></div>
                <div class="lf"><input type="text" id="task-${task.id}-lf" placeholder="LF"></div>
            `;
            this.container.appendChild(nodeElement);
        }
        //iterative physics simulation pushes overlapping nodes apart
        this.relaxNodePositions();

        //polymorphism step 3 call draw method on stored renderer instance
        //loop through all tasks and draw predecessor arrows
        const parentRect = this.container.getBoundingClientRect();
        for (const taskId in tasks)
        {
            const task = tasks[taskId];
            //get dom element for destination node
            const toEl = document.getElementById(`task-${task.id}`);
            //skip if task has no predecessors no incoming arrows needed
            if (!task.pred || task.pred.length === 0) continue;
            
            //iterate through each predecessor and draw arrow from pred to current task
            for (const pred of task.pred)
            {
                //get dom element for source node
                const fromEl = document.getElementById(`task-${pred}`);
                if (!fromEl) continue;
                
                //get predecessor task object to compare durations
                const fromTask = tasks[pred];
                
                //select appropriate arrow renderer based on duration difference
                //straight if same curved if diff 1 or 2 stepped if diff 3 plus
                const renderer = this.selectArrowRendererForPair(fromTask, task);
                
                //polymorphic method call this is where dynamic dispatch happens
                //javascript runtime looks up which draw method to call based on actual object type
                //now each arrow can use different renderer based on task relationship
                //method signature is identical but implementation differs
                //this is runtime polymorphism aka late binding aka dynamic dispatch
                renderer.draw(svg, fromEl, toEl, parentRect);
            }
        }

        //ANADAS WORK START - populate the task table bottom left with task len pred
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
        }//AANADAS WORK END
    }
  

    //redraws all arrows after window resize or layout change
    //demonstrates polymorphism arrows redrawn with same renderer strategy
    redrawArrows(tasks)
    {
        //find svg overlay layer
        const svg = document.getElementById('arrow-svg');
        if (!svg) return;

        //clear all existing path elements from svg
        const paths = svg.querySelectorAll('path');
        paths.forEach(p => p.remove());

        //recalculate container position in case window moved or resized
        const parentRect = this.container.getBoundingClientRect();
        //iterate through all tasks to reconstruct arrows
        for (const taskId in tasks)
        {
            const task = tasks[taskId];
            const toEl = document.getElementById(`task-${task.id}`);
            if (!task.pred || task.pred.length === 0) continue;
            
            for (const pred of task.pred)
            {
                const fromEl = document.getElementById(`task-${pred}`);
                if (!fromEl) continue;
                
                //get predecessor task to compare durations
                const fromTask = tasks[pred];
                
                //select renderer based on duration difference
                const renderer = this.selectArrowRendererForPair(fromTask, task);
                
                //another polymorphic call to draw method
                //each arrow picks its own style based on task relationship
                //demonstrates benefit of strategy pattern runtime selection per arrow
                renderer.draw(svg, fromEl, toEl, parentRect);
            }
        }
    }

    //ANADAS WORK START
    getUserAnswers(taskId)
    {
        return {
            es: document.getElementById(`task-${taskId}-es`).value,
            ef: document.getElementById(`task-${taskId}-ef`).value,
            ls: document.getElementById(`task-${taskId}-ls`).value,
            lf: document.getElementById(`task-${taskId}-lf`).value,
            slack: document.getElementById(`task-${taskId}-slack`).value
        };
    }
    //ANADAS WORK END

    //ANADAS WORK START
    showFeedback(taskId, field, isCorrect)
    {
        const inputElement = document.getElementById(`task-${taskId}-${field}`);
        if (inputElement) {
            inputElement.classList.add(isCorrect ? 'correct' : 'wrong');
        }
    }
    //ANADAS WORK END

    //ANADAS WORK START
    clearFeedback()
    {
        const inputs = document.querySelectorAll('.pert-node input');
        inputs.forEach(input => {
            input.classList.remove('correct', 'wrong');
        });
        const nodes = document.querySelectorAll('.pert-node');
        nodes.forEach(node => {
            node.classList.remove('critical-highlight');
        });
    }
    //ANADAS WORK END

    //ANADAS WORK START
    clearInputs()
    {
        const inputs = document.querySelectorAll('.pert-node input');
        inputs.forEach(input => {
            input.value = '';
            input.classList.remove('correct', 'wrong');
        });
    }


    
    //iterative collision detection and resolution algorithm
    //uses simplified physics simulation to separate overlapping nodes
    relaxNodePositions()
    {
        //convert nodelist to array for easier manipulation
        const nodes = Array.from(this.container.querySelectorAll('.pert-node'));
        if (nodes.length === 0) return;

        //minimum vertical space between nodes in pixels
        const padding=18;
        //maximum iterations to prevent infinite loop if nodes cannot stabilize
        const maxIter = 20;

        //iterative relaxation algorithm runs until nodes stop moving or max iterations reached
        for (let iter = 0; iter < maxIter; iter++) {
            //tracks if any node moved this iteration used to detect convergence
            let moved=false;

            //snapshot current positions and dimensions of all nodes
            //recalculated each iteration because positions change during separation
            const metrics = nodes.map(n => ({
                el: n,                  //reference to dom element for later manipulation
                left: n.offsetLeft,     //x position relative to offset parent
                top: n.offsetTop,       //y position relative to offset parent
                w: n.offsetWidth,       //total width including padding and border
                h: n.offsetHeight       //total height including padding and border
            }));

            //nested loop checks every pair of nodes for collision
            //starts j at i+1 to avoid checking same pair twice
            for (let i = 0; i < metrics.length; i++) {
                for (let j = i + 1; j < metrics.length; j++) {
                    const a = metrics[i];
                    const b = metrics[j];

                    //aabb axis aligned bounding box collision detection on x axis
                    //checks if rectangles overlap horizontally meaning they are in same column
                    //a overlaps b if a left edge is before b right edge and a right edge is after b left edge
                    const horizOverlap = a.left < b.left + b.w && a.left + a.w > b.left;
                    //skip vertical checks if not in same column they cannot collide
                    if (!horizOverlap) continue;

                    //aabb collision detection on y axis
                    //checks if rectangles overlap vertically
                    const vertOverlap = a.top < b.top + b.h && a.top + a.h > b.top;
                    if (!vertOverlap) {
                        //nodes in same column but not overlapping
                        //check if gap between them is less than desired padding
                        //calculate distance from bottom of upper node to top of lower node
                        const gap = Math.abs((a.top + a.h) - b.top);
                        if (gap < padding) {
                            //calculate how much to shift each node to achieve padding
                            //divide by 2 so both nodes move equal amounts
                            const shift = Math.ceil((padding - gap) / 2);
                            //determine which node is above and which is below
                            if (a.top <= b.top) {
                                //a is above b push b down and a up
                                b.el.style.top = (b.top + shift) + 'px';
                                //clamp a position to 0 cannot go above container top
                                a.el.style.top = Math.max(0, a.top - shift) + 'px';
                            } else {
                                //b is above a push a down and b up
                                a.el.style.top = (a.top + shift) + 'px';
                                b.el.style.top = Math.max(0, b.top - shift) + 'px';
                            }
                            //mark that movement occurred need another iteration
                            moved=true;
                        }
                        //skip overlap resolution since no overlap exists
                        continue;
                    }

                    //nodes are overlapping vertically need to separate them
                    //calculate overlap distance in pixels
                    //overlap is amount bottom of upper node extends past top of lower node
                    const overlap = (a.top + a.h) - b.top;
                    //calculate separation distance add padding to prevent immediate re collision
                    //divide by 2 so both nodes move equal amounts in opposite directions
                    const separateBy = Math.ceil((overlap + padding) / 2);
                    if (separateBy > 0) {
                        //apply separation determine which node is on top
                        if (a.top <= b.top) {
                            //a is higher push b down and a up
                            b.el.style.top = (b.top + separateBy) + 'px';
                            //prevent a from going negative off screen top
                            a.el.style.top = Math.max(0, a.top - separateBy) + 'px';
                        } else {
                            //b is higher push a down and b up
                            a.el.style.top = (a.top + separateBy) + 'px';
                            b.el.style.top = Math.max(0, b.top - separateBy) + 'px';
                        }
                        //flag movement occurred
                        moved=true;
                    }
                }
            }

            //convergence check if no nodes moved this iteration layout is stable
            //break early to save cpu cycles
            if (!moved) break;
        }
    }
  
}

class AnimationManager
{
    constructor(soundManager)
    {
        this.soundManager = soundManager;
    }
    
    playCriticalPathAnimation(correctTasks)
    {
        for (const taskId in correctTasks)
        {
            if (correctTasks[taskId].slack === 0)
            {
                const nodeElement = document.getElementById(`task-${taskId}`);
                if (nodeElement)
                {
                    nodeElement.classList.add('critical-highlight');
                }
            }
        }
    }
}


//ANADAS WORK START
class SoundManager
{
    playSound(soundName)
    {
        console.log(`%cSOUND: Playing '${soundName}'`, 'color: blue; font-weight: bold;');
    }
}
//ANADAS WORK END