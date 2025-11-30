let allVerbs = [];
let gameVerbs = [];
let currentIndex = 0;
let score = 0;

// Ссылки на DOM элементы
const WORD_LISTS = {
    default: { file: 'verbs100.json' },
    extended: { file: 'verbs200.json' }
};

const dom = {
    container: document.getElementById('main-content'),
    screens: {
        game: document.getElementById('game-screen'),
        result: document.getElementById('result-screen')
    },
    controls: {
        totalCount: document.getElementById('total-words-count'),
        countInput: document.getElementById('word-count'),
        btn: document.getElementById('start-btn'),
        listSelect: document.getElementById('word-list')
    },
    game: {
        step: document.getElementById('current-step'),
        total: document.getElementById('total-step'),
        translation: document.getElementById('verb-translation'),
        base: document.getElementById('verb-base'),
        baseAudioBtn: document.getElementById('base-audio-btn'),
        transcription1: document.getElementById('verb-transcription-1'),
        input: document.getElementById('user-input'),
        checkBtn: document.getElementById('check-btn'),
        
        feedback: document.getElementById('feedback'),
        message: document.getElementById('feedback-message'),
        correctPs: document.getElementById('correct-ps'),
        psAudioBtn: document.getElementById('ps-audio-btn'),
        transPs: document.getElementById('trans-ps'),
        correctPp: document.getElementById('correct-pp'),
        ppAudioBtn: document.getElementById('pp-audio-btn'),
        transPp: document.getElementById('trans-pp'),
        nextBtn: document.getElementById('next-btn'),
        stopBtn: document.getElementById('stop-btn'),
        restartBtn: document.getElementById('progress-restart-btn')
    },
    result: {
        score: document.getElementById('final-score'),
        total: document.getElementById('final-total'),
        msg: document.getElementById('final-msg'),
        restartBtn: document.getElementById('restart-btn')
    }
};

function loadWordList(key = 'default') {
    const list = WORD_LISTS[key] || WORD_LISTS.default;
    dom.controls.btn.disabled = true;

    return fetch(list.file)
        .then(response => response.json())
        .then(data => {
            allVerbs = data;
            dom.controls.totalCount.textContent = allVerbs.length;
            dom.controls.countInput.max = allVerbs.length;
            if (parseInt(dom.controls.countInput.value, 10) > allVerbs.length) {
                dom.controls.countInput.value = allVerbs.length;
            }
        })
        .catch(err => alert(`Ошибка загрузки ${list.file}: ${err}`))
        .finally(() => {
            dom.controls.btn.disabled = false;
        });
}

function setAudioData(verb) {
    dom.game.baseAudioBtn.dataset.text = verb["Base form"] || '';
    dom.game.psAudioBtn.dataset.text = verb["Past Simple form"] || '';
    dom.game.ppAudioBtn.dataset.text = verb["Past Participle form"] || '';
}

function speakVerb(text) {
    if (!text) return;
    const cleaned = text
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
}

// 1. Инициализация: Загрузка выбранного списка
loadWordList(dom.controls.listSelect.value);

// События
dom.controls.btn.addEventListener('click', startGame);
dom.game.checkBtn.addEventListener('click', checkAnswer);
dom.game.nextBtn.addEventListener('click', nextCard);
dom.result.restartBtn.addEventListener('click', () => location.reload());
dom.game.stopBtn.addEventListener('click', finishEarly);
dom.game.restartBtn.addEventListener('click', restartGame);
dom.controls.listSelect.addEventListener('change', (e) => {
    loadWordList(e.target.value);
});

dom.game.baseAudioBtn.addEventListener('click', () => speakVerb(dom.game.baseAudioBtn.dataset.text));
dom.game.psAudioBtn.addEventListener('click', () => speakVerb(dom.game.psAudioBtn.dataset.text));
dom.game.ppAudioBtn.addEventListener('click', () => speakVerb(dom.game.ppAudioBtn.dataset.text));

// Обработка Enter в поле ввода
dom.game.input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        // Если кнопка "Дальше" видна, Enter нажимает её, иначе нажимает "Проверить"
        if (!dom.game.feedback.classList.contains('hidden')) {
            nextCard();
        } else {
            checkAnswer();
        }
    }
});

