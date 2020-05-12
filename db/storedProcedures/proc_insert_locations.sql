CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_insert_locations`(
	IN `gID` INT
)
LANGUAGE SQL
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
COMMENT ''
BEGIN
	DECLARE done BOOL DEFAULT FALSE;
	DECLARE cKey CHAR(4);
	DECLARE i INT;
	DECLARE city_cursor CURSOR FOR
		SELECT cityKey
		FROM city
		WHERE diseaseColor NOT IN ('e', 'x') -- omit event cards and epidemics
		ORDER BY RAND();
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
	
	-- Atlanta always gets a research station when the game starts
	UPDATE location
	SET hasResearchStation = 1
	WHERE gameID = gID
	AND cityKey = 'atla';
END