DELIMITER //

CREATE FUNCTION `udf_getDiseaseStatusID`(
	`diseaseStatusDescription` VARCHAR(10)
)
RETURNS tinyint(4)
BEGIN
	DECLARE id TINYINT;
	
	SELECT statusID INTO id
	FROM diseaseStatus
	WHERE description = diseaseStatusDescription;
	
	RETURN id;
END //