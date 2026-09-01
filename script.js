/* =========================================================
   VOID // SOLITAIRE
   Full Klondike Solitaire Engine
   ========================================================= */

(() => {
    "use strict";

    /* =========================
       CONSTANTS
       ========================= */

    const SUITS = ["♠", "♥", "♦", "♣"];

    const SUIT_COLORS = {
        "♠": "black",
        "♣": "black",
        "♥": "red",
        "♦": "red"
    };

    const RANKS = [
        { value: 1, label: "A" },
        { value: 2, label: "2" },
        { value: 3, label: "3" },
        { value: 4, label: "4" },
        { value: 5, label: "5" },
        { value: 6, label: "6" },
        { value: 7, label: "7" },
        { value: 8, label: "9" },
        { value: 9, label: "9" },
        { value: 10, label: "10" },
        { value: 11, label: "J" },
        { value: 12, label: "Q" },
        { value: 13, label: "K" }
    ];

    /*
       Fix the accidental 8-label above.
       Keeping this here means the game always uses
       the correct rank.
    */
    RANKS[7].label = "8";

    const state = {
        stock: [],
        waste: [],
        tableau: [[], [], [], [], [], [], []],
        foundations: {
            "♠": [],
            "♥": [],
            "♦": [],
            "♣": []
        },

        score: 0,
        moves: 0,
        startTime: null,
        elapsed: 0,
        timerRunning: false,

        history: [],

        selected: null,
        dragged: null,

        sound: true
    };

    let timerInterval = null;

    /* =========================
       DOM
       ========================= */

    const $ = id => document.getElementById(id);

    const stockEl = $("stock");
    const wasteEl = $("waste");
    const tableauEl = $("tableau");

    const foundationEls = {
        "♠": $("foundation-spades"),
        "♥": $("foundation-hearts"),
        "♦": $("foundation-diamonds"),
        "♣": $("foundation-clubs")
    };

    const scoreEl = $("score");
    const movesEl = $("moves");
    const timerEl = $("timer");

    const robotMessageEl = $("robotMessage");
    const mobileMessageEl = $("mobileMessage");

    const winOverlay = $("winOverlay");
    const statsOverlay = $("statsOverlay");

    const toastEl = $("toast");

    /* =========================
       UTILITIES
       ========================= */

    function shuffle(array) {
        const copy = [...array];

        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [copy[i], copy[j]] = [copy[j], copy[i]];
        }

        return copy;
    }

    function createDeck() {
        const deck = [];

        for (const suit of SUITS) {
            for (const rank of RANKS) {
                deck.push({
                    id: `${suit}-${rank.value}-${Math.random().toString(36).slice(2)}`,
                    suit,
                    value: rank.value,
                    rank: rank.label,
                    faceUp: false
                });
            }
        }

        return deck;
    }

    function isRed(card) {
        return card && (card.suit === "♥" || card.suit === "♦");
    }

    function oppositeColors(a, b) {
        return isRed(a) !== isRed(b);
    }

    function cloneState() {
        return JSON.parse(JSON.stringify({
            stock: state.stock,
            waste: state.waste,
            tableau: state.tableau,
            foundations: state.foundations,
            score: state.score,
            moves: state.moves
        }));
    }

    function restoreState(snapshot) {
        state.stock = snapshot.stock;
        state.waste = snapshot.waste;
        state.tableau = snapshot.tableau;
        state.foundations = snapshot.foundations;
        state.score = snapshot.score;
        state.moves = snapshot.moves;

        state.selected = null;
        state.dragged = null;

        renderAll();
    }

    function saveHistory() {
        state.history.push(cloneState());

        if (state.history.length > 100) {
            state.history.shift();
        }
    }

    function undo() {
        if (!state.history.length) {
            robotSay("There is nothing to undo.");
            showToast("NOTHING TO UNDO");
            return;
        }

        const snapshot = state.history.pop();

        restoreState(snapshot);

        robotSay("Previous move restored.");
        showToast("MOVE UNDONE");

        playSound("undo");
    }

    /* =========================
       TIMER
       ========================= */

    function startTimer() {
        if (state.timerRunning) return;

        state.timerRunning = true;

        if (!state.startTime) {
            state.startTime = Date.now();
        }

        clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            if (!state.startTime) return;

            state.elapsed = Math.floor(
                (Date.now() - state.startTime) / 1000
            );

            timerEl.textContent = formatTime(state.elapsed);
        }, 1000);
    }

    function stopTimer() {
        state.timerRunning = false;
        clearInterval(timerInterval);
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0");

        const secs = (seconds % 60)
            .toString()
            .padStart(2, "0");

        return `${mins}:${secs}`;
    }

    /* =========================
       GAME SETUP
       ========================= */

    function newGame() {
        stopTimer();

        const deck = shuffle(createDeck());

        state.stock = [];
        state.waste = [];

        state.tableau = [
            [],
            [],
            [],
            [],
            [],
            [],
            []
        ];

        state.foundations = {
            "♠": [],
            "♥": [],
            "♦": [],
            "♣": []
        };

        state.score = 0;
        state.moves = 0;
        state.elapsed = 0;
        state.startTime = null;
        state.timerRunning = false;

        state.history = [];
        state.selected = null;
        state.dragged = null;

        /*
           Klondike deal:
           Column 1 = 1 card
           Column 2 = 2 cards
           ...
           Column 7 = 7 cards
        */

        for (let column = 0; column < 7; column++) {
            for (let row = 0; row <= column; row++) {
                const card = deck.pop();

                card.faceUp = row === column;

                state.tableau[column].push(card);
            }
        }

        state.stock = deck;

        renderAll();

        robotSay("New game initialized. Your move.");

        playSound("new");

        setTimeout(() => {
            startTimer();
        }, 400);
    }

    /* =========================
       STOCK
       ========================= */

    function drawFromStock() {
        startTimer();

        if (state.stock.length > 0) {
            saveHistory();

            const card = state.stock.pop();

            card.faceUp = true;

            state.waste.push(card);

            state.moves++;

            updateScore(0);

            robotSay(
                state.stock.length === 0
                    ? "Stock exhausted. Waste can be recycled."
                    : "Card drawn."
            );

            playSound("draw");

            renderAll();

            return;
        }

        /*
           If stock is empty, recycle waste.
        */

        if (state.waste.length > 0) {
            saveHistory();

            state.stock = state.waste
                .slice()
                .reverse()
                .map(card => ({
                    ...card,
                    faceUp: false
                }));

            state.waste = [];

            state.moves++;

            robotSay("Waste recycled. Try another route.");

            showToast("STOCK RECYCLED");

            playSound("recycle");

            renderAll();

            return;
        }

        robotSay("No cards remain in the stock or waste.");
        showToast("NO CARDS");
    }

    /* =========================
       VALIDATION
       ========================= */

    function canMoveToTableau(cards, targetColumn) {
        if (!cards.length) return false;

        const movingCard = cards[0];

        const target = state.tableau[targetColumn];

        /*
           Empty tableau accepts only a King.
        */

        if (target.length === 0) {
            return movingCard.value === 13;
        }

        const targetCard = target[target.length - 1];

        if (!targetCard.faceUp) {
            return false;
        }

        return (
            oppositeColors(movingCard, targetCard) &&
            movingCard.value === targetCard.value - 1
        );
    }

    function canMoveToFoundation(card, suit) {
        const foundation = state.foundations[suit];

        /*
           Foundation must match suit.
        */

        if (card.suit !== suit) {
            return false;
        }

        if (foundation.length === 0) {
            return card.value === 1;
        }

        const top = foundation[foundation.length - 1];

        return card.value === top.value + 1;
    }

    /* =========================
       TABLEAU MOVEMENT
       ========================= */

    function getMovableSequence(column, index) {
        const cards = state.tableau[column];

        if (
            index < 0 ||
            index >= cards.length ||
            !cards[index].faceUp
        ) {
            return [];
        }

        const selected = cards.slice(index);

        for (let i = 0; i < selected.length - 1; i++) {
            const a = selected[i];
            const b = selected[i + 1];

            if (
                !b.faceUp ||
                !oppositeColors(a, b) ||
                a.value !== b.value + 1
            ) {
                return [];
            }
        }

        return selected;
    }

    function moveTableauToTableau(fromColumn, index, toColumn) {
        if (fromColumn === toColumn) return false;

        const moving = getMovableSequence(
            fromColumn,
            index
        );

        if (!moving.length) {
            robotSay("That sequence cannot move.");
            showToast("INVALID MOVE");
            return false;
        }

        if (!canMoveToTableau(moving, toColumn)) {
            robotSay("That sequence does not fit there.");
            showToast("INVALID MOVE");
            return false;
        }

        saveHistory();

        state.tableau[fromColumn].splice(
            index,
            moving.length
        );

        state.tableau[toColumn].push(...moving);

        revealLastCard(fromColumn);

        state.moves++;

        updateScore(5);

        robotSay("Sequence moved.");

        playSound("move");

        renderAll();

        checkWin();

        return true;
    }

    /* =========================
       WASTE → TABLEAU
       ========================= */

    function moveWasteToTableau(column) {
        if (!state.waste.length) return false;

        const card = state.waste[state.waste.length - 1];

        if (!canMoveToTableau([card], column)) {
            robotSay("The waste card cannot go there.");
            showToast("INVALID MOVE");
            return false;
        }

        saveHistory();

        state.waste.pop();

        state.tableau[column].push(card);

        state.moves++;

        updateScore(5);

        robotSay("Waste card deployed.");

        playSound("move");

        renderAll();

        checkWin();

        return true;
    }

    /* =========================
       TABLEAU → FOUNDATION
       ========================= */

    function moveTableauToFoundation(
        column,
        index,
        suit = null
    ) {
        const sequence = getMovableSequence(
            column,
            index
        );

        if (sequence.length !== 1) {
            robotSay("Only one card can enter a foundation.");
            return false;
        }

        const card = sequence[0];

        const targetSuit = suit || card.suit;

        if (!canMoveToFoundation(card, targetSuit)) {
            robotSay("That card cannot enter the foundation yet.");
            showToast("FOUNDATION BLOCKED");
            return false;
        }

        saveHistory();

        state.tableau[column].splice(index, 1);

        state.foundations[targetSuit].push(card);

        revealLastCard(column);

        state.moves++;

        updateScore(10);

        robotSay("Foundation updated.");

        playSound("foundation");

        renderAll();

        checkWin();

        return true;
    }

    /* =========================
       WASTE → FOUNDATION
       ========================= */

    function moveWasteToFoundation() {
        if (!state.waste.length) return false;

        const card = state.waste[state.waste.length - 1];

        if (!canMoveToFoundation(card, card.suit)) {
            robotSay("That waste card is not ready for the foundation.");
            showToast("FOUNDATION BLOCKED");
            return false;
        }

        saveHistory();

        state.waste.pop();

        state.foundations[card.suit].push(card);

        state.moves++;

        updateScore(10);

        robotSay("Excellent. Foundation advanced.");

        playSound("foundation");

        renderAll();

        checkWin();

        return true;
    }

    /* =========================
       REVEAL
       ========================= */

    function revealLastCard(column) {
        const cards = state.tableau[column];

        if (!cards.length) return;

        const last = cards[cards.length - 1];

        if (!last.faceUp) {
            last.faceUp = true;

            state.score += 5;

            robotSay("Hidden card revealed.");
        }
    }

    /* =========================
       AUTO FOUNDATION
       ========================= */

    function tryAutoFoundation(card) {
        if (!card || !card.faceUp) return false;

        if (!canMoveToFoundation(card, card.suit)) {
            return false;
        }

        /*
           Find card location.
        */

        for (let column = 0; column < 7; column++) {
            const cards = state.tableau[column];

            const index = cards.findIndex(
                c => c.id === card.id
            );

            if (index !== -1) {
                if (
                    index !== cards.length - 1
                ) {
                    return false;
                }

                return moveTableauToFoundation(
                    column,
                    index
                );
            }
        }

        if (
            state.waste.length &&
            state.waste[state.waste.length - 1].id === card.id
        ) {
            return moveWasteToFoundation();
        }

        return false;
    }

    /* =========================
       SELECTION / TAP CONTROL
       ========================= */

    function handleCardTap(location) {
        /*
           location:
           {
             type: "tableau" | "waste",
             column?,
             index?,
             card
           }
        */

        const card = location.card;

        if (!card || !card.faceUp) return;

        /*
           Nothing selected yet.
        */

        if (!state.selected) {
            state.selected = location;

            highlightSelected();

            robotSay("Card selected. Choose a destination.");

            return;
        }

        /*
           Tapping the same card deselects.
        */

        if (
            state.selected.card.id === card.id
        ) {
            state.selected = null;

            clearSelection();

            robotSay("Selection cleared.");

            return;
        }

        /*
           If another card is selected,
           try to move the selected card/sequence.
        */

        if (location.type === "tableau") {
            attemptSelectedToTableau(
                location.column
            );

            return;
        }

        if (location.type === "waste") {
            /*
               Tapping another waste card doesn't
               create a useful destination.
            */

            state.selected = location;

            highlightSelected();

            return;
        }
    }

    function attemptSelectedToTableau(targetColumn) {
        const selected = state.selected;

        if (!selected) return;

        let success = false;

        if (selected.type === "tableau") {
            success = moveTableauToTableau(
                selected.column,
                selected.index,
                targetColumn
            );
        } else if (selected.type === "waste") {
            success = moveWasteToTableau(
                targetColumn
            );
        }

        if (success) {
            state.selected = null;
            clearSelection();
        }
    }

    /* =========================
       HIGHLIGHTING
       ========================= */

    function highlightSelected() {
        clearSelection();

        if (!state.selected) return;

        const el = document.querySelector(
            `[data-card-id="${state.selected.card.id}"]`
        );

        if (el) {
            el.classList.add("selected-card");
        }
    }

    function clearSelection() {
        document
            .querySelectorAll(".selected-card")
            .forEach(el => {
                el.classList.remove("selected-card");
            });
    }

    /* =========================
       DRAG & DROP
       ========================= */

    function startDrag(event, location) {
        if (!location.card.faceUp) return;

        /*
           Touch handling is deliberately handled
           through tap-to-move for Android.
        */

        if (event.pointerType === "touch") {
            return;
        }

        state.dragged = location;

        event.dataTransfer?.setData(
            "text/plain",
            location.card.id
        );

        event.dataTransfer?.effectAllowed = "move";

        const el = event.currentTarget;

        el.classList.add("dragging");
    }

    function endDrag(event) {
        document
            .querySelectorAll(".dragging")
            .forEach(el => {
                el.classList.remove("dragging");
            });

        state.dragged = null;
    }

    function dropOnTableau(event, targetColumn) {
        event.preventDefault();

        if (!state.dragged) return;

        const source = state.dragged;

        let success = false;

        if (source.type === "tableau") {
            success = moveTableauToTableau(
                source.column,
                source.index,
                targetColumn
            );
        } else if (source.type === "waste") {
            success = moveWasteToTableau(
                targetColumn
            );
        }

        if (success) {
            state.selected = null;
            clearSelection();
        }

        endDrag(event);
    }

    /* =========================
       HINT SYSTEM
       ========================= */

    function getHint() {
        /*
           1. Waste → foundation
        */

        if (state.waste.length) {
            const card =
                state.waste[state.waste.length - 1];

            if (canMoveToFoundation(card, card.suit)) {
                return `Move ${card.rank}${card.suit} to its foundation.`;
            }

            for (let column = 0; column < 7; column++) {
                if (
                    canMoveToTableau(
                        [card],
                        column
                    )
                ) {
                    return `Move ${card.rank}${card.suit} from the waste to column ${column + 1}.`;
                }
            }
        }

        /*
           2. Tableau → foundation
        */

        for (let column = 0; column < 7; column++) {
            const cards = state.tableau[column];

            if (!cards.length) continue;

            const card =
                cards[cards.length - 1];

            if (
                card.faceUp &&
                canMoveToFoundation(
                    card,
                    card.suit
                )
            ) {
                return `Move ${card.rank}${card.suit} to its foundation.`;
            }
        }

        /*
           3. Tableau → tableau
        */

        for (let from = 0; from < 7; from++) {
            const cards = state.tableau[from];

            for (
                let index = 0;
                index < cards.length;
                index++
            ) {
                if (!cards[index].faceUp) continue;

                const moving =
                    getMovableSequence(
                        from,
                        index
                    );

                if (!moving.length) continue;

                for (let to = 0; to < 7; to++) {
                    if (from === to) continue;

                    if (
                        canMoveToTableau(
                            moving,
                            to
                        )
                    ) {
                        return `Move ${moving[0].rank}${moving[0].suit} to column ${to + 1}.`;
                    }
                }
            }
        }

        /*
           4. Flip hidden card
        */

        for (let column = 0; column < 7; column++) {
            const cards = state.tableau[column];

            if (
                cards.length &&
                !cards[cards.length - 1].faceUp
            ) {
                return `Reveal the hidden card in column ${column + 1}.`;
            }
        }

        if (state.stock.length) {
            return "Draw another card from the stock.";
        }

        if (state.waste.length) {
            return "Recycle the waste and continue.";
        }

        return "No obvious move found. Think carefully.";
    }

    function showHint() {
        const hint = getHint();

        robotSay(`HINT: ${hint}`);

        showToast(hint);

        /*
           Temporarily highlight possible target
           when there is a simple tableau hint.
        */

        document
            .querySelectorAll(".hint-glow")
            .forEach(el => {
                el.classList.remove("hint-glow");
            });

        const message = hint;

        if (message.includes("column")) {
            const match =
                message.match(/column (\d+)/);

            if (match) {
                const column =
                    Number(match[1]) - 1;

                const el =
                    tableauEl.children[column];

                if (el) {
                    el.classList.add("hint-glow");

                    setTimeout(() => {
                        el.classList.remove(
                            "hint-glow"
                        );
                    }, 1800);
                }
            }
        }

        playSound("hint");
    }

    /* =========================
       WIN CHECK
       ========================= */

    function checkWin() {
        let total = 0;

        for (const suit of SUITS) {
            total +=
                state.foundations[suit].length;
        }

        if (total !== 52) return;

        stopTimer();

        state.score += 100;

        $("finalScore").textContent =
            state.score;

        $("finalMoves").textContent =
            state.moves;

        $("finalTime").textContent =
            formatTime(state.elapsed);

        winOverlay.classList.remove("hidden");

        recordWin();

        robotSay("System complete. You conquered the void.");

        playSound("win");
    }

    /* =========================
       SCORE
       ========================= */

    function updateScore(amount) {
        state.score += amount;

        if (state.score < 0) {
            state.score = 0;
        }
    }

    /* =========================
       RENDERING
       ========================= */

    function renderAll() {
        renderStock();
        renderWaste();
        renderFoundations();
        renderTableau();

        scoreEl.textContent = state.score;
        movesEl.textContent = state.moves;
        timerEl.textContent = formatTime(state.elapsed);

        /*
           Restore selected card highlight.
        */

        if (state.selected) {
            highlightSelected();
        }
    }

    /* =========================
       CARD HTML
       ========================= */

    function createCardElement(card, location) {
        const el = document.createElement("div");

        el.className = "playing-card";

        if (card.faceUp) {
            el.classList.add("face-up");

            if (isRed(card)) {
                el.classList.add("red-card");
            } else {
                el.classList.add("black-card");
            }

            el.innerHTML = createCardFace(card);
        } else {
            el.classList.add("face-down");

            el.innerHTML = `
                <div class="card-back-inner">
                    <div class="back-grid"></div>
                    <div class="back-symbol">✦</div>
                    <div class="back-label">VOID</div>
                </div>
            `;
        }

        el.dataset.cardId = card.id;

        if (location.type === "tableau") {
            el.dataset.column = location.column;
            el.dataset.index = location.index;
        }

        /*
           Pointer/tap.
        */

        el.addEventListener(
            "click",
            event => {
                event.stopPropagation();

                if (!card.faceUp) return;

                handleCardTap(location);
            }
        );

        /*
           Double click = auto foundation.
        */

        el.addEventListener(
            "dblclick",
            event => {
                event.stopPropagation();

                if (!card.faceUp) return;

                if (tryAutoFoundation(card)) {
                    state.selected = null;
                    clearSelection();
                }
            }
        );

        /*
           Desktop drag.
        */

        if (card.faceUp) {
            el.draggable = true;

            el.addEventListener(
                "dragstart",
                event => {
                    startDrag(event, location);
                }
            );

            el.addEventListener(
                "dragend",
                endDrag
            );
        }

        return el;
    }

    function createCardFace(card) {
        const value = card.rank;
        const suit = card.suit;

        /*
           Face cards.
        */

        if (
            card.value === 11 ||
            card.value === 12 ||
            card.value === 13
        ) {
            const faceLetter =
                card.value === 11
                    ? "J"
                    : card.value === 12
                        ? "Q"
                        : "K";

            const title =
                card.value === 11
                    ? "JACK"
                    : card.value === 12
                        ? "QUEEN"
                        : "KING";

            return `
                <div class="card-corner top-left">
                    <strong>${value}</strong>
                    <span>${suit}</span>
                </div>

                <div class="face-card">
                    <div class="face-crown">
                        ${card.value === 13 ? "♛" : card.value === 12 ? "♕" : "♞"}
                    </div>

                    <div class="face-letter">
                        ${faceLetter}
                    </div>

                    <div class="face-suit">
                        ${suit}
                    </div>

                    <div class="face-title">
                        ${title}
                    </div>
                </div>

                <div class="card-corner bottom-right">
                    <strong>${value}</strong>
                    <span>${suit}</span>
                </div>
            `;
        }

        /*
           Ace.
        */

        if (card.value === 1) {
            return `
                <div class="card-corner top-left">
                    <strong>A</strong>
                    <span>${suit}</span>
                </div>

                <div class="ace-center">
                    ${suit}
                </div>

                <div class="card-corner bottom-right">
                    <strong>A</strong>
                    <span>${suit}</span>
                </div>
            `;
        }

        /*
           Number cards.
        */

        return `
            <div class="card-corner top-left">
                <strong>${value}</strong>
                <span>${suit}</span>
            </div>

            <div class="pip-area">
                ${createPips(card.value, suit)}
            </div>

            <div class="card-corner bottom-right">
                <strong>${value}</strong>
                <span>${suit}</span>
            </div>
        `;
    }

    /*
       Creates actual visible suit symbols.
    */

    function createPips(value, suit) {
        const positions = {
            2: [
                "top",
                "bottom"
            ],

            3: [
                "top",
                "middle",
                "bottom"
            ],

            4: [
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right"
            ],

            5: [
                "top-left",
                "top-right",
                "middle",
                "bottom-left",
                "bottom-right"
            ],

            6: [
                "top-left",
                "top-right",
                "middle-left",
                "middle-right",
                "bottom-left",
                "bottom-right"
            ],

            7: [
                "top-left",
                "top-right",
                "middle-left",
                "middle-right",
                "bottom-left",
                "bottom-right",
                "center"
            ],

            8: [
                "top-left",
                "top-right",
                "upper-mid-left",
                "upper-mid-right",
                "lower-mid-left",
                "lower-mid-right",
                "bottom-left",
                "bottom-right"
            ],

            9: [
                "top-left",
                "top-right",
                "upper-mid-left",
                "upper-mid-right",
                "center",
                "lower-mid-left",
                "lower-mid-right",
                "bottom-left",
                "bottom-right"
            ],

            10: [
                "top-left",
                "top-right",
                "upper-mid-left",
                "upper-mid-right",
                "middle-left",
                "middle-right",
                "lower-mid-left",
                "lower-mid-right",
                "bottom-left",
                "bottom-right"
            ]
        };

        const list =
            positions[value] || [];

        return `
            <div class="pips pips-${value}">
                ${list.map(position => `
                    <span
                        class="pip ${position}"
                    >${suit}</span>
                `).join("")}
            </div>
        `;
    }

    /* =========================
       STOCK RENDER
       ========================= */

    function renderStock() {
        stockEl.innerHTML = "";

        if (!state.stock.length) {
            stockEl.innerHTML = `
                <div class="empty-pile">
                    <span>↻</span>
                    <small>RECYCLE</small>
                </div>
            `;
            return;
        }

        /*
           Show several layered cards so
           the stock looks like a real deck.
        */

        const stackPreview =
            Math.min(4, state.stock.length);

        for (
            let i = stackPreview - 1;
            i >= 0;
            i--
        ) {
            const fakeCard =
                state.stock[
                    state.stock.length - 1 - i
                ];

            const back =
                document.createElement("div");

            back.className =
                "playing-card stock-card face-down";

            back.style.setProperty(
                "--stack-index",
                i
            );

            back.innerHTML = `
                <div class="card-back-inner">
                    <div class="back-grid"></div>
                    <div class="back-symbol">✦</div>
                    <div class="back-label">VOID</div>
                </div>
            `;

            stockEl.appendChild(back);
        }
    }

    /* =========================
       WASTE RENDER
       ========================= */

    function renderWaste() {
        wasteEl.innerHTML = "";

        if (!state.waste.length) {
            wasteEl.innerHTML = `
                <div class="empty-pile">
                    <span>◇</span>
                    <small>WASTE</small>
                </div>
            `;

            return;
        }

        const card =
            state.waste[state.waste.length - 1];

        wasteEl.appendChild(
            createCardElement(card, {
                type: "waste",
                card
            })
        );
    }

    /* =========================
       FOUNDATION RENDER
       ========================= */

    function renderFoundations() {
        for (const suit of SUITS) {
            const el =
                foundationEls[suit];

            el.innerHTML = "";

            const foundation =
                state.foundations[suit];

            if (!foundation.length) {
                el.innerHTML = `
                    <div class="foundation-empty">
                        <span>${suit}</span>
                        <small>A → K</small>
                    </div>
                `;

                continue;
            }

            const card =
                foundation[
                    foundation.length - 1
                ];

            el.appendChild(
                createCardElement(card, {
                    type: "foundation",
                    suit,
                    card
                })
            );
        }
    }

    /* =========================
       TABLEAU RENDER
       ========================= */

    function renderTableau() {
        tableauEl.innerHTML = "";

        for (let column = 0; column < 7; column++) {
            const columnEl =
                document.createElement("div");

            columnEl.className =
                "tableau-column";

            columnEl.dataset.column =
                column;

            columnEl.addEventListener(
                "dragover",
                event => {
                    event.preventDefault();

                    columnEl.classList.add(
                        "drop-target"
                    );
                }
            );

            columnEl.addEventListener(
                "dragleave",
                () => {
                    columnEl.classList.remove(
                        "drop-target"
                    );
                }
            );

            columnEl.addEventListener(
                "drop",
                event => {
                    columnEl.classList.remove(
                        "drop-target"
                    );

                    dropOnTableau(
                        event,
                        column
                    );
                }
            );

            columnEl.addEventListener(
                "click",
                event => {
                    /*
                       Clicking empty column while
                       a card is selected.
                    */

                    if (
                        event.target === columnEl &&
                        state.selected
                    ) {
                        attemptSelectedToTableau(
                            column
                        );
                    }
                }
            );

            const cards =
                state.tableau[column];

            if (!cards.length) {
                columnEl.innerHTML = `
                    <div class="empty-tableau">
                        <span>K</span>
                    </div>
                `;
            }

            cards.forEach(
                (card, index) => {
                    const cardEl =
                        createCardElement(
                            card,
                            {
                                type: "tableau",
                                column,
                                index,
                                card
                            }
                        );

                    /*
                       Stack cards vertically.
                    */

                    const offset =
                        card.faceUp
                            ? 42
                            : 27;

                    cardEl.style.top =
                        `${index * offset}px`;

                    /*
                       Make sequences feel like
                       one draggable group.
                    */

                    if (
                        card.faceUp &&
                        index < cards.length - 1
                    ) {
                        const sequence =
                            getMovableSequence(
                                column,
                                index
                            );

                        if (
                            sequence.length > 1
                        ) {
                            cardEl.classList.add(
                                "sequence-start"
                            );
                        }
                    }

                    columnEl.appendChild(cardEl);
                }
            );

            /*
               Give column enough height.
            */

            const height =
                cards.length
                    ? Math.max(
                        180,
                        170 +
                        (
                            cards.length - 1
                        ) * 42
                    )
                    : 180;

            columnEl.style.minHeight =
                `${height}px`;

            tableauEl.appendChild(
                columnEl
            );
        }
    }

    /* =========================
       STOCK CLICK
       ========================= */

    stockEl.addEventListener(
        "click",
        () => {
            state.selected = null;
            clearSelection();

            drawFromStock();
        }
    );

    /* =========================
       FOUNDATION CLICK
       ========================= */

    for (const suit of SUITS) {
        foundationEls[suit].addEventListener(
            "click",
            () => {
                if (!state.selected) return;

                const selected =
                    state.selected;

                let success = false;

                if (
                    selected.type ===
                    "tableau"
                ) {
                    success =
                        moveTableauToFoundation(
                            selected.column,
                            selected.index,
                            suit
                        );
                } else if (
                    selected.type ===
                    "waste"
                ) {
                    const card =
                        state.waste[
                            state.waste.length - 1
                        ];

                    if (
                        card &&
                        canMoveToFoundation(
                            card,
                            suit
                        )
                    ) {
                        success =
                            moveWasteToFoundation();
                    }
                }

                if (success) {
                    state.selected = null;
                    clearSelection();
                }
            }
        );
    }

    /* =========================
       BUTTONS
       ========================= */

    $("newGameBtn").addEventListener(
        "click",
        newGame
    );

    $("againBtn").addEventListener(
        "click",
        () => {
            winOverlay.classList.add(
                "hidden"
            );

            newGame();
        }
    );

    $("undoBtn").addEventListener(
        "click",
        undo
    );

    $("hintBtn").addEventListener(
        "click",
        showHint
    );

    $("statsBtn").addEventListener(
        "click",
        () => {
            updateStatisticsDisplay();

            statsOverlay.classList.remove(
                "hidden"
            );
        }
    );

    $("closeStats").addEventListener(
        "click",
        () => {
            statsOverlay.classList.add(
                "hidden"
            );
        }
    );

    /*
       Clicking outside modal closes stats.
    */

    statsOverlay.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                statsOverlay
            ) {
                statsOverlay.classList.add(
                    "hidden"
                );
            }
        }
    );

    /* =========================
       SOUND
       ========================= */

    $("soundBtn").addEventListener(
        "click",
        () => {
            state.sound =
                !state.sound;

            $("soundBtn").classList.toggle(
                "muted",
                !state.sound
            );

            robotSay(
                state.sound
                    ? "Audio systems online."
                    : "Audio systems muted."
            );
        }
    );

    function playSound(type) {
        if (!state.sound) return;

        /*
           Tiny Web Audio effects.
           No external files required.
        */

        try {
            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContext) return;

            const ctx =
                new AudioContext();

            const oscillator =
                ctx.createOscillator();

            const gain =
                ctx.createGain();

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            let frequency = 420;

            if (type === "move")
                frequency = 520;

            if (type === "draw")
                frequency = 390;

            if (type === "foundation")
                frequency = 680;

            if (type === "win")
                frequency = 760;

            if (type === "undo")
                frequency = 280;

            if (type === "hint")
                frequency = 600;

            oscillator.frequency.value =
                frequency;

            oscillator.type =
                "sine";

            gain.gain.setValueAtTime(
                0.0001,
                ctx.currentTime
            );

            gain.gain.exponentialRampToValueAtTime(
                0.035,
                ctx.currentTime + 0.01
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                ctx.currentTime + 0.12
            );

            oscillator.start();

            oscillator.stop(
                ctx.currentTime + 0.13
            );
        } catch (error) {
            /*
               Sound is optional.
            */
        }
    }

    /* =========================
       ROBOT
       ========================= */

    const robotLines = [
        "Your move.",
        "I am observing.",
        "Interesting choice.",
        "The void is calculating.",
        "Do not rush.",
        "A better move may exist.",
        "Probability is shifting.",
        "I see a possible sequence.",
        "That was acceptable.",
        "Continue."
    ];

    function robotSay(message) {
        if (robotMessageEl) {
            robotMessageEl.innerHTML =
                message;
        }

        if (mobileMessageEl) {
            mobileMessageEl.textContent =
                message;
        }
    }

    /* =========================
       TOAST
       ========================= */

    let toastTimeout = null;

    function showToast(message) {
        toastEl.textContent =
            message;

        toastEl.classList.add(
            "show"
        );

        clearTimeout(toastTimeout);

        toastTimeout =
            setTimeout(() => {
                toastEl.classList.remove(
                    "show"
                );
            }, 1900);
    }

    /* =========================
       STATISTICS
       ========================= */

    function getStats() {
        try {
            return JSON.parse(
                localStorage.getItem(
                    "voidSolitaireStats"
                )
            ) || {
                played: 0,
                won: 0,
                bestScore: 0,
                bestTime: null
            };
        } catch {
            return {
                played: 0,
                won: 0,
                bestScore: 0,
                bestTime: null
            };
        }
    }

    function saveStats(stats) {
        try {
            localStorage.setItem(
                "voidSolitaireStats",
                JSON.stringify(stats)
            );
        } catch {
            /*
               Ignore storage failures.
            */
        }
    }

    function recordGamePlayed() {
        const stats =
            getStats();

        stats.played++;

        saveStats(stats);
    }

    function recordWin() {
        const stats =
            getStats();

        stats.won++;

        stats.bestScore =
            Math.max(
                stats.bestScore || 0,
                state.score
            );

        if (
            stats.bestTime === null ||
            state.elapsed <
                stats.bestTime
        ) {
            stats.bestTime =
                state.elapsed;
        }

        saveStats(stats);

        updateStatisticsDisplay();
    }

    function updateStatisticsDisplay() {
        const stats =
            getStats();

        $("gamesPlayed").textContent =
            stats.played;

        $("gamesWon").textContent =
            stats.won;

        $("bestScore").textContent =
            stats.bestScore || 0;

        $("bestTime").textContent =
            stats.bestTime !== null
                ? formatTime(
                    stats.bestTime
                )
                : "--:--";
    }

    /* =========================
       COUNT GAME
       ========================= */

    /*
       Count every fresh game once.
    */

    let gameCounted = false;

    function countCurrentGame() {
        if (gameCounted) return;

        gameCounted = true;

        recordGamePlayed();
    }

    /* =========================
       RANDOM ROBOT IDLE CHAT
       ========================= */

    setInterval(() => {
        if (
            state.moves === 0 ||
            winOverlay.classList.contains(
                "hidden"
            ) === false
        ) {
            return;
        }

        /*
           Don't interrupt the player too often.
        */

        if (
            Math.random() < 0.18
        ) {
            const line =
                robotLines[
                    Math.floor(
                        Math.random() *
                        robotLines.length
                    )
                ];

            robotSay(line);
        }
    }, 12000);

    /* =========================
       INITIALIZE
       ========================= */

    function initialize() {
        updateStatisticsDisplay();

        newGame();

        countCurrentGame();
    }

    initialize();

})();
