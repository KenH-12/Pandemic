DROP VIEW IF EXISTS vw_location;
DROP VIEW IF EXISTS vw_event;
DROP VIEW IF EXISTS vw_playerCard;
DROP VIEW IF EXISTS vw_infectionCard;
DROP VIEW IF EXISTS vw_player;
DROP VIEW IF EXISTS vw_gamestate;
DROP VIEW IF EXISTS vw_disease;
DROP TABLE IF EXISTS epidemicintensify;
DROP TABLE IF EXISTS eventhistory;
DROP TABLE IF EXISTS player;
DROP TABLE IF EXISTS location;
DROP TABLE IF EXISTS pandemic;
DROP TABLE IF EXISTS diseaseStatus;
DROP TABLE IF EXISTS game;
DROP TABLE IF EXISTS step;
DROP TABLE IF EXISTS gameEndCause;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS role;
DROP TABLE IF EXISTS cardpile;
DROP TABLE IF EXISTS cityconnection;
DROP TABLE IF EXISTS city;

CREATE TABLE step
(
	stepID		TINYINT AUTO_INCREMENT,
	description VARCHAR(13) NOT NULL,
	
	CONSTRAINT pk_step_stepID PRIMARY KEY(stepID)
);

CREATE TABLE gameEndCause
(
	endCauseID	TINYINT AUTO_INCREMENT,
	description	VARCHAR(8) NOT NULL, -- 'victory','outbreak', 'cubes', or 'cards'
	
	CONSTRAINT pk_gameEndCause_endCauseID PRIMARY KEY(endCauseID)
);

CREATE TABLE game
(
	gameID				INT AUTO_INCREMENT,
	epidemicCards		TINYINT DEFAULT 4,
	epidemicsDrawn		TINYINT DEFAULT 0,
	infectionRate		TINYINT DEFAULT 2,
	numOutbreaks		TINYINT DEFAULT 0,
	turnNumber			TINYINT DEFAULT 0, 
		-- Max Player Cards = 59,
		-- minus at least 8 for starting hands = 51,
		-- divided by 2 draws per turn = 25.5.
		-- Therefore the maximum turnNumber is 26 based on the following "GAME END" condition:
		-- "[The players lose] if a player cannot draw 2 Player cards after doing his actions."
	turnRoleID			TINYINT, -- which role's turn is it?
	stepID				TINYINT DEFAULT 1, -- 'action 1'
	endCauseID			TINYINT,
	
	CONSTRAINT pk_game_gameID PRIMARY KEY(gameID),
	CONSTRAINT fk_step_game FOREIGN KEY(stepID) REFERENCES step(stepID),
	CONSTRAINT fk_gameEndCause_game FOREIGN KEY(endCauseID) REFERENCES gameEndCause(endCauseID)
);

CREATE TABLE diseaseStatus
(
	statusID		TINYINT AUTO_INCREMENT,
	description VARCHAR(10) NOT NULL,
	
	CONSTRAINT pk_diseaseStatus_statusID PRIMARY KEY(statusID)
);

CREATE TABLE pandemic
(
	gameID		INT,
	yStatusID	TINYINT DEFAULT 1,
	rStatusID	TINYINT DEFAULT 1,
	uStatusID	TINYINT DEFAULT 1,
	bStatusID	TINYINT DEFAULT 1,
	
	CONSTRAINT pk_pandemic_gameID PRIMARY KEY(gameID),
	CONSTRAINT fk_game_pandemic FOREIGN KEY(gameID) REFERENCES game(gameID)
);

CREATE VIEW vw_disease
AS
SELECT	
	pandemic.gameID AS game,
	udf_getDiseaseStatusDescription(yStatusID) AS yStatus,
	udf_getDiseaseStatusDescription(rStatusID) AS rStatus,
	udf_getDiseaseStatusDescription(uStatusID) AS uStatus,
	udf_getDiseaseStatusDescription(bStatusID) AS bStatus
