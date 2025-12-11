/* [Ananda] Manages background music, sound effects, and mute logic */
class SoundManager {
    constructor() {
        this.isMuted = false;

        this.bgMusic = new Audio('ananda/background.mp3'); 
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.3;

        // Sound Effects
        this.clickSound = new Audio('ananda/click.mp3'); 
        this.successSound = new Audio('ananda/success.mp3');
        this.errorSound = new Audio('ananda/error.mp3'); 

        this.tryAutoStart();
        document.addEventListener('click', () => this.tryAutoStart(), { once: true });
    }

    tryAutoStart() {
        if (this.isMuted || !this.bgMusic.paused) return;

        // Try to play
        this.bgMusic.play()
            .then(() => {
                console.log("Background music started.");
            })
            .catch(error => {
                console.log("Autoplay blocked. Waiting for user interaction.");
            });
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.bgMusic.pause();
            return "🔇 Off";
        } else {
            this.bgMusic.play().catch(e => console.log("Playback failed", e));
            return "🔊 On";
        }
    }

    playSound(soundName) {
        if (this.isMuted) return;
        
        console.log(`Playing sound: ${soundName}`);
        let sound = null;
        if (soundName === 'click') sound = this.clickSound;
        else if (soundName === 'success_chime') sound = this.successSound;
        else if (soundName === 'error') sound = this.errorSound;

        if (sound) {
            sound.currentTime = 0;
            sound.cloneNode(true).play().catch(e => console.log("SFX Error", e));
        }
    }
}