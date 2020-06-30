<?php
    try
    {
        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";
        require "$rootDir/Pandemic/serverCode/utilities.php";

        session_start();
        
        if (!isset($_SESSION["uID"]))
            throw new Exception("user is not logged in");
        
        $uID = $_SESSION["uID"];

        $stmt = $pdo->prepare("SELECT gameID FROM game
                                INNER JOIN vw_player ON game.gameID = vw_player.game 
                                WHERE uID = ?
                                AND endCauseID IS NULL
                                LIMIT 1");
        $stmt->execute([$uID]);
        
        if ($stmt->rowCount() === 0)
            throw new Exception("game not found");
        
        $game = $stmt->fetch()["gameID"];

        $pdo->beginTransaction();

        recordGameEndCause($pdo, $game, "abandoned");

        $stmt = $pdo->query("DELETE FROM epidemicIntensify WHERE eventID IN (SELECT eventID FROM eventHistory WHERE gameID = $game)");
        if (queryCausedError($pdo))
            throwException($pdo, "failed to delete epidemic intensify records");

        $stmt = $pdo->query("DELETE FROM eventHistory WHERE gameID = $game");
        if (queryCausedError($pdo))
            throwException($pdo, "failed to delete event history");

        $stmt = $pdo->query("DELETE FROM player WHERE gameID = $game");
        if (queryCausedError($pdo))
            throwException($pdo, "failed to delete players");

        $stmt = $pdo->query("DELETE FROM location WHERE gameID = $game");
        if (queryCausedError($pdo))
            throwException($pdo, "failed to delete locations");

        $stmt = $pdo->query("DELETE FROM pandemic WHERE gameID = $game");
        if (queryCausedError($pdo))
            throwException($pdo, "failed to delete pandemic");

        $stmt = $pdo->query("DELETE FROM game WHERE gameID = $game");
        if (queryCausedError($pdo))
            throwException($pdo, "failed to delete game");
        
        unset($_SESSION["game"]);

        $response["success"] = true;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to delete game: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to delete game: " . $e->getMessage();
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