FROM pandemic
INNER JOIN game ON game.gameID = pandemic.gameID;

CREATE TABLE `USER`
(
	userID				INT AUTO_INCREMENT,
	username				VARCHAR(20) NOT NULL,
	pass					VARCHAR(255) NOT NULL,
	email					VARCHAR(320) NOT NULL,
	verificationCode	INT,
	vCodeExpiry			DATETIME,
	accountVerified	BOOL DEFAULT 0,
	lastActive			DATETIME,
	
	CONSTRAINT pk_user_userID PRIMARY KEY(userID)
);
SET GLOBAL time_zone = '-4:00'; -- Toronto

CREATE TABLE failedLoginAttempt
(
	attemptID		INT AUTO_INCREMENT,
	ipAddress		VARCHAR(45),
	username			VARCHAR(20),
	timeOfAttempt	DATETIME,
	
	CONSTRAINT pk_failedLoginAttempt_attemptID PRIMARY KEY(attemptID)
);

CREATE TABLE ROLE
(
	roleID		TINYINT AUTO_INCREMENT,
	roleName		VARCHAR(21) NOT NULL,

	CONSTRAINT pk_role_roleID PRIMARY KEY(roleID)
);

CREATE TABLE CITY
(
	cityKey			CHAR(4) NOT NULL,
	population		INT NOT NULL,
	diseaseColor	CHAR(1) NOT NULL,
	
	CONSTRAINT pk_city_cityKey PRIMARY KEY(cityKey)
);

CREATE TABLE CITYCONNECTION
(
	cityKeyA CHAR(4) NOT NULL,
	cityKeyB CHAR(4) NOT NULL,
	
	CONSTRAINT pk_cityconnection PRIMARY KEY(cityKeyA, cityKeyB),
	CONSTRAINT fk_city_cityConnection_cityKeyA FOREIGN KEY(cityKeyA) REFERENCES city(cityKey),
	CONSTRAINT fk_city_cityConnection_cityKeyB FOREIGN KEY(cityKeyB) REFERENCES city(cityKey)
);

CREATE TABLE CARDPILE
(
	ID			TINYINT AUTO_INCREMENT,
	pileName	VARCHAR(21) NOT NULL,
	
	CONSTRAINT pk_cardpile_ID PRIMARY KEY(ID)
);

CREATE TABLE LOCATION
(
	cityKey					CHAR(4) NOT NULL,
	gameID					INT NOT NULL,
	yellowCubes				TINYINT DEFAULT 0,
	redCubes					TINYINT DEFAULT 0,
	blueCubes				TINYINT DEFAULT 0,
	blackCubes				TINYINT DEFAULT 0,
	hasResearchStation	BOOL DEFAULT 0,
	infectionCardPileID	TINYINT DEFAULT 8, -- deck
	infectionCardIndex	INT,
	playerCardPileID		TINYINT DEFAULT 8, -- deck
	playerCardIndex		TINYINT,
	
	CONSTRAINT pk_location_cityKey_gameID PRIMARY KEY(cityKey, gameID),
	
	CONSTRAINT fk_location_infectionCardPileID FOREIGN KEY(infectionCardPileID)
		REFERENCES CARDPILE(ID),
	
	CONSTRAINT fk_location_playerCardPileID FOREIGN KEY(playerCardPileID)
		REFERENCES CARDPILE(ID)
);

CREATE VIEW vw_location
AS
SELECT	gameID AS game,
			cityKey AS locationKey,
			yellowCubes AS yCubes,
			redCubes AS rCubes,
			blueCubes AS uCubes,
			blackCubes AS bCubes,
hasResearchStation AS researchStation
FROM location;

CREATE VIEW vw_playerCard
AS
SELECT	gameID AS game,
			location.cityKey AS cardKey,
			diseaseColor AS color,
			population AS pop,
			playerCardPileID AS pileID,
			pileName AS pile,
			playerCardIndex AS cardIndex
