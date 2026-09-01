/* =========================================================
   VOID // SOLITAIRE
   Mobile-first Klondike Solitaire
   ========================================================= */


/* =========================================================
   CONSTANTS
   ========================================================= */

const SUITS = ["♠", "♥", "♦", "♣"];

const SUIT_NAMES = {
    "♠": "spades",
    "♥": "hearts",
    "♦": "diamonds",
    "♣": "clubs"
};

const RANKS = [
    "A", "2", "3", "4", "5", "6", "7",
    "8", "9", "10", "J", "Q", "K"
];

const RED_SUITS = ["♥", "♦"];


/* =========================================================
   GAME STATE
   ========================================================= */

let stock = [];
let waste = [];

let foundations = {
    "♠": [],
    "♥": [],
    "♦": [],
    "♣": []
};

let tableau = [];

let moves = 0;
let score = 0;
let elapsed = 0;

let timer = null;

let selected = null;

let history = [];

let gameRunning = false;

let soundEnabled = true;


/* =========================================================
   PLAYER STATISTICS
   ========================================================= */

let statistics = JSON.parse(
    localStorage.getItem("voidSolitaireStats")
) || {
    gamesPlayed: 0,
    gamesWon: 0,
    bestScore: 0,
    bestTime: null
};


/* =========================================================
   DOM
   ========================================================= */

const stockEl =
    document.getElementById("stock");

const wasteEl =
    document.getElementById("waste");

const tableauEl =
    document.getElementById("tableau");

const scoreEl =
    document.getElementById("score");

const movesEl =
    document.getElementById("moves");

const timerEl =
    document.getElementById("timer");

const robotMessage =
    document.getElementById("robotMessage");

const mobileMessage =
    document.getElementById("mobileMessage");

const toast =
    document.getElementById("toast");

const winOverlay =
    document.getElementById("winOverlay");

const statsOverlay =
    document.getElementById("statsOverlay");


/* =========================================================
   ROBOT DIALOGUE
   ========================================================= */

const ROBOT = {

    start: [
        "System initialized.<br>Your move.",
        "Welcome, human.<br>Good luck.",
        "Cards shuffled.<br>Calculating odds...",
        "Ready when you are."
    ],

    good: [
        "Interesting.",
        "Efficient move.",
        "I approve.",
        "Not bad, human.",
        "Your strategy is improving.",
        "My processors are impressed."
    ],

    bad: [
        "That was questionable.",
        "Are you sure about that?",
        "Interesting choice...",
        "I would reconsider that.",
        "My processors disagree."
    ],

    hint: [
        "I found something.",
        "Try this move.",
        "Your next move is here.",
        "Let me calculate..."
    ],

    stuck: [
        "I don't see an obvious move.",
        "The board is getting complicated.",
        "Try checking the stock.",
        "Perhaps undo something?"
    ],

    win: [
        "You actually did it.",
        "Well played, human.",
        "I concede.",
        "Victory confirmed."
    ]
};

function robotSay(type) {

    const choices = ROBOT[type];

    const message =
        choices[
            Math.floor(
                Math.random() * choices.length
            )
        ];

    robotMessage.innerHTML = message;

    mobileMessage.textContent =
        message.replace(/<br>/g, " ");

}


/* =========================================================
   SOUND
   ========================================================= */

let audioContext = null;

function beep(
    frequency = 440,
    duration = 0.06
) {

    if (!soundEnabled)
        return;

    try {

        if (!audioContext) {

            audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

        }

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.frequency.value =
            frequency;

        oscillator.type = "sine";

        gain.gain.setValueAtTime(
            0.045,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);

        gain.connect(audioContext.destination);

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime + duration
        );

    } catch (_) {}

}


/* =========================================================
   DECK
   ========================================================= */

