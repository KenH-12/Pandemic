CREATE DEFINER=`root`@`localhost` FUNCTION `udf_getStepID`(
	`stepDescription` VARCHAR(13)
)
RETURNS tinyint(4)
LANGUAGE SQL
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
COMMENT ''
BEGIN
	DECLARE v_stepID TINYINT;
	
	SELECT stepID INTO v_stepID
	FROM step
	WHERE description = stepDescription;
	
	RETURN v_stepID;
END