// --- ЛОГИКА ---

function startGame() {
    const count = parseInt(dom.controls.countInput.value);
    if (!count || count <= 0) return;

    showMainContent();

    // Перемешиваем и берем N слов
    gameVerbs = shuffleArray([...allVerbs]).slice(0, count);
    
    // Сброс состояния
    currentIndex = 0;
    score = 0;
    
    // UI переключение
    switchScreen('game');
    dom.game.total.textContent = gameVerbs.length;
    showCard();
}

function showCard() {
    const verb = gameVerbs[currentIndex];
    
    // Заполнение карточки данными из JSON
    dom.game.translation.textContent = verb["Translation"];
    dom.game.base.textContent = verb["Base form"];
    dom.game.transcription1.textContent = verb["Transcription 1"];
    setAudioData(verb);
    
    // Сброс инпутов и фидбека
    dom.game.input.value = '';
    dom.game.feedback.classList.add('hidden');
    dom.game.checkBtn.classList.remove('hidden'); // Показываем кнопку проверки
    dom.game.input.disabled = false;
    dom.game.input.focus();
    
    dom.game.step.textContent = currentIndex + 1;
}

function checkAnswer() {
    const verb = gameVerbs[currentIndex];
    const userText = dom.game.input.value.trim().toLowerCase().replace(/\s+/g, ' '); // убираем лишние пробелы
    
    // Формируем правильную строку для сверки
    // JSON ключи: "Past Simple form" и "Past Participle form"
    const correctSimple = verb["Past Simple form"];
    const correctParticiple = verb["Past Participle form"];
    
    // Ожидаемый ответ: "форма2 форма3"
    const correctAnswerString = `${correctSimple} ${correctParticiple}`.toLowerCase();
    
    // Проверка (сравниваем строки)
    // Вариант со строгим сравнением. 
    // Для "was/were" пользователь должен ввести именно "was/were been" или можно упростить логику,
    // но пока сравниваем "в лоб", как в JSON.
    const isCorrect = (userText === correctAnswerString);

    if (isCorrect) score++;

    // Показываем результат
    showFeedback(isCorrect, verb);
}

function showFeedback(isCorrect, verb) {
    dom.game.message.textContent = isCorrect ? "Правильно! 🎉" : "Ошибка 😞";
    dom.game.message.className = isCorrect ? "success-msg" : "error-msg";
    
    // Заполняем правильные ответы и транскрипции из JSON
    dom.game.correctPs.textContent = verb["Past Simple form"];
    dom.game.transPs.textContent = verb["Transcription 2"];
    
    dom.game.correctPp.textContent = verb["Past Participle form"];
    dom.game.transPp.textContent = verb["Transcription 3"];
    setAudioData(verb);
    
    // UI изменения
    dom.game.feedback.classList.remove('hidden');
    dom.game.checkBtn.classList.add('hidden'); // Прячем кнопку проверки
    dom.game.input.disabled = true;
    dom.game.nextBtn.focus();
}

function nextCard() {
    currentIndex++;
    if (currentIndex < gameVerbs.length) {
        showCard();
    } else {
        endGame();
    }
}

function finishEarly() {
    if (!gameVerbs.length) return;
    endGame();
}

function showMainContent() {
    if (dom.container) {
        dom.container.classList.remove('hidden');
    }
}

function restartGame() {
    if (!allVerbs.length) return;
    dom.game.input.value = '';
    dom.game.feedback.classList.add('hidden');
    dom.game.checkBtn.classList.remove('hidden');
    dom.game.input.disabled = false;
    startGame();
}

function endGame() {
    switchScreen('result');
    dom.result.score.textContent = score;
    dom.result.total.textContent = gameVerbs.length;
    
    // Мотивирующее сообщение
    const percentage = score / gameVerbs.length;
    if (percentage === 1) dom.result.msg.textContent = "Идеально! Вы мастер! 🏆";
    else if (percentage >= 0.7) dom.result.msg.textContent = "Хороший результат! 💪";
    else dom.result.msg.textContent = "Нужно еще потренироваться 📚";
}

// Утилиты
function switchScreen(screenName) {
    Object.values(dom.screens).forEach(el => el.classList.add('hidden'));
    dom.screens[screenName].classList.remove('hidden');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}