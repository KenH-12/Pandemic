<?php
    try
    {
        require "../connect.php";
        require "../utilities.php";

        $data = json_decode(file_get_contents("php://input"), true);

        session_start();
        
        if (!isset($_SESSION["uID"]))
            throw new Exception("User not logged in.");
        
        if (!isset($data["numEpidemics"]))
            throw new Exception("required value not set: difficulty");

        if (!isset($data["numRoles"]))
            throw new Exception("required value not set: number of roles");
        
        if (!isset($data["randomRoleSelection"]))
            throw new Exception("required value not set: random role selection");
        
        $uID = $_SESSION["uID"];
        $numEpidemics = $data["numEpidemics"];
        $numRoles = $data["numRoles"];
        $randomRoleSelection = (int)$data["randomRoleSelection"];

        if ($numEpidemics < 4 || $numEpidemics > 6)
            throw new Exception("Invalid number of epidemics: $numEpidemics");
        
        if (is_nan($numRoles) || $numRoles < 2 || $numRoles > 4)
            throw new Exception("Invalid number of roles: $numRoles");

        if ($randomRoleSelection)
            $selectedRoleIDs = [];
        else
        {
            if (!isset($data["selectedRoleIDs"]))
                throw new Exception("required value not set: selected roles");
            
            $selectedRoleIDs = $data["selectedRoleIDs"];
            if (count($selectedRoleIDs) != $numRoles)
                throw new Exception("invalid number of roles selected");
        }
        
        $stmt = $pdo->prepare("SELECT DISTINCT gameID FROM game
                                INNER JOIN vw_player ON game.gameID = vw_player.game
                                WHERE uID = ?
                                AND endCauseID IS NOT NULL");
        $stmt->execute([$uID]);
        $completedGamesToCleanUp = $stmt->fetchAll();

        $pdo->beginTransaction();

        // Delete leftover game records
        foreach ($completedGamesToCleanUp as $game)
        {
            $gID = $game["gameID"];

            recordCompletedGame($pdo, $gID);
            deleteGame($pdo, $gID);
        }
        
        $stmt = $pdo->prepare("INSERT INTO game (epidemicCards, randomRoleSelection) VALUES (?, ?)");
        $stmt->execute([$numEpidemics, $randomRoleSelection]);

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "Failed to insert game");
        
        $gID = $pdo->lastInsertId();

        $stmt = $pdo->prepare("INSERT INTO pandemic (gameID) VALUES (?)");
        $stmt->execute([$gID]);

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "Failed to insert pandemic");

        if ($randomRoleSelection)
        {
            $stmt = $pdo->prepare("SELECT roleID
                                FROM role
                                ORDER BY RAND()
                                LIMIT ?");
            $stmt->execute([$numRoles]);
            
            if ($stmt->rowCount() != $numRoles)
                throw new Exception("Failed to retrieve the necessary number of roles ($numRoles)");

            $roles = $stmt->fetchAll();
            $selectedRoleIDs = [];
            foreach ($roles as $row)
                $selectedRoleIDs[] = $row["roleID"];
        }
        
        $stmt = $pdo->prepare("INSERT INTO player (gameID, userID, roleID) VALUES (?, ?, ?)");

        foreach ($selectedRoleIDs as $roleID)
        {
            $stmt->execute([$gID, $uID, $roleID]);

            if ($stmt->rowCount() !== 1)
                throwException($pdo, "Failed to insert player");
        }

        $stmt = $pdo->prepare("CALL proc_insert_locations(?)");
        $stmt->execute([$gID]);

        $noEpidemics = true;
        $epidemicInsertionAttempts = 0;
        while ($noEpidemics && $epidemicInsertionAttempts < 3)
        {
            $stmt = $pdo->prepare("CALL proc_arrangePlayerCards(?)");
            $stmt->execute([$gID]);

            $stmt = $pdo->prepare("SELECT cardKey
                                        FROM vw_playerCard
                                        WHERE game = ?
                                        AND cardKey LIKE 'epi%'");
            $stmt->execute([$gID]);
            $epidemics = $stmt;
            
            if ($epidemics->rowCount() == $numEpidemics)
                $noEpidemics = false;
            else
            {
                $stmt = $pdo->prepare("DELETE FROM location WHERE gameID = ?");
                $stmt->execute([$gID]);
                $epidemicInsertionAttempts++;
            }
        }
        
        if ($noEpidemics)
            throw new Exception("failed to insert epidemic cards. Attempts: " . $epidemicInsertionAttempts);

        $stmt = $pdo->prepare("CALL proc_infectNineCities(?)");
        $stmt->execute([$gID]);

        $_SESSION["game"] = $gID;

        $response["success"] = true;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to create game: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to create game: " . $e->getMessage();
    }
    finally
    {
        if ($pdo->inTransaction())
        {
            if (isset($response["failure"]))
                $pdo->rollback();
            else
                $pdo->commit();
        }
        
        echo json_encode($response);
    }
?>