CREATE DEFINER=`root`@`localhost` PROCEDURE `increment_gamephase`(
	IN p_game INT,
    IN p_currentPhase VARCHAR(13),
    IN p_currentTurn TINYINT,
    OUT p_nextPhase VARCHAR(13)
)
BEGIN
	DECLARE v_currentPhaseID TINYINT;
    DECLARE v_nextPhaseID TINYINT;
    
    call msg(CONCAT('current phase: ', p_currentPhase));
    
    -- get the ID of the current phase
    SELECT gamePhaseID INTO v_currentPhaseID
	FROM gamephase
    WHERE description = p_currentPhase
    LIMIT 1;
    
    -- increment it
    SET v_nextPhaseID = v_currentPhaseID + 1;
    
    -- attempt to get the next phase's description
    SELECT description INTO p_nextPhase
    FROM gamephase
    WHERE gamePhaseID = v_nextPhaseID
    LIMIT 1;
    
    -- after the last phase, loop back to 'action 1'
    IF ISNULL(p_nextPhase) THEN
		SET p_nextPhase = 'action 1';
        SELECT gamePhaseID INTO v_nextPhaseID
        FROM gamephase
        WHERE description = p_nextPhase
        LIMIT 1;
	END IF;
    call msg(CONCAT('next phase: ', p_nextPhase));
    -- attempt to update the gamephase
    -- (double-check that the current gamestate matches the arguments provided)
    UPDATE vw_gamestate
    SET phaseID = v_nextPhaseID
    WHERE game = p_game
    AND gamephase = p_currentPhase
    AND turn = p_currentTurn;
    
    -- provide feedback in the case of failure
    IF ROW_COUNT() != 1 THEN
		SET p_nextPhase = 'failure';
	END IF;
END