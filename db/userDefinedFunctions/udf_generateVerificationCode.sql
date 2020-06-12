CREATE FUNCTION `udf_generateVerificationCode`(
	`uID` INT
)
RETURNS INT
LANGUAGE SQL
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
COMMENT ''
BEGIN
	DECLARE vCode INT DEFAULT 0;
	
	WHILE vCode = 0
	DO
		SET vCode = udf_getRandBetween(10000, 99999);
		
		IF vCode IN (SELECT verificationCode FROM `user`) THEN
			SET vCode = 0;
		END IF;
	END WHILE;
	
	UPDATE `user`
	SET verificationCode = vCode,
		vCodeExpiry = DATE_ADD(NOW(), INTERVAL 1 HOUR)
	WHERE userID = uID;
	
	IF ROW_COUNT() != 1 THEN
		SET vCode = 0;
	END IF;
	
	RETURN vCode;
END