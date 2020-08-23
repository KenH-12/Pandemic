CREATE DEFINER=`root`@`localhost` FUNCTION `udf_getEndCauseDescription`(
	`p_endCauseID` TINYINT
)
RETURNS varchar(9) CHARSET utf8
LANGUAGE SQL
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
COMMENT ''
BEGIN
	DECLARE v_description VARCHAR(9);
	
	SELECT description INTO v_description
	FROM gameEndCause
	WHERE endCauseID = p_endCauseID;
	
	RETURN v_description;
END