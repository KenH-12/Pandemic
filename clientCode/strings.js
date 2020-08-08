"use strict";

const turnInfo = `Each of the 3 "PLAY" steps (top-right of the screen behind this menu) must be completed on each role's turn. The current step is always highlighted.`,
    trophySymbol = "<span class='warning'>🏆</span>",
    warningSymbol = "<span class='warning'>⚠️</span>",
    eventHistoryInfo = "The event history (bottom-left corner) is a great source of information about the things that have occured so far in the game.",
    victoryCondition = `${trophySymbol} Discover cures to all 4 diseases and your team wins immediately, no matter how many disease cubes are on the board.`,
    tooManyOutbreaksWarning = `${warningSymbol} If the outbreaks marker reaches the last space of the Outbreaks Track, the game ends and your team has lost!`,
    insufficientCubesWarning = `${warningSymbol} If the number of disease cubes <i>actually needed on the board</i> cannot be placed because there are not enough cubes in the supply, the game ends and your team has lost!`,
    outOfCardsWarning = `${warningSymbol} If there are fewer than 2 cards left in the Player Deck when it is time to draw, the game ends and your team has lost!`,
    discardToSevenCards = "If a role ever has more than 7 cards in their hand (after first resolving any Epidemic cards they may have drawn), they must discard cards or play Event cards until they have 7 cards in their hand.",
