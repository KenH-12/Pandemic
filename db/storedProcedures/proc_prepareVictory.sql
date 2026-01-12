DELIMITER $$
CREATE PROCEDURE `proc_prepareVictory`(
	IN `p_gameID` INT
)
BEGIN
	DECLARE v_curedStatusID TINYINT;
    DECLARE v_roleID TINYINT;
    DECLARE v_cardPileID TINYINT;
    
    -- Get ID of 'cured' diseaseStatus
	SET v_curedStatusID = (SELECT statusID FROM diseaseStatus WHERE description = 'cured' LIMIT 1);
	
    -- Cure 3/4 diseases
	UPDATE pandemic
    SET yStatusID = v_curedStatusID,
		rStatusID = v_curedStatusID,
        uStatusID = v_curedStatusID
	WHERE gameID = p_gameID;
    
    -- Get the id of the role whose turn it is currently
    SET v_roleID = (
		SELECT turnRoleID
		FROM game
		WHERE gameID = p_gameID
		LIMIT 1
	);
    
    -- Get the cardPileID (hand) of that role
    SET v_cardPileID = udf_getPileID(
		(
			SELECT roleName
            FROM role
            WHERE roleID = v_roleID
            LIMIT 1
		)
    );
    
    -- Put 5 cards of the remaining disease color in the role's cardPile
    UPDATE location
    SET playerCardPileID = v_cardPileID
    WHERE gameID = p_gameID
    AND cityKey IN ('bagh', 'tehr', 'delh', 'mumb', 'cair');
    
    -- Put a research station on the role's current location
    UPDATE location
    SET hasResearchStation = 1
    WHERE gameID = p_gameID
    AND cityKey = (
		SELECT cityKey
        FROM player
        WHERE gameID = p_gameID
        AND roleID = v_roleID
    );
    
END$$
DELIMITER ;
