DELIMITER //

CREATE FUNCTION `udf_getDiseaseStatusDescription`(
	`diseaseStatusID` TINYINT
)
RETURNS varchar(10) CHARSET utf8
BEGIN
	DECLARE statusDescription VARCHAR(10);
	
	SELECT description INTO statusDescription
	FROM diseaseStatus
	WHERE statusID = diseaseStatusID
	LIMIT 1;
	
	RETURN statusDescription;
END //