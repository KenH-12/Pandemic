<?php
    try
    {
        session_start();
        require "../connect.php";
        include "../utilities.php";
        
        if (!isset($_POST["numEpidemics"]))
            throw new Exception("Difficulty not set.");

        if (!isset($_POST["numRoles"]))
            throw new Exception("Number of roles not set.");
        
        if (!isset($_POST["randomizeRoles"]))
            throw new Exception("Role randomization not set.");
        
        $numEpidemics = $_POST["numEpidemics"];
        $numRoles = $_POST["numRoles"];
        $randomizeRoles = $_POST["randomizeRoles"];

        $mysqli->query("INSERT INTO game (epidemicCards) VALUES ($numEpidemics)");
        $gID = $mysqli->insert_id;

        $mysqli->query("INSERT INTO pandemic (gameID) VALUES ($gID)");

        $roles = $mysqli->query("SELECT roleID
                                FROM role
                                ORDER BY RAND()
                                LIMIT $numRoles");
        
        while ($row = mysqli_fetch_assoc($roles))
        {
            $roleID = $row["roleID"];
            $mysqli->query("INSERT INTO player (gameID, roleID) VALUES ($gID, $roleID)");
        }

        $mysqli->query("CALL insertLocations($gID)");
        $mysqli->query("CALL arrangePlayerCards($gID)");
        $mysqli->query("CALL setTurnOrder($gID)");
        $mysqli->query("CALL infectNineCities($gID)");
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to create game: " . $e->getMessage();
    }
    finally
    {
        if (isset($response["failure"]))
            $mysqli->rollback();
        else
            $mysqli->commit();
        
        $mysqli->close();

        echo json_encode($response);
    }
?>