DELIMITER //

CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_generateAccessKey`(
	IN `keyCreatedFor` VARCHAR(50)
)
BEGIN
	DECLARE characters CHAR(62) DEFAULT '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	DECLARE newKey VARCHAR(10) DEFAULT '';
	
	WHILE CHAR_LENGTH(newKey) < 10
	DO
		SET newKey = CONCAT(newKey, SUBSTR(characters, udf_getRandBetween(1, 62), 1));
	END WHILE;

	INSERT INTO accessKey
		(keyCode, createdFor)
	VALUES
		(newKey, keyCreatedFor);
END //