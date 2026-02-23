// src/services/audioCore.ts

class AudioCore {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private eqFilters: BiquadFilterNode[] = [];
    private compressor: DynamicsCompressorNode | null = null;
    private analyser: AnalyserNode | null = null;
    private initialized = false;

    private bands = [20, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 20000];

    private sourceGains: Map<HTMLMediaElement, GainNode> = new Map();

    init() {
        if (this.initialized) return;

        try {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (!AudioContextClass) {
                console.warn("AudioContext not supported in this browser");
                return;
            }
            this.ctx = new AudioContextClass();

            this.masterGain = this.ctx.createGain();
            this.compressor = this.ctx.createDynamicsCompressor();
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256;

            // Build EQ Chain (Fixed bands)
            this.eqFilters = this.bands.map((freq, i) => {
                const filter = this.ctx!.createBiquadFilter();
                filter.type = i === 0 ? 'lowshelf' : i === this.bands.length - 1 ? 'highshelf' : 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1.41;
                filter.gain.value = 0;
                return filter;
            });

            // Connect: [In] -> EQ Filters -> Compressor -> MasterGain -> Analyser -> Destination
            let lastNode: AudioNode = this.eqFilters[0];
            for (let i = 1; i < this.eqFilters.length; i++) {
                this.eqFilters[i - 1].connect(this.eqFilters[i]);
                lastNode = this.eqFilters[i];
            }

            lastNode.connect(this.compressor);
            this.compressor.connect(this.masterGain);
            this.masterGain.connect(this.analyser);
            this.analyser.connect(this.ctx.destination);

            this.initialized = true;
        } catch (e) {
            console.error("Failed to initialize AudioCore:", e);
            // Non-blocking failure
            this.initialized = false;
        }
    }

    getContext() { return this.ctx; }
    getAnalyser() { return this.analyser; }

    setVolume(val: number) {
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
        }
    }

    setEQ(values: number[]) {
        if (!this.ctx) return;
        values.forEach((val, i) => {
            if (this.eqFilters[i]) {
                this.eqFilters[i].gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
            }
        });
    }

    createSource(element: HTMLMediaElement) {
        if (!this.ctx) this.init();

        if (this.sourceGains.has(element)) return this.sourceGains.get(element)!;

        try {
            const source = this.ctx!.createMediaElementSource(element);
            const gainNode = this.ctx!.createGain();
            source.connect(gainNode);
            gainNode.connect(this.eqFilters[0]);

            this.sourceGains.set(element, gainNode);
            return gainNode;
        } catch (e) {
            console.warn("Source already connected to context", e);
            return this.sourceGains.get(element) || null;
        }
    }

    fadeSource(element: HTMLMediaElement, target: number, duration: number) {
        const gainNode = this.sourceGains.get(element);
        if (gainNode && this.ctx) {
            gainNode.gain.setTargetAtTime(target, this.ctx.currentTime, duration / 4);
        }
    }

    resume() {
        if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
        }
    }
}

export const audioCore = new AudioCore();
