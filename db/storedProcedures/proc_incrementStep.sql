DELIMITER //

CREATE PROCEDURE `proc_incrementStep`(
	IN `gID` INT,
	IN `p_currentStep` TINYINT,
	IN `p_currentTurn` TINYINT,
	OUT `p_nextStep` TINYINT
)
BEGIN
	DECLARE v_currentStepID TINYINT;
	DECLARE v_nextStepID TINYINT;
	
	-- get the ID of the current phase
	SELECT stepID INTO v_currentStepID
	FROM step
	WHERE description = p_currentStep
	LIMIT 1;
	
	-- increment it
	SET v_nextStepID = v_currentStepID + 1;
	
	-- attempt to get the next phase's description
	SELECT description INTO p_nextStep
	FROM step
	WHERE stepID = v_nextStepID
	LIMIT 1;
	
	-- after the last phase, loop back to 'action 1'
	IF ISNULL(p_nextStep) THEN
		SET p_nextStep = 'action 1';
		SELECT stepID INTO v_nextStepID
		FROM step
		WHERE description = p_nextStep
		LIMIT 1;
	END IF;
	-- attempt to update the step
	-- (double-check that the current gamestate matches the arguments provided)
	UPDATE vw_gamestate
	SET step = v_nextStepID
	WHERE game = p_game
	AND stepName = p_currentStep
	AND turn = p_currentTurn;
	
	-- provide feedback in the case of failure
	IF ROW_COUNT() != 1 THEN
		SET p_nextStep = 'failure';
	END IF;
END //