DELIMITER //

CREATE PROCEDURE `proc_insert_locations`(
	IN `gID` INT
)
BEGIN
	DECLARE done BOOL DEFAULT FALSE;
	DECLARE cKey CHAR(4);
	DECLARE i INT;
	DECLARE city_cursor CURSOR FOR
		SELECT cityKey
		FROM city
		WHERE diseaseColor NOT IN ('e', 'x') -- omit event cards and epidemics
		ORDER BY RAND();
	DECLARE event_cursor CURSOR FOR
		SELECT cityKey
		FROM city
		WHERE diseaseColor = 'e';
	DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

	SET i = 0;
	OPEN city_cursor;
		insert_locations: LOOP
		
			FETCH city_cursor INTO cKey;
			IF done THEN
				LEAVE insert_locations;
			END IF;
			
			INSERT INTO location (gameID, cityKey, infectionCardIndex) VALUES (gID, cKey, i);
			SET i = i + 1;
		
		END LOOP insert_locations;
	CLOSE city_cursor;

	-- Event cards don't appear in the infection deck.
	SET done = FALSE;
	OPEN event_cursor;
		insert_events: LOOP
		
			FETCH event_cursor INTO cKey;
			IF done THEN
				LEAVE insert_events;
			END IF;
			
			INSERT INTO location (gameID, cityKey) VALUES (gID, cKey);
		END LOOP insert_events;
	CLOSE event_cursor;
	
	-- Atlanta always gets a research station when the game starts
	UPDATE location
	SET hasResearchStation = 1
	WHERE gameID = gID
	AND cityKey = 'atla';
END //
DELIMITER ;