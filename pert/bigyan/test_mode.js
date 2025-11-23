// pert/bigyan/test_mode.js
// ------------------------------------------------------
// Test Mode Helper - Bigyan
// ------------------------------------------------------
// Purpose:
//   - Track how long the user takes to answer a quiz
//   - Compute a simple score based on:
//        * accuracy (how many fields were correct)
//        * time (how fast they answered)
//   - Decide pass/fail based on the score
//   - Show a simple summary through console + alert
//
// This is deliberately simple so it is easy to explain in the oral exam.
//
// Example usage:
//   TestMode.startTimer();      // when quiz starts
//   ...
//   const elapsed = TestMode.stopTimer(); // when user clicks "Check"
//   const score = TestMode.calculateScore({
//       correctCount: numCorrect,
//       totalCount: totalFields,
//       timeSeconds: elapsed
//   });
//   const passed = TestMode.isPass(score);
//   TestMode.showResult({ score, elapsed, correctCount, totalCount, passed });
// ------------------------------------------------------

const TestMode = (function () {
    // Private variables used inside this IIFE
    let startTimeMs = null;  // timestamp in milliseconds when timer starts
    let running = false;     // flag whether timer is currently running

    // Configuration for scoring:
    //   T_GOOD  = time in seconds considered "good" (no penalty)
    //   T_MAX   = reasonable maximum time for full score formula
    //   PASS_THRESHOLD = minimum score to pass
    const T_GOOD = 60;        // 60 seconds -> full time credit
    const T_MAX = 300;        // 300 seconds (5 min) -> very slow
    const PASS_THRESHOLD = 70; // pass if score >= 70

    return {
        /**
         * Start or restart the timer.
         * We store current time in milliseconds.
         */
        startTimer() {
            startTimeMs = Date.now();
            running = true;
            console.log('[TestMode] Timer started.');
        },

        /**
         * Stop the timer and return elapsed time in seconds.
         * If timer was not running, returns 0.
         */
        stopTimer() {
            if (!running || startTimeMs == null) {
                console.warn('[TestMode] stopTimer called but timer was not running.');
                return 0;
            }
            const now = Date.now();
            const elapsedMs = now - startTimeMs;
            running = false;
            const elapsedSeconds = Math.round(elapsedMs / 1000);
            console.log(`[TestMode] Timer stopped. Elapsed: ${elapsedSeconds} seconds.`);
            return elapsedSeconds;
        },

        /**
         * Compute a simple score based on accuracy and time.
         *
         * Inputs:
         *   correctCount - how many fields the user got correct
         *   totalCount   - total number of fields
         *   timeSeconds  - time taken (seconds)
         *
         * Scoring idea (easy to explain):
         *   1) accuracy = correctCount / totalCount
         *   2) baseScore = accuracy * 100
         *   3) timeFactor:
         *        - if time <= T_GOOD (60s), timeFactor = 1.0 (no penalty)
         *        - if time > T_GOOD, linearly decrease from 1.0 down to 0.0
         *          by the time we reach T_MAX (300s)
         *   4) finalScore = baseScore * timeFactor
         *   5) clamp between 0 and 100
         */
        calculateScore({ correctCount, totalCount, timeSeconds }) {
            if (totalCount <= 0) {
                console.warn('[TestMode] totalCount <= 0 in calculateScore.');
                return 0;
            }

            // Step 1: accuracy in range [0, 1]
            const accuracy = correctCount / totalCount;

            // Step 2: baseScore in range [0, 100]
            const baseScore = accuracy * 100;

            // Step 3: time factor between 0 and 1
            let timeFactor;
            if (timeSeconds <= T_GOOD) {
                // Fast enough: full credit
                timeFactor = 1.0;
            } else if (timeSeconds >= T_MAX) {
                // Very slow: no time credit
                timeFactor = 0.0;
            } else {
                // Linearly scale down from 1 to 0 as time goes from T_GOOD to T_MAX
                const over = timeSeconds - T_GOOD;
                const range = T_MAX - T_GOOD;
                timeFactor = 1.0 - (over / range);
            }

            // Step 4: combine
            let score = baseScore * timeFactor;

            // Step 5: clamp to [0, 100]
            if (score < 0) score = 0;
            if (score > 100) score = 100;

            console.log('[TestMode] Score calculation:', {
                correctCount,
                totalCount,
                timeSeconds,
                accuracy,
                baseScore,
                timeFactor,
                score
            });

            return Math.round(score);
        },

        /**
         * Simple pass/fail decision based on score.
         * For example: pass if score >= 70.
         */
        isPass(score) {
            const passed = score >= PASS_THRESHOLD;
            console.log(`[TestMode] isPass(${score}) = ${passed}`);
            return passed;
        },

        /**
         * Optional helper: Show a simple summary to the user.
         * You can call this after isPass.
         */
        showResult({ score, elapsed, correctCount, totalCount, passed }) {
            const msgLines = [];
            msgLines.push(`Test Mode Result`);
            msgLines.push(`-----------------`);
            msgLines.push(`Score: ${score} / 100`);
            msgLines.push(`Time: ${elapsed} seconds`);
            msgLines.push(`Accuracy: ${correctCount} / ${totalCount} correct`);
            msgLines.push(`Status: ${passed ? 'PASS ✅' : 'FAIL ❌'}`);

            const msg = msgLines.join('\n');
            console.log('[TestMode] Result summary:\n' + msg);

            // For now we just use alert so we don't have to change HTML.
            // This is enough to demo in the oral exam.
            alert(msg);
        }
    };
})();
