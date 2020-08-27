"use strict";

const disclaimer = `DISCLAIMER: <span class='italics'>this is a fan-made re-creation which is intended to be a portfolio piece and is not available to the general public.
It cannot be played without an access key, which are granted exclusively to potential employers and a few close friends.
This project is not intended for sale of any kind and is in no way affiliated with or sponsored by the creators of the original game.</span>`,
    turnInfo = `Each of the 3 Play steps <span class='inGameOnly'>(top-right of the screen behind this menu)</span> must be completed on each role's turn. <span class='inGameOnly'>The current step is always highlighted.</span>`,
    trophySymbol = "<span class='warning'>🏆</span>",
    warningSymbol = "<span class='warning'>⚠️</span>",
    outbreakHoverInfo = "<span class='hoverInfo eventTypeInfo' data-eventType='ob'>outbreak</span>",
    eradicatedHoverInfo = "<span class='hoverInfo eventTypeInfo' data-eventType='er'>eradicated</span>",
    eventHistoryInfo = "The Event History (bottom-left corner) is a great source of information about the things that have occured so far in the game.",
    victoryCondition = `${trophySymbol} Discover cures to all 4 diseases and your team wins immediately, no matter how many disease cubes are on the board.`,
    maxDiseaseCubesRule = `A city cannot contain more than 3 disease cubes of a single colour. Instead of placing a 4th cube, an ${outbreakHoverInfo} will occur.`,
    tooManyOutbreaksWarning = `${warningSymbol} If the outbreaks marker reaches the last space of the Outbreaks Track, the game ends and your team has lost!`,
    insufficientCubesWarning = `${warningSymbol} If the number of disease cubes <i>actually needed on the board</i> cannot be placed because there are not enough cubes in the supply, the game ends and your team has lost!`,
    outOfCardsWarning = `${warningSymbol} If there are fewer than 2 cards left in the Player Deck when it is time to draw, the game ends and your team has lost!`,
    discardToSevenCards = "If a role ever has more than 7 cards in their hand (after first resolving any Epidemic cards they may have drawn), they must discard cards or play Event cards until they have 7 cards in their hand.",
    eventCardInfo = "During a turn, <i>any</i> role may play Event cards. To play an Event card, find the card in the role's hand<span class='inGameOnly'> (top-left of the screen)</span> and click it. Mouse over an Event card to view the full card text.",
    eventCardPlayabilityExceptions = `Event cards can be played at any time, <i>except</i> in between drawing and resolving a card. However, when 2 Epidemic cards are drawn together, Event cards can be played after resolving the first Epidemic.`,
    eventCardDiscardRule = "NOTE: if a role's hand limit is reached, they are allowed to play Event cards from their hand instead of discarding.",
    eradicationRules = [
        "If no cubes of a <i>cured</i> disease are left on the board, the disease is <i>eradicated</i>.",
        "When cities of an eradicated disease are infected, no new disease cubes are placed there.",
        "Eradicating a disease is not needed to win; once all diseases are cured, the game ends and your team wins immediately!"
    ],
    dragAndDropInfo = "<span class='inGameOnly'>* You can do this action by dragging and dropping a pawn onto a <span class='hoverInfo validDestinationInfo abbrev'>valid destination</span>.</span>",
