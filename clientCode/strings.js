"use strict";

const trophySymbol = "<span class='warning'>🏆</span>",
    warningSymbol = "<span class='warning'>⚠️</span>",
    eventHistoryInfo = "The event history (bottom-left corner) is a great source of information about the things that have occured so far in the game.",
strings = {
    importantInfo: [
        "Look for info icons (<span class='info' id='metaInfo'>&#9432;</span>) and words with a <span class='hoverInfo' id='metaHoverInfo'>blue underline</span> -- they can be moused over to see a tooltip containing more detailed information about something.",
        `Look for trophy icons (${trophySymbol}) and warning icons (${warningSymbol}) inside tooltips -- these indicate information about the ways that you can win or lose the game, respectively.`,
        eventHistoryInfo
    ],
    whatJustHappened: [
        eventHistoryInfo,
        "Mouse over an icon in the event history to see the details of that particular event. Try hovering over the tooltip that appears to get more information about its contents. Use the tooltip's info icon (&#9432;) to learn more about the rules regarding that type of event.",
        "Made a mistake? Try using the event history's undo button (&#x2B8C;).<br/>NOTE: some events cannot be undone!</p>"
    ],
    loadingGifHtml: "<div class='loadingGif'><img src='images/loading.gif' alt='loading' /></div>",
    diseaseCubeSupplyInfo: "<p>When a city is infected by a disease, 1 disease cube of the matching color is placed onto the city.</p><p>If the city already has 3 cubes of this color, an <i>outbreak</i> of this disease occurs in the city.</p>",
    infectionRateInfo: `<p>The infection rate determines how many infection cards are flipped over during the <span class='hoverInfo' data-eventType='ic'>Infect Cities</span> step.</p>
<p>As more <span class='hoverInfo epidemicInfo'>Epidemics</span> are drawn, the infection rate will increase.</p>`,
    researchStationSupplyInfo: `<p>Research stations are required for the <span class='hoverInfo' data-eventType='dc'>Discover a Cure</span> and <span class='hoverInfo' data-eventType='sf'>Shuttle Flight</span> actions.</p>
<p>They can be placed on the board with the <span class='hoverInfo' data-eventType='rs'>Build Research Station</span> action.`,
    
    insufficientCubesWarning: `${warningSymbol} If the number of cubes <i>actually needed on the board</i> cannot be placed because there are not enough cubes in the supply, the game ends and your team has lost!`,
    tooManyOutbreaksWarning: `${warningSymbol} If the outbreaks marker reaches the last space of the outbreaks track, the game ends and your team has lost!`,
    playerDeckInfo: "After doing 4 actions, the active role must draw 2 cards from the Player Deck. Any city cards or event cards drawn are added to the role's hand. Any Epidemic cards drawn must be resolved immediately.",
    discardRule: "If a role ever has more than 7 cards in hand (after first resolving any Epidemic cards drawn), they must discard or play event cards until they have 7 cards in hand.",
    outOfCardsWarning: `${warningSymbol} If there are fewer than 2 cards left in the Player Deck when it is time to draw, the game ends and your team has lost!`,
    
    victoryCondition: `${trophySymbol}Discover cures to all 4 diseases and your team wins immediately, no matter how many cubes are on the board.`,
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

    eventCardPlayabilityRule: "<span>Play at any time. Not an action.</span>",
    eventCardInfo: `To play an Event card, find the card in the role's hand (top-left of the screen) and click it.<br/><br/>
<span style='white-space:nowrap'>Event cards look like this:</span>`,
    forecastTopInfo: "The top card will be put back on the deck last (and drawn from the deck first).",
    forcastBottomInfo: "The bottom card will be put back on the deck first (and drawn from the deck sixth).",
};

export { strings };