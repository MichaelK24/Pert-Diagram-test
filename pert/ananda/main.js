
document.addEventListener('DOMContentLoaded', () => {

    class UIController {
        constructor() {
    
            this.checkButton = document.getElementById('check-btn');
            this.graphContainer = document.getElementById('graph-container');

            this.engine = new SimulationEngine();
            this.soundManager = new SoundManager();
            this.animationManager = new AnimationManager(this.soundManager);
            this.graphRenderer = new GraphRenderer(this.graphContainer);

            this.taskData = this.engine.getTaskLayout();
    
            this.graphRenderer.drawEmptyQuiz(this.taskData);

            this.checkButton.addEventListener('click', () => this.onCheckClick());
            console.log("UIController initialized. App is running.");
        }

        onCheckClick() {
            console.log("Check button clicked.");
            this.soundManager.playSound('click');
            this.graphRenderer.clearFeedback(); 

            const correctAnswers = this.engine.runSimulation();
            
            let allCorrect = true;

            for (const taskId in correctAnswers) {
                const task = correctAnswers[taskId];

                const userAnswers = this.graphRenderer.getUserAnswers(taskId);
                
                const fieldsToCkeck = ['es', 'ef', 'ls', 'lf', 'slack'];
                fieldsToCkeck.forEach(field => {
                    if (userAnswers[field] == task[field]) {
                        this.graphRenderer.showFeedback(taskId, field, true); // Correct
                    } else {
                        this.graphRenderer.showFeedback(taskId, field, false); // Wrong
                        allCorrect = false;
                    }
                });
            }
            
            if (allCorrect) {
                console.log("All answers correct! Playing animation.");
                this.animationManager.playCriticalPathAnimation(correctAnswers);
                this.soundManager.playSound('success_chime');
            }
        }
    }

    new UIController();
});