strings = {
    introductoryInfo: "<p>Recommended for first-time players.</p><p>[4 Epidemics]</p>",
    standardInfo: "<p>Recommended for players who have some familiarity with the rules.</p><p>[5 Epidemics]</p>",
    heroicInfo: "<p>Recommended for players who have mastered the standard game.</p><p>[6 Epidemics]</p>",
    numberOfRolesInfo: "<p>With more roles, there are more special abilities available to you, but it will be more difficult to keep track of everything.</p><p>It is recommended that you play with only 2 roles for your first game (if you are playing alone, that is).</p>",
    overview: [
        "Do you have what it takes to save humanity? As skilled members of a disease-fighting team, you must keep four deadly diseases at bay while discovering their cures.",
        "Travel across the globe, treating infections while finding resources for cures. Your team must work together, using the individual strengths of each role, to succeed.",
        "The clock is ticking as outbreaks and epidemics fuel the spreading plagues. Can you find all four cures in time? The fate of humanity is in your hands!"
    ],
    howToPlay: [
        "If you are ever unsure of how to proceed, look to the right panel (behind this menu) for prompts or clues.",
        "Keep the <a data-section='objectives'>objectives</a> in mind when you are deciding what to do next.",
        ["h4", "Turns"],
        turnInfo,
        ["h4", "<span id='actionsHeading'>Actions</span>"],
        `During the "Do 4 actions" step, use the action buttons in the right panel to work toward discovering cures to all 4 diseases while preventing global catastrophe. Mouse over an action button's info icon (&#9432;) to view that action's rules.`,
        "NOTE: you can perform movement actions by dragging and dropping an active pawn onto a <span class='hoverInfo validDestinationInfo'>valid destination</span>, and you can do the <span class='hoverInfo eventTypeInfo' data-eventType='td'>Treat Disease</span> action by clicking a disease cube at the active role's current location.",
        ["h4", "Event cards"],
        "Event cards can be <span class='hoverInfo eventCardInfo'>played</span> at any time (with a few <span class='hoverInfo eventCardExceptions'>exceptions</span>). Playing an Event card does not take an action.",
        eventCardDiscardRule
    ],
    gettingStarted: [
        "It is recommended that first-time players begin a game with only 2 roles on Introductory difficulty and learn as they go.",
        "There is plenty of useful information that you can access via the in-game menu button in the top-right of the screen. Use the rules for assistance and clarification — feel free to consult whichever section is of interest to you (or just wing it).",
        "Keep the <a data-section='objectives'>objectives</a> in mind and have fun!"
    ],
    importantInfo: [
        ["h4", "General Information"],
        "Look for info icons (<span class='info' id='metaInfo'>&#9432;</span>) and words with a <span class='hoverInfo' id='metaHoverInfo'>blue underline</span> -- they can be moused over to see a tooltip containing more detailed information about something.",
        eventHistoryInfo,
        ["h4", "Objectives"],
        "The full list of objectives can be found here: <a data-section='objectives' class='nowrap'>Rules -> Objectives</a>",
        `Keep an eye out for trophy icons (${trophySymbol}) and warning icons (${warningSymbol}) inside tooltips -- these are reminders about the ways that you can win or lose the game, respectively.`,
        ["h4", "Roles"],
        "Whenever you see the name of a role, you can mouse over it to view that role's special abilities.",
        "Learn more about roles here: <a data-section='roleInfo' class='nowrap'>Rules -> Roles</a>",
        ["h4", "Cards"],
        `Try hovering over a card to see its tooltip. Learn more about the various types of cards here: <a data-section='cardInfo' data-scrollToId='cardInfo'>Rules -> Cards</a>`,
    ],
    whatJustHappened: [
        eventHistoryInfo,
        "Mouse over an icon in the Event History to see the details of that particular event. Try hovering over the tooltip that appears to get more information about its contents. Use the tooltip's info icon (&#9432;) to learn more about the rules regarding that type of event."
    ],
    mistakes: [
        "Try using the Event History's undo button (&#x2B8C;). The Event History is located in the bottom-left corner of the screen.",
        "NOTE: some events cannot be undone!"
    ],
    objectives: [
        victoryCondition,
        ["h4", "Ways to Lose"],
        "If any of the following scenarios occur, the game ends in defeat!",
        abbreviateWarning(tooManyOutbreaksWarning),
        abbreviateWarning(insufficientCubesWarning),
        abbreviateWarning(outOfCardsWarning)
    ],
    playSteps: {
        turnInfo,
        doFourActionsHeading: "1. Do 4 Actions",
        doFourActions: [
            "A role may do up to 4 actions each turn. Any combination of actions may be performed. The same action may be done several times, each time counting as 1 action.",
            "A role’s special abilities may change how an action is done."
        ],
        howToPlayLink: "<span class='inGameOnly'>Not sure how to do an action? <span class='nowrap'>See <a data-section='howToPlay' data-scrollToId='actionsHeading'>How to play -> Actions</a></span></span>",
        drawTwoCardsHeading: "2. Draw 2 Cards",
        drawTwoCards: "After a role does 4 actions, they must draw 2 cards from the Player Deck; any City cards or Event cards drawn are added to their hand.",
        outOfCardsWarning,
        resolveEpidemicsSubheading: "Resolve any Epidemics",
        resolveEpidemics: "If your draws include any <i>Epidemic</i> cards, they must be resolved immediately. Learn more about resolving Epidemics here: <a data-section='epidemicInfo' data-scrollToId='epidemicInfo' class='nowrap'>Rules -> Epidemics</a>",
        discardToSevenCardsSubheading: "Discard to 7 cards",
        discardToSevenCards,
        infectCitiesHeading: "<span id='infectCitiesHeading'>3. Infect Cities</span>",
        infectCities: [
            "During the Infect Cities step, Infection cards are drawn one at a time from the top of the Infection Deck. The number of Infection cards drawn is equal to the current <i>infection rate</i><span class='inGameOnly'> (see the Infection Rate Track in the top right of the board)</span>.",
			`Each time an Infection card is revealed, a disease cube of the matching colour is placed on the named city. If the city already has 3 cubes of this colour, an ${outbreakHoverInfo} of this disease occurs in that city.`
        ],
        insufficientCubesWarning
    },
    actionRules: {
        tertiaryButtons: true,
        driveFerry: [
            "Move to a city connected by a white line to the one you are in.",
            "<span class='inGameOnly'>NOTE: San Francisco is connected Tokyo and Manila, and Los Angeles is connected to Sydney.</span>",
            dragAndDropInfo
        ],
        directFlight: [
            "Discard a City card to move to the city named on the card.",
            dragAndDropInfo
        ],
        charterFlight: [
            "Discard the City card that <i>matches</i> the city you are in to move to <i>any</i> city.",
            dragAndDropInfo
        ],
        shuttleFlight: [
            "Move from a city with a research station to any other city that has a research station.",
            dragAndDropInfo
        ],
        buildResearchStation: [
            "Discard the City card that matches the city you are in to place a research station there.",
			"If the research station supply is empty, take a research station from anywhere on the board."
        ],
        treatDisease: [
            "Remove 1 disease cube from the city you are in, returning it to the Disease Cube Supply.",
            "If the disease has been cured, remove all cubes of that colour from the city you are in.",
            "<span class='inGameOnly'>* You can do this action by clicking a disease cube at the active role's current location.</span>",
            "Learn more about diseases here: <a data-section='diseaseInfo' data-scrollToId='diseaseInfo' class='nowrap'>Rules -> Diseases</a>"
        ],
        shareKnowledge: [
            "You can do this action in two ways:",
			"<i>give</i> the City card that matches the city you are in to another role, or",
			"<i>take</i> the City card that matches the city you are in from another role.",
			"The other role must also be in the city with you."
        ],
        discoverACure: [
            `At any research station, discard 5 City cards of the same colour from your hand to cure the disease of that colour.`,
			`If no cubes of this colour are on the board, the disease becomes ${eradicatedHoverInfo}.`,
			victoryCondition
        ],
        pass: [`Forfeit your remaining actions for this turn and proceed to the "Draw 2 cards" step.`]
    },
    roleInfo: [
        `Each role has a pawn and takes turns performing the Play steps<span class='inGameOnly'> (top-right of the screen behind this menu)</span>.`,
        ["h4", "Special Abilities"],
        "Roles have unique special abilities to improve your team's chances of success. To view a role's special abilities, mouse over the name of the role<span class='inGameOnly'> in the top-left of the screen (or wherever else a role's name may appear)</span>.",
        "NOTE: some roles' special abilities can take effect during another role's turn.",
        ["h4", "Hands"],
        `Each role's hand can contain up to 7 Player cards. ${discardToSevenCards}`
    ],
    cardInfo: [
        "There are two decks of cards: a Player Deck and an Infection Deck.",
        ["h4", "Player cards"],
        "There are 3 types of Player cards:",
        ["h5", "City cards"],
        "There is one City card for each city on the board. Some actions require you to discard one or more City cards.",
        "You can click on a City card to locate that city on the board.",
        ["h5", "Event cards"],
        `There are 5 unique Event cards (silver coloured). ${eventCardInfo} Playing an Event card is not an action.`,
        eventCardPlayabilityExceptions,
        eventCardDiscardRule,
        ["h5", "Epidemics"],
        "If your draws include any Epidemic cards, they must be resolved immediately.",
        "Learn more about Epidemics here: <a data-section='epidemicInfo' data-scrollToId='epidemicInfo' class='nowrap'>Rules -> Epidemics</a>",
        ["h4", "Infection cards"],
        `There is one Infection card for each city on the board. When an Infection card is drawn, one or more disease cubes will be placed on the named city unless the disease colour has been ${eradicatedHoverInfo}.`,
        "Infection cards are drawn during the <span class='hoverInfo eventTypeInfo' data-eventType='ic'>Infect Cities</span> step and when resolving Epidemics.",
        "You can click on an Infection card to locate that city on the board."
    ],
    diseaseInfo: {
        victoryCondition,
        diseaseCubesHeading: "Disease Cubes",
        cubePlacement: "Disease cubes are placed on cities as a result of resolving Infection cards.",
        maxDiseaseCubesRule,
        curedDiseasesHeading: "Cured Diseases",
        curedDiseases: "When a disease is cured, its cubes remain on the board and new cubes of that colour can still be placed. However, treating a cured disease is easier and your team is closer to winning.",
        eradicationRulesHeading: "Eradicated Diseases",
        eradicationRules
    },
    epidemicInfo: [
        "Epidemic cards are <span class='hoverInfo epidemicDispersalInfo'>dispersed</span> throughout the Player Deck.",
        "If your draws include any Epidemic cards, the following steps will happen immediately:",
        ["h5", "1. Increase"],
        "The infection rate marker is moved forward 1 space on the Infection Rate Track.",
        ["h5", "2. Infect"],
        `The <i>bottom</i> card is drawn from the Infection Deck. Unless its disease colour has been ${eradicatedHoverInfo}, 3 disease cubes of that colour are placed on the named city. If that city already has cubes of that colour, cubes are added until there are 3 and then an ${outbreakHoverInfo} occurs. The drawn Infection card is placed in the Infection Discard Pile.`,
        insufficientCubesWarning,
        ["h5", "3. Intensify"],
        "The Infection Discard Pile is shuffled and then placed on top of the Infection Deck.",
        ["h4", "Double Epidemics"],
        `It is rare but possible for 2 Epidemics to be drawn at once. In this case, the second Epidemic's Infection card will be the only card to "shuffle", ending on top of the Infection Deck. An ${outbreakHoverInfo} will then occur in that city during <span class='hoverInfo eventTypeInfo' data-eventType='ic'>Infections</span> unless an <span class='inGameOnly'><span class='hoverInfo eventCardInfo'>Event card</span></span><span class='mainMenuOnly'>Event card</span> is played to prevent this.`,
        "In the case of a Double Epidemic, Event cards can be played after resolving the first Epidemic (but before starting to resolve the second)."
    ],
    outbreakInfo: {
        outbreakRules: [
            stripTagsThatMatchSelector(maxDiseaseCubesRule, "span[data-eventType='ob']"),
            "When a disease outbreak occurs, the outbreaks marker is moved forward 1 space on the Outbreaks Track.",
			"Then, 1 cube of the disease colour is placed on every city connected to the outbreaking city. If any of those cities already has 3 cubes of the disease colour, a <i>chain reaction outbreak</i> occurs after the current outbreak is done."
        ],
        chainReactionOutbreakHeading: "Chain Reaction Outbreaks",
        chainReactionOutbreak: "When a chain reaction outbreak occurs, the outbreaks marker is moved forward 1 space and disease cubes are placed as above, except cubes are not added to cities which have already had an outbreak as part of resolving the </i>current</i> Infection card.",
        tooManyOutbreaksWarningHeading: "Ways To Lose",
        tooManyOutbreaksWarning,
        insufficientCubesWarning
    },
    loadingGifHtml: "<div class='loadingGif'><img src='images/loading.gif' alt='loading' /></div>",
    diseaseCubeSupplyInfo: "<p>When a city is infected by a disease, 1 disease cube of the matching colour is placed onto the city.</p><p>If the city already has 3 cubes of this colour, an <i>outbreak</i> of this disease occurs in the city.</p>",
    infectionRateInfo: `<p>The infection rate determines how many Infection cards are flipped over during the <span class='hoverInfo' data-eventType='ic'>Infect Cities</span> step.</p>
<p>As more <span class='hoverInfo epidemicInfo'>Epidemics</span> are drawn, the infection rate will increase.</p>`,
    researchStationSupplyInfo: `<p>Research stations are required for the <span class='hoverInfo' data-eventType='dc'>Discover a Cure</span> and <span class='hoverInfo' data-eventType='sf'>Shuttle Flight</span> actions.</p>
<p>They can be placed on the board with the <span class='hoverInfo' data-eventType='rs'>Build Research Station</span> action.`,
    
    insufficientCubesWarning,
    playerDeckInfo: "After doing 4 actions, the active role must draw 2 cards from the Player Deck. Any City cards or Event cards drawn are added to the role's hand. Any Epidemic cards drawn must be resolved immediately.",
    discardRule: "If a role ever has more than 7 cards in hand (after first resolving any Epidemic cards drawn), they must discard or play Event cards until they have 7 cards in hand.",
    outOfCardsWarning,
    
    victoryCondition,
    additionalDiscoverACureInfo: "When a disease is cured, cubes of that colour remain on the board and new cubes of that colour can still be placed during epidemics or infections. However, treating this disease is now easier and your team is closer to winning.",
    curedDiseaseInfo: "Treating this disease now removes all cubes of this colour from the city you are in.",

    contingencyPlannerCardText: `<li><span>As an action, take any discarded Event card and store it.</span></li><li><span>When you play the stored Event card, remove it from the game.</span></li><li><span>Limit: 1 stored Event card at a time, which is not part of your hand.</span></li>`,
    dispatcherCardText: `<li><span>Move another role's pawn as if it were yours.</span></li><li><span>As an action, move any pawn to a city containing another pawn.</span></li>`,
    medicCardText: `<li><span>Remove all cubes of one colour when doing Treat Disease.</span></li><li><span>Automatically remove cubes of cured diseases from the city you are in (and prevent them from being placed there).</span></li>`,
    operationsExpertCardText: `<li><span>As an action, build a research station in the city you are in (no City card needed).</span></li><li><span>Once per turn as an action, move from a research station to any city by discarding any City card.</span></li>`,
    quarantineSpecialistCardText: `<li><span>Prevent disease cube placements (and outbreaks) in the city you are in and all cities connected to it.</span></li>`,
    researcherCardText: `<li><span>You may give any 1 of your City cards when you Share Knowledge. It need not match your city. A player who Shares Knowledge with you on their turn can take any 1 of your City cards.</span></li>`,
    scientistCardText: `<li><span>You need only 4 cards of the same colour to do the Discover a Cure action.</span></li>`,

    dispatchDiscardRule: "When moving another role's pawn as if it were his own, any necessary discards must come from the Dispatcher's hand.",

    eventCardPlayabilityRule: "<span>Play at any time. Not an action.</span>",
    eventCardInfo: `<p>${eventCardInfo}</p><span style='white-space:nowrap'>Event cards look like this:</span>`,
    eventCardPlayabilityExceptions: `<p>${eventCardPlayabilityExceptions}</p>`,
    forecastTopInfo: "The top card will be put back on the deck last (and drawn from the deck first).",
    forcastBottomInfo: "The bottom card will be put back on the deck first (and drawn from the deck sixth).",

    about: [
        "This is an adaptation of the award-winning board game, <i>Pandemic</i>, in the form of a Web application. The functionality is true to the original ruleset in every respect.",
        disclaimer
    ],
    contact: [
        "<span class='copyable'>Developer: Ken Henderson</span>",
        "<span class='copyable'>Email: kenthecoder@outlook.com</span>",
        "<span class='copyable'>Website: <a href='https://kenhenderson.site'>kenhenderson.site</a></span>",
        "<span class='copyable'>GitHub: <a href='https://github.com/KenH-12'>github.com/KenH-12</a></span>"
    ],
    disclaimer
};

function abbreviateWarning(warning)
{
    return warning.replace("If the", "The").replace(", the game ends and your team has lost!", ".");
}

export { strings };