strings = {
    howToPlay: [
        "If you are ever unsure of how to proceed, look to the right panel (behind this menu) for prompts or clues.",
        ["h5", "Turns"],
        turnInfo,
        ["h5", "Actions"],
        `During the "Do 4 actions" step, use the action buttons in the right panel to work toward discovering cures to all 4 diseases while preventing global catastrophy. Mouse over an action button's info icon (&#9432;) to view the action's rules.`,
        "NOTE: you can perform movement actions by dragging and dropping an active pawn onto a <span class='hoverInfo validDestinationInfo'>valid destination</span>, and you can do the <span class='hoverInfo eventTypeInfo' data-eventType='td'>Treat Disease</span> action by clicking a disease cube at the active role's current location.",
        ["h5", "Event cards"],
        "With a few <span class='hoverInfo eventCardExceptions'>exceptions</span>, Event cards can be <span class='hoverInfo eventCardInfo'>played</span> at any time. Playing an Event card does not take an action.",
        "NOTE: if a role's hand limit is reached, they are allowed to play Event cards from their hand instead of discarding."
    ],
    importantInfo: [
        ["h5", "General Information"],
        "Look for info icons (<span class='info' id='metaInfo'>&#9432;</span>) and words with a <span class='hoverInfo' id='metaHoverInfo'>blue underline</span> -- they can be moused over to see a tooltip containing more detailed information about something.",
        eventHistoryInfo,
        ["h5", "Objectives"],
        `Look for trophy icons (${trophySymbol}) and warning icons (${warningSymbol}) inside tooltips -- these indicate information about the ways that you can win or lose the game, respectively.`,
        ["h5", "Roles"],
        "Whenever you see the name of a role, you can mouse over it to view that role's special abilities.",
        ["h5", "Cards"],
        `Try hovering over the various types of cards to see their tooltips, or go to <span style='white-space:nowrap'>RULES -> Cards</span> to learn more.`,
    ],
    whatJustHappened: [
        eventHistoryInfo,
        "Mouse over an icon in the event history to see the details of that particular event. Try hovering over the tooltip that appears to get more information about its contents. Use the tooltip's info icon (&#9432;) to learn more about the rules regarding that type of event.",
        "Made a mistake? Try using the event history's undo button (&#x2B8C;).<br/>NOTE: some events cannot be undone!</p>"
    ],
    objectives: [
        victoryCondition,
        ["h5", "Ways to Lose"],
        "If any of the following scenarios occur, the game ends in defeat!",
        abbreviateWarning(tooManyOutbreaksWarning),
        abbreviateWarning(insufficientCubesWarning),
        abbreviateWarning(outOfCardsWarning)
    ],
    playSteps: {
        turnInfo,
        doFourActionsHeading: "Do 4 Actions",
        doFourActions: [
            "A role may do up to 4 actions each turn. Any combination of actions may be performed. The same action may be done several times, each time counting as 1 action.",
            "A role’s special abilities may change how an action is done.",
        ],
        drawTwoCardsHeading: "Draw 2 Cards",
        drawTwoCards: [
            "After a role does 4 actions, they must draw 2 cards from the player deck; any city cards or event cards drawn are added to their hand.",
			"If your draws include any <i>Epidemic</i> cards, they must be resolved immediately.",
        ],
        resolveEpidemicsHeading: "Resolve Epidemics",
        resolveEpidemics: [
            "If your draws include any <i>Epidemic</i> cards, the following steps will happen immediately:",
            "1. Increase: The infection rate marker is moved forward 1 space on the Infection Rate Track.",
            "2. Infect: The <i>bottom</i> card is drawn from the Infection Deck. Unless its disease colour has been <span class='hoverInfo eventTypeInfo' data-eventType='er'>eradicated</span>, 3 disease cubes of that colour are placed on the named city. If that city already has cubes of that colour, cubes are added until there are 3 and then an <span class='hoverInfo eventTypeInfo' data-eventType='ob'>outbreak</span> occurs. The drawn infection card is placed in the Infection Discard Pile.",
            "3. Intensify: The Infection Discard Pile is shuffled and then placed on top of the Infection Deck.",
        ],
        discardToSevenCardsHeading: "Discard To 7 Cards",
        discardToSevenCards,
        infectCitiesHeading: "Infect Cities",
        infectCities: [
            "During the Infect Cities step, infection cards are drawn one at a time from the top of the infection deck. The number of infection cards drawn is equal to the current <i>infection rate</i> (see the Infection Rate Track in the top right of the board).",
			"Each time an infection card is revealed, a disease cube of the matching colour is placed on the named city.",
			"If the city already has 3 cubes of this colour, an <span class='hoverInfo eventTypeInfo' data-eventType='ob'>outbreak</span> of this disease occurs in that city."
        ]
    },
    roleInfo: [
        `Each role has a pawn and takes turns performing the "PLAY" steps (top-right of the screen behind this menu).`,
        ["h5", "Special Abilities"],
        "Roles have unique special abilities to improve your team's chances of success. Too view a role's special abilities, mouse over the name of the role in the top-left of the screen (or wherever else a role's name may appear).",
        "NOTE: some roles' special abilities can take effect during another role's turn.",
        ["h5", "Hands"],
        `Each role's hand can contain up to 7 Player cards. ${discardToSevenCards}`
    ],
    loadingGifHtml: "<div class='loadingGif'><img src='images/loading.gif' alt='loading' /></div>",
    diseaseCubeSupplyInfo: "<p>When a city is infected by a disease, 1 disease cube of the matching color is placed onto the city.</p><p>If the city already has 3 cubes of this color, an <i>outbreak</i> of this disease occurs in the city.</p>",
    infectionRateInfo: `<p>The infection rate determines how many infection cards are flipped over during the <span class='hoverInfo' data-eventType='ic'>Infect Cities</span> step.</p>
<p>As more <span class='hoverInfo epidemicInfo'>Epidemics</span> are drawn, the infection rate will increase.</p>`,
    researchStationSupplyInfo: `<p>Research stations are required for the <span class='hoverInfo' data-eventType='dc'>Discover a Cure</span> and <span class='hoverInfo' data-eventType='sf'>Shuttle Flight</span> actions.</p>
<p>They can be placed on the board with the <span class='hoverInfo' data-eventType='rs'>Build Research Station</span> action.`,
    
    insufficientCubesWarning,
    tooManyOutbreaksWarning,
    playerDeckInfo: "After doing 4 actions, the active role must draw 2 cards from the Player Deck. Any city cards or event cards drawn are added to the role's hand. Any Epidemic cards drawn must be resolved immediately.",
    discardRule: "If a role ever has more than 7 cards in hand (after first resolving any Epidemic cards drawn), they must discard or play event cards until they have 7 cards in hand.",
    outOfCardsWarning,
    
    victoryCondition,
    additionalDiscoverACureInfo: "When a disease is cured, cubes of that colour remain on the board and new cubes of that colour can still be placed during epidemics or infections. However, treating this disease is now easier and your team is closer to winning.",
    curedDiseaseInfo: "Treating this disease now removes all cubes of this colour from the city you are in.",
    eradicationRules: `<p>If no cubes of a <i>cured</i> disease are left on the board, the disease is <i>eradicated</i>.</p>
        <p>When cities of an eradicated disease are infected, no new disease cubes are placed there.</p>
        <p>Eradicating a disease is not needed to win; once all diseases are cured, the game ends and your team wins immediately!</p>`,

    contingencyPlannerCardText: `<li><span>As an action, take any discarded Event card and store it.</span></li><li><span>When you play the stored Event card, remove it from the game.</span></li><li><span>Limit: 1 stored Event card at a time, which is not part of your hand.</span></li>`,
    dispatcherCardText: `<li><span>Move another role's pawn as if it were yours.</span></li><li><span>As an action, move any pawn to a city containing another pawn.</span></li>`,
    medicCardText: `<li><span>Remove all cubes of one color when doing Treat Disease.</span></li><li><span>Automatically remove cubes of cured diseases from the city you are in (and prevent them from being placed there).</span></li>`,
    operationsExpertCardText: `<li><span>As an action, build a research station in the city you are in (no City card needed).</span></li><li><span>Once per turn as an action, move from a research station to any city by discarding any City card.</span></li>`,
    quarantineSpecialistCardText: `<li><span>Prevent disease cube placements (and outbreaks) in the city you are in and all cities connected to it.</span></li>`,
    researcherCardText: `<li><span>You may give any 1 of your City cards when you Share Knowledge. It need not match your city. A player who Shares Knowledge with you on their turn can take any 1 of your City cards.</span></li>`,
    scientistCardText: `<li><span>You need only 4 cards of the same color to do the Discover a Cure action.</span></li>`,

    dispatchDiscardRule: "When moving another role's pawn as if it were his own, any necessary discards must come from the Dispatcher's hand.",

    eventCardPlayabilityRule: "<span>Play at any time. Not an action.</span>",
    eventCardInfo: `<p>To play an Event card, find the card in the role's hand (top-left of the screen) and click it.</p>
<p>Mouse over an Event card to view the full card text.</p>
<span style='white-space:nowrap'>Event cards look like this:</span>`,
    eventCardPlayabilityExceptions: `<p>Event cards can be played at any time, <i>except</i> in between drawing and resolving a card.</p>
<p>However, when 2 Epidemic cards are drawn together, event cards can be played after resolving the first epidemic.</p>`,
    forecastTopInfo: "The top card will be put back on the deck last (and drawn from the deck first).",
    forcastBottomInfo: "The bottom card will be put back on the deck first (and drawn from the deck sixth).",
};

function abbreviateWarning(warning)
{
    return warning.replace("If the", "The").replace(", the game ends and your team has lost!", ".");
}

export { strings };