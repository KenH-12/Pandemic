DELIMITER //

CREATE FUNCTION `udf_getStepID`(
	`stepDescription` VARCHAR(13)
)
RETURNS tinyint(4)
BEGIN
	DECLARE v_stepID TINYINT;
	
	SELECT stepID INTO v_stepID
	FROM step
	WHERE description = stepDescription;
	
	RETURN v_stepID;
END //