/* =========================================================
   VOID // SOLITAIRE
   MOBILE + DESKTOP KLONDIKE ENGINE
   ========================================================= */

(() => {
    "use strict";

    /* =========================
       CONSTANTS
       ========================= */

    const SUITS = ["♠", "♥", "♦", "♣"];

    const RED_SUITS = new Set(["♥", "♦"]);

    const RANKS = [
        "A", "2", "3", "4", "5", "6", "7",
        "8", "9", "10", "J", "Q", "K"
    ];

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

        elapsed: 0,
        startTime: null,
        timerRunning: false,

        history: [],

        selected: null,
        dragged: null,

        sound: true
    };

    let timerInterval = null;
    let toastTimeout = null;

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


    /* =========================================================
       CARD UTILITIES
       ========================================================= */

    function rankValue(card) {
        return card.value;
    }

    function isRed(card) {
        return RED_SUITS.has(card.suit);
    }

    function oppositeColors(a, b) {
        return isRed(a) !== isRed(b);
    }

    function createDeck() {
        const deck = [];

        for (const suit of SUITS) {
            for (let value = 1; value <= 13; value++) {

                deck.push({
                    id:
                        `${suit}-${value}-${Math.random()
                            .toString(36)
                            .slice(2, 10)}`,

                    suit,
                    value,
                    rank: RANKS[value - 1],

                    faceUp: false
                });
            }
        }

        return deck;
    }

    function shuffle(array) {
        const copy = [...array];

        for (let i = copy.length - 1; i > 0; i--) {

            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [
                copy[i],
                copy[j]
            ] = [
                copy[j],
                copy[i]
            ];
        }

        return copy;
    }


    /* =========================================================
       STATE / HISTORY
       ========================================================= */

    function cloneGameState() {

        return JSON.parse(
            JSON.stringify({
                stock: state.stock,
                waste: state.waste,
                tableau: state.tableau,
                foundations: state.foundations,
                score: state.score,
                moves: state.moves
            })
        );
    }

    function saveHistory() {

        state.history.push(
            cloneGameState()
        );

        if (state.history.length > 100) {
            state.history.shift();
        }
    }

    function restoreState(snapshot) {

        state.stock =
            snapshot.stock;

        state.waste =
            snapshot.waste;

        state.tableau =
            snapshot.tableau;

        state.foundations =
            snapshot.foundations;

        state.score =
            snapshot.score;

        state.moves =
            snapshot.moves;

        state.selected = null;
        state.dragged = null;

        renderAll();
    }

    function undo() {

        if (!state.history.length) {

            robotSay(
                "There is nothing to undo."
            );

            showToast(
                "NOTHING TO UNDO"
            );

            return;
        }

        const previous =
            state.history.pop();

        restoreState(previous);

        robotSay(
            "Previous move restored."
        );

        showToast(
            "MOVE UNDONE"
        );

        playSound("undo");
    }


    /* =========================================================
       TIMER
       ========================================================= */

    function formatTime(seconds) {

        const mins =
            Math.floor(seconds / 60)
                .toString()
                .padStart(2, "0");

        const secs =
            (seconds % 60)
                .toString()
                .padStart(2, "0");

        return `${mins}:${secs}`;
    }

    function startTimer() {

        if (state.timerRunning) return;

        state.timerRunning = true;

        if (!state.startTime) {
            state.startTime =
                Date.now() -
                state.elapsed * 1000;
        }

        clearInterval(timerInterval);

        timerInterval =
            setInterval(() => {

                if (!state.startTime) return;

                state.elapsed =
                    Math.floor(
                        (Date.now() -
                            state.startTime) /
                        1000
                    );

                timerEl.textContent =
                    formatTime(
                        state.elapsed
                    );

            }, 1000);
    }

    function stopTimer() {

        state.timerRunning = false;

        clearInterval(
            timerInterval
        );
    }


    /* =========================================================
       NEW GAME
       ========================================================= */

    function newGame() {

        stopTimer();

        const deck =
            shuffle(
                createDeck()
            );

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

        state.history = [];

        state.selected = null;
        state.dragged = null;

        /*
           Standard Klondike deal.
        */

        for (
            let column = 0;
            column < 7;
            column++
        ) {

            for (
                let row = 0;
                row <= column;
                row++
            ) {

                const card =
                    deck.pop();

                card.faceUp =
                    row === column;

                state.tableau[
                    column
                ].push(card);
            }
        }

        state.stock =
            deck;

        renderAll();

        robotSay(
            "New game initialized. Your move."
        );

        playSound("new");

        setTimeout(
            startTimer,
            500
        );
    }


    /* =========================================================
       STOCK
       ========================================================= */

    function drawFromStock() {

        startTimer();

        /*
           Draw one card.
        */

        if (state.stock.length > 0) {

            saveHistory();

            const card =
                state.stock.pop();

            card.faceUp = true;

            state.waste.push(
                card
            );

            state.moves++;

            robotSay(
                "Card drawn."
            );

            playSound("draw");

            renderAll();

            return;
        }

        /*
           STOCK EMPTY:
           recycle waste.
        */

        if (state.waste.length > 0) {

            saveHistory();

            /*
               The waste pile is reversed
               so the cards return to the
               stock in the correct order.
            */

            state.stock =
                state.waste
                    .slice()
                    .reverse()
                    .map(card => ({
                        ...card,
                        faceUp: false
                    }));

            state.waste = [];

            state.moves++;

            robotSay(
                "Waste recycled. Try another route."
            );

            showToast(
                "STOCK RECYCLED"
            );

            playSound(
                "recycle"
            );

            renderAll();

            return;
        }

        robotSay(
            "There are no cards left."
        );

        showToast(
            "NO CARDS"
        );
    }


    /* =========================================================
       FOUNDATION RULES
       ========================================================= */

    function canMoveToFoundation(
        card,
        suit
    ) {

        if (!card) return false;

        if (card.suit !== suit) {
            return false;
        }

        const foundation =
            state.foundations[suit];

        if (
            foundation.length === 0
        ) {

            return card.value === 1;
        }

        const top =
            foundation[
                foundation.length - 1
            ];

        return (
            card.value ===
            top.value + 1
        );
    }


    /* =========================================================
       TABLEAU RULES
       ========================================================= */

    function canMoveToTableau(
        movingCards,
        targetColumn
    ) {

        if (!movingCards.length) {
            return false;
        }

        const first =
            movingCards[0];

        const target =
            state.tableau[
                targetColumn
            ];

        /*
           Empty column accepts K only.
        */

        if (target.length === 0) {

            return first.value === 13;
        }

        const targetCard =
            target[
                target.length - 1
            ];

        if (!targetCard.faceUp) {
            return false;
        }

        return (
            oppositeColors(
                first,
                targetCard
            ) &&
            first.value ===
            targetCard.value - 1
        );
    }

    function getMovableSequence(
        column,
        index
    ) {

        const cards =
            state.tableau[
                column
            ];

        if (
            index < 0 ||
            index >= cards.length
        ) {
            return [];
        }

        if (
            !cards[index].faceUp
        ) {
            return [];
        }

        const selected =
            cards.slice(index);

        /*
           Every card after the first
           must alternate colour and
           descend by one.
        */

        for (
            let i = 0;
            i < selected.length - 1;
            i++
        ) {

            const a =
                selected[i];

            const b =
                selected[i + 1];

            if (
                !b.faceUp ||
                !oppositeColors(
                    a,
                    b
                ) ||
                a.value !==
                b.value + 1
            ) {

                return [];
            }
        }

        return selected;
    }


    /* =========================================================
       REVEAL HIDDEN CARD
       ========================================================= */

    function revealLastCard(
        column
    ) {

        const cards =
            state.tableau[
                column
            ];

        if (!cards.length) {
            return;
        }

        const last =
            cards[
                cards.length - 1
            ];

        if (!last.faceUp) {

            last.faceUp = true;

            state.score += 5;

            robotSay(
                "Hidden card revealed."
            );
        }
    }


    /* =========================================================
       TABLEAU → TABLEAU
       ========================================================= */

    function moveTableauToTableau(
        fromColumn,
        index,
        toColumn
    ) {

        if (
            fromColumn ===
            toColumn
        ) {
            return false;
        }

        const moving =
            getMovableSequence(
                fromColumn,
                index
            );

        if (!moving.length) {

            showToast(
                "INVALID SEQUENCE"
            );

            robotSay(
                "That sequence cannot move."
            );

            return false;
        }

        if (
            !canMoveToTableau(
                moving,
                toColumn
            )
        ) {

            showToast(
                "INVALID MOVE"
            );

            robotSay(
                "That sequence does not fit there."
            );

            return false;
        }

        saveHistory();

        state.tableau[
            fromColumn
        ].splice(
            index,
            moving.length
        );

        state.tableau[
            toColumn
        ].push(
            ...moving
        );

        revealLastCard(
            fromColumn
        );

        state.moves++;

        state.score += 5;

        robotSay(
            moving.length > 1
                ? "Sequence moved."
                : "Card moved."
        );

        playSound(
            "move"
        );

        state.selected = null;

        renderAll();

        checkWin();

        return true;
    }


    /* =========================================================
       WASTE → TABLEAU
       ========================================================= */

    function moveWasteToTableau(
        targetColumn
    ) {

        if (!state.waste.length) {
            return false;
        }

        const card =
            state.waste[
                state.waste.length - 1
            ];

        if (
            !canMoveToTableau(
                [card],
                targetColumn
            )
        ) {

            showToast(
                "INVALID MOVE"
            );

            robotSay(
                "The waste card cannot go there."
            );

            return false;
        }

        saveHistory();

        state.waste.pop();

        state.tableau[
            targetColumn
        ].push(card);

        state.moves++;

        state.score += 5;

        state.selected = null;

        robotSay(
            "Waste card deployed."
        );

        playSound(
            "move"
        );

        renderAll();

        checkWin();

        return true;
    }


    /* =========================================================
       TABLEAU → FOUNDATION
       ========================================================= */

    function moveTableauToFoundation(
        column,
        index,
        suit
    ) {

        const sequence =
            getMovableSequence(
                column,
                index
            );

        /*
           Only one card may enter
           a foundation.
        */

        if (
            sequence.length !== 1
        ) {

            robotSay(
                "Only one card can enter the foundation."
            );

            return false;
        }

        const card =
            sequence[0];

        if (
            !canMoveToFoundation(
                card,
                suit
            )
        ) {

            showToast(
                "FOUNDATION BLOCKED"
            );

            robotSay(
                "That card cannot enter the foundation yet."
            );

            return false;
        }

        saveHistory();

        state.tableau[
            column
        ].splice(
            index,
            1
        );

        state.foundations[
            suit
        ].push(card);

        revealLastCard(
            column
        );

        state.moves++;

        state.score += 10;

        state.selected = null;

        robotSay(
            `${card.rank}${card.suit} added to foundation.`
        );

        playSound(
            "foundation"
        );

        renderAll();

        checkWin();

        return true;
    }


    /* =========================================================
       WASTE → FOUNDATION
       ========================================================= */

    function moveWasteToFoundation() {

        if (!state.waste.length) {
            return false;
        }

        const card =
            state.waste[
                state.waste.length - 1
            ];

        if (
            !canMoveToFoundation(
                card,
                card.suit
            )
        ) {

            showToast(
                "FOUNDATION BLOCKED"
            );

            robotSay(
                "That waste card is not ready."
            );

            return false;
        }

        saveHistory();

        state.waste.pop();

        state.foundations[
            card.suit
        ].push(card);

        state.moves++;

        state.score += 10;

        state.selected = null;

        robotSay(
            "Excellent. Foundation advanced."
        );

        playSound(
            "foundation"
        );

        renderAll();

        checkWin();

        return true;
    }


    /* =========================================================
       TAP-TO-MOVE
       ========================================================= */

    function handleCardTap(
        location
    ) {

        const card =
            location.card;

        if (
            !card ||
            !card.faceUp
        ) {
            return;
        }

        /*
           NOTHING SELECTED:
           select card.
        */

        if (!state.selected) {

            state.selected =
                location;

            highlightSelected();

            robotSay(
                "Card selected. Choose a destination."
            );

            return;
        }

        /*
           SAME CARD:
           deselect.
        */

        if (
            state.selected.card.id ===
            card.id
        ) {

            state.selected = null;

            clearSelection();

            robotSay(
                "Selection cleared."
            );

            return;
        }

        /*
           Another tableau card:
           attempt move onto it.
        */

        if (
            location.type ===
            "tableau"
        ) {

            attemptSelectedToTableau(
                location.column
            );

            return;
        }

        /*
           Another waste card:
           simply select the new card.
        */

        if (
            location.type ===
            "waste"
        ) {

            state.selected =
                location;

            highlightSelected();

            return;
        }
    }

    function attemptSelectedToTableau(
        targetColumn
    ) {

        const selected =
            state.selected;

        if (!selected) {
            return;
        }

        let success = false;

        if (
            selected.type ===
            "tableau"
        ) {

            success =
                moveTableauToTableau(
                    selected.column,
                    selected.index,
                    targetColumn
                );

        } else if (
            selected.type ===
            "waste"
        ) {

            success =
                moveWasteToTableau(
                    targetColumn
                );
        }

        if (success) {

            state.selected = null;

            clearSelection();
        }
    }


    /* =========================================================
       DOUBLE TAP / AUTO FOUNDATION
       ========================================================= */

    function tryAutoFoundation(
        card
    ) {

        if (
            !card ||
            !card.faceUp
        ) {
            return false;
        }

        if (
            !canMoveToFoundation(
                card,
                card.suit
            )
        ) {
            return false;
        }

        /*
           Search tableau.
        */

        for (
            let column = 0;
            column < 7;
            column++
        ) {

            const cards =
                state.tableau[
                    column
                ];

            const index =
                cards.findIndex(
                    c =>
                        c.id === card.id
                );

            if (index !== -1) {

                if (
                    index !==
                    cards.length - 1
                ) {
                    return false;
                }

                return moveTableauToFoundation(
                    column,
                    index,
                    card.suit
                );
            }
        }

        /*
           Search waste.
        */

        if (
            state.waste.length &&
            state.waste[
                state.waste.length - 1
            ].id === card.id
        ) {

            return moveWasteToFoundation();
        }

        return false;
    }


    /* =========================================================
       SELECTION VISUALS
       ========================================================= */

    function clearSelection() {

        document
            .querySelectorAll(
                ".selected-card"
            )
            .forEach(el => {

                el.classList.remove(
                    "selected-card"
                );
            });
    }

    function highlightSelected() {

        clearSelection();

        if (!state.selected) {
            return;
        }

        const el =
            document.querySelector(
                `[data-card-id="${state.selected.card.id}"]`
            );

        if (el) {

            el.classList.add(
                "selected-card"
            );
        }
    }


    /* =========================================================
       TOUCH DRAGGING
       ========================================================= */

    let touchData = null;

    function setupTouchDrag(
        el,
        location
    ) {

        let startX = 0;
        let startY = 0;

        let moved = false;

        el.addEventListener(
            "pointerdown",
            event => {

                if (
                    event.pointerType !==
                    "touch"
                ) {
                    return;
                }

                if (
                    !location.card.faceUp
                ) {
                    return;
                }

                startX =
                    event.clientX;

                startY =
                    event.clientY;

                moved = false;

                touchData = {
                    location,
                    element: el
                };

                el.setPointerCapture?.(
                    event.pointerId
                );
            }
        );

        el.addEventListener(
            "pointermove",
            event => {

                if (
                    !touchData ||
                    event.pointerType !==
                    "touch"
                ) {
                    return;
                }

                const dx =
                    event.clientX -
                    startX;

                const dy =
                    event.clientY -
                    startY;

                if (
                    Math.abs(dx) > 12 ||
                    Math.abs(dy) > 12
                ) {

                    moved = true;

                    el.classList.add(
                        "dragging"
                    );
                }
            }
        );

        el.addEventListener(
            "pointerup",
            event => {

                if (
                    !touchData ||
                    event.pointerType !==
                    "touch"
                ) {
                    return;
                }

                const data =
                    touchData;

                touchData = null;

                el.classList.remove(
                    "dragging"
                );

                /*
                   If user barely moved:
                   treat it as a normal tap.
                */

                if (!moved) {

                    handleCardTap(
                        location
                    );

                    return;
                }

                /*
                   Find the tableau column
                   underneath the finger.
                */

                const target =
                    document
                        .elementFromPoint(
                            event.clientX,
                            event.clientY
                        );

                const columnEl =
                    target?.closest(
                        ".tableau-column"
                    );

                if (
                    columnEl
                ) {

                    const targetColumn =
                        Number(
                            columnEl.dataset.column
                        );

                    attemptTouchMove(
                        location,
                        targetColumn
                    );

                } else {

                    robotSay(
                        "Drop the card onto a valid column."
                    );
                }
            }
        );

        el.addEventListener(
            "pointercancel",
            () => {

                touchData = null;

                el.classList.remove(
                    "dragging"
                );
            }
        );
    }

    function attemptTouchMove(
        source,
        targetColumn
    ) {

        let success = false;

        if (
            source.type ===
            "tableau"
        ) {

            success =
                moveTableauToTableau(
                    source.column,
                    source.index,
                    targetColumn
                );

        } else if (
            source.type ===
            "waste"
        ) {

            success =
                moveWasteToTableau(
                    targetColumn
                );
        }

        if (success) {

            state.selected = null;

            clearSelection();
        }
    }


    /* =========================================================
       DESKTOP DRAG
       ========================================================= */

    function setupDesktopDrag(
        el,
        location
    ) {

        el.draggable =
            !!location.card.faceUp;

        el.addEventListener(
            "dragstart",
            event => {

                if (
                    !location.card.faceUp
                ) {
                    event.preventDefault();

                    return;
                }

                state.dragged =
                    location;

                event.dataTransfer?.setData(
                    "text/plain",
                    location.card.id
                );

                if (
                    event.dataTransfer
                ) {

                    event.dataTransfer.effectAllowed =
                        "move";
                }

                el.classList.add(
                    "dragging"
                );
            }
        );

        el.addEventListener(
            "dragend",
            () => {

                state.dragged = null;

                el.classList.remove(
                    "dragging"
                );

                document
                    .querySelectorAll(
                        ".drop-target"
                    )
                    .forEach(target =>
                        target.classList.remove(
                            "drop-target"
                        )
                    );
            }
        );
    }


    /* =========================================================
       CARD CREATION
       ========================================================= */

    function createCardElement(
        card,
        location
    ) {

        const el =
            document.createElement(
                "div"
            );

        el.className =
            "playing-card";

        el.dataset.cardId =
            card.id;

        if (
            location.type ===
            "tableau"
        ) {

            el.dataset.column =
                location.column;

            el.dataset.index =
                location.index;
        }

        /*
           FACE DOWN
        */

        if (!card.faceUp) {

            el.classList.add(
                "face-down"
            );

            el.innerHTML = `
                <div class="card-back-inner">
                    <div class="back-grid"></div>
                    <div class="back-symbol">✦</div>
                    <div class="back-label">VOID</div>
                </div>
            `;

            return el;
        }

        /*
           FACE UP
        */

        el.classList.add(
            "face-up"
        );

        el.classList.add(
            isRed(card)
                ? "red-card"
                : "black-card"
        );

        el.innerHTML =
            createCardFace(card);

        /*
           Tap.
        */

        el.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                handleCardTap(
                    location
                );
            }
        );

        /*
           Double click.
        */

        el.addEventListener(
            "dblclick",
            event => {

                event.stopPropagation();

                if (
                    tryAutoFoundation(
                        card
                    )
                ) {

                    state.selected =
                        null;

                    clearSelection();
                }
            }
        );

        /*
           Desktop drag.
        */

        setupDesktopDrag(
            el,
            location
        );

        /*
           Android touch drag.
        */

        setupTouchDrag(
            el,
            location
        );

        return el;
    }


    /* =========================================================
       CARD FACE
       ========================================================= */

    function createCardFace(
        card
    ) {

        const suit =
            card.suit;

        const rank =
            card.rank;

        /*
           FACE CARDS
        */

        if (
            card.value >= 11
        ) {

            const letter =
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

            const symbol =
                card.value === 11
                    ? "♞"
                    : card.value === 12
                        ? "♕"
                        : "♛";

            return `
                <div class="card-corner top-left">
                    <strong>${rank}</strong>
                    <span>${suit}</span>
                </div>

                <div class="face-card">
                    <div class="face-crown">
                        ${symbol}
                    </div>

                    <div class="face-letter">
                        ${letter}
                    </div>

                    <div class="face-suit">
                        ${suit}
                    </div>

                    <div class="face-title">
                        ${title}
                    </div>
                </div>

                <div class="card-corner bottom-right">
                    <strong>${rank}</strong>
                    <span>${suit}</span>
                </div>
            `;
        }

        /*
           ACE
        */

        if (
            card.value === 1
        ) {

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
           NUMBER CARDS
        */

        return `
            <div class="card-corner top-left">
                <strong>${rank}</strong>
                <span>${suit}</span>
            </div>

            <div class="pip-area">
                ${createPips(
                    card.value,
                    suit
                )}
            </div>

            <div class="card-corner bottom-right">
                <strong>${rank}</strong>
                <span>${suit}</span>
            </div>
        `;
    }


    /* =========================================================
       REAL CARD PIPS
       ========================================================= */

    function createPips(
        value,
        suit
    ) {

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
                ${list.map(
                    position => `
                        <span class="pip ${position}">
                            ${suit}
                        </span>
                    `
                ).join("")}
            </div>
        `;
    }


    /* =========================================================
       RENDER STOCK
       ========================================================= */

    function renderStock() {

        stockEl.innerHTML = "";

        /*
           EMPTY STOCK
        */

        if (
            state.stock.length === 0
        ) {

            if (
                state.waste.length > 0
            ) {

                stockEl.innerHTML = `
                    <div class="empty-pile recycle-ready">
                        <span>↻</span>
                        <small>RECYCLE</small>
                    </div>
                `;

            } else {

                stockEl.innerHTML = `
                    <div class="empty-pile">
                        <span>◇</span>
                        <small>EMPTY</small>
                    </div>
                `;
            }

            return;
        }

        /*
           Draw the deck as a layered stack.
        */

        const layers =
            Math.min(
                5,
                state.stock.length
            );

        for (
            let i = layers - 1;
            i >= 0;
            i--
        ) {

            const back =
                document.createElement(
                    "div"
                );

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

            stockEl.appendChild(
                back
            );
        }
    }


    /* =========================================================
       RENDER WASTE
       ========================================================= */

    function renderWaste() {

        wasteEl.innerHTML = "";

        if (
            state.waste.length === 0
        ) {

            wasteEl.innerHTML = `
                <div class="empty-pile">
                    <span>◇</span>
                    <small>WASTE</small>
                </div>
            `;

            return;
        }

        const card =
            state.waste[
                state.waste.length - 1
            ];

        wasteEl.appendChild(
            createCardElement(
                card,
                {
                    type: "waste",
                    card
                }
            )
        );
    }


    /* =========================================================
       RENDER FOUNDATIONS
       ========================================================= */

    function renderFoundations() {

        for (
            const suit of SUITS
        ) {

            const el =
                foundationEls[suit];

            el.innerHTML = "";

            const foundation =
                state.foundations[
                    suit
                ];

            if (
                foundation.length === 0
            ) {

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
                createCardElement(
                    card,
                    {
                        type: "foundation",
                        suit,
                        card
                    }
                )
            );
        }
    }


    /* =========================================================
       RENDER TABLEAU
       ========================================================= */

    function renderTableau() {

        tableauEl.innerHTML = "";

        for (
            let column = 0;
            column < 7;
            column++
        ) {

            const columnEl =
                document.createElement(
                    "div"
                );

            columnEl.className =
                "tableau-column";

            columnEl.dataset.column =
                column;

            /*
               DROP TARGET
            */

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

                    event.preventDefault();

                    columnEl.classList.remove(
                        "drop-target"
                    );

                    if (
                        !state.dragged
                    ) {
                        return;
                    }

                    const source =
                        state.dragged;

                    if (
                        source.type ===
                        "tableau"
                    ) {

                        moveTableauToTableau(
                            source.column,
                            source.index,
                            column
                        );

                    } else if (
                        source.type ===
                        "waste"
                    ) {

                        moveWasteToTableau(
                            column
                        );
                    }

                    state.dragged =
                        null;
                }
            );

            const cards =
                state.tableau[
                    column
                ];

            /*
               EMPTY COLUMN
            */

            if (
                cards.length === 0
            ) {

                columnEl.innerHTML = `
                    <div class="empty-tableau">
                        <span>K</span>
                    </div>
                `;

                /*
                   If a card is selected,
                   clicking empty column
                   attempts the move.
                */

                columnEl.addEventListener(
                    "click",
                    () => {

                        if (
                            state.selected
                        ) {

                            attemptSelectedToTableau(
                                column
                            );
                        }
                    }
                );
            }

            /*
               CARDS
            */

            cards.forEach(
                (card, index) => {

                    const cardEl =
                        createCardElement(
                            card,
                            {
                                type:
                                    "tableau",

                                column,

                                index,

                                card
                            }
                        );

                    /*
                       Proper stack spacing.
                    */

                    const offset =
                        card.faceUp
                            ? 43
                            : 29;

                    cardEl.style.top =
                        `${index * offset}px`;

                    /*
                       Keep last cards
                       touchable.
                    */

                    cardEl.style.zIndex =
                        index + 1;

                    columnEl.appendChild(
                        cardEl
                    );
                }
            );

            /*
               Column height.
            */

            const height =
                cards.length
                    ? Math.max(
                        190,
                        175 +
                        (
                            cards.length - 1
                        ) * 43
                    )
                    : 190;

            columnEl.style.minHeight =
                `${height}px`;

            tableauEl.appendChild(
                columnEl
            );
        }
    }


    /* =========================================================
       FOUNDATION CLICK
       ========================================================= */

    for (
        const suit of SUITS
    ) {

        foundationEls[
            suit
        ].addEventListener(
            "click",
            () => {

                if (
                    !state.selected
                ) {
                    return;
                }

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

                    state.selected =
                        null;

                    clearSelection();
                }
            }
        );
    }


    /* =========================================================
       STOCK CLICK
       ========================================================= */

    stockEl.addEventListener(
        "click",
        () => {

            state.selected = null;

            clearSelection();

            drawFromStock();
        }
    );


    /* =========================================================
       BUTTONS
       ========================================================= */

    $("newGameBtn")
        ?.addEventListener(
            "click",
            newGame
        );

    $("againBtn")
        ?.addEventListener(
            "click",
            () => {

                winOverlay.classList.add(
                    "hidden"
                );

                newGame();
            }
        );

    $("undoBtn")
        ?.addEventListener(
            "click",
            undo
        );

    $("hintBtn")
        ?.addEventListener(
            "click",
            showHint
        );


    /* =========================================================
       STATS
       ========================================================= */

    $("statsBtn")
        ?.addEventListener(
            "click",
            () => {

                updateStatisticsDisplay();

                statsOverlay.classList.remove(
                    "hidden"
                );
            }
        );

    $("closeStats")
        ?.addEventListener(
            "click",
            () => {

                statsOverlay.classList.add(
                    "hidden"
                );
            }
        );

    statsOverlay
        ?.addEventListener(
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


    /* =========================================================
       SOUND
       ========================================================= */

    $("soundBtn")
        ?.addEventListener(
            "click",
            () => {

                state.sound =
                    !state.sound;

                $("soundBtn")
                    .classList.toggle(
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

        if (!state.sound) {
            return;
        }

        try {

            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContext) {
                return;
            }

            const ctx =
                new AudioContext();

            const oscillator =
                ctx.createOscillator();

            const gain =
                ctx.createGain();

            oscillator.connect(
                gain
            );

            gain.connect(
                ctx.destination
            );

            let frequency = 420;

            if (
                type === "move"
            ) {
                frequency = 520;
            }

            if (
                type === "draw"
            ) {
                frequency = 390;
            }

            if (
                type === "foundation"
            ) {
                frequency = 680;
            }

            if (
                type === "win"
            ) {
                frequency = 760;
            }

            if (
                type === "undo"
            ) {
                frequency = 280;
            }

            if (
                type === "hint"
            ) {
                frequency = 600;
            }

            if (
                type === "recycle"
            ) {
                frequency = 340;
            }

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


    /* =========================================================
       ROBOT
       ========================================================= */

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

    function robotSay(
        message
    ) {

        if (
            robotMessageEl
        ) {

            robotMessageEl.innerHTML =
                message;
        }

        if (
            mobileMessageEl
        ) {

            mobileMessageEl.textContent =
                message;
        }
    }


    /* =========================================================
       TOAST
       ========================================================= */

    function showToast(
        message
    ) {

        if (!toastEl) {
            return;
        }

        toastEl.textContent =
            message;

        toastEl.classList.add(
            "show"
        );

        clearTimeout(
            toastTimeout
        );

        toastTimeout =
            setTimeout(
                () => {

                    toastEl.classList.remove(
                        "show"
                    );

                },
                1900
            );
    }


    /* =========================================================
       HINT SYSTEM
       ========================================================= */

    function getHint() {

        /*
           Waste → Foundation
        */

        if (
            state.waste.length
        ) {

            const card =
                state.waste[
                    state.waste.length - 1
                ];

            if (
                canMoveToFoundation(
                    card,
                    card.suit
                )
            ) {

                return `Move ${card.rank}${card.suit} to its foundation.`;
            }

            /*
               Waste → Tableau
            */

            for (
                let column = 0;
                column < 7;
                column++
            ) {

                if (
                    canMoveToTableau(
                        [card],
                        column
                    )
                ) {

                    return `Move ${card.rank}${card.suit} to column ${column + 1}.`;
                }
            }
        }

        /*
           Tableau → Foundation
        */

        for (
            let column = 0;
            column < 7;
            column++
        ) {

            const cards =
                state.tableau[
                    column
                ];

            if (!cards.length) {
                continue;
            }

            const card =
                cards[
                    cards.length - 1
                ];

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
           Tableau → Tableau
        */

        for (
            let from = 0;
            from < 7;
            from++
        ) {

            const cards =
                state.tableau[
                    from
                ];

            for (
                let index = 0;
                index < cards.length;
                index++
            ) {

                if (
                    !cards[index].faceUp
                ) {
                    continue;
                }

                const moving =
                    getMovableSequence(
                        from,
                        index
                    );

                if (
                    !moving.length
                ) {
                    continue;
                }

                for (
                    let to = 0;
                    to < 7;
                    to++
                ) {

                    if (
                        from === to
                    ) {
                        continue;
                    }

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
           Hidden card.
        */

        for (
            let column = 0;
            column < 7;
            column++
        ) {

            const cards =
                state.tableau[
                    column
                ];

            if (
                cards.length &&
                !cards[
                    cards.length - 1
                ].faceUp
            ) {

                return `Reveal the hidden card in column ${column + 1}.`;
            }
        }

        if (
            state.stock.length
        ) {

            return "Draw another card from the stock.";
        }

        if (
            state.waste.length
        ) {

            return "Recycle the waste and continue.";
        }

        return "No obvious move found. Think carefully.";
    }

    function showHint() {

        const hint =
            getHint();

        robotSay(
            `HINT: ${hint}`
        );

        showToast(
            hint
        );

        document
            .querySelectorAll(
                ".hint-glow"
            )
            .forEach(
                el =>
                    el.classList.remove(
                        "hint-glow"
                    )
            );

        const match =
            hint.match(
                /column (\d+)/
            );

        if (match) {

            const column =
                Number(
                    match[1]
                ) - 1;

            const el =
                tableauEl.children[
                    column
                ];

            if (el) {

                el.classList.add(
                    "hint-glow"
                );

                setTimeout(
                    () => {

                        el.classList.remove(
                            "hint-glow"
                        );

                    },
                    1800
                );
            }
        }

        playSound(
            "hint"
        );
    }


    /* =========================================================
       WIN
       ========================================================= */

    function checkWin() {

        let total = 0;

        for (
            const suit of SUITS
        ) {

            total +=
                state.foundations[
                    suit
                ].length;
        }

        if (
            total !== 52
        ) {
            return;
        }

        stopTimer();

        state.score += 100;

        $("finalScore").textContent =
            state.score;

        $("finalMoves").textContent =
            state.moves;

        $("finalTime").textContent =
            formatTime(
                state.elapsed
            );

        winOverlay.classList.remove(
            "hidden"
        );

        recordWin();

        robotSay(
            "System complete. You conquered the void."
        );

        playSound(
            "win"
        );
    }


    /* =========================================================
       STATISTICS
       ========================================================= */

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

    function saveStats(
        stats
    ) {

        try {

            localStorage.setItem(
                "voidSolitaireStats",
                JSON.stringify(
                    stats
                )
            );

        } catch {
            /*
               Ignore storage failure.
            */
        }
    }

    function recordGamePlayed() {

        const stats =
            getStats();

        stats.played++;

        saveStats(
            stats
        );
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

        saveStats(
            stats
        );

        updateStatisticsDisplay();
    }

    function updateStatisticsDisplay() {

        const stats =
            getStats();

        if ($("gamesPlayed")) {
            $("gamesPlayed").textContent =
                stats.played;
        }

        if ($("gamesWon")) {
            $("gamesWon").textContent =
                stats.won;
        }

        if ($("bestScore")) {
            $("bestScore").textContent =
                stats.bestScore || 0;
        }

        if ($("bestTime")) {

            $("bestTime").textContent =
                stats.bestTime !== null
                    ? formatTime(
                        stats.bestTime
                    )
                    : "--:--";
        }
    }


    /* =========================================================
       GAME COUNT
       ========================================================= */

    let gameCounted =
        false;

    function countCurrentGame() {

        if (
            gameCounted
        ) {
            return;
        }

        gameCounted =
            true;

        recordGamePlayed();
    }


    /* =========================================================
       ROBOT IDLE CHAT
       ========================================================= */

    setInterval(
        () => {

            if (
                state.moves === 0
            ) {
                return;
            }

            if (
                !winOverlay.classList.contains(
                    "hidden"
                )
            ) {
                return;
            }

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

                robotSay(
                    line
                );
            }

        },
        12000
    );


    /* =========================================================
       RENDER EVERYTHING
       ========================================================= */

    function renderAll() {

        renderStock();

        renderWaste();

        renderFoundations();

        renderTableau();

        scoreEl.textContent =
            state.score;

        movesEl.textContent =
            state.moves;

        timerEl.textContent =
            formatTime(
                state.elapsed
            );

        if (
            state.selected
        ) {

            highlightSelected();
        }
    }


    /* =========================================================
       START
       ========================================================= */

    function initialize() {

        updateStatisticsDisplay();

        newGame();

        countCurrentGame();
    }

    initialize();

})();
