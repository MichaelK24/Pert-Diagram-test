// pert/bigyan/pert_math.js
// ------------------------------------------------------
// PERT Math Engine - Bigyan
// ------------------------------------------------------
// Purpose:
//   - Take a PERT task graph (nodes with durations and dependencies)
//   - Compute for each task:
//       ES = Earliest Start
//       EF = Earliest Finish
//       LS = Latest Start
//       LF = Latest Finish
//       slack = LS - ES
//   - Identify the critical path (tasks with slack = 0)
//   - This works for ANY layout that matches the expected "task" shape.
//
// How tasks look (coming from ChartGen.js):
//   {
//     id: 'A',           // task ID
//     len: 5,            // duration (in hours, say)
//     pred: ['B','C'],   // predecessor IDs
//     succ: ['D'],       // successor IDs
//     x: '10%',          // UI position (not used in math)
//     y: '160px'
//   }
//
// This file also demonstrates the Singleton pattern for the oral exam.
// ------------------------------------------------------

class PertMathEngine {
    // Private static field that holds the single instance
    static #instance = null;

    // Static method to get the single instance (Singleton pattern)
    static getInstance() {
        // If we haven't created an instance yet, create it
        if (!PertMathEngine.#instance) {
            PertMathEngine.#instance = new PertMathEngine();
        }
        // Return the shared instance
        return PertMathEngine.#instance;
    }

    constructor() {
        // Constructor is simple for now.
        // We could keep debug flags, statistics, or configuration here.
    }

    /**
     * Main method:
     *   Computes ES, EF, LS, LF, slack, and critical path for the given tasks.
     *
     * @param {Object<string, Object>} tasks
     *   - Map from task ID -> task object (with fields id, len, pred, succ, etc.)
     *
     * @returns {{
     *   tasks: Object<string, Object>,
     *   order: string[],
     *   projectFinish: number,
     *   criticalPath: string[]
     * }}
     */
    computeTimes(tasks) {
        // Defensive check: tasks must be a non-null object
        if (!tasks || typeof tasks !== 'object') {
            console.warn('PertMathEngine.computeTimes: invalid tasks input');
            return { tasks: {}, order: [], projectFinish: 0, criticalPath: [] };
        }

        // 1) Get a topological order of tasks (predecessors come before successors)
        const order = this.#topologicalSort(tasks);

        // 2) Forward pass: compute ES/EF and find projectFinish time
        const projectFinish = this.#forwardPass(tasks, order);

        // 3) Backward pass: compute LS/LF using projectFinish
        this.#backwardPass(tasks, order, projectFinish);

        // 4) Slack & critical path
        const criticalPath = this.#computeSlackAndCriticalPath(tasks, order);

        // Return updated tasks and some summary info
        return { tasks, order, projectFinish, criticalPath };
    }

    // --------------------------------------------------
    // Private helpers
    // --------------------------------------------------

    /**
     * Topological sort using in-degrees from "pred" lists.
     * We want an order where all predecessors of a task
     * appear before that task. This is important for
     * the forward pass (ES/EF).
     */
    #topologicalSort(tasks) {
        const inDegree = {};
        const ids = Object.keys(tasks);

        // Initialize in-degree as "number of predecessors" for each task
        for (const id of ids) {
            const t = tasks[id];
            inDegree[id] = (t.pred || []).length;
        }

        // Queue will hold tasks that currently have no remaining predecessors
        const queue = [];
        for (const id of ids) {
            if (inDegree[id] === 0) queue.push(id);
        }

        const order = [];

        // Kahn's algorithm:
        //   Repeatedly remove tasks with in-degree 0 and reduce in-degree
        //   of their successors.
        while (queue.length > 0) {
            const id = queue.shift(); // get one task from queue
            order.push(id);           // add it to the topological order

            // For each successor, reduce its in-degree
            const succs = (tasks[id].succ || []);
            for (const s of succs) {
                if (inDegree[s] > 0) {
                    inDegree[s]--;
                    // When in-degree becomes 0, add successor to queue
                    if (inDegree[s] === 0) {
                        queue.push(s);
                    }
                }
            }
        }

        // If order doesn't include all tasks, there might be a cycle or
        // disconnected nodes. For PERT, we assume the graph is a valid DAG.
        if (order.length !== ids.length) {
            console.warn('PertMathEngine: graph may be cyclic or disconnected; topological order incomplete.');
        }

