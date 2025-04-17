const { createApp } = Vue;

const WaitingPhase = {
    template: `
        <div class="space-y-4">
            <div class="flex justify-center space-x-4 mb-4">
                <button @click="$emit('update:input-mode', 'json')" 
                        :class="{'bg-blue-600': inputMode === 'json', 'bg-gray-600': inputMode !== 'json'}" 
                        class="px-4 py-2 rounded-lg text-white flex items-center transition-all duration-200">
                    <i class="fas fa-code mr-2"></i>JSON
                </button>
                <button @click="$emit('update:input-mode', 'ci')" 
                        :class="{'bg-blue-600': inputMode === 'ci', 'bg-gray-600': inputMode !== 'ci'}" 
                        class="px-4 py-2 rounded-lg text-white flex items-center transition-all duration-200">
                    <i class="fas fa-id-card mr-2"></i>Cédula
                </button>
            </div>
            <p class="text-lg text-gray-300 flex items-center justify-center">
                <i class="fas fa-hourglass-half mr-2"></i>Esperando {{ inputMode === 'json' ? 'JSON' : 'cédula' }}...
            </p>
            <div v-if="inputMode === 'json'">
                <textarea v-model="jsonInput" @input="validateJson" 
                          placeholder="Ingresa datos en formato JSON" 
                          :class="{'border-green-500': isJsonValid, 'border-red-500': !isJsonValid && jsonInput}" 
                          class="w-full p-3 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"></textarea>
                <button @click="$emit('send-data', jsonInput)" 
                        :disabled="!isJsonValid" 
                        class="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg flex items-center justify-center transition-all duration-200">
                    <i class="fas fa-paper-plane mr-2"></i>Enviar JSON
                </button>
            </div>
            <div v-else>
                <input type="number" v-model.number="ciInput" @input="validateCi" 
                       placeholder="Ingresa cédula de identidad" 
                       :class="{'border-green-500': isCiValid, 'border-red-500': !isCiValid && ciInput}" 
                       class="w-full p-3 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" 
                       min="1" max="9999999999">
                <button @click="$emit('send-data', JSON.stringify({ ci: ciInput }))" 
                        :disabled="!isCiValid" 
                        class="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg flex items-center justify-center transition-all duration-200">
                    <i class="fas fa-paper-plane mr-2"></i>Enviar Cédula
                </button>
            </div>
        </div>
    `,
    props: ['inputMode', 'isValid'],
    data() {
        return {
            jsonInput: '',
            ciInput: null,
            isJsonValid: true,
            isCiValid: true
        };
    },
    methods: {
        validateJson() {
            if (!this.jsonInput) {
                this.isJsonValid = true;
                this.$emit('update:is-valid', true);
                return;
            }
            try {
                JSON.parse(this.jsonInput);
                this.isJsonValid = true;
                this.$emit('update:is-valid', true);
            } catch {
                this.isJsonValid = false;
                this.$emit('update:is-valid', false);
            }
        },
        validateCi() {
            if (!this.ciInput) {
                this.isCiValid = true;
                this.$emit('update:is-valid', true);
                return;
            }
            this.isCiValid = this.ciInput > 0 && this.ciInput <= 9999999999 && Number.isInteger(this.ciInput);
            this.$emit('update:is-valid', this.isCiValid);
        }
    },
    emits: ['send-data', 'update:is-valid', 'update:input-mode']
};

const ReceivedPhase = {
    template: `
        <div class="space-y-4">
            <p class="text-lg text-green-400 flex items-center justify-center">
                <i class="fas fa-check-circle mr-2"></i>¡Datos recibidos!
            </p>
            <pre>{{ data }}</pre>
        </div>
    `,
    props: ['data']
};

const ProcessingPhase = {
    template: `
        <div class="space-y-4">
            <p class="text-lg text-blue-400 flex items-center justify-center">
                <i class="fas fa-cog fa-spin mr-2"></i>Procesando datos...
            </p>
        </div>
    `
};

const ResultPhase = {
    template: `
        <div class="space-y-4">
            <p class="text-lg text-purple-400 flex items-center justify-center">
                <i class="fas fa-file-alt mr-2"></i>Resultado obtenido:
            </p>
            <pre>{{ result }}</pre>
        </div>
    `,
    props: ['result']
};

const FinishedPhase = {
    template: `
        <div class="space-y-4">
            <p class="text-lg text-teal-400 flex items-center justify-center">
                <i class="fas fa-flag-checkered mr-2"></i>Proceso finalizado.
            </p>
            <button @click="$emit('reset')" 
                    class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center transition-all duration-200">
                <i class="fas fa-redo mr-2"></i>Volver a empezar
            </button>
        </div>
    `,
    emits: ['reset']
};

createApp({
    data() {
        return {
            phase: 'waiting',
            receivedData: null,
            result: null,
            error: '',
            timeoutId: null,
            isValidInput: true,
            inputMode: 'json',
            stages: ['waiting', 'received', 'processing', 'result', 'finished']
        };
    },
    methods: {
        async sendData(input) {
            try {
                const response = await fetch('/listener', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: input
                });
                const result = await response.json();
                this.receivedData = JSON.stringify(result.data, null, 2);
                this.phase = 'received';
                this.error = '';
                this.startProcessing();
            } catch (error) {
                this.error = 'Error al enviar datos: ' + error.message;
                this.phase = 'waiting';
            }
        },
        startProcessing() {
            this.timeoutId = setTimeout(() => {
                this.phase = 'processing';
                this.timeoutId = setTimeout(() => {
                    this.result = this.receivedData;
                    this.phase = 'result';
                    this.timeoutId = setTimeout(() => {
                        this.phase = 'finished';
                    }, 2000);
                }, 2000);
            }, 2000);
        },
        reset() {
            this.phase = 'waiting';
            this.receivedData = null;
            this.result = null;
            this.error = '';
            this.isValidInput = true;
            this.inputMode = 'json';
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
        }
    },
    components: {
        WaitingPhase,
        ReceivedPhase,
        ProcessingPhase,
        ResultPhase,
        FinishedPhase
    }
}).mount('#app');
