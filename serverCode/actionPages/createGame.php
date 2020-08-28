<?php
    try
    {
        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";
        require "$rootDir/Pandemic/serverCode/utilities.php";

        $data = json_decode(file_get_contents("php://input"), true);

        session_start();
        
        if (!isset($_SESSION["uID"]))
            throw new Exception("User not logged in.");
        
        if (!isset($data["numEpidemics"]))
            throw new Exception("required value not set: difficulty");

        if (!isset($data["numRoles"]))
            throw new Exception("required value not set: number of roles");
        
        $uID = $_SESSION["uID"];
        $numEpidemics = $data["numEpidemics"];
        $numRoles = $data["numRoles"];

        if ($numEpidemics < 4 || $numEpidemics > 6)
            throw new Exception("Invalid number of epidemics: $numEpidemics");
        
        if (is_nan($numRoles) || $numRoles < 2 || $numRoles > 4)
            throw new Exception("Invalid number of roles: $numRoles");
        
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
        
        $stmt = $pdo->prepare("INSERT INTO game (epidemicCards) VALUES (?)");
        $stmt->execute([$numEpidemics]);

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "Failed to insert game");
        
        $gID = $pdo->lastInsertId();

        $stmt = $pdo->query("INSERT INTO pandemic (gameID) VALUES ($gID)");

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "Failed to insert pandemic");

        $stmt = $pdo->query("SELECT roleID
                            FROM role
                            ORDER BY RAND()
                            LIMIT $numRoles");

        if ($stmt->rowCount() != $numRoles)
            throw new Exception("Failed to retrieve the necessary number of roles ($numRoles)");

        $roles = $stmt->fetchAll();

        $stmt = $pdo->prepare("INSERT INTO player (gameID, userID, roleID) VALUES ($gID, ?, ?)");

        foreach ($roles as $row)
        {
            $stmt->execute([$uID, $row["roleID"]]);

            if ($stmt->rowCount() !== 1)
                throwException($pdo, "Failed to insert player");
        }

        $pdo->query("CALL proc_insert_locations($gID)");

        $noEpidemics = true;
        $epidemicInsertionAttempts = 0;
        while ($noEpidemics && $epidemicInsertionAttempts < 3)
        {
            $pdo->query("CALL proc_arrangePlayerCards($gID)");

            $epidemics = $pdo->query("SELECT cardKey
                                        FROM vw_playerCard
                                        WHERE game = $gID
                                        AND cardKey LIKE 'epi%'");
            
            if ($epidemics->rowCount() == $numEpidemics)
                $noEpidemics = false;
            else
            {
                $pdo->query("DELETE FROM location WHERE gameID = $gID");
                $epidemicInsertionAttempts++;
            }
        }
        
        if ($noEpidemics)
            throw new Exception("failed to insert epidemic cards.");

        $pdo->query("CALL proc_infectNineCities($gID)");

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