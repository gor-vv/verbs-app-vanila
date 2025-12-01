let allVerbs = [];
let gameVerbs = [];
let currentIndex = 0;
let score = 0;
let currentSpeechLang = 'en-US';

const STORAGE_KEY = 'irregularTrainer:results';

// Ссылки на DOM элементы
const WORD_LISTS = {
    default: { file: 'resource/verbs100.json' },
    extended: { file: 'resource/verbs200.json' }
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
        listSelect: document.getElementById('word-list'),
        maxBtn: document.getElementById('max-btn'),
        speechSelect: document.getElementById('speech-lang')
    },
    history: {
        toggle: document.getElementById('menu-history'),
        modal: document.getElementById('history-modal'),
        close: document.getElementById('history-close'),
        backdrop: document.getElementById('history-backdrop'),
        dialog: document.querySelector('.history-dialog'),
        list: document.getElementById('history-list'),
        clearBtn: document.getElementById('history-clear')
    },
    menu: {
        btn: document.getElementById('menu-btn'),
        dropdown: document.getElementById('menu-dropdown')
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

// 1. Инициализация: Загрузка выбранного списка
loadWordList(dom.controls.listSelect.value);
renderHistoryList();

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
dom.controls.maxBtn.addEventListener('click', () => {
    if (!allVerbs.length) return;
    dom.controls.countInput.value = allVerbs.length;
});
if (dom.controls.speechSelect) {
    currentSpeechLang = dom.controls.speechSelect.value || currentSpeechLang;
    dom.controls.speechSelect.addEventListener('change', (e) => {
        currentSpeechLang = e.target.value || currentSpeechLang;
    });
}
setupMenu();
setupHistoryModal();

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

function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    renderHistoryList();
}

function getListLabel(key) {
    const option = dom?.controls?.listSelect
        ? Array.from(dom.controls.listSelect.options).find(opt => opt.value === key)
        : null;
    return option ? option.textContent : key;
}

function getStoredResults() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn('Не удалось прочитать результаты из localStorage', err);
        return [];
    }
}

function saveResultRecord(record) {
    try {
        const results = getStoredResults();
        results.push(record);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch (err) {
        console.warn('Не удалось сохранить результат', err);
    }
    renderHistoryList();
}

function renderHistoryList() {
    if (!dom.history.list) return;
    const results = getStoredResults().slice().reverse();
    dom.history.list.innerHTML = '';
    if (!results.length) {
        const empty = document.createElement('li');
        empty.className = 'history-empty';
        empty.textContent = 'Пока нет сохранённых результатов.';
        dom.history.list.appendChild(empty);
        return;
    }
    results.forEach((res, idx) => {
        const item = document.createElement('li');
        item.className = 'history-item';

        const left = document.createElement('span');
        left.textContent = `${res.score}/${res.total}`;

        const right = document.createElement('small');
        const date = res.timestamp ? new Date(res.timestamp).toLocaleString('ru-RU') : '';
        const listLabel = res.listLabel || getListLabel(res.list);
        right.textContent = `${listLabel}${date ? ' · ' + date : ''}`;

        item.append(left, right);
        dom.history.list.appendChild(item);
    });
}

function setupMenu() {
    if (!dom.menu.btn || !dom.menu.dropdown) return;

    const closeMenu = () => {
        dom.menu.dropdown.classList.add('hidden');
        dom.menu.btn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', handleOutsideClick, true);
    };

    const openMenu = () => {
        dom.menu.dropdown.classList.remove('hidden');
        dom.menu.btn.setAttribute('aria-expanded', 'true');
        document.addEventListener('click', handleOutsideClick, true);
    };

    const handleOutsideClick = (event) => {
        if (!dom.menu.dropdown.contains(event.target) && !dom.menu.btn.contains(event.target)) {
            closeMenu();
        }
    };

    dom.menu.btn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (dom.menu.dropdown.classList.contains('hidden')) openMenu();
        else closeMenu();
    });

    dom.menu.close = closeMenu;
}

function setupHistoryModal() {
    if (!dom.history.toggle || !dom.history.modal) return;

    const openModal = () => {
        dom.history.modal.classList.remove('hidden');
        dom.history.backdrop?.classList.remove('hidden');
        renderHistoryList();
    };

    const closeModal = () => {
        dom.history.modal.classList.add('hidden');
        dom.history.backdrop?.classList.add('hidden');
    };

    dom.history.toggle.addEventListener('click', () => {
        dom.menu.close?.();
        openModal();
    });

    dom.history.close?.addEventListener('click', closeModal);
    dom.history.backdrop?.addEventListener('click', closeModal);
    dom.history.modal.addEventListener('click', (event) => {
        if (!dom.history.dialog?.contains(event.target)) {
            closeModal();
        }
    });
    dom.history.clearBtn?.addEventListener('click', () => {
        clearHistory();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !dom.history.modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

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
    utterance.lang = currentSpeechLang;
    window.speechSynthesis.speak(utterance);
}

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

    saveResultRecord({
        score,
        total: gameVerbs.length,
        list: dom.controls.listSelect.value,
        listLabel: getListLabel(dom.controls.listSelect.value),
        timestamp: Date.now()
    });
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