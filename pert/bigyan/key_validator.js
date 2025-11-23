// pert/bigyan/key_validator.js
// ------------------------------------------------------
// Key Validation System - Bigyan
// ------------------------------------------------------
// Purpose:
//   - Compare PERTkey.csv answers (Michael's answer key) with
//     dynamically computed results from PertMathEngine.
//   - Log mismatches to console.
//   - This is a testing/validation tool, not core gameplay.
// ------------------------------------------------------

const KeyValidator = (function () {

    return {
        validate(tasks, answerEntry) {
            if (!tasks || !answerEntry) {
                console.warn('[KeyValidator] Missing tasks or answer entry.');
                return;
            }

            console.log('--- Key Validation Started ---');

            const engine = PertMathEngine.getInstance();
            engine.computeTimes(tasks);

            const taskIds = Object.keys(tasks);

            for (const id of taskIds) {
                const task = tasks[id];
                const csvTask = answerEntry[id.toUpperCase()];

                if (!csvTask) {
                    console.warn(`[KeyValidator] No CSV entry for task ${id}`);
                    continue;
                }

                this.compareValue(id, 'ES', task.es, csvTask.es);
                this.compareValue(id, 'EF', task.ef, csvTask.ef);
                this.compareValue(id, 'LS', task.ls, csvTask.ls);
                this.compareValue(id, 'LF', task.lf, csvTask.lf);
                this.compareValue(id, 'SLACK', task.slack, csvTask.slack);
            }

            console.log('--- Key Validation Finished ---');
        },

        compareValue(taskId, label, computed, expected) {
            const c = Number(computed);
            const e = Number(expected);

            if (expected == null || Number.isNaN(e)) {
                console.warn(`[KeyValidator] Missing expected value for ${taskId} ${label}`);
                return;
            }

            if (Math.abs(c - e) > 0.001) {
                console.error(
                    `[KeyValidator] ❌ MISMATCH on Task ${taskId} ${label}: computed=${c}, expected=${e}`
                );
            } else {
                console.log(
                    `[KeyValidator] ✅ OK Task ${taskId} ${label}: ${c}`
                );
            }
        }
    };
})();
