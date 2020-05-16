CREATE DEFINER=`root`@`localhost` FUNCTION `udf_getDiseaseStatusID`(
	`diseaseStatusDescription` VARCHAR(10)
)
RETURNS tinyint(4)
LANGUAGE SQL
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
COMMENT ''
BEGIN
	DECLARE id TINYINT;
	
	SELECT statusID INTO id
	FROM diseaseStatus
	WHERE description = diseaseStatusDescription;
	
	RETURN id;
END