        return order;
    }

    /**
     * Forward pass:
     *   - For each task in topological order:
     *     ES (Earliest Start) = max(EF of all predecessors)
     *     EF (Earliest Finish) = ES + duration
     *
     *   - For tasks with no predecessors:
     *     ES = 0
     *     EF = duration
     *
     *   - Also track the project finish time = max(EF over all tasks)
     */
    #forwardPass(tasks, order) {
        let projectFinish = 0;

        // Process tasks in forward topological order
        for (const id of order) {
            const t = tasks[id];
            const preds = t.pred || [];
            let es = 0; // default earliest start

            if (preds.length > 0) {
                // If there are predecessors:
                //   ES = maximum of all predecessor EF values
                let maxEF = 0;
                for (const p of preds) {
                    const pt = tasks[p];
                    // Safe check: use 0 if predecessor not found or EF missing
                    const ef = (pt && typeof pt.ef === 'number') ? pt.ef : 0;
                    if (ef > maxEF) maxEF = ef;
                }
                es = maxEF;
            }

            // Duration for this task
            const duration = Number(t.len) || 0;
            // EF = ES + duration
            const ef = es + duration;

            // Store results on task object
            t.es = es;
            t.ef = ef;

            // Keep track of the largest EF (this is project finish time)
            if (ef > projectFinish) {
                projectFinish = ef;
            }
        }

        // Return overall project finish time
        return projectFinish;
    }

    /**
     * Backward pass:
     *   - We process tasks in reverse topological order.
     *
     *   For tasks with no successors:
     *     LF (Latest Finish) = projectFinish
     *     LS (Latest Start) = LF - duration
     *
     *   For tasks with successors:
     *     LF = min(LS of all successors)
     *     LS = LF - duration
     */
    #backwardPass(tasks, order, projectFinish) {
        // Reverse topological order for backward pass
        const rev = [...order].reverse();

        for (const id of rev) {
            const t = tasks[id];
            const succs = t.succ || [];
            const duration = Number(t.len) || 0;

            let lf; // Latest Finish

            if (succs.length === 0) {
                // If no successors:
                //   This is an "end" task, so its LF = project finish time
                lf = projectFinish;
            } else {
                // If there are successors:
                //   LF = minimum of all successor LS values
                let minLS = Infinity;
                for (const s of succs) {
                    const st = tasks[s];
                    // If successor exists and LS is defined, consider it
                    if (!st || typeof st.ls !== 'number') continue;
                    if (st.ls < minLS) minLS = st.ls;
                }
                // If something went wrong, fallback to projectFinish
                if (minLS === Infinity) {
                    minLS = projectFinish;
                }
                lf = minLS;
            }

            // LS = LF - duration
            const ls = lf - duration;

            // Store results on task object
            t.lf = lf;
            t.ls = ls;
        }
    }

    /**
     * Compute slack and identify critical path.
     *
     * Slack = LS - ES.
     * If slack = 0 (within a small tolerance), task is on the critical path.
     */
    #computeSlackAndCriticalPath(tasks, order) {
        const criticalPath = [];

        for (const id of order) {
            const t = tasks[id];
            const es = Number(t.es) || 0;
            const ls = Number(t.ls) || 0;
            // Slack is the difference between latest and earliest start
            const slack = ls - es;

            t.slack = slack;

            // If slack is essentially zero, consider it critical.
            // We use a small tolerance (1e-9) to avoid floating-point issues.
            if (Math.abs(slack) < 1e-9) {
                criticalPath.push(id);
            }
        }

        return criticalPath;
    }

    /**
     * Small helper test that you can run from console:
     *   PertMathEngine.getInstance().runSimpleTest()
     *
     * It uses a tiny 3-task chain and prints computed times.
     * This is handy for debugging and for explaining in the exam.
     */
    runSimpleTest() {
        const sample = {
            A: { id: 'A', len: 3, pred: [],      succ: ['B'] },
            B: { id: 'B', len: 2, pred: ['A'],   succ: ['C'] },
            C: { id: 'C', len: 4, pred: ['B'],   succ: []    }
        };
        const result = this.computeTimes(sample);
        console.log('PertMathEngine simple test result:', result);
    }
}
