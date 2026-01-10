DELIMITER //

CREATE PROCEDURE `proc_infectNineCities`(
	IN `gID` INT
)
BEGIN
	-- This procedure infects 9 random cities (the infectionCardIndex is already randomized)
	-- as per the 'infect 9 cities' setup step.
	DECLARE cKey CHAR(4);
	DECLARE clr  CHAR(1);
	DECLARE cubes TINYINT;
	DECLARE i TINYINT;
	DECLARE infectionGroupSize TINYINT DEFAULT 3;
	
	SET cubes = 3;
	SET i = 0;
	
	WHILE i < 9
	DO
		-- Get the cityKey and color of the top card
		SELECT cardKey, color
		INTO cKey, clr
		FROM vw_infectionCard
		WHERE game = gID
		AND pile = 'deck'
		AND cardIndex =	(SELECT MAX(cardIndex)
								FROM vw_infectionCard
								WHERE game = gID
								AND pile = 'deck');
		
		-- Decrease the number of disease cubes by one for every 3 cities updated
		IF (i > 0 AND MOD(i, infectionGroupSize) = 0)
			THEN SET cubes = cubes - 1;
		END IF;
		
		-- Move the infection cards to the discard pile and only add cubes of the city's color
		UPDATE location
		SET infectionCardPileID = udf_getPileID('discard'),
			infectionCardIndex = i,
			yellowCubes = CASE
				WHEN clr = 'y' THEN cubes
				ELSE 0
			END,
			redCubes = CASE
				WHEN clr = 'r' THEN cubes
				ELSE 0
			END,
			blueCubes = CASE
				WHEN clr = 'u' THEN cubes
				ELSE 0
			END,
			blackCubes = CASE
				WHEN clr = 'b' THEN cubes
				ELSE 0
			END
		WHERE gameID = gID
		AND cityKey = cKey;
		
		-- Record the Initial Infection ('ii') event
		INSERT INTO vw_event (game, eventType, details)
		VALUES (gID, 'ii', CONCAT(cKey, ',', cubes));
		
		SET i = i + 1;
	END WHILE;
END //