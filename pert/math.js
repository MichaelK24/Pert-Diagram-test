class SimulationEngine {
    
    getTaskLayout() {
        return {
            'A': { id: 'A', len: 5, pred: [],       succ: ['B', 'C'], x: '10%', y: '160px' },
            'B': { id: 'B', len: 5, pred: ['A'],    succ: ['D'],      x: '30%', y: '50px'  },
            'C': { id: 'C', len: 3, pred: ['A'],    succ: ['D'],      x: '30%', y: '270px' },
            'D': { id: 'D', len: 4, pred: ['B', 'C'], succ: ['E', 'F'],x: '50%', y: '160px' },
            'E': { id: 'E', len: 5, pred: ['D'],    succ: ['G'],      x: '70%', y: '50px'  },
            'F': { id: 'F', len: 3, pred: ['D'],    succ: ['G'],      x: '70%', y: '270px' },
            'G': { id: 'G', len: 6, pred: ['E', 'F'], succ: [],       x: '88%', y: '160px' }
        };
    }

    runSimulation() {
    
        const tasks = JSON.parse(JSON.stringify(this.getTaskLayout()));
        const taskOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

        let projectFinishTime = 0;
        for (const taskId of taskOrder) {
            const task = tasks[taskId];
            let maxPredEF = 0;
            for (const predId of task.pred) {
                if (tasks[predId].ef > maxPredEF) {
                    maxPredEF = tasks[predId].ef;
                }
            }
            task.es = maxPredEF;
            task.ef = task.es + task.len;
            if (task.ef > projectFinishTime) {
                projectFinishTime = task.ef;
            }
        }

        const reverseTaskOrder = [...taskOrder].reverse();
        for (const taskId of reverseTaskOrder) {
            const task = tasks[taskId];
            if (task.succ.length === 0) {
                task.lf = projectFinishTime;
            } else {
                let minSuccLS = Infinity;
                for (const succId of task.succ) {
                    if (tasks[succId].ls < minSuccLS) {
                        minSuccLS = tasks[succId].ls;
                    }
                }
                task.lf = minSuccLS;
            }
            task.ls = task.lf - task.len;
        }

        for (const taskId of taskOrder) {
            const task = tasks[taskId];
            task.slack = task.ls - task.es;
        }
        
        return tasks; 
    }
}