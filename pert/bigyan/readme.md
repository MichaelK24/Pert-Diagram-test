
# PERT Math & Evaluation Subsystem (Bigyan)

## 1. Overview

This subsystem provides the **math and evaluation backbone** for the CS383 PERT game.  
It contains four main pieces:

1. **PertMathEngine** – computes ES, EF, LS, LF, Slack, and Critical Path from the PERT graph.
2. **Tutorial Mode** – shows a step-by-step explanation of the PERT calculations for a generated layout.
3. **Test Mode** – measures how quickly and how accurately a player solves the PERT quiz and computes a score.
4. **KeyValidator** – validates Michael’s `PERTkey.csv` answer key by comparing it to runtime PERT calculations.

All my work lives in: `pert/bigyan/`

- `pert_math.js`
- `tutorial.html`
- `tutorial.js`
- `test_mode.js`
- `key_validator.js`
- `readme.md` (this file)

---

## 2. How this prefab fits into the overall game

### High-level flow

**Normal game (`game.html`)**

1. `game.html` loads:
   - `michael/ChartGen.js` – generates random PERT layouts and tasks.
   - `pert_ui.js` – graph rendering, sounds, animations.
   - `bigyan/pert_math.js` – PERT math engine.
   - `bigyan/test_mode.js` – test mode timer + scoring.
   - `bigyan/key_validator.js` – answer-key validation.
   - `main.js` – `UIController` (main quiz logic).

2. `UIController` constructor in `main.js`:
   - Calls `generateLayout()` to obtain `gen.layoutName`, `gen.setIndex`, and `gen.tasks`.
   - Stores `gen.tasks` into `this.taskData`.
   - Calls:
     ```js
     const engine = PertMathEngine.getInstance();
     const mathResult = engine.computeTimes(gen.tasks);
     ```
     This attaches `es`, `ef`, `ls`, `lf`, and `slack` to each task.

   - Calls:
     ```js
     const keyInfo = this._findAnswerKeyForLayout(gen, window.MichaelAnswerKey);
     if (keyInfo && keyInfo.entry) {
         KeyValidator.validate(gen.tasks, keyInfo.entry);
     }
     ```
     This compares my computed values against the CSV answer key.

   - Starts Test Mode timer:
     ```js
     TestMode.startTimer();
     ```

   - Draws the quiz using `GraphRenderer`.

3. When the user clicks **Check**:
   - `onCheckClick()` in `main.js`:
     - Counts how many tasks are fully correct vs total tasks.
     - Plays success / failure animations and sounds.
     - Calls:
       ```js
       const elapsed = TestMode.stopTimer();
       const score = TestMode.calculateScore({
           correctCount,
           totalCount: totalTasks,
           timeSeconds: elapsed
       });
       const passed = TestMode.isPass(score);
       TestMode.showResult({ score, elapsed, correctCount, totalCount: totalTasks, passed });
       ```
     - This gives a clear, numeric pass/fail result based on accuracy and time.

---

## 3. Component details

### 3.1 PertMathEngine (`pert_math.js`)

**Purpose:**  
Compute the full PERT timing information for any generated layout.

**Public API:**

```js
const engine = PertMathEngine.getInstance();   // Singleton
const result = engine.computeTimes(tasks);
