DELIMITER //
CREATE FUNCTION `udf_getRoleID`(`nameOfRole` VARCHAR(21)) RETURNS int(11)
BEGIN
	DECLARE id TINYINT;
    
    SELECT roleID INTO id
    FROM `role`
    WHERE roleName = nameOfRole;
    
    RETURN id;
END //
DELIMITER ;