FROM location
INNER JOIN city ON location.cityKey = city.cityKey
INNER JOIN cardpile ON location.playerCardPileID = cardpile.ID;

CREATE VIEW vw_infectionCard
AS
SELECT	gameID AS game,
			location.cityKey AS cardKey,
			diseaseColor AS color,
			infectionCardPileID AS pileID,
			pileName AS pile,
			infectionCardIndex AS cardIndex
FROM location
INNER JOIN city ON location.cityKey = city.cityKey
INNER JOIN cardpile ON location.infectionCardPileID = cardpile.ID;

CREATE TABLE PLAYER
(
	playerID		INT AUTO_INCREMENT,
	nextRoleID	INT DEFAULT 0,
	userID		INT NOT NULL,
	gameID		INT NOT NULL,
	roleID		TINYINT DEFAULT 0,
	cityKey		CHAR(4) NOT NULL DEFAULT "atla", -- pawns begin in Atlanta
	
	CONSTRAINT pk_player_playerID PRIMARY KEY(playerID),
	CONSTRAINT fk_user_player FOREIGN KEY(userID) REFERENCES `USER`(userID),
	CONSTRAINT fk_game_player FOREIGN KEY(gameID) REFERENCES GAME(gameID),
	CONSTRAINT fk_player_city FOREIGN KEY(cityKey) REFERENCES CITY(cityKey)
);

CREATE VIEW vw_player
AS
SELECT	gameID AS game,
			player.userID AS uID,
			playerID AS pID,
			player.roleID AS rID,
			username AS `name`,
			roleName AS role,
			nextRoleID AS nextID,
			cityKey AS location
FROM player
INNER JOIN user ON player.userID = user.userID
INNER JOIN role ON player.roleID = role.roleID;

CREATE TABLE eventhistory
(
	eventID			INT AUTO_INCREMENT,
	eventAbbrev		CHAR(2) NOT NULL,
	eventDetails	VARCHAR(29) NOT NULL,
	turnNumber		TINYINT DEFAULT 0,
	roleID			TINYINT, -- Nullable because some event do not pertain to any role.
	gameID			INT NOT NULL,
	
	CONSTRAINT pk_eventhistory_eventID PRIMARY KEY(eventID),
	CONSTRAINT fk_game_eventhistory_gameID FOREIGN KEY(gameID) REFERENCES GAME(gameID)
);

CREATE VIEW vw_event
AS
SELECT	eventID AS id,
			eventAbbrev AS eventType,
			eventDetails AS details,
			turnNumber AS turnNum,
			roleID AS role,
			gameID AS game
FROM eventhistory;

CREATE TABLE EPIDEMICINTENSIFY
(
	eventID		INT NOT NULL,
	cityKey		CHAR(4) NOT NULL,
	cardIndex	TINYINT NOT NULL,
	
	CONSTRAINT pk_epidemicIntensify_eventID_cityKey PRIMARY KEY (eventID, cityKey),
	CONSTRAINT fk_eventHistory_epidemicIntensify_eventID FOREIGN KEY(eventID) REFERENCES EVENTHISTORY(eventID),
	CONSTRAINT fk_city_epidemicIntensify_cityKey FOREIGN KEY(cityKey) REFERENCES CITY(cityKey)
);

CREATE VIEW vw_gamestate
AS
SELECT	game.gameID AS game,
			turnNumber AS turnNum,
			turnRoleID AS turn,
			game.stepID AS step,
			step.description AS stepName,
			epidemicCards AS numEpidemics,
			infectionRate AS infRate,
			epidemicsDrawn AS epidemicCount,
			numOutbreaks AS outbreakCount
FROM game
INNER JOIN step ON game.stepID = step.stepID
INNER JOIN player ON game.gameID = player.gameID
WHERE turnRoleID = roleID;