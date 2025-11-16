
class GraphRenderer {
    constructor(graphContainer) {
        this.container = graphContainer;
    }

    drawEmptyQuiz(tasks) {
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