function createDeck() {

    const deck = [];

    for (const suit of SUITS) {

        for (
            let value = 1;
            value <= 13;
            value++
        ) {

            deck.push({

                id:
                    `${suit}-${value}-${Math.random()}`,

                suit,

                value,

                rank:
                    RANKS[value - 1],

                color:
                    RED_SUITS.includes(suit)
                        ? "red"
                        : "black",

                faceUp: false

            });

        }

    }

    return deck;
}


/* =========================================================
   SHUFFLE
   ========================================================= */

function shuffle(deck) {

    for (
        let i = deck.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            deck[i],
            deck[j]
        ] =
        [
            deck[j],
            deck[i]
        ];

    }

    return deck;
}


/* =========================================================
   NEW GAME
   ========================================================= */

function newGame() {

    stopTimer();

    let deck =
        shuffle(createDeck());


    stock = [];

    waste = [];

    foundations = {
        "♠": [],
        "♥": [],
        "♦": [],
        "♣": []
    };

    tableau = [];

    moves = 0;

    score = 0;

    elapsed = 0;

    selected = null;

    history = [];

    gameRunning = false;


    /* TABLEAU */

    for (
        let column = 0;
        column < 7;
        column++
    ) {

        const pile = [];

        for (
            let row = 0;
            row <= column;
            row++
        ) {

            const card =
                deck.pop();

            card.faceUp =
                row === column;

            pile.push(card);

        }

        tableau.push(pile);

    }


    /* STOCK */

    while (deck.length) {

        stock.push(
            deck.pop()
        );

    }


    statistics.gamesPlayed++;

    saveStatistics();

    render();

    updateHUD();

    robotSay("start");

}


/* =========================================================
   TIMER
   ========================================================= */

function startTimer() {

    if (gameRunning)
        return;

    gameRunning = true;

    timer =
        setInterval(
            () => {

                elapsed++;

                updateTimer();

            },
            1000
        );

}

function stopTimer() {

    if (timer) {

        clearInterval(timer);

        timer = null;

    }

}

function updateTimer() {

    timerEl.textContent =
        formatTime(elapsed);

}

function formatTime(totalSeconds) {

    const minutes =
        Math.floor(
            totalSeconds / 60
        )
        .toString()
        .padStart(2, "0");

    const seconds =
        (totalSeconds % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${seconds}`;

}


/* =========================================================
   HUD
   ========================================================= */

function updateHUD() {

    scoreEl.textContent =
        score;

    movesEl.textContent =
        moves;

    updateTimer();

}


/* =========================================================
   HISTORY / UNDO
   ========================================================= */

function cloneState() {

    return JSON.stringify({

        stock,
        waste,
        foundations,
        tableau,

        moves,
        score,
        elapsed

    });

}

function saveHistory() {

    history.push(
        cloneState()
    );

    if (history.length > 100)
        history.shift();

}

function undo() {

    if (!history.length) {

        showToast(
            "Nothing to undo."
        );

        return;

    }

    const state =
        JSON.parse(
            history.pop()
        );

    stock =
        state.stock;

    waste =
        state.waste;

    foundations =
        state.foundations;

    tableau =
        state.tableau;

    moves =
        state.moves;

    score =
        state.score;

    elapsed =
        state.elapsed;

    selected = null;

    render();

    updateHUD();

    beep(300);

    robotSay("good");

}


/* =========================================================
   CARD ELEMENT
   ========================================================= */

function makeCardElement(card) {

    const element =
        document.createElement("div");

    element.className = "card";

    if (!card.faceUp) {

        element.classList.add("back");

        return element;

    }


    if (card.color === "red")
        element.classList.add("red");


    element.innerHTML = `

        <div class="card-corner">

            <div class="card-rank">
                ${card.rank}
            </div>

            <div class="card-suit">
                ${card.suit}
            </div>

        </div>

        <div class="card-symbol">
            ${card.suit}
        </div>

    `;


    return element;

}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function render() {

    renderStock();

    renderWaste();

    renderFoundations();

    renderTableau();

}


/* =========================================================
   STOCK
   ========================================================= */

function renderStock() {

    stockEl.innerHTML = "";

    if (!stock.length)
        return;

    const card =
        stock[stock.length - 1];

    const element =
        makeCardElement(card);

    element.addEventListener(
        "click",
        drawFromStock
    );

    stockEl.appendChild(element);

}


/* =========================================================
   WASTE
   ========================================================= */

function renderWaste() {

    wasteEl.innerHTML = "";

    if (!waste.length)
        return;

    const index =
        waste.length - 1;

    const card =
        waste[index];

    const element =
        makeCardElement(card);

    element.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            selectCard({
                type: "waste",
                index
            });

        }
    );

    wasteEl.appendChild(element);

}


/* =========================================================
   FOUNDATIONS
   ========================================================= */

function renderFoundations() {

    for (const suit of SUITS) {

        const element =
            document.getElementById(
                "foundation-" +
                SUIT_NAMES[suit]
            );

        element.innerHTML = "";

        const pile =
            foundations[suit];

        if (!pile.length)
            continue;

        const card =
            pile[pile.length - 1];

        const cardElement =
            makeCardElement(card);

        cardElement.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                selectCard({
                    type: "foundation",
                    suit
                });

            }
        );

        element.appendChild(
            cardElement
        );

    }

}


/* =========================================================
   TABLEAU
   ========================================================= */

function renderTableau() {

    tableauEl.innerHTML = "";

    tableau.forEach(
        (pile, columnIndex) => {

            const column =
                document.createElement("div");

            column.className =
                "column";

            if (!pile.length)
                column.classList.add(
                    "empty"
                );


            column.addEventListener(
                "click",
                () => {

                    handleColumnTap(
                        columnIndex
                    );

                }
            );


            pile.forEach(
                (card, index) => {

                    const element =
                        makeCardElement(card);

                    element.style.top =
                        cardOffset(index) +
                        "px";

                    element.style.zIndex =
                        index + 1;


                    if (
                        selected &&
                        selected.type === "tableau" &&
                        selected.column === columnIndex &&
                        index >= selected.index
                    ) {

                        element.classList.add(
                            "selected"
                        );

                    }


                    if (card.faceUp) {

                        element.addEventListener(
                            "click",
                            event => {

                                event.stopPropagation();

                                selectCard({

                                    type: "tableau",

                                    column:
                                        columnIndex,

                                    index

                                });

                            }
                        );

                    }

                    column.appendChild(
                        element
                    );

                }
            );


            tableauEl.appendChild(
                column
            );

        }
    );

}


/* =========================================================
   CARD OFFSET
   ========================================================= */

function cardOffset(index) {

    return index *
        (
            window.innerWidth <= 800
                ? 25
                : 29
        );

}


/* =========================================================
   STOCK ACTION
   ========================================================= */

function drawFromStock() {

    startTimer();

    saveHistory();

    beep(440);


    if (stock.length) {

        const card =
            stock.pop();

        card.faceUp = true;

        waste.push(card);

        moves++;

        score += 5;

        selected = null;

        robotSay("good");

    }

    else {

        if (!waste.length) {

            showToast(
                "Nothing left in stock."
            );

            history.pop();

            return;

        }


        stock =
            waste.reverse();

        waste = [];

        stock.forEach(
            card => {
                card.faceUp = false;
            }
        );

        moves++;

        score =
            Math.max(
                0,
                score - 10
            );

        selected = null;

        robotSay("bad");

    }


    render();

    updateHUD();

}


/* =========================================================
   SELECT CARD
   ========================================================= */

function selectCard(target) {

    const card =
        getCard(target);

    if (!card)
        return;


    if (!card.faceUp)
        return;


    startTimer();


    /* NOTHING SELECTED */

    if (!selected) {

        selected = target;

        beep(520);

        render();

        return;

    }


    /* SAME CARD */

    if (sameTarget(selected, target)) {

        selected = null;

        render();

        return;

    }


    /* TRY MOVE */

    if (
        attemptMove(
            selected,
            target
        )
    ) {

        selected = null;

        moves++;

        beep(700);

        updateHUD();

        render();

        checkWin();

    }

    else {

        beep(180);

        robotSay("bad");

        selected = null;

        render();

    }

}


/* =========================================================
   TARGET COMPARISON
   ========================================================= */

function sameTarget(a, b) {

    return (
        a.type === b.type &&
        a.column === b.column &&
        a.index === b.index &&
        a.suit === b.suit
    );

}


/* =========================================================
   GET CARD
   ========================================================= */

function getCard(target) {

    if (target.type === "waste") {

        return waste[target.index];

    }


    if (target.type === "tableau") {

        return tableau[
            target.column
        ][target.index];

    }


    if (target.type === "foundation") {

        const pile =
            foundations[
                target.suit
            ];

        return pile[
            pile.length - 1
        ];

    }


    return null;

}


/* =========================================================
   GET SELECTED CARD
   ========================================================= */

function selectedCard() {

    return getCard(selected);

}


/* =========================================================
   COLUMN TAP
   ========================================================= */

function handleColumnTap(column) {

    if (!selected)
        return;


    const pile =
        tableau[column];


    /* EMPTY COLUMN */

    if (!pile.length) {

        if (
            selected.type === "tableau"
        ) {

            const card =
                selectedCard();

            if (
                card &&
                card.value === 13
            ) {

                if (
                    attemptMove(
                        selected,
                        {
                            type: "tableau",
                            column
                        }
                    )
                ) {

                    selected = null;

                    moves++;

                    beep(700);

                    render();

                    updateHUD();

                    checkWin();

                }

            }

        }

        return;

    }


    /* LAST CARD */

    const targetIndex =
        pile.length - 1;


    if (
        attemptMove(
            selected,
            {
                type: "tableau",
                column,
                index: targetIndex
            }
        )
    ) {

        selected = null;

        moves++;

        beep(700);

        render();

        updateHUD();

        checkWin();

    }

}


/* =========================================================
   ATTEMPT MOVE
   ========================================================= */

function attemptMove(from, to) {

    const card =
        getCard(from);

    if (!card)
        return false;


    /* -----------------------------------------
       FOUNDATION
    ----------------------------------------- */

    if (
        to.type === "foundation"
    ) {

        if (
            from.type !== "waste" &&
            from.type !== "tableau"
        )
            return false;


        if (
            from.type === "tableau" &&
            from.index !==
            tableau[from.column].length - 1
        )
            return false;


        if (
            !canMoveToFoundation(
                card,
                to.suit
            )
        )
            return false;


        saveHistory();

        moveToFoundation(
            from,
            to.suit
        );

        score += 10;

        return true;

    }


    /* -----------------------------------------
       TABLEAU
    ----------------------------------------- */

    if (
        to.type === "tableau"
    ) {

        const targetPile =
            tableau[to.column];


        /* EMPTY */

        if (!targetPile.length) {

            if (
                card.value !== 13
            )
                return false;

        }

        else {

            const target =
                targetPile[
                    targetPile.length - 1
                ];


            if (
                !canStack(
                    card,
                    target
                )
            )
                return false;

        }


        /* VALID SOURCE */

        if (
            from.type === "foundation"
        )
            return false;


        if (
            from.type === "tableau"
        ) {

            const sourcePile =
                tableau[
                    from.column
                ];

            const movingCards =
                sourcePile.slice(
                    from.index
                );


            if (
                !validSequence(
                    movingCards
                )
            )
                return false;

        }


        saveHistory();

        moveCards(
            from,
            to
        );

        score += 5;

        return true;

    }


    return false;

}


/* =========================================================
   FOUNDATION RULE
   ========================================================= */

function canMoveToFoundation(
    card,
    suit
) {

    if (card.suit !== suit)
        return false;


    const pile =
        foundations[suit];


    if (!pile.length)
        return card.value === 1;


    const top =
        pile[pile.length - 1];


    return (
        card.value ===
        top.value + 1
    );

}


/* =========================================================
   TABLEAU RULE
   ========================================================= */

function canStack(
    card,
    target
) {

    if (!target.faceUp)
        return false;


    if (
        card.color ===
        target.color
    )
        return false;


    return (
        card.value ===
        target.value - 1
    );

}


/* =========================================================
   VALID FACE-UP SEQUENCE
   ========================================================= */

function validSequence(cards) {

    if (!cards.length)
        return false;


    for (
        let i = 0;
        i < cards.length - 1;
        i++
    ) {

        const current =
            cards[i];

        const next =
            cards[i + 1];


        if (!current.faceUp ||
            !next.faceUp)
            return false;


        if (
            current.color ===
            next.color
        )
            return false;


        if (
            current.value !==
            next.value + 1
        )
            return false;

    }

    return true;

}


/* =========================================================
   MOVE TO FOUNDATION
   ========================================================= */

function moveToFoundation(
    from,
    suit
) {

    let card;


    if (from.type === "waste") {

        card =
            waste.pop();

    }

    else {

        card =
            tableau[
                from.column
            ].pop();

        revealTop(
            from.column
        );

    }


    foundations[suit].push(
        card
    );

}


/* =========================================================
   MOVE CARDS TO TABLEAU
   ========================================================= */

function moveCards(
    from,
    to
) {

    let cards = [];


    if (from.type === "waste") {

        cards.push(
            waste.pop()
        );

    }

    else if (
        from.type === "tableau"
    ) {

        cards =
            tableau[
                from.column
            ].splice(
                from.index
            );

    }


    tableau[
        to.column
    ].push(
        ...cards
    );


    if (
        from.type === "tableau"
    ) {

        revealTop(
            from.column
        );

    }

}


/* =========================================================
   REVEAL TOP CARD
   ========================================================= */

function revealTop(column) {

    const pile =
        tableau[column];


    if (!pile.length)
        return;


    const top =
        pile[
            pile.length - 1
        ];


    if (!top.faceUp) {

        top.faceUp = true;

        score += 5;

    }

}


/* =========================================================
   WIN CHECK
   ========================================================= */

function checkWin() {

    const total =
        Object.values(
            foundations
        )
        .reduce(
            (sum, pile) =>
                sum + pile.length,
            0
        );


    if (total !== 52)
        return;


    stopTimer();

    gameRunning = false;

    statistics.gamesWon++;


    if (
        score >
        statistics.bestScore
    ) {

        statistics.bestScore =
            score;

    }


    if (
        statistics.bestTime === null ||
        elapsed <
        statistics.bestTime
    ) {

        statistics.bestTime =
            elapsed;

    }


    saveStatistics();


    document.getElementById(
        "finalScore"
    ).textContent = score;

    document.getElementById(
        "finalMoves"
    ).textContent = moves;

    document.getElementById(
        "finalTime"
    ).textContent =
        formatTime(elapsed);


    robotSay("win");

    beep(880,.12);

    setTimeout(
        () => {

            winOverlay.classList.remove(
                "hidden"
            );

        },
        450
    );

}


/* =========================================================
   HINT
   ========================================================= */

function hint() {

    const possible =
        findPossibleMove();


    if (!possible) {

        robotSay("stuck");

        showToast(
            "No obvious move found."
        );

        return;

    }


    selected =
        possible;

    render();

    robotSay("hint");

    beep(600);

}


/* =========================================================
   FIND POSSIBLE MOVE
   ========================================================= */

function findPossibleMove() {


    /* WASTE → FOUNDATION */

    if (waste.length) {

        const card =
            waste[
                waste.length - 1
            ];


        if (
            canMoveToFoundation(
                card,
                card.suit
            )
        ) {

            return {
                type: "waste",
                index:
                    waste.length - 1
            };

        }

    }


    /* TABLEAU → FOUNDATION */

    for (
        let c = 0;
        c < 7;
        c++
    ) {

        const pile =
            tableau[c];


        if (!pile.length)
            continue;


        const card =
            pile[
                pile.length - 1
            ];


        if (!card.faceUp)
            continue;


        if (
            canMoveToFoundation(
                card,
                card.suit
            )
        ) {

            return {
                type: "tableau",
                column: c,
                index:
                    pile.length - 1
            };

        }

    }


    /* TABLEAU → TABLEAU */

    for (
        let c = 0;
        c < 7;
        c++
    ) {

        const pile =
            tableau[c];


        for (
            let i = 0;
            i < pile.length;
            i++
        ) {

            const card =
                pile[i];


            if (!card.faceUp)
                continue;


            for (
                let target = 0;
                target < 7;
                target++
            ) {

                if (target === c)
                    continue;


                const targetPile =
                    tableau[target];


                if (!targetPile.length) {

                    if (
                        card.value === 13
                    ) {

                        return {
                            type: "tableau",
                            column: c,
                            index: i
                        };

                    }

                }

                else {

                    const targetCard =
                        targetPile[
                            targetPile.length - 1
                        ];


                    if (
                        canStack(
                            card,
                            targetCard
                        )
                    ) {

                        return {
                            type: "tableau",
                            column: c,
                            index: i
                        };

                    }

                }

            }

        }

    }


    return null;

}


/* =========================================================
   STATISTICS
   ========================================================= */

function saveStatistics() {

    localStorage.setItem(
        "voidSolitaireStats",
        JSON.stringify(statistics)
    );

}


function showStatistics() {

    document.getElementById(
        "gamesPlayed"
    ).textContent =
        statistics.gamesPlayed;

    document.getElementById(
        "gamesWon"
    ).textContent =
        statistics.gamesWon;

    document.getElementById(
        "bestScore"
    ).textContent =
        statistics.bestScore;

    document.getElementById(
        "bestTime"
    ).textContent =
        statistics.bestTime === null
            ? "--:--"
            : formatTime(
                statistics.bestTime
            );


    statsOverlay.classList.remove(
        "hidden"
    );

}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimeout;

function showToast(message) {

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimeout
    );

    toastTimeout =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            1800
        );

}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

document.getElementById(
    "newGameBtn"
).addEventListener(
    "click",
    () => {

        newGame();

    }
);


document.getElementById(
    "againBtn"
).addEventListener(
    "click",
    () => {

        winOverlay.classList.add(
            "hidden"
        );

        newGame();

    }
);


document.getElementById(
    "undoBtn"
).addEventListener(
    "click",
    undo
);


document.getElementById(
    "hintBtn"
).addEventListener(
    "click",
    hint
);


document.getElementById(
    "statsBtn"
).addEventListener(
    "click",
    showStatistics
);


document.getElementById(
    "closeStats"
).addEventListener(
    "click",
    () => {

        statsOverlay.classList.add(
            "hidden"
        );

    }
);


/* =========================================================
   SOUND BUTTON
   ========================================================= */

document.getElementById(
    "soundBtn"
).addEventListener(
    "click",
    () => {

        soundEnabled =
            !soundEnabled;

        document.getElementById(
            "soundBtn"
        ).textContent =
            soundEnabled
                ? "♫"
                : "×";

        showToast(
            soundEnabled
                ? "Sound on"
                : "Sound off"
        );

    }
);


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            selected = null;

            render();

        }


        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "z"
        ) {

            undo();

        }

    }
);


/* =========================================================
   RESIZE
   ========================================================= */

window.addEventListener(
    "resize",
    render
);


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
    "serviceWorker" in navigator
) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("./sw.js")
                .catch(
                    () => {}
                );

        }
    );

}


/* =========================================================
   START
   ========================================================= */